import { Request, Response } from 'express';
import { query, queryMany, queryOne } from '../db';
import { v4 as uuidv4 } from 'uuid';
import { auditClinicalAction } from '../utils/audit';
import { notifyUser } from './notificationController';
import { fail, ok, created } from '../utils/apiResponse';
import { isUuid } from '../validators/commonValidators';
import { validateMedicationList } from '../validators/clinicalValidators';
import { doctorCanAccessPatient } from '../repositories/clinicalAccessRepository';
import { recordVademecumPrescriptionHistory } from './vademecumController';
import QRCode from 'qrcode';
import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

function generateValidationCode() {
  return `RX-${uuidv4().replace(/-/g, '').slice(0, 16).toUpperCase()}`;
}

function maskPatientName(firstName?: string, lastName?: string) {
  const first = firstName ? `${firstName[0]}***` : 'P***';
  const last = lastName ? `${lastName[0]}***` : '';
  return `${first} ${last}`.trim();
}

function getPrescriptionStatus(prescription: any) {
  if (['cancelled', 'voided', 'anulada'].includes(String(prescription?.status || '').toLowerCase())) return 'Cancelada';
  if (prescription?.expiry_date && new Date(prescription.expiry_date) < new Date()) return 'Expirada';
  if (String(prescription?.status || '').toLowerCase() === 'active') return 'Activa';
  return prescription?.status || 'No disponible';
}

export const createPrescription = async (req: Request, res: Response) => {
  try {
    await ensurePrescriptionProfessionalColumns();
    const doctorId = req.user?.id;
    if (!doctorId || req.user?.role !== 'doctor') {
      return fail(res, 403, 'Only doctors can create prescriptions');
    }

    const { patientId, medicalRecordId, medications, notes, expiryDate, diagnosis, healthCenterId, digitalSealEnabled } = req.body;
    if (!isUuid(patientId)) return fail(res, 400, 'Invalid patientId');
    if (!isUuid(medicalRecordId)) return fail(res, 400, 'Invalid medicalRecordId');
    const medicationError = validateMedicationList(medications);
    if (medicationError) return fail(res, 400, medicationError);

    const allowed = await doctorCanAccessPatient(doctorId, patientId);
    if (!allowed) return fail(res, 403, 'Unauthorized patient access');

    const record = await queryOne(
      'SELECT id, diagnosis FROM medical_records WHERE id = $1 AND patient_id = $2 AND doctor_id = $3',
      [medicalRecordId, patientId, doctorId]
    );
    if (!record) return fail(res, 404, 'Medical record not found');

    const doctor = await queryOne(
      `SELECT d.license_number, d.specialties, d.health_center_id, u.first_name, u.last_name, hc.name AS health_center_name
       FROM doctors d
       JOIN users u ON u.id = d.id
       LEFT JOIN health_centers hc ON hc.id = d.health_center_id
       WHERE d.id = $1`,
      [doctorId]
    );
    const selectedHealthCenterId = await resolveDoctorHealthCenter(doctorId, healthCenterId, doctor?.health_center_id);
    if (!selectedHealthCenterId) {
      return fail(res, 400, 'Selecciona un centro de salud asociado al médico.');
    }

    const prescriptionId = uuidv4();
    const validationCode = generateValidationCode();
    const row = await queryOne(
      `INSERT INTO prescriptions
       (id, patient_id, doctor_id, medical_record_id, medications, notes, expiry_date, status, diagnosis, issued_at, validation_code, doctor_signature, doctor_seal, license_number, health_center_id, digital_seal_enabled)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'active',$8,NOW(),$9,$10,$11,$12,$13,$14)
       RETURNING *`,
      [
        prescriptionId,
        patientId,
        doctorId,
        medicalRecordId,
        JSON.stringify(medications),
        notes || null,
        expiryDate || null,
        diagnosis || record.diagnosis || null,
        validationCode,
        `${doctor?.first_name || ''} ${doctor?.last_name || ''}`.trim() || null,
        null,
        doctor?.license_number || null,
        selectedHealthCenterId,
        Boolean(digitalSealEnabled),
      ]
    );
    const rowWithHash = await ensurePrescriptionDocumentHash(row);
    await recordVademecumPrescriptionHistory(req, doctorId, patientId, prescriptionId, medications).catch(() => null);

    await auditClinicalAction(req, { action: 'create', entity: 'prescriptions', entityId: prescriptionId, patientId, doctorId, newData: rowWithHash || row });
    await notifyUser(patientId, {
      title: 'Nueva receta disponible',
      body: 'Tu médico emitió una nueva receta. Puedes verla e imprimirla desde tu portal.',
      url: `/patient/prescriptions/${prescriptionId}`,
      type: 'prescription',
      entityType: 'prescription',
      entityId: prescriptionId,
      priority: 'normal',
    }).catch(() => null);
    return created(res, rowWithHash || row, 'Prescription created successfully');
  } catch (error: any) {
    console.error('Create prescription error:', error);
    return fail(res, 500, 'Error creating prescription', error);
  }
};

