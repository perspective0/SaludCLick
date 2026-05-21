import { Router } from 'express';
import { body } from 'express-validator';
import {
  createAppointment,
  getAppointments,
  getAppointmentById,
  updateAppointment,
  cancelAppointment,
  getAvailableSlots,
} from '../controllers/appointmentController';
import { authMiddleware, roleMiddleware } from '../middleware/auth';

const router = Router();

/**
 * POST /api/appointments
 * Create a new appointment (patient only)
 */
router.post(
  '/',
  authMiddleware,
  roleMiddleware(['patient']),
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
