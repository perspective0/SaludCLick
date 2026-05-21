import { Router } from 'express';
import { body } from 'express-validator';
import { createMedicalRecord, getPatientMedicalHistory, createPrescription, getPatientPrescriptions } from '../controllers/medicalController';
import { authMiddleware, roleMiddleware } from '../middleware/auth';

const router = Router();

/**
 * POST /api/medical-records
 * Create a medical record (doctor only)
 */
router.post(
  '/',
  authMiddleware,
  roleMiddleware(['doctor']),
  [
    body('patientId').notEmpty(),
    body('diagnosis').trim().notEmpty(),
    body('treatment').trim().notEmpty(),
  ],
  createMedicalRecord
);

/**
 * GET /api/medical-records/:patientId
 * Get patient's medical history
 */
router.get('/:patientId', authMiddleware, getPatientMedicalHistory);

/**
 * POST /api/prescriptions
 * Create a prescription (doctor only)
 */
router.post(
  '/prescriptions/create',
  authMiddleware,
  roleMiddleware(['doctor']),
  [
    body('patientId').notEmpty(),
    body('medicalRecordId').notEmpty(),
    body('medications').isArray().notEmpty(),
  ],
  createPrescription
);

/**
 * GET /api/prescriptions/patient/:patientId
 * Get patient's prescriptions
 */
router.get('/patient/:patientId', authMiddleware, getPatientPrescriptions);

export default router;
