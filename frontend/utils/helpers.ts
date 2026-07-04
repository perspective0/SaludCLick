/**
 * Format date to DD/MM/YYYY
 */
export function formatDate(date: Date | string): string {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Format date to YYYY-MM-DD (for input type="date")
 */
export function formatDateISO(date: Date | string): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format time to HH:mm
 */
export function formatTime(time: string): string {
  if (!time) return '';
  const [hours, minutes] = time.split(':');
  return `${hours}:${minutes}`;
}

/**
 * Format currency
 */
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Parse JWT token
 */
export function parseToken(token: string): any {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    return null;
  }
}

/**
 * Get initials from name
 */
export function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

/**
 * Get full name
 */
export function getFullName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim();
}

/**
 * Get full name from the authenticated user shape used in localStorage/store
 */
export function getUserFullName(user?: { firstName?: string; lastName?: string } | null, fallback: string = 'Usuario'): string {
  const fullName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim();
  return fullName || user?.firstName || fallback;
}

/**
 * Get greeting based on the user's local time
 */
export function getTimeGreeting(date: Date = new Date()): string {
  const hour = date.getHours();

  if (hour < 12) return 'Buenos días';
  if (hour < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

/**
 * Build a personalized greeting for dashboard headers
 */
export function getUserGreeting(user?: { firstName?: string; lastName?: string } | null, fallback: string = 'Usuario'): string {
  return `${getTimeGreeting()}, ${getUserFullName(user, fallback)}`;
}

/**
 * Validate email
 */
export function validateEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

/**
 * Validate password
 */
export function validatePassword(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('La contraseña debe tener al menos 8 caracteres');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('La contraseña debe contener mayúsculas');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('La contraseña debe contener minúsculas');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('La contraseña debe contener números');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Truncate text
 */
export function truncateText(text: string, length: number = 100): string {
  if (text.length <= length) return text;
  return text.substring(0, length) + '...';
}

/**
 * Delay function (for testing)
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Get day name in Spanish
 */
export function getDayName(dayIndex: number): string {
  const days = [
    'Lunes',
    'Martes',
    'Miércoles',
    'Jueves',
    'Viernes',
    'Sábado',
    'Domingo',
  ];
  return days[dayIndex] || '';
}

/**
 * Get month name in Spanish
 */
export function getMonthName(monthIndex: number): string {
  const months = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ];
  return months[monthIndex] || '';
}
