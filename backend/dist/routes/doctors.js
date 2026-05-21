"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const doctorController_1 = require("../controllers/doctorController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
/**
 * GET /api/doctors
 * Get all doctors with filters
 */
router.get('/', doctorController_1.getDoctors);
/**
 * GET /api/doctors/:id
 * Get doctor details
 */
router.get('/:id', doctorController_1.getDoctorById);
/**
 * PUT /api/doctors/:id
 * Update doctor profile (doctor only)
 */
router.put('/:id', auth_1.authMiddleware, (0, auth_1.roleMiddleware)(['doctor']), doctorController_1.updateDoctorProfile);
/**
 * GET /api/health-centers
 * Get all health centers
 */
router.get('/health-centers/list', doctorController_1.getHealthCenters);
exports.default = router;
//# sourceMappingURL=doctors.js.map