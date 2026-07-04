export type MedicationInput = {
  name?: string;
  medication?: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
};

import { isUuid, validateOptionalText } from './commonValidators';

export function validateMedicationList(medications: MedicationInput[]) {
  if (!Array.isArray(medications) || medications.length === 0) return 'At least one medication is required';
  if (medications.length > 30) return 'Too many medications';

  for (const item of medications) {
    if (!String(item.name || item.medication || '').trim()) return 'Medication name is required';
    if (!String(item.dosage || '').trim()) return 'Medication dosage is required';
    if (!String(item.frequency || '').trim()) return 'Medication frequency is required';
    if (validateOptionalText(item.name || item.medication, 'Medication name', 180)) return 'Medication name is too long';
    if (validateOptionalText(item.dosage, 'Medication dosage', 120)) return 'Medication dosage is too long';
    if (validateOptionalText(item.frequency, 'Medication frequency', 120)) return 'Medication frequency is too long';
    if (validateOptionalText(item.duration, 'Medication duration', 120)) return 'Medication duration is too long';
  }

  return null;
}

export function validateLabOrderInput(input: {
  patientId?: string;
  medicalRecordId?: string;
  laboratoryId?: string;
  healthCenterId?: string;
  diagnosis?: string;
  icd10Code?: string;
  notes?: string;
  studies?: unknown;
}) {
  if (!isUuid(input.patientId)) return 'Invalid patientId';
  if (input.medicalRecordId && !isUuid(input.medicalRecordId)) return 'Invalid medicalRecordId';
  if (input.laboratoryId && !isUuid(input.laboratoryId)) return 'Invalid laboratoryId';
  if (input.healthCenterId && !isUuid(input.healthCenterId)) return 'Invalid healthCenterId';
  if (validateOptionalText(input.diagnosis, 'Diagnosis', 500)) return 'Diagnosis is too long';
  if (validateOptionalText(input.icd10Code, 'ICD-10 code', 30)) return 'ICD-10 code is too long';
  if (validateOptionalText(input.notes, 'Notes', 1500)) return 'Notes are too long';
  if (!Array.isArray(input.studies) || input.studies.length === 0) return 'Agrega al menos una analítica o estudio';
  if (input.studies.length > 80) return 'Too many studies';
  return null;
}

export function validatePatientProfileUpdate(input: {
  phone?: string;
  emergencyPhone?: string;
  dateOfBirth?: string;
}) {
  if (input.phone && String(input.phone).length > 30) return 'Phone is too long';
  if (input.emergencyPhone && String(input.emergencyPhone).length > 30) return 'Emergency phone is too long';
  if (input.dateOfBirth && Number.isNaN(Date.parse(input.dateOfBirth))) return 'Invalid birth date';
  return null;
}
