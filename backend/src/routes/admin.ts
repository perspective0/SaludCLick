import { Router } from 'express';
import {
  approveDoctorRequest,
  cancelAppointment,
  createHealthCenter,
  createUser,
  deleteHealthCenter,
  deleteUser,
  getHealthCenterById,
  getLaboratoryById,
  getReports,
  getStats,
  getUserById,
  listAppointments,
  listAuditLogs,
  listDoctorRequests,
  listDoctorPayments,
  listFeaturedDoctors,
  listHealthCenters,
  listLaboratories,
  listUsers,
  rejectDoctorRequest,
  reviewDoctorVerification,
  getRecentActivity,
  getSettings,
  verifyDoctorRequest,
  updateSettings,
  getPublicRuntimeSettings,
  getWhatsAppStatus,
  updateHealthCenter,
  updateLaboratory,
  updateUser,
  updateUserPassword,
  updateFeaturedDoctor,
  upsertDoctorPayment,
  createLaboratory,
  deleteLaboratory,
  sendWhatsAppTestMessage,
} from '../controllers/adminController';
import { authMiddleware, roleMiddleware } from '../middleware/auth';

const router = Router();

router.get('/stats', authMiddleware, roleMiddleware(['admin']), getStats);
router.get('/activity', authMiddleware, roleMiddleware(['admin']), getRecentActivity);
router.get('/audit-logs', authMiddleware, roleMiddleware(['admin']), listAuditLogs);
router.get('/settings', authMiddleware, roleMiddleware(['admin']), getSettings);
router.put('/settings/:section', authMiddleware, roleMiddleware(['admin']), updateSettings);
router.get('/public-settings', getPublicRuntimeSettings);
router.get('/whatsapp/status', authMiddleware, roleMiddleware(['admin']), getWhatsAppStatus);
router.post('/whatsapp/test', authMiddleware, roleMiddleware(['admin']), sendWhatsAppTestMessage);
router.get('/doctor-requests', authMiddleware, roleMiddleware(['admin']), listDoctorRequests);
router.post('/doctor-requests/:id/verify', authMiddleware, roleMiddleware(['admin']), verifyDoctorRequest);
router.post('/doctor-requests/:id/verification-review', authMiddleware, roleMiddleware(['admin']), reviewDoctorVerification);
router.post('/doctor-requests/:id/approve', authMiddleware, roleMiddleware(['admin']), approveDoctorRequest);
router.post('/doctor-requests/:id/reject', authMiddleware, roleMiddleware(['admin']), rejectDoctorRequest);

router.get('/users', authMiddleware, roleMiddleware(['admin']), listUsers);
router.get('/featured-doctors', authMiddleware, roleMiddleware(['admin']), listFeaturedDoctors);
router.get('/users/:id', authMiddleware, roleMiddleware(['admin']), getUserById);
router.post('/users', authMiddleware, roleMiddleware(['admin']), createUser);
router.put('/users/:id', authMiddleware, roleMiddleware(['admin']), updateUser);
router.put('/users/:id/password', authMiddleware, roleMiddleware(['admin']), updateUserPassword);
router.put('/doctors/:id/featured', authMiddleware, roleMiddleware(['admin']), updateFeaturedDoctor);
router.delete('/users/:id', authMiddleware, roleMiddleware(['admin']), deleteUser);

router.get('/health-centers', authMiddleware, roleMiddleware(['admin']), listHealthCenters);
router.get('/health-centers/:id', authMiddleware, roleMiddleware(['admin']), getHealthCenterById);
router.post('/health-centers', authMiddleware, roleMiddleware(['admin']), createHealthCenter);
router.put('/health-centers/:id', authMiddleware, roleMiddleware(['admin']), updateHealthCenter);
router.delete('/health-centers/:id', authMiddleware, roleMiddleware(['admin']), deleteHealthCenter);

router.get('/laboratories', authMiddleware, roleMiddleware(['admin']), listLaboratories);
router.get('/laboratories/:id', authMiddleware, roleMiddleware(['admin']), getLaboratoryById);
router.post('/laboratories', authMiddleware, roleMiddleware(['admin']), createLaboratory);
router.put('/laboratories/:id', authMiddleware, roleMiddleware(['admin']), updateLaboratory);
router.delete('/laboratories/:id', authMiddleware, roleMiddleware(['admin']), deleteLaboratory);

router.get('/appointments', authMiddleware, roleMiddleware(['admin']), listAppointments);
router.delete('/appointments/:id', authMiddleware, roleMiddleware(['admin']), cancelAppointment);
router.get('/reports', authMiddleware, roleMiddleware(['admin']), getReports);
router.get('/doctor-payments', authMiddleware, roleMiddleware(['admin']), listDoctorPayments);
router.put('/doctor-payments/:doctorId', authMiddleware, roleMiddleware(['admin']), upsertDoctorPayment);

export default router;
