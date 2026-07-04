import { query } from '../db';

export type DoctorVerificationInput = {
  firstName?: string;
  lastName?: string;
  fullName: string;
  exequatur: string;
  specialty?: string;
};

export type DoctorVerificationResult = {
  status: 'verified' | 'pending_review' | 'rejected';
  score: number;
  source: string;
  message: string;
  checkedAt: string;
  matchedName?: string;
  raw?: any;
};

const SNS_EXEQUATUR_URL = 'https://sns.gob.do/herramientas-de-consulta/consulta-de-exequatur/';

export async function ensureDoctorVerificationColumns() {
  await query(`
    ALTER TABLE doctor_requests
      ADD COLUMN IF NOT EXISTS first_name VARCHAR(100),
      ADD COLUMN IF NOT EXISTS last_name VARCHAR(100),
      ADD COLUMN IF NOT EXISTS specialty VARCHAR(160),
      ADD COLUMN IF NOT EXISTS exequatur VARCHAR(100),
      ADD COLUMN IF NOT EXISTS requested_health_center_id UUID REFERENCES health_centers(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS requested_health_center_mode VARCHAR(30) DEFAULT 'existing',
      ADD COLUMN IF NOT EXISTS document_number VARCHAR(50),
      ADD COLUMN IF NOT EXISTS id_front_image TEXT,
      ADD COLUMN IF NOT EXISTS id_back_image TEXT,
      ADD COLUMN IF NOT EXISTS exequatur_image TEXT,
      ADD COLUMN IF NOT EXISTS specialty_proof_image TEXT,
      ADD COLUMN IF NOT EXISTS verification_status VARCHAR(30) DEFAULT 'pending_review',
      ADD COLUMN IF NOT EXISTS verification_score INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS verification_source TEXT,
      ADD COLUMN IF NOT EXISTS verification_message TEXT,
      ADD COLUMN IF NOT EXISTS verification_checked_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS verification_payload JSONB,
      ADD COLUMN IF NOT EXISTS manual_verification_status VARCHAR(30),
      ADD COLUMN IF NOT EXISTS manual_verification_notes TEXT,
      ADD COLUMN IF NOT EXISTS manual_verified_by UUID,
      ADD COLUMN IF NOT EXISTS manual_verified_at TIMESTAMP
  `);
}

export async function verifyDoctorExequatur(input: DoctorVerificationInput): Promise<DoctorVerificationResult> {
  const checkedAt = new Date().toISOString();
  const normalizedName = normalizeName(input.fullName);
  const normalizedExequatur = normalizeExequatur(input.exequatur);

  if (!normalizedName || normalizedName.split(' ').length < 2) {
    return {
      status: 'rejected',
      score: 0,
      source: 'local',
      message: 'El nombre completo es obligatorio para validar el exequatur.',
      checkedAt,
    };
  }

  if (!normalizedExequatur || normalizedExequatur.length < 3) {
    return {
      status: 'rejected',
      score: 0,
      source: 'local',
      message: 'El numero de exequatur no tiene un formato valido.',
      checkedAt,
    };
  }

  const external = await tryExternalExequaturLookup(input, normalizedExequatur, checkedAt);
  if (external) return external;

  return {
    status: 'pending_review',
    score: 60,
    source: SNS_EXEQUATUR_URL,
    message: 'Formato valido. No se pudo completar consulta automatica contra SNS; requiere revision administrativa con la fuente oficial y documentos adjuntos.',
    checkedAt,
  };
}

async function tryExternalExequaturLookup(
  input: DoctorVerificationInput,
  normalizedExequatur: string,
  checkedAt: string
): Promise<DoctorVerificationResult | null> {
  const apiUrl = process.env.SNS_EXEQUATUR_API_URL;
  if (!apiUrl) return null;

  try {
    const url = new URL(apiUrl);
    url.searchParams.set('exequatur', normalizedExequatur);
    url.searchParams.set('name', input.fullName);

    const response = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      return null;
    }

    const data: any = await response.json();
    const matchedName = data.name || data.nombre || data.fullName || '';
    const remoteExequatur = normalizeExequatur(data.exequatur || data.license || data.numero || normalizedExequatur);
    const nameScore = calculateNameScore(input.fullName, matchedName);
    const exequaturMatches = remoteExequatur === normalizedExequatur;
    const score = (exequaturMatches ? 60 : 0) + nameScore;

    return {
      status: score >= 85 ? 'verified' : 'pending_review',
      score,
      source: apiUrl,
      message: score >= 85
        ? 'Exequatur y nombre verificados automaticamente.'
        : 'La consulta automatica encontro datos, pero la coincidencia requiere revision.',
      checkedAt,
      matchedName,
      raw: data,
    };
  } catch (err) {
    console.error('SNS exequatur lookup error', err);
    return null;
  }
}

function normalizeExequatur(value: string) {
  return String(value || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

function normalizeName(value: string) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function calculateNameScore(expected: string, actual: string) {
  const expectedParts = new Set(normalizeName(expected).split(' ').filter(Boolean));
  const actualParts = new Set(normalizeName(actual).split(' ').filter(Boolean));
  if (!expectedParts.size || !actualParts.size) return 0;

  let matches = 0;
  expectedParts.forEach((part) => {
    if (actualParts.has(part)) matches += 1;
  });

  return Math.round((matches / expectedParts.size) * 40);
}
