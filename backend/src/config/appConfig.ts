import { requireEnv, requireProductionEnv } from './env';

export const appConfig = {
  env: process.env.NODE_ENV || 'development',
  frontendUrl: requireProductionEnv('FRONTEND_URL', 'http://localhost:3000'),
  publicAppUrl: requireProductionEnv('PUBLIC_APP_URL', 'http://localhost:3000'),
  databaseUrl: requireEnv('DATABASE_URL', 'postgresql://postgres:password@localhost:5432/saludclick'),
  jwtSecret: requireEnv('JWT_SECRET', 'development-only-jwt-secret-change-me'),
  features: {
    externalNotifications: process.env.FEATURE_EXTERNAL_NOTIFICATIONS === 'true',
    telemedicine: process.env.FEATURE_TELEMEDICINE === 'true',
    aiClinicalAssistant: process.env.FEATURE_AI_CLINICAL_ASSISTANT === 'true',
    payments: process.env.FEATURE_PAYMENTS === 'true',
  },
};
