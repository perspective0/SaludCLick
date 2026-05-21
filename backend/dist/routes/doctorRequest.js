"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const doctorRequestController_1 = __importDefault(require("../controllers/doctorRequestController"));
const router = (0, express_1.Router)();
router.post('/', doctorRequestController_1.default.createDoctorRequest);
exports.default = router;
//# sourceMappingURL=doctorRequest.js.map