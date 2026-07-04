-- Scalability indexes for clinical dashboards and future multi-clinic filtering.
-- Safe to run on existing databases.

CREATE INDEX IF NOT EXISTS idx_appointments_doctor_status_date
  ON appointments(doctor_id, status, appointment_date, appointment_time);

CREATE INDEX IF NOT EXISTS idx_appointments_health_center_date
  ON appointments(health_center_id, appointment_date);

CREATE INDEX IF NOT EXISTS idx_medical_records_patient_created
  ON medical_records(patient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_medical_records_doctor_created
  ON medical_records(doctor_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_patient_diagnoses_patient_date
  ON patient_diagnoses(patient_id, diagnosis_date DESC);

CREATE INDEX IF NOT EXISTS idx_vital_signs_patient_measured
  ON vital_signs(patient_id, measured_at DESC);

CREATE INDEX IF NOT EXISTS idx_consultation_drafts_doctor_status_updated
  ON consultation_drafts(doctor_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created
  ON audit_logs(user_id, created_at DESC);
