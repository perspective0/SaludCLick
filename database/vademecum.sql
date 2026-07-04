-- Vademecum module for SaludClick.
-- Data entered here is an internal catalog for RD workflows; seed rows are examples, not an official source.

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
);

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
);

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
);

CREATE TABLE IF NOT EXISTS doctor_medicamento_favoritos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  medicamento_id UUID NOT NULL REFERENCES medicamentos_vademecum(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (doctor_id, medicamento_id)
);

CREATE TABLE IF NOT EXISTS medicamento_prescription_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  medicamento_id UUID REFERENCES medicamentos_vademecum(id) ON DELETE SET NULL,
  prescription_id UUID REFERENCES prescriptions(id) ON DELETE SET NULL,
  fecha_prescripcion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_medicamentos_vademecum_active_rd ON medicamentos_vademecum(activo, disponible_rd);
CREATE INDEX IF NOT EXISTS idx_medicamentos_vademecum_name ON medicamentos_vademecum(nombre_comercial);
CREATE INDEX IF NOT EXISTS idx_medicamentos_vademecum_principio ON medicamentos_vademecum(principio_activo);
CREATE INDEX IF NOT EXISTS idx_medicamentos_vademecum_search ON medicamentos_vademecum USING gin(to_tsvector('spanish', COALESCE(search_text, '')));
CREATE INDEX IF NOT EXISTS idx_medicamento_posologias_med ON medicamento_posologias(medicamento_id);
CREATE INDEX IF NOT EXISTS idx_medicamento_advertencias_med ON medicamento_advertencias(medicamento_id);
CREATE INDEX IF NOT EXISTS idx_doctor_medicamento_favoritos_doctor ON doctor_medicamento_favoritos(doctor_id);
CREATE INDEX IF NOT EXISTS idx_medicamento_history_doctor ON medicamento_prescription_history(doctor_id, fecha_prescripcion DESC);

INSERT INTO medicamentos_vademecum
  (nombre_comercial, principio_activo, concentracion, forma_farmaceutica, presentacion, via_administracion, laboratorio, categoria_farmacologica, requiere_receta, controlado, otc, registro_sanitario, disponible_rd, activo, source, search_text)
VALUES
  ('Paracetamol', 'Acetaminofen', '500 mg', 'Tableta', 'Caja de tabletas 500 mg', 'Oral', 'Ejemplo SaludClick', 'Analgesico / antipiretico', false, false, true, NULL, true, true, 'saludclick-demo', 'Paracetamol Acetaminofen 500 mg Tableta Oral Analgesico antipiretico'),
  ('Ibuprofeno', 'Ibuprofeno', '400 mg', 'Tableta', 'Caja de tabletas 400 mg', 'Oral', 'Ejemplo SaludClick', 'AINE', false, false, true, NULL, true, true, 'saludclick-demo', 'Ibuprofeno 400 mg Tableta Oral AINE antiinflamatorio'),
  ('Amoxicilina', 'Amoxicilina', '875 mg', 'Capsula', 'Capsulas 875 mg', 'Oral', 'Ejemplo SaludClick', 'Antibiotico betalactamico', true, false, false, NULL, true, true, 'saludclick-demo', 'Amoxicilina 875 mg Capsula Oral Antibiotico betalactamico penicilina'),
  ('Loratadina', 'Loratadina', '10 mg', 'Tableta', 'Tabletas 10 mg', 'Oral', 'Ejemplo SaludClick', 'Antihistaminico', false, false, true, NULL, true, true, 'saludclick-demo', 'Loratadina 10 mg Tableta Oral Antihistaminico alergia')
ON CONFLICT DO NOTHING;

INSERT INTO medicamento_posologias (medicamento_id, grupo_paciente, dosis_sugerida, frecuencia, duracion, dosis_maxima, notas)
SELECT id, 'adulto', 'Segun criterio medico', 'Segun indicacion', 'Segun evolucion', NULL, 'Dato de ejemplo. Confirmar con fuente clinica validada.'
FROM medicamentos_vademecum
WHERE source = 'saludclick-demo'
ON CONFLICT DO NOTHING;

INSERT INTO medicamento_advertencias (medicamento_id, tipo, severidad, mensaje, recomendacion, bloqueo)
SELECT id, 'controlado', 'media', 'Verifique indicacion, antecedentes y requisitos regulatorios antes de emitir.', 'El medico debe confirmar la pertinencia clinica.', false
FROM medicamentos_vademecum
WHERE controlado = true
ON CONFLICT DO NOTHING;
