import { Response } from 'express';

export type ApiMeta = Record<string, unknown>;

export function ok<T>(res: Response, data?: T, message?: string, meta?: ApiMeta, status = 200) {
  return res.status(status).json({
    success: true,
    data,
    error: null,
    message,
    meta,
  });
}

export function created<T>(res: Response, data?: T, message = 'Created', meta?: ApiMeta) {
  return ok(res, data, message, meta, 201);
}

export function fail(res: Response, status: number, message: string, error?: unknown, meta?: ApiMeta) {
  return res.status(status).json({
    success: false,
    data: null,
    error: normalizeError(error, message),
    message,
    meta,
  });
}

function normalizeError(error: unknown, fallback: string) {
  if (!error) return fallback;
  if (error instanceof Error) return error.message;
  return error;
}
