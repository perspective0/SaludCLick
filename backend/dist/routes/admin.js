"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const adminController_1 = __importDefault(require("../controllers/adminController"));
const router = (0, express_1.Router)();
router.get('/doctor-requests', adminController_1.default.listDoctorRequests);
router.post('/doctor-requests/:id/approve', adminController_1.default.approveDoctorRequest);
router.get('/users', adminController_1.default.listAllUsers);
exports.default = router;
//# sourceMappingURL=admin.js.map