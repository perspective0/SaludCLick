import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { query, queryMany, queryOne, transaction } from '../db';
import { v4 as uuidv4 } from 'uuid';
import { auditClinicalAction } from '../utils/audit';
import { doctorCanAccessPatient } from '../repositories/clinicalAccessRepository';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const allergySeverities = ['mild', 'moderate', 'severe', 'critical', 'leve', 'moderada', 'severa', 'critica', 'no especificada'];
const medicationStatuses = ['active', 'inactive', 'completed', 'suspended'];
const diagnosisStatuses = ['active', 'resolved', 'chronic', 'suspected', 'inactive'];

function isUuid(value?: string) {
  return Boolean(value && uuidPattern.test(value));
}

function badRequest(res: Response, message: string) {
  return res.status(400).json({ success: false, message });
}

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

function normalizeVitalPayload(payload: any = {}) {
  const normalized = { ...payload };
  normalized.heartRate = parseVitalNumber(payload.heartRate);
  normalized.respiratoryRate = parseVitalNumber(payload.respiratoryRate);
  normalized.temperature = parseVitalNumber(payload.temperature);
  normalized.oxygenSaturation = parseVitalNumber(payload.oxygenSaturation);
  normalized.weight = parseWeightKg(payload.weight);
  normalized.height = parseHeightCm(payload.height);
  return normalized;
}

