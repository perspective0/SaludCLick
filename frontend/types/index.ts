export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'patient' | 'doctor' | 'secretary' | 'admin';
  avatar?: string;
}

export interface Doctor extends User {
  specialties: string[];
  bio?: string;
  yearsExperience: number;
  consultationPrice: number;
  rating: number;
  healthCenterId: string;
  licenseNumber: string;
}

export interface Patient extends User {
  dateOfBirth?: Date;
  gender?: string;
  bloodType?: string;
  address?: string;
  city?: string;
}

export interface HealthCenter {
  id: string;
  name: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  image?: string;
  description?: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  healthCenterId: string;
  date: Date;
  time: string;
  duration: number;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-show';
  reason?: string;
  notes?: string;
}

export interface MedicalRecord {
  id: string;
  patientId: string;
  doctorId: string;
  diagnosis: string;
  treatment: string;
  notes?: string;
  createdAt: Date;
}

export interface Prescription {
  id: string;
  patientId: string;
  doctorId: string;
  medications: Medication[];
  expiryDate: Date;
  status: 'active' | 'expired' | 'used';
  createdAt: Date;
}

export interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}
