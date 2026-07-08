import { Request, Response } from 'express';
import { query, queryMany, queryOne, transaction } from '../db';
import { auditClinicalAction } from '../utils/audit';
import { notifyUser } from './notificationController';
import { fail, ok } from '../utils/apiResponse';
import { isUuid } from '../validators/commonValidators';
import { validatePatientProfileUpdate } from '../validators/clinicalValidators';

function patientId(req: Request) {
  return req.user?.id || '';
}

function normalizeDate(value: any) {
  if (!value) return null;
  return new Date(value).toISOString().slice(0, 10);
}

function buildProfileCompleteness(profile: any) {
  const fields = ['phone', 'date_of_birth', 'address', 'document_number', 'emergency_contact', 'emergency_phone'];
  const insuranceFields = profile?.has_insurance ? ['insurance_provider', 'insurance_number'] : [];
  const requiredFields = [...fields, ...insuranceFields];
  const completed = requiredFields.filter((field) => Boolean(profile?.[field])).length;
  return {
    percentage: Math.round((completed / requiredFields.length) * 100),
    missing: requiredFields.filter((field) => !profile?.[field]),
  };
}

function mapMedicationNames(prescription: any) {
  const medications = typeof prescription.medications === 'string'
    ? JSON.parse(prescription.medications || '[]')
    : prescription.medications;
  return Array.isArray(medications)
    ? medications.map((item: any) => item.name || item.medication).filter(Boolean)
    : [];
}

async function ensurePatientProfileColumns() {
  await query('ALTER TABLE patients ADD COLUMN IF NOT EXISTS document_number VARCHAR(30)');
  await query('ALTER TABLE patients ADD COLUMN IF NOT EXISTS has_insurance BOOLEAN DEFAULT false');
  await query('ALTER TABLE patients ADD COLUMN IF NOT EXISTS insurance_provider VARCHAR(255)');
  await query('ALTER TABLE patients ADD COLUMN IF NOT EXISTS insurance_number VARCHAR(255)');
}

async function ensurePatientRow(id: string) {
  await query(
    `INSERT INTO patients (id)
     SELECT id FROM users WHERE id = $1 AND role = 'patient'
     ON CONFLICT (id) DO NOTHING`,
    [id]
  );
}

