import { Router } from 'express';
import { createFeedback, listFeedback, updateFeedback } from '../controllers/feedbackController';
import { authMiddleware, roleMiddleware } from '../middleware/auth';

const router = Router();

router.post('/', authMiddleware, roleMiddleware(['patient', 'doctor', 'secretary', 'admin']), createFeedback);
router.get('/', authMiddleware, roleMiddleware(['admin']), listFeedback);
router.put('/:id', authMiddleware, roleMiddleware(['admin']), updateFeedback);

export default router;
