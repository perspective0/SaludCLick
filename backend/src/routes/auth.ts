import { Router } from 'express';
import { body } from 'express-validator';
import { register, login, logout, getCurrentUser } from '../controllers/authController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('firstName').trim().notEmpty(),
    body('lastName').trim().notEmpty(),
    body('role').isIn(['patient', 'doctor']),
  ],
  register
);

/**
 * POST /api/auth/login
 * Login user
 */
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  login
);

/**
 * POST /api/auth/logout
 * Logout user
 */
router.post('/logout', logout);

/**
 * GET /api/auth/me
 * Get current user
 */
router.get('/me', authMiddleware, getCurrentUser);

export default router;
