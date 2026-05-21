import { Router } from 'express';
import adminController from '../controllers/adminController';

const router = Router();

router.get('/doctor-requests', adminController.listDoctorRequests);
router.post('/doctor-requests/:id/approve', adminController.approveDoctorRequest);
router.get('/users', adminController.listAllUsers);

export default router;
