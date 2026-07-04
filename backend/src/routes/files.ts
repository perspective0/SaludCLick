import { Router, Request, Response } from 'express';
import path from 'path';
import { authMiddleware } from '../middleware/auth';
import { queryOne } from '../db';

const router = Router();

function isSafeFilename(filename: string) {
  return /^[a-zA-Z0-9._-]+$/.test(filename) && !filename.includes('..');
}

router.get('/prescription-seals/:filename', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    if (!isSafeFilename(filename)) {
      return res.status(400).json({ success: false, message: 'Invalid filename' });
    }

    const fileUrlSuffix = `/prescription-seals/${filename}`;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId || !userRole) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    let allowed = userRole === 'admin';
    if (!allowed && userRole === 'doctor') {
      const ownSeal = await queryOne(
        'SELECT 1 FROM doctors WHERE id = $1 AND prescription_seal LIKE $2 LIMIT 1',
        [userId, `%${fileUrlSuffix}`]
      );
      allowed = Boolean(ownSeal);
    }

    if (!allowed && userRole === 'patient') {
      const patientDocument = await queryOne(
        `SELECT 1 FROM prescriptions WHERE patient_id = $1 AND prescription_seal LIKE $2
         UNION
         SELECT 1 FROM lab_orders lo
         JOIN doctors d ON d.id = lo.doctor_id
         WHERE lo.patient_id = $1 AND d.prescription_seal LIKE $2
         LIMIT 1`,
        [userId, `%${fileUrlSuffix}`]
      );
      allowed = Boolean(patientDocument);
    }

    if (!allowed) {
      return res.status(403).json({ success: false, message: 'Unauthorized file access' });
    }

    const filePath = path.resolve(__dirname, '../../uploads/prescription-seals', filename);
    const root = path.resolve(__dirname, '../../uploads/prescription-seals');
    if (!filePath.startsWith(`${root}${path.sep}`)) {
      return res.status(400).json({ success: false, message: 'Invalid file path' });
    }

    return res.sendFile(filePath);
  } catch (error) {
    console.error('Private file error:', error);
    return res.status(500).json({ success: false, message: 'Error serving file' });
  }
});

export default router;
