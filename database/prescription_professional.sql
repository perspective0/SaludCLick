-- Professional prescriptions extension for SaludClick.
-- Safe to run on an existing database.

ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS diagnosis TEXT;
ALTER TYPE prescription_status ADD VALUE IF NOT EXISTS 'cancelled';
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS validation_code VARCHAR(64);
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS doctor_signature TEXT;
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS doctor_seal TEXT;
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS license_number VARCHAR(80);
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS digital_seal_enabled BOOLEAN DEFAULT false;
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS document_hash VARCHAR(128);
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS document_hash_algorithm VARCHAR(20) DEFAULT 'SHA-256';
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS document_hash_generated_at TIMESTAMP;
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP;
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS cancelled_reason TEXT;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS prescription_logo TEXT;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS cmd_number VARCHAR(80);
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS prescription_seal TEXT;

UPDATE prescriptions
SET validation_code = UPPER(REPLACE(gen_random_uuid()::text, '-', ''))
WHERE validation_code IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_prescriptions_validation_code ON prescriptions(validation_code);
CREATE INDEX IF NOT EXISTS idx_prescriptions_doctor ON prescriptions(doctor_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_record ON prescriptions(medical_record_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_status ON prescriptions(status);
CREATE INDEX IF NOT EXISTS idx_prescriptions_created ON prescriptions(created_at);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'prescriptions_status_check') THEN
    ALTER TABLE prescriptions ADD CONSTRAINT prescriptions_status_check CHECK (status IN ('active', 'expired', 'used', 'cancelled', 'voided', 'anulada', 'vencida')) NOT VALID;
  END IF;
END $$;
