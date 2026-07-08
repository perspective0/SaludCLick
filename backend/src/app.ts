import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { appConfig } from './config/appConfig';
import { requestLogger } from './middleware/requestLogger';
import { maintenanceMiddleware } from './middleware/runtimeSettings';
import { authMiddleware } from './middleware/auth';
import { csrfMiddleware } from './middleware/csrf';

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from './routes/auth';
import doctorRoutes from './routes/doctors';
import appointmentRoutes from './routes/appointments';
import medicalRoutes from './routes/medical';
import doctorRequestRoutes from './routes/doctorRequest';
import adminRoutes from './routes/admin';
import secretaryRoutes from './routes/secretaries';
import feedbackRoutes from './routes/feedback';
import notificationRoutes from './routes/notifications';
import clinicalRoutes from './routes/clinical';
import prescriptionRoutes from './routes/prescriptions';
import patientRoutes from './routes/patient';
import labOrderRoutes from './routes/labOrders';
import icd10Routes from './routes/icd10';
import vademecumRoutes from './routes/vademecum';
import fileRoutes from './routes/files';

const app: Express = express();
if (appConfig.env === 'production') {
  app.set('trust proxy', 1);
}
const allowedOrigins = new Set([
  appConfig.frontendUrl,
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
]);

function isLocalNetworkFrontend(origin: string): boolean {
  try {
    const url = new URL(origin);
    const { hostname, port, protocol } = url;
    const isPrivateIpv4 =
      /^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
      /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
      /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(hostname);

    return protocol === 'http:' && port === '3000' && isPrivateIpv4;
  } catch {
    return false;
  }
}

// CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      const allowLocalNetwork = appConfig.env !== 'production' && isLocalNetworkFrontend(origin || '');
      if (!origin || allowedOrigins.has(origin) || allowLocalNetwork) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS origin not allowed: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  })
);

// Middleware
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '24mb' }));
app.use(express.urlencoded({ limit: process.env.URLENCODED_BODY_LIMIT || '24mb', extended: true }));
app.use(csrfMiddleware);

// Public static files
app.use('/uploads/avatars', express.static(path.join(__dirname, '../uploads/avatars')));
app.use('/uploads/prescription-logos', express.static(path.join(__dirname, '../uploads/prescription-logos')));
app.use(requestLogger);
app.use(maintenanceMiddleware);

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'SaludClick API is running',
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/medical-records', medicalRoutes);
app.use('/api/doctor-request', doctorRequestRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/secretaries', secretaryRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/doctor', clinicalRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/lab-orders', labOrderRoutes);
app.use('/api/icd10', icd10Routes);
app.use('/api/vademecum', vademecumRoutes);
app.use('/api/patient', patientRoutes);
app.use('/api/files', fileRoutes);

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    data: null,
    error: process.env.NODE_ENV === 'development' ? err.message || err : 'Internal server error',
    message: err.message || 'Internal server error',
    meta: undefined,
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    data: null,
    error: 'Route not found',
    message: 'Route not found',
    meta: undefined,
  });
});

export default app;