function validateVitalPayload(payload: any) {
  const hasValue = (value: any) => value !== undefined && value !== null && value !== '';
  if (hasValue(payload.bloodPressure) && !/^\d{2,3}\/\d{2,3}$/.test(String(payload.bloodPressure))) return 'Blood pressure must use systolic/diastolic format';
  const normalized = normalizeVitalPayload(payload);
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

async function ensureDoctorAccess(req: Request, res: Response, patientId: string) {
  if (!isUuid(patientId)) {
    res.status(400).json({ success: false, message: 'Invalid patientId' });
    return null;
  }
  const doctorId = req.user?.id;
  if (!doctorId || req.user?.role !== 'doctor') {
    res.status(403).json({ success: false, message: 'Only doctors can access clinical data' });
    return null;
  }

  const allowed = await doctorCanAccessPatient(doctorId, patientId);
  if (!allowed) {
    res.status(403).json({ success: false, message: 'Unauthorized patient access' });
    return null;
  }

  return doctorId;
}

function calculateBmi(weight?: number | string, height?: number | string) {
  const weightNumber = parseWeightKg(weight);
  const heightNumber = parseHeightCm(height);
  if (!weightNumber || !heightNumber) return null;
  const heightMeters = heightNumber / 100;
  if (!heightMeters) return null;
  return Number((weightNumber / (heightMeters * heightMeters)).toFixed(1));
}

export const getClinicalSummary = async (req: Request, res: Response) => {
  try {
    const { id: patientId } = req.params;
    const doctorId = await ensureDoctorAccess(req, res, patientId);
    if (!doctorId) return;

    const [allergies, medications, antecedents, diagnoses, vitalSigns, lastRecord, prescriptions, nextAppointment] = await Promise.all([
      queryMany('SELECT * FROM patient_allergies WHERE patient_id = $1 AND doctor_id = $2 ORDER BY created_at DESC', [patientId, doctorId]),
      queryMany('SELECT * FROM patient_medications WHERE patient_id = $1 AND doctor_id = $2 ORDER BY created_at DESC', [patientId, doctorId]),
      queryOne('SELECT * FROM patient_antecedents WHERE patient_id = $1 AND doctor_id = $2 ORDER BY updated_at DESC LIMIT 1', [patientId, doctorId]),
      queryMany('SELECT * FROM patient_diagnoses WHERE patient_id = $1 AND doctor_id = $2 ORDER BY diagnosis_date DESC, created_at DESC LIMIT 10', [patientId, doctorId]),
      queryMany('SELECT * FROM vital_signs WHERE patient_id = $1 AND doctor_id = $2 ORDER BY measured_at DESC LIMIT 10', [patientId, doctorId]),
      queryOne('SELECT * FROM medical_records WHERE patient_id = $1 AND doctor_id = $2 ORDER BY created_at DESC LIMIT 1', [patientId, doctorId]),
      queryMany('SELECT * FROM prescriptions WHERE patient_id = $1 AND doctor_id = $2 ORDER BY created_at DESC LIMIT 5', [patientId, doctorId]),
      queryOne(
        `SELECT * FROM appointments
         WHERE patient_id = $1 AND doctor_id = $2 AND appointment_date >= CURRENT_DATE AND status NOT IN ('completed', 'cancelled', 'no-show')
         ORDER BY appointment_date ASC, appointment_time ASC LIMIT 1`,
        [patientId, doctorId]
      ),
    ]);

    res.json({
      success: true,
      data: {
        allergies,
        medications,
        antecedents,
        diagnoses,
        vitalSigns,
        lastRecord,
        prescriptions,
        nextAppointment,
      },
    });
  } catch (error) {
    console.error('Get clinical summary error:', error);
    res.status(500).json({ success: false, message: 'Error fetching clinical summary' });
  }
};

export const getTimeline = async (req: Request, res: Response) => {
  try {
    const { id: patientId } = req.params;
    const doctorId = await ensureDoctorAccess(req, res, patientId);
    if (!doctorId) return;

    const events = await queryMany(
      `SELECT id, 'consultation' AS type, diagnosis AS title, treatment AS detail, created_at AS event_date
       FROM medical_records WHERE patient_id = $1 AND doctor_id = $2
       UNION ALL
       SELECT id, 'prescription' AS type, 'Receta emitida' AS title, medications::text AS detail, created_at AS event_date
       FROM prescriptions WHERE patient_id = $1 AND doctor_id = $2
       UNION ALL
       SELECT id, 'appointment' AS type, COALESCE(reason_for_visit, 'Cita medica') AS title, status AS detail, appointment_date::timestamp AS event_date
       FROM appointments WHERE patient_id = $1 AND doctor_id = $2
       UNION ALL
       SELECT id, 'diagnosis' AS type, diagnosis AS title, COALESCE(icd10_code, status) AS detail, diagnosis_date AS event_date
       FROM patient_diagnoses WHERE patient_id = $1 AND doctor_id = $2
       UNION ALL
       SELECT id, 'vital_signs' AS type, 'Signos vitales' AS title,
              CONCAT('PA ', COALESCE(blood_pressure, 'N/D'), ' · FC ', COALESCE(heart_rate::text, 'N/D'), ' · IMC ', COALESCE(bmi::text, 'N/D')) AS detail,
              measured_at AS event_date
       FROM vital_signs WHERE patient_id = $1 AND doctor_id = $2
       ORDER BY event_date DESC
       LIMIT 100`,
      [patientId, doctorId]
    );

    res.json({ success: true, data: events });
  } catch (error) {
    console.error('Get clinical timeline error:', error);
    res.status(500).json({ success: false, message: 'Error fetching clinical timeline' });
  }
};

export const getVitalSigns = async (req: Request, res: Response) => {
  try {
    const { id: patientId } = req.params;
    const doctorId = await ensureDoctorAccess(req, res, patientId);
    if (!doctorId) return;
    const rows = await queryMany('SELECT * FROM vital_signs WHERE patient_id = $1 AND doctor_id = $2 ORDER BY measured_at DESC', [patientId, doctorId]);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Get vital signs error:', error);
    res.status(500).json({ success: false, message: 'Error fetching vital signs' });
  }
};

export const createVitalSigns = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    const { id: patientId } = req.params;
    const doctorId = await ensureDoctorAccess(req, res, patientId);
    if (!doctorId) return;
    const validationError = validateVitalPayload(req.body);
    if (validationError) return badRequest(res, validationError);
    const { medicalRecordId, bloodPressure, measuredAt } = req.body;
    const normalizedVitals = normalizeVitalPayload(req.body);
    if (medicalRecordId && !isUuid(medicalRecordId)) return badRequest(res, 'Invalid medicalRecordId');
    const bmi = req.body.bmi ?? calculateBmi(normalizedVitals.weight, normalizedVitals.height);
    const row = await queryOne(
      `INSERT INTO vital_signs
       (id, patient_id, doctor_id, medical_record_id, blood_pressure, heart_rate, respiratory_rate, temperature, oxygen_saturation, weight, height, bmi, measured_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,COALESCE($13, NOW()))
       RETURNING *`,
      [uuidv4(), patientId, doctorId, medicalRecordId || null, bloodPressure || null, normalizedVitals.heartRate, normalizedVitals.respiratoryRate, normalizedVitals.temperature, normalizedVitals.oxygenSaturation, normalizedVitals.weight, normalizedVitals.height, bmi, measuredAt || null]
    );
    await auditClinicalAction(req, { action: 'create', entity: 'vital_signs', entityId: row.id, patientId, doctorId, newData: row });
    res.status(201).json({ success: true, data: row });
  } catch (error) {
    console.error('Create vital signs error:', error);
    res.status(500).json({ success: false, message: 'Error creating vital signs' });
  }
};

