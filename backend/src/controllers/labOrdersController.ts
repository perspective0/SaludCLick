import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query, queryMany, queryOne } from '../db';
import { doctorCanAccessPatient } from '../repositories/clinicalAccessRepository';
import { isUuid } from '../validators/commonValidators';
import { validateLabOrderInput } from '../validators/clinicalValidators';
import { created, fail, ok } from '../utils/apiResponse';
import { auditClinicalAction } from '../utils/audit';
import { notifyUser } from './notificationController';
import QRCode from 'qrcode';

function generateOrderCode(orderType = 'laboratory') {
  const prefix = ['referral', 'disability', 'certificate', 'medical_constancy'].includes(orderType) ? 'DOC' : 'LAB';
  return `${prefix}-${uuidv4().replace(/-/g, '').slice(0, 16).toUpperCase()}`;
}

function maskPatientName(firstName?: string, lastName?: string) {
  const first = firstName ? `${firstName[0]}***` : 'P***';
  const last = lastName ? `${lastName[0]}***` : '';
  return `${first} ${last}`.trim();
}

const allowedOrderTypes = ['laboratory', 'imaging', 'procedure', 'referral', 'disability', 'certificate', 'medical_constancy'];

const defaultStudyCatalog = [
  { name: 'Hemograma completo', type: 'laboratory', area: 'Hematologia', preparation: 'No requiere preparacion especial.' },
  { name: 'Glicemia en ayunas', type: 'laboratory', area: 'Quimica sanguinea', preparation: 'Ayuno de 8 horas.' },
  { name: 'Perfil lipidico', type: 'laboratory', area: 'Quimica sanguinea', preparation: 'Ayuno de 12 horas.' },
  { name: 'Perfil hepatico', type: 'laboratory', area: 'Quimica sanguinea', preparation: 'Ayuno de 8 horas si el laboratorio lo solicita.' },
  { name: 'Perfil renal', type: 'laboratory', area: 'Química sanguínea', preparation: 'No requiere preparación especial salvo indicación médica.' },
  { name: 'Perfil tiroideo', type: 'laboratory', area: 'Endocrinología', preparation: 'Informar medicamentos tiroideos en uso.' },
  { name: 'Uroanalisis', type: 'laboratory', area: 'Orina', preparation: 'Preferible primera orina de la manana.' },
  { name: 'Coprologico', type: 'laboratory', area: 'Heces', preparation: 'Recolectar muestra en recipiente esteril.' },
  { name: 'Radiografia de torax PA', type: 'imaging', area: 'Torax', preparation: 'Retirar objetos metalicos del area.' },
  { name: 'Sonografia abdominal', type: 'imaging', area: 'Abdomen', preparation: 'Ayuno de 6 a 8 horas.' },
  { name: 'Tomografia de abdomen', type: 'imaging', area: 'Abdomen', preparation: 'Confirmar si requiere contraste y ayuno.' },
  { name: 'Resonancia magnetica lumbar', type: 'imaging', area: 'Columna lumbar', preparation: 'Retirar objetos metalicos e informar implantes.' },
];

