export function digitsOnly(value: string) {
  return String(value || '').replace(/\D/g, '');
}

export function maskPhone(value: string) {
  const digits = digitsOnly(value);
  const raw = (digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits).slice(0, 10);
  if (!raw) return '';
  if (raw.length <= 3) return `+1 ${raw}`;
  if (raw.length <= 6) return `+1 ${raw.slice(0, 3)}-${raw.slice(3)}`;
  return `+1 ${raw.slice(0, 3)}-${raw.slice(3, 6)}-${raw.slice(6)}`;
}

export function maskDominicanId(value: string) {
  const raw = digitsOnly(value).slice(0, 11);
  if (raw.length <= 3) return raw;
  if (raw.length <= 10) return `${raw.slice(0, 3)}-${raw.slice(3)}`;
  return `${raw.slice(0, 3)}-${raw.slice(3, 10)}-${raw.slice(10)}`;
}

export function maskPostalCode(value: string) {
  return digitsOnly(value).slice(0, 10);
}

export function maskInsuranceNumber(value: string) {
  return String(value || '').replace(/[^a-zA-Z0-9\-\s]/g, '').slice(0, 40);
}

export function maskLicenseNumber(value: string) {
  return String(value || '').replace(/[^a-zA-Z0-9\-\/]/g, '').toUpperCase().slice(0, 40);
}
