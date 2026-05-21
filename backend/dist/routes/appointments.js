"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const appointmentController_1 = require("../controllers/appointmentController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
/**
 * POST /api/appointments
 * Create a new appointment (patient only)
 */
router.post('/', auth_1.authMiddleware, (0, auth_1.roleMiddleware)(['patient']), [
    (0, express_validator_1.body)('doctorId').notEmpty(),
    (0, express_validator_1.body)('appointmentDate').isDate(),
    (0, express_validator_1.body)('appointmentTime').matches(/^\d{2}:\d{2}$/),
], appointmentController_1.createAppointment);
/**
 * GET /api/appointments
 * Get user's appointments
 */
router.get('/', auth_1.authMiddleware, appointmentController_1.getAppointments);
/**
 * DELETE /api/appointments/:id
 * Cancel appointment
 */
router.delete('/:id', auth_1.authMiddleware, appointmentController_1.cancelAppointment);
/**
 * GET /api/appointments/:id
 * Get single appointment
 */
router.get('/:id', auth_1.authMiddleware, appointmentController_1.getAppointmentById);
/**
 * PUT /api/appointments/:id
 * Update / reschedule appointment
 */
router.put('/:id', auth_1.authMiddleware, appointmentController_1.updateAppointment);
/**
 * GET /api/appointments/:doctorId/available-slots
 * Get available appointment slots for a doctor on a specific date
 */
router.get('/:doctorId/available-slots', appointmentController_1.getAvailableSlots);
exports.default = router;
//# sourceMappingURL=appointments.js.map