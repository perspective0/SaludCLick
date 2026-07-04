export type VitalSigns = {
  bloodPressure: string;
  temperature: string;
  heartRate: string;
  respiratoryRate: string;
  oxygenSaturation: string;
  weight: string;
  height: string;
};

export type SOAPData = {
  symptoms: string;
  reasonForVisit: string;
  pain: string;
  symptomEvolution: string;
  physicalExam: string;
  objectiveObservations: string;
  primaryDiagnosis: string;
  primaryDiagnosisIcd10: string;
  secondaryDiagnoses: string;
  clinicalImpression: string;
  treatment: string;
  medications: string;
  labs: string;
  instructions: string;
  followUp: string;
};

export type ClinicalPatient = {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  birth_date?: string;
  sex?: string;
  document_number?: string;
};

export const emptyVitalSigns: VitalSigns = {
  bloodPressure: '',
  temperature: '',
  heartRate: '',
  respiratoryRate: '',
  oxygenSaturation: '',
  weight: '',
  height: '',
};

export const emptySOAP: SOAPData = {
  symptoms: '',
  reasonForVisit: '',
  pain: '',
  symptomEvolution: '',
  physicalExam: '',
  objectiveObservations: '',
  primaryDiagnosis: '',
  primaryDiagnosisIcd10: '',
  secondaryDiagnoses: '',
  clinicalImpression: '',
  treatment: '',
  medications: '',
  labs: '',
  instructions: '',
  followUp: '',
};

export function getFullName(patient?: ClinicalPatient | null) {
  if (!patient) return 'Paciente';
  return `${patient.first_name || ''} ${patient.last_name || ''}`.trim() || 'Paciente';
}

export function getAge(birthDate?: string) {
  if (!birthDate) return 'No disponible';
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return 'No disponible';
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDelta = today.getMonth() - birth.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birth.getDate())) age -= 1;
  return `${age} años`;
}

function parseVitalNumber(value: string) {
  const match = value.replace(',', '.').match(/-?\d+(\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

function parseWeightKg(value: string) {
  const parsed = parseVitalNumber(value);
  if (!parsed) return 0;
  return /\b(lb|lbs|libra|libras)\b/i.test(value) ? parsed * 0.45359237 : parsed;
}

function parseHeightMeters(value: string) {
  const feetInches = value.match(/(\d+)\s*(?:ft|pie|pies|')\s*(\d+)?/i);
  if (feetInches) {
    const feet = Number(feetInches[1]);
    const inches = Number(feetInches[2] || 0);
    return (feet * 12 + inches) * 0.0254;
  }

  const parsed = parseVitalNumber(value);
  if (!parsed) return 0;
  return parsed > 3 ? parsed / 100 : parsed;
}

export function calculateBMI(weight: string, height: string) {
  const weightNumber = parseWeightKg(weight);
  const heightMeters = parseHeightMeters(height);
  if (!weightNumber || !heightMeters) return '';
  if (!heightMeters) return '';
  return (weightNumber / (heightMeters * heightMeters)).toFixed(1);
}

export function buildStructuredConsultationNotes(soap: SOAPData) {
  return [
    `Subjetivo: ${soap.symptoms || soap.reasonForVisit || 'No registrado'}`,
    soap.pain && `Dolor: ${soap.pain}`,
    soap.symptomEvolution && `Evolucion sintomas: ${soap.symptomEvolution}`,
    `Objetivo: ${soap.physicalExam || 'No registrado'}`,
    soap.objectiveObservations && `Observaciones: ${soap.objectiveObservations}`,
    `Analisis: ${soap.primaryDiagnosis || 'No registrado'}`,
    soap.primaryDiagnosisIcd10 && `CIE-10: ${soap.primaryDiagnosisIcd10}`,
    soap.secondaryDiagnoses && `Diagnosticos secundarios: ${soap.secondaryDiagnoses}`,
    soap.clinicalImpression && `Impresion clinica: ${soap.clinicalImpression}`,
    `Plan: ${soap.treatment || 'No registrado'}`,
    soap.medications && `Medicamentos: ${soap.medications}`,
    soap.labs && `Laboratorios: ${soap.labs}`,
    soap.instructions && `Indicaciones: ${soap.instructions}`,
    soap.followUp && `Seguimiento: ${soap.followUp}`,
  ].filter(Boolean).join('\n\n');
}
