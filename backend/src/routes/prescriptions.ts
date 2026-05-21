import { Router } from 'express';
import {
  createPrescription,
  getPatientPrescriptions,
  getPrescriptionById,
} from '../controllers/prescriptionsController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// POST /api/prescriptions - create prescription (doctor only)
router.post('/', authMiddleware, createPrescription);

// GET /api/prescriptions/patient/:patientId - get patient prescriptions
router.get('/patient/:patientId', authMiddleware, getPatientPrescriptions);

// GET /api/prescriptions/:id - get single prescription
router.get('/:id', authMiddleware, getPrescriptionById);

export default router;
