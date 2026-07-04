import express from 'express';
import secretaryController from '../controllers/secretaryController';
import { authMiddleware, roleMiddleware } from '../middleware/auth';

const router = express.Router();

// List secretaries (doctor/admin/secretary)
router.get('/', authMiddleware, roleMiddleware(['doctor', 'admin', 'secretary']), secretaryController.listSecretaries as any);
router.get('/doctors', authMiddleware, roleMiddleware(['secretary']), secretaryController.listAssignedDoctors as any);
router.get('/search', authMiddleware, roleMiddleware(['doctor', 'admin']), secretaryController.searchSecretaryByEmail as any);

// Create secretary (doctor or admin)
router.post('/', authMiddleware, roleMiddleware(['doctor', 'admin']), secretaryController.createSecretary as any);

// Update secretary
router.put('/:id', authMiddleware, roleMiddleware(['doctor', 'admin']), secretaryController.updateSecretary as any);

// Delete secretary
router.delete('/:id', authMiddleware, roleMiddleware(['doctor', 'admin']), secretaryController.deleteSecretary as any);

export default router;
