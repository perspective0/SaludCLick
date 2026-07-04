const DOCTOR_PREFIX_PATTERN = /^(dr\.?|dra\.?|doctor|doctora)\s+/i;

export function stripDoctorPrefix(value?: string | null) {
  return String(value || '').trim().replace(DOCTOR_PREFIX_PATTERN, '').trim();
}

export function formatPersonName(firstName?: string | null, lastName?: string | null) {
  return [firstName, lastName].map((part) => String(part || '').trim()).filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
}

export function formatDoctorName(firstName?: string | null, lastName?: string | null, title = true) {
  const cleanFirstName = stripDoctorPrefix(firstName);
  const cleanFullName = stripDoctorPrefix(formatPersonName(cleanFirstName, lastName));

  if (!cleanFullName) return title ? 'Dr. Médico' : 'Médico';
  return title ? `Dr. ${cleanFullName}` : cleanFullName;
}
