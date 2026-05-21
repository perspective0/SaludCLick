import { Request, Response } from 'express';
/**
 * Register a new user
 */
export declare const register: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Login user
 */
export declare const login: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Logout (client-side mostly)
 */
export declare const logout: (req: Request, res: Response) => void;
/**
 * Get current user
 */
export declare const getCurrentUser: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=authController.d.ts.map