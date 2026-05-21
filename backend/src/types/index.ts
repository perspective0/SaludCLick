// User roles
export enum UserRole {
  PATIENT = 'patient',
  DOCTOR = 'doctor',
  SECRETARY = 'secretary',
  ADMIN = 'admin',
}

// User interface
export interface User {
  id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  phone?: string;
  avatar?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Doctor interface
export interface Doctor extends User {
  specialties: string[];
  healthCenterId: string;
  licenseNumber: string;
  yearsExperience: number;
  bio?: string;
  consultationPrice: number;
  availability: AvailabilitySlot[];
}

// Patient interface
export interface Patient extends User {
  dateOfBirth?: Date;
  gender?: string;
  bloodType?: string;
  address?: string;
  city?: string;
  medicalHistory?: string;
}

// Health Center
export interface HealthCenter {
  id: string;
  name: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  image?: string;
  doctors?: Doctor[];
}

// Appointment
export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  date: Date;
  time: string;
  duration: number;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-show';
  reason?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Medical Record
export interface MedicalRecord {
  id: string;
  patientId: string;
  doctorId: string;
  appointmentId?: string;
  diagnosis: string;
  treatment: string;
  notes?: string;
  files?: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Prescription
export interface Prescription {
  id: string;
  patientId: string;
  doctorId: string;
  medicalRecordId: string;
  medications: Medication[];
  notes?: string;
  expiryDate: Date;
  status: 'active' | 'expired' | 'used';
  createdAt: Date;
  updatedAt: Date;
}

// Medication
export interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

// Availability Slot
export interface AvailabilitySlot {
  dayOfWeek: number; // 0-6
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  isBreak?: boolean;
}

// JWT Payload
export interface JWTPayload {
  id: string;
  email: string;
  role: UserRole;
}

// API Response
export interface APIResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}
