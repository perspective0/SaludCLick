-- Clinical backend extension for SaludClick.
-- Safe to run on an existing database; it only creates missing objects.

CREATE TABLE IF NOT EXISTS vital_signs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  medical_record_id UUID REFERENCES medical_records(id) ON DELETE SET NULL,
  blood_pressure VARCHAR(20),
  heart_rate INTEGER,
  respiratory_rate INTEGER,
  temperature DECIMAL(4, 1),
  oxygen_saturation DECIMAL(5, 2),
  weight DECIMAL(6, 2),
  height DECIMAL(6, 2),
  bmi DECIMAL(5, 2),
  measured_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS patient_allergies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  name VARCHAR(160) NOT NULL,
  type VARCHAR(80),
  severity VARCHAR(40),
  reaction TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS patient_medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  medication VARCHAR(180) NOT NULL,
  dosage VARCHAR(120),
  frequency VARCHAR(120),
  start_date DATE,
  end_date DATE,
  prescribed_by VARCHAR(180),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS patient_antecedents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  personal_history TEXT,
  family_history TEXT,
  surgical_history TEXT,
  habits TEXT,
  chronic_diseases TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS patient_diagnoses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  medical_record_id UUID REFERENCES medical_records(id) ON DELETE SET NULL,
  diagnosis TEXT NOT NULL,
  icd10_code VARCHAR(20),
  status VARCHAR(40) DEFAULT 'active',
  diagnosis_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS consultation_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  draft_data JSONB NOT NULL,
  status VARCHAR(20) DEFAULT 'draft',
  finalized_at TIMESTAMP,
  medical_record_id UUID REFERENCES medical_records(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CHECK (status IN ('draft', 'finalized', 'discarded')),
  UNIQUE(patient_id, doctor_id)
);

ALTER TABLE consultation_drafts ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'draft';
ALTER TABLE consultation_drafts ADD COLUMN IF NOT EXISTS finalized_at TIMESTAMP;
ALTER TABLE consultation_drafts ADD COLUMN IF NOT EXISTS medical_record_id UUID REFERENCES medical_records(id) ON DELETE SET NULL;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'consultation_drafts_status_check') THEN
    ALTER TABLE consultation_drafts ADD CONSTRAINT consultation_drafts_status_check CHECK (status IN ('draft', 'finalized', 'discarded')) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vital_signs_temperature_check') THEN
    ALTER TABLE vital_signs ADD CONSTRAINT vital_signs_temperature_check CHECK (temperature IS NULL OR (temperature >= 30 AND temperature <= 45)) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vital_signs_o2_check') THEN
    ALTER TABLE vital_signs ADD CONSTRAINT vital_signs_o2_check CHECK (oxygen_saturation IS NULL OR (oxygen_saturation >= 0 AND oxygen_saturation <= 100)) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vital_signs_weight_check') THEN
    ALTER TABLE vital_signs ADD CONSTRAINT vital_signs_weight_check CHECK (weight IS NULL OR weight > 0) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vital_signs_height_check') THEN
    ALTER TABLE vital_signs ADD CONSTRAINT vital_signs_height_check CHECK (height IS NULL OR height > 0) NOT VALID;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(80) NOT NULL,
  entity VARCHAR(80) NOT NULL,
  entity_id UUID,
  patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL,
  old_data JSONB,
  new_data JSONB,
  ip_address VARCHAR(80),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_vital_signs_patient ON vital_signs(patient_id);
CREATE INDEX IF NOT EXISTS idx_vital_signs_doctor ON vital_signs(doctor_id);
CREATE INDEX IF NOT EXISTS idx_vital_signs_record ON vital_signs(medical_record_id);
CREATE INDEX IF NOT EXISTS idx_vital_signs_created ON vital_signs(created_at);

CREATE INDEX IF NOT EXISTS idx_patient_allergies_patient ON patient_allergies(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_allergies_doctor ON patient_allergies(doctor_id);
CREATE INDEX IF NOT EXISTS idx_patient_allergies_created ON patient_allergies(created_at);

CREATE INDEX IF NOT EXISTS idx_patient_medications_patient ON patient_medications(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_medications_doctor ON patient_medications(doctor_id);
CREATE INDEX IF NOT EXISTS idx_patient_medications_created ON patient_medications(created_at);

CREATE INDEX IF NOT EXISTS idx_patient_antecedents_patient ON patient_antecedents(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_antecedents_doctor ON patient_antecedents(doctor_id);
CREATE INDEX IF NOT EXISTS idx_patient_antecedents_created ON patient_antecedents(created_at);

CREATE INDEX IF NOT EXISTS idx_patient_diagnoses_patient ON patient_diagnoses(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_diagnoses_doctor ON patient_diagnoses(doctor_id);
CREATE INDEX IF NOT EXISTS idx_patient_diagnoses_record ON patient_diagnoses(medical_record_id);
CREATE INDEX IF NOT EXISTS idx_patient_diagnoses_created ON patient_diagnoses(created_at);

CREATE INDEX IF NOT EXISTS idx_consultation_drafts_patient ON consultation_drafts(patient_id);
CREATE INDEX IF NOT EXISTS idx_consultation_drafts_doctor ON consultation_drafts(doctor_id);
CREATE INDEX IF NOT EXISTS idx_consultation_drafts_created ON consultation_drafts(created_at);
CREATE INDEX IF NOT EXISTS idx_consultation_drafts_status ON consultation_drafts(status);

CREATE INDEX IF NOT EXISTS idx_audit_logs_doctor ON audit_logs(doctor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_patient ON audit_logs(patient_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);