async function ensureStudyCatalogTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS study_catalog (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL UNIQUE,
      study_type VARCHAR(30) NOT NULL DEFAULT 'laboratory',
      area VARCHAR(120),
      preparation TEXT,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CHECK (study_type IN ('laboratory', 'imaging', 'procedure'))
    )
  `);
  await query('CREATE INDEX IF NOT EXISTS idx_study_catalog_active ON study_catalog(is_active)');
  await query('CREATE INDEX IF NOT EXISTS idx_study_catalog_type ON study_catalog(study_type)');

  for (const item of defaultStudyCatalog) {
    await query(
      `INSERT INTO study_catalog (name, study_type, area, preparation)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (name) DO NOTHING`,
      [item.name, item.type, item.area, item.preparation]
    ).catch(() => null);
  }
}

async function ensureLabOrdersTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS lab_orders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
      medical_record_id UUID REFERENCES medical_records(id) ON DELETE SET NULL,
      laboratory_id UUID REFERENCES laboratories(id) ON DELETE SET NULL,
      health_center_id UUID REFERENCES health_centers(id) ON DELETE SET NULL,
      order_type VARCHAR(30) NOT NULL DEFAULT 'laboratory',
      diagnosis TEXT,
      icd10_code VARCHAR(20),
      priority VARCHAR(20) NOT NULL DEFAULT 'normal',
      studies JSONB NOT NULL,
      notes TEXT,
      status VARCHAR(30) NOT NULL DEFAULT 'active',
      validation_code VARCHAR(64) UNIQUE NOT NULL,
      issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      cancelled_at TIMESTAMP,
      cancelled_reason TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CHECK (order_type IN ('laboratory', 'imaging', 'procedure', 'referral', 'disability', 'certificate', 'medical_constancy')),
      CHECK (priority IN ('routine', 'normal', 'urgent'))
    )
  `);
  await query('CREATE INDEX IF NOT EXISTS idx_lab_orders_patient ON lab_orders(patient_id)');
  await query('CREATE INDEX IF NOT EXISTS idx_lab_orders_doctor ON lab_orders(doctor_id)');
  await query('CREATE INDEX IF NOT EXISTS idx_lab_orders_code ON lab_orders(validation_code)');
  await query(`
    DO $$
    DECLARE constraint_name text;
    BEGIN
      SELECT conname INTO constraint_name
      FROM pg_constraint
      WHERE conrelid = 'lab_orders'::regclass
        AND contype = 'c'
        AND pg_get_constraintdef(oid) LIKE '%order_type%';

      IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE lab_orders DROP CONSTRAINT %I', constraint_name);
      END IF;

      ALTER TABLE lab_orders
      ADD CONSTRAINT lab_orders_order_type_check
      CHECK (order_type IN ('laboratory', 'imaging', 'procedure', 'referral', 'disability', 'certificate', 'medical_constancy'));
    END $$;
  `).catch(() => null);
  await query('ALTER TABLE doctors ADD COLUMN IF NOT EXISTS cmd_number VARCHAR(80)').catch(() => null);
  await query('ALTER TABLE doctors ADD COLUMN IF NOT EXISTS prescription_logo TEXT').catch(() => null);
  await query('ALTER TABLE doctors ADD COLUMN IF NOT EXISTS prescription_seal TEXT').catch(() => null);
  await query('ALTER TABLE lab_orders ADD COLUMN IF NOT EXISTS digital_seal_enabled BOOLEAN DEFAULT false').catch(() => null);
  await query('ALTER TABLE lab_orders ADD COLUMN IF NOT EXISTS icd10_code VARCHAR(20)').catch(() => null);
  await query('ALTER TABLE medical_records ADD COLUMN IF NOT EXISTS icd10_code VARCHAR(20)').catch(() => null);
  await query('ALTER TABLE patients ADD COLUMN IF NOT EXISTS document_number VARCHAR(30)').catch(() => null);
  await query('ALTER TABLE patients ADD COLUMN IF NOT EXISTS has_insurance BOOLEAN DEFAULT false').catch(() => null);
  await query('ALTER TABLE patients ADD COLUMN IF NOT EXISTS insurance_provider VARCHAR(255)').catch(() => null);
  await query('ALTER TABLE patients ADD COLUMN IF NOT EXISTS insurance_number VARCHAR(255)').catch(() => null);
  await ensureStudyCatalogTable();
  await ensureDocumentTemplatesTable();
}

async function ensureDocumentTemplatesTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS doctor_document_templates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
      document_type VARCHAR(40) NOT NULL,
      title VARCHAR(255) NOT NULL,
      category VARCHAR(255),
      content TEXT NOT NULL,
      usage_count INTEGER DEFAULT 0,
      last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (doctor_id, document_type, title, content)
    )
  `);
  await query('CREATE INDEX IF NOT EXISTS idx_doctor_document_templates_doctor ON doctor_document_templates(doctor_id)');
  await query('CREATE INDEX IF NOT EXISTS idx_doctor_document_templates_type ON doctor_document_templates(document_type)');
}

function normalizeStudies(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item: any) => ({
      name: String(item?.name || '').trim(),
      category: String(item?.category || '').trim(),
      instructions: String(item?.instructions || '').trim(),
    }))
    .filter((item) => item.name)
    .slice(0, 80);
}

export const createLabOrder = async (req: Request, res: Response) => {
  try {
    await ensureLabOrdersTable();
    const doctorId = req.user?.id;
    if (!doctorId || req.user?.role !== 'doctor') return fail(res, 403, 'Only doctors can create lab orders');

    const { patientId, medicalRecordId, laboratoryId, healthCenterId, orderType, diagnosis, icd10Code, priority, studies, notes, digitalSealEnabled } = req.body;
    const inputError = validateLabOrderInput({ patientId, medicalRecordId, laboratoryId, healthCenterId, diagnosis, icd10Code, notes, studies });
    if (inputError) return fail(res, 400, inputError);

    const normalizedStudies = normalizeStudies(studies);
    if (!normalizedStudies.length) return fail(res, 400, 'Agrega al menos una analítica o estudio');

    const allowed = await doctorCanAccessPatient(doctorId, patientId);
    if (!allowed) return fail(res, 403, 'Unauthorized patient access');

    if (medicalRecordId) {
      const record = await queryOne(
        'SELECT id FROM medical_records WHERE id = $1 AND patient_id = $2 AND doctor_id = $3',
        [medicalRecordId, patientId, doctorId]
      );
      if (!record) return fail(res, 404, 'Medical record not found');
    }

    const selectedType = allowedOrderTypes.includes(orderType) ? orderType : 'laboratory';
    const selectedPriority = ['routine', 'normal', 'urgent'].includes(priority) ? priority : 'normal';
    const validationCode = generateOrderCode(selectedType);
    const id = uuidv4();

    const row = await queryOne(
      `INSERT INTO lab_orders
       (id, patient_id, doctor_id, medical_record_id, laboratory_id, health_center_id, order_type, diagnosis, icd10_code, priority, studies, notes, validation_code, digital_seal_enabled)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING *`,
      [
        id,
        patientId,
        doctorId,
        medicalRecordId || null,
        laboratoryId || null,
        healthCenterId || null,
        selectedType,
        diagnosis || null,
        icd10Code || null,
        selectedPriority,
        JSON.stringify(normalizedStudies),
        notes || null,
        validationCode,
        Boolean(digitalSealEnabled),
      ]
    );

    await auditClinicalAction(req, { action: 'create', entity: 'lab_orders', entityId: id, patientId, doctorId, newData: row });
    await notifyUser(patientId, {
      title: 'Nueva orden de estudios',
      body: 'Tu médico emitió una orden de analíticas o estudios.',
      url: `/patient/prescriptions`,
      type: 'lab_order',
      entityType: 'lab_order',
      entityId: id,
      priority: selectedPriority === 'urgent' ? 'high' : 'normal',
    }).catch(() => null);

    return created(res, row, 'Orden creada exitosamente');
  } catch (error: any) {
    console.error('Create lab order error:', error);
    return fail(res, 500, 'Error creating lab order', error);
  }
};

export const getPatientLabOrders = async (req: Request, res: Response) => {
  try {
    await ensureLabOrdersTable();
    const { patientId } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role;
    if (!isUuid(patientId)) return fail(res, 400, 'Invalid patientId');

    if (userRole === 'patient' && userId !== patientId) return fail(res, 403, 'Unauthorized');
    if (userRole === 'doctor') {
      const allowed = await doctorCanAccessPatient(userId!, patientId);
      if (!allowed) return fail(res, 403, 'Unauthorized patient access');
    }

    const rows = await queryMany(
      `SELECT lo.*, du.first_name AS doctor_first_name, du.last_name AS doctor_last_name,
              pu.first_name AS patient_first_name, pu.last_name AS patient_last_name,
              d.license_number, d.specialties, d.prescription_seal, l.name AS laboratory_name, hc.name AS health_center_name
       FROM lab_orders lo
       JOIN users du ON du.id = lo.doctor_id
       JOIN users pu ON pu.id = lo.patient_id
       JOIN doctors d ON d.id = lo.doctor_id
       LEFT JOIN laboratories l ON l.id = lo.laboratory_id
       LEFT JOIN health_centers hc ON hc.id = lo.health_center_id
       WHERE lo.patient_id = $1
       ORDER BY lo.created_at DESC`,
      [patientId]
    );
    return ok(res, rows);
  } catch (error: any) {
    console.error('Get lab orders error:', error);
    return fail(res, 500, 'Error fetching lab orders', error);
  }
};

export const getStudyCatalog = async (req: Request, res: Response) => {
  try {
    await ensureLabOrdersTable();
    const search = String(req.query.search || '').trim();
    const type = String(req.query.type || '').trim();
    const params: any[] = [];
    let sql = `
      SELECT id, name, study_type, area, preparation
      FROM study_catalog
      WHERE is_active = true
    `;

    if (['laboratory', 'imaging', 'procedure'].includes(type)) {
      params.push(type);
      sql += ` AND study_type = $${params.length}`;
    }

    if (search) {
      params.push(`%${search.toLowerCase()}%`);
      sql += ` AND (LOWER(name) LIKE $${params.length} OR LOWER(area) LIKE $${params.length})`;
    }

    sql += ' ORDER BY name LIMIT 30';
    const rows = await queryMany(sql, params);
    return ok(res, rows);
  } catch (error: any) {
    console.error('Get study catalog error:', error);
    return fail(res, 500, 'Error fetching study catalog', error);
  }
};

export const getDocumentTemplates = async (req: Request, res: Response) => {
  try {
    await ensureLabOrdersTable();
    const doctorId = req.user?.id;
    if (!doctorId || req.user?.role !== 'doctor') return fail(res, 403, 'Only doctors can view document templates');

    const type = String(req.query.type || '').trim();
    const params: any[] = [doctorId];
    let sql = `
      SELECT id, document_type, title, category, content, usage_count, last_used_at, created_at
      FROM doctor_document_templates
      WHERE doctor_id = $1
    `;
    if (type) {
      params.push(type);
      sql += ` AND document_type = $${params.length}`;
    }
    sql += ' ORDER BY usage_count DESC, last_used_at DESC, created_at DESC LIMIT 80';

    const rows = await queryMany(sql, params);
    return ok(res, rows);
  } catch (error: any) {
    console.error('Get document templates error:', error);
    return fail(res, 500, 'Error fetching document templates', error);
  }
};

export const saveDocumentTemplate = async (req: Request, res: Response) => {
  try {
    await ensureLabOrdersTable();
    const doctorId = req.user?.id;
    if (!doctorId || req.user?.role !== 'doctor') return fail(res, 403, 'Only doctors can save document templates');

    const documentType = String(req.body.documentType || req.body.type || '').trim();
    const title = String(req.body.title || '').trim();
    const category = String(req.body.category || '').trim();
    const content = String(req.body.content || '').trim();

    if (!['certificate', 'medical_constancy', 'referral', 'disability'].includes(documentType)) {
      return fail(res, 400, 'Invalid document type');
    }
    if (!title || !content) return fail(res, 400, 'Title and content are required');

    const row = await queryOne(
      `INSERT INTO doctor_document_templates (doctor_id, document_type, title, category, content, usage_count, last_used_at)
       VALUES ($1,$2,$3,$4,$5,1,NOW())
       ON CONFLICT (doctor_id, document_type, title, content)
       DO UPDATE SET category = EXCLUDED.category,
                     usage_count = doctor_document_templates.usage_count + 1,
                     last_used_at = NOW(),
                     updated_at = NOW()
       RETURNING id, document_type, title, category, content, usage_count, last_used_at, created_at`,
      [doctorId, documentType, title, category || null, content]
    );

    return ok(res, row, 'Texto frecuente guardado');
  } catch (error: any) {
    console.error('Save document template error:', error);
    return fail(res, 500, 'Error saving document template', error);
  }
};

export const verifyLabOrder = async (req: Request, res: Response) => {
  try {
    await ensureLabOrdersTable();
    const { code } = req.params;
    const order = await queryOne(
      `SELECT lo.*,
              du.first_name AS doctor_first_name, du.last_name AS doctor_last_name,
              pu.first_name AS patient_first_name, pu.last_name AS patient_last_name,
              d.license_number, d.specialties, d.cmd_number,
              hc.name AS health_center_name
       FROM lab_orders lo
       JOIN users du ON du.id = lo.doctor_id
       JOIN users pu ON pu.id = lo.patient_id
       JOIN doctors d ON d.id = lo.doctor_id
       LEFT JOIN health_centers hc ON hc.id = lo.health_center_id
       WHERE lo.validation_code = $1`,
      [code]
    );
    if (!order) return res.status(404).json({ success: false, message: 'Documento no encontrado' });

    const studies = typeof order.studies === 'string' ? JSON.parse(order.studies) : order.studies;
    const firstItem = Array.isArray(studies) ? studies[0] || {} : {};
    const valid = String(order.status || '').toLowerCase() === 'active';

    return res.json({
      success: true,
      data: {
        valid,
        status: order.status,
        statusLabel: getOrderStatus(order),
        documentType: order.order_type,
        documentTitle: getOrderTitle(order.order_type),
        documentName: firstItem.name || getOrderTitle(order.order_type),
        documentCategory: firstItem.category || '',
        doctor: `${order.doctor_first_name || ''} ${order.doctor_last_name || ''}`.trim(),
        licenseNumber: order.license_number,
        cmdNumber: order.cmd_number,
        specialties: order.specialties,
        healthCenter: order.health_center_name,
        patient: maskPatientName(order.patient_first_name, order.patient_last_name),
        issuedAt: order.issued_at || order.created_at,
        validationCode: order.validation_code,
      },
    });
  } catch (error) {
    console.error('Verify lab order error:', error);
    return res.status(500).json({ success: false, message: 'Error verificando documento' });
  }
};

export const cancelLabOrder = async (req: Request, res: Response) => {
  try {
    await ensureLabOrdersTable();
    const doctorId = req.user?.id;
    const { id } = req.params;
    if (!doctorId || req.user?.role !== 'doctor') return fail(res, 403, 'Only doctors can cancel lab orders');
    if (!isUuid(id)) return fail(res, 400, 'Invalid lab order id');

    const existing = await queryOne('SELECT * FROM lab_orders WHERE id = $1 AND doctor_id = $2', [id, doctorId]);
    if (!existing) return fail(res, 404, 'Orden no encontrada');
    if (existing.status === 'cancelled') return fail(res, 409, 'La orden ya fue anulada');

    const row = await queryOne(
      `UPDATE lab_orders
       SET status = 'cancelled', cancelled_at = NOW(), cancelled_reason = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [req.body.reason || null, id]
    );
    await auditClinicalAction(req, { action: 'cancel', entity: 'lab_orders', entityId: id, patientId: existing.patient_id, doctorId, oldData: existing, newData: row });
    return ok(res, row);
  } catch (error: any) {
    console.error('Cancel lab order error:', error);
    return fail(res, 500, 'Error cancelling lab order', error);
  }
};

