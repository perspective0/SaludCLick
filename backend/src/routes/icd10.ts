import { Router } from 'express';
import { searchIcd10 } from '../controllers/icd10Controller';
import { authMiddleware, roleMiddleware } from '../middleware/auth';

const router = Router();

router.get('/search', authMiddleware, roleMiddleware(['doctor', 'admin']), searchIcd10);

export default router;
