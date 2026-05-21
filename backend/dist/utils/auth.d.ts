import { JWTPayload } from '../types';
/**
 * Generate JWT token
 */
export declare const generateToken: (payload: JWTPayload) => string;
/**
 * Verify JWT token
 */
export declare const verifyToken: (token: string) => JWTPayload;
/**
 * Hash password
 */
export declare const hashPassword: (password: string) => Promise<string>;
/**
 * Compare password with hash
 */
export declare const comparePassword: (password: string, hash: string) => Promise<boolean>;
/**
 * Decode token without verification (for debugging)
 */
export declare const decodeToken: (token: string) => any;
//# sourceMappingURL=auth.d.ts.map