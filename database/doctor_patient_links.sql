-- Explicit relationship between a doctor and a patient.
-- Safe to run on existing SaludClick installations.
CREATE TABLE IF NOT EXISTS doctor_patient_links (
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  linked_by UUID REFERENCES users(id) ON DELETE SET NULL,
  source VARCHAR(30) NOT NULL DEFAULT 'manual',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (doctor_id, patient_id)
);

CREATE INDEX IF NOT EXISTS idx_doctor_patient_links_patient ON doctor_patient_links(patient_id);
