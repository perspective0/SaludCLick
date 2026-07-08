import { Request, Response } from 'express';
import { hashPassword } from '../utils/auth';
import { query, queryOne, transaction } from '../db';
import { v4 as uuidv4 } from 'uuid';
import { sendEmail } from '../utils/mailer';
import { getPublicSettings, getSettings as getRuntimeSettings, invalidateSettings } from '../services/settingsService';
import { createStripeCustomer, createDoctorSubscription } from '../utils/stripe';
import { ensureDoctorVerificationColumns, verifyDoctorExequatur } from '../utils/doctorVerification';
import { getWhatsAppConfigStatus, sendWhatsAppTemplate } from '../services/whatsappService';

async function getOrCreateDefaultCenter(client: any) {
  const centerResult = await client.query('SELECT id FROM health_centers LIMIT 1');
  if (centerResult.rowCount > 0) {
    return centerResult.rows[0].id;
  }

  const insertResult = await client.query(
    'INSERT INTO health_centers (name, address, city, phone, email, description) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id',
    ['SaludClick Network', 'No asignada', 'Virtual', '000-000-0000', 'admin@saludclick.com', 'Centro médico predeterminado para médicos registrados']
  );
  return insertResult.rows[0].id;
}

function splitName(fullName: string) {
  const parts = fullName.trim().split(' ');
  const firstName = parts.shift() || 'Doctor';
  const lastName = parts.join(' ') || 'SaludClick';
  return { firstName, lastName };
}

function generateRandomPassword(length = 12) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function cleanText(value: unknown) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