export const getLabOrderPrint = async (req: Request, res: Response) => {
  try {
    await ensureLabOrdersTable();
    const { id } = req.params;
    if (!isUuid(id)) return res.status(400).send('Invalid lab order id');
    const order = await getLabOrderDetail(id);
    if (!order) return res.status(404).send('Orden no encontrada');

    const userId = req.user?.id;
    const userRole = req.user?.role;
    if (userRole === 'patient' && userId !== order.patient_id) return res.status(403).send('Unauthorized');
    if (userRole === 'doctor' && userId !== order.doctor_id) return res.status(403).send('Unauthorized');
    if (!['patient', 'doctor', 'admin'].includes(String(userRole))) return res.status(403).send('Unauthorized');

    await auditClinicalAction(req, { action: 'print', entity: 'lab_orders', entityId: id, patientId: order.patient_id, doctorId: order.doctor_id }).catch(() => null);
    const verifyUrl = getPublicLabOrderVerifyUrl(req, order.validation_code);
    const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
      margin: 1,
      width: 180,
      color: { dark: '#111827', light: '#ffffff' },
    });
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(renderLabOrderHtml(order, verifyUrl, qrDataUrl));
  } catch (error) {
    console.error('Print lab order error:', error);
    res.status(500).send('Error generating lab order');
  }
};