export const getPatientPrescriptions = async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role;
    if (!isUuid(patientId)) return fail(res, 400, 'Invalid patientId');

    if (userRole === 'patient' && userId !== patientId) {
      return fail(res, 403, 'Unauthorized');
    }
    if (userRole === 'doctor') {
      const allowed = await doctorCanAccessPatient(userId!, patientId);
      if (!allowed) return fail(res, 403, 'Unauthorized patient access');
    }

    const prescriptions = await queryMany(
      `SELECT p.*, u.first_name as doctor_first_name, u.last_name as doctor_last_name,
              pu.first_name as patient_first_name, pu.last_name as patient_last_name,
              d.specialties, d.license_number, d.prescription_seal, hc.name as health_center_name
       FROM prescriptions p
       JOIN users u ON p.doctor_id = u.id
       JOIN users pu ON p.patient_id = pu.id
       JOIN doctors d ON p.doctor_id = d.id
       LEFT JOIN health_centers hc ON COALESCE(p.health_center_id, d.health_center_id) = hc.id
       WHERE p.patient_id = $1
       ORDER BY p.created_at DESC`,
      [patientId]
    );

    return ok(res, prescriptions);
  } catch (error: any) {
    console.error('Get prescriptions error:', error);
    return fail(res, 500, 'Error fetching prescriptions', error);
  }
};

export const getPrescriptionById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role;
    if (!isUuid(id)) return res.status(400).json({ success: false, message: 'Invalid prescription id' });

    const prescription = await getPrescriptionDetail(id);
    if (!prescription) return res.status(404).json({ success: false, message: 'Prescription not found' });

    if (userRole === 'patient' && userId !== prescription.patient_id) return res.status(403).json({ success: false, message: 'Unauthorized' });
    if (userRole === 'doctor' && userId !== prescription.doctor_id) return res.status(403).json({ success: false, message: 'Unauthorized' });

    if (userRole === 'patient') {
      await auditClinicalAction(req, { action: 'patient_view', entity: 'prescriptions', entityId: id, patientId: prescription.patient_id, doctorId: prescription.doctor_id }).catch(() => null);
    }

    res.json({ success: true, data: prescription });
  } catch (error: any) {
    console.error('Get prescription error:', error);
    res.status(500).json({ success: false, message: 'Error fetching prescription' });
  }
};

