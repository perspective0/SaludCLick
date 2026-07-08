import { Request, Response } from 'express';
import { query, queryOne, queryMany, transaction } from '../db';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { hashPassword } from '../utils/auth';
import { auditClinicalAction } from '../utils/audit';

async function ensureDoctorProfileDocumentColumns() {
  await query(`
    ALTER TABLE doctors
      ADD COLUMN IF NOT EXISTS document_number VARCHAR(50),
      ADD COLUMN IF NOT EXISTS id_front_image TEXT,
      ADD COLUMN IF NOT EXISTS id_back_image TEXT,
      ADD COLUMN IF NOT EXISTS exequatur_image TEXT,
      ADD COLUMN IF NOT EXISTS specialty_proof_image TEXT,
      ADD COLUMN IF NOT EXISTS prescription_logo TEXT,
      ADD COLUMN IF NOT EXISTS prescription_seal TEXT,
      ADD COLUMN IF NOT EXISTS documents_submitted_at TIMESTAMP
  `);
}

async function ensureManualPatientColumns() {
  await query('ALTER TABLE patients ADD COLUMN IF NOT EXISTS document_number VARCHAR(30)').catch(() => null);
  await query('ALTER TABLE patients ADD COLUMN IF NOT EXISTS has_insurance BOOLEAN DEFAULT false').catch(() => null);
  await query('ALTER TABLE patients ADD COLUMN IF NOT EXISTS insurance_provider VARCHAR(255)').catch(() => null);
  await query('ALTER TABLE patients ADD COLUMN IF NOT EXISTS insurance_number VARCHAR(255)').catch(() => null);
  await query('ALTER TABLE patients ADD COLUMN IF NOT EXISTS manual_patient_created_by_doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL').catch(() => null);
  await query('ALTER TABLE patients ADD COLUMN IF NOT EXISTS manual_patient_created_at TIMESTAMP').catch(() => null);
  await query('ALTER TABLE patients ADD COLUMN IF NOT EXISTS account_claimed_at TIMESTAMP').catch(() => null);
}

