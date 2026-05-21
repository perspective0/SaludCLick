import { Request, Response } from 'express';
import { query, queryOne, queryMany } from '../db';
import { v4 as uuidv4 } from 'uuid';

/**
 * Create a review (patients only)
 */
export const createReview = async (req: Request, res: Response) => {
  try {
    const { doctorId, appointmentId, rating, comment } = req.body;
    const patientId = req.user?.id;

    if (req.user?.role !== 'patient') {
      return res.status(403).json({ success: false, message: 'Only patients can leave reviews' });
    }

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
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
    const { doctorId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const reviews = await queryMany(
      `SELECT r.id, r.rating, r.comment, r.created_at,
              u.first_name, u.last_name
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
