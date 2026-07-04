import { Router } from 'express';
import {
  cancelLabOrder,
  createLabOrder,
  getDocumentTemplates,
  getLabOrderPrint,
  getPatientLabOrders,
  getStudyCatalog,
  saveDocumentTemplate,
  verifyLabOrder,
} from '../controllers/labOrdersController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.get('/verify/:code', verifyLabOrder);
router.post('/', authMiddleware, createLabOrder);
router.get('/catalog', authMiddleware, getStudyCatalog);
router.get('/document-templates', authMiddleware, getDocumentTemplates);
router.post('/document-templates', authMiddleware, saveDocumentTemplate);
router.get('/patient/:patientId', authMiddleware, getPatientLabOrders);
router.get('/:id/print', authMiddleware, getLabOrderPrint);
router.put('/:id/cancel', authMiddleware, cancelLabOrder);

export default router;
