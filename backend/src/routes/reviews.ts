import { Router } from 'express';
import { createReview, getDoctorReviews } from '../controllers/reviewsController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// POST /api/reviews - create review (patient only)
router.post('/', authMiddleware, createReview);

// GET /api/reviews/doctor/:doctorId - get reviews for a doctor
router.get('/doctor/:doctorId', getDoctorReviews);

export default router;