export const getAllergies = async (req: Request, res: Response) => listClinicalRows(req, res, 'patient_allergies');
export const getMedications = async (req: Request, res: Response) => listClinicalRows(req, res, 'patient_medications');
export const getDiagnoses = async (req: Request, res: Response) => listClinicalRows(req, res, 'patient_diagnoses');
export const getAntecedents = async (req: Request, res: Response) => listClinicalRows(req, res, 'patient_antecedents');

async function listClinicalRows(req: Request, res: Response, table: string) {
  try {
    const { id: patientId } = req.params;
    const doctorId = await ensureDoctorAccess(req, res, patientId);
    if (!doctorId) return;
    const rows = await queryMany(`SELECT * FROM ${table} WHERE patient_id = $1 AND doctor_id = $2 ORDER BY created_at DESC`, [patientId, doctorId]);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error(`List ${table} error:`, error);
    res.status(500).json({ success: false, message: 'Error fetching clinical data' });
  }
}

export const createAllergy = async (req: Request, res: Response) => {
  try {
    const { id: patientId } = req.params;
    const doctorId = await ensureDoctorAccess(req, res, patientId);
    if (!doctorId) return;
    const { name, type, severity, reaction, notes, isActive = true } = req.body;
    if (!name?.trim()) return res.status(400).json({ success: false, message: 'Allergy name is required' });
    if (severity && !allergySeverities.includes(String(severity).toLowerCase())) return badRequest(res, 'Invalid allergy severity');
    const row = await queryOne(
      `INSERT INTO patient_allergies (id, patient_id, doctor_id, name, type, severity, reaction, notes, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [uuidv4(), patientId, doctorId, name.trim(), type || null, severity || null, reaction || null, notes || null, isActive]
    );
    await auditClinicalAction(req, { action: 'create', entity: 'patient_allergies', entityId: row.id, patientId, doctorId, newData: row });
    res.status(201).json({ success: true, data: row });
  } catch (error) {
    console.error('Create allergy error:', error);
    res.status(500).json({ success: false, message: 'Error creating allergy' });
  }
};

export const createMedication = async (req: Request, res: Response) => {
  try {
    const { id: patientId } = req.params;
    const doctorId = await ensureDoctorAccess(req, res, patientId);
    if (!doctorId) return;
    const { medication, dosage, frequency, startDate, endDate, prescribedBy, isActive = true, status } = req.body;
    if (!medication?.trim()) return res.status(400).json({ success: false, message: 'Medication is required' });
    if (status && !medicationStatuses.includes(String(status).toLowerCase())) return badRequest(res, 'Invalid medication status');
    const row = await queryOne(
      `INSERT INTO patient_medications (id, patient_id, doctor_id, medication, dosage, frequency, start_date, end_date, prescribed_by, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [uuidv4(), patientId, doctorId, medication.trim(), dosage || null, frequency || null, startDate || null, endDate || null, prescribedBy || null, isActive]
    );
    await auditClinicalAction(req, { action: 'create', entity: 'patient_medications', entityId: row.id, patientId, doctorId, newData: row });
    res.status(201).json({ success: true, data: row });
  } catch (error) {
    console.error('Create medication error:', error);
    res.status(500).json({ success: false, message: 'Error creating medication' });
  }
};

export const createDiagnosis = async (req: Request, res: Response) => {
  try {
    const { id: patientId } = req.params;
    const doctorId = await ensureDoctorAccess(req, res, patientId);
    if (!doctorId) return;
    const { diagnosis, icd10Code, status = 'active', diagnosisDate, medicalRecordId } = req.body;
    if (!diagnosis?.trim()) return res.status(400).json({ success: false, message: 'Diagnosis is required' });
    if (!diagnosisStatuses.includes(String(status).toLowerCase())) return badRequest(res, 'Invalid diagnosis status');
    if (medicalRecordId && !isUuid(medicalRecordId)) return badRequest(res, 'Invalid medicalRecordId');
    const row = await queryOne(
      `INSERT INTO patient_diagnoses (id, patient_id, doctor_id, medical_record_id, diagnosis, icd10_code, status, diagnosis_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,COALESCE($8, NOW())) RETURNING *`,
      [uuidv4(), patientId, doctorId, medicalRecordId || null, diagnosis.trim(), icd10Code || null, status, diagnosisDate || null]
    );
    await auditClinicalAction(req, { action: 'create', entity: 'patient_diagnoses', entityId: row.id, patientId, doctorId, newData: row });
    res.status(201).json({ success: true, data: row });
  } catch (error) {
    console.error('Create diagnosis error:', error);
    res.status(500).json({ success: false, message: 'Error creating diagnosis' });
  }
};

export const saveAntecedents = async (req: Request, res: Response) => {
  try {
    const { id: patientId } = req.params;
    const doctorId = await ensureDoctorAccess(req, res, patientId);
    if (!doctorId) return;
    const { personalHistory, familyHistory, surgicalHistory, habits, chronicDiseases } = req.body;
    const row = await queryOne(
      `INSERT INTO patient_antecedents (id, patient_id, doctor_id, personal_history, family_history, surgical_history, habits, chronic_diseases)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [uuidv4(), patientId, doctorId, personalHistory || null, familyHistory || null, surgicalHistory || null, habits || null, chronicDiseases || null]
    );
    await auditClinicalAction(req, { action: 'create', entity: 'patient_antecedents', entityId: row.id, patientId, doctorId, newData: row });
    res.status(201).json({ success: true, data: row });
  } catch (error) {
    console.error('Save antecedents error:', error);
    res.status(500).json({ success: false, message: 'Error saving antecedents' });
  }
};

export const getConsultationDraft = async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;
    const doctorId = await ensureDoctorAccess(req, res, patientId);
    if (!doctorId) return;
    const draft = await queryOne(
      "SELECT * FROM consultation_drafts WHERE patient_id = $1 AND doctor_id = $2 AND status = 'draft' ORDER BY updated_at DESC LIMIT 1",
      [patientId, doctorId]
    );
    res.json({ success: true, data: draft });
  } catch (error) {
    console.error('Get consultation draft error:', error);
    res.status(500).json({ success: false, message: 'Error fetching consultation draft' });
  }
};

export const saveConsultationDraft = async (req: Request, res: Response) => {
  try {
    const doctorId = req.user?.id;
    const { patientId, appointmentId, draftData } = req.body;
    if (!doctorId || req.user?.role !== 'doctor') return res.status(403).json({ success: false, message: 'Only doctors can save drafts' });
    if (!isUuid(patientId)) return badRequest(res, 'Invalid patientId');
    if (appointmentId && !isUuid(appointmentId)) return badRequest(res, 'Invalid appointmentId');
    const allowed = await doctorCanAccessPatient(doctorId, patientId);
    if (!allowed) return res.status(403).json({ success: false, message: 'Unauthorized patient access' });
    if (!draftData) return res.status(400).json({ success: false, message: 'draftData is required' });

    const row = await queryOne(
      `INSERT INTO consultation_drafts (id, patient_id, doctor_id, appointment_id, draft_data, status)
       VALUES ($1,$2,$3,$4,$5,'draft')
       ON CONFLICT (patient_id, doctor_id)
       DO UPDATE SET appointment_id = EXCLUDED.appointment_id, draft_data = EXCLUDED.draft_data, status = 'draft', updated_at = NOW()
       RETURNING *`,
      [uuidv4(), patientId, doctorId, appointmentId || null, JSON.stringify(draftData)]
    );
    await auditClinicalAction(req, { action: 'upsert', entity: 'consultation_drafts', entityId: row.id, patientId, doctorId, newData: row });
    res.status(201).json({ success: true, data: row });
  } catch (error) {
    console.error('Save consultation draft error:', error);
    res.status(500).json({ success: false, message: 'Error saving consultation draft' });
  }
};

export const deleteConsultationDraft = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!isUuid(id)) return badRequest(res, 'Invalid draft id');
    const doctorId = req.user?.id;
    const draft = await queryOne('SELECT * FROM consultation_drafts WHERE id = $1 AND doctor_id = $2', [id, doctorId]);
    if (!draft) return res.status(404).json({ success: false, message: 'Draft not found' });
    const row = await queryOne("UPDATE consultation_drafts SET status = 'discarded', updated_at = NOW() WHERE id = $1 RETURNING *", [id]);
    await auditClinicalAction(req, { action: 'discard', entity: 'consultation_drafts', entityId: id, patientId: draft.patient_id, doctorId, oldData: draft, newData: row });
    res.json({ success: true, message: 'Draft discarded' });
  } catch (error) {
    console.error('Delete consultation draft error:', error);
    res.status(500).json({ success: false, message: 'Error deleting consultation draft' });
  }
};

export const finalizeConsultationDraft = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!isUuid(id)) return badRequest(res, 'Invalid draft id');
    const doctorId = req.user?.id;
    const draft = await queryOne("SELECT * FROM consultation_drafts WHERE id = $1 AND doctor_id = $2 AND status = 'draft'", [id, doctorId]);
    if (!draft) return res.status(404).json({ success: false, message: 'Draft not found' });
    const draftData = typeof draft.draft_data === 'string' ? JSON.parse(draft.draft_data) : draft.draft_data;
    const soap = draftData.soap || {};
    const vitals = draftData.vitals || {};
    const clinicalForm = draftData.clinicalForm || {};

    if (!soap.primaryDiagnosis || !soap.treatment) {
      return res.status(400).json({ success: false, message: 'Draft requires primaryDiagnosis and treatment' });
    }
    const vitalError = validateVitalPayload(vitals);
    if (vitalError) return badRequest(res, vitalError);
    const normalizedVitals = normalizeVitalPayload(vitals);
    const icd10Code = soap.primaryDiagnosisIcd10 || soap.icd10Code || null;
    await query('ALTER TABLE medical_records ADD COLUMN IF NOT EXISTS icd10_code VARCHAR(20)').catch(() => null);
    await query('ALTER TABLE patient_diagnoses ADD COLUMN IF NOT EXISTS icd10_code VARCHAR(20)').catch(() => null);

    const result = await transaction(async (client) => {
      const recordId = uuidv4();
      await client.query(
        `INSERT INTO medical_records (id, patient_id, doctor_id, appointment_id, diagnosis, icd10_code, treatment, symptoms, vital_signs, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [recordId, draft.patient_id, doctorId, draft.appointment_id, soap.primaryDiagnosis, icd10Code, soap.treatment, soap.symptoms || soap.reasonForVisit || null, JSON.stringify(vitals), draftData.notes || null]
      );
      if (hasUsefulVitalSigns(vitals)) {
        const bmi = calculateBmi(normalizedVitals.weight, normalizedVitals.height);
        await client.query(
          `INSERT INTO vital_signs (id, patient_id, doctor_id, medical_record_id, blood_pressure, heart_rate, respiratory_rate, temperature, oxygen_saturation, weight, height, bmi)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
          [uuidv4(), draft.patient_id, doctorId, recordId, vitals.bloodPressure || null, normalizedVitals.heartRate, normalizedVitals.respiratoryRate, normalizedVitals.temperature, normalizedVitals.oxygenSaturation, normalizedVitals.weight, normalizedVitals.height, vitals.bmi ?? bmi]
        );
      }
      await client.query(
        `INSERT INTO patient_diagnoses (id, patient_id, doctor_id, medical_record_id, diagnosis, icd10_code, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [uuidv4(), draft.patient_id, doctorId, recordId, soap.primaryDiagnosis, icd10Code, 'active']
      );
      if (clinicalForm.allergies) {
        await client.query(
          `INSERT INTO patient_allergies (id, patient_id, doctor_id, name, type, severity, is_active)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [uuidv4(), draft.patient_id, doctorId, clinicalForm.allergies, 'clinica', 'no especificada', true]
        );
      }
      if (clinicalForm.currentMedications) {
        await client.query(
          `INSERT INTO patient_medications (id, patient_id, doctor_id, medication, is_active)
           VALUES ($1,$2,$3,$4,$5)`,
          [uuidv4(), draft.patient_id, doctorId, clinicalForm.currentMedications, true]
        );
      }
      if (clinicalForm.personalHistory || clinicalForm.familyHistory) {
        await client.query(
          `INSERT INTO patient_antecedents (id, patient_id, doctor_id, personal_history, family_history)
           VALUES ($1,$2,$3,$4,$5)`,
          [uuidv4(), draft.patient_id, doctorId, clinicalForm.personalHistory || null, clinicalForm.familyHistory || null]
        );
      }
      if (draft.appointment_id) {
        await client.query("UPDATE appointments SET status = 'completed', updated_at = NOW() WHERE id = $1 AND doctor_id = $2", [draft.appointment_id, doctorId]);
      }
      await client.query("UPDATE consultation_drafts SET status = 'finalized', finalized_at = NOW(), medical_record_id = $1, updated_at = NOW() WHERE id = $2", [recordId, id]);
      await auditClinicalAction(req, { action: 'finalize', entity: 'consultation_drafts', entityId: id, patientId: draft.patient_id, doctorId, oldData: draft, newData: { medicalRecordId: recordId } }, client);
      return { recordId };
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    console.error('Finalize consultation draft error:', error);
    res.status(500).json({ success: false, message: 'Error finalizing consultation draft' });
  }
};