export const cancelPrescription = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const doctorId = req.user?.id;
    if (!doctorId || req.user?.role !== 'doctor') return res.status(403).json({ success: false, message: 'Only doctors can cancel prescriptions' });
    if (!isUuid(id)) return res.status(400).json({ success: false, message: 'Invalid prescription id' });

    const existing = await queryOne('SELECT * FROM prescriptions WHERE id = $1 AND doctor_id = $2', [id, doctorId]);
    if (!existing) return res.status(404).json({ success: false, message: 'Prescription not found' });
    if (['cancelled', 'voided', 'anulada'].includes(existing.status)) return res.status(409).json({ success: false, message: 'Prescription already cancelled' });

    const row = await queryOne(
      `UPDATE prescriptions
       SET status = 'cancelled', cancelled_at = NOW(), cancelled_reason = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [req.body.reason || null, id]
    );
    await auditClinicalAction(req, { action: 'cancel', entity: 'prescriptions', entityId: id, patientId: existing.patient_id, doctorId, oldData: existing, newData: row });
    await notifyUser(existing.patient_id, {
      title: 'Receta anulada',
      body: 'Una receta médica fue anulada por tu médico.',
      url: `/patient/prescriptions/${id}`,
      type: 'prescription',
      entityType: 'prescription',
      entityId: id,
      priority: 'high',
    }).catch(() => null);
    res.json({ success: true, data: row });
  } catch (error) {
    console.error('Cancel prescription error:', error);
    res.status(500).json({ success: false, message: 'Error cancelling prescription' });
  }
};

export const verifyPrescription = async (req: Request, res: Response) => {
  try {
    await ensurePrescriptionProfessionalColumns();
    const { code } = req.params;
    const prescription = await queryOne(
      `SELECT p.*,
              u.first_name as doctor_first_name, u.last_name as doctor_last_name,
              pu.first_name as patient_first_name, pu.last_name as patient_last_name,
              d.license_number, d.specialties, d.cmd_number, hc.name as health_center_name
       FROM prescriptions p
       JOIN users u ON p.doctor_id = u.id
       JOIN users pu ON p.patient_id = pu.id
       JOIN doctors d ON d.id = p.doctor_id
       LEFT JOIN health_centers hc ON COALESCE(p.health_center_id, d.health_center_id) = hc.id
       WHERE p.validation_code = $1`,
      [code]
    );
    if (!prescription) return res.status(404).json({ success: false, message: 'Prescription not found' });
    const hashedPrescription = await ensurePrescriptionDocumentHash(prescription);
    const activePrescription = hashedPrescription || prescription;
    const currentHash = computePrescriptionDocumentHash(activePrescription);
    const storedHash = String(activePrescription.document_hash || '').toLowerCase();
    const documentIntact = Boolean(storedHash && storedHash === currentHash.toLowerCase());

    await query(
      `INSERT INTO audit_logs (action, entity, entity_id, new_data, ip_address, user_agent)
       VALUES ($1,$2,NULL,$3,$4,$5)`,
      ['verify_public', 'prescriptions', JSON.stringify({ validationCode: code }), req.ip || null, req.headers['user-agent'] || null]
    ).catch(() => null);

    res.json({
      success: true,
      data: {
        status: activePrescription.status,
        doctor: `${activePrescription.doctor_first_name} ${activePrescription.doctor_last_name}`,
        licenseNumber: activePrescription.license_number,
        cmdNumber: activePrescription.cmd_number,
        specialties: activePrescription.specialties,
        healthCenter: activePrescription.health_center_name,
        patient: maskPatientName(activePrescription.patient_first_name, activePrescription.patient_last_name),
        issuedAt: activePrescription.issued_at,
        expiryDate: activePrescription.expiry_date,
        medications: activePrescription.medications,
        validationCode: activePrescription.validation_code,
        statusLabel: getPrescriptionStatus(activePrescription),
        documentHash: activePrescription.document_hash,
        documentHashAlgorithm: activePrescription.document_hash_algorithm || 'SHA-256',
        documentHashGeneratedAt: activePrescription.document_hash_generated_at,
        documentIntact,
        valid: activePrescription.status === 'active' && (!activePrescription.expiry_date || new Date(activePrescription.expiry_date) >= new Date()) && documentIntact,
      },
    });
  } catch (error) {
    console.error('Verify prescription error:', error);
    res.status(500).json({ success: false, message: 'Error verifying prescription' });
  }
};

export const getPrescriptionPrint = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!isUuid(id)) return res.status(400).send('Invalid prescription id');

    const prescription = await getPrescriptionDetail(id);
    if (!prescription) return res.status(404).send('Prescription not found');

    const userId = req.user?.id;
    const userRole = req.user?.role;
    if (userRole === 'patient' && userId !== prescription.patient_id) return res.status(403).send('Unauthorized');
    if (userRole === 'doctor' && userId !== prescription.doctor_id) return res.status(403).send('Unauthorized');
    if (!['patient', 'doctor', 'admin'].includes(String(userRole))) return res.status(403).send('Unauthorized');

    await auditClinicalAction(req, { action: 'print', entity: 'prescriptions', entityId: id, patientId: prescription.patient_id, doctorId: prescription.doctor_id }).catch(() => null);
    if (userRole === 'patient') {
      await notifyUser(prescription.doctor_id, {
        title: 'Paciente imprimio receta',
        body: 'Un paciente visualizo o imprimio una receta emitida.',
        url: `/doctor/prescriptions`,
        type: 'prescription',
        entityType: 'prescription',
        entityId: id,
        priority: 'low',
      }).catch(() => null);
    }

    const verifyUrl = getPublicPrescriptionVerifyUrl(req, prescription.validation_code);
    const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
      margin: 1,
      width: 180,
      color: {
        dark: '#111827',
        light: '#ffffff',
      },
    });

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(renderPrescriptionHtml(prescription, verifyUrl, qrDataUrl));
  } catch (error) {
    console.error('Print prescription error:', error);
    res.status(500).send('Error generating prescription');
  }
};

export const getPrescriptionPdf = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!isUuid(id)) return res.status(400).send('Invalid prescription id');

    const prescription = await getPrescriptionDetail(id);
    if (!prescription) return res.status(404).send('Prescription not found');

    const userId = req.user?.id;
    const userRole = req.user?.role;
    if (userRole === 'patient' && userId !== prescription.patient_id) return res.status(403).send('Unauthorized');
    if (userRole === 'doctor' && userId !== prescription.doctor_id) return res.status(403).send('Unauthorized');
    if (!['patient', 'doctor', 'admin'].includes(String(userRole))) return res.status(403).send('Unauthorized');

    await auditClinicalAction(req, { action: 'download_pdf', entity: 'prescriptions', entityId: id, patientId: prescription.patient_id, doctorId: prescription.doctor_id }).catch(() => null);

    const verifyUrl = getPublicPrescriptionVerifyUrl(req, prescription.validation_code);
    const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
      margin: 1,
      width: 180,
      color: { dark: '#111827', light: '#ffffff' },
    });

    const fileName = `receta-${prescription.validation_code || id}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    const doc = renderPrescriptionPdf(prescription, verifyUrl, qrDataUrl);
    doc.pipe(res);
    doc.end();
  } catch (error) {
    console.error('PDF prescription error:', error);
    res.status(500).send('Error generating prescription PDF');
  }
};

async function getPrescriptionDetail(id: string) {
  await ensurePrescriptionProfessionalColumns();
  const prescription = await queryOne(
    `SELECT p.*, u.first_name as doctor_first_name, u.last_name as doctor_last_name, u.phone as doctor_phone,
            pu.first_name as patient_first_name, pu.last_name as patient_last_name, pu.email as patient_email,
            pp.date_of_birth as patient_date_of_birth, pp.gender as patient_gender, pp.document_number as patient_document_number,
            pp.has_insurance as patient_has_insurance, pp.insurance_provider as patient_insurance_provider, pp.insurance_number as patient_insurance_number,
            mr.icd10_code,
            d.specialties, d.license_number as doctor_license_number, d.cmd_number, d.prescription_logo, d.prescription_seal,
            hc.name as health_center_name, hc.address as health_center_address, hc.phone as health_center_phone
     FROM prescriptions p
     JOIN users u ON p.doctor_id = u.id
     JOIN users pu ON p.patient_id = pu.id
     LEFT JOIN patients pp ON pp.id = p.patient_id
     LEFT JOIN medical_records mr ON mr.id = p.medical_record_id
     JOIN doctors d ON p.doctor_id = d.id
     LEFT JOIN health_centers hc ON COALESCE(p.health_center_id, d.health_center_id) = hc.id
     WHERE p.id = $1`,
    [id]
  );
  return prescription ? ensurePrescriptionDocumentHash(prescription) : null;
}

