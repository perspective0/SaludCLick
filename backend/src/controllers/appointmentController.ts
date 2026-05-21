import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { query, queryOne, queryMany } from '../db';
import { v4 as uuidv4 } from 'uuid';

/**
 * Create appointment
 */
export const createAppointment = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { doctorId, appointmentDate, appointmentTime, reasonForVisit } = req.body;
    const patientId = req.user?.id;

    // Get doctor's health center
    const doctor = await queryOne(
      'SELECT health_center_id FROM doctors WHERE id = $1',
      [doctorId]
    );

    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found' });
    }

    // Check for conflicts
    const conflict = await queryOne(
      `SELECT id FROM appointments 
       WHERE doctor_id = $1 AND appointment_date = $2 AND appointment_time = $3 AND status != 'cancelled'`,
      [doctorId, appointmentDate, appointmentTime]
    );

    if (conflict) {
      return res.status(400).json({
        success: false,
        message: 'This time slot is already booked',
      });
    }

    // Create appointment
    const appointmentId = uuidv4();
    await query(
      `INSERT INTO appointments 
       (id, patient_id, doctor_id, health_center_id, appointment_date, appointment_time, reason_for_visit, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'scheduled')`,
      [appointmentId, patientId, doctorId, doctor.health_center_id, appointmentDate, appointmentTime, reasonForVisit || null]
    );

    res.status(201).json({
      success: true,
      message: 'Appointment scheduled successfully',
      data: { id: appointmentId, status: 'scheduled' },
    });
  } catch (error: any) {
    console.error('Create appointment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating appointment',
    });
  }
};

/**
 * Get user appointments
 */
