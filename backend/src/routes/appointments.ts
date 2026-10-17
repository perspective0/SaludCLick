import { Router } from 'express';
import { body } from 'express-validator';
import {
  createAppointment,
  getAppointments,
  getAppointmentById,
  updateAppointment,
  cancelAppointment,
  getAvailableSlots,
  getTeleconsultationRoom,
  getTeleconsultationSignals,
  postTeleconsultationSignal,
  checkInAppointment,
  getQueue,
  callNextInQueue,
  updateQueueStatus,
  getMyQueue,
} from '../controllers/appointmentController';
import { authMiddleware, roleMiddleware } from '../middleware/auth';

const router = Router();

/**
 * POST /api/appointments
 * Create a new appointment
 */
router.post(
  '/',
  authMiddleware,
  roleMiddleware(['patient', 'doctor', 'secretary']),
  [
    body('doctorId').notEmpty(),
    body('appointmentDate').isDate(),
    body('appointmentTime').matches(/^\d{2}:\d{2}$/),
  ],
  createAppointment
);

/**
 * GET /api/appointments
 * Get user's appointments
 */
router.get('/', authMiddleware, getAppointments);

router.get('/queue', authMiddleware, roleMiddleware(['doctor', 'secretary', 'admin']), getQueue);
router.post('/queue/call-next', authMiddleware, roleMiddleware(['doctor', 'secretary', 'admin']), callNextInQueue);
router.get('/queue/my', authMiddleware, roleMiddleware(['patient']), getMyQueue);
router.post('/:id/check-in', authMiddleware, roleMiddleware(['doctor', 'secretary', 'admin']), checkInAppointment);
router.put('/:id/queue-status', authMiddleware, roleMiddleware(['doctor', 'secretary', 'admin']), updateQueueStatus);

router.get('/teleconsulta/:roomId', authMiddleware, getTeleconsultationRoom);
router.get('/teleconsulta/:roomId/signals', authMiddleware, getTeleconsultationSignals);
router.post('/teleconsulta/:roomId/signals', authMiddleware, postTeleconsultationSignal);

/**
 * DELETE /api/appointments/:id
 * Cancel appointment
 */
router.delete('/:id', authMiddleware, cancelAppointment);

/**
 * GET /api/appointments/:id
 * Get single appointment
 */
router.get('/:id', authMiddleware, getAppointmentById);

/**
 * PUT /api/appointments/:id
 * Update / reschedule appointment
 */
router.put('/:id', authMiddleware, updateAppointment);

/**
 * GET /api/appointments/:doctorId/available-slots
 * Get available appointment slots for a doctor on a specific date
 */
router.get('/:doctorId/available-slots', getAvailableSlots);

export default router;
