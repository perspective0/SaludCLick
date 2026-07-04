import { Request, Response } from 'express';
import { query, queryOne, queryMany } from '../db';
import { v4 as uuidv4 } from 'uuid';
import { auditClinicalAction } from '../utils/audit';

function parseVitalNumber(value: any) {
  if (value === undefined || value === null || value === '') return null;
  const match = String(value).replace(',', '.').match(/-?\d+(\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function parseWeightKg(value: any) {
  const parsed = parseVitalNumber(value);
  if (!parsed) return null;
  return /\b(lb|lbs|libra|libras)\b/i.test(String(value)) ? Number((parsed * 0.45359237).toFixed(2)) : parsed;
}

function parseHeightCm(value: any) {
  const parsed = parseVitalNumber(value);
  if (!parsed) return null;
  return parsed <= 3 ? Number((parsed * 100).toFixed(1)) : parsed;
}

function normalizeVitalSigns(payload: any = {}) {
  const normalized = { ...payload };
  normalized.heartRate = parseVitalNumber(payload.heartRate || payload.heart_rate);
  normalized.respiratoryRate = parseVitalNumber(payload.respiratoryRate || payload.respiratory_rate);
  normalized.temperature = parseVitalNumber(payload.temperature);
  normalized.oxygenSaturation = parseVitalNumber(payload.oxygenSaturation || payload.oxygen_saturation);
  normalized.weight = parseWeightKg(payload.weight);
  normalized.height = parseHeightCm(payload.height);
  return normalized;
}

function calculateBmi(weight?: number | string, height?: number | string) {
  const weightNumber = parseWeightKg(weight);
  const heightNumber = parseHeightCm(height);
  if (!weightNumber || !heightNumber) return null;
  const heightMeters = heightNumber / 100;
  if (!heightMeters) return null;
  return Number((weightNumber / (heightMeters * heightMeters)).toFixed(1));
}

function validateVitalSigns(payload: any = {}) {
  const hasValue = (value: any) => value !== undefined && value !== null && value !== '';
  if (hasValue(payload.bloodPressure) && !/^\d{2,3}\/\d{2,3}$/.test(String(payload.bloodPressure))) return 'Blood pressure must use systolic/diastolic format';
  const normalized = normalizeVitalSigns(payload);
  const heartRate = normalized.heartRate;
  if (hasValue(payload.heartRate) && (!heartRate || heartRate < 20 || heartRate > 250)) return 'Frecuencia cardiaca fuera de rango razonable';
  const respiratoryRate = normalized.respiratoryRate;
  if (hasValue(payload.respiratoryRate) && (!respiratoryRate || respiratoryRate < 5 || respiratoryRate > 80)) return 'Frecuencia respiratoria fuera de rango razonable';
  const temperature = normalized.temperature;
  if (hasValue(payload.temperature) && (!temperature || temperature < 30 || temperature > 45)) return 'Temperatura fuera de rango razonable';
  const oxygenSaturation = normalized.oxygenSaturation;
  if (hasValue(payload.oxygenSaturation) && (Number.isNaN(oxygenSaturation) || oxygenSaturation < 0 || oxygenSaturation > 100)) return 'Oxygen saturation must be between 0 and 100';
  const weight = normalized.weight;
  if (hasValue(payload.weight) && (!weight || weight <= 0 || weight > 500)) return 'Peso fuera de rango razonable';
  const height = normalized.height;
  if (hasValue(payload.height) && (!height || height <= 0 || height > 260)) return 'Altura fuera de rango razonable';
  return null;
}

function hasUsefulVitalSigns(payload: any = {}) {
  return ['bloodPressure', 'blood_pressure', 'heartRate', 'heart_rate', 'respiratoryRate', 'respiratory_rate', 'temperature', 'oxygenSaturation', 'oxygen_saturation', 'weight', 'height', 'bmi']
    .some((key) => payload[key] !== undefined && payload[key] !== null && payload[key] !== '');
}

async function ensureMedicalRecordColumns() {
  await query('ALTER TABLE medical_records ADD COLUMN IF NOT EXISTS icd10_code VARCHAR(20)').catch(() => null);
  await query('ALTER TABLE patient_diagnoses ADD COLUMN IF NOT EXISTS icd10_code VARCHAR(20)').catch(() => null);
}

/**
 * Create medical record
 */
export const createMedicalRecord = async (req: Request, res: Response) => {
  try {
    await ensureMedicalRecordColumns();
    const { patientId, diagnosis, treatment, symptoms, vitalSigns, notes, appointmentId, icd10Code } = req.body;
    const doctorId = req.user?.id;
    const vitalError = validateVitalSigns(vitalSigns);
    if (vitalError) return res.status(400).json({ success: false, message: vitalError });
    const normalizedVitals = normalizeVitalSigns(vitalSigns);

    // Verify doctor-patient relationship
    if (appointmentId) {
      const appointment = await queryOne(
        'SELECT * FROM appointments WHERE id = $1 AND doctor_id = $2 AND patient_id = $3',
        [appointmentId, doctorId, patientId]
      );

      if (!appointment) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized',
        });
      }
    } else {
      const relation = await queryOne(
        `SELECT 1 FROM appointments WHERE doctor_id = $1 AND patient_id = $2
         UNION
         SELECT 1 FROM medical_records WHERE doctor_id = $1 AND patient_id = $2
         LIMIT 1`,
        [doctorId, patientId]
      );
      if (!relation) {
        return res.status(403).json({ success: false, message: 'Unauthorized patient access' });
      }
    }

    const recordId = uuidv4();
    await query(
      `INSERT INTO medical_records 
       (id, patient_id, doctor_id, appointment_id, diagnosis, icd10_code, treatment, symptoms, vital_signs, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        recordId, patientId, doctorId, appointmentId || null,
        diagnosis, icd10Code || null, treatment, symptoms || null,
        vitalSigns ? JSON.stringify(vitalSigns) : null,
        notes || null,
      ]
    );

    if (hasUsefulVitalSigns(vitalSigns)) {
      await query(
        `INSERT INTO vital_signs
         (id, patient_id, doctor_id, medical_record_id, blood_pressure, heart_rate, respiratory_rate, temperature, oxygen_saturation, weight, height, bmi)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [
          uuidv4(),
          patientId,
          doctorId,
          recordId,
          vitalSigns.bloodPressure || vitalSigns.blood_pressure || null,
          normalizedVitals.heartRate,
          normalizedVitals.respiratoryRate,
          normalizedVitals.temperature,
          normalizedVitals.oxygenSaturation,
          normalizedVitals.weight,
          normalizedVitals.height,
          vitalSigns.bmi ?? calculateBmi(normalizedVitals.weight, normalizedVitals.height),
        ]
      );
    }

    await query(
      `INSERT INTO patient_diagnoses (id, patient_id, doctor_id, medical_record_id, diagnosis, icd10_code, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [uuidv4(), patientId, doctorId, recordId, diagnosis, icd10Code || null, 'active']
    );

    await auditClinicalAction(req, {
      action: 'create',
      entity: 'medical_records',
      entityId: recordId,
      patientId,
      doctorId,
      newData: { diagnosis, icd10Code, treatment, symptoms, vitalSigns, appointmentId },
    });

    res.status(201).json({
      success: true,
      message: 'Medical record created',
      data: { id: recordId },
    });
  } catch (error: any) {
    console.error('Create medical record error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating medical record',
    });
  }
};

/**
 * Get patient medical history
 */
export const getPatientMedicalHistory = async (req: Request, res: Response) => {
  try {
    await ensureMedicalRecordColumns();
    const { patientId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    // Verify access
    if (req.user?.role === 'patient' && req.user?.id !== patientId) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const records = await queryMany(
      `SELECT m.id, m.diagnosis, m.icd10_code, m.treatment, m.symptoms, m.notes, m.created_at,
              vs.blood_pressure, vs.heart_rate, vs.respiratory_rate, vs.temperature, vs.oxygen_saturation,
              vs.weight, vs.height, vs.bmi,
              u.first_name, u.last_name
       FROM medical_records m
       JOIN users u ON m.doctor_id = u.id
       LEFT JOIN LATERAL (
         SELECT blood_pressure, heart_rate, respiratory_rate, temperature, oxygen_saturation, weight, height, bmi
         FROM vital_signs
         WHERE medical_record_id = m.id
         ORDER BY measured_at DESC, created_at DESC
         LIMIT 1
       ) vs ON true
       WHERE m.patient_id = $1
       ORDER BY m.created_at DESC
       LIMIT $2 OFFSET $3`,
      [patientId, limit, offset]
    );

    res.json({
      success: true,
      data: records,
      pagination: {
        page: Number(page),
        limit: Number(limit),
      },
    });
  } catch (error: any) {
    console.error('Get medical history error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching medical history',
    });
  }
};

/**
 * Create prescription
 */
export const createPrescription = async (req: Request, res: Response) => {
  try {
    const { patientId, medicalRecordId, medications, notes, expiryDate } = req.body;
    const doctorId = req.user?.id;

    // Verify doctor-patient relationship through medical record
    const record = await queryOne(
      'SELECT * FROM medical_records WHERE id = $1 AND doctor_id = $2 AND patient_id = $3',
      [medicalRecordId, doctorId, patientId]
    );

    if (!record) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const prescriptionId = uuidv4();
    await query(
      `INSERT INTO prescriptions 
       (id, patient_id, doctor_id, medical_record_id, medications, notes, expiry_date, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')`,
      [
        prescriptionId, patientId, doctorId, medicalRecordId,
        JSON.stringify(medications), notes || null, expiryDate,
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Prescription created',
      data: { id: prescriptionId, status: 'active' },
    });
  } catch (error: any) {
    console.error('Create prescription error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating prescription',
    });
  }
};

/**
 * Get patient prescriptions
 */
export const getPatientPrescriptions = async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    // Verify access
    if (req.user?.role === 'patient' && req.user?.id !== patientId) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    let sql = `
      SELECT p.id, p.medications, p.notes, p.expiry_date, p.status, p.created_at,
             u.first_name, u.last_name
      FROM prescriptions p
      JOIN users u ON p.doctor_id = u.id
      WHERE p.patient_id = $1
    `;
    const params: any[] = [patientId];

    if (status) {
      sql += ` AND p.status = $2`;
      params.push(status);
    }

    sql += ` ORDER BY p.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const prescriptions = await queryMany(sql, params);

    res.json({
      success: true,
      data: prescriptions,
      pagination: {
        page: Number(page),
        limit: Number(limit),
      },
    });
  } catch (error: any) {
    console.error('Get prescriptions error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching prescriptions',
    });
  }
};
