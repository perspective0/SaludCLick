import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { hashPassword } from '../utils/auth';
import { query, queryOne, queryMany, transaction } from '../db';
import { sendEmail } from '../utils/mailer';

/**
 * Create a new secretary user and assign to a doctor
 */
export const createSecretary = async (req: Request, res: Response) => {
  try {
    const { email, firstName, lastName, phone, password, doctorId, linkExisting } = req.body;

    // Only doctors or admins can create secretaries
    const requesterRole = req.user?.role;
    const requesterId = req.user?.id;

    if (!email || !firstName || !lastName) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // Decide doctor assignment
    let assignToDoctorId = doctorId;
    if (requesterRole === 'doctor') assignToDoctorId = requesterId;
    if (!assignToDoctorId) {
      return res.status(400).json({ success: false, message: 'doctorId is required when creating a secretary' });
    }

    const existing = await queryOne('SELECT id, email, first_name, last_name, phone, role FROM users WHERE email = $1', [email]);
    if (existing) {
      if (existing.role !== 'secretary') {
        return res.status(400).json({ success: false, message: 'Email already registered by a non-secretary user' });
      }

      if (!linkExisting) {
        return res.status(409).json({
          success: false,
          code: 'EXISTING_SECRETARY',
          message: 'This email belongs to an existing secretary. Confirm to associate this account.',
          data: {
            id: existing.id,
            email: existing.email,
            firstName: existing.first_name,
            lastName: existing.last_name,
            phone: existing.phone,
          },
        });
      }

      const alreadyAssigned = await queryOne(
        'SELECT 1 FROM secretaries WHERE id = $1 AND doctor_id = $2',
        [existing.id, assignToDoctorId]
      );

      if (alreadyAssigned) {
        return res.status(400).json({ success: false, message: 'Secretary is already assigned to this doctor' });
      }

      await query(
        'INSERT INTO secretaries (id, doctor_id) VALUES ($1,$2)',
        [existing.id, assignToDoctorId]
      );

      return res.status(201).json({
        success: true,
        message: 'Existing secretary assigned',
        data: {
          id: existing.id,
          email: existing.email,
          firstName: existing.first_name,
          lastName: existing.last_name,
          phone: existing.phone,
          assignedDoctorId: assignToDoctorId,
          linkedExisting: true,
        },
      });
    }

    const userId = uuidv4();
    const plainPassword = password || Math.random().toString(36).slice(-8);
    const hashed = await hashPassword(plainPassword);

    // Transaction: create user and secretary record
    await transaction(async (client) => {
      await client.query(
        'INSERT INTO users (id, email, password, first_name, last_name, phone, role) VALUES ($1,$2,$3,$4,$5,$6,$7)',
        [userId, email, hashed, firstName, lastName, phone || null, 'secretary']
      );

      await client.query(
        'INSERT INTO secretaries (id, doctor_id) VALUES ($1,$2)',
        [userId, assignToDoctorId]
      );
    });

    // Send email with credentials if possible
    try {
      await sendEmail({
        to: email,
        subject: 'Tu usuario de secretaria en SaludClick',
        text: `Hola ${firstName},\n\nSe ha creado tu cuenta de secretaria en SaludClick.\nEmail: ${email}\nContraseña temporal: ${plainPassword}\n\nPor favor inicia sesión y cambia tu contraseña.\n`,
      });
    } catch (e) {
      console.warn('Failed to send secretary creation email', e);
    }

    res.status(201).json({
      success: true,
      message: 'Secretary created',
      data: {
        id: userId,
        email,
        firstName,
        lastName,
        phone: phone || null,
        assignedDoctorId: assignToDoctorId,
        temporaryPassword: plainPassword,
        linkedExisting: false,
      },
    });
  } catch (error: any) {
    console.error('createSecretary error', error);
    res.status(500).json({ success: false, message: 'Error creating secretary' });
  }
};

/**
 * Update secretary info or reassign doctor (admin/doctor)
 */
export const updateSecretary = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, phone, doctorId } = req.body;
    const requesterRole = req.user?.role;
    const requesterId = req.user?.id;

    // Only admin or the doctor owning the secretary can update
    if (requesterRole === 'doctor') {
      const sec = await queryOne('SELECT doctor_id FROM secretaries WHERE id = $1 AND doctor_id = $2', [id, requesterId]);
      if (!sec || sec.doctor_id !== requesterId) {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
      }
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (firstName) { updates.push(`first_name = $${params.length + 1}`); params.push(firstName); }
    if (lastName) { updates.push(`last_name = $${params.length + 1}`); params.push(lastName); }
    if (phone !== undefined) { updates.push(`phone = $${params.length + 1}`); params.push(phone); }

    if (updates.length > 0) {
      params.push(id);
      await query(`UPDATE users SET ${updates.join(', ')} WHERE id = $${params.length}`, params);
    }

    if (doctorId) {
      // admin can add another doctor association; doctor can add only themselves
      if (requesterRole === 'doctor' && requesterId !== doctorId) {
        return res.status(403).json({ success: false, message: 'Doctors can only assign secretaries to themselves' });
      }
      await query(
        `INSERT INTO secretaries (id, doctor_id)
         VALUES ($1, $2)
         ON CONFLICT (id, doctor_id) DO NOTHING`,
        [id, doctorId]
      );
    }

    res.json({ success: true, message: 'Secretary updated' });
  } catch (error: any) {
    console.error('updateSecretary error', error);
    res.status(500).json({ success: false, message: 'Error updating secretary' });
  }
};

