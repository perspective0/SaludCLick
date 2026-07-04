import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { createManualPatient, getDoctors, getDoctorById, updateDoctorProfile, getHealthCenters, getLaboratories, getDoctorPatients, uploadDoctorAvatar, uploadPrescriptionLogo, uploadPrescriptionSeal } from '../controllers/doctorController';
import { authMiddleware, optionalAuthMiddleware, roleMiddleware } from '../middleware/auth';
import { getSettings } from '../services/settingsService';

const router = Router();
const avatarDir = path.join(__dirname, '../../uploads/avatars');
const prescriptionLogoDir = path.join(__dirname, '../../uploads/prescription-logos');
const prescriptionSealDir = path.join(__dirname, '../../uploads/prescription-seals');
fs.mkdirSync(avatarDir, { recursive: true });
fs.mkdirSync(prescriptionLogoDir, { recursive: true });
fs.mkdirSync(prescriptionSealDir, { recursive: true });

const avatarUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, avatarDir),
    filename: (_req, file, cb) => {
      const safeExt = path.extname(file.originalname).toLowerCase() || '.jpg';
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${safeExt}`);
    },
  }),
  fileFilter: async (_req, file, cb) => {
    try {
      const system = await getSettings('system');
      const allowed = String(system.allowedFileTypes || '').split(',').map((value) => value.trim().toLowerCase());
      const extension = path.extname(file.originalname).slice(1).toLowerCase();
      cb(null, allowed.includes(extension) && file.mimetype.startsWith('image/'));
    } catch { cb(null, false); }
  },
  limits: { fileSize: 10 * 1024 * 1024 },
});

const prescriptionLogoUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, prescriptionLogoDir),
    filename: (_req, file, cb) => {
      const safeExt = path.extname(file.originalname).toLowerCase() || '.png';
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${safeExt}`);
    },
  }),
  fileFilter: async (_req, file, cb) => {
    try {
      const system = await getSettings('system');
      const allowed = String(system.allowedFileTypes || '').split(',').map((value) => value.trim().toLowerCase());
      const extension = path.extname(file.originalname).slice(1).toLowerCase();
      cb(null, allowed.includes(extension) && file.mimetype.startsWith('image/'));
    } catch { cb(null, false); }
  },
  limits: { fileSize: 10 * 1024 * 1024 },
});

const prescriptionSealUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, prescriptionSealDir),
    filename: (_req, file, cb) => {
      const safeExt = path.extname(file.originalname).toLowerCase() || '.png';
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${safeExt}`);
    },
  }),
  fileFilter: async (_req, file, cb) => {
    try {
      const system = await getSettings('system');
      const allowed = String(system.allowedFileTypes || '').split(',').map((value) => value.trim().toLowerCase());
      const extension = path.extname(file.originalname).slice(1).toLowerCase();
      cb(null, allowed.includes(extension) && file.mimetype.startsWith('image/'));
    } catch { cb(null, false); }
  },
  limits: { fileSize: 10 * 1024 * 1024 },
});

const enforceUploadLimit = async (req: any, res: any, next: any) => {
  const system = await getSettings('system');
  const limit = Math.max(1, Math.min(50, Number(system.maxUploadSize) || 10)) * 1024 * 1024;
  if (Number(req.headers['content-length'] || 0) > limit) return res.status(413).json({ success: false, message: 'El archivo supera el tamaño permitido' });
  next();
};

/**
 * GET /api/doctors
 * Get all doctors with filters
 */
router.get('/', getDoctors);

/**
 * GET /api/doctors/health-centers/list
 * Get all health centers
 */
router.get('/health-centers/list', getHealthCenters);

router.get('/laboratories/list', authMiddleware, roleMiddleware(['doctor', 'admin', 'secretary', 'patient']), getLaboratories);

/**
 * GET /api/doctors/:id/patients
 * Get doctor patients list
 */
router.get('/:id/patients', authMiddleware, roleMiddleware(['doctor', 'admin', 'secretary']), getDoctorPatients);
router.post('/:id/patients', authMiddleware, roleMiddleware(['doctor', 'secretary', 'admin']), createManualPatient);

/**
 * GET /api/doctors/:id
 * Get doctor details
 */
router.get('/:id', optionalAuthMiddleware, getDoctorById);

/**
 * PUT /api/doctors/:id
 * Update doctor profile (doctor only)
 */
router.put('/:id', authMiddleware, roleMiddleware(['doctor']), updateDoctorProfile);
router.post('/:id/avatar', authMiddleware, roleMiddleware(['doctor']), enforceUploadLimit, avatarUpload.single('avatar'), uploadDoctorAvatar);
router.post('/:id/prescription-logo', authMiddleware, roleMiddleware(['doctor']), enforceUploadLimit, prescriptionLogoUpload.single('logo'), uploadPrescriptionLogo);
router.post('/:id/prescription-seal', authMiddleware, roleMiddleware(['doctor']), enforceUploadLimit, prescriptionSealUpload.single('seal'), uploadPrescriptionSeal);

export default router;
