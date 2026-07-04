import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query, queryMany, queryOne } from '../db';
import { auditClinicalAction } from '../utils/audit';
import { fail, ok, created } from '../utils/apiResponse';
import { isUuid } from '../validators/commonValidators';
import { doctorCanAccessPatient } from '../repositories/clinicalAccessRepository';

const allowedWarningTypes = ['alergia', 'embarazo', 'lactancia', 'renal', 'hepatico', 'interaccion', 'duplicidad', 'controlado'];
const allowedSeverities = ['baja', 'media', 'alta', 'critica'];

export async function ensureVademecumTables() {
  await query(`
    CREATE TABLE IF NOT EXISTS medicamentos_vademecum (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      nombre_comercial VARCHAR(180) NOT NULL,
      principio_activo VARCHAR(220) NOT NULL,
      concentracion VARCHAR(120),
      forma_farmaceutica VARCHAR(120),
      presentacion VARCHAR(180),
      via_administracion VARCHAR(100),
      laboratorio VARCHAR(160),
      categoria_farmacologica VARCHAR(160),
      requiere_receta BOOLEAN DEFAULT true,
      controlado BOOLEAN DEFAULT false,
      otc BOOLEAN DEFAULT false,
      registro_sanitario VARCHAR(120),
      disponible_rd BOOLEAN DEFAULT true,
      activo BOOLEAN DEFAULT true,
      source VARCHAR(120) DEFAULT 'manual',
      search_text TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS medicamento_posologias (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      medicamento_id UUID NOT NULL REFERENCES medicamentos_vademecum(id) ON DELETE CASCADE,
      grupo_paciente VARCHAR(40) NOT NULL,
      dosis_sugerida TEXT,
      frecuencia VARCHAR(140),
      duracion VARCHAR(140),
      dosis_maxima TEXT,
      notas TEXT,
      activo BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS medicamento_advertencias (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      medicamento_id UUID NOT NULL REFERENCES medicamentos_vademecum(id) ON DELETE CASCADE,
      tipo VARCHAR(40) NOT NULL,
      severidad VARCHAR(40) NOT NULL DEFAULT 'media',
      mensaje TEXT NOT NULL,
      recomendacion TEXT,
      bloqueo BOOLEAN DEFAULT false,
      activo BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS doctor_medicamento_favoritos (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
      medicamento_id UUID NOT NULL REFERENCES medicamentos_vademecum(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (doctor_id, medicamento_id)
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS medicamento_prescription_history (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
      patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
      medicamento_id UUID REFERENCES medicamentos_vademecum(id) ON DELETE SET NULL,
      prescription_id UUID REFERENCES prescriptions(id) ON DELETE SET NULL,
      fecha_prescripcion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await query('CREATE INDEX IF NOT EXISTS idx_medicamentos_vademecum_active_rd ON medicamentos_vademecum(activo, disponible_rd)');
  await query('CREATE INDEX IF NOT EXISTS idx_medicamentos_vademecum_search ON medicamentos_vademecum USING gin(to_tsvector(\'spanish\', COALESCE(search_text, \'\')))');
  await query(`
    DELETE FROM medicamentos_vademecum a
    USING medicamentos_vademecum b
    WHERE a.id > b.id
      AND LOWER(a.nombre_comercial) = LOWER(b.nombre_comercial)
      AND LOWER(a.principio_activo) = LOWER(b.principio_activo)
      AND COALESCE(LOWER(a.concentracion), '') = COALESCE(LOWER(b.concentracion), '')
      AND COALESCE(LOWER(a.forma_farmaceutica), '') = COALESCE(LOWER(b.forma_farmaceutica), '')
  `).catch(() => null);
  await query(`
    CREATE UNIQUE INDEX IF NOT EXISTS uq_medicamentos_vademecum_identity
    ON medicamentos_vademecum (
      LOWER(nombre_comercial),
      LOWER(principio_activo),
      COALESCE(LOWER(concentracion), ''),
      COALESCE(LOWER(forma_farmaceutica), '')
    )
  `).catch(() => null);
  await seedDemoVademecum();
}

export const searchMedications = async (req: Request, res: Response) => {
  try {
    await ensureVademecumTables();
    const search = String(req.query.search || req.query.q || '').trim();
    const includeUnavailable = String(req.query.includeUnavailable || '') === 'true';
    const limit = Math.min(Math.max(Number(req.query.limit || 12), 1), 50);
    if (search.length < 2) return ok(res, []);

    const like = `%${search.toLowerCase()}%`;
    const rows = await queryMany(
      `SELECT id, nombre_comercial, principio_activo, concentracion, forma_farmaceutica, presentacion,
              via_administracion, laboratorio, categoria_farmacologica, requiere_receta, controlado, otc,
              registro_sanitario, disponible_rd, activo
       FROM medicamentos_vademecum
       WHERE activo = true
         AND ($3::boolean = true OR disponible_rd = true)
         AND (
           LOWER(nombre_comercial) LIKE $1
           OR LOWER(principio_activo) LIKE $1
           OR LOWER(COALESCE(laboratorio, '')) LIKE $1
           OR LOWER(COALESCE(concentracion, '')) LIKE $1
           OR LOWER(COALESCE(search_text, '')) LIKE $1
           OR to_tsvector('spanish', COALESCE(search_text, '')) @@ plainto_tsquery('spanish', $2)
         )
       ORDER BY
         CASE
           WHEN LOWER(nombre_comercial) = LOWER($2) THEN 0
           WHEN LOWER(nombre_comercial) LIKE LOWER($2 || '%') THEN 1
           WHEN LOWER(principio_activo) LIKE LOWER($2 || '%') THEN 2
           ELSE 3
         END,
         nombre_comercial
       LIMIT $4`,
      [like, search, includeUnavailable, limit]
    );

    return ok(res, rows);
  } catch (error: any) {
    console.error('Search vademecum error:', error);
    return fail(res, 500, 'Error searching vademecum', error);
  }
};

export const getMedicationDetail = async (req: Request, res: Response) => {
  try {
    await ensureVademecumTables();
    const { id } = req.params;
    if (!isUuid(id)) return fail(res, 400, 'Invalid medication id');
    const medication = await queryOne('SELECT * FROM medicamentos_vademecum WHERE id = $1', [id]);
    if (!medication) return fail(res, 404, 'Medication not found');
    const [posologias, advertencias] = await Promise.all([
      queryMany('SELECT * FROM medicamento_posologias WHERE medicamento_id = $1 AND activo = true ORDER BY grupo_paciente, created_at', [id]),
      queryMany('SELECT * FROM medicamento_advertencias WHERE medicamento_id = $1 AND activo = true ORDER BY severidad DESC, created_at', [id]),
    ]);
    return ok(res, { ...medication, posologias, advertencias });
  } catch (error: any) {
    console.error('Medication detail error:', error);
    return fail(res, 500, 'Error fetching medication detail', error);
  }
};

export const listFavorites = async (req: Request, res: Response) => {
  try {
    await ensureVademecumTables();
    const doctorId = req.user?.id;
    if (!doctorId || req.user?.role !== 'doctor') return fail(res, 403, 'Only doctors can list favorites');
    const rows = await queryMany(
      `SELECT m.*, f.created_at AS favorite_created_at
       FROM doctor_medicamento_favoritos f
       JOIN medicamentos_vademecum m ON m.id = f.medicamento_id
       WHERE f.doctor_id = $1 AND m.activo = true
       ORDER BY f.created_at DESC`,
      [doctorId]
    );
    return ok(res, rows);
  } catch (error: any) {
    return fail(res, 500, 'Error fetching favorites', error);
  }
};

export const addFavorite = async (req: Request, res: Response) => {
  try {
    await ensureVademecumTables();
    const doctorId = req.user?.id;
    const { medicamentoId } = req.body;
    if (!doctorId || req.user?.role !== 'doctor') return fail(res, 403, 'Only doctors can add favorites');
    if (!isUuid(medicamentoId)) return fail(res, 400, 'Invalid medication id');
    const row = await queryOne(
      `INSERT INTO doctor_medicamento_favoritos (id, doctor_id, medicamento_id)
       VALUES ($1,$2,$3)
       ON CONFLICT (doctor_id, medicamento_id) DO UPDATE SET created_at = doctor_medicamento_favoritos.created_at
       RETURNING *`,
      [uuidv4(), doctorId, medicamentoId]
    );
    await auditClinicalAction(req, { action: 'favorite_add', entity: 'medicamentos_vademecum', entityId: medicamentoId, doctorId, newData: row }).catch(() => null);
    return created(res, row);
  } catch (error: any) {
    return fail(res, 500, 'Error adding favorite', error);
  }
};

export const removeFavorite = async (req: Request, res: Response) => {
  try {
    await ensureVademecumTables();
    const doctorId = req.user?.id;
    const { id } = req.params;
    if (!doctorId || req.user?.role !== 'doctor') return fail(res, 403, 'Only doctors can remove favorites');
    if (!isUuid(id)) return fail(res, 400, 'Invalid medication id');
    await query('DELETE FROM doctor_medicamento_favoritos WHERE doctor_id = $1 AND medicamento_id = $2', [doctorId, id]);
    await auditClinicalAction(req, { action: 'favorite_remove', entity: 'medicamentos_vademecum', entityId: id, doctorId }).catch(() => null);
    return ok(res, { removed: true });
  } catch (error: any) {
    return fail(res, 500, 'Error removing favorite', error);
  }
};

export const listRecent = async (req: Request, res: Response) => {
  try {
    await ensureVademecumTables();
    const doctorId = req.user?.id;
    if (!doctorId || req.user?.role !== 'doctor') return fail(res, 403, 'Only doctors can list recent medications');
    const rows = await queryMany(
      `SELECT DISTINCT ON (m.id) m.*, h.fecha_prescripcion
       FROM medicamento_prescription_history h
       JOIN medicamentos_vademecum m ON m.id = h.medicamento_id
       WHERE h.doctor_id = $1 AND m.activo = true
       ORDER BY m.id, h.fecha_prescripcion DESC
       LIMIT 20`,
      [doctorId]
    );
    return ok(res, rows.sort((a, b) => new Date(b.fecha_prescripcion).getTime() - new Date(a.fecha_prescripcion).getTime()));
  } catch (error: any) {
    return fail(res, 500, 'Error fetching recent medications', error);
  }
};

export const validateMedicationForPatient = async (req: Request, res: Response) => {
  try {
    await ensureVademecumTables();
    const doctorId = req.user?.id;
    const { patientId, medicamentoId, selectedMedications = [] } = req.body;
    if (!doctorId || req.user?.role !== 'doctor') return fail(res, 403, 'Only doctors can validate medications');
    if (!isUuid(patientId) || !isUuid(medicamentoId)) return fail(res, 400, 'Invalid patient or medication id');
    const allowed = await doctorCanAccessPatient(doctorId, patientId);
    if (!allowed) return fail(res, 403, 'Unauthorized patient access');

    const [medication, staticWarnings, allergies, activeMeds, antecedents, patient] = await Promise.all([
      queryOne('SELECT * FROM medicamentos_vademecum WHERE id = $1 AND activo = true', [medicamentoId]),
      queryMany('SELECT tipo, severidad, mensaje, recomendacion, bloqueo FROM medicamento_advertencias WHERE medicamento_id = $1 AND activo = true', [medicamentoId]),
      queryMany('SELECT name, type, severity, reaction, notes FROM patient_allergies WHERE patient_id = $1 AND is_active = true', [patientId]),
      queryMany('SELECT medication, dosage, frequency FROM patient_medications WHERE patient_id = $1 AND is_active = true', [patientId]),
      queryOne('SELECT chronic_diseases, personal_history FROM patient_antecedents WHERE patient_id = $1 ORDER BY updated_at DESC LIMIT 1', [patientId]),
      queryOne('SELECT date_of_birth, gender FROM patients WHERE id = $1', [patientId]),
    ]);
    if (!medication) return fail(res, 404, 'Medication not found');

    const warnings: any[] = staticWarnings.map((warning) => ({
      severity: warning.severidad,
      type: warning.tipo,
      message: warning.mensaje,
      recommendation: warning.recomendacion,
      blocking: Boolean(warning.bloqueo),
    }));

    const medTerms = normalizeTerms([medication.nombre_comercial, medication.principio_activo, medication.categoria_farmacologica]);
    for (const allergy of allergies) {
      const allergyText = normalizeText([allergy.name, allergy.type, allergy.reaction, allergy.notes].filter(Boolean).join(' '));
      if (medTerms.some((term) => term.length >= 4 && allergyText.includes(term))) {
        warnings.push({
          severity: 'alta',
          type: 'alergia',
          message: `El paciente tiene alergia registrada relacionada con ${allergy.name}.`,
          recommendation: 'Revise la indicacion antes de emitir la receta.',
          blocking: false,
        });
      }
    }

    const activeMedText = normalizeText(activeMeds.map((item) => item.medication).join(' '));
    if (medTerms.some((term) => term.length >= 4 && activeMedText.includes(term))) {
      warnings.push({
        severity: 'media',
        type: 'duplicidad',
        message: 'El paciente tiene un medicamento activo que parece coincidir con esta indicacion.',
        recommendation: 'Verifique que no exista duplicidad terapeutica.',
        blocking: false,
      });
    }

    const selectedText = normalizeText((Array.isArray(selectedMedications) ? selectedMedications : []).map((item: any) => `${item.name || ''} ${item.activeIngredient || ''}`).join(' '));
    if (selectedText && medTerms.some((term) => term.length >= 4 && selectedText.includes(term))) {
      warnings.push({
        severity: 'media',
        type: 'duplicidad',
        message: 'Ya hay un medicamento similar en la receta en curso.',
        recommendation: 'Confirme que la repeticion es intencional.',
        blocking: false,
      });
    }

    const antecedentText = normalizeText(`${antecedents?.chronic_diseases || ''} ${antecedents?.personal_history || ''}`);
    if (antecedentText.includes('renal')) warnings.push({ severity: 'media', type: 'renal', message: 'El expediente menciona antecedente renal.', recommendation: 'Considere ajuste o vigilancia segun criterio clinico.', blocking: false });
    if (antecedentText.includes('hepatic') || antecedentText.includes('hepat')) warnings.push({ severity: 'media', type: 'hepatico', message: 'El expediente menciona antecedente hepatico.', recommendation: 'Considere ajuste o vigilancia segun criterio clinico.', blocking: false });
    if (medication.controlado) warnings.push({ severity: 'alta', type: 'controlado', message: 'Medicamento marcado como controlado.', recommendation: 'Confirme requisitos regulatorios y documentacion antes de emitir.', blocking: false });

    const canPrescribe = !warnings.some((warning) => warning.blocking);
    await auditClinicalAction(req, {
      action: 'vademecum_validate',
      entity: 'medicamentos_vademecum',
      entityId: medicamentoId,
      patientId,
      doctorId,
      newData: { medication: medication.nombre_comercial, patientAge: calculateAge(patient?.date_of_birth), warnings, canPrescribe },
    }).catch(() => null);

    return ok(res, { can_prescribe: canPrescribe, warnings });
  } catch (error: any) {
    console.error('Validate medication error:', error);
    return fail(res, 500, 'Error validating medication', error);
  }
};

export const createMedication = async (req: Request, res: Response) => {
  try {
    await ensureVademecumTables();
    if (req.user?.role !== 'admin') return fail(res, 403, 'Only admins can create medications');
    const body = sanitizeMedicationBody(req.body);
    if (!body.nombre_comercial || !body.principio_activo) return fail(res, 400, 'nombre_comercial and principio_activo are required');
    const row = await queryOne(
      `INSERT INTO medicamentos_vademecum
       (id, nombre_comercial, principio_activo, concentracion, forma_farmaceutica, presentacion, via_administracion, laboratorio, categoria_farmacologica, requiere_receta, controlado, otc, registro_sanitario, disponible_rd, activo, source, search_text)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'manual',$16)
       RETURNING *`,
      [uuidv4(), body.nombre_comercial, body.principio_activo, body.concentracion, body.forma_farmaceutica, body.presentacion, body.via_administracion, body.laboratorio, body.categoria_farmacologica, body.requiere_receta, body.controlado, body.otc, body.registro_sanitario, body.disponible_rd, body.activo, buildSearchText(body)]
    );
    await auditClinicalAction(req, { action: 'create', entity: 'medicamentos_vademecum', entityId: row.id, newData: row }).catch(() => null);
    return created(res, row);
  } catch (error: any) {
    return fail(res, 500, 'Error creating medication', error);
  }
};

export const updateMedication = async (req: Request, res: Response) => {
  try {
    await ensureVademecumTables();
    if (req.user?.role !== 'admin') return fail(res, 403, 'Only admins can update medications');
    const { id } = req.params;
    if (!isUuid(id)) return fail(res, 400, 'Invalid medication id');
    const body = sanitizeMedicationBody(req.body);
    const row = await queryOne(
      `UPDATE medicamentos_vademecum
       SET nombre_comercial=$1, principio_activo=$2, concentracion=$3, forma_farmaceutica=$4, presentacion=$5,
           via_administracion=$6, laboratorio=$7, categoria_farmacologica=$8, requiere_receta=$9,
           controlado=$10, otc=$11, registro_sanitario=$12, disponible_rd=$13, activo=$14,
           search_text=$15, updated_at=NOW()
       WHERE id=$16
       RETURNING *`,
      [body.nombre_comercial, body.principio_activo, body.concentracion, body.forma_farmaceutica, body.presentacion, body.via_administracion, body.laboratorio, body.categoria_farmacologica, body.requiere_receta, body.controlado, body.otc, body.registro_sanitario, body.disponible_rd, body.activo, buildSearchText(body), id]
    );
    if (!row) return fail(res, 404, 'Medication not found');
    await auditClinicalAction(req, { action: 'update', entity: 'medicamentos_vademecum', entityId: id, newData: row }).catch(() => null);
    return ok(res, row);
  } catch (error: any) {
    return fail(res, 500, 'Error updating medication', error);
  }
};

function sanitizeMedicationBody(body: any) {
  return {
    nombre_comercial: String(body.nombre_comercial || body.nombreComercial || '').trim(),
    principio_activo: String(body.principio_activo || body.principioActivo || '').trim(),
    concentracion: nullable(body.concentracion),
    forma_farmaceutica: nullable(body.forma_farmaceutica || body.formaFarmaceutica),
    presentacion: nullable(body.presentacion),
    via_administracion: nullable(body.via_administracion || body.viaAdministracion),
    laboratorio: nullable(body.laboratorio),
    categoria_farmacologica: nullable(body.categoria_farmacologica || body.categoriaFarmacologica),
    requiere_receta: Boolean(body.requiere_receta ?? body.requiereReceta ?? true),
    controlado: Boolean(body.controlado),
    otc: Boolean(body.otc),
    registro_sanitario: nullable(body.registro_sanitario || body.registroSanitario),
    disponible_rd: Boolean(body.disponible_rd ?? body.disponibleRd ?? true),
    activo: Boolean(body.activo ?? true),
  };
}

function nullable(value: any) {
  const text = String(value || '').trim();
  return text || null;
}

function buildSearchText(item: any) {
  return [item.nombre_comercial, item.principio_activo, item.concentracion, item.forma_farmaceutica, item.presentacion, item.via_administracion, item.laboratorio, item.categoria_farmacologica].filter(Boolean).join(' ');
}

function normalizeText(value: string) {
  return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function normalizeTerms(values: any[]) {
  return values.flatMap((value) => normalizeText(String(value || '')).split(/[^a-z0-9]+/)).filter(Boolean);
}

function calculateAge(value?: string | Date) {
  if (!value) return null;
  const birth = new Date(value);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDelta = today.getMonth() - birth.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birth.getDate())) age -= 1;
  return age;
}

async function seedDemoVademecum() {
  const seeds = [
    ['Paracetamol', 'Acetaminofen', '500 mg', 'Tableta', 'Caja de tabletas 500 mg', 'Oral', 'Catalogo base SaludClick', 'Analgesico / antipiretico', false, false, true],
    ['Acetaminofen pediatrico', 'Acetaminofen', '120 mg/5 mL', 'Jarabe', 'Frasco suspension oral', 'Oral', 'Catalogo base SaludClick', 'Analgesico / antipiretico', false, false, true],
    ['Ibuprofeno', 'Ibuprofeno', '400 mg', 'Tableta', 'Caja de tabletas 400 mg', 'Oral', 'Catalogo base SaludClick', 'AINE', false, false, true],
    ['Diclofenaco', 'Diclofenaco sodico', '50 mg', 'Tableta', 'Tabletas 50 mg', 'Oral', 'Catalogo base SaludClick', 'AINE', true, false, false],
    ['Naproxeno', 'Naproxeno', '500 mg', 'Tableta', 'Tabletas 500 mg', 'Oral', 'Catalogo base SaludClick', 'AINE', true, false, false],
    ['Ketorolaco', 'Ketorolaco trometamina', '10 mg', 'Tableta', 'Tabletas 10 mg', 'Oral', 'Catalogo base SaludClick', 'AINE', true, false, false],
    ['Metamizol', 'Dipirona', '500 mg', 'Tableta', 'Tabletas 500 mg', 'Oral', 'Catalogo base SaludClick', 'Analgesico', true, false, false],
    ['Omeprazol', 'Omeprazol', '20 mg', 'Capsula', 'Capsulas 20 mg', 'Oral', 'Catalogo base SaludClick', 'Inhibidor bomba protones', true, false, false],
    ['Pantoprazol', 'Pantoprazol', '40 mg', 'Tableta', 'Tabletas 40 mg', 'Oral', 'Catalogo base SaludClick', 'Inhibidor bomba protones', true, false, false],
    ['Famotidina', 'Famotidina', '20 mg', 'Tableta', 'Tabletas 20 mg', 'Oral', 'Catalogo base SaludClick', 'Antagonista H2', true, false, false],
    ['Metoclopramida', 'Metoclopramida', '10 mg', 'Tableta', 'Tabletas 10 mg', 'Oral', 'Catalogo base SaludClick', 'Antiemetico / procinetico', true, false, false],
    ['Ondansetron', 'Ondansetron', '8 mg', 'Tableta', 'Tabletas 8 mg', 'Oral', 'Catalogo base SaludClick', 'Antiemetico', true, false, false],
    ['Loperamida', 'Loperamida', '2 mg', 'Capsula', 'Capsulas 2 mg', 'Oral', 'Catalogo base SaludClick', 'Antidiarreico', false, false, true],
    ['Sales de rehidratacion oral', 'Electrolitos', 'Sobre', 'Polvo', 'Sobres para solucion oral', 'Oral', 'Catalogo base SaludClick', 'Rehidratacion oral', false, false, true],
    ['Amoxicilina', 'Amoxicilina', '875 mg', 'Capsula', 'Capsulas 875 mg', 'Oral', 'Catalogo base SaludClick', 'Antibiotico betalactamico', true, false, false],
    ['Amoxicilina + Acido clavulanico', 'Amoxicilina / Acido clavulanico', '875/125 mg', 'Tableta', 'Tabletas 875/125 mg', 'Oral', 'Catalogo base SaludClick', 'Antibiotico betalactamico', true, false, false],
    ['Azitromicina', 'Azitromicina', '500 mg', 'Tableta', 'Tabletas 500 mg', 'Oral', 'Catalogo base SaludClick', 'Antibiotico macrolido', true, false, false],
    ['Ciprofloxacino', 'Ciprofloxacino', '500 mg', 'Tableta', 'Tabletas 500 mg', 'Oral', 'Catalogo base SaludClick', 'Antibiotico quinolona', true, false, false],
    ['Cefalexina', 'Cefalexina', '500 mg', 'Capsula', 'Capsulas 500 mg', 'Oral', 'Catalogo base SaludClick', 'Antibiotico cefalosporina', true, false, false],
    ['Cefixima', 'Cefixima', '400 mg', 'Capsula', 'Capsulas 400 mg', 'Oral', 'Catalogo base SaludClick', 'Antibiotico cefalosporina', true, false, false],
    ['Doxiciclina', 'Doxiciclina', '100 mg', 'Capsula', 'Capsulas 100 mg', 'Oral', 'Catalogo base SaludClick', 'Antibiotico tetraciclina', true, false, false],
    ['Metronidazol', 'Metronidazol', '500 mg', 'Tableta', 'Tabletas 500 mg', 'Oral', 'Catalogo base SaludClick', 'Antibiotico / antiparasitario', true, false, false],
    ['Fluconazol', 'Fluconazol', '150 mg', 'Capsula', 'Capsula 150 mg', 'Oral', 'Catalogo base SaludClick', 'Antifungico', true, false, false],
    ['Clotrimazol crema', 'Clotrimazol', '1%', 'Crema', 'Tubo crema topica', 'Topica', 'Catalogo base SaludClick', 'Antifungico', false, false, true],
    ['Loratadina', 'Loratadina', '10 mg', 'Tableta', 'Tabletas 10 mg', 'Oral', 'Catalogo base SaludClick', 'Antihistaminico', false, false, true],
    ['Cetirizina', 'Cetirizina', '10 mg', 'Tableta', 'Tabletas 10 mg', 'Oral', 'Catalogo base SaludClick', 'Antihistaminico', false, false, true],
    ['Desloratadina', 'Desloratadina', '5 mg', 'Tableta', 'Tabletas 5 mg', 'Oral', 'Catalogo base SaludClick', 'Antihistaminico', false, false, true],
    ['Fexofenadina', 'Fexofenadina', '120 mg', 'Tableta', 'Tabletas 120 mg', 'Oral', 'Catalogo base SaludClick', 'Antihistaminico', false, false, true],
    ['Prednisona', 'Prednisona', '20 mg', 'Tableta', 'Tabletas 20 mg', 'Oral', 'Catalogo base SaludClick', 'Corticoide', true, false, false],
    ['Dexametasona', 'Dexametasona', '4 mg', 'Tableta', 'Tabletas 4 mg', 'Oral', 'Catalogo base SaludClick', 'Corticoide', true, false, false],
    ['Salbutamol inhalador', 'Salbutamol', '100 mcg/dosis', 'Inhalador', 'Inhalador dosis medida', 'Inhalatoria', 'Catalogo base SaludClick', 'Broncodilatador', true, false, false],
    ['Budesonida inhalador', 'Budesonida', '200 mcg/dosis', 'Inhalador', 'Inhalador dosis medida', 'Inhalatoria', 'Catalogo base SaludClick', 'Corticoide inhalado', true, false, false],
    ['Losartan', 'Losartan potasico', '50 mg', 'Tableta', 'Tabletas 50 mg', 'Oral', 'Catalogo base SaludClick', 'Antihipertensivo ARA II', true, false, false],
    ['Enalapril', 'Enalapril', '20 mg', 'Tableta', 'Tabletas 20 mg', 'Oral', 'Catalogo base SaludClick', 'Antihipertensivo IECA', true, false, false],
    ['Amlodipino', 'Amlodipino', '5 mg', 'Tableta', 'Tabletas 5 mg', 'Oral', 'Catalogo base SaludClick', 'Calcioantagonista', true, false, false],
    ['Hidroclorotiazida', 'Hidroclorotiazida', '25 mg', 'Tableta', 'Tabletas 25 mg', 'Oral', 'Catalogo base SaludClick', 'Diuretico tiazidico', true, false, false],
    ['Furosemida', 'Furosemida', '40 mg', 'Tableta', 'Tabletas 40 mg', 'Oral', 'Catalogo base SaludClick', 'Diuretico de asa', true, false, false],
    ['Atenolol', 'Atenolol', '50 mg', 'Tableta', 'Tabletas 50 mg', 'Oral', 'Catalogo base SaludClick', 'Betabloqueador', true, false, false],
    ['Atorvastatina', 'Atorvastatina', '20 mg', 'Tableta', 'Tabletas 20 mg', 'Oral', 'Catalogo base SaludClick', 'Hipolipemiante estatina', true, false, false],
    ['Rosuvastatina', 'Rosuvastatina', '10 mg', 'Tableta', 'Tabletas 10 mg', 'Oral', 'Catalogo base SaludClick', 'Hipolipemiante estatina', true, false, false],
    ['Metformina', 'Metformina', '850 mg', 'Tableta', 'Tabletas 850 mg', 'Oral', 'Catalogo base SaludClick', 'Antidiabetico biguanida', true, false, false],
    ['Glibenclamida', 'Glibenclamida', '5 mg', 'Tableta', 'Tabletas 5 mg', 'Oral', 'Catalogo base SaludClick', 'Antidiabetico sulfonilurea', true, false, false],
    ['Insulina NPH', 'Insulina humana NPH', '100 UI/mL', 'Suspension inyectable', 'Vial o lapicero', 'Subcutanea', 'Catalogo base SaludClick', 'Insulina', true, false, false],
    ['Levotiroxina', 'Levotiroxina sodica', '50 mcg', 'Tableta', 'Tabletas 50 mcg', 'Oral', 'Catalogo base SaludClick', 'Hormona tiroidea', true, false, false],
    ['Acido folico', 'Acido folico', '5 mg', 'Tableta', 'Tabletas 5 mg', 'Oral', 'Catalogo base SaludClick', 'Vitamina', false, false, true],
    ['Sulfato ferroso', 'Hierro elemental', '300 mg', 'Tableta', 'Tabletas 300 mg', 'Oral', 'Catalogo base SaludClick', 'Antianemico', false, false, true],
    ['Vitamina D3', 'Colecalciferol', '2000 UI', 'Capsula', 'Capsulas 2000 UI', 'Oral', 'Catalogo base SaludClick', 'Vitamina', false, false, true],
    ['Complejo B', 'Vitaminas del complejo B', 'Tableta', 'Tableta', 'Tabletas', 'Oral', 'Catalogo base SaludClick', 'Vitaminas', false, false, true],
    ['Clonazepam', 'Clonazepam', '2 mg', 'Tableta', 'Tabletas 2 mg', 'Oral', 'Catalogo base SaludClick', 'Benzodiacepina', true, true, false],
    ['Alprazolam', 'Alprazolam', '0.5 mg', 'Tableta', 'Tabletas 0.5 mg', 'Oral', 'Catalogo base SaludClick', 'Benzodiacepina', true, true, false],
    ['Sertralina', 'Sertralina', '50 mg', 'Tableta', 'Tabletas 50 mg', 'Oral', 'Catalogo base SaludClick', 'Antidepresivo ISRS', true, false, false],
    ['Fluoxetina', 'Fluoxetina', '20 mg', 'Capsula', 'Capsulas 20 mg', 'Oral', 'Catalogo base SaludClick', 'Antidepresivo ISRS', true, false, false],
    ['Quetiapina', 'Quetiapina', '25 mg', 'Tableta', 'Tabletas 25 mg', 'Oral', 'Catalogo base SaludClick', 'Antipsicotico', true, false, false],
  ];
  for (const seed of seeds) {
    await query(
      `INSERT INTO medicamentos_vademecum
       (nombre_comercial, principio_activo, concentracion, forma_farmaceutica, presentacion, via_administracion, laboratorio, categoria_farmacologica, requiere_receta, controlado, otc, source, search_text)
       SELECT $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'saludclick-base',$12
       WHERE NOT EXISTS (
         SELECT 1 FROM medicamentos_vademecum
         WHERE LOWER(nombre_comercial) = LOWER($1)
           AND LOWER(principio_activo) = LOWER($2)
           AND COALESCE(LOWER(concentracion), '') = COALESCE(LOWER($3), '')
           AND COALESCE(LOWER(forma_farmaceutica), '') = COALESCE(LOWER($4), '')
       )`,
      [...seed, seed.join(' ')]
    ).catch(() => null);
  }
}

export async function recordVademecumPrescriptionHistory(req: Request, doctorId: string, patientId: string, prescriptionId: string, medications: any[]) {
  await ensureVademecumTables().catch(() => null);
  const selected = medications.filter((item) => item?.vademecumId && isUuid(item.vademecumId));
  for (const item of selected) {
    await query(
      `INSERT INTO medicamento_prescription_history (id, doctor_id, patient_id, medicamento_id, prescription_id)
       VALUES ($1,$2,$3,$4,$5)`,
      [uuidv4(), doctorId, patientId, item.vademecumId, prescriptionId]
    ).catch(() => null);
  }
  if (selected.length) {
    await auditClinicalAction(req, {
      action: 'vademecum_prescription_confirmed',
      entity: 'prescriptions',
      entityId: prescriptionId,
      patientId,
      doctorId,
      newData: {
        medications: selected.map((item) => ({ vademecumId: item.vademecumId, name: item.name, warningsConfirmed: item.warningsConfirmed, warnings: item.vademecumWarnings || [] })),
      },
    }).catch(() => null);
  }
}
