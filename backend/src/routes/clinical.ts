import { Router } from 'express';
import {
  createAllergy,
  createDiagnosis,
  createMedication,
  createVitalSigns,
  deleteConsultationDraft,
  finalizeConsultationDraft,
  getAntecedents,
  getAllergies,
  getClinicalSummary,
  getConsultationDraft,
  getDiagnoses,
  getMedications,
  getTimeline,
  getVitalSigns,
  saveAntecedents,
  saveConsultationDraft,
} from '../controllers/clinicalController';
import { authMiddleware, roleMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware, roleMiddleware(['doctor']));

router.get('/patients/:id/clinical-summary', getClinicalSummary);
router.get('/patients/:id/timeline', getTimeline);

router.get('/patients/:id/vital-signs', getVitalSigns);
router.post('/patients/:id/vital-signs', createVitalSigns);

router.get('/patients/:id/allergies', getAllergies);
router.post('/patients/:id/allergies', createAllergy);

router.get('/patients/:id/medications', getMedications);
router.post('/patients/:id/medications', createMedication);

router.get('/patients/:id/diagnoses', getDiagnoses);
router.post('/patients/:id/diagnoses', createDiagnosis);

router.get('/patients/:id/antecedents', getAntecedents);
router.post('/patients/:id/antecedents', saveAntecedents);

router.get('/consultation-drafts/:patientId', getConsultationDraft);
router.post('/consultation-drafts', saveConsultationDraft);
router.post('/consultation-drafts/:id/finalize', finalizeConsultationDraft);
router.delete('/consultation-drafts/:id', deleteConsultationDraft);

export default router;
