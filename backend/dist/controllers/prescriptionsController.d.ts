import { Request, Response } from 'express';
/**
 * Create a prescription (doctor only)
 */
export declare const createPrescription: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Get prescriptions for a patient
 */
export declare const getPatientPrescriptions: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Get single prescription
 */
export declare const getPrescriptionById: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=prescriptionsController.d.ts.map