import { Router } from 'express';
import doctorRequestController from '../controllers/doctorRequestController';

const router = Router();

router.post('/', doctorRequestController.createDoctorRequest);

export default router;
