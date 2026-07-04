-- Allow a doctor to work in more than one health center while keeping
-- doctors.health_center_id as the primary/default center for compatibility.

CREATE TABLE IF NOT EXISTS doctor_health_centers (
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  health_center_id UUID NOT NULL REFERENCES health_centers(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (doctor_id, health_center_id)
);

INSERT INTO doctor_health_centers (doctor_id, health_center_id, is_primary)
SELECT id, health_center_id, true
FROM doctors
WHERE health_center_id IS NOT NULL
ON CONFLICT (doctor_id, health_center_id) DO UPDATE
SET is_primary = doctor_health_centers.is_primary OR EXCLUDED.is_primary;

ALTER TABLE doctor_availability
ADD COLUMN IF NOT EXISTS health_center_id UUID REFERENCES health_centers(id) ON DELETE CASCADE;

UPDATE doctor_availability da
SET health_center_id = d.health_center_id
FROM doctors d
WHERE da.doctor_id = d.id
  AND da.health_center_id IS NULL
  AND d.health_center_id IS NOT NULL;

ALTER TABLE prescriptions
ADD COLUMN IF NOT EXISTS health_center_id UUID REFERENCES health_centers(id) ON DELETE SET NULL;

UPDATE prescriptions p
SET health_center_id = d.health_center_id
FROM doctors d
WHERE p.doctor_id = d.id
  AND p.health_center_id IS NULL
  AND d.health_center_id IS NOT NULL;

-- Old rows could have the center name saved as the doctor's seal.
UPDATE prescriptions p
SET doctor_seal = NULL
FROM health_centers hc
WHERE p.doctor_seal = hc.name;

CREATE INDEX IF NOT EXISTS idx_doctor_health_centers_doctor ON doctor_health_centers(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_health_centers_center ON doctor_health_centers(health_center_id);
CREATE INDEX IF NOT EXISTS idx_doctor_availability_center ON doctor_availability(health_center_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_health_center ON prescriptions(health_center_id);
