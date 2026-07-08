import { Request, Response } from 'express';
import { query, queryOne, queryMany } from '../db';
import { v4 as uuidv4 } from 'uuid';

async function ensureReviewsTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS reviews (
      id UUID PRIMARY KEY,
      patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
      appointment_id UUID UNIQUE REFERENCES appointments(id) ON DELETE SET NULL,
      rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
      comment TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await query('CREATE INDEX IF NOT EXISTS idx_reviews_doctor ON reviews(doctor_id)').catch(() => null);
  await query('CREATE INDEX IF NOT EXISTS idx_reviews_patient ON reviews(patient_id)').catch(() => null);
}

/**
 * Create a review (patients only)
 */
export const createReview = async (req: Request, res: Response) => {
  try {
    await ensureReviewsTable();
    const { doctorId, appointmentId, rating, comment } = req.body;
    const patientId = req.user?.id;

    if (req.user?.role !== 'patient') {
      return res.status(403).json({ success: false, message: 'Only patients can leave reviews' });
    }

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
    }

    if (appointmentId) {
      const appointment = await queryOne(
        `SELECT id, doctor_id, patient_id, status
         FROM appointments
         WHERE id = $1 AND patient_id = $2`,
        [appointmentId, patientId]
      );

      if (!appointment) {
        return res.status(404).json({ success: false, message: 'Appointment not found' });
      }

      if (appointment.doctor_id !== doctorId) {
        return res.status(400).json({ success: false, message: 'Doctor does not match appointment' });
      }

      if (appointment.status !== 'completed') {
        return res.status(409).json({ success: false, message: 'Only completed appointments can be reviewed' });
      }
    } else {
      const completedAppointment = await queryOne(
        `SELECT id FROM appointments
         WHERE doctor_id = $1 AND patient_id = $2 AND status = 'completed'
         LIMIT 1`,
        [doctorId, patientId]
      );
      if (!completedAppointment) {
        return res.status(409).json({ success: false, message: 'You need a completed appointment to review this doctor' });
      }
    }

    // Check if review already exists for this appointment
    if (appointmentId) {
      const existing = await queryOne(
        'SELECT id FROM reviews WHERE appointment_id = $1',
        [appointmentId]
      );
      if (existing) {
        return res.status(400).json({ success: false, message: 'Review already exists for this appointment' });
      }
    }

    const reviewId = uuidv4();
    await query(
      `INSERT INTO reviews (id, patient_id, doctor_id, appointment_id, rating, comment)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [reviewId, patientId, doctorId, appointmentId || null, rating, comment || null]
    );

    // Update doctor average rating
    await query(
      `UPDATE doctors SET average_rating = (
        SELECT ROUND(AVG(rating)::NUMERIC, 2) FROM reviews WHERE doctor_id = $1
       ) WHERE id = $1`,
      [doctorId]
    );

    res.status(201).json({
      success: true,
      message: 'Review submitted successfully',
      data: { id: reviewId },
    });
  } catch (error: any) {
    console.error('Create review error:', error);
    res.status(500).json({ success: false, message: 'Error creating review' });
  }
};

/**
 * Get reviews for a doctor
 */
export const getDoctorReviews = async (req: Request, res: Response) => {
  try {
    await ensureReviewsTable();
    const { doctorId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const reviews = await queryMany(
      `SELECT r.id, r.rating, r.comment, r.created_at,
              u.first_name, u.last_name,
              TRIM(u.first_name || ' ' || u.last_name) AS patient_name
       FROM reviews r
       JOIN users u ON r.patient_id = u.id
       WHERE r.doctor_id = $1
       ORDER BY r.created_at DESC
       LIMIT $2 OFFSET $3`,
      [doctorId, limit, offset]
    );

    const meta = await queryOne(
      `SELECT COUNT(*) as total,
              ROUND(AVG(rating)::NUMERIC, 2) as avg_rating
       FROM reviews WHERE doctor_id = $1`,
      [doctorId]
    );

    res.json({
      success: true,
      data: reviews,
      meta: {
        total: Number(meta?.total || 0),
        averageRating: Number(meta?.avg_rating || 0),
        page: Number(page),
        limit: Number(limit),
      },
    });
  } catch (error: any) {
    console.error('Get reviews error:', error);
    res.status(500).json({ success: false, message: 'Error fetching reviews' });
  }
};
