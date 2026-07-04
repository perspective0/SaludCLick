import { Request, Response, NextFunction } from 'express';
import { JWTPayload } from '../types';
import { verifyToken } from '../utils/auth';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

function getCookie(req: Request, name: string): string | null {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(';').map((cookie) => cookie.trim());
  const prefix = `${name}=`;
  const match = cookies.find((cookie) => cookie.startsWith(prefix));
  return match ? decodeURIComponent(match.slice(prefix.length)) : null;
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    const bearerToken = req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.split(' ')[1]
      : null;
    const token = bearerToken || getCookie(req, 'saludclick_session');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No authorization token provided',
      });
    }

    const decoded = verifyToken(token) as JWTPayload;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }
};

export const optionalAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    const bearerToken = req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.split(' ')[1]
      : null;
    const token = bearerToken || getCookie(req, 'saludclick_session');

    if (token) {
      req.user = verifyToken(token) as JWTPayload;
    }
  } catch {
    req.user = undefined;
  }

  next();
};

export const roleMiddleware = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.',
      });
    }

    next();
  };
};
