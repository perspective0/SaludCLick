export declare enum UserRole {
    PATIENT = "patient",
    DOCTOR = "doctor",
    SECRETARY = "secretary",
    ADMIN = "admin"
}
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
export interface Doctor extends User {
    specialties: string[];
    healthCenterId: string;
    licenseNumber: string;
    yearsExperience: number;
    bio?: string;
    consultationPrice: number;
    availability: AvailabilitySlot[];
}
export interface Patient extends User {
    dateOfBirth?: Date;
    gender?: string;
    bloodType?: string;
    address?: string;
    city?: string;
    medicalHistory?: string;
}
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
export interface Medication {
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions?: string;
}
export interface AvailabilitySlot {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    isBreak?: boolean;
}
export interface JWTPayload {
    id: string;
    email: string;
    role: UserRole;
}
export interface APIResponse<T> {
    success: boolean;
    message: string;
    data?: T;
    error?: string;
}
//# sourceMappingURL=index.d.ts.map