async function ensureAdminSettingsTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS admin_settings (
      section VARCHAR(50) PRIMARY KEY,
      settings JSONB NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function ensureDoctorDisplayColumns() {
  await query('ALTER TABLE doctors ADD COLUMN IF NOT EXISTS featured_on_home BOOLEAN DEFAULT false').catch(() => null);
}

async function ensureDoctorPaymentsTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS doctor_payments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
      period_month DATE NOT NULL,
      due_date DATE NOT NULL,
      grace_until DATE NOT NULL,
      amount DECIMAL(10, 2) DEFAULT 0,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      paid_at TIMESTAMP,
      payment_method VARCHAR(50),
      reference VARCHAR(120),
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (doctor_id, period_month)
    )
  `);
}

async function ensureLaboratoriesTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS laboratories (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      address TEXT NOT NULL,
      city VARCHAR(100) NOT NULL,
      state VARCHAR(100),
      postal_code VARCHAR(10),
      phone VARCHAR(20),
      email VARCHAR(255),
      website VARCHAR(255),
      image VARCHAR(255),
      description TEXT,
      services TEXT[] DEFAULT '{}',
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await query('CREATE INDEX IF NOT EXISTS idx_laboratories_city ON laboratories(city)');
  await query('CREATE INDEX IF NOT EXISTS idx_laboratories_active ON laboratories(is_active)');
}

function getPaymentPeriod(value?: unknown) {
  const raw = typeof value === 'string' && value.trim() ? value.trim() : new Date().toISOString().slice(0, 7);
  const match = raw.match(/^(\d{4})-(\d{2})/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;

  const periodMonth = `${match[1]}-${match[2]}-01`;
  const dueDate = `${match[1]}-${match[2]}-25`;
  const graceUntil = `${match[1]}-${match[2]}-28`;

  return { periodMonth, dueDate, graceUntil };
}

async function syncPendingDoctorUsers() {
  await ensureDoctorVerificationColumns();
  await query(`
    INSERT INTO doctor_requests (name, email, phone, clinic, license_number, message, status, created_at)
    SELECT
      TRIM(u.first_name || ' ' || u.last_name),
      u.email,
      u.phone,
      NULL,
      NULL,
      'Solicitud generada desde registro de medico pendiente de aprobacion',
      'pending',
      u.created_at
    FROM users u
    LEFT JOIN doctors d ON d.id = u.id
    LEFT JOIN doctor_requests dr ON LOWER(dr.email) = LOWER(u.email)
    WHERE u.role = 'doctor'
      AND d.id IS NULL
      AND dr.id IS NULL
  `);
}

export const listDoctorRequests = async (req: Request, res: Response) => {
  try {
    await ensureDoctorVerificationColumns();
    await syncPendingDoctorUsers();
    const result = await query('SELECT * FROM doctor_requests ORDER BY created_at DESC');
    return res.json({ success: true, data: result.rows });
  } catch (err: any) {
    console.error('listDoctorRequests error', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const approveDoctorRequest = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    await ensureDoctorVerificationColumns();

    const request = await queryOne('SELECT * FROM doctor_requests WHERE id = $1', [id]);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Not found' });
    }

    if (request.verification_status !== 'verified' && request.manual_verification_status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Esta solicitud requiere exequatur verificado o aprobacion manual con documentos antes de crear la cuenta medica.',
      });
    }

    const { firstName, lastName } = splitName(request.name);
    const plainPassword = generateRandomPassword();
    const doctorPassword = plainPassword;
    let createdUserAccount = false;
    let stripeCustomer: any = null;
    let stripeSubscription: any = null;

    const updatedRequest = await transaction(async (client) => {
      const updated = await client.query(
        'UPDATE doctor_requests SET status = $1 WHERE id = $2 RETURNING *',
        ['approved', id]
      );
      const requestData = updated.rows[0];

      const existingUser = await client.query('SELECT id, role FROM users WHERE email = $1', [requestData.email]);
      const userId = existingUser.rowCount && existingUser.rowCount > 0 ? existingUser.rows[0].id : uuidv4();
      const userRole = 'doctor';

      if (existingUser.rowCount === 0) {
        createdUserAccount = true;
        const hashedPassword = await hashPassword(doctorPassword);
        await client.query(
          'INSERT INTO users (id, email, password, first_name, last_name, phone, role) VALUES ($1,$2,$3,$4,$5,$6,$7)',
          [userId, requestData.email, hashedPassword, firstName, lastName, requestData.phone || null, userRole]
        );
      } else if (existingUser.rows[0].role !== userRole) {
        await client.query('UPDATE users SET role = $1 WHERE id = $2', [userRole, userId]);
      }

      const doctorExists = await client.query('SELECT id FROM doctors WHERE id = $1', [userId]);
      let centerId = requestData.requested_health_center_id || null;
      if (centerId) {
        const centerExists = await client.query('SELECT id FROM health_centers WHERE id = $1', [centerId]);
        if (centerExists.rowCount === 0) centerId = null;
      }
      if (!centerId) {
        centerId = await getOrCreateDefaultCenter(client);
      }
      if (doctorExists.rowCount === 0) {
        await client.query(
          'INSERT INTO doctors (id, health_center_id, license_number, years_experience, bio, consultation_price, is_verified, specialties, average_rating) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
          [
            userId,
            centerId,
            requestData.exequatur || requestData.license_number || '',
            0,
            requestData.requested_health_center_mode === 'other'
              ? 'Solicitud aprobada. Debe seleccionar un centro existente o crear el centro donde atiende al completar el perfil.'
              : `Solicitud aprobada desde ${requestData.clinic || 'SaludClick'}`,
            0.0,
            true,
            [],
            0,
          ]
        );
      } else {
        await client.query('UPDATE doctors SET license_number = $1, health_center_id = $2, is_verified = $3 WHERE id = $4', [requestData.exequatur || requestData.license_number || '', centerId, true, userId]);
      }

      await client.query(
        `INSERT INTO doctor_health_centers (doctor_id, health_center_id, is_primary)
         VALUES ($1, $2, true)
         ON CONFLICT (doctor_id, health_center_id) DO UPDATE SET is_primary = true`,
        [userId, centerId]
      );

      return requestData;
    });

    try {
      if (process.env.STRIPE_SECRET_KEY) {
        stripeCustomer = await createStripeCustomer(updatedRequest.email, updatedRequest.name);
        if (stripeCustomer?.id) {
          stripeSubscription = await createDoctorSubscription(stripeCustomer.id);
        }
      }
    } catch (stripeErr) {
      console.warn('Stripe integration failed:', stripeErr);
    }

    const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`;
    const subscriptionNote = stripeSubscription
      ? `\nTu suscripción se ha creado en Stripe con ID: ${stripeSubscription.id}\nEstado: ${stripeSubscription.status}\n`
      : process.env.STRIPE_SECRET_KEY
      ? '\nNo se pudo crear la suscripción Stripe automáticamente. Revisa la configuración.'
      : '\nStripe no está configurado, se omitió la creación de suscripción.';

    await sendEmail({
      to: updatedRequest.email,
      subject: 'Tu solicitud de médico ha sido aprobada',
      text: `Hola ${updatedRequest.name},

Tu solicitud ha sido aprobada y tu cuenta de médico ha sido creada en SaludClick.

Email: ${updatedRequest.email}
${createdUserAccount ? `Contraseña temporal: ${doctorPassword}` : 'Puedes iniciar sesión con la contraseña que registraste previamente.'}

${createdUserAccount ? 'Por favor cambia tu contraseña la primera vez que inicies sesión.' : ''}
Inicia sesión aquí: ${loginUrl}
${subscriptionNote}

Gracias,
Equipo SaludClick`,
    });

    return res.json({
      success: true,
      data: updatedRequest,
      doctorCreated: true,
      stripe: {
        customerId: stripeCustomer?.id || null,
        subscriptionId: stripeSubscription?.id || null,
        status: stripeSubscription?.status || null,
      },
    });
  } catch (err: any) {
    console.error('approveDoctorRequest error', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const verifyDoctorRequest = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await ensureDoctorVerificationColumns();

    const request = await queryOne('SELECT * FROM doctor_requests WHERE id = $1', [id]);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Not found' });
    }

    const verification = await verifyDoctorExequatur({
      firstName: request.first_name,
      lastName: request.last_name,
      fullName: request.name,
      exequatur: request.exequatur || request.license_number,
      specialty: request.specialty,
    });

    const result = await query(
      `UPDATE doctor_requests
       SET verification_status = $1,
           verification_score = $2,
           verification_source = $3,
           verification_message = $4,
           verification_checked_at = $5,
           verification_payload = $6
       WHERE id = $7
       RETURNING *`,
      [
        verification.status,
        verification.score,
        verification.source,
        verification.message,
        verification.checkedAt,
        JSON.stringify(verification),
        id,
      ]
    );

    return res.json({ success: true, data: result.rows[0] });
  } catch (err: any) {
    console.error('verifyDoctorRequest error', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const reviewDoctorVerification = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const allowed = ['approved', 'rejected'];

    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: 'Estado de revision no permitido' });
    }

    await ensureDoctorVerificationColumns();
    const request = await queryOne('SELECT id FROM doctor_requests WHERE id = $1', [id]);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Not found' });
    }

    const result = await query(
      `UPDATE doctor_requests
       SET manual_verification_status = $1,
           manual_verification_notes = $2,
           manual_verified_by = $3,
           manual_verified_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [status, notes || null, req.user?.id || null, id]
    );

    return res.json({ success: true, data: result.rows[0] });
  } catch (err: any) {
    console.error('reviewDoctorVerification error', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const rejectDoctorRequest = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const request = await queryOne('SELECT * FROM doctor_requests WHERE id = $1', [id]);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Not found' });
    }

    const result = await query(
      'UPDATE doctor_requests SET status = $1, message = COALESCE($2, message) WHERE id = $3 RETURNING *',
      ['rejected', reason || null, id]
    );

    return res.json({ success: true, data: result.rows[0] });
  } catch (err: any) {
    console.error('rejectDoctorRequest error', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const listUsers = async (req: Request, res: Response) => {
  try {
    await ensureDoctorDisplayColumns();
    const { role } = req.query;
    let sql = `
      SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.phone, u.is_active, u.created_at,
             d.featured_on_home
      FROM users u
      LEFT JOIN doctors d ON d.id = u.id
    `;
    const params: any[] = [];

    if (role) {
      sql += ` WHERE u.role = $1`;
      params.push(role);
    }

    sql += ` ORDER BY u.created_at DESC`;
    const result = await query(sql, params);

    return res.json({
      success: true,
      data: result.rows,
      total: result.rows.length,
    });
  } catch (err: any) {
    console.error('listUsers error', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

export const getUserById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = await queryOne('SELECT id, email, first_name, last_name, role, phone, is_active FROM users WHERE id = $1', [id]);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    return res.json({ success: true, data: user });
  } catch (err: any) {
    console.error('getUserById error', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

export const createUser = async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName, phone, role } = req.body;
    const allowedRoles = ['patient', 'doctor', 'secretary', 'admin'];

    if (!email || !password || !firstName || !lastName || !role) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ success: false, message: 'Role not allowed' });
    }

    const existingUser = await queryOne('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const hashedPassword = await hashPassword(password);
    const userId = uuidv4();

    await transaction(async (client) => {
      await client.query(
        'INSERT INTO users (id, email, password, first_name, last_name, phone, role) VALUES ($1,$2,$3,$4,$5,$6,$7)',
        [userId, email, hashedPassword, firstName, lastName, phone || null, role]
      );

      if (role === 'patient') {
        await client.query('INSERT INTO patients (id) VALUES ($1)', [userId]);
      }

      if (role === 'doctor') {
        const centerId = await getOrCreateDefaultCenter(client);
        await client.query(
          'INSERT INTO doctors (id, health_center_id, license_number, years_experience, bio, consultation_price, is_verified, specialties, average_rating) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
          [userId, centerId, `ADMIN-${Date.now()}`, 0, 'Registrado por administrador', 0.0, true, [], 0]
        );
      }
    });

    return res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: { id: userId, email, firstName, lastName, role, phone },
    });
  } catch (err: any) {
    console.error('createUser error', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { email, firstName, lastName, phone, role, isActive } = req.body;
    const allowedRoles = ['patient', 'doctor', 'secretary', 'admin'];

    if (!email || !firstName || !lastName || !role) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ success: false, message: 'Role not allowed' });
    }

    const existingUser = await queryOne('SELECT id FROM users WHERE id = $1', [id]);
    if (!existingUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const emailConflict = await queryOne('SELECT id FROM users WHERE email = $1 AND id != $2', [email, id]);
    if (emailConflict) {
      return res.status(400).json({ success: false, message: 'Another user already uses that email' });
    }

    await transaction(async (client) => {
      await client.query(
        'UPDATE users SET email = $1, first_name = $2, last_name = $3, phone = $4, role = $5, is_active = $6 WHERE id = $7',
        [email, firstName, lastName, phone || null, role, isActive !== undefined ? isActive : true, id]
      );

      if (role === 'patient') {
        const patientRow = await client.query('SELECT id FROM patients WHERE id = $1', [id]);
        if (patientRow.rowCount === 0) {
          await client.query('INSERT INTO patients (id) VALUES ($1)', [id]);
        }
      }

      if (role === 'doctor') {
        const doctorRow = await client.query('SELECT id FROM doctors WHERE id = $1', [id]);
        if (doctorRow.rowCount === 0) {
          const centerId = await getOrCreateDefaultCenter(client);
          await client.query(
            'INSERT INTO doctors (id, health_center_id, license_number, years_experience, bio, consultation_price, is_verified, specialties, average_rating) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
            [id, centerId, `ADMIN-${Date.now()}`, 0, 'Registrado por administrador', 0.0, true, [], 0]
          );
        }
      }
    });

    return res.json({ success: true, message: 'User updated successfully' });
  } catch (err: any) {
    console.error('updateUser error', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

export const listFeaturedDoctors = async (_req: Request, res: Response) => {
  try {
    await ensureDoctorDisplayColumns();
    const result = await query(
      `SELECT d.id, d.featured_on_home, d.specialties, d.average_rating, d.consultation_price,
              u.first_name, u.last_name, u.email, u.avatar,
              hc.name AS health_center_name, hc.city
       FROM doctors d
       JOIN users u ON u.id = d.id
       LEFT JOIN health_centers hc ON hc.id = d.health_center_id
       WHERE u.role = 'doctor' AND d.is_verified = true
       ORDER BY d.featured_on_home DESC, d.average_rating DESC, u.first_name ASC`
    );
    return res.json({ success: true, data: result.rows });
  } catch (err: any) {
    console.error('listFeaturedDoctors error', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

export const updateFeaturedDoctor = async (req: Request, res: Response) => {
  try {
    await ensureDoctorDisplayColumns();
    const { id } = req.params;
    const { featuredOnHome } = req.body;

    const doctor = await queryOne(
      "SELECT d.id FROM doctors d JOIN users u ON u.id = d.id WHERE d.id = $1 AND u.role = 'doctor'",
      [id]
    );
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found' });
    }

    const result = await query(
      'UPDATE doctors SET featured_on_home = $1 WHERE id = $2 RETURNING id, featured_on_home',
      [Boolean(featuredOnHome), id]
    );
    return res.json({ success: true, data: result.rows[0] });
  } catch (err: any) {
    console.error('updateFeaturedDoctor error', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

export const updateUserPassword = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const password = cleanText(req.body.password);

    if (!password || password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'La contraseña debe tener al menos 8 caracteres',
      });
    }

    const existingUser = await queryOne('SELECT id FROM users WHERE id = $1', [id]);
    if (!existingUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const hashedPassword = await hashPassword(password);
    await query(
      'UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [hashedPassword, id]
    );

    return res.json({
      success: true,
      message: 'Contraseña actualizada exitosamente',
    });
  } catch (err: any) {
    console.error('updateUserPassword error', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = await queryOne('SELECT id FROM users WHERE id = $1', [id]);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    await query('DELETE FROM users WHERE id = $1', [id]);
    return res.json({ success: true, message: 'User deleted successfully' });
  } catch (err: any) {
    console.error('deleteUser error', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

export const getStats = async (req: Request, res: Response) => {
  try {
    await ensureLaboratoriesTable();
    await syncPendingDoctorUsers();
    const [usersResult, doctorsResult, patientsResult, appointmentsResult, centersResult, laboratoriesResult, requestsResult, todayAppointmentsResult, activeUsersResult] = await Promise.all([
      query('SELECT COUNT(*) as count FROM users'),
      query("SELECT COUNT(*) as count FROM users WHERE role = 'doctor'"),
      query("SELECT COUNT(*) as count FROM users WHERE role = 'patient'"),
      query('SELECT COUNT(*) as count FROM appointments'),
      query('SELECT COUNT(*) as count FROM health_centers'),
      query('SELECT COUNT(*) as count FROM laboratories'),
      query('SELECT COUNT(*) as count FROM doctor_requests WHERE status = $1', ['pending']),
      query('SELECT COUNT(*) as count FROM appointments WHERE appointment_date = CURRENT_DATE'),
      query('SELECT COUNT(*) as count FROM users WHERE is_active = true'),
    ]);

    return res.json({
      success: true,
      data: {
        totalUsers: parseInt(usersResult.rows[0]?.count || '0'),
        totalDoctors: parseInt(doctorsResult.rows[0]?.count || '0'),
        totalPatients: parseInt(patientsResult.rows[0]?.count || '0'),
        totalAppointments: parseInt(appointmentsResult.rows[0]?.count || '0'),
        totalHealthCenters: parseInt(centersResult.rows[0]?.count || '0'),
        totalLaboratories: parseInt(laboratoriesResult.rows[0]?.count || '0'),
        pendingDoctorRequests: parseInt(requestsResult.rows[0]?.count || '0'),
        todayAppointments: parseInt(todayAppointmentsResult.rows[0]?.count || '0'),
        activeUsers: parseInt(activeUsersResult.rows[0]?.count || '0'),
      },
    });
  } catch (err: any) {
    console.error('getStats error', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

export const listHealthCenters = async (req: Request, res: Response) => {
  try {
    const result = await query(`SELECT id, name, address, city, state, postal_code, phone, email, image, description, created_at, updated_at FROM health_centers ORDER BY created_at DESC`);
    return res.json({ success: true, data: result.rows, total: result.rows.length });
  } catch (err: any) {
    console.error('listHealthCenters error', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

export const getHealthCenterById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const center = await queryOne('SELECT id, name, address, city, state, postal_code, phone, email, image, description FROM health_centers WHERE id = $1', [id]);
    if (!center) {
      return res.status(404).json({ success: false, message: 'Health center not found' });
    }
    return res.json({ success: true, data: center });
  } catch (err: any) {
    console.error('getHealthCenterById error', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

export const createHealthCenter = async (req: Request, res: Response) => {
  try {
    const name = cleanText(req.body.name);
    const address = cleanText(req.body.address);
    const city = cleanText(req.body.city);
    const state = cleanText(req.body.state);
    const postalCode = cleanText(req.body.postal_code);
    const phone = cleanText(req.body.phone);
    const email = cleanText(req.body.email)?.toLowerCase() || null;
    const image = cleanText(req.body.image);
    const description = cleanText(req.body.description);

    if (!name || !address || !city) {
      return res.status(400).json({
        success: false,
        message: 'Nombre, dirección y ciudad son obligatorios',
      });
    }

    if (email && !isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'El correo electrónico del centro no es válido',
      });
    }

    if (image && !isValidHttpUrl(image)) {
      return res.status(400).json({
        success: false,
        message: 'La URL de la imagen debe comenzar con http:// o https://',
      });
    }

    const existingCenter = await queryOne(
      `SELECT id
       FROM health_centers
       WHERE LOWER(name) = LOWER($1)
         AND LOWER(address) = LOWER($2)
         AND LOWER(city) = LOWER($3)
       LIMIT 1`,
      [name, address, city]
    );

    if (existingCenter) {
      return res.status(409).json({
        success: false,
        message: 'Ya existe un centro de salud con ese nombre, dirección y ciudad',
      });
    }

    const result = await query(
      `INSERT INTO health_centers
       (name, address, city, state, postal_code, phone, email, image, description)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING id, name, address, city, state, postal_code, phone, email, image, description, created_at, updated_at`,
      [name, address, city, state, postalCode, phone, email, image, description]
    );

    return res.status(201).json({
      success: true,
      message: 'Centro de salud creado exitosamente',
      data: result.rows[0],
    });
  } catch (err: any) {
    console.error('createHealthCenter error', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

export const updateHealthCenter = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const name = cleanText(req.body.name);
    const address = cleanText(req.body.address);
    const city = cleanText(req.body.city);
    const state = cleanText(req.body.state);
    const postalCode = cleanText(req.body.postal_code);
    const phone = cleanText(req.body.phone);
    const email = cleanText(req.body.email)?.toLowerCase() || null;
    const image = cleanText(req.body.image);
    const description = cleanText(req.body.description);

    if (!name || !address || !city) {
      return res.status(400).json({
        success: false,
        message: 'Nombre, dirección y ciudad son obligatorios',
      });
    }

    if (email && !isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'El correo electrónico del centro no es válido',
      });
    }

    if (image && !isValidHttpUrl(image)) {
      return res.status(400).json({
        success: false,
        message: 'La URL de la imagen debe comenzar con http:// o https://',
      });
    }

    const center = await queryOne('SELECT id FROM health_centers WHERE id = $1', [id]);
    if (!center) {
      return res.status(404).json({ success: false, message: 'Health center not found' });
    }

    const duplicate = await queryOne(
      `SELECT id
       FROM health_centers
       WHERE id != $1
         AND LOWER(name) = LOWER($2)
         AND LOWER(address) = LOWER($3)
         AND LOWER(city) = LOWER($4)
       LIMIT 1`,
      [id, name, address, city]
    );

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: 'Ya existe otro centro de salud con ese nombre, dirección y ciudad',
      });
    }

    const result = await query(
      `UPDATE health_centers
       SET name = $1,
           address = $2,
           city = $3,
           state = $4,
           postal_code = $5,
           phone = $6,
           email = $7,
           image = $8,
           description = $9,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $10
       RETURNING id, name, address, city, state, postal_code, phone, email, image, description, created_at, updated_at`,
      [name, address, city, state, postalCode, phone, email, image, description, id]
    );

    return res.json({
      success: true,
      message: 'Centro de salud actualizado exitosamente',
      data: result.rows[0],
    });
  } catch (err: any) {
    console.error('updateHealthCenter error', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

export const deleteHealthCenter = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const center = await queryOne('SELECT id FROM health_centers WHERE id = $1', [id]);
    if (!center) {
      return res.status(404).json({ success: false, message: 'Health center not found' });
    }

    await query('DELETE FROM health_centers WHERE id = $1', [id]);
    return res.json({ success: true, message: 'Health center deleted successfully' });
  } catch (err: any) {
    console.error('deleteHealthCenter error', err);
    if (err.code === '23503') {
      return res.status(400).json({ success: false, message: 'Cannot delete center with assigned doctors or appointments' });
    }
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

export const listAppointments = async (req: Request, res: Response) => {
  try {
    const { status, doctorId, patientId, date, search, page = 1, limit = 50 } = req.query;
    const params: any[] = [];
    const countParams: any[] = [];
    let sql = `
      SELECT a.id, a.appointment_date, a.appointment_time, a.status, a.reason_for_visit, a.notes,
             pu.first_name as patient_first_name, pu.last_name as patient_last_name,
             pu.email as patient_email, pu.phone as patient_phone,
             du.first_name as doctor_first_name, du.last_name as doctor_last_name,
             du.email as doctor_email, d.specialties[1] as doctor_specialty,
             hc.name as health_center_name
      FROM appointments a
      LEFT JOIN users pu ON a.patient_id = pu.id
      LEFT JOIN users du ON a.doctor_id = du.id
      LEFT JOIN doctors d ON a.doctor_id = d.id
      LEFT JOIN health_centers hc ON a.health_center_id = hc.id
      WHERE 1=1`;

    if (status) {
      params.push(status);
      countParams.push(status);
      sql += ` AND a.status = $${params.length}`;
    }
    if (doctorId) {
      params.push(doctorId);
      countParams.push(doctorId);
      sql += ` AND a.doctor_id = $${params.length}`;
    }
    if (patientId) {
      params.push(patientId);
      countParams.push(patientId);
      sql += ` AND a.patient_id = $${params.length}`;
    }
    if (date) {
      params.push(date);
      countParams.push(date);
      sql += ` AND a.appointment_date = $${params.length}`;
    }
    if (search) {
      const term = `%${String(search).toLowerCase()}%`;
      params.push(term);
      countParams.push(term);
      sql += ` AND (
        LOWER(COALESCE(pu.first_name, '') || ' ' || COALESCE(pu.last_name, '')) LIKE $${params.length}
        OR LOWER(COALESCE(du.first_name, '') || ' ' || COALESCE(du.last_name, '')) LIKE $${params.length}
        OR LOWER(COALESCE(hc.name, '')) LIKE $${params.length}
      )`;
    }

    const offset = (Number(page) - 1) * Number(limit);
    params.push(limit, offset);
    sql += ` ORDER BY a.appointment_date DESC, a.appointment_time DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const appointments = await query(sql, params);
    let countSql = 'SELECT COUNT(*) AS count FROM appointments a WHERE 1=1';
    let countIndex = 0;
    if (status) countSql += ` AND a.status = $${++countIndex}`;
    if (doctorId) countSql += ` AND a.doctor_id = $${++countIndex}`;
    if (patientId) countSql += ` AND a.patient_id = $${++countIndex}`;
    if (date) countSql += ` AND a.appointment_date = $${++countIndex}`;
    if (search) {
      countSql += ` AND EXISTS (
        SELECT 1
        FROM users pu
        LEFT JOIN users du ON du.id = a.doctor_id
        LEFT JOIN health_centers hc ON hc.id = a.health_center_id
        WHERE pu.id = a.patient_id
          AND (
            LOWER(COALESCE(pu.first_name, '') || ' ' || COALESCE(pu.last_name, '')) LIKE $${++countIndex}
            OR LOWER(COALESCE(du.first_name, '') || ' ' || COALESCE(du.last_name, '')) LIKE $${countIndex}
            OR LOWER(COALESCE(hc.name, '')) LIKE $${countIndex}
          )
      )`;
    }
    const totalResult = await query(countSql, countParams);

    const total = parseInt(totalResult.rows[0]?.count || '0');
    return res.json({
      success: true,
      data: appointments.rows || appointments,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    });
  } catch (err: any) {
    console.error('listAppointments error', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

export const cancelAppointment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const appointment = await queryOne('SELECT id FROM appointments WHERE id = $1', [id]);
    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    await query('UPDATE appointments SET status = $1, canceled_at = NOW() WHERE id = $2', ['cancelled', id]);
    return res.json({ success: true, message: 'Appointment cancelled successfully' });
  } catch (err: any) {
    console.error('cancelAppointment error', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

export const getReports = async (req: Request, res: Response) => {
  try {
    const range = typeof req.query.range === 'string' ? req.query.range : 'month';
    const allowedRanges = ['week', 'month', 'year'];
    const normalizedRange = allowedRanges.includes(range) ? range : 'month';
    const intervalByRange: Record<string, string> = {
      week: '7 days',
      month: '1 month',
      year: '1 year',
    };
    const appointmentDateFilter = `a.appointment_date >= CURRENT_DATE - INTERVAL '${intervalByRange[normalizedRange]}'`;
    const appointmentCountFilter = `appointment_date >= CURRENT_DATE - INTERVAL '${intervalByRange[normalizedRange]}'`;
    const createdAtFilter = `created_at >= CURRENT_DATE - INTERVAL '${intervalByRange[normalizedRange]}'`;

    const [statusCounts, topDoctors, topCenters] = await Promise.all([
      query(`SELECT status, COUNT(*) as count FROM appointments WHERE ${appointmentCountFilter} GROUP BY status`),
      query(
        `SELECT du.id, du.first_name, du.last_name, COUNT(a.id) AS appointment_count
         FROM appointments a
         LEFT JOIN users du ON a.doctor_id = du.id
         WHERE ${appointmentDateFilter}
         GROUP BY du.id, du.first_name, du.last_name
         ORDER BY appointment_count DESC
         LIMIT 5`
      ),
      query(
        `SELECT hc.id, hc.name, COUNT(a.id) AS appointment_count
         FROM appointments a
         LEFT JOIN health_centers hc ON a.health_center_id = hc.id
         WHERE ${appointmentDateFilter}
         GROUP BY hc.id, hc.name
         ORDER BY appointment_count DESC
         LIMIT 5`
      ),
    ]);

    const [totalUsers, totalDoctors, totalPatients, totalSecretaries, totalAppointments, totalHealthCenters] = await Promise.all([
      query(`SELECT COUNT(*) AS count FROM users WHERE ${createdAtFilter}`),
      query(`SELECT COUNT(*) AS count FROM users WHERE role = 'doctor' AND ${createdAtFilter}`),
      query(`SELECT COUNT(*) AS count FROM users WHERE role = 'patient' AND ${createdAtFilter}`),
      query(`SELECT COUNT(*) AS count FROM users WHERE role = 'secretary' AND ${createdAtFilter}`),
      query(`SELECT COUNT(*) AS count FROM appointments WHERE ${appointmentCountFilter}`),
      query(`SELECT COUNT(*) AS count FROM health_centers WHERE ${createdAtFilter}`),
    ]);

    return res.json({
      success: true,
      data: {
        range: normalizedRange,
        totals: {
          users: parseInt(totalUsers.rows[0]?.count || '0'),
          doctors: parseInt(totalDoctors.rows[0]?.count || '0'),
          patients: parseInt(totalPatients.rows[0]?.count || '0'),
          secretaries: parseInt(totalSecretaries.rows[0]?.count || '0'),
          appointments: parseInt(totalAppointments.rows[0]?.count || '0'),
          healthCenters: parseInt(totalHealthCenters.rows[0]?.count || '0'),
        },
        statusCounts: statusCounts.rows,
        topDoctors: topDoctors.rows,
        topCenters: topCenters.rows,
      },
    });
  } catch (err: any) {
    console.error('getReports error', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

export const listLaboratories = async (req: Request, res: Response) => {
  try {
    await ensureLaboratoriesTable();
    const result = await query(`
      SELECT id, name, address, city, state, postal_code, phone, email, website, image, description, services, is_active, created_at, updated_at
      FROM laboratories
      ORDER BY created_at DESC
    `);
    return res.json({ success: true, data: result.rows, total: result.rows.length });
  } catch (err: any) {
    console.error('listLaboratories error', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

export const getLaboratoryById = async (req: Request, res: Response) => {
  try {
    await ensureLaboratoriesTable();
    const laboratory = await queryOne(
      `SELECT id, name, address, city, state, postal_code, phone, email, website, image, description, services, is_active, created_at, updated_at
       FROM laboratories
       WHERE id = $1`,
      [req.params.id]
    );
    if (!laboratory) {
      return res.status(404).json({ success: false, message: 'Laboratorio no encontrado' });
    }
    return res.json({ success: true, data: laboratory });
  } catch (err: any) {
    console.error('getLaboratoryById error', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

function normalizeServices(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => cleanText(item))
    .filter((item): item is string => Boolean(item))
    .slice(0, 30);
}

export const createLaboratory = async (req: Request, res: Response) => {
  try {
    await ensureLaboratoriesTable();
    const name = cleanText(req.body.name);
    const address = cleanText(req.body.address);
    const city = cleanText(req.body.city);
    const state = cleanText(req.body.state);
    const postalCode = cleanText(req.body.postal_code);
    const phone = cleanText(req.body.phone);
    const email = cleanText(req.body.email)?.toLowerCase() || null;
    const website = cleanText(req.body.website);
    const image = cleanText(req.body.image);
    const description = cleanText(req.body.description);
    const services = normalizeServices(req.body.services);
    const isActive = req.body.is_active !== undefined ? Boolean(req.body.is_active) : true;

    if (!name || !address || !city) {
      return res.status(400).json({ success: false, message: 'Nombre, dirección y ciudad son obligatorios' });
    }
    if (email && !isValidEmail(email)) {
      return res.status(400).json({ success: false, message: 'El correo electrónico del laboratorio no es válido' });
    }
    if (website && !isValidHttpUrl(website)) {
      return res.status(400).json({ success: false, message: 'La URL del sitio web debe comenzar con http:// o https://' });
    }
    if (image && !isValidHttpUrl(image)) {
      return res.status(400).json({ success: false, message: 'La URL de la imagen debe comenzar con http:// o https://' });
    }

    const existing = await queryOne(
      `SELECT id FROM laboratories
       WHERE LOWER(name) = LOWER($1)
         AND LOWER(address) = LOWER($2)
         AND LOWER(city) = LOWER($3)
       LIMIT 1`,
      [name, address, city]
    );
    if (existing) {
      return res.status(409).json({ success: false, message: 'Ya existe un laboratorio con ese nombre, dirección y ciudad' });
    }

    const result = await query(
      `INSERT INTO laboratories
       (name, address, city, state, postal_code, phone, email, website, image, description, services, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING id, name, address, city, state, postal_code, phone, email, website, image, description, services, is_active, created_at, updated_at`,
      [name, address, city, state, postalCode, phone, email, website, image, description, services, isActive]
    );

    return res.status(201).json({ success: true, message: 'Laboratorio creado exitosamente', data: result.rows[0] });
  } catch (err: any) {
    console.error('createLaboratory error', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

export const updateLaboratory = async (req: Request, res: Response) => {
  try {
    await ensureLaboratoriesTable();
    const { id } = req.params;
    const name = cleanText(req.body.name);
    const address = cleanText(req.body.address);
    const city = cleanText(req.body.city);
    const state = cleanText(req.body.state);
    const postalCode = cleanText(req.body.postal_code);
    const phone = cleanText(req.body.phone);
    const email = cleanText(req.body.email)?.toLowerCase() || null;
    const website = cleanText(req.body.website);
    const image = cleanText(req.body.image);
    const description = cleanText(req.body.description);
    const services = normalizeServices(req.body.services);
    const isActive = req.body.is_active !== undefined ? Boolean(req.body.is_active) : true;

    if (!name || !address || !city) {
      return res.status(400).json({ success: false, message: 'Nombre, dirección y ciudad son obligatorios' });
    }
    if (email && !isValidEmail(email)) {
      return res.status(400).json({ success: false, message: 'El correo electrónico del laboratorio no es válido' });
    }
    if (website && !isValidHttpUrl(website)) {
      return res.status(400).json({ success: false, message: 'La URL del sitio web debe comenzar con http:// o https://' });
    }
    if (image && !isValidHttpUrl(image)) {
      return res.status(400).json({ success: false, message: 'La URL de la imagen debe comenzar con http:// o https://' });
    }

    const laboratory = await queryOne('SELECT id FROM laboratories WHERE id = $1', [id]);
    if (!laboratory) {
      return res.status(404).json({ success: false, message: 'Laboratorio no encontrado' });
    }

    const duplicate = await queryOne(
      `SELECT id FROM laboratories
       WHERE id != $1
         AND LOWER(name) = LOWER($2)
         AND LOWER(address) = LOWER($3)
         AND LOWER(city) = LOWER($4)
       LIMIT 1`,
      [id, name, address, city]
    );
    if (duplicate) {
      return res.status(409).json({ success: false, message: 'Ya existe otro laboratorio con ese nombre, dirección y ciudad' });
    }

    const result = await query(
      `UPDATE laboratories
       SET name = $1,
           address = $2,
           city = $3,
           state = $4,
           postal_code = $5,
           phone = $6,
           email = $7,
           website = $8,
           image = $9,
           description = $10,
           services = $11,
           is_active = $12,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $13
       RETURNING id, name, address, city, state, postal_code, phone, email, website, image, description, services, is_active, created_at, updated_at`,
      [name, address, city, state, postalCode, phone, email, website, image, description, services, isActive, id]
    );

    return res.json({ success: true, message: 'Laboratorio actualizado exitosamente', data: result.rows[0] });
  } catch (err: any) {
    console.error('updateLaboratory error', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

export const deleteLaboratory = async (req: Request, res: Response) => {
  try {
    await ensureLaboratoriesTable();
    const laboratory = await queryOne('SELECT id FROM laboratories WHERE id = $1', [req.params.id]);
    if (!laboratory) {
      return res.status(404).json({ success: false, message: 'Laboratorio no encontrado' });
    }

    await query('DELETE FROM laboratories WHERE id = $1', [req.params.id]);
    return res.json({ success: true, message: 'Laboratorio eliminado exitosamente' });
  } catch (err: any) {
    console.error('deleteLaboratory error', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

export const listDoctorPayments = async (req: Request, res: Response) => {
  try {
    await ensureDoctorPaymentsTable();
    const period = getPaymentPeriod(req.query.period);
    if (!period) {
      return res.status(400).json({ success: false, message: 'Periodo inválido. Usa YYYY-MM' });
    }

    const result = await query(
      `SELECT
         d.id AS doctor_id,
         u.first_name,
         u.last_name,
         u.email,
         u.phone,
         hc.name AS health_center_name,
         COALESCE(dp.period_month, $1::date) AS period_month,
         COALESCE(dp.due_date, $2::date) AS due_date,
         COALESCE(dp.grace_until, $3::date) AS grace_until,
         COALESCE(dp.amount, 0) AS amount,
         CASE
           WHEN dp.status IS NULL AND CURRENT_DATE > $3::date THEN 'overdue'
           WHEN dp.status IS NULL THEN 'pending'
           WHEN dp.status = 'pending' AND CURRENT_DATE > dp.grace_until THEN 'overdue'
           ELSE dp.status
         END AS status,
         dp.id AS payment_id,
         dp.paid_at,
         dp.payment_method,
         dp.reference,
         dp.notes
       FROM doctors d
       JOIN users u ON u.id = d.id
       LEFT JOIN health_centers hc ON hc.id = d.health_center_id
       LEFT JOIN doctor_payments dp
         ON dp.doctor_id = d.id
        AND dp.period_month = $1::date
       WHERE u.is_active = true
       ORDER BY status DESC, u.first_name ASC, u.last_name ASC`,
      [period.periodMonth, period.dueDate, period.graceUntil]
    );

    const rows = result.rows;
    const summary = rows.reduce(
      (acc: any, row: any) => {
        acc.total += 1;
        acc[row.status] = (acc[row.status] || 0) + 1;
        return acc;
      },
      { total: 0, paid: 0, pending: 0, overdue: 0, waived: 0 }
    );

    return res.json({
      success: true,
      data: rows,
      summary,
      period,
    });
  } catch (err: any) {
    console.error('listDoctorPayments error', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

export const upsertDoctorPayment = async (req: Request, res: Response) => {
  try {
    await ensureDoctorPaymentsTable();
    const { doctorId } = req.params;
    const period = getPaymentPeriod(req.body.period);
    const status = cleanText(req.body.status) || 'pending';
    const allowedStatuses = ['pending', 'paid', 'overdue', 'waived'];

    if (!period) {
      return res.status(400).json({ success: false, message: 'Periodo inválido. Usa YYYY-MM' });
    }

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Estado de pago no permitido' });
    }

    const doctor = await queryOne(
      "SELECT d.id FROM doctors d JOIN users u ON u.id = d.id WHERE d.id = $1 AND u.role = 'doctor'",
      [doctorId]
    );
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor no encontrado' });
    }

    const amount = Number(req.body.amount || 0);
    if (Number.isNaN(amount) || amount < 0) {
      return res.status(400).json({ success: false, message: 'Monto inválido' });
    }

    const paymentMethod = cleanText(req.body.paymentMethod);
    const reference = cleanText(req.body.reference);
    const notes = cleanText(req.body.notes);
    const paidAt = status === 'paid' ? (cleanText(req.body.paidAt) || new Date().toISOString()) : null;

    const result = await query(
      `INSERT INTO doctor_payments
       (doctor_id, period_month, due_date, grace_until, amount, status, paid_at, payment_method, reference, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (doctor_id, period_month)
       DO UPDATE SET
         due_date = EXCLUDED.due_date,
         grace_until = EXCLUDED.grace_until,
         amount = EXCLUDED.amount,
         status = EXCLUDED.status,
         paid_at = EXCLUDED.paid_at,
         payment_method = EXCLUDED.payment_method,
         reference = EXCLUDED.reference,
         notes = EXCLUDED.notes,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [doctorId, period.periodMonth, period.dueDate, period.graceUntil, amount, status, paidAt, paymentMethod, reference, notes]
    );

    return res.json({
      success: true,
      message: 'Pago del doctor actualizado exitosamente',
      data: result.rows[0],
    });
  } catch (err: any) {
    console.error('upsertDoctorPayment error', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

export const listAuditLogs = async (req: Request, res: Response) => {
  try {
    const { patientId, doctorId, action, entity, from, to, page = 1, limit = 50 } = req.query;
    const params: any[] = [];
    let sql = `
      SELECT al.*, u.first_name, u.last_name, u.email
      FROM audit_logs al
      LEFT JOIN users u ON u.id = al.user_id
      WHERE 1=1
    `;

    if (patientId) { params.push(patientId); sql += ` AND al.patient_id = $${params.length}`; }
    if (doctorId) { params.push(doctorId); sql += ` AND al.doctor_id = $${params.length}`; }
    if (action) { params.push(action); sql += ` AND al.action = $${params.length}`; }
    if (entity) { params.push(entity); sql += ` AND al.entity = $${params.length}`; }
    if (from) { params.push(from); sql += ` AND al.created_at >= $${params.length}`; }
    if (to) { params.push(to); sql += ` AND al.created_at <= $${params.length}`; }

    const offset = (Number(page) - 1) * Number(limit);
    params.push(limit, offset);
    sql += ` ORDER BY al.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const result = await query(sql, params);
    return res.json({ success: true, data: result.rows, page: Number(page), limit: Number(limit) });
  } catch (err: any) {
    console.error('listAuditLogs error', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

export const getRecentActivity = async (req: Request, res: Response) => {
  try {
    await ensureLaboratoriesTable();
    const result = await query(`
      SELECT * FROM (
        SELECT id::text, 'Usuario creado' AS action, first_name || ' ' || last_name AS "user", created_at, role::text AS type
        FROM users
        UNION ALL
        SELECT id::text, 'Cita agendada' AS action, COALESCE(reason_for_visit, 'Sin motivo registrado') AS "user", created_at, 'appointment' AS type
        FROM appointments
        UNION ALL
        SELECT id::text, 'Solicitud de medico' AS action, name AS "user", created_at, CASE WHEN status = 'pending' THEN 'pending' ELSE 'doctor' END AS type
        FROM doctor_requests
        UNION ALL
        SELECT id::text, 'Centro de salud creado' AS action, name AS "user", created_at, 'system' AS type
        FROM health_centers
        UNION ALL
        SELECT id::text, 'Laboratorio creado' AS action, name AS "user", created_at, 'system' AS type
        FROM laboratories
      ) activity
      ORDER BY created_at DESC
      LIMIT 50
    `);

    return res.json({ success: true, data: result.rows });
  } catch (err: any) {
    console.error('getRecentActivity error', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

export const getSettings = async (req: Request, res: Response) => {
  try {
    const settings = await getRuntimeSettings();
    return res.json({ success: true, data: settings });
  } catch (err: any) {
    console.error('getSettings error', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

export const updateSettings = async (req: Request, res: Response) => {
  try {
    const { section } = req.params;
    const allowedSections = ['general', 'security', 'notifications', 'appearance', 'system'];
    if (!allowedSections.includes(section)) {
      return res.status(400).json({ success: false, message: 'Settings section not allowed' });
    }

    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      return res.status(400).json({ success: false, message: 'Configuración inválida' });
    }
    if (section === 'security') {
      const min = Number(req.body.passwordMinLength);
      const attempts = Number(req.body.maxLoginAttempts);
      if (!Number.isInteger(min) || min < 8 || min > 128 || !Number.isInteger(attempts) || attempts < 1 || attempts > 20) {
        return res.status(400).json({ success: false, message: 'Los valores de seguridad no son válidos' });
      }
    }
    await ensureAdminSettingsTable();
    const result = await query(
      `INSERT INTO admin_settings (section, settings, updated_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (section)
       DO UPDATE SET settings = EXCLUDED.settings, updated_at = CURRENT_TIMESTAMP
       RETURNING section, settings`,
      [section, req.body]
    );
    invalidateSettings(section as any);

    return res.json({ success: true, data: result.rows[0] });
  } catch (err: any) {
    console.error('updateSettings error', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

export const getPublicRuntimeSettings = async (_req: Request, res: Response) => {
  try { return res.json({ success: true, data: await getPublicSettings() }); }
  catch (err: any) { return res.status(500).json({ success: false, message: err.message || 'Server error' }); }
};

export const getWhatsAppStatus = async (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: getWhatsAppConfigStatus(),
  });
};

export const sendWhatsAppTestMessage = async (req: Request, res: Response) => {
  try {
    const to = String(req.body?.to || process.env.WHATSAPP_TEST_RECIPIENT || '').trim();
    const templateName = String(req.body?.templateName || 'hello_world').trim();
    const languageCode = String(req.body?.languageCode || 'en_US').trim();
    const result = await sendWhatsAppTemplate({ to, templateName, languageCode });

    res.json({
      success: true,
      message: 'Mensaje de prueba enviado por WhatsApp.',
      data: {
        provider: result.provider,
        messageId: result.messageId,
      },
    });
  } catch (err: any) {
    console.error('sendWhatsAppTestMessage error', err);
    res.status(400).json({
      success: false,
      message: err.message || 'No se pudo enviar el mensaje de prueba por WhatsApp.',
    });
  }
};

export default {
  listDoctorRequests,
  approveDoctorRequest,
  verifyDoctorRequest,
  reviewDoctorVerification,
  rejectDoctorRequest,
  listUsers,
  getUserById,
  createUser,
  updateUser,
  updateUserPassword,
  deleteUser,
  getStats,
  getRecentActivity,
  listAuditLogs,
  listHealthCenters,
  getHealthCenterById,
  createHealthCenter,
  updateHealthCenter,
  deleteHealthCenter,
  listLaboratories,
  getLaboratoryById,
  createLaboratory,
  updateLaboratory,
  deleteLaboratory,
  listAppointments,
  cancelAppointment,
  getReports,
  listDoctorPayments,
  upsertDoctorPayment,
  getSettings,
  updateSettings,
  getPublicRuntimeSettings,
  getWhatsAppStatus,
  sendWhatsAppTestMessage,
};