export const getAppointments = async (req: Request, res: Response) => {
  try {
    const { status, month, year, page = 1, limit = 20 } = req.query;
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const offset = (Number(page) - 1) * Number(limit);

    let sql = '';
    const params: any[] = [];

    if (userRole === 'patient') {
      sql = `
        SELECT a.id, a.appointment_date, a.appointment_time, a.status, a.reason_for_visit,
               u.first_name, u.last_name, d.specialties, hc.name as health_center_name
        FROM appointments a
        JOIN doctors d ON a.doctor_id = d.id
        JOIN users u ON d.id = u.id
        JOIN health_centers hc ON a.health_center_id = hc.id
        WHERE a.patient_id = $1
      `;
      params.push(userId);
    } else if (userRole === 'doctor') {
      sql = `
        SELECT a.id, a.appointment_date, a.appointment_time, a.status, a.reason_for_visit,
               u.first_name, u.last_name, p.id as patient_id
        FROM appointments a
        JOIN patients p ON a.patient_id = p.id
        JOIN users u ON p.id = u.id
        WHERE a.doctor_id = $1
      `;
      params.push(userId);
    }

    if (status) {
      sql += ` AND a.status = $${params.length + 1}`;
      params.push(status);
    }

    if (month && year) {
      sql += ` AND EXTRACT(MONTH FROM a.appointment_date) = $${params.length + 1} AND EXTRACT(YEAR FROM a.appointment_date) = $${params.length + 2}`;
      params.push(month, year);
    }

    sql += ` ORDER BY a.appointment_date DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const appointments = await queryMany(sql, params);

    res.json({
      success: true,
      data: appointments,
      pagination: {
        page: Number(page),
        limit: Number(limit),
      },
    });
  } catch (error: any) {
    console.error('Get appointments error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching appointments',
    });
  }
};

/**
 * Cancel appointment
 */
export const cancelAppointment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user?.id;

    // Check if user has access
    const appointment = await queryOne(
      'SELECT patient_id, doctor_id FROM appointments WHERE id = $1',
      [id]
    );

    if (!appointment || (appointment.patient_id !== userId && appointment.doctor_id !== userId)) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    await query(
      'UPDATE appointments SET status = $1, canceled_at = NOW(), canceled_by = $2 WHERE id = $3',
      ['cancelled', userId, id]
    );

    res.json({
      success: true,
      message: 'Appointment cancelled successfully',
    });
  } catch (error: any) {
    console.error('Cancel appointment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error cancelling appointment',
    });
  }
};

/**
 * Get available slots for doctor
 */
export const getAvailableSlots = async (req: Request, res: Response) => {
  try {
    const { doctorId } = req.params;
    const { date } = req.query;

    // Get doctor availability for that day
    const dayOfWeek = new Date(date as string).getDay();
    const availability = await queryOne(
      'SELECT start_time, end_time FROM doctor_availability WHERE doctor_id = $1 AND day_of_week = $2 AND is_break = false',
      [doctorId, dayOfWeek]
    );

    if (!availability) {
      return res.json({
        success: true,
        data: { slots: [] },
      });
    }

    // Get booked appointments
    const booked = await queryMany(
      'SELECT appointment_time FROM appointments WHERE doctor_id = $1 AND appointment_date = $2 AND status != $3',
      [doctorId, date, 'cancelled']
    );

    const bookedTimes = booked.map(b => b.appointment_time);

    // Generate available slots (30-minute intervals)
    const slots = [];
    const [startHour, startMin] = availability.start_time.split(':').map(Number);
    const [endHour, endMin] = availability.end_time.split(':').map(Number);

    let current = new Date();
    current.setHours(startHour, startMin, 0);
    const end = new Date();
    end.setHours(endHour, endMin, 0);

    while (current < end) {
      const timeStr = current.toTimeString().slice(0, 5);
      if (!bookedTimes.includes(timeStr)) {
        slots.push(timeStr);
      }
      current.setMinutes(current.getMinutes() + 30);
    }

    res.json({
      success: true,
      data: { slots },
    });
  } catch (error: any) {
    console.error('Get available slots error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching available slots',
    });
  }
};

/**
 * Get appointment by ID
 */
export const getAppointmentById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    let sql: string;
    let params: any[];

    if (userRole === 'patient') {
      sql = `
        SELECT a.id, a.appointment_date, a.appointment_time, a.status,
               a.reason_for_visit, a.notes, a.doctor_id,
               u.first_name, u.last_name, u.phone, u.email, u.avatar,
               d.specialties, d.consultation_price, d.bio,
               hc.name as health_center_name, hc.address, hc.city, hc.phone as center_phone
        FROM appointments a
        JOIN doctors d ON a.doctor_id = d.id
        JOIN users u ON d.id = u.id
        JOIN health_centers hc ON a.health_center_id = hc.id
        WHERE a.id = $1 AND a.patient_id = $2`;
      params = [id, userId];
    } else {
      sql = `
        SELECT a.id, a.appointment_date, a.appointment_time, a.status,
               a.reason_for_visit, a.notes, a.patient_id,
               u.first_name, u.last_name, u.phone, u.email
        FROM appointments a
        JOIN patients p ON a.patient_id = p.id
        JOIN users u ON p.id = u.id
        WHERE a.id = $1 AND a.doctor_id = $2`;
      params = [id, userId];
    }

    const appointment = await queryOne(sql, params);

    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    res.json({ success: true, data: appointment });
  } catch (error: any) {
    console.error('Get appointment by id error:', error);
    res.status(500).json({ success: false, message: 'Error fetching appointment' });
  }
};

/**
 * Update / reschedule appointment
 */
export const updateAppointment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { appointmentDate, appointmentTime, notes, status } = req.body;
    const userId = req.user?.id;

    const appointment = await queryOne(
      'SELECT patient_id, doctor_id, status as current_status FROM appointments WHERE id = $1',
      [id]
    );

    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    if (appointment.patient_id !== userId && appointment.doctor_id !== userId) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    if (appointment.current_status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Cannot update a cancelled appointment' });
    }

    // Check for conflicts if rescheduling
    if (appointmentDate && appointmentTime) {
      const conflict = await queryOne(
        `SELECT id FROM appointments
         WHERE doctor_id = $1 AND appointment_date = $2 AND appointment_time = $3
         AND status != 'cancelled' AND id != $4`,
        [appointment.doctor_id, appointmentDate, appointmentTime, id]
      );
      if (conflict) {
        return res.status(400).json({ success: false, message: 'This time slot is already booked' });
      }
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (appointmentDate) { updates.push(`appointment_date = $${params.length + 1}`); params.push(appointmentDate); }
    if (appointmentTime) { updates.push(`appointment_time = $${params.length + 1}`); params.push(appointmentTime); }
    if (notes !== undefined) { updates.push(`notes = $${params.length + 1}`); params.push(notes); }
    if (status) { updates.push(`status = $${params.length + 1}`); params.push(status); }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }

    updates.push(`updated_at = NOW()`);
    params.push(id);
    await query(
      `UPDATE appointments SET ${updates.join(', ')} WHERE id = $${params.length}`,
      params
    );

    res.json({ success: true, message: 'Appointment updated successfully' });
  } catch (error: any) {
    console.error('Update appointment error:', error);
    res.status(500).json({ success: false, message: 'Error updating appointment' });
  }
};
