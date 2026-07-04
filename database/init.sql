-- Create database
CREATE DATABASE saludclick;

-- Connect to database
\c saludclick;

-- Enum types
CREATE TYPE user_role AS ENUM ('patient', 'doctor', 'secretary', 'admin');
CREATE TYPE appointment_status AS ENUM ('scheduled', 'confirmed', 'completed', 'cancelled', 'no-show');
CREATE TYPE prescription_status AS ENUM ('active', 'expired', 'used', 'cancelled');

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  role user_role NOT NULL DEFAULT 'patient',
  phone VARCHAR(20),
  avatar TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

-- Patients table
CREATE TABLE patients (
  id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  date_of_birth DATE,
  gender VARCHAR(10),
  blood_type VARCHAR(5),
  address TEXT,
  city VARCHAR(100),
  medical_history TEXT,
  document_number VARCHAR(30),
  emergency_contact VARCHAR(255),
  emergency_phone VARCHAR(20),
  has_insurance BOOLEAN DEFAULT false,
  insurance_provider VARCHAR(255),
  insurance_number VARCHAR(255),
  manual_patient_created_by_doctor_id UUID,
  manual_patient_created_at TIMESTAMP,
  account_claimed_at TIMESTAMP
);

-- Health centers table
CREATE TABLE health_centers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100),
  postal_code VARCHAR(10),
  phone VARCHAR(20),
  email VARCHAR(255),
  image VARCHAR(255),
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Laboratories table
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
);

-- Doctors table
CREATE TABLE doctors (
  id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  health_center_id UUID NOT NULL REFERENCES health_centers(id),
  license_number VARCHAR(50) UNIQUE NOT NULL,
  years_experience INT,
  bio TEXT,
  consultation_price DECIMAL(10, 2),
  consultation_duration INT DEFAULT 30,
  teleconsultation_enabled BOOLEAN DEFAULT false,
  vacation_mode BOOLEAN DEFAULT false,
  document_number VARCHAR(50),
  id_front_image TEXT,
  id_back_image TEXT,
  exequatur_image TEXT,
  specialty_proof_image TEXT,
  prescription_logo TEXT,
  documents_submitted_at TIMESTAMP,
  is_verified BOOLEAN DEFAULT false,
  specialties TEXT[], -- Array of specialties
  average_rating DECIMAL(3, 2) DEFAULT 0
);

CREATE TABLE IF NOT EXISTS doctor_health_centers (
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  health_center_id UUID NOT NULL REFERENCES health_centers(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (doctor_id, health_center_id)
);

-- Secretaries table
CREATE TABLE secretaries (
  id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id, doctor_id)
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'secretaries_pkey'
      AND conrelid = 'secretaries'::regclass
      AND pg_get_constraintdef(oid) = 'PRIMARY KEY (id)'
  ) THEN
    ALTER TABLE secretaries DROP CONSTRAINT secretaries_pkey;
    ALTER TABLE secretaries ADD CONSTRAINT secretaries_pkey PRIMARY KEY (id, doctor_id);
  END IF;
END $$;

-- Appointments table
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id),
  doctor_id UUID NOT NULL REFERENCES doctors(id),
  health_center_id UUID NOT NULL REFERENCES health_centers(id),
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  duration INT DEFAULT 30, -- minutes
  status appointment_status DEFAULT 'scheduled',
  appointment_type VARCHAR(20) DEFAULT 'presencial' CHECK (appointment_type IN ('presencial', 'teleconsulta')),
  video_room_url TEXT,
  video_room_id UUID,
  reason_for_visit TEXT,
  notes TEXT,
  canceled_at TIMESTAMP,
  canceled_by UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Medical records table
CREATE TABLE medical_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id),
  doctor_id UUID NOT NULL REFERENCES doctors(id),
  appointment_id UUID REFERENCES appointments(id),
  diagnosis TEXT NOT NULL,
  icd10_code VARCHAR(20),
  treatment TEXT,
  symptoms TEXT,
  vital_signs JSONB,
  notes TEXT,
  files TEXT[], -- Array of file URLs
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Prescriptions table
CREATE TABLE prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id),
  doctor_id UUID NOT NULL REFERENCES doctors(id),
  medical_record_id UUID NOT NULL REFERENCES medical_records(id),
  medications JSONB NOT NULL, -- Array of medications
  notes TEXT,
  expiry_date DATE,
  status prescription_status DEFAULT 'active',
  diagnosis TEXT,
  issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  validation_code VARCHAR(64),
  doctor_signature TEXT,
  doctor_seal TEXT,
  license_number VARCHAR(80),
  cancelled_at TIMESTAMP,
  cancelled_reason TEXT,
  health_center_id UUID REFERENCES health_centers(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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
  digital_seal_enabled BOOLEAN DEFAULT false,
  issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  cancelled_at TIMESTAMP,
  cancelled_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CHECK (order_type IN ('laboratory', 'imaging', 'procedure')),
  CHECK (priority IN ('routine', 'normal', 'urgent'))
);

