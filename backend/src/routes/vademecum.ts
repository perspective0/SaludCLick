import { Router } from 'express';
import {
  addFavorite,
  createMedication,
  getMedicationDetail,
  listFavorites,
  listRecent,
  removeFavorite,
  searchMedications,
  updateMedication,
  validateMedicationForPatient,
} from '../controllers/vademecumController';
import { authMiddleware, roleMiddleware } from '../middleware/auth';

const router = Router();

router.get('/search', authMiddleware, roleMiddleware(['doctor', 'admin']), searchMedications);
router.get('/favorites', authMiddleware, roleMiddleware(['doctor']), listFavorites);
router.post('/favorites', authMiddleware, roleMiddleware(['doctor']), addFavorite);
router.delete('/favorites/:id', authMiddleware, roleMiddleware(['doctor']), removeFavorite);
router.get('/recent', authMiddleware, roleMiddleware(['doctor']), listRecent);
router.post('/validate', authMiddleware, roleMiddleware(['doctor']), validateMedicationForPatient);
router.post('/', authMiddleware, roleMiddleware(['admin']), createMedication);
router.put('/:id', authMiddleware, roleMiddleware(['admin']), updateMedication);
router.get('/:id', authMiddleware, roleMiddleware(['doctor', 'admin']), getMedicationDetail);

export default router;
