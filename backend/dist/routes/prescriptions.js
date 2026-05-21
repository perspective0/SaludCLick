"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prescriptionsController_1 = require("../controllers/prescriptionsController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// POST /api/prescriptions - create prescription (doctor only)
router.post('/', auth_1.authMiddleware, prescriptionsController_1.createPrescription);
// GET /api/prescriptions/patient/:patientId - get patient prescriptions
router.get('/patient/:patientId', auth_1.authMiddleware, prescriptionsController_1.getPatientPrescriptions);
// GET /api/prescriptions/:id - get single prescription
router.get('/:id', auth_1.authMiddleware, prescriptionsController_1.getPrescriptionById);
exports.default = router;
//# sourceMappingURL=prescriptions.js.map