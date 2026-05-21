import { Request, Response } from 'express';
/**
 * Create a review (patients only)
 */
export declare const createReview: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Get reviews for a doctor
 */
export declare const getDoctorReviews: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=reviewsController.d.ts.map