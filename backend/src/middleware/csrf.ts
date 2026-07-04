import { NextFunction, Request, Response } from 'express';

const CSRF_COOKIE = 'saludclick_csrf';
const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const EXEMPT_PATHS = new Set(['/api/auth/login', '/api/auth/register']);

export function getCookieValue(req: Request, name: string): string | null {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;

  const prefix = `${name}=`;
  const cookie = cookieHeader
    .split(';')
    .map((item) => item.trim())
    .find((item) => item.startsWith(prefix));

  return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : null;
}

export function setCsrfCookie(res: Response, token: string, maxAgeMinutes: number) {
  res.cookie(CSRF_COOKIE, token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: maxAgeMinutes * 60 * 1000,
  });
}

export function clearCsrfCookie(res: Response) {
  res.clearCookie(CSRF_COOKIE, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
}

export function csrfMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!MUTATING_METHODS.has(req.method) || EXEMPT_PATHS.has(req.path)) {
    next();
    return;
  }

  const csrfCookie = getCookieValue(req, CSRF_COOKIE);
  const csrfHeader = req.headers['x-csrf-token'];
  const csrfHeaderValue = Array.isArray(csrfHeader) ? csrfHeader[0] : csrfHeader;

  if (!csrfCookie || !csrfHeaderValue || csrfCookie !== csrfHeaderValue) {
    res.status(403).json({
      success: false,
      message: 'Invalid CSRF token',
    });
    return;
  }

  next();
}
