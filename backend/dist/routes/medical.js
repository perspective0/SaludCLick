"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const medicalController_1 = require("../controllers/medicalController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
/**
 * POST /api/medical-records
 * Create a medical record (doctor only)
 */
router.post('/', auth_1.authMiddleware, (0, auth_1.roleMiddleware)(['doctor']), [
    (0, express_validator_1.body)('patientId').notEmpty(),
    (0, express_validator_1.body)('diagnosis').trim().notEmpty(),
    (0, express_validator_1.body)('treatment').trim().notEmpty(),
], medicalController_1.createMedicalRecord);
/**
 * GET /api/medical-records/:patientId
 * Get patient's medical history
 */
router.get('/:patientId', auth_1.authMiddleware, medicalController_1.getPatientMedicalHistory);
/**
 * POST /api/prescriptions
 * Create a prescription (doctor only)
 */
router.post('/prescriptions/create', auth_1.authMiddleware, (0, auth_1.roleMiddleware)(['doctor']), [
    (0, express_validator_1.body)('patientId').notEmpty(),
    (0, express_validator_1.body)('medicalRecordId').notEmpty(),
    (0, express_validator_1.body)('medications').isArray().notEmpty(),
], medicalController_1.createPrescription);
/**
 * GET /api/prescriptions/patient/:patientId
 * Get patient's prescriptions
 */
router.get('/patient/:patientId', auth_1.authMiddleware, medicalController_1.getPatientPrescriptions);
exports.default = router;
//# sourceMappingURL=medical.js.map