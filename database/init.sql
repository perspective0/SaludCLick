-- Create database
CREATE DATABASE saludclick;

-- Connect to database
\c saludclick;

-- Enum types
CREATE TYPE user_role AS ENUM ('patient', 'doctor', 'secretary', 'admin');
CREATE TYPE appointment_status AS ENUM ('scheduled', 'completed', 'cancelled', 'no-show');
CREATE TYPE prescription_status AS ENUM ('active', 'expired', 'used');

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  role user_role NOT NULL DEFAULT 'patient',
  phone VARCHAR(20),
  avatar VARCHAR(255),
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
  emergency_contact VARCHAR(255),
  emergency_phone VARCHAR(20),
  insurance_provider VARCHAR(255),
  insurance_number VARCHAR(255)
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

-- Doctors table
CREATE TABLE doctors (
  id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  health_center_id UUID NOT NULL REFERENCES health_centers(id),
  license_number VARCHAR(50) UNIQUE NOT NULL,
  years_experience INT,
  bio TEXT,
  consultation_price DECIMAL(10, 2),
  is_verified BOOLEAN DEFAULT false,
  specialties TEXT[], -- Array of specialties
  average_rating DECIMAL(3, 2) DEFAULT 0
);

-- Secretaries table
CREATE TABLE secretaries (
  id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Doctor availability table
CREATE TABLE doctor_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
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
CREATE INDEX idx_doctors_user_id ON doctors(id);
CREATE INDEX idx_appointments_patient ON appointments(patient_id);
CREATE INDEX idx_appointments_doctor ON appointments(doctor_id);
CREATE INDEX idx_appointments_date ON appointments(appointment_date);
CREATE INDEX idx_medical_records_patient ON medical_records(patient_id);
CREATE INDEX idx_medical_records_doctor ON medical_records(doctor_id);
CREATE INDEX idx_prescriptions_patient ON prescriptions(patient_id);
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

CREATE TRIGGER update_health_centers_timestamp BEFORE UPDATE ON health_centers
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_appointments_timestamp BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_medical_records_timestamp BEFORE UPDATE ON medical_records
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_prescriptions_timestamp BEFORE UPDATE ON prescriptions
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_reviews_timestamp BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- Sample data
INSERT INTO health_centers (name, address, city, phone, email, description) VALUES
  ('Centro de Salud Central', 'Calle Principal 123', 'La Capital', '555-1001', 'central@healthcenter.com', 'Centro médico principal con todas las especialidades'),
  ('Clínica del Norte', 'Avenida Norte 456', 'La Capital', '555-1002', 'norte@healthcenter.com', 'Especializada en cardiología'),
  ('Centro Médico Sur', 'Boulevard Sur 789', 'La Capital', '555-1003', 'sur@healthcenter.com', 'Atención integral en medicina general');

COMMIT;

-- Doctor requests (doctors who request access / subscription)
CREATE TABLE IF NOT EXISTS doctor_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  clinic VARCHAR(255),
  license_number VARCHAR(100),
  message TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMIT;
