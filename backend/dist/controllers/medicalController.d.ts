import { Request, Response } from 'express';
/**
 * Create medical record
 */
export declare const createMedicalRecord: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Get patient medical history
 */
export declare const getPatientMedicalHistory: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Create prescription
 */
export declare const createPrescription: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Get patient prescriptions
 */
export declare const getPatientPrescriptions: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=medicalController.d.ts.map