export const getPatientDashboard = async (req: Request, res: Response) => {
  try {
    await ensurePatientProfileColumns();
    const id = patientId(req);
    await ensurePatientRow(id);

    const profile = await queryOne(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.phone, p.date_of_birth, p.address,
              p.document_number, p.emergency_contact, p.emergency_phone,
              p.has_insurance, p.insurance_provider, p.insurance_number
       FROM users u
       JOIN patients p ON p.id = u.id
       WHERE u.id = $1`,
      [id]
    );

    if (!profile) return fail(res, 404, 'Patient profile not found');

    const [nextAppointment, appointments, prescriptions, cancelledAppointments] = await Promise.all([
      queryOne(
        `SELECT a.id, a.appointment_date, a.appointment_time, a.status, a.reason_for_visit,
                a.appointment_type, a.video_room_url, a.video_room_id,
                u.first_name AS doctor_first_name, u.last_name AS doctor_last_name,
                d.specialties, hc.name AS health_center_name
         FROM appointments a
         JOIN doctors d ON d.id = a.doctor_id
         JOIN users u ON u.id = d.id
         LEFT JOIN health_centers hc ON hc.id = a.health_center_id
         WHERE a.patient_id = $1
           AND a.status IN ('scheduled', 'confirmed')
           AND (a.appointment_date > CURRENT_DATE OR (a.appointment_date = CURRENT_DATE AND a.appointment_time >= CURRENT_TIME))
         ORDER BY a.appointment_date ASC, a.appointment_time ASC
         LIMIT 1`,
        [id]
      ).catch(() => queryOne(
        `SELECT a.id, a.appointment_date, a.appointment_time, a.status, a.reason_for_visit,
                a.appointment_type, a.video_room_url, a.video_room_id,
                u.first_name AS doctor_first_name, u.last_name AS doctor_last_name,
                d.specialties, hc.name AS health_center_name
         FROM appointments a
         JOIN doctors d ON d.id = a.doctor_id
         JOIN users u ON u.id = d.id
         LEFT JOIN health_centers hc ON hc.id = a.health_center_id
         WHERE a.patient_id = $1
           AND a.status = 'scheduled'
           AND (a.appointment_date > CURRENT_DATE OR (a.appointment_date = CURRENT_DATE AND a.appointment_time >= CURRENT_TIME))
         ORDER BY a.appointment_date ASC, a.appointment_time ASC
         LIMIT 1`,
        [id]
      )).catch(() => null),
      queryMany(
        `SELECT a.id, a.appointment_date, a.appointment_time, a.status, a.reason_for_visit,
                a.appointment_type, a.video_room_url, a.video_room_id,
                u.first_name AS doctor_first_name, u.last_name AS doctor_last_name,
                d.specialties, hc.name AS health_center_name
         FROM appointments a
         JOIN doctors d ON d.id = a.doctor_id
         JOIN users u ON u.id = d.id
         LEFT JOIN health_centers hc ON hc.id = a.health_center_id
         WHERE a.patient_id = $1
         ORDER BY a.appointment_date DESC, a.appointment_time DESC
         LIMIT 5`,
        [id]
      ).catch(() => []),
      queryMany(
        `SELECT p.id, p.medications, p.status, p.issued_at, p.expiry_date, p.validation_code, p.diagnosis,
                u.first_name AS doctor_first_name, u.last_name AS doctor_last_name
         FROM prescriptions p
         JOIN users u ON u.id = p.doctor_id
         WHERE p.patient_id = $1
         ORDER BY COALESCE(p.issued_at, p.created_at) DESC
         LIMIT 5`,
        [id]
      ).catch(() => []),
      queryMany(
        `SELECT id, appointment_date, appointment_time
         FROM appointments
         WHERE patient_id = $1 AND status = 'cancelled'
         ORDER BY updated_at DESC
         LIMIT 3`,
        [id]
      ).catch(() => []),
    ]);

    const completeness = buildProfileCompleteness(profile);
    const notifications = [
      nextAppointment && {
        type: 'appointment',
        title: 'Proxima cita programada',
        message: `${normalizeDate(nextAppointment.appointment_date)} a las ${String(nextAppointment.appointment_time).slice(0, 5)}`,
      },
      prescriptions[0] && {
        type: 'prescription',
        title: 'Receta reciente disponible',
        message: mapMedicationNames(prescriptions[0]).slice(0, 2).join(', ') || 'Receta medica',
      },
      completeness.percentage < 100 && {
        type: 'profile',
        title: 'Perfil incompleto',
        message: `Completa tu perfil para mejorar tu atencion (${completeness.percentage}%).`,
      },
      ...cancelledAppointments.map((appointment) => ({
        type: 'cancelled',
        title: 'Cita cancelada',
        message: `${normalizeDate(appointment.appointment_date)} a las ${String(appointment.appointment_time).slice(0, 5)}`,
      })),
    ].filter(Boolean);

    return ok(res, {
        profile,
        profileCompleteness: completeness,
        nextAppointment,
        appointments,
        prescriptions: prescriptions.map((prescription) => ({
          ...prescription,
          medicationNames: mapMedicationNames(prescription),
        })),
        notifications,
        payments: { available: false, status: 'not_configured' },
      });
  } catch (error) {
    console.error('Patient dashboard error:', error);
    return fail(res, 500, 'Error loading patient dashboard', error);
  }
};

export const getPatientAppointments = async (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    const params: any[] = [patientId(req)];
    let statusFilter = '';

    if (status && status !== 'all') {
      statusFilter = ` AND a.status = $${params.length + 1}`;
      params.push(status);
    }

    const appointments = await queryMany(
      `SELECT a.id, a.appointment_date, a.appointment_time, a.duration, a.status, a.reason_for_visit, a.notes,
              a.appointment_type, a.video_room_url, a.video_room_id,
              u.first_name AS doctor_first_name, u.last_name AS doctor_last_name,
              d.specialties, hc.name AS health_center_name, hc.address AS health_center_address
       FROM appointments a
       JOIN doctors d ON d.id = a.doctor_id
       JOIN users u ON u.id = d.id
       LEFT JOIN health_centers hc ON hc.id = a.health_center_id
       WHERE a.patient_id = $1 ${statusFilter}
       ORDER BY a.appointment_date DESC, a.appointment_time DESC`,
      params
    );

    return ok(res, appointments);
  } catch (error) {
    console.error('Patient appointments error:', error);
    return fail(res, 500, 'Error loading patient appointments', error);
  }
};

export const confirmPatientAppointment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!isUuid(id)) return fail(res, 400, 'Invalid appointment id');

    const appointment = await queryOne(
      'SELECT * FROM appointments WHERE id = $1 AND patient_id = $2',
      [id, patientId(req)]
    );
    if (!appointment) return fail(res, 404, 'Appointment not found');
    if (appointment.status === 'cancelled') return fail(res, 409, 'Cannot confirm a cancelled appointment');
    if (appointment.status === 'completed') return fail(res, 409, 'Cannot confirm a completed appointment');

    const updated = await transaction(async (client) => {
      const result = await client.query(
        `UPDATE appointments
         SET status = 'confirmed', updated_at = NOW()
         WHERE id = $1 AND patient_id = $2
         RETURNING *`,
        [id, patientId(req)]
      );
      await auditClinicalAction(
        req,
        {
          action: 'patient_confirm',
          entity: 'appointments',
          entityId: id,
          patientId: patientId(req),
          doctorId: appointment.doctor_id,
          oldData: appointment,
          newData: result.rows[0],
        },
        client
      );
      return result.rows[0];
    });

    await notifyUser(appointment.doctor_id, {
      title: 'Paciente confirmó asistencia',
      body: 'Un paciente confirmó su cita desde el portal.',
      url: '/appointments',
      type: 'appointment',
      entityType: 'appointment',
      entityId: id,
      priority: 'normal',
    }).catch(() => null);

    return ok(res, updated, 'Appointment confirmed');
  } catch (error: any) {
    console.error('Confirm appointment error:', error);
    if (error?.code === '22P02' || error?.message?.includes('appointment_status')) {
      return fail(res, 409, 'Appointment confirmation status is not enabled in the database');
    }
    return fail(res, 500, 'Error confirming appointment', error);
  }
};

export const getPatientPrescriptions = async (req: Request, res: Response) => {
  try {
    const prescriptions = await queryMany(
      `SELECT p.*, u.first_name AS doctor_first_name, u.last_name AS doctor_last_name,
              d.specialties, d.license_number, hc.name AS health_center_name
       FROM prescriptions p
       JOIN users u ON u.id = p.doctor_id
       JOIN doctors d ON d.id = p.doctor_id
       LEFT JOIN health_centers hc ON hc.id = d.health_center_id
       WHERE p.patient_id = $1
       ORDER BY COALESCE(p.issued_at, p.created_at) DESC`,
      [patientId(req)]
    );

    res.json({
      success: true,
      data: prescriptions.map((prescription) => ({
        ...prescription,
        medicationNames: mapMedicationNames(prescription),
      })),
    });
  } catch (error) {
    console.error('Patient prescriptions error:', error);
    res.status(500).json({ success: false, message: 'Error loading patient prescriptions' });
  }
};

export const getPatientPrescriptionById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!isUuid(id)) return fail(res, 400, 'Invalid prescription id');

    const prescription = await queryOne(
      `SELECT p.*, u.first_name AS doctor_first_name, u.last_name AS doctor_last_name,
              pu.first_name AS patient_first_name, pu.last_name AS patient_last_name,
              d.specialties, d.license_number AS doctor_license_number,
              hc.name AS health_center_name, hc.address AS health_center_address, hc.phone AS health_center_phone
       FROM prescriptions p
       JOIN users u ON u.id = p.doctor_id
       JOIN users pu ON pu.id = p.patient_id
       JOIN doctors d ON d.id = p.doctor_id
       LEFT JOIN health_centers hc ON hc.id = d.health_center_id
       WHERE p.id = $1 AND p.patient_id = $2`,
      [id, patientId(req)]
    );

    if (!prescription) return fail(res, 404, 'Prescription not found');
    await auditClinicalAction(req, {
      action: 'patient_view',
      entity: 'prescriptions',
      entityId: id,
      patientId: patientId(req),
      doctorId: prescription.doctor_id,
    }).catch(() => null);

    return ok(res, prescription);
  } catch (error) {
    console.error('Patient prescription detail error:', error);
    return fail(res, 500, 'Error loading prescription', error);
  }
};

export const getPatientDocuments = async (req: Request, res: Response) => {
  try {
    const documents = await queryMany(
      `SELECT lo.id, lo.order_type, lo.diagnosis, lo.icd10_code, lo.studies, lo.notes, lo.status,
              lo.validation_code, lo.issued_at, lo.created_at,
              u.first_name AS doctor_first_name, u.last_name AS doctor_last_name,
              d.specialties, d.license_number, d.cmd_number,
              hc.name AS health_center_name
       FROM lab_orders lo
       JOIN users u ON u.id = lo.doctor_id
       JOIN doctors d ON d.id = lo.doctor_id
       LEFT JOIN health_centers hc ON hc.id = lo.health_center_id
       WHERE lo.patient_id = $1
         AND lo.order_type IN ('certificate', 'medical_constancy', 'referral', 'disability')
       ORDER BY COALESCE(lo.issued_at, lo.created_at) DESC`,
      [patientId(req)]
    );

    return ok(res, documents.map((document) => {
      const studies = typeof document.studies === 'string'
        ? JSON.parse(document.studies || '[]')
        : document.studies;
      const first = Array.isArray(studies) ? studies[0] || {} : {};
      return {
        ...document,
        documentTitle: first.name || getPatientDocumentTitle(document.order_type),
        documentCategory: first.category || '',
        documentText: first.instructions || document.notes || '',
      };
    }));
  } catch (error) {
    console.error('Patient documents error:', error);
    return fail(res, 500, 'Error loading patient documents', error);
  }
};

function getPatientDocumentTitle(orderType: string) {
  if (orderType === 'referral') return 'Referimiento medico';
  if (orderType === 'disability') return 'Incapacidad medica';
  if (orderType === 'medical_constancy') return 'Constancia medica';
  if (orderType === 'certificate') return 'Certificado medico';
  return 'Documento medico';
}

export const getPatientProfile = async (req: Request, res: Response) => {
  try {
    await ensurePatientProfileColumns();
    await ensurePatientRow(patientId(req));
    const profile = await queryOne(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.avatar,
              p.date_of_birth, p.gender, p.blood_type, p.address, p.city,
              p.document_number, p.emergency_contact, p.emergency_phone,
              p.has_insurance, p.insurance_provider, p.insurance_number
       FROM users u
       JOIN patients p ON p.id = u.id
       WHERE u.id = $1`,
      [patientId(req)]
    );

    if (!profile) return fail(res, 404, 'Patient profile not found');

    const allergies = await queryMany(
      `SELECT id, name, type, severity, reaction, notes, is_active, created_at
       FROM patient_allergies
       WHERE patient_id = $1 AND is_active = true
       ORDER BY created_at DESC`,
      [patientId(req)]
    ).catch(() => []);

    return ok(res, {
        ...profile,
        profileCompleteness: buildProfileCompleteness(profile),
        allergies,
      });
  } catch (error) {
    console.error('Patient profile error:', error);
    return fail(res, 500, 'Error loading patient profile', error);
  }
};