-- Doctor availability table
CREATE TABLE doctor_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  health_center_id UUID REFERENCES health_centers(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL, -- 0 = Monday, 6 = Sunday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_break BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Reviews/Ratings table
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id),
  doctor_id UUID NOT NULL REFERENCES doctors(id),
  appointment_id UUID REFERENCES appointments(id),
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_patients_user_id ON patients(id);
CREATE INDEX idx_doctors_health_center ON doctors(health_center_id);
CREATE INDEX IF NOT EXISTS idx_laboratories_city ON laboratories(city);
CREATE INDEX IF NOT EXISTS idx_laboratories_active ON laboratories(is_active);
CREATE INDEX IF NOT EXISTS idx_doctor_health_centers_doctor ON doctor_health_centers(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_health_centers_center ON doctor_health_centers(health_center_id);
CREATE INDEX idx_doctors_user_id ON doctors(id);
CREATE INDEX idx_appointments_patient ON appointments(patient_id);
CREATE INDEX idx_appointments_doctor ON appointments(doctor_id);
CREATE INDEX idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_video_room ON appointments(video_room_id);
CREATE INDEX idx_medical_records_patient ON medical_records(patient_id);
CREATE INDEX idx_medical_records_doctor ON medical_records(doctor_id);
CREATE INDEX idx_prescriptions_patient ON prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_doctor ON prescriptions(doctor_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_record ON prescriptions(medical_record_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_prescriptions_validation_code ON prescriptions(validation_code);
CREATE INDEX IF NOT EXISTS idx_prescriptions_status ON prescriptions(status);
CREATE INDEX IF NOT EXISTS idx_prescriptions_created ON prescriptions(created_at);
CREATE INDEX IF NOT EXISTS idx_prescriptions_health_center ON prescriptions(health_center_id);
CREATE INDEX IF NOT EXISTS idx_lab_orders_patient ON lab_orders(patient_id);
CREATE INDEX IF NOT EXISTS idx_lab_orders_doctor ON lab_orders(doctor_id);
CREATE INDEX IF NOT EXISTS idx_lab_orders_code ON lab_orders(validation_code);

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
);
CREATE INDEX IF NOT EXISTS idx_study_catalog_active ON study_catalog(is_active);
CREATE INDEX IF NOT EXISTS idx_study_catalog_type ON study_catalog(study_type);

CREATE TABLE IF NOT EXISTS icd10_catalog (
  code VARCHAR(12) PRIMARY KEY,
  description TEXT NOT NULL,
  chapter VARCHAR(80),
  block VARCHAR(40),
  keywords TEXT[] DEFAULT '{}',
  search_text TEXT,
  is_active BOOLEAN DEFAULT true,
  source VARCHAR(120),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_icd10_catalog_active ON icd10_catalog(is_active);
CREATE INDEX IF NOT EXISTS idx_icd10_catalog_code ON icd10_catalog(code);
CREATE INDEX IF NOT EXISTS idx_icd10_catalog_search_text ON icd10_catalog USING gin(to_tsvector('spanish', COALESCE(search_text, '')));
CREATE INDEX IF NOT EXISTS idx_doctor_availability_center ON doctor_availability(health_center_id);
CREATE INDEX idx_reviews_doctor ON reviews(doctor_id);

-- Update trigger for updated_at columns
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_timestamp BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

ALTER TABLE users ALTER COLUMN avatar TYPE TEXT;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS consultation_duration INT DEFAULT 30;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS teleconsultation_enabled BOOLEAN DEFAULT false;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS vacation_mode BOOLEAN DEFAULT false;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS document_number VARCHAR(50);
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS id_front_image TEXT;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS id_back_image TEXT;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS exequatur_image TEXT;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS specialty_proof_image TEXT;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS prescription_logo TEXT;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS documents_submitted_at TIMESTAMP;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS appointment_type VARCHAR(20) DEFAULT 'presencial';
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS video_room_url TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS video_room_id UUID;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS document_number VARCHAR(30);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS has_insurance BOOLEAN DEFAULT false;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS insurance_provider VARCHAR(255);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS insurance_number VARCHAR(255);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS manual_patient_created_by_doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS manual_patient_created_at TIMESTAMP;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS account_claimed_at TIMESTAMP;
ALTER TABLE medical_records ADD COLUMN IF NOT EXISTS icd10_code VARCHAR(20);
ALTER TABLE lab_orders ADD COLUMN IF NOT EXISTS icd10_code VARCHAR(20);
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS health_center_id UUID REFERENCES health_centers(id) ON DELETE SET NULL;
ALTER TABLE doctor_availability ADD COLUMN IF NOT EXISTS health_center_id UUID REFERENCES health_centers(id) ON DELETE CASCADE;
INSERT INTO doctor_health_centers (doctor_id, health_center_id, is_primary)
SELECT id, health_center_id, true
FROM doctors
WHERE health_center_id IS NOT NULL
ON CONFLICT (doctor_id, health_center_id) DO UPDATE
SET is_primary = doctor_health_centers.is_primary OR EXCLUDED.is_primary;
UPDATE prescriptions p
SET health_center_id = d.health_center_id
FROM doctors d
WHERE p.doctor_id = d.id
  AND p.health_center_id IS NULL
  AND d.health_center_id IS NOT NULL;
UPDATE prescriptions p
SET doctor_seal = NULL
FROM health_centers hc
WHERE p.doctor_seal = hc.name;
UPDATE doctor_availability da
SET health_center_id = d.health_center_id
FROM doctors d
WHERE da.doctor_id = d.id
  AND da.health_center_id IS NULL
  AND d.health_center_id IS NOT NULL;
UPDATE appointments SET appointment_type = 'presencial' WHERE appointment_type IS NULL;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'appointments_type_check') THEN
    ALTER TABLE appointments ADD CONSTRAINT appointments_type_check CHECK (appointment_type IN ('presencial', 'teleconsulta')) NOT VALID;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_appointments_video_room ON appointments(video_room_id);

CREATE TRIGGER update_health_centers_timestamp BEFORE UPDATE ON health_centers
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_laboratories_timestamp BEFORE UPDATE ON laboratories
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_appointments_timestamp BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_medical_records_timestamp BEFORE UPDATE ON medical_records
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_prescriptions_timestamp BEFORE UPDATE ON prescriptions
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_lab_orders_timestamp BEFORE UPDATE ON lab_orders
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_reviews_timestamp BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- Clinical extension tables
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

-- Sample data
INSERT INTO health_centers (name, address, city, phone, email, description) VALUES
  ('Centro de Salud Central', 'Calle Principal 123', 'La Capital', '555-1001', 'central@healthcenter.com', 'Centro médico principal con todas las especialidades'),
  ('Clínica del Norte', 'Avenida Norte 456', 'La Capital', '555-1002', 'norte@healthcenter.com', 'Especializada en cardiología'),
  ('Centro Médico Sur', 'Boulevard Sur 789', 'La Capital', '555-1003', 'sur@healthcenter.com', 'Atención integral en medicina general');

INSERT INTO laboratories (name, address, city, phone, email, website, description, services) VALUES
  ('Laboratorio SaludClick Central', 'Calle Diagnóstico 12', 'La Capital', '555-2001', 'labcentral@saludclick.com', 'https://saludclick.com', 'Laboratorio clínico general para análisis de rutina y pruebas especializadas', ARRAY['Hemograma', 'Química sanguínea', 'Pruebas hormonales']),
  ('Lab Norte Diagnóstico', 'Avenida Norte 88', 'La Capital', '555-2002', 'contacto@labnorte.com', 'https://labnorte.com', 'Servicios de laboratorio clínico con toma de muestras', ARRAY['Perfil lipídico', 'Uroanálisis', 'Microbiología']);

INSERT INTO study_catalog (name, study_type, area, preparation) VALUES
  ('Hemograma completo', 'laboratory', 'Hematologia', 'No requiere preparacion especial.'),
  ('Glicemia en ayunas', 'laboratory', 'Quimica sanguinea', 'Ayuno de 8 horas.'),
  ('Perfil lipidico', 'laboratory', 'Quimica sanguinea', 'Ayuno de 12 horas.'),
  ('Perfil hepatico', 'laboratory', 'Quimica sanguinea', 'Ayuno de 8 horas si el laboratorio lo solicita.'),
  ('Perfil renal', 'laboratory', 'Quimica sanguinea', 'No requiere preparacion especial salvo indicacion medica.'),
  ('Perfil tiroideo', 'laboratory', 'Endocrinologia', 'Informar medicamentos tiroideos en uso.'),
  ('Uroanalisis', 'laboratory', 'Orina', 'Preferible primera orina de la manana.'),
  ('Coprologico', 'laboratory', 'Heces', 'Recolectar muestra en recipiente esteril.'),
  ('Radiografia de torax PA', 'imaging', 'Torax', 'Retirar objetos metalicos del area.'),
  ('Sonografia abdominal', 'imaging', 'Abdomen', 'Ayuno de 6 a 8 horas.'),
  ('Tomografia de abdomen', 'imaging', 'Abdomen', 'Confirmar si requiere contraste y ayuno.'),
  ('Resonancia magnetica lumbar', 'imaging', 'Columna lumbar', 'Retirar objetos metalicos e informar implantes.')
ON CONFLICT (name) DO NOTHING;

INSERT INTO icd10_catalog (code, description, chapter, block, keywords, search_text, source) VALUES
  ('E11', 'Diabetes mellitus tipo 2', 'IV', 'E10-E14', ARRAY['diabetes tipo 2', 'dm2', 'diabetes no insulinodependiente'], 'E11 Diabetes mellitus tipo 2 diabetes tipo 2 dm2 diabetes no insulinodependiente', 'saludclick-seed'),
  ('E10', 'Diabetes mellitus tipo 1', 'IV', 'E10-E14', ARRAY['diabetes tipo 1', 'dm1', 'diabetes insulinodependiente'], 'E10 Diabetes mellitus tipo 1 diabetes tipo 1 dm1 diabetes insulinodependiente', 'saludclick-seed'),
  ('I10', 'Hipertension esencial primaria', 'IX', 'I10-I15', ARRAY['hipertension arterial', 'hta', 'presion alta'], 'I10 Hipertension esencial primaria hipertension arterial hta presion alta', 'saludclick-seed'),
  ('E78.5', 'Hiperlipidemia no especificada', 'IV', 'E78', ARRAY['dislipidemia', 'colesterol alto', 'trigliceridos altos'], 'E78.5 Hiperlipidemia no especificada dislipidemia colesterol alto trigliceridos altos', 'saludclick-seed'),
  ('N39.0', 'Infeccion de vias urinarias', 'XIV', 'N30-N39', ARRAY['infeccion urinaria', 'itu', 'cistitis'], 'N39.0 Infeccion de vias urinarias infeccion urinaria itu cistitis', 'saludclick-seed')
ON CONFLICT (code) DO NOTHING;

COMMIT;

-- Doctor requests (doctors who request access / subscription)
CREATE TABLE IF NOT EXISTS doctor_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  clinic VARCHAR(255),
  requested_health_center_id UUID REFERENCES health_centers(id) ON DELETE SET NULL,
  requested_health_center_mode VARCHAR(30) DEFAULT 'existing',
  document_number VARCHAR(50),
  id_front_image TEXT,
  id_back_image TEXT,
  exequatur_image TEXT,
  specialty_proof_image TEXT,
  license_number VARCHAR(100),
  exequatur VARCHAR(100),
  specialty VARCHAR(160),
  verification_status VARCHAR(30) DEFAULT 'pending_review',
  verification_score INTEGER DEFAULT 0,
  verification_source TEXT,
  verification_message TEXT,
  verification_checked_at TIMESTAMP,
  verification_payload JSONB,
  manual_verification_status VARCHAR(30),
  manual_verification_notes TEXT,
  manual_verified_by UUID,
  manual_verified_at TIMESTAMP,
  message TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_settings (
  section VARCHAR(50) PRIMARY KEY,
  settings JSONB NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS feedback_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  type VARCHAR(30) NOT NULL,
  audience VARCHAR(30) NOT NULL DEFAULT 'general',
  subject VARCHAR(160) NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'new',
  admin_response TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP
);

COMMIT;
