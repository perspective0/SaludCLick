"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const authController_1 = require("../controllers/authController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', [
    (0, express_validator_1.body)('email').isEmail().normalizeEmail(),
    (0, express_validator_1.body)('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    (0, express_validator_1.body)('firstName').trim().notEmpty(),
    (0, express_validator_1.body)('lastName').trim().notEmpty(),
    (0, express_validator_1.body)('role').isIn(['patient', 'doctor']),
], authController_1.register);
/**
 * POST /api/auth/login
 * Login user
 */
router.post('/login', [
    (0, express_validator_1.body)('email').isEmail().normalizeEmail(),
    (0, express_validator_1.body)('password').notEmpty(),
], authController_1.login);
/**
 * POST /api/auth/logout
 * Logout user
 */
router.post('/logout', authController_1.logout);
/**
 * GET /api/auth/me
 * Get current user
 */
router.get('/me', auth_1.authMiddleware, authController_1.getCurrentUser);
exports.default = router;
//# sourceMappingURL=auth.js.map