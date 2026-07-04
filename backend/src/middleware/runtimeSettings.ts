import { NextFunction, Request, Response } from 'express';
import { getSettings } from '../services/settingsService';

export async function maintenanceMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const system = await getSettings('system');
    const isAdmin = req.user?.role === 'admin';
    if (system.maintenanceMode && !isAdmin && !req.path.startsWith('/api/admin') && req.path !== '/api/health') {
      return res.status(503).json({ success: false, message: 'El sistema está temporalmente en mantenimiento.' });
    }
    next();
  } catch { next(); }
}
