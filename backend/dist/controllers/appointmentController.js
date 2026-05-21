"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateAppointment = exports.getAppointmentById = exports.getAvailableSlots = exports.cancelAppointment = exports.getAppointments = exports.createAppointment = void 0;
const express_validator_1 = require("express-validator");
const db_1 = require("../db");
const uuid_1 = require("uuid");
/**
 * Create appointment
 */
const createAppointment = async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }
    try {
        const { doctorId, appointmentDate, appointmentTime, reasonForVisit } = req.body;
        const patientId = req.user?.id;
        // Get doctor's health center
        const doctor = await (0, db_1.queryOne)('SELECT health_center_id FROM doctors WHERE id = $1', [doctorId]);
        if (!doctor) {
            return res.status(404).json({ success: false, message: 'Doctor not found' });
        }
        // Check for conflicts
        const conflict = await (0, db_1.queryOne)(`SELECT id FROM appointments 
       WHERE doctor_id = $1 AND appointment_date = $2 AND appointment_time = $3 AND status != 'cancelled'`, [doctorId, appointmentDate, appointmentTime]);
        if (conflict) {
            return res.status(400).json({
                success: false,
                message: 'This time slot is already booked',
            });
        }
        // Create appointment
        const appointmentId = (0, uuid_1.v4)();
        await (0, db_1.query)(`INSERT INTO appointments 
       (id, patient_id, doctor_id, health_center_id, appointment_date, appointment_time, reason_for_visit, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'scheduled')`, [appointmentId, patientId, doctorId, doctor.health_center_id, appointmentDate, appointmentTime, reasonForVisit || null]);
        res.status(201).json({
            success: true,
            message: 'Appointment scheduled successfully',
            data: { id: appointmentId, status: 'scheduled' },
        });
    }
    catch (error) {
        console.error('Create appointment error:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating appointment',
        });
    }
};
exports.createAppointment = createAppointment;
/**
 * Get user appointments
 */
const getAppointments = async (req, res) => {
    try {
        const { status, month, year, page = 1, limit = 20 } = req.query;
        const userId = req.user?.id;
        const userRole = req.user?.role;
        const offset = (Number(page) - 1) * Number(limit);
        let sql = '';
        const params = [];
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
        }
        else if (userRole === 'doctor') {
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
        const appointments = await (0, db_1.queryMany)(sql, params);
        res.json({
            success: true,
            data: appointments,
            pagination: {
                page: Number(page),
                limit: Number(limit),
            },
        });
    }
    catch (error) {
        console.error('Get appointments error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching appointments',
        });
    }
};
exports.getAppointments = getAppointments;
/**
 * Cancel appointment
 */
const cancelAppointment = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const userId = req.user?.id;
        // Check if user has access
        const appointment = await (0, db_1.queryOne)('SELECT patient_id, doctor_id FROM appointments WHERE id = $1', [id]);
        if (!appointment || (appointment.patient_id !== userId && appointment.doctor_id !== userId)) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }
        await (0, db_1.query)('UPDATE appointments SET status = $1, canceled_at = NOW(), canceled_by = $2 WHERE id = $3', ['cancelled', userId, id]);
        res.json({
            success: true,
            message: 'Appointment cancelled successfully',
        });
    }
    catch (error) {
        console.error('Cancel appointment error:', error);
        res.status(500).json({
            success: false,
            message: 'Error cancelling appointment',
        });
    }
};
exports.cancelAppointment = cancelAppointment;
/**
 * Get available slots for doctor
 */
const getAvailableSlots = async (req, res) => {
    try {
        const { doctorId } = req.params;
        const { date } = req.query;
        // Get doctor availability for that day
        const dayOfWeek = new Date(date).getDay();
        const availability = await (0, db_1.queryOne)('SELECT start_time, end_time FROM doctor_availability WHERE doctor_id = $1 AND day_of_week = $2 AND is_break = false', [doctorId, dayOfWeek]);
        if (!availability) {
            return res.json({
                success: true,
                data: { slots: [] },
            });
        }
        // Get booked appointments
        const booked = await (0, db_1.queryMany)('SELECT appointment_time FROM appointments WHERE doctor_id = $1 AND appointment_date = $2 AND status != $3', [doctorId, date, 'cancelled']);
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
    }
    catch (error) {
        console.error('Get available slots error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching available slots',
        });
    }
};
exports.getAvailableSlots = getAvailableSlots;
/**
 * Get appointment by ID
 */
const getAppointmentById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;
        const userRole = req.user?.role;
        let sql;
        let params;
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
        }
        else {
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
        const appointment = await (0, db_1.queryOne)(sql, params);
        if (!appointment) {
            return res.status(404).json({ success: false, message: 'Appointment not found' });
        }
        res.json({ success: true, data: appointment });
    }
    catch (error) {
        console.error('Get appointment by id error:', error);
        res.status(500).json({ success: false, message: 'Error fetching appointment' });
    }
};
exports.getAppointmentById = getAppointmentById;
/**
 * Update / reschedule appointment
 */
const updateAppointment = async (req, res) => {
    try {
        const { id } = req.params;
        const { appointmentDate, appointmentTime, notes, status } = req.body;
        const userId = req.user?.id;
        const appointment = await (0, db_1.queryOne)('SELECT patient_id, doctor_id, status as current_status FROM appointments WHERE id = $1', [id]);
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
            const conflict = await (0, db_1.queryOne)(`SELECT id FROM appointments
         WHERE doctor_id = $1 AND appointment_date = $2 AND appointment_time = $3
         AND status != 'cancelled' AND id != $4`, [appointment.doctor_id, appointmentDate, appointmentTime, id]);
            if (conflict) {
                return res.status(400).json({ success: false, message: 'This time slot is already booked' });
            }
        }
        const updates = [];
        const params = [];
        if (appointmentDate) {
            updates.push(`appointment_date = $${params.length + 1}`);
            params.push(appointmentDate);
        }
        if (appointmentTime) {
            updates.push(`appointment_time = $${params.length + 1}`);
            params.push(appointmentTime);
        }
        if (notes !== undefined) {
            updates.push(`notes = $${params.length + 1}`);
            params.push(notes);
        }
        if (status) {
            updates.push(`status = $${params.length + 1}`);
            params.push(status);
        }
        if (updates.length === 0) {
            return res.status(400).json({ success: false, message: 'No fields to update' });
        }
        updates.push(`updated_at = NOW()`);
        params.push(id);
        await (0, db_1.query)(`UPDATE appointments SET ${updates.join(', ')} WHERE id = $${params.length}`, params);
        res.json({ success: true, message: 'Appointment updated successfully' });
    }
    catch (error) {
        console.error('Update appointment error:', error);
        res.status(500).json({ success: false, message: 'Error updating appointment' });
    }
};
exports.updateAppointment = updateAppointment;
//# sourceMappingURL=appointmentController.js.map