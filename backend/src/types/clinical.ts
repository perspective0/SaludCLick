export type UserRole = 'patient' | 'doctor' | 'secretary' | 'admin';
export type AppointmentStatus = 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no-show';
export type PrescriptionStatus = 'active' | 'expired' | 'used' | 'cancelled' | 'voided' | 'anulada' | 'vencida';
export type NotificationStatus = 'unread' | 'read' | 'archived';
export type NotificationType = 'general' | 'appointment' | 'prescription' | 'clinical' | 'payment' | 'system';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T | null;
  error?: unknown;
  message?: string;
  meta?: Record<string, unknown>;
}

export interface Medication {
  name: string;
  presentation?: string;
  dosage: string;
  route?: string;
  frequency: string;
  duration?: string;
  quantity?: string;
  instructions?: string;
}

export interface SOAPNote {
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  status: NotificationStatus;
  priority?: 'low' | 'normal' | 'high';
  createdAt?: string;
}