async function ensurePrescriptionProfessionalColumns() {
  await query('ALTER TABLE doctors ADD COLUMN IF NOT EXISTS cmd_number VARCHAR(80)').catch(() => null);
  await query('ALTER TABLE doctors ADD COLUMN IF NOT EXISTS prescription_logo TEXT').catch(() => null);
  await query('ALTER TABLE doctors ADD COLUMN IF NOT EXISTS prescription_seal TEXT').catch(() => null);
  await query('ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS digital_seal_enabled BOOLEAN DEFAULT false').catch(() => null);
  await query('ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS document_hash VARCHAR(128)').catch(() => null);
  await query('ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS document_hash_algorithm VARCHAR(20) DEFAULT \'SHA-256\'').catch(() => null);
  await query('ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS document_hash_generated_at TIMESTAMP').catch(() => null);
  await query('ALTER TABLE medical_records ADD COLUMN IF NOT EXISTS icd10_code VARCHAR(20)').catch(() => null);
  await query('ALTER TABLE patients ADD COLUMN IF NOT EXISTS document_number VARCHAR(30)').catch(() => null);
  await query('ALTER TABLE patients ADD COLUMN IF NOT EXISTS has_insurance BOOLEAN DEFAULT false').catch(() => null);
  await query('ALTER TABLE patients ADD COLUMN IF NOT EXISTS insurance_provider VARCHAR(255)').catch(() => null);
  await query('ALTER TABLE patients ADD COLUMN IF NOT EXISTS insurance_number VARCHAR(255)').catch(() => null);
}

async function ensurePrescriptionDocumentHash(prescription: any) {
  if (!prescription) return prescription;
  if (prescription.document_hash) return prescription;
  const expectedHash = computePrescriptionDocumentHash(prescription);
  const updated = await queryOne(
    `UPDATE prescriptions
     SET document_hash = $1,
         document_hash_algorithm = 'SHA-256',
         document_hash_generated_at = COALESCE(document_hash_generated_at, NOW())
     WHERE id = $2
     RETURNING *`,
    [expectedHash, prescription.id]
  ).catch(() => null);

  return updated ? { ...prescription, ...updated } : { ...prescription, document_hash: expectedHash, document_hash_algorithm: 'SHA-256' };
}

function computePrescriptionDocumentHash(prescription: any) {
  const canonical = {
    id: prescription.id || '',
    patientId: prescription.patient_id || '',
    doctorId: prescription.doctor_id || '',
    medicalRecordId: prescription.medical_record_id || '',
    healthCenterId: prescription.health_center_id || '',
    validationCode: prescription.validation_code || '',
    issuedAt: normalizeHashDate(prescription.issued_at || prescription.created_at),
    expiryDate: normalizeHashDate(prescription.expiry_date),
    diagnosis: prescription.diagnosis || '',
    medications: normalizeHashJson(prescription.medications),
    notes: prescription.notes || '',
    licenseNumber: prescription.license_number || prescription.doctor_license_number || '',
    doctorSignature: prescription.doctor_signature || '',
    digitalSealEnabled: Boolean(prescription.digital_seal_enabled),
  };

  return crypto.createHash('sha256').update(stableStringify(canonical), 'utf8').digest('hex');
}

function normalizeHashJson(value: any) {
  if (typeof value !== 'string') return value ?? null;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function normalizeHashDate(value: any) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString();
}

function stableStringify(value: any): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
}