function timeToMinutes(value?: string) {
  const match = String(value || '').match(/^(\d{2}):(\d{2})/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function getSlotDay(slot: any) {
  return Number(slot.dayOfWeek ?? slot.day_of_week);
}

function getSlotCenter(slot: any) {
  return String(slot.healthCenterId || slot.health_center_id || '');
}

function validateAvailabilityNoCrossCenterConflicts(availability: any[]) {
  const activeSlots = availability
    .filter((slot) => !slot.isBreak && !slot.is_break)
    .map((slot) => ({
      dayOfWeek: getSlotDay(slot),
      healthCenterId: getSlotCenter(slot),
      startTime: String(slot.startTime || slot.start_time || ''),
      endTime: String(slot.endTime || slot.end_time || ''),
      startMinutes: timeToMinutes(slot.startTime || slot.start_time),
      endMinutes: timeToMinutes(slot.endTime || slot.end_time),
    }));

  for (const slot of activeSlots) {
    if (!Number.isInteger(slot.dayOfWeek) || slot.dayOfWeek < 0 || slot.dayOfWeek > 6) {
      return 'Dia de horario invalido.';
    }
    if (slot.startMinutes === null || slot.endMinutes === null || slot.startMinutes >= slot.endMinutes) {
      return 'Cada horario debe tener una hora de inicio menor que la hora de cierre.';
    }
  }

  for (let index = 0; index < activeSlots.length; index += 1) {
    const current = activeSlots[index];
    for (let nextIndex = index + 1; nextIndex < activeSlots.length; nextIndex += 1) {
      const next = activeSlots[nextIndex];
      if (current.dayOfWeek !== next.dayOfWeek) continue;
      if (current.healthCenterId && next.healthCenterId && current.healthCenterId === next.healthCenterId) continue;
      const overlaps = current.startMinutes! < next.endMinutes! && next.startMinutes! < current.endMinutes!;
      if (overlaps) {
        return 'No puedes configurar horarios superpuestos el mismo dia en mas de un centro de salud.';
      }
    }
  }

  return null;
}

function publicDoctorProfile(doctor: any) {
  const {
    document_number,
    prescription_logo,
    prescription_seal,
    has_id_front_image,
    has_id_back_image,
    has_exequatur_image,
    has_specialty_proof_image,
    documents_submitted_at,
    phone,
    email,
    ...publicProfile
  } = doctor;

  return publicProfile;
}

/**
 * Get all doctors with filters
 */
export const getDoctors = async (req: Request, res: Response) => {
  try {
    const { specialty, healthCenter, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let sql = `
      SELECT 
        d.id, d.license_number, 
        u.first_name, u.last_name, u.email, u.avatar,
        d.specialties, d.bio, d.years_experience, d.consultation_price,
        d.consultation_duration, d.teleconsultation_enabled, d.vacation_mode,
        d.average_rating, d.health_center_id, hc.name as health_center_name,
        hc.address, hc.city
      FROM doctors d
      JOIN users u ON d.id = u.id
      LEFT JOIN health_centers hc ON d.health_center_id = hc.id
      WHERE d.is_verified = true
    `;
    const params: any[] = [];

    if (specialty) {
      sql += ` AND $${params.length + 1} = ANY(d.specialties)`;
      params.push(specialty);
    }

    if (healthCenter) {
      sql += ` AND (
        d.health_center_id = $${params.length + 1}
        OR EXISTS (
        SELECT 1 FROM doctor_health_centers dhc
        WHERE dhc.doctor_id = d.id AND dhc.health_center_id = $${params.length + 1}
        )
      )`;
      params.push(healthCenter);
    }

    sql += ` ORDER BY d.average_rating DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const doctors = await queryMany(sql, params);
    const doctorsWithCenters = await attachHealthCenters(doctors);

    // Get total count
    let countSql = 'SELECT COUNT(*) as total FROM doctors d WHERE d.is_verified = true';
    if (specialty) countSql += ` AND $1 = ANY(d.specialties)`;
    if (healthCenter) {
      countSql += ` AND (
        d.health_center_id = $${specialty ? 2 : 1}
        OR EXISTS (
        SELECT 1 FROM doctor_health_centers dhc
        WHERE dhc.doctor_id = d.id AND dhc.health_center_id = $${specialty ? 2 : 1}
        )
      )`;
    }

    const countParams: any[] = [];
    if (specialty) countParams.push(specialty);
    if (healthCenter) countParams.push(healthCenter);

    const countResult = await queryOne(countSql, countParams.length > 0 ? countParams : undefined);
    const total = countResult?.total || 0;

    res.json({
      success: true,
      data: doctorsWithCenters,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: Number(total),
      },
    });
  } catch (error: any) {
    console.error('Get doctors error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching doctors',
    });
  }
};

/**
 * Get doctor by ID
 */
export const getDoctorById = async (req: Request, res: Response) => {
  try {
    await ensureDoctorProfileDocumentColumns();
    const { id } = req.params;

    const doctor = await queryOne(
      `SELECT 
        d.id, d.license_number, d.bio, d.years_experience, d.consultation_price,
        d.consultation_duration, d.teleconsultation_enabled, d.vacation_mode,
        d.average_rating, d.specialties, d.health_center_id,
        d.document_number,
        d.prescription_logo,
        d.prescription_seal,
        (d.id_front_image IS NOT NULL) AS has_id_front_image,
        (d.id_back_image IS NOT NULL) AS has_id_back_image,
        (d.exequatur_image IS NOT NULL) AS has_exequatur_image,
        (d.specialty_proof_image IS NOT NULL) AS has_specialty_proof_image,
        d.documents_submitted_at,
        u.first_name, u.last_name, u.email, u.phone, u.avatar,
        hc.name as health_center_name, hc.address, hc.city
      FROM doctors d
      JOIN users u ON d.id = u.id
      LEFT JOIN health_centers hc ON d.health_center_id = hc.id
      WHERE d.id = $1`,
      [id]
    );

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found',
      });
    }

    // Get reviews
    const reviews = await queryMany(
      `SELECT r.id, r.rating, r.comment, u.first_name, u.last_name, r.created_at
       FROM reviews r
       JOIN users u ON r.patient_id = u.id
       WHERE r.doctor_id = $1
       ORDER BY r.created_at DESC
       LIMIT 10`,
      [id]
    );

    const healthCenters = await queryMany(
      `SELECT hc.id, hc.name, hc.address, hc.city, hc.phone, hc.email, dhc.is_primary
       FROM doctor_health_centers dhc
       JOIN health_centers hc ON hc.id = dhc.health_center_id
       WHERE dhc.doctor_id = $1
       ORDER BY dhc.is_primary DESC, hc.name`,
      [id]
    );

    // Get availability
    const availability = await queryMany(
      'SELECT day_of_week, start_time, end_time, is_break, health_center_id FROM doctor_availability WHERE doctor_id = $1 ORDER BY day_of_week',
      [id]
    );

    const canViewPrivateProfile = req.user?.role === 'admin' || req.user?.id === id;
    const profile = canViewPrivateProfile ? doctor : publicDoctorProfile(doctor);

    res.json({
      success: true,
      data: {
        ...profile,
        health_centers: healthCenters,
        healthCenters,
        reviews,
        availability,
      },
    });
  } catch (error: any) {
    console.error('Get doctor error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching doctor',
    });
  }
};

/**
 * Get patients for a doctor
 */
export const getDoctorPatients = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    if (req.user?.role !== 'admin' && req.user?.id !== id) {
      if (req.user?.role !== 'secretary') {
        return res.status(403).json({ success: false, message: 'Unauthorized doctor patients access' });
      }

      const assigned = await queryOne('SELECT 1 FROM secretaries WHERE id = $1 AND doctor_id = $2', [req.user.id, id]);
      if (!assigned) {
        return res.status(403).json({ success: false, message: 'Unauthorized doctor patients access' });
      }
    }

    const patients = await queryMany(
      `WITH doctor_patients AS (
         SELECT DISTINCT ON (a.patient_id)
                a.patient_id, a.appointment_date, a.appointment_time
         FROM appointments a
         WHERE a.doctor_id = $1
         ORDER BY a.patient_id, a.appointment_date DESC, a.appointment_time DESC
       ),
       record_patients AS (
         SELECT DISTINCT mr.patient_id
         FROM medical_records mr
         WHERE mr.doctor_id = $1
       )
       SELECT u.id, u.first_name, u.last_name, u.email, u.phone,
              p.document_number,
              p.date_of_birth,
              p.date_of_birth AS birth_date,
              p.address,
              p.city,
              dp.appointment_date, dp.appointment_time
       FROM (
         SELECT patient_id FROM doctor_patients
         UNION
         SELECT patient_id FROM record_patients
       ) patient_ids
       JOIN patients p ON patient_ids.patient_id = p.id
       JOIN users u ON p.id = u.id
       LEFT JOIN doctor_patients dp ON dp.patient_id = p.id
       ORDER BY dp.appointment_date DESC NULLS LAST, u.first_name, u.last_name
       LIMIT $2 OFFSET $3`,
      [id, limit, offset]
    );

    res.json({
      success: true,
      data: patients,
      pagination: {
        page: Number(page),
        limit: Number(limit),
      },
    });
  } catch (error: any) {
    console.error('Get doctor patients error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching doctor patients',
    });
  }
};

/**
 * Update doctor profile
 */
export const updateDoctorProfile = async (req: Request, res: Response) => {
  try {
    await ensureDoctorProfileDocumentColumns();
    const { id } = req.params;
    const {
      bio,
      consultationPrice,
      yearsExperience,
      specialties,
      avatar,
      availability,
      healthCenterId,
      healthCenterIds,
      newHealthCenter,
      consultationDuration,
      teleconsultationEnabled,
      vacationMode,
      documentNumber,
      idFrontImage,
      idBackImage,
      exequaturImage,
      specialtyProofImage,
      prescriptionLogo,
      prescriptionSeal,
    } = req.body;

    // Verify ownership
    if (req.user?.id !== id && req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const existingDocuments = await queryOne(
      `SELECT document_number, id_front_image, id_back_image, exequatur_image, specialty_proof_image
       FROM doctors
       WHERE id = $1`,
      [id]
    );

    const nextDocumentNumber = documentNumber ?? existingDocuments?.document_number;
    const nextIdFrontImage = idFrontImage ?? existingDocuments?.id_front_image;
    const nextIdBackImage = idBackImage ?? existingDocuments?.id_back_image;
    const nextExequaturImage = exequaturImage ?? existingDocuments?.exequatur_image;
    const nextSpecialtyProofImage = specialtyProofImage ?? existingDocuments?.specialty_proof_image;

    if (!nextDocumentNumber || !nextIdFrontImage || !nextIdBackImage || !nextExequaturImage || !nextSpecialtyProofImage) {
      return res.status(400).json({
        success: false,
        message: 'Para completar tu perfil debes adjuntar cédula frontal, cédula reverso, exequatur y soporte de especialidad.',
      });
    }

    // Update doctor profile
    if (bio !== undefined || consultationPrice !== undefined || yearsExperience !== undefined || specialties !== undefined || healthCenterId !== undefined || healthCenterIds !== undefined || newHealthCenter !== undefined || consultationDuration !== undefined || teleconsultationEnabled !== undefined || vacationMode !== undefined || documentNumber !== undefined || idFrontImage !== undefined || idBackImage !== undefined || exequaturImage !== undefined || specialtyProofImage !== undefined || prescriptionLogo !== undefined || prescriptionSeal !== undefined) {
      const updates: string[] = [];
      const params: any[] = [];

      if (bio !== undefined) {
        updates.push(`bio = $${params.length + 1}`);
        params.push(bio);
      }
      if (consultationPrice !== undefined) {
        updates.push(`consultation_price = $${params.length + 1}`);
        params.push(consultationPrice);
      }
      if (yearsExperience !== undefined) {
        updates.push(`years_experience = $${params.length + 1}`);
        params.push(yearsExperience);
      }
      if (specialties !== undefined && Array.isArray(specialties)) {
        updates.push(`specialties = $${params.length + 1}`);
        params.push(specialties);
      }
      if (consultationDuration !== undefined) {
        updates.push(`consultation_duration = $${params.length + 1}`);
        params.push(Number(consultationDuration) || 30);
      }
      if (teleconsultationEnabled !== undefined) {
        updates.push(`teleconsultation_enabled = $${params.length + 1}`);
        params.push(Boolean(teleconsultationEnabled));
      }
      if (vacationMode !== undefined) {
        updates.push(`vacation_mode = $${params.length + 1}`);
        params.push(Boolean(vacationMode));
      }
      if (documentNumber !== undefined) {
        updates.push(`document_number = $${params.length + 1}`);
        params.push(documentNumber || null);
      }
      if (idFrontImage !== undefined) {
        updates.push(`id_front_image = $${params.length + 1}`);
        params.push(idFrontImage || null);
      }
      if (idBackImage !== undefined) {
        updates.push(`id_back_image = $${params.length + 1}`);
        params.push(idBackImage || null);
      }
      if (exequaturImage !== undefined) {
        updates.push(`exequatur_image = $${params.length + 1}`);
        params.push(exequaturImage || null);
      }
      if (specialtyProofImage !== undefined) {
        updates.push(`specialty_proof_image = $${params.length + 1}`);
        params.push(specialtyProofImage || null);
      }
      if (prescriptionLogo !== undefined) {
        updates.push(`prescription_logo = $${params.length + 1}`);
        params.push(prescriptionLogo || null);
      }
      if (prescriptionSeal !== undefined) {
        updates.push(`prescription_seal = $${params.length + 1}`);
        params.push(prescriptionSeal || null);
      }
      if (documentNumber !== undefined || idFrontImage !== undefined || idBackImage !== undefined || exequaturImage !== undefined || specialtyProofImage !== undefined) {
        updates.push('documents_submitted_at = CURRENT_TIMESTAMP');
      }
      let primaryHealthCenterId = healthCenterId;
      if (!primaryHealthCenterId && Array.isArray(healthCenterIds) && healthCenterIds[0]) {
        primaryHealthCenterId = healthCenterIds[0];
      }

      if (primaryHealthCenterId) {
        const center = await queryOne('SELECT id FROM health_centers WHERE id = $1', [primaryHealthCenterId]);
        if (!center) {
          return res.status(400).json({ success: false, message: 'Health center not found' });
        }
        updates.push(`health_center_id = $${params.length + 1}`);
        params.push(primaryHealthCenterId);
      } else if (newHealthCenter?.name) {
        const center = await queryOne(
          `INSERT INTO health_centers (name, address, city, phone, email, description)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id`,
          [
            String(newHealthCenter.name).trim(),
            newHealthCenter.address || 'Dirección pendiente',
            newHealthCenter.city || 'Ciudad pendiente',
            newHealthCenter.phone || null,
            newHealthCenter.email || null,
            newHealthCenter.description || 'Centro agregado desde perfil profesional',
          ]
        );
        updates.push(`health_center_id = $${params.length + 1}`);
        params.push(center.id);
        primaryHealthCenterId = center.id;
      }

      if (updates.length > 0) {
        params.push(id);
        await query(
          `UPDATE doctors SET ${updates.join(', ')} WHERE id = $${params.length}`,
          params
        );
      }

      if (primaryHealthCenterId || Array.isArray(healthCenterIds)) {
        const requestedCenterIds = Array.isArray(healthCenterIds) && healthCenterIds.length
          ? Array.from(new Set([primaryHealthCenterId, ...healthCenterIds].filter(Boolean)))
          : primaryHealthCenterId
            ? [primaryHealthCenterId]
            : [];

        if (requestedCenterIds.length) {
          const centers = await queryMany('SELECT id FROM health_centers WHERE id = ANY($1::uuid[])', [requestedCenterIds]);
          if (centers.length !== requestedCenterIds.length) {
            return res.status(400).json({ success: false, message: 'One or more health centers were not found' });
          }

          await query('DELETE FROM doctor_health_centers WHERE doctor_id = $1', [id]);
          for (const centerId of requestedCenterIds) {
            await query(
              `INSERT INTO doctor_health_centers (doctor_id, health_center_id, is_primary)
               VALUES ($1, $2, $3)
               ON CONFLICT (doctor_id, health_center_id) DO UPDATE SET is_primary = EXCLUDED.is_primary`,
              [id, centerId, centerId === primaryHealthCenterId]
            );
          }
        }
      }
    }

    if (avatar !== undefined) {
      await query('UPDATE users SET avatar = $1 WHERE id = $2', [avatar || null, id]);
    }

    // Update availability
    if (availability && Array.isArray(availability)) {
      const availabilityError = validateAvailabilityNoCrossCenterConflicts(availability);
      if (availabilityError) {
        return res.status(400).json({ success: false, message: availabilityError });
      }

      await query('DELETE FROM doctor_availability WHERE doctor_id = $1', [id]);

      for (const slot of availability) {
        await query(
          `INSERT INTO doctor_availability (doctor_id, health_center_id, day_of_week, start_time, end_time, is_break)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [id, slot.healthCenterId || slot.health_center_id || null, slot.dayOfWeek, slot.startTime, slot.endTime, slot.isBreak || false]
        );
      }
    }

    res.json({
      success: true,
      message: 'Doctor profile updated successfully',
    });
  } catch (error: any) {
    console.error('Update doctor error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating doctor profile',
    });
  }
};

