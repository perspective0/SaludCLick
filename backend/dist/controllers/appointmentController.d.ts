import { Request, Response } from 'express';
/**
 * Create appointment
 */
export declare const createAppointment: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Get user appointments
 */
export declare const getAppointments: (req: Request, res: Response) => Promise<void>;
/**
 * Cancel appointment
 */
export declare const cancelAppointment: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Get available slots for doctor
 */
export declare const getAvailableSlots: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Get appointment by ID
 */
export declare const getAppointmentById: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Update / reschedule appointment
 */
export declare const updateAppointment: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=appointmentController.d.ts.map