/**
 * Remove a secretary assignment without deleting or deactivating the user.
 */
export const deleteSecretary = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const requesterRole = req.user?.role;
    const requesterId = req.user?.id;
    const { doctorId } = req.query;

    if (requesterRole === 'doctor') {
      const sec = await queryOne('SELECT doctor_id FROM secretaries WHERE id = $1 AND doctor_id = $2', [id, requesterId]);
      if (!sec || sec.doctor_id !== requesterId) {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
      }

      await query('DELETE FROM secretaries WHERE id = $1 AND doctor_id = $2', [id, requesterId]);
    } else if (requesterRole === 'admin' && doctorId) {
      await query('DELETE FROM secretaries WHERE id = $1 AND doctor_id = $2', [id, doctorId]);
    } else if (requesterRole === 'admin') {
      await query('DELETE FROM secretaries WHERE id = $1', [id]);
    } else {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    res.json({ success: true, message: 'Secretary assignment removed' });
  } catch (error: any) {
    console.error('deleteSecretary error', error);
    res.status(500).json({ success: false, message: 'Error deleting secretary' });
  }
};

/**
 * List secretaries. For doctor role returns secretaries assigned to that doctor.
 * Admin can pass ?doctorId= to filter or list all.
 */
export const listSecretaries = async (req: Request, res: Response) => {
  try {
    const requesterRole = req.user?.role;
    const requesterId = req.user?.id;
    const { doctorId } = req.query;

    let rows = [];

    if (requesterRole === 'doctor') {
      rows = await queryMany(
        `SELECT u.id, u.email, u.first_name, u.last_name, u.phone, s.assigned_at, s.doctor_id
         FROM secretaries s JOIN users u ON u.id = s.id WHERE s.doctor_id = $1 ORDER BY s.assigned_at DESC`,
        [requesterId]
      );
    } else if (requesterRole === 'admin') {
      if (doctorId) {
        rows = await queryMany(
          `SELECT u.id, u.email, u.first_name, u.last_name, u.phone, s.assigned_at, s.doctor_id
           FROM secretaries s JOIN users u ON u.id = s.id WHERE s.doctor_id = $1 ORDER BY s.assigned_at DESC`,
          [doctorId]
        );
      } else {
        rows = await queryMany(
          `SELECT u.id, u.email, u.first_name, u.last_name, u.phone, s.assigned_at, s.doctor_id
           FROM secretaries s JOIN users u ON u.id = s.id ORDER BY s.assigned_at DESC`
        );
      }
    } else if (requesterRole === 'secretary') {
      // Return all own assignments. A secretary can support more than one doctor.
      rows = await queryMany(
        `SELECT u.id, u.email, u.first_name, u.last_name, u.phone, s.assigned_at, s.doctor_id
         FROM secretaries s JOIN users u ON u.id = s.id WHERE u.id = $1`,
        [requesterId]
      );
    } else {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    res.json({ success: true, data: rows });
  } catch (error: any) {
    console.error('listSecretaries error', error);
    res.status(500).json({ success: false, message: 'Error listing secretaries' });
  }
};

export const searchSecretaryByEmail = async (req: Request, res: Response) => {
  try {
    const requesterRole = req.user?.role;
    const requesterId = req.user?.id;
    const email = String(req.query.email || '').trim().toLowerCase();

    if (!email || email.length < 3) {
      return res.json({ success: true, data: [] });
    }

    const rows = await queryMany(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.phone,
              EXISTS (
                SELECT 1 FROM secretaries s
                WHERE s.id = u.id AND s.doctor_id = $2
              ) AS assigned_to_current_doctor
       FROM users u
       WHERE u.role = 'secretary' AND LOWER(u.email) LIKE $1
       ORDER BY u.email
       LIMIT 8`,
      [`%${email}%`, requesterRole === 'doctor' ? requesterId : null]
    );

    res.json({ success: true, data: rows });
  } catch (error: any) {
    console.error('searchSecretaryByEmail error', error);
    res.status(500).json({ success: false, message: 'Error searching secretaries' });
  }
};

export const listAssignedDoctors = async (req: Request, res: Response) => {
  try {
    const requesterRole = req.user?.role;
    const requesterId = req.user?.id;

    if (requesterRole !== 'secretary') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const rows = await queryMany(
      `SELECT d.id,
              u.first_name,
              u.last_name,
              u.email,
              u.phone,
              d.specialties,
              d.consultation_price,
              d.health_center_id,
              hc.name AS health_center_name,
              s.assigned_at
       FROM secretaries s
       JOIN doctors d ON d.id = s.doctor_id
       JOIN users u ON u.id = d.id
       LEFT JOIN health_centers hc ON hc.id = d.health_center_id
       WHERE s.id = $1
       ORDER BY u.first_name, u.last_name`,
      [requesterId]
    );

    res.json({ success: true, data: rows });
  } catch (error: any) {
    console.error('listAssignedDoctors error', error);
    res.status(500).json({ success: false, message: 'Error listing assigned doctors' });
  }
};

export default { createSecretary, listSecretaries, listAssignedDoctors, updateSecretary, deleteSecretary, searchSecretaryByEmail };
