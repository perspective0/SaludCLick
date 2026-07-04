import { NextFunction, Request, Response } from 'express';

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const startedAt = Date.now();

  res.on('finish', () => {
    const durationMs = Date.now() - startedAt;
    const shouldLog = durationMs > 750 || res.statusCode >= 400 || process.env.NODE_ENV === 'development';

    if (shouldLog) {
      console.info('[request]', {
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        durationMs,
        userId: req.user?.id,
        role: req.user?.role,
      });
    }
  });

  next();
}
