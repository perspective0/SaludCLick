import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { hashPassword, comparePassword, generateToken } from '../utils/auth';
import { query, queryOne, transaction } from '../db';
import { v4 as uuidv4 } from 'uuid';
import { ensureDoctorVerificationColumns, verifyDoctorExequatur } from '../utils/doctorVerification';
import { UserRole } from '../types';
import { getSettings } from '../services/settingsService';
import { notifyDoctorRequestTelegram } from '../utils/telegram';
import crypto from 'crypto';
import { clearCsrfCookie, setCsrfCookie } from '../middleware/csrf';

const failedLogins = new Map<string, { count: number; blockedUntil?: number }>();
const AUTH_COOKIE = 'saludclick_session';
const DEFAULT_SESSION_MINUTES = 7 * 24 * 60;
const isProduction = process.env.NODE_ENV === 'production';
const cookieSameSite = isProduction ? 'none' : 'lax';

function setAuthCookie(res: Response, token: string, maxAgeMinutes = DEFAULT_SESSION_MINUTES) {
  res.cookie(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: cookieSameSite,
    path: '/',
    maxAge: maxAgeMinutes * 60 * 1000,
  });
  setCsrfCookie(res, crypto.randomBytes(32).toString('base64url'), maxAgeMinutes);
}

function clearAuthCookie(res: Response) {
  res.clearCookie(AUTH_COOKIE, {
    httpOnly: true,
    secure: isProduction,
    sameSite: cookieSameSite,
    path: '/',
  });
  clearCsrfCookie(res);
}

async function validatePasswordPolicy(password: string) {
  const security = await getSettings('security');
  const min = Number(security.passwordMinLength) || 8;
  if (String(password || '').length < min) return `La contraseña debe tener al menos ${min} caracteres`;
  if (security.requireNumbers && !/\d/.test(password)) return 'La contraseña debe incluir un número';
  if (security.requireSpecialChars && !/[^A-Za-z0-9]/.test(password)) return 'La contraseña debe incluir un carácter especial';
  return null;
}

async function getOrCreateDefaultCenter(client: any) {
  const centerResult = await client.query('SELECT id FROM health_centers LIMIT 1');
  if (centerResult.rowCount > 0) {
    return centerResult.rows[0].id;
  }

  const insertResult = await client.query(
    'INSERT INTO health_centers (name, address, city, phone, email, description) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id',
    ['SaludClick Network', 'No asignada', 'Virtual', '000-000-0000', 'admin@saludclick.com', 'Centro médico predeterminado para doctores pendientes']
  );
  return insertResult.rows[0].id;
}

async function ensureDoctorHealthCentersTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS doctor_health_centers (
      doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
      health_center_id UUID NOT NULL REFERENCES health_centers(id) ON DELETE CASCADE,
      is_primary BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (doctor_id, health_center_id)
    )
  `);

  await query('CREATE INDEX IF NOT EXISTS idx_doctor_health_centers_doctor ON doctor_health_centers(doctor_id)');
  await query('CREATE INDEX IF NOT EXISTS idx_doctor_health_centers_center ON doctor_health_centers(health_center_id)');
}

async function ensurePatientClaimColumns() {
  await query('ALTER TABLE patients ADD COLUMN IF NOT EXISTS document_number VARCHAR(30)').catch(() => null);
  await query('ALTER TABLE patients ADD COLUMN IF NOT EXISTS manual_patient_created_by_doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL').catch(() => null);
  await query('ALTER TABLE patients ADD COLUMN IF NOT EXISTS manual_patient_created_at TIMESTAMP').catch(() => null);
  await query('ALTER TABLE patients ADD COLUMN IF NOT EXISTS account_claimed_at TIMESTAMP').catch(() => null);
}

function normalizeDocument(value: any) {
  return String(value || '').replace(/\D/g, '');
}

function normalizeName(value: any) {
  return String(value || '').trim().toLowerCase();
}

async function findClaimableManualPatient(client: any, email: string, documentNumber?: string, firstName?: string, lastName?: string) {
  const cleanDocument = normalizeDocument(documentNumber);
  const cleanFirstName = normalizeName(firstName);
  const cleanLastName = normalizeName(lastName);

  if (cleanDocument && cleanFirstName && cleanLastName) {
    const byDocument = await client.query(
      `SELECT p.id, u.email
       FROM patients p
       JOIN users u ON u.id = p.id
       WHERE p.account_claimed_at IS NULL
         AND p.manual_patient_created_at IS NOT NULL
         AND regexp_replace(COALESCE(p.document_number, ''), '\\D', '', 'g') = $1
         AND LOWER(TRIM(u.first_name)) = $2
         AND LOWER(TRIM(u.last_name)) = $3
       LIMIT 1`,
      [cleanDocument, cleanFirstName, cleanLastName]
    );
    if (byDocument.rowCount > 0) return byDocument.rows[0];
  }

  const byEmail = await client.query(
    `SELECT p.id, u.email
     FROM patients p
     JOIN users u ON u.id = p.id
     WHERE p.account_claimed_at IS NULL
       AND p.manual_patient_created_at IS NOT NULL
       AND LOWER(u.email) = LOWER($1)
     LIMIT 1`,
    [email]
  );
  return byEmail.rowCount > 0 ? byEmail.rows[0] : null;
}

/**
 * Register a new user
 */
export const register = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const {
      email: rawEmail,
      password,
      firstName,
      lastName,
      phone,
      role,
      documentNumber,
      especialidad,
      exequatur,
      clinic,
      healthCenterId,
      healthCenterMode,
    } = req.body;

    const email = String(rawEmail || '').trim().toLowerCase();
    const passwordError = await validatePasswordPolicy(password);
    if (passwordError) return res.status(400).json({ success: false, message: passwordError });

    if (role === 'patient') {
      await ensurePatientClaimColumns();
    }

    // Check if user exists
    const existingUser = await queryOne('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser) {
      if (role === 'patient') {
        const hashedPassword = await hashPassword(password);
        const claimed = await transaction(async (client) => {
          const manualPatient = await findClaimableManualPatient(client, email, documentNumber, firstName, lastName);
          if (!manualPatient || manualPatient.id !== existingUser.id) return null;

          await client.query(
            `UPDATE users
             SET password = $1, first_name = $2, last_name = $3, phone = COALESCE($4, phone), is_active = true, updated_at = NOW()
             WHERE id = $5`,
            [hashedPassword, firstName, lastName, phone || null, manualPatient.id]
          );
          await client.query(
            `UPDATE patients
             SET account_claimed_at = NOW(),
                 document_number = COALESCE(NULLIF($1, ''), document_number)
             WHERE id = $2`,
            [String(documentNumber || '').trim(), manualPatient.id]
          );
          return manualPatient;
        });

        if (claimed) {
          const token = generateToken({ id: claimed.id, email, role });
          setAuthCookie(res, token);
          return res.status(200).json({
            success: true,
            message: 'Cuenta de paciente vinculada con el registro clínico existente.',
            data: {
              user: {
                id: claimed.id,
                email,
                firstName,
                lastName,
                role,
              },
              token,
              linkedExistingPatient: true,
            },
          });
        }
      }

      return res.status(400).json({
        success: false,
        message: 'Email already registered',
      });
    }

    if (role === 'doctor') {
      await ensureDoctorVerificationColumns();
      await ensureDoctorHealthCentersTable();

      if (!exequatur) {
        return res.status(400).json({
          success: false,
          message: 'El exequatur es obligatorio para solicitar acceso como médico',
        });
      }

      const existingRequest = await queryOne('SELECT id FROM doctor_requests WHERE LOWER(email) = LOWER($1)', [email]);

      const fullName = `${firstName} ${lastName}`.trim();
      const requestedHealthCenterMode = healthCenterMode === 'other' ? 'other' : 'existing';
      const requestedHealthCenterId = requestedHealthCenterMode === 'existing' && healthCenterId ? healthCenterId : null;
      let clinicName = clinic || null;

      if (requestedHealthCenterId) {
        const center = await queryOne('SELECT id, name FROM health_centers WHERE id = $1', [requestedHealthCenterId]);
        if (!center) {
          return res.status(400).json({ success: false, message: 'Centro de salud no encontrado' });
        }
        clinicName = center.name;
      }

      const verification = await verifyDoctorExequatur({
        firstName,
        lastName,
        fullName,
        exequatur,
        specialty: especialidad,
      });

      const hashedPassword = await hashPassword(password);
      const userId = uuidv4();
      const requestMessage = requestedHealthCenterMode === 'other'
        ? `Especialidad: ${especialidad || 'No indicada'}. Centro pendiente de seleccionar o crear al completar perfil.`
        : especialidad ? `Especialidad: ${especialidad}` : null;

      const result = await transaction(async (client) => {
        await client.query(
          'INSERT INTO users (id, email, password, first_name, last_name, phone, role) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [userId, email, hashedPassword, firstName, lastName, phone || null, 'doctor']
        );

        let centerId = requestedHealthCenterId;
        if (!centerId) {
          centerId = await getOrCreateDefaultCenter(client);
        }

        await client.query(
          `INSERT INTO doctors (
             id, health_center_id, license_number, years_experience, bio, consultation_price,
             is_verified, specialties, average_rating
           )
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [
            userId,
            centerId,
            exequatur,
            0,
            requestedHealthCenterMode === 'other'
              ? 'Cuenta creada. Debe seleccionar un centro existente o crear el centro donde atiende al completar el perfil.'
              : `Cuenta pendiente de aprobacion desde ${clinicName || 'SaludClick'}`,
            0,
            false,
            especialidad ? [especialidad] : [],
            0,
          ]
        );

        await client.query(
          `INSERT INTO doctor_health_centers (doctor_id, health_center_id, is_primary)
           VALUES ($1, $2, true)
           ON CONFLICT (doctor_id, health_center_id) DO UPDATE SET is_primary = true`,
          [userId, centerId]
        );

        const requestSql = existingRequest
          ? `UPDATE doctor_requests
             SET name = $1, first_name = $2, last_name = $3, email = $4, phone = $5, clinic = $6,
                 requested_health_center_id = $7, requested_health_center_mode = $8,
                 license_number = $9, exequatur = $9, specialty = $10, message = $11,
                 status = 'pending', verification_status = $12, verification_score = $13,
                 verification_source = $14, verification_message = $15,
                 verification_checked_at = $16, verification_payload = $17
             WHERE id = $18
             RETURNING *`
          : `INSERT INTO doctor_requests (
               name, first_name, last_name, email, phone, clinic, requested_health_center_id, requested_health_center_mode,
               license_number, exequatur, specialty,
               message, status, verification_status, verification_score, verification_source,
               verification_message, verification_checked_at, verification_payload
             )
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9, $10, $11, 'pending', $12, $13, $14, $15, $16, $17)
             RETURNING *`;
        const requestParams = [
          fullName,
          firstName,
          lastName,
          email,
          phone || null,
          clinicName,
          requestedHealthCenterId,
          requestedHealthCenterMode,
          exequatur,
          especialidad || null,
          requestMessage,
          verification.status,
          verification.score,
          verification.source,
          verification.message,
          verification.checkedAt,
          JSON.stringify(verification),
        ];
        if (existingRequest) {
          requestParams.push(existingRequest.id);
        }

        const requestResult = await client.query(requestSql, requestParams);
        return requestResult.rows[0];
      });

      const token = generateToken({ id: userId, email, role: UserRole.DOCTOR });
      setAuthCookie(res, token);
      notifyDoctorRequestTelegram({
        firstName,
        lastName,
        email,
        specialty: especialidad,
        phone,
        exequatur,
      }).catch((error) => {
        console.error('Telegram doctor request notification error:', error);
      });

      return res.status(201).json({
        success: true,
        message: 'Doctor account created pending approval',
        data: {
          user: {
            id: userId,
            email,
            firstName,
            lastName,
            role: 'doctor',
          },
          token,
          request: result,
        },
      });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    const userId = uuidv4();

    // If patient, first try to claim a manual profile created in clinic.
    if (role === 'patient') {
      const claimed = await transaction(async (client) => {
        const manualPatient = await findClaimableManualPatient(client, email, documentNumber, firstName, lastName);
        if (!manualPatient) return null;

        const emailInUse = await client.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND id <> $2', [email, manualPatient.id]);
        if ((emailInUse.rowCount || 0) > 0) return null;

        await client.query(
          `UPDATE users
           SET email = $1, password = $2, first_name = $3, last_name = $4, phone = COALESCE($5, phone), is_active = true, updated_at = NOW()
           WHERE id = $6`,
          [email, hashedPassword, firstName, lastName, phone || null, manualPatient.id]
        );
        await client.query(
          `UPDATE patients
           SET account_claimed_at = NOW(),
               document_number = COALESCE(NULLIF($1, ''), document_number)
           WHERE id = $2`,
          [String(documentNumber || '').trim(), manualPatient.id]
        );
        return manualPatient;
      });

      if (claimed) {
        const token = generateToken({ id: claimed.id, email, role });
        setAuthCookie(res, token);
        return res.status(200).json({
          success: true,
            message: 'Cuenta de paciente vinculada con el registro clínico existente.',
          data: {
            user: {
              id: claimed.id,
              email,
              firstName,
              lastName,
              role,
            },
            token,
            linkedExistingPatient: true,
          },
        });
      }
    }

    // Create user
    await query(
      'INSERT INTO users (id, email, password, first_name, last_name, phone, role) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [userId, email, hashedPassword, firstName, lastName, phone || null, role]
    );

    // If patient, create patient record
    if (role === 'patient') {
      await query(
        `INSERT INTO patients (id, document_number, account_claimed_at)
         VALUES ($1, NULLIF($2, ''), NOW())`,
        [userId, String(documentNumber || '').trim()]
      );
    }

    // Generate token
    const token = generateToken({ id: userId, email, role });
    setAuthCookie(res, token);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: userId,
          email,
          firstName,
          lastName,
          role,
        },
        token,
      },
    });
  } catch (error: any) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: 'Error registering user',
    });
  }
};

