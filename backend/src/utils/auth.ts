import { sign, verify, decode, Secret } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { JWTPayload } from '../types';
import { requireEnv } from '../config/env';

const JWT_SECRET: Secret = requireEnv('JWT_SECRET', 'development-only-jwt-secret-change-me');
const JWT_EXPIRE = process.env.JWT_EXPIRE || '7d';

/**
 * Generate JWT token
 */
export const generateToken = (payload: JWTPayload, expiresIn: string = JWT_EXPIRE): string => {
  return sign(payload as string | Buffer | object, JWT_SECRET as Secret, { expiresIn } as any);
};

/**
 * Verify JWT token
 */
export const verifyToken = (token: string): JWTPayload => {
  return verify(token, JWT_SECRET) as JWTPayload;
};

/**
 * Hash password
 */
export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

/**
 * Compare password with hash
 */
export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

/**
 * Decode token without verification (for debugging)
 */
export const decodeToken = (token: string): any => {
  return decode(token);
};
