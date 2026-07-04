const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value?: string | null) {
  return Boolean(value && uuidPattern.test(value));
}

export function requireUuid(value: string | undefined, fieldName = 'id') {
  if (!isUuid(value)) return `Invalid ${fieldName}`;
  return null;
}

export function isAllowedValue<T extends readonly string[]>(value: unknown, allowed: T) {
  return typeof value === 'string' && allowed.includes(value);
}

export function parsePositiveInt(value: unknown, fallback: number, max = 100) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(Math.floor(parsed), max);
}

export function isSafeText(value: unknown, maxLength = 1000) {
  if (value === undefined || value === null) return true;
  if (typeof value !== 'string') return false;
  return value.length <= maxLength && !/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(value);
}

export function validateOptionalText(value: unknown, fieldName: string, maxLength = 1000) {
  return isSafeText(value, maxLength) ? null : `${fieldName} is invalid or too long`;
}