export const createManualPatient = async (req: Request, res: Response) => {
  try {
    await ensureManualPatientColumns();
    const { id: doctorId } = req.params;
    const requesterId = req.user?.id;
    const requesterRole = req.user?.role;

    if (!requesterId || !['doctor', 'secretary', 'admin'].includes(String(requesterRole))) {
      return res.status(403).json({ success: false, message: 'No tienes permiso para registrar pacientes.' });
    }

    if (requesterRole === 'doctor' && requesterId !== doctorId) {
      return res.status(403).json({ success: false, message: 'Solo puedes registrar pacientes para tu perfil médico.' });
    }

    if (requesterRole === 'secretary') {
      const assigned = await queryOne('SELECT 1 FROM secretaries WHERE id = $1 AND doctor_id = $2', [requesterId, doctorId]);
      if (!assigned) {
        return res.status(403).json({ success: false, message: 'No tienes permiso para registrar pacientes de este médico.' });
      }
    }

    const {
      firstName,
      lastName,
      phone,
      email,
      documentNumber,
      dateOfBirth,
      gender,
      bloodType,
      address,
      city,
      medicalHistory,
      reasonForVisit,
      notes,
      hasInsurance = false,
      insuranceProvider,
      insuranceNumber,
    } = req.body || {};

    const cleanFirstName = String(firstName || '').trim();
    const cleanLastName = String(lastName || '').trim();
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanDocument = String(documentNumber || '').trim();

    if (!cleanFirstName || !cleanLastName) {
      return res.status(400).json({ success: false, message: 'Nombre y apellido son obligatorios.' });
    }
    if (dateOfBirth && Number.isNaN(Date.parse(dateOfBirth))) {
      return res.status(400).json({ success: false, message: 'Fecha de nacimiento invalida.' });
    }

    if (cleanEmail) {
      const existingEmail = await queryOne('SELECT id FROM users WHERE LOWER(email) = $1', [cleanEmail]);
      if (existingEmail) {
        return res.status(409).json({ success: false, message: 'Ya existe un usuario con este correo.' });
      }
    }

    if (cleanDocument) {
      const existingDocument = await queryOne('SELECT id FROM patients WHERE document_number = $1', [cleanDocument]);
      if (existingDocument) {
        return res.status(409).json({ success: false, message: 'Ya existe un paciente con este documento.' });
      }
    }

    const patientId = uuidv4();
    const patientEmail = cleanEmail || `manual+${patientId}@saludclick.local`;
    const temporaryPassword = crypto.randomBytes(18).toString('base64url');
    const hashedPassword = await hashPassword(temporaryPassword);

    const result = await transaction(async (client) => {
      await client.query(
        `INSERT INTO users (id, email, password, first_name, last_name, role, phone, is_active)
         VALUES ($1,$2,$3,$4,$5,'patient',$6,true)`,
        [patientId, patientEmail, hashedPassword, cleanFirstName, cleanLastName, phone || null]
      );

      await client.query(
        `INSERT INTO patients
         (id, date_of_birth, gender, blood_type, address, city, medical_history, document_number, has_insurance, insurance_provider, insurance_number,
          manual_patient_created_by_doctor_id, manual_patient_created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW())`,
        [
          patientId,
          dateOfBirth || null,
          gender || null,
          bloodType || null,
          address || null,
          city || null,
          medicalHistory || null,
          cleanDocument || null,
          Boolean(hasInsurance),
          insuranceProvider || null,
          insuranceNumber || null,
          doctorId,
        ]
      );

      const antecedentId = uuidv4();
      await client.query(
        `INSERT INTO patient_antecedents (id, patient_id, doctor_id, personal_history, habits)
         VALUES ($1,$2,$3,$4,$5)`,
        [
          antecedentId,
          patientId,
          doctorId,
          medicalHistory || reasonForVisit || notes || 'Paciente registrado manualmente en consultorio.',
          notes || null,
        ]
      );

      await client.query(
        `INSERT INTO medical_records (id, patient_id, doctor_id, diagnosis, treatment, symptoms, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [
          uuidv4(),
          patientId,
          doctorId,
          'Registro manual de paciente',
          'Pendiente de evaluación clínica',
          reasonForVisit || null,
          notes || medicalHistory || 'Paciente creado manualmente para atención en consultorio.',
        ]
      );

      await auditClinicalAction(req, {
        action: 'manual_patient_create',
        entity: 'patients',
        entityId: patientId,
        patientId,
        doctorId,
        newData: {
          firstName: cleanFirstName,
          lastName: cleanLastName,
          email: cleanEmail || null,
          documentNumber: cleanDocument || null,
          createdByRole: requesterRole,
          createdBy: requesterId,
        },
      }, client);

      return {
        id: patientId,
        first_name: cleanFirstName,
        last_name: cleanLastName,
        email: patientEmail,
        phone: phone || null,
        document_number: cleanDocument || null,
        birth_date: dateOfBirth || null,
        date_of_birth: dateOfBirth || null,
      };
    });

    return res.status(201).json({
      success: true,
      message: 'Paciente registrado correctamente.',
      data: result,
    });
  } catch (error: any) {
    console.error('Create manual patient error:', error);
    return res.status(500).json({ success: false, message: 'Error registrando paciente manual.' });
  }
};

async function attachHealthCenters(doctors: any[]) {
  if (!doctors.length) return doctors;
  const ids = doctors.map((doctor) => doctor.id);
  const centers = await queryMany(
    `SELECT dhc.doctor_id, hc.id, hc.name, hc.address, hc.city, hc.phone, hc.email, dhc.is_primary
     FROM doctor_health_centers dhc
     JOIN health_centers hc ON hc.id = dhc.health_center_id
     WHERE dhc.doctor_id = ANY($1::uuid[])
     ORDER BY dhc.is_primary DESC, hc.name`,
    [ids]
  );

  const centersByDoctor = new Map<string, any[]>();
  for (const center of centers) {
    const list = centersByDoctor.get(center.doctor_id) || [];
    list.push(center);
    centersByDoctor.set(center.doctor_id, list);
  }

  return doctors.map((doctor) => {
    const linkedCenters = centersByDoctor.get(doctor.id) || [];
    const primaryFallback = doctor.health_center_id
      ? [{
          id: doctor.health_center_id,
          name: doctor.health_center_name,
          address: doctor.address,
          city: doctor.city,
          phone: null,
          email: null,
          is_primary: true,
        }]
      : [];
    const healthCenters = linkedCenters.length ? linkedCenters : primaryFallback;

    return {
      ...doctor,
      health_center_id: doctor.health_center_id || healthCenters[0]?.id || null,
      health_center_name: doctor.health_center_name || healthCenters[0]?.name || null,
      city: doctor.city || healthCenters[0]?.city || null,
      address: doctor.address || healthCenters[0]?.address || null,
      health_centers: healthCenters,
      healthCenters,
    };
  });
}

export const uploadDoctorAvatar = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (req.user?.id !== id && req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Image file is required' });
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const avatarUrl = `${baseUrl}/uploads/avatars/${req.file.filename}`;
    await query('UPDATE users SET avatar = $1 WHERE id = $2', [avatarUrl, id]);

    res.json({ success: true, data: { avatar: avatarUrl } });
  } catch (error: any) {
    console.error('Upload doctor avatar error:', error);
    res.status(500).json({ success: false, message: 'Error uploading avatar' });
  }
};

export const uploadPrescriptionLogo = async (req: Request, res: Response) => {
  try {
    await ensureDoctorProfileDocumentColumns();
    const { id } = req.params;
    if (req.user?.id !== id && req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Image file is required' });
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const logoUrl = `${baseUrl}/uploads/prescription-logos/${req.file.filename}`;
    await query('UPDATE doctors SET prescription_logo = $1 WHERE id = $2', [logoUrl, id]);

    res.json({ success: true, data: { prescriptionLogo: logoUrl, prescription_logo: logoUrl } });
  } catch (error: any) {
    console.error('Upload prescription logo error:', error);
    res.status(500).json({ success: false, message: 'Error uploading prescription logo' });
  }
};

export const uploadPrescriptionSeal = async (req: Request, res: Response) => {
  try {
    await ensureDoctorProfileDocumentColumns();
    const { id } = req.params;
    if (req.user?.id !== id && req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Image file is required' });
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const sealUrl = `${baseUrl}/api/files/prescription-seals/${req.file.filename}`;
    await query('UPDATE doctors SET prescription_seal = $1 WHERE id = $2', [sealUrl, id]);

    res.json({ success: true, data: { prescriptionSeal: sealUrl, prescription_seal: sealUrl } });
  } catch (error: any) {
    console.error('Upload prescription seal error:', error);
    res.status(500).json({ success: false, message: 'Error uploading prescription seal' });
  }
};

/**
 * Get health centers
 */
export const getHealthCenters = async (req: Request, res: Response) => {
  try {
    const healthCenters = await queryMany(
      'SELECT id, name, address, city, phone, email, image, description FROM health_centers ORDER BY name'
    );

    res.json({
      success: true,
      data: healthCenters,
    });
  } catch (error: any) {
    console.error('Get health centers error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching health centers',
    });
  }
};

export const getLaboratories = async (req: Request, res: Response) => {
  try {
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
    const laboratories = await queryMany(
      `SELECT id, name, address, city, state, phone, email, website, image, description, services, is_active
       FROM laboratories
       WHERE is_active = true
       ORDER BY name`
    );

    res.json({ success: true, data: laboratories });
  } catch (error: any) {
    console.error('Get laboratories error:', error);
    res.status(500).json({ success: false, message: 'Error fetching laboratories' });
  }
};
