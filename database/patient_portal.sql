-- Patient portal extension for SaludClick.
-- Safe to run after init.sql. It does not delete existing data.

ALTER TYPE appointment_status ADD VALUE IF NOT EXISTS 'confirmed';

CREATE INDEX IF NOT EXISTS idx_appointments_patient_status_date
  ON appointments(patient_id, status, appointment_date);

CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_status_created
  ON prescriptions(patient_id, status, created_at);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created
  ON audit_logs(user_id, created_at);