export const updatePatientProfile = async (req: Request, res: Response) => {
  try {
    await ensurePatientProfileColumns();
    const id = patientId(req);
    const { phone, address, dateOfBirth, documentNumber, emergencyContact, emergencyPhone, hasInsurance, insuranceProvider, insuranceNumber } = req.body;

    const validationError = validatePatientProfileUpdate({ phone, emergencyPhone, dateOfBirth });
    if (validationError) return fail(res, 400, validationError);

    const previous = await queryOne(
      `SELECT u.phone, p.address, p.date_of_birth, p.document_number, p.emergency_contact, p.emergency_phone,
              p.has_insurance, p.insurance_provider, p.insurance_number
       FROM users u JOIN patients p ON p.id = u.id WHERE u.id = $1`,
      [id]
    );
    if (!previous) return fail(res, 404, 'Patient profile not found');

    const updated = await transaction(async (client) => {
      await client.query('UPDATE users SET phone = $1, updated_at = NOW() WHERE id = $2', [phone || null, id]);
      const result = await client.query(
        `UPDATE patients
         SET address = $1,
             date_of_birth = $2,
             document_number = $3,
             emergency_contact = $4,
             emergency_phone = $5,
             has_insurance = $6,
             insurance_provider = $7,
             insurance_number = $8
         WHERE id = $9
         RETURNING *`,
        [
          address || null,
          dateOfBirth || null,
          documentNumber || null,
          emergencyContact || null,
          emergencyPhone || null,
          Boolean(hasInsurance),
          hasInsurance ? insuranceProvider || null : null,
          hasInsurance ? insuranceNumber || null : null,
          id,
        ]
      );
      await auditClinicalAction(
        req,
        {
          action: 'patient_update',
          entity: 'patients',
          entityId: id,
          patientId: id,
          oldData: previous,
          newData: { phone, ...result.rows[0] },
        },
        client
      );
      return result.rows[0];
    });

    return ok(res, updated, 'Profile updated');
  } catch (error) {
    console.error('Update patient profile error:', error);
    return fail(res, 500, 'Error updating patient profile', error);
  }
};
