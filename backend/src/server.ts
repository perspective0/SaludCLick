import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from './routes/auth';
import doctorRoutes from './routes/doctors';
import appointmentRoutes from './routes/appointments';
import medicalRoutes from './routes/medical';
import doctorRequestRoutes from './routes/doctorRequest';
import adminRoutes from './routes/admin';

const app: Express = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

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

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err : undefined,
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 SaludClick API running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});

export default app;
