import { Request, Response } from 'express';
import { query, queryOne, queryMany } from '../db';
import { v4 as uuidv4 } from 'uuid';

/**
 * Create a prescription (doctor only)
 */
export const createPrescription = async (req: Request, res: Response) => {
  try {
    const { patientId, appointmentId, medications, instructions, expiresAt } = req.body;
    const doctorId = req.user?.id;

    if (req.user?.role !== 'doctor') {
      return res.status(403).json({ success: false, message: 'Only doctors can create prescriptions' });
    }

    const prescriptionId = uuidv4();
    await query(
      `INSERT INTO prescriptions (id, patient_id, doctor_id, appointment_id, medications, instructions, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        prescriptionId,
        patientId,
        doctorId,
        appointmentId || null,
        JSON.stringify(medications),
        instructions || null,
        expiresAt || null,
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Prescription created successfully',
      data: { id: prescriptionId },
    });
  } catch (error: any) {
    console.error('Create prescription error:', error);
    res.status(500).json({ success: false, message: 'Error creating prescription' });
  }
};

/**
 * Get prescriptions for a patient
 */
export const getPatientPrescriptions = async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (userRole === 'patient' && userId !== patientId) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const prescriptions = await queryMany(
      `SELECT p.id, p.medications, p.instructions, p.expires_at, p.created_at,
              u.first_name as doctor_first_name, u.last_name as doctor_last_name,
              d.specialties
       FROM prescriptions p
       JOIN users u ON p.doctor_id = u.id
       JOIN doctors d ON p.doctor_id = d.id
       WHERE p.patient_id = $1
       ORDER BY p.created_at DESC`,
      [patientId]
    );

    res.json({ success: true, data: prescriptions });
  } catch (error: any) {
    console.error('Get prescriptions error:', error);
    res.status(500).json({ success: false, message: 'Error fetching prescriptions' });
  }
};

/**
 * Get single prescription
 */
export const getPrescriptionById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    const prescription = await queryOne(
      `SELECT p.id, p.medications, p.instructions, p.expires_at, p.created_at,
              u.first_name as doctor_first_name, u.last_name as doctor_last_name,
              pu.first_name as patient_first_name, pu.last_name as patient_last_name
       FROM prescriptions p
       JOIN users u ON p.doctor_id = u.id
       JOIN users pu ON p.patient_id = pu.id
       WHERE p.id = $1`,
      [id]
    );

    if (!prescription) {
      return res.status(404).json({ success: false, message: 'Prescription not found' });
    }

    res.json({ success: true, data: prescription });
  } catch (error: any) {
    console.error('Get prescription error:', error);
    res.status(500).json({ success: false, message: 'Error fetching prescription' });
  }
};
