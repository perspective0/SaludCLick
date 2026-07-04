import { Router } from 'express';
import { authMiddleware, roleMiddleware } from '../middleware/auth';
import {
  confirmPatientAppointment,
  getPatientAppointments,
  getPatientDashboard,
  getPatientDocuments,
  getPatientPrescriptionById,
  getPatientPrescriptions,
  getPatientProfile,
  updatePatientProfile,
} from '../controllers/patientController';

const router = Router();

router.use(authMiddleware, roleMiddleware(['patient']));

router.get('/dashboard', getPatientDashboard);
router.get('/appointments', getPatientAppointments);
router.put('/appointments/:id/confirm', confirmPatientAppointment);
router.get('/prescriptions', getPatientPrescriptions);
router.get('/prescriptions/:id', getPatientPrescriptionById);
router.get('/documents', getPatientDocuments);
router.get('/profile', getPatientProfile);
router.put('/profile', updatePatientProfile);

export default router;