/**
 * Login user
 */
export const login = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { email: rawEmail, password } = req.body;
    const email = String(rawEmail || '').trim().toLowerCase();
    const security = await getSettings('security');
    const attempt = failedLogins.get(email);
    if (attempt?.blockedUntil && attempt.blockedUntil > Date.now()) {
      return res.status(429).json({ success: false, message: 'Demasiados intentos. Intenta nuevamente más tarde.' });
    }

    // Find user
    const user = await queryOne(
      'SELECT id, email, password, first_name, last_name, role FROM users WHERE LOWER(email) = LOWER($1)',
      [email]
    );

    if (!user) {
      const pendingDoctorRequest = await queryOne(
        'SELECT id, status FROM doctor_requests WHERE LOWER(email) = LOWER($1)',
        [email]
      );
      if (pendingDoctorRequest) {
        return res.status(401).json({
          success: false,
          message: 'Tu solicitud de médico existe, pero la cuenta aún no fue creada. Vuelve a registrarte con ese correo para activar el acceso.',
        });
      }

      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Compare password
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      const count = (attempt?.count || 0) + 1;
      const max = Number(security.maxLoginAttempts) || 5;
      failedLogins.set(email, { count, blockedUntil: count >= max ? Date.now() + 15 * 60 * 1000 : undefined });
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }
    failedLogins.delete(email);

    // Generate token
    const sessionMinutes = Number(security.sessionTimeout) || 30;
    const token = generateToken({ id: user.id, email: user.email, role: user.role }, `${sessionMinutes}m`);
    setAuthCookie(res, token, sessionMinutes);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
        },
        token,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message:
        process.env.NODE_ENV === 'development'
          ? error.message || 'Error logging in'
          : 'Error logging in',
    });
  }
};

/**
 * Logout (client-side mostly)
 */
export const logout = (req: Request, res: Response) => {
  clearAuthCookie(res);
  res.json({
    success: true,
    message: 'Logout successful',
  });
};

/**
 * Get current user
 */
export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
    }

    const user = await queryOne(
      'SELECT id, email, first_name, last_name, role, avatar FROM users WHERE id = $1',
      [req.user.id]
    );

    res.json({
      success: true,
      data: user,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching user',
    });
  }
};