async function getLabOrderDetail(id: string) {
  return queryOne(
    `SELECT lo.*, du.first_name AS doctor_first_name, du.last_name AS doctor_last_name, du.phone AS doctor_phone,
            pu.first_name AS patient_first_name, pu.last_name AS patient_last_name,
            pp.date_of_birth AS patient_date_of_birth, pp.gender AS patient_gender, pp.document_number AS patient_document_number,
            pp.has_insurance AS patient_has_insurance, pp.insurance_provider AS patient_insurance_provider, pp.insurance_number AS patient_insurance_number,
            COALESCE(lo.icd10_code, mr.icd10_code) AS icd10_code,
            d.license_number, d.specialties, d.cmd_number, d.prescription_logo, d.prescription_seal,
            l.name AS laboratory_name, l.address AS laboratory_address, l.phone AS laboratory_phone,
            hc.name AS health_center_name, hc.address AS health_center_address, hc.phone AS health_center_phone
     FROM lab_orders lo
     JOIN users du ON du.id = lo.doctor_id
     JOIN users pu ON pu.id = lo.patient_id
     LEFT JOIN patients pp ON pp.id = lo.patient_id
     LEFT JOIN medical_records mr ON mr.id = lo.medical_record_id
     JOIN doctors d ON d.id = lo.doctor_id
     LEFT JOIN laboratories l ON l.id = lo.laboratory_id
     LEFT JOIN health_centers hc ON hc.id = lo.health_center_id
     WHERE lo.id = $1`,
    [id]
  );
}

