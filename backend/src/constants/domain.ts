export const USER_ROLES = ['patient', 'doctor', 'secretary', 'admin'] as const;

export const APPOINTMENT_STATUSES = ['scheduled', 'confirmed', 'completed', 'cancelled', 'no-show'] as const;

export const PRESCRIPTION_STATUSES = ['active', 'expired', 'used', 'cancelled', 'voided', 'anulada', 'vencida'] as const;

export const NOTIFICATION_TYPES = ['general', 'appointment', 'prescription', 'clinical', 'payment', 'system'] as const;

export const NOTIFICATION_STATUSES = ['unread', 'read', 'archived'] as const;

export const NOTIFICATION_PRIORITIES = ['low', 'normal', 'high'] as const;

export const NOTIFICATION_CHANNELS = ['in_app', 'email', 'whatsapp'] as const;

export type UserRole = typeof USER_ROLES[number];
export type AppointmentStatus = typeof APPOINTMENT_STATUSES[number];
export type PrescriptionStatus = typeof PRESCRIPTION_STATUSES[number];
export type NotificationType = typeof NOTIFICATION_TYPES[number];
