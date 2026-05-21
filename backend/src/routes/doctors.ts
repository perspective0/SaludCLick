import { Router } from 'express';
import { getDoctors, getDoctorById, updateDoctorProfile, getHealthCenters } from '../controllers/doctorController';
import { authMiddleware, roleMiddleware } from '../middleware/auth';

const router = Router();

/**
 * GET /api/doctors
 * Get all doctors with filters
 */
router.get('/', getDoctors);

/**
 * GET /api/doctors/:id
 * Get doctor details
 */
router.get('/:id', getDoctorById);

/**
 * PUT /api/doctors/:id
 * Update doctor profile (doctor only)
 */
router.put('/:id', authMiddleware, roleMiddleware(['doctor']), updateDoctorProfile);

/**
 * GET /api/health-centers
 * Get all health centers
 */
router.get('/health-centers/list', getHealthCenters);

export default router;
