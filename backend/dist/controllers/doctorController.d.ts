import { Request, Response } from 'express';
/**
 * Get all doctors with filters
 */
export declare const getDoctors: (req: Request, res: Response) => Promise<void>;
/**
 * Get doctor by ID
 */
export declare const getDoctorById: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Update doctor profile
 */
export declare const updateDoctorProfile: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Get health centers
 */
export declare const getHealthCenters: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=doctorController.d.ts.map