function renderLabOrderHtml(order: any, verifyUrl: string, qrDataUrl: string) {
  const studies = typeof order.studies === 'string' ? JSON.parse(order.studies) : order.studies;
  const doctorName = `${order.doctor_first_name || ''} ${order.doctor_last_name || ''}`.trim();
  const patientName = `${order.patient_first_name || ''} ${order.patient_last_name || ''}`.trim();
  const specialties = Array.isArray(order.specialties)
    ? order.specialties.filter(Boolean).join(', ')
    : String(order.specialties || '').replace(/[{}"]/g, '').split(',').filter(Boolean).join(', ');
  const logoUrl = order.prescription_logo || '/saludclick.png';
  const digitalSealEnabled = Boolean(order.digital_seal_enabled && order.prescription_seal);
  const issuedAt = order.issued_at || order.created_at;
  const validationToken = String(order.validation_code || '').replace(/^(LAB|DOC)-/, '');
  const patientMeta = order.patient_date_of_birth ? `Edad: ${calculateAge(order.patient_date_of_birth)} años` : '';
  const doctorPhone = order.doctor_phone ? `Tel: ${order.doctor_phone}` : '';
  const centerMeta = [
    order.health_center_address || '',
    order.health_center_phone ? `Tel: ${order.health_center_phone}` : '',
  ].filter(Boolean).join(' · ');
  const laboratoryMeta = [
    order.laboratory_address || '',
    order.laboratory_phone ? `Tel: ${order.laboratory_phone}` : '',
  ].filter(Boolean).join(' · ');
  const doctorCredentials = [
    order.license_number ? `Exequatur ${order.license_number}` : '',
    order.cmd_number ? `CMD ${order.cmd_number}` : '',
  ].filter(Boolean).join(' · ');
  const isMedicalDocument = ['referral', 'disability', 'certificate', 'medical_constancy'].includes(String(order.order_type || ''));
  const title = getOrderTitle(order.order_type);
  const tableHeaders = getOrderTableHeaders(order.order_type);
  const rows = (Array.isArray(studies) ? studies : []).map((item: any, index: number) => `
    <tr>
      <td>${index + 1}</td>
      <td>${escapeHtml(item.name || '')}</td>
      <td>${escapeHtml(order.order_type === 'procedure' ? order.priority || 'normal' : item.category || order.priority || 'normal')}</td>
      <td>${escapeHtml(item.instructions || '')}</td>
    </tr>
  `).join('');
  const primaryDocument = Array.isArray(studies) ? studies[0] || {} : {};
  const documentLabel = getDocumentDetailLabel(order.order_type);
  const documentText = primaryDocument?.instructions || order.notes || '';

  return `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>${escapeHtml(title)} ${escapeHtml(order.validation_code || '')}</title>
      <style>
        * { box-sizing:border-box; }
        body { font-family: Arial, sans-serif; color:#111827; margin:0; background:#f3f6fb; }
        .toolbar { max-width:900px; margin:12px auto 0; display:flex; justify-content:flex-end; }
        button { border:0; border-radius:10px; background:#2563eb; color:#fff; padding:10px 16px; font-weight:700; cursor:pointer; }
        .page { max-width:900px; min-height:1160px; margin:14px auto; background:#fff; padding:26px; border:1px solid #e5e7eb; box-shadow:0 12px 36px rgba(15,23,42,.08); }
        .header { display:grid; grid-template-columns:1fr auto; gap:22px; align-items:start; border-bottom:2px solid #dbe4f0; padding-bottom:13px; }
        .brand-logo { width:148px; max-height:54px; height:auto; display:block; margin-bottom:8px; object-fit:contain; object-position:left center; }
        .doctor-heading { font-size:21px; font-weight:900; color:#0f172a; line-height:1.15; }
        .doctor-meta { margin-top:3px; font-size:12px; color:#64748b; }
        .title { text-align:right; }
        h1 { margin:0 0 8px; font-size:24px; }
        .code { display:inline-block; border:1px solid #bfdbfe; background:#eff6ff; color:#1d4ed8; border-radius:999px; padding:5px 9px; font-size:12px; font-weight:800; }
        .dates { margin-top:8px; font-size:12px; line-height:1.5; color:#475569; }
        .grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin:16px 0 12px; }
        .box { border:1px solid #e5e7eb; border-radius:10px; padding:10px 12px; }
        .label { display:block; margin-bottom:5px; font-size:10px; font-weight:800; color:#64748b; text-transform:uppercase; }
        .value { font-size:14px; font-weight:700; }
        .subvalue { margin-top:3px; color:#64748b; font-size:11px; }
        .platform-note { margin-top:12px; border:1px solid #bfdbfe; border-radius:10px; background:#eff6ff; color:#1e3a8a; padding:9px 11px; font-size:11px; line-height:1.35; }
        .document-body { margin-top:14px; border:1px solid #dbe4f0; border-radius:12px; padding:18px 20px; min-height:230px; }
        .document-body.medical { border:0; border-radius:0; padding:20px 18px 8px; min-height:410px; }
        .document-kicker { text-align:center; font-size:11px; font-weight:800; letter-spacing:0; color:#64748b; text-transform:uppercase; }
        .document-main-title { margin:8px auto 24px; width:fit-content; border-bottom:1px solid #111827; padding-bottom:3px; text-align:center; font-size:17px; font-weight:900; color:#0f172a; text-transform:uppercase; }
        .formal-line { margin:0 0 16px; color:#111827; font-size:13px; line-height:1.8; text-align:justify; }
        .document-title { font-size:16px; font-weight:900; color:#0f172a; margin-bottom:5px; }
        .document-meta { color:#64748b; font-size:12px; margin-bottom:12px; }
        .document-text { white-space:pre-wrap; color:#111827; font-size:13px; line-height:1.55; }
        table { width:100%; border-collapse:separate; border-spacing:0; border:1px solid #e5e7eb; border-radius:14px; overflow:hidden; }
        th, td { padding:9px; font-size:12px; vertical-align:top; border-bottom:1px solid #e5e7eb; }
        th { background:#f8fafc; text-align:left; color:#475569; font-size:10px; text-transform:uppercase; }
        tr:last-child td { border-bottom:0; }
        .footer { display:grid; grid-template-columns:1fr 170px 126px; margin-top:28px; align-items:end; gap:16px; }
        .signature { border-top:1px solid #94a3b8; padding-top:8px; }
        .signature.digital { border-top:0; padding-top:0; }
        .signature small { display:block; margin-top:3px; color:#64748b; font-size:11px; }
        .seal { border:1.5px dashed #94a3b8; border-radius:10px; min-height:76px; padding:9px; display:flex; align-items:center; justify-content:center; color:#94a3b8; text-align:center; }
        .seal img { max-width:100%; max-height:60px; object-fit:contain; }
        .qr { border:1px solid #dbeafe; border-radius:10px; padding:8px; width:126px; overflow-wrap:anywhere; font-size:8px; text-align:center; background:#f8fbff; }
        .qr img { width:82px; height:82px; display:block; margin:0 auto 5px; }
        .auth-band { margin-top:14px; padding-top:8px; border-top:1px solid #e5e7eb; color:#64748b; font-size:8px; overflow-wrap:anywhere; }
        @media print { @page { size: letter; margin: 10mm; } body { background:#fff; } .toolbar { display:none; } .page { margin:0; border:0; box-shadow:none; max-width:none; min-height:auto; padding:0; } }
      </style>
    </head>
    <body>
      <div class="toolbar"><button onclick="window.print()">Imprimir</button></div>
      <main class="page">
        <div class="header">
          <div>
            <img class="brand-logo" src="${escapeHtml(logoUrl)}" alt="Logo de la orden">
            <div class="doctor-heading">${escapeHtml(doctorName || 'Medico tratante')}</div>
            <div class="doctor-meta">${escapeHtml(specialties || 'Especialidad no especificada')} · Exq: ${escapeHtml(order.license_number || '')}</div>
            ${doctorPhone ? `<div class="doctor-meta">${escapeHtml(doctorPhone)}</div>` : ''}
          </div>
          <div class="title">
            <h1>${escapeHtml(title)}</h1>
            <span class="code">${escapeHtml(validationToken)}</span>
            <div class="dates">
              Emision: ${formatDateTime(issuedAt)}<br>
              Codigo de validacion
            </div>
          </div>
        </div>
        <div class="grid">
          <div class="box"><span class="label">Paciente</span><div class="value">${escapeHtml(patientName)}</div><div class="subvalue">${escapeHtml(patientMeta)}</div></div>
          <div class="box"><span class="label">Centro de salud</span><div class="value">${escapeHtml(order.health_center_name || 'SaludClick')}</div><div class="subvalue">${escapeHtml(centerMeta)}</div></div>
          <div class="box"><span class="label">Diagnostico</span><div class="value">${escapeHtml(order.diagnosis || 'No especificado')}</div><div class="subvalue">CIE-10: ${escapeHtml(order.icd10_code || 'No especificado')}</div></div>
          ${isMedicalDocument && primaryDocument?.category ? `<div class="box"><span class="label">${escapeHtml(documentLabel)}</span><div class="value">${escapeHtml(primaryDocument.category)}</div></div>` : !isMedicalDocument ? `<div class="box"><span class="label">Laboratorio sugerido</span><div class="value">${escapeHtml(order.laboratory_name || 'Libre eleccion')}</div><div class="subvalue">${escapeHtml(laboratoryMeta)}</div></div>` : ''}
        </div>
        ${isMedicalDocument ? `
        <section class="document-body medical">
          <div class="document-kicker">${escapeHtml(order.health_center_name || 'SaludClick')}</div>
          <div class="document-main-title">${escapeHtml(primaryDocument?.name || title)}</div>
          <p class="formal-line">Yo, ${escapeHtml(doctorName || 'medico tratante')}, provisto del exequatur ${escapeHtml(order.license_number || 'no especificado')}, certifico que he evaluado al paciente ${escapeHtml(patientName || 'no especificado')}${patientMeta ? `, ${escapeHtml(patientMeta.toLowerCase())}` : ''}.</p>
          ${order.diagnosis ? `<p class="formal-line">Diagnostico o motivo clinico: ${escapeHtml(order.diagnosis)}${order.icd10_code ? ` (${escapeHtml(order.icd10_code)})` : ''}.</p>` : ''}
          <div class="document-text">${escapeHtml(documentText || 'Sin contenido especificado.')}</div>
          <p class="formal-line" style="margin-top:22px;">Se expide el presente documento para los fines correspondientes en fecha ${formatDateTime(issuedAt)}.</p>
        </section>` : `<table>
          <thead><tr>${tableHeaders.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}</tr></thead>
          <tbody>${rows}</tbody>
        </table>`}
        <div class="platform-note">${escapeHtml(isMedicalDocument ? 'Este documento fue emitido electronicamente por SaludClick. Puedes validar su autenticidad con el codigo impreso.' : 'Esta orden fue emitida electronicamente por SaludClick. Presenta este documento al laboratorio o centro de estudios junto con tu identificacion y el codigo de validacion impreso.')}</div>
        <div class="footer">
          <div class="signature${digitalSealEnabled ? ' digital' : ''}">
            <strong>${escapeHtml(doctorName)}</strong><br>
            ${escapeHtml(specialties || 'Especialidad no especificada')}
            <small>${escapeHtml(doctorCredentials || 'Credenciales no especificadas')}</small>
            ${digitalSealEnabled ? `<small>Firmada electronicamente ${formatDateTime(issuedAt)}</small>` : ''}
          </div>
          <div class="seal">${digitalSealEnabled ? `<img src="${escapeHtml(order.prescription_seal)}" alt="Sello digital del médico">` : ''}</div>
          <div class="qr"><img src="${qrDataUrl}" alt="QR de verificacion"><strong>Verificacion</strong><br>${escapeHtml(verifyUrl)}</div>
        </div>
        <div class="auth-band">Documento emitido electronicamente por SaludClick · Hash SHA256: ${escapeHtml(validationToken)} · UUID: ${escapeHtml(order.id || '')} · Fecha: ${formatDateTime(issuedAt)} · Firma digital: SaludClick</div>
      </main>
    </body>
  </html>`;
}

function getOrderTitle(orderType: string) {
  if (orderType === 'imaging') return 'Orden de estudios de imágenes';
  if (orderType === 'procedure') return 'Orden de procedimiento';
  if (orderType === 'referral') return 'Referimiento médico';
  if (orderType === 'disability') return 'Incapacidad médica';
  if (orderType === 'certificate') return 'Certificado médico';
  if (orderType === 'medical_constancy') return 'Constancia médica';
  return 'Orden de laboratorio';
}

function getOrderTableHeaders(orderType: string) {
  if (orderType === 'imaging') return ['#', 'Estudio solicitado', 'Region anatomica', 'Contraste / preparacion'];
  if (orderType === 'procedure') return ['#', 'Procedimiento solicitado', 'Prioridad', 'Observaciones'];
  if (orderType === 'referral') return ['#', 'Referimiento', 'Especialidad / destino', 'Motivo / observaciones'];
  if (orderType === 'disability') return ['#', 'Incapacidad', 'Periodo', 'Observaciones'];
  if (orderType === 'certificate') return ['#', 'Certificacion', 'Tipo', 'Observaciones'];
  if (orderType === 'medical_constancy') return ['#', 'Constancia', 'Tipo', 'Observaciones'];
  return ['#', 'Analitica solicitada', 'Area', 'Preparacion / observaciones'];
}

function getDocumentDetailLabel(orderType: string) {
  if (orderType === 'referral') return 'Destino';
  if (orderType === 'disability') return 'Periodo';
  if (orderType === 'certificate') return 'Tipo';
  if (orderType === 'medical_constancy') return 'Tipo';
  return 'Detalle';
}

function getOrderStatus(order: any) {
  if (String(order?.status || '').toLowerCase() === 'cancelled') return 'Cancelada';
  if (String(order?.status || '').toLowerCase() === 'active') return 'Activa';
  return order?.status || 'No disponible';
}

function getPublicLabOrderVerifyUrl(req: Request, validationCode?: string) {
  const configuredBaseUrl =
    process.env.PUBLIC_APP_URL ||
    process.env.FRONTEND_URL ||
    '';
  const forwardedProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  const forwardedHost = String(req.headers['x-forwarded-host'] || '').split(',')[0].trim();
  const protocol = forwardedProto || req.protocol;
  const host = forwardedHost || req.get('host');
  const baseUrl = (configuredBaseUrl || `${protocol}://${host}`).replace(/\/+$/, '');
  return `${baseUrl}/documents/verify/${encodeURIComponent(validationCode || '')}`;
}

function formatDateTime(value: string | Date) {
  if (!value) return 'No disponible';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No disponible';
  return date.toLocaleString('es-DO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
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
