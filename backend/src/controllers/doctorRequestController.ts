import { Request, Response } from 'express';
import { query, queryOne } from '../db';
import { sendAdminNotification } from '../utils/mailer';
import { ensureDoctorVerificationColumns, verifyDoctorExequatur } from '../utils/doctorVerification';

export const createDoctorRequest = async (req: Request, res: Response) => {
  try {
    const {
      name,
      firstName,
      lastName,
      email,
      phone,
      clinic,
      license,
      exequatur,
      especialidad,
      specialty,
      message,
      healthCenterId,
      healthCenterMode,
    } = req.body;
    const fullName = String(name || `${firstName || ''} ${lastName || ''}`).trim();
    const exequaturNumber = String(exequatur || license || '').trim();
    const doctorSpecialty = specialty || especialidad || null;
    const requestedHealthCenterMode = healthCenterMode === 'other' ? 'other' : 'existing';
    const requestedHealthCenterId = requestedHealthCenterMode === 'existing' && healthCenterId ? healthCenterId : null;
    let clinicName = clinic || null;

    if (!fullName || !email || !exequaturNumber) {
      return res.status(400).json({ success: false, message: 'Nombre completo, email y exequatur son obligatorios' });
    }

    await ensureDoctorVerificationColumns();
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
      exequatur: exequaturNumber,
      specialty: doctorSpecialty,
    });

    const insertText = `
      INSERT INTO doctor_requests (
        name, first_name, last_name, email, phone, clinic, requested_health_center_id, requested_health_center_mode,
        license_number, exequatur, specialty,
        message, status, verification_status, verification_score, verification_source,
        verification_message, verification_checked_at, verification_payload
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$9,$10,$11,'pending',$12,$13,$14,$15,$16,$17)
      RETURNING *
    `;
    const values = [
      fullName,
      firstName || null,
      lastName || null,
      email,
      phone || null,
      clinicName,
      requestedHealthCenterId,
      requestedHealthCenterMode,
      exequaturNumber,
      doctorSpecialty,
      message || (requestedHealthCenterMode === 'other' ? 'Centro pendiente de seleccionar o crear al completar perfil.' : null),
      verification.status,
      verification.score,
      verification.source,
      verification.message,
      verification.checkedAt,
      JSON.stringify(verification),
    ];

    const result = await query(insertText, values);
    await sendAdminNotification(result.rows[0]);
    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err: any) {
    console.error('createDoctorRequest error', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

export default { createDoctorRequest };