function renderPrescriptionHtml(prescription: any, verifyUrl: string, qrDataUrl: string) {
  const medications = typeof prescription.medications === 'string' ? JSON.parse(prescription.medications) : prescription.medications;
  const specialties = Array.isArray(prescription.specialties)
    ? prescription.specialties.filter(Boolean).join(', ')
    : String(prescription.specialties || '').replace(/[{}"]/g, '').split(',').filter(Boolean).join(', ');
  const doctorName = `${prescription.doctor_first_name || ''} ${prescription.doctor_last_name || ''}`.trim();
  const patientName = `${prescription.patient_first_name || ''} ${prescription.patient_last_name || ''}`.trim();
  const issuedAt = prescription.issued_at || prescription.created_at;
  const expiryDate = prescription.expiry_date ? formatDateTime(prescription.expiry_date, false) : 'No especificada';
  const logoUrl = prescription.prescription_logo || '/saludclick.png';
  const digitalSealEnabled = Boolean(prescription.digital_seal_enabled && prescription.prescription_seal);
  const validationToken = String(prescription.validation_code || '').replace(/^RX-/, '');
  const documentHash = prescription.document_hash || computePrescriptionDocumentHash(prescription);
  const patientMeta = prescription.patient_date_of_birth ? `Edad: ${calculateAge(prescription.patient_date_of_birth)} años` : '';
  const doctorPhone = prescription.doctor_phone ? `Tel: ${prescription.doctor_phone}` : '';
  const centerMeta = [
    prescription.health_center_address || '',
    prescription.health_center_phone ? `Tel: ${prescription.health_center_phone}` : '',
  ].filter(Boolean).join(' · ');
  const doctorCredentials = [
    prescription.license_number || prescription.doctor_license_number ? `Exequatur ${prescription.license_number || prescription.doctor_license_number}` : '',
    prescription.cmd_number ? `CMD ${prescription.cmd_number}` : '',
  ].filter(Boolean).join(' · ');
  const rows = (Array.isArray(medications) ? medications : []).map((item: any, index: number) => `
    <tr>
      <td>${index + 1}</td>
      <td>${escapeHtml(item.name || item.medication || '')}<br><small>${escapeHtml(item.presentation || '')}</small></td>
      <td>${escapeHtml(formatSimpleDosage(item))}</td>
      <td>${escapeHtml(item.quantity ? `Dispensar: ${item.quantity}` : '')}</td>
    </tr>
  `).join('');

  return `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Receta ${prescription.validation_code}</title>
      <style>
        * { box-sizing:border-box; }
        body { font-family: Arial, sans-serif; color:#111827; margin:0; background:#f3f6fb; }
        .page { max-width:960px; margin:24px auto; background:#fff; padding:34px; border:1px solid #e5e7eb; box-shadow:0 18px 50px rgba(15,23,42,.08); }
        .toolbar { max-width:960px; margin:20px auto 0; display:flex; justify-content:flex-end; }
        button { border:0; border-radius:10px; background:#2563eb; color:#fff; padding:10px 16px; font-weight:700; cursor:pointer; }
        .header { display:grid; grid-template-columns:1fr auto; gap:28px; align-items:start; padding-bottom:22px; border-bottom:1px solid #dbe4f0; }
        .brand-logo { width:168px; max-height:70px; height:auto; display:block; margin-bottom:12px; object-fit:contain; object-position:left center; }
        .doctor-heading { font-size:24px; font-weight:900; color:#0f172a; line-height:1.15; }
        .doctor-meta { margin-top:5px; font-size:14px; color:#64748b; }
        .title { text-align:right; }
        .title h1 { margin:0 0 10px; font-size:28px; color:#0f172a; letter-spacing:0; }
        .code { display:inline-block; border:1px solid #bfdbfe; background:#eff6ff; color:#1d4ed8; border-radius:999px; padding:6px 10px; font-size:14px; font-weight:800; }
        .dates { margin-top:12px; font-size:14px; line-height:1.7; color:#475569; }
        .grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; margin:22px 0 14px; }
        .box { border:1px solid #e5e7eb; border-radius:14px; padding:14px 16px; background:#fff; }
        .label { display:block; margin-bottom:7px; font-size:12px; font-weight:800; color:#64748b; text-transform:uppercase; }
        .value { font-size:17px; font-weight:700; color:#111827; }
        .subvalue { margin-top:4px; font-size:14px; color:#64748b; }
        .section-title { margin:24px 0 10px; font-size:15px; font-weight:900; color:#0f172a; text-transform:uppercase; }
        table { width:100%; border-collapse:separate; border-spacing:0; overflow:hidden; border:1px solid #e5e7eb; border-radius:14px; }
        th, td { padding:11px; font-size:13px; vertical-align:top; border-bottom:1px solid #e5e7eb; }
        th { background:#f8fafc; text-align:left; color:#475569; font-size:11px; text-transform:uppercase; }
        tr:last-child td { border-bottom:0; }
        small { color:#64748b; }
        .platform-note { margin-top:16px; border:1px solid #bfdbfe; border-radius:14px; background:#eff6ff; color:#1e3a8a; padding:12px 14px; font-size:13px; line-height:1.5; }
        .footer { display:grid; grid-template-columns:1fr 220px 180px; margin-top:44px; align-items:end; gap:22px; }
        .signature { border-top:1px solid #94a3b8; width:100%; padding-top:10px; }
        .signature.digital { border-top:0; padding-top:0; }
        .signature .name { font-weight:800; }
        .signature .specialty { color:#475569; font-size:14px; margin-top:3px; }
        .signature small { display:block; margin-top:4px; }
        .seal { border:1.5px dashed #94a3b8; border-radius:14px; min-height:94px; padding:12px; font-size:13px; text-align:center; display:flex; align-items:center; justify-content:center; color:#94a3b8; }
        .seal img { max-width:100%; max-height:76px; object-fit:contain; }
        .qr { border:1px solid #dbeafe; border-radius:14px; padding:10px; width:180px; overflow-wrap:anywhere; font-size:10px; text-align:center; background:#f8fbff; }
        .qr img { width:132px; height:132px; display:block; margin:0 auto 7px; }
        .auth-band { margin-top:22px; padding-top:10px; border-top:1px solid #e5e7eb; color:#64748b; font-size:10px; overflow-wrap:anywhere; }
        @media print { body { background:#fff; } .toolbar { display:none; } .page { margin:0; border:0; box-shadow:none; max-width:none; padding:0; } }
      </style>
    </head>
    <body>
      <div class="toolbar"><button onclick="window.print()">Imprimir</button></div>
      <main class="page">
      <div class="header">
        <div>
          <img class="brand-logo" src="${escapeHtml(logoUrl)}" alt="Logo de receta">
          <div class="doctor-heading">${escapeHtml(doctorName || 'Medico tratante')}</div>
          <div class="doctor-meta">${escapeHtml(specialties || 'Especialidad no especificada')} · Exq: ${escapeHtml(prescription.license_number || prescription.doctor_license_number || '')}</div>
          ${doctorPhone ? `<div class="doctor-meta">${escapeHtml(doctorPhone)}</div>` : ''}
        </div>
        <div class="title">
          <h1>Receta médica</h1>
          <span class="code">${escapeHtml(prescription.validation_code || '')}</span>
          <div class="dates">
            Emision: ${formatDateTime(issuedAt)}<br>
            Vencimiento: ${escapeHtml(expiryDate)}<br>
            Codigo de validacion: ${escapeHtml(validationToken)}
          </div>
        </div>
      </div>
      <div class="grid">
        <div class="box"><span class="label">Paciente</span><div class="value">${escapeHtml(patientName || 'No especificado')}</div><div class="subvalue">${escapeHtml(patientMeta)}</div></div>
        <div class="box"><span class="label">Centro de salud</span><div class="value">${escapeHtml(prescription.health_center_name || 'Centro médico')}</div><div class="subvalue">${escapeHtml(centerMeta)}</div></div>
      </div>
      <div class="section-title">Medicamentos indicados</div>
      <table>
        <thead><tr><th>#</th><th>Medicamento</th><th>Como tomarlo</th><th>Cantidad</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="platform-note">Esta receta fue emitida en la plataforma SaludClick. Puedes verificar su autenticidad con el codigo de validacion o el codigo QR incluido en este documento.</div>
      <div class="footer">
        <div>
          <div class="signature${digitalSealEnabled ? ' digital' : ''}">
            <div class="name">${escapeHtml(prescription.doctor_signature || doctorName)}</div>
            <div class="specialty">${escapeHtml(specialties || 'Especialidad no especificada')}</div>
            <small>${escapeHtml(doctorCredentials || 'Credenciales no especificadas')}</small>
            ${digitalSealEnabled ? `<small>Firmada electronicamente ${formatDateTime(issuedAt)}</small>` : ''}
          </div>
        </div>
        <div class="seal">${digitalSealEnabled ? `<img src="${escapeHtml(prescription.prescription_seal)}" alt="Sello digital del médico">` : ''}</div>
        <div class="qr"><img src="${qrDataUrl}" alt="QR de verificacion"><strong>Verificacion</strong><br>${escapeHtml(verifyUrl)}</div>
      </div>
      <div class="auth-band">Documento emitido electronicamente por SaludClick · Hash SHA256: ${escapeHtml(documentHash)} · UUID: ${escapeHtml(prescription.id || '')} · Fecha: ${formatDateTime(issuedAt)} · Firma digital: SaludClick</div>
      </main>
    </body>
  </html>`;
}

function renderPrescriptionPdf(prescription: any, verifyUrl: string, qrDataUrl: string) {
  const doc = new PDFDocument({ size: 'LETTER', margin: 42, bufferPages: false });
  const medications = typeof prescription.medications === 'string' ? JSON.parse(prescription.medications) : prescription.medications;
  const specialties = Array.isArray(prescription.specialties)
    ? prescription.specialties.filter(Boolean).join(', ')
    : String(prescription.specialties || '').replace(/[{}"]/g, '').split(',').filter(Boolean).join(', ');
  const doctorName = `${prescription.doctor_first_name || ''} ${prescription.doctor_last_name || ''}`.trim();
  const patientName = `${prescription.patient_first_name || ''} ${prescription.patient_last_name || ''}`.trim();
  const issuedAt = prescription.issued_at || prescription.created_at;
  const expiryDate = prescription.expiry_date ? formatDateTime(prescription.expiry_date, false) : 'No especificada';
  const digitalSealEnabled = Boolean(prescription.digital_seal_enabled && prescription.prescription_seal);
  const sealPath = digitalSealEnabled ? resolveLocalUploadPath(prescription.prescription_seal) : null;
  const validationToken = String(prescription.validation_code || '').replace(/^RX-/, '');
  const documentHash = prescription.document_hash || computePrescriptionDocumentHash(prescription);
  const patientMeta = prescription.patient_date_of_birth ? `Edad: ${calculateAge(prescription.patient_date_of_birth)} años` : '';
  const doctorPhone = prescription.doctor_phone ? `Tel: ${prescription.doctor_phone}` : '';
  const centerMeta = [
    prescription.health_center_address || '',
    prescription.health_center_phone ? `Tel: ${prescription.health_center_phone}` : '',
  ].filter(Boolean).join(' · ');
  const doctorCredentials = [
    prescription.license_number || prescription.doctor_license_number ? `Exequatur ${prescription.license_number || prescription.doctor_license_number}` : '',
    prescription.cmd_number ? `CMD ${prescription.cmd_number}` : '',
  ].filter(Boolean).join(' · ');
  const qrBuffer = Buffer.from(qrDataUrl.split(',')[1] || '', 'base64');
  const logoPath = resolveLocalUploadPath(prescription.prescription_logo);

  doc.rect(0, 0, doc.page.width, doc.page.height).fill('#ffffff');
  doc.fillColor('#111827');

  doc.fontSize(28).font('Helvetica-Bold').text('Receta médica', 330, 42, { align: 'right', width: 240 });
  doc.roundedRect(405, 78, 165, 24, 12).fill('#eff6ff');
  doc.fillColor('#1d4ed8').fontSize(10).font('Helvetica-Bold').text(String(prescription.validation_code || ''), 417, 86, { width: 142, align: 'center' });
  doc.fillColor('#475569').fontSize(9).font('Helvetica').text(`Emision: ${formatDateTime(issuedAt)}`, 390, 112, { width: 180, align: 'right' });
  doc.text(`Vencimiento: ${expiryDate}`, 390, 126, { width: 180, align: 'right' });
  doc.text(`Validacion: ${validationToken}`, 390, 140, { width: 180, align: 'right' });

  if (logoPath) {
    doc.image(logoPath, 42, 44, { fit: [150, 42], valign: 'center' });
  } else {
    doc.fillColor('#0f172a').fontSize(20).font('Helvetica-Bold').text('SaludClick', 42, 48);
  }
  doc.fillColor('#111827').fontSize(18).font('Helvetica-Bold').text(doctorName || 'Medico tratante', 42, 90, { width: 300 });
  doc.fillColor('#64748b').fontSize(10).font('Helvetica').text(`${specialties || 'Especialidad no especificada'} · Exq: ${prescription.license_number || prescription.doctor_license_number || ''}`, 42, 114, { width: 300 });
  if (doctorPhone) doc.text(doctorPhone, 42, 128, { width: 300 });
  doc.moveTo(42, 154).lineTo(570, 154).strokeColor('#dbe4f0').stroke();

  const boxY = 176;
  drawInfoBox(doc, 42, boxY, 250, 'Paciente', patientName || 'No especificado', patientMeta);
  drawInfoBox(doc, 310, boxY, 260, 'Centro de salud', prescription.health_center_name || 'Centro médico', centerMeta);

  doc.fillColor('#0f172a').fontSize(12).font('Helvetica-Bold').text('MEDICAMENTOS INDICADOS', 42, boxY + 84);
  let y = boxY + 104;
  const columns = [
    { label: '#', x: 42, w: 22 },
    { label: 'Medicamento', x: 66, w: 170 },
    { label: 'Como tomarlo', x: 238, w: 190 },
    { label: 'Cantidad', x: 430, w: 140 },
  ];
  doc.roundedRect(42, y, 528, 24, 8).fill('#f8fafc');
  doc.fillColor('#475569').fontSize(8).font('Helvetica-Bold');
  columns.forEach((column) => doc.text(column.label, column.x + 4, y + 8, { width: column.w - 8 }));
  y += 26;

  (Array.isArray(medications) ? medications : []).forEach((item: any, index: number) => {
    const rowHeight = 38;
    if (y + rowHeight > 620) {
      doc.addPage();
      y = 42;
    }
    doc.roundedRect(42, y, 528, rowHeight, 6).strokeColor('#e5e7eb').stroke();
    doc.fillColor('#111827').fontSize(9).font('Helvetica');
    const values = [
      String(index + 1),
      `${item.name || item.medication || ''}${item.presentation ? `\n${item.presentation}` : ''}`,
      formatSimpleDosage(item),
      item.quantity ? `Dispensar: ${item.quantity}` : '',
    ];
    columns.forEach((column, columnIndex) => doc.text(String(values[columnIndex] || ''), column.x + 4, y + 8, { width: column.w - 8, height: rowHeight - 12 }));
    y += rowHeight + 4;
  });

  y += 8;
  doc.roundedRect(42, y, 528, 42, 10).fillAndStroke('#eff6ff', '#bfdbfe');
  doc.fillColor('#1e3a8a').fontSize(9).font('Helvetica').text(
    'Esta receta fue emitida en la plataforma SaludClick. Puedes verificar su autenticidad con el codigo de validacion o el codigo QR incluido en este documento.',
    56,
    y + 10,
    { width: 500 }
  );
  y += 62;
  if (y > 610) {
    doc.addPage();
    y = 80;
  }

  if (!digitalSealEnabled) {
    doc.moveTo(42, y + 50).lineTo(255, y + 50).strokeColor('#94a3b8').stroke();
    doc.fillColor('#111827').fontSize(12).font('Helvetica-Bold').text(prescription.doctor_signature || doctorName, 42, y + 60, { width: 213 });
    doc.fillColor('#475569').fontSize(10).font('Helvetica').text(specialties || 'Especialidad no especificada', 42, y + 78, { width: 213 });
    doc.fillColor('#64748b').fontSize(8).text(doctorCredentials || 'Credenciales no especificadas', 42, y + 94, { width: 213 });
  } else {
    doc.fillColor('#111827').fontSize(12).font('Helvetica-Bold').text(prescription.doctor_signature || doctorName, 42, y + 12, { width: 213 });
    doc.fillColor('#475569').fontSize(10).font('Helvetica').text(specialties || 'Especialidad no especificada', 42, y + 30, { width: 213 });
    doc.fillColor('#64748b').fontSize(8).text(doctorCredentials || 'Credenciales no especificadas', 42, y + 46, { width: 213 });
    doc.fillColor('#64748b').fontSize(8).text(`Firmada electronicamente ${formatDateTime(issuedAt)}`, 42, y + 59, { width: 213 });
  }

  doc.roundedRect(285, y, 140, 96, 12).dash(4, { space: 3 }).strokeColor('#94a3b8').stroke().undash();
  if (sealPath) {
    doc.image(sealPath, 298, y + 12, { fit: [114, 70], align: 'center', valign: 'center' });
  }

  doc.roundedRect(448, y, 122, 122, 12).strokeColor('#dbeafe').stroke();
  if (qrBuffer.length) doc.image(qrBuffer, 472, y + 10, { width: 74, height: 74 });
  doc.fillColor('#111827').fontSize(9).font('Helvetica-Bold').text('Verificacion', 460, y + 88, { width: 98, align: 'center' });
  doc.fillColor('#64748b').fontSize(7).font('Helvetica').text(verifyUrl, 456, y + 101, { width: 106, align: 'center' });
  doc.fillColor('#64748b').fontSize(7).font('Helvetica').text(
    `Documento emitido electronicamente por SaludClick · Hash SHA256: ${documentHash} · UUID: ${prescription.id || ''} · Fecha: ${formatDateTime(issuedAt)} · Firma digital: SaludClick`,
    42,
    742,
    { width: 528, align: 'center' }
  );

  return doc;
}

function drawInfoBox(doc: PDFKit.PDFDocument, x: number, y: number, width: number, label: string, value: string, subvalue = '') {
  doc.roundedRect(x, y, width, subvalue ? 68 : 58, 12).strokeColor('#e5e7eb').stroke();
  doc.fillColor('#64748b').fontSize(8).font('Helvetica-Bold').text(label.toUpperCase(), x + 12, y + 12, { width: width - 24 });
  doc.fillColor('#111827').fontSize(12).font('Helvetica-Bold').text(String(value || ''), x + 12, y + 28, { width: width - 24 });
  if (subvalue) {
    doc.fillColor('#64748b').fontSize(9).font('Helvetica').text(subvalue, x + 12, y + 45, { width: width - 24 });
  }
}

function formatDateTime(value: string | Date, includeTime = true) {
  if (!value) return 'No disponible';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No disponible';
  return date.toLocaleString('es-DO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...(includeTime ? { hour: '2-digit', minute: '2-digit', hour12: true } : {}),
  });
}

function calculateAge(value: string | Date) {
  const birth = new Date(value);
  if (Number.isNaN(birth.getTime())) return 'No disponible';
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDelta = today.getMonth() - birth.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birth.getDate())) age -= 1;
  return String(age);
}

function escapeHtml(value: string) {
  return String(value || '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }[char] || char));
}

function formatSimpleDosage(item: any) {
  const dosage = String(item?.dosage || '').trim();
  const presentation = String(item?.presentation || '').trim();
  const frequency = String(item?.frequency || '').trim();
  const duration = String(item?.duration || '').trim();
  const doseText = extractDoseStrength(dosage) || extractDoseStrength(presentation) || dosage;

  return [doseText, frequency, duration].filter(Boolean).join(' · ');
}

function extractDoseStrength(value: string) {
  const match = String(value || '').match(/\b\d+(?:[.,]\d+)?\s*(?:mcg|mg|g|ml|mL|ui|UI|iu|IU|%)\b/);
  return match ? match[0].replace(',', '.') : '';
}

function getPublicPrescriptionVerifyUrl(req: Request, validationCode?: string) {
  const configuredBaseUrl =
    process.env.PUBLIC_PRESCRIPTION_VERIFY_BASE_URL ||
    process.env.PUBLIC_APP_URL ||
    process.env.FRONTEND_URL ||
    process.env.PUBLIC_API_URL ||
    process.env.API_PUBLIC_URL ||
    '';
  const forwardedProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  const forwardedHost = String(req.headers['x-forwarded-host'] || '').split(',')[0].trim();
  const protocol = forwardedProto || req.protocol;
  const host = forwardedHost || req.get('host');
  const baseUrl = (configuredBaseUrl || `${protocol}://${host}`).replace(/\/+$/, '');
  return `${baseUrl}/prescriptions/verify/${encodeURIComponent(validationCode || '')}`;
}

function resolveLocalUploadPath(value?: string | null) {
  if (!value) return null;
  const marker = value.includes('/api/files/')
    ? '/api/files/'
    : '/uploads/';
  const markerIndex = value.indexOf(marker);
  if (markerIndex < 0) return null;

  const relativeUploadPath = value
    .slice(markerIndex + marker.length)
    .split(/[?#]/)[0]
    .replace(/\\/g, '/');
  const resolved = path.resolve(__dirname, '../../uploads', relativeUploadPath);
  const uploadsRoot = path.resolve(__dirname, '../../uploads');
  const isInsideUploads = resolved === uploadsRoot || resolved.startsWith(`${uploadsRoot}${path.sep}`);

  if (!isInsideUploads || !fs.existsSync(resolved)) return null;
  return resolved;
}

async function resolveDoctorHealthCenter(doctorId: string, requestedId?: string, fallbackId?: string | null) {
  const requested = requestedId && isUuid(requestedId) ? requestedId : null;
  const targetId = requested || fallbackId || null;
  if (!targetId) return null;

  const linked = await queryOne(
    `SELECT health_center_id
     FROM doctor_health_centers
     WHERE doctor_id = $1 AND health_center_id = $2`,
    [doctorId, targetId]
  );
  return linked?.health_center_id || null;
}
