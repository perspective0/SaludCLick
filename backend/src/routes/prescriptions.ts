import { Router } from 'express';
import {
  createPrescription,
  cancelPrescription,
  getPatientPrescriptions,
  getPrescriptionById,
  getPrescriptionPdf,
  getPrescriptionPrint,
  verifyPrescription,
} from '../controllers/prescriptionsController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// GET /api/prescriptions/verify/:code - public verification
router.get('/verify/:code', verifyPrescription);

// POST /api/prescriptions - create prescription (doctor only)
router.post('/', authMiddleware, createPrescription);

// GET /api/prescriptions/patient/:patientId - get patient prescriptions
router.get('/patient/:patientId', authMiddleware, getPatientPrescriptions);

// GET /api/prescriptions/:id/print - print-ready prescription
router.get('/:id/print', authMiddleware, getPrescriptionPrint);

// GET /api/prescriptions/:id/pdf - downloadable prescription PDF
router.get('/:id/pdf', authMiddleware, getPrescriptionPdf);

// PUT /api/prescriptions/:id/cancel - cancel prescription
router.put('/:id/cancel', authMiddleware, cancelPrescription);

// GET /api/prescriptions/:id - get single prescription
router.get('/:id', authMiddleware, getPrescriptionById);

export default router;
