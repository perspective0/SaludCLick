import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { query, queryOne, queryMany } from '../db';
import { v4 as uuidv4 } from 'uuid';
import { notifyAppointmentUsers, notifyUser } from './notificationController';
import jwt from 'jsonwebtoken';

const validAppointmentStatuses = ['scheduled', 'confirmed', 'completed', 'cancelled', 'no-show'];
type TeleconsultationSignal = {
  id: number;
  roomId: string;
  senderId: string;
  senderRole: string;
  type: string;
  payload: any;
  createdAt: number;
};

const teleconsultationSignals = new Map<string, TeleconsultationSignal[]>();
let teleconsultationSignalId = 0;

function getDayOfWeekFromISODate(value?: string) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() + 1 !== month ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }

  return parsed.getUTCDay();
}

function timeToMinutes(value?: string) {
  const match = String(value || '').match(/^(\d{2}):(\d{2})/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

async function getDoctorAvailabilityForDate(doctorId: string, date: string, healthCenterId?: string | null) {
  const dayOfWeek = getDayOfWeekFromISODate(date);
  if (dayOfWeek === null) return null;

  return queryOne(
    `SELECT start_time, end_time
     FROM doctor_availability
     WHERE doctor_id = $1
       AND day_of_week = $2
       AND is_break = false
       AND ($3::uuid IS NULL OR health_center_id = $3 OR health_center_id IS NULL)
     ORDER BY health_center_id NULLS LAST
     LIMIT 1`,
    [doctorId, dayOfWeek, healthCenterId || null]
  );
}

function isAppointmentTimeInsideAvailability(appointmentTime: string, availability: any) {
  const appointmentMinutes = timeToMinutes(appointmentTime);
  const startMinutes = timeToMinutes(availability?.start_time);
  const endMinutes = timeToMinutes(availability?.end_time);
  if (appointmentMinutes === null || startMinutes === null || endMinutes === null) return false;
  return appointmentMinutes >= startMinutes && appointmentMinutes < endMinutes && (appointmentMinutes - startMinutes) % 30 === 0;
}

async function ensureAppointmentStatusValue(status?: string) {
  if (status !== 'confirmed') return;

  try {
    await query("ALTER TYPE appointment_status ADD VALUE IF NOT EXISTS 'confirmed'");
  } catch (error: any) {
    if (error?.code !== '42710') {
      throw error;
    }
  }
}

async function ensurePatientAppointmentFields() {
  await query('ALTER TABLE patients ADD COLUMN IF NOT EXISTS document_number VARCHAR(30)');
  await query('ALTER TABLE patients ADD COLUMN IF NOT EXISTS has_insurance BOOLEAN DEFAULT false');
  await query('ALTER TABLE patients ADD COLUMN IF NOT EXISTS insurance_provider VARCHAR(255)');
  await query('ALTER TABLE patients ADD COLUMN IF NOT EXISTS insurance_number VARCHAR(255)');
}

function createJitsiJwt(params: {
  roomId: string;
  userId: string;
  userName: string;
  userEmail?: string | null;
  isModerator: boolean;
}) {
  const secret = process.env.JITSI_JWT_SECRET;
  const appId = process.env.JITSI_APP_ID || process.env.JITSI_JWT_APP_ID;

  if (!secret || !appId) {
    return null;
  }

  const domain = process.env.JITSI_JWT_SUB || appId;
  const roomName = buildJitsiRoomName(params.roomId);

  return jwt.sign(
    {
      aud: process.env.JITSI_JWT_AUD || 'jitsi',
      iss: appId,
      sub: domain,
      room: roomName,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 4,
      context: {
        user: {
          id: params.userId,
          name: params.userName,
          email: params.userEmail || undefined,
          moderator: params.isModerator,
        },
      },
      moderator: params.isModerator,
    },
    secret,
    { algorithm: 'HS256' }
  );
}

function buildJitsiRoomName(roomId: string) {
  return `SaludClick-${roomId}`.replace(/[^a-zA-Z0-9-]/g, '');
}

function buildJitsiRoomPath(roomId: string) {
  const roomName = buildJitsiRoomName(roomId);
  const appId = process.env.JITSI_APP_ID || process.env.JITSI_JWT_APP_ID;
  const domain = process.env.JITSI_DOMAIN || process.env.NEXT_PUBLIC_JITSI_DOMAIN || 'meet.jit.si';
  const usesJaas = domain === '8x8.vc' || domain.endsWith('.8x8.vc');

  return appId && usesJaas ? `${appId}/${roomName}` : roomName;
}

function normalizeVideoRoomUrl(value?: string | null) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

async function getAuthorizedTeleconsultation(roomId: string, req: Request) {
  const userId = req.user?.id;
  const userRole = req.user?.role;
  if (!userId) return { appointment: null, authorized: false, isDoctor: false };

  const appointment = await queryOne(
    `SELECT a.id, a.patient_id, a.doctor_id, a.appointment_date, a.appointment_time, a.status,
            a.appointment_type, a.video_room_id, a.video_room_url,
            du.first_name AS doctor_first_name, du.last_name AS doctor_last_name, du.email AS doctor_email,
            pu.first_name AS patient_first_name, pu.last_name AS patient_last_name, pu.email AS patient_email
     FROM appointments a
     JOIN users du ON du.id = a.doctor_id
     JOIN users pu ON pu.id = a.patient_id
     WHERE a.video_room_id = $1 AND a.appointment_type = 'teleconsulta'`,
    [roomId]
  );

  if (!appointment) return { appointment: null, authorized: false, isDoctor: false };

  let authorized = appointment.patient_id === userId || appointment.doctor_id === userId;
  if (!authorized && userRole === 'secretary') {
    const sec = await queryOne('SELECT 1 FROM secretaries WHERE id = $1 AND doctor_id = $2', [userId, appointment.doctor_id]);
    authorized = Boolean(sec);
  }

  return { appointment, authorized, isDoctor: userId === appointment.doctor_id };
}

/**
 * Create appointment
 */
export const createAppointment = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { doctorId, patientId: requestedPatientId, appointmentDate, appointmentTime, reasonForVisit, appointmentType = 'presencial', healthCenterId, videoRoomUrl } = req.body;
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const normalizedType = appointmentType === 'teleconsulta' ? 'teleconsulta' : 'presencial';

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Debes iniciar sesion para agendar una cita.' });
    }

    let patientId = userId;
    let appointmentDoctorId = doctorId;

    if (userRole === 'doctor') {
      appointmentDoctorId = userId;
      patientId = requestedPatientId;
      if (!patientId) {
        return res.status(400).json({ success: false, message: 'Selecciona el paciente para crear la cita.' });
      }
    } else if (userRole === 'secretary') {
      patientId = requestedPatientId;
      if (!patientId || !appointmentDoctorId) {
        return res.status(400).json({ success: false, message: 'Selecciona medico y paciente para crear la cita.' });
      }
      const assigned = await queryOne(
        'SELECT 1 FROM secretaries WHERE id = $1 AND doctor_id = $2',
        [userId, appointmentDoctorId]
      );
      if (!assigned) {
        return res.status(403).json({ success: false, message: 'No tienes permiso para agendar citas de este medico.' });
      }
    }

    const patient = await queryOne('SELECT id FROM patients WHERE id = $1', [patientId]);
    if (!patient) {
      return res.status(400).json({
        success: false,
        message: 'Tu usuario no tiene un perfil de paciente activo. Completa tu registro antes de agendar una cita.',
      });
    }

    if (userRole === 'doctor' || userRole === 'secretary') {
      const linkedPatient = await queryOne(
        `SELECT 1
         FROM (
           SELECT patient_id FROM appointments WHERE doctor_id = $1
           UNION
           SELECT patient_id FROM medical_records WHERE doctor_id = $1
         ) patients
         WHERE patient_id = $2
         LIMIT 1`,
        [appointmentDoctorId, patientId]
      );
      if (!linkedPatient) {
        return res.status(403).json({ success: false, message: 'Solo puedes agendar citas a pacientes asociados a este medico.' });
      }
    }

    // Get doctor's health center
    const doctor = await queryOne(
      'SELECT health_center_id, teleconsultation_enabled, vacation_mode FROM doctors WHERE id = $1',
      [appointmentDoctorId]
    );

    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found' });
    }

    if (doctor.vacation_mode) {
      return res.status(400).json({ success: false, message: 'Este medico no esta recibiendo nuevas citas.' });
    }

    if (normalizedType === 'teleconsulta' && !doctor.teleconsultation_enabled) {
      return res.status(400).json({ success: false, message: 'Este médico no tiene teleconsulta disponible.' });
    }

    const selectedHealthCenterId = await resolveDoctorHealthCenter(appointmentDoctorId, healthCenterId, doctor.health_center_id);
    if (!selectedHealthCenterId) {
      return res.status(400).json({ success: false, message: 'Selecciona un centro de salud asociado a este medico.' });
    }

    const availability = await getDoctorAvailabilityForDate(appointmentDoctorId, appointmentDate, selectedHealthCenterId);
    if (!availability) {
      return res.status(400).json({ success: false, message: 'El medico no consulta en la fecha seleccionada.' });
    }
    if (!isAppointmentTimeInsideAvailability(appointmentTime, availability)) {
      return res.status(400).json({ success: false, message: 'La hora seleccionada no esta dentro del horario de consulta del medico.' });
    }

    // Check for conflicts
    const conflict = await queryOne(
      `SELECT id FROM appointments 
       WHERE doctor_id = $1 AND appointment_date = $2 AND appointment_time = $3 AND status != 'cancelled'`,
      [appointmentDoctorId, appointmentDate, appointmentTime]
    );

    if (conflict) {
      return res.status(400).json({
        success: false,
        message: 'This time slot is already booked',
      });
    }

    // Create appointment
    const appointmentId = uuidv4();
    const externalVideoRoomUrl = normalizedType === 'teleconsulta' ? normalizeVideoRoomUrl(videoRoomUrl) : null;
    if (normalizedType === 'teleconsulta' && videoRoomUrl && !externalVideoRoomUrl) {
      return res.status(400).json({ success: false, message: 'El enlace de teleconsulta debe ser una URL valida.' });
    }
    const videoRoomId = normalizedType === 'teleconsulta' && !externalVideoRoomUrl ? uuidv4() : null;
    const nextVideoRoomUrl = externalVideoRoomUrl || (videoRoomId ? `/teleconsulta/${videoRoomId}` : null);
    await query(
      `INSERT INTO appointments 
       (id, patient_id, doctor_id, health_center_id, appointment_date, appointment_time, appointment_type, video_room_id, video_room_url, reason_for_visit, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'scheduled')`,
      [appointmentId, patientId, appointmentDoctorId, selectedHealthCenterId, appointmentDate, appointmentTime, normalizedType, videoRoomId, nextVideoRoomUrl, reasonForVisit || null]
    );

    notifyAppointmentUsers(appointmentId, {
      title: 'Nueva cita medica',
      body: `Tienes una nueva cita el ${appointmentDate} a las ${appointmentTime}.`,
      url: `/appointments/${appointmentId}`,
      type: 'appointment',
      entityType: 'appointment',
      entityId: appointmentId,
      priority: 'normal',
    }).catch((notificationError) => {
      console.error('Create appointment notification error:', notificationError);
    });

    res.status(201).json({
      success: true,
      message: 'Appointment scheduled successfully',
      data: { id: appointmentId, status: 'scheduled', appointmentType: normalizedType, videoRoomId, videoRoomUrl: nextVideoRoomUrl },
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
    await ensurePatientAppointmentFields();
    const { status, month, year, doctorId, page = 1, limit = 20 } = req.query;
    const statusFilter = typeof status === 'string' && status !== 'undefined' && status !== 'null' && status !== '' ? status : null;
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const offset = (Number(page) - 1) * Number(limit);

    let sql = '';
    const params: any[] = [];

    if (userRole === 'patient') {
      sql = `
        SELECT a.id, a.appointment_date, a.appointment_time, a.status, a.reason_for_visit,
               a.appointment_type, a.video_room_url, a.video_room_id,
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
               a.appointment_type, a.video_room_url, a.video_room_id,
               u.first_name, u.last_name, u.email, u.phone, p.id as patient_id,
               p.document_number, p.has_insurance, p.insurance_provider, p.insurance_number
        FROM appointments a
        JOIN patients p ON a.patient_id = p.id
        JOIN users u ON p.id = u.id
        WHERE a.doctor_id = $1
      `;
      params.push(userId);
    } else if (userRole === 'secretary') {
      const assignedDoctors = await queryMany('SELECT doctor_id FROM secretaries WHERE id = $1', [userId]);
      if (!assignedDoctors.length) {
        return res.status(403).json({ success: false, message: 'No doctor assigned' });
      }
      const assignedDoctorIds = assignedDoctors.map((doctor) => doctor.doctor_id);
      const selectedDoctorId = typeof doctorId === 'string' ? doctorId : null;

      if (selectedDoctorId && !assignedDoctorIds.includes(selectedDoctorId)) {
        return res.status(403).json({ success: false, message: 'Secretary is not assigned to this doctor' });
      }

      sql = `
        SELECT a.id, a.appointment_date, a.appointment_time, a.status, a.reason_for_visit,
               a.appointment_type, a.video_room_url, a.video_room_id,
               u.first_name, u.last_name, u.email, u.phone, p.id as patient_id,
               p.document_number, p.has_insurance, p.insurance_provider, p.insurance_number,
               du.first_name AS doctor_first_name, du.last_name AS doctor_last_name,
               a.doctor_id, hc.name AS health_center_name
        FROM appointments a
        JOIN patients p ON a.patient_id = p.id
        JOIN users u ON p.id = u.id
        JOIN users du ON du.id = a.doctor_id
        LEFT JOIN health_centers hc ON a.health_center_id = hc.id
        WHERE a.doctor_id = ANY($1::uuid[])
      `;
      params.push(selectedDoctorId ? [selectedDoctorId] : assignedDoctorIds);
    } else if (userRole === 'admin') {
      sql = `
        SELECT a.id, a.appointment_date, a.appointment_time, a.status, a.reason_for_visit,
               a.appointment_type, a.video_room_url, a.video_room_id,
               pu.first_name, pu.last_name, pu.email, pu.phone, p.id as patient_id,
               p.document_number, p.has_insurance, p.insurance_provider, p.insurance_number,
               du.first_name AS doctor_first_name, du.last_name AS doctor_last_name,
               a.doctor_id, hc.name AS health_center_name
        FROM appointments a
        JOIN patients p ON a.patient_id = p.id
        JOIN users pu ON p.id = pu.id
        JOIN users du ON du.id = a.doctor_id
        LEFT JOIN health_centers hc ON a.health_center_id = hc.id
        WHERE 1 = 1
      `;
    } else {
      return res.status(403).json({ success: false, message: 'No tienes permiso para ver citas medicas.' });
    }

    if (statusFilter) {
      if (!validAppointmentStatuses.includes(statusFilter)) {
        return res.status(400).json({ success: false, message: 'Estado de cita invalido.' });
      }
      sql += ` AND a.status = $${params.length + 1}`;
      params.push(statusFilter);
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
    const userRole = req.user?.role;

    // Check if user has access
    const appointment = await queryOne(
      'SELECT patient_id, doctor_id FROM appointments WHERE id = $1',
      [id]
    );

    // Allow patient, doctor, or secretary assigned to the doctor to cancel
    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    let authorized = false;
    if (appointment.patient_id === userId || appointment.doctor_id === userId) authorized = true;
    if (!authorized && userRole === 'secretary') {
      const sec = await queryOne('SELECT doctor_id FROM secretaries WHERE id = $1 AND doctor_id = $2', [userId, appointment.doctor_id]);
      if (sec && sec.doctor_id === appointment.doctor_id) authorized = true;
    }

    if (!authorized) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    try {
      await query(
        'UPDATE appointments SET status = $1, canceled_at = NOW(), canceled_by = $2 WHERE id = $3',
        ['cancelled', userId, id]
      );
    } catch (updateError: any) {
      if (updateError?.code !== '42703') {
        throw updateError;
      }
      await query('UPDATE appointments SET status = $1 WHERE id = $2', ['cancelled', id]);
    }

    notifyAppointmentUsers(id, {
      title: 'Cita medica cancelada',
      body: 'Una cita medica fue cancelada. Revisa los detalles en SaludClick.',
      url: `/appointments/${id}`,
      type: 'appointment',
      entityType: 'appointment',
      entityId: id,
      priority: 'high',
    }).catch((notificationError) => {
      console.error('Cancel appointment notification error:', notificationError);
    });

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
    const { date, healthCenterId } = req.query;

    const dayOfWeek = getDayOfWeekFromISODate(typeof date === 'string' ? date : undefined);
    if (dayOfWeek === null) {
      return res.status(400).json({ success: false, message: 'Fecha invalida.' });
    }

    const selectedHealthCenterId = typeof healthCenterId === 'string' ? healthCenterId : null;
    const availability = await getDoctorAvailabilityForDate(doctorId, String(date), selectedHealthCenterId);

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

    const bookedTimes = new Set(booked.map((booking) => String(booking.appointment_time).slice(0, 5)));

    // Generate available slots (30-minute intervals)
    const slots = [];
    const allSlots = [];
    const [startHour, startMin] = availability.start_time.split(':').map(Number);
    const [endHour, endMin] = availability.end_time.split(':').map(Number);

    let current = new Date();
    current.setHours(startHour, startMin, 0);
    const end = new Date();
    end.setHours(endHour, endMin, 0);

    while (current < end) {
      const timeStr = current.toTimeString().slice(0, 5);
      const booked = bookedTimes.has(timeStr);
      allSlots.push({ time: timeStr, available: !booked });

      if (!booked) {
        slots.push(timeStr);
      }
      current.setMinutes(current.getMinutes() + 30);
    }

    res.json({
      success: true,
      data: { slots, allSlots },
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
    await ensurePatientAppointmentFields();
    const { id } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    let sql: string;
    let params: any[];

    if (userRole === 'patient') {
      sql = `
        SELECT a.id, a.appointment_date, a.appointment_time, a.status,
               a.appointment_type, a.video_room_url, a.video_room_id,
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
    } else if (userRole === 'doctor') {
      sql = `
        SELECT a.id, a.appointment_date, a.appointment_time, a.status,
               a.appointment_type, a.video_room_url, a.video_room_id,
               a.reason_for_visit, a.notes, a.patient_id,
               u.first_name, u.last_name, u.phone, u.email,
               p.document_number, p.has_insurance, p.insurance_provider, p.insurance_number,
               hc.name as health_center_name, hc.address, hc.city, hc.phone as center_phone
        FROM appointments a
        JOIN patients p ON a.patient_id = p.id
        JOIN users u ON p.id = u.id
        LEFT JOIN health_centers hc ON a.health_center_id = hc.id
        WHERE a.id = $1 AND a.doctor_id = $2`;
      params = [id, userId];
    } else if (userRole === 'secretary') {
      sql = `
        SELECT a.id, a.appointment_date, a.appointment_time, a.status,
               a.appointment_type, a.video_room_url, a.video_room_id,
               a.reason_for_visit, a.notes, a.patient_id, a.doctor_id,
               u.first_name, u.last_name, u.phone, u.email,
               p.document_number, p.has_insurance, p.insurance_provider, p.insurance_number,
               du.first_name AS doctor_first_name, du.last_name AS doctor_last_name,
               hc.name as health_center_name, hc.address, hc.city, hc.phone as center_phone
        FROM appointments a
        JOIN patients p ON a.patient_id = p.id
        JOIN users u ON p.id = u.id
        JOIN users du ON du.id = a.doctor_id
        LEFT JOIN health_centers hc ON a.health_center_id = hc.id
        JOIN secretaries s ON s.doctor_id = a.doctor_id
        WHERE a.id = $1 AND s.id = $2`;
      params = [id, userId];
    } else {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
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
    const { appointmentDate, appointmentTime, notes, status, appointmentType, videoRoomUrl } = req.body;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    const appointment = await queryOne(
      'SELECT patient_id, doctor_id, status as current_status, appointment_type, video_room_id, video_room_url FROM appointments WHERE id = $1',
      [id]
    );

    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    // Allow patient, doctor, or secretary (if assigned) to update
    let authorized = false;
    if (appointment.patient_id === userId || appointment.doctor_id === userId) authorized = true;
    if (!authorized && userRole === 'secretary') {
      const sec = await queryOne('SELECT doctor_id FROM secretaries WHERE id = $1 AND doctor_id = $2', [userId, appointment.doctor_id]);
      if (sec && sec.doctor_id === appointment.doctor_id) authorized = true;
    }

    if (!authorized) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    if (appointment.current_status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Cannot update a cancelled appointment' });
    }

    if (status && !validAppointmentStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Estado de cita invalido.' });
    }

    await ensureAppointmentStatusValue(status);

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

    let nextVideoRoomId: string | null | undefined;
    let nextVideoRoomUrl: string | null | undefined;
    if (appointmentType !== undefined || videoRoomUrl !== undefined) {
      const normalizedType = appointmentType !== undefined
        ? appointmentType === 'teleconsulta' ? 'teleconsulta' : 'presencial'
        : appointment.appointment_type;
      if (normalizedType === 'teleconsulta') {
        const doctor = await queryOne('SELECT teleconsultation_enabled FROM doctors WHERE id = $1', [appointment.doctor_id]);
        if (!doctor?.teleconsultation_enabled) {
          return res.status(400).json({ success: false, message: 'Este médico no tiene teleconsulta disponible.' });
        }
        const externalVideoRoomUrl = normalizeVideoRoomUrl(videoRoomUrl);
        if (videoRoomUrl && !externalVideoRoomUrl) {
          return res.status(400).json({ success: false, message: 'El enlace de teleconsulta debe ser una URL valida.' });
        }
        nextVideoRoomId = externalVideoRoomUrl ? null : appointment.video_room_id || uuidv4();
        nextVideoRoomUrl = externalVideoRoomUrl || appointment.video_room_url || `/teleconsulta/${nextVideoRoomId}`;
      } else {
        nextVideoRoomId = null;
        nextVideoRoomUrl = null;
      }
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (appointmentDate) { updates.push(`appointment_date = $${params.length + 1}`); params.push(appointmentDate); }
    if (appointmentTime) { updates.push(`appointment_time = $${params.length + 1}`); params.push(appointmentTime); }
    if (notes !== undefined) { updates.push(`notes = $${params.length + 1}`); params.push(notes); }
    if (status) { updates.push(`status = $${params.length + 1}`); params.push(status); }
    if (appointmentType !== undefined || videoRoomUrl !== undefined) {
      const normalizedType = appointmentType !== undefined
        ? appointmentType === 'teleconsulta' ? 'teleconsulta' : 'presencial'
        : appointment.appointment_type;
      updates.push(`appointment_type = $${params.length + 1}`); params.push(normalizedType);
      updates.push(`video_room_id = $${params.length + 1}`); params.push(nextVideoRoomId);
      updates.push(`video_room_url = $${params.length + 1}`); params.push(nextVideoRoomUrl);
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }

    params.push(id);
    await query(
      `UPDATE appointments SET ${updates.join(', ')} WHERE id = $${params.length}`,
      params
    );

    notifyAppointmentUsers(id, {
      title: status === 'completed' ? 'Cita medica completada' : appointmentDate || appointmentTime ? 'Cita reagendada' : 'Cita medica actualizada',
      body: status === 'completed'
        ? 'Una cita medica fue marcada como completada.'
        : appointmentDate || appointmentTime
          ? 'Una cita medica fue reagendada. Revisa la nueva fecha y hora.'
          : 'Una cita medica fue actualizada. Revisa los detalles.',
      url: `/appointments/${id}`,
      type: 'appointment',
      entityType: 'appointment',
      entityId: id,
      priority: appointmentDate || appointmentTime ? 'high' : 'normal',
    }).catch((notificationError) => {
      console.error('Update appointment notification error:', notificationError);
    });

    res.json({ success: true, message: 'Appointment updated successfully' });
  } catch (error: any) {
    console.error('Update appointment error:', error);
    res.status(500).json({ success: false, message: 'Error updating appointment' });
  }
};

async function resolveDoctorHealthCenter(doctorId: string, requestedId?: string, fallbackId?: string | null) {
  const targetId = requestedId || fallbackId || null;
  if (!targetId) return null;

  const linked = await queryOne(
    `SELECT health_center_id
     FROM doctor_health_centers
     WHERE doctor_id = $1 AND health_center_id = $2`,
    [doctorId, targetId]
  );
  return linked?.health_center_id || null;
}

export const getTeleconsultationRoom = async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const userId = req.user?.id;
    const { appointment, authorized, isDoctor } = await getAuthorizedTeleconsultation(roomId, req);

    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Teleconsulta not found' });
    }

    if (!authorized) {
      return res.status(403).json({ success: false, message: 'No tienes permiso para acceder a esta teleconsulta.' });
    }

    const participantName = isDoctor
      ? `${appointment.doctor_first_name} ${appointment.doctor_last_name}`.trim()
      : `${appointment.patient_first_name} ${appointment.patient_last_name}`.trim();
    const participantEmail = isDoctor ? appointment.doctor_email : appointment.patient_email;
    const jitsiJwt = createJitsiJwt({
      roomId,
      userId: userId as string,
      userName: participantName || 'SaludClick',
      userEmail: participantEmail,
      isModerator: isDoctor,
    });

    res.json({
      success: true,
      data: {
        ...appointment,
        participant_role: isDoctor ? 'moderator' : 'participant',
        is_moderator: isDoctor,
        jitsi_room_name: buildJitsiRoomName(roomId),
        jitsi_room_path: buildJitsiRoomPath(roomId),
        jitsi_jwt: jitsiJwt,
      },
    });
  } catch (error: any) {
    console.error('Get teleconsultation room error:', error);
    res.status(500).json({ success: false, message: 'Error fetching teleconsultation' });
  }
};

export const postTeleconsultationSignal = async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const { type, payload } = req.body || {};
    const userId = req.user?.id;

    if (!userId || !type) {
      return res.status(400).json({ success: false, message: 'Invalid signal' });
    }

    const { appointment, authorized, isDoctor } = await getAuthorizedTeleconsultation(roomId, req);
    if (!appointment) return res.status(404).json({ success: false, message: 'Teleconsulta not found' });
    if (!authorized) return res.status(403).json({ success: false, message: 'No tienes permiso para acceder a esta teleconsulta.' });

    const now = Date.now();
    const previous = teleconsultationSignals.get(roomId) || [];
    const fresh = previous.filter((signal) => now - signal.createdAt < 30 * 60 * 1000);
    const signal: TeleconsultationSignal = {
      id: ++teleconsultationSignalId,
      roomId,
      senderId: userId,
      senderRole: isDoctor ? 'doctor' : req.user?.role || 'participant',
      type: String(type),
      payload,
      createdAt: now,
    };
    fresh.push(signal);
    teleconsultationSignals.set(roomId, fresh.slice(-200));

    res.json({ success: true, data: { id: signal.id } });
  } catch (error) {
    console.error('Post teleconsultation signal error:', error);
    res.status(500).json({ success: false, message: 'Error sending teleconsultation signal' });
  }
};

export const getTeleconsultationSignals = async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const after = Number(req.query.after || 0);
    const userId = req.user?.id;

    const { appointment, authorized } = await getAuthorizedTeleconsultation(roomId, req);
    if (!appointment) return res.status(404).json({ success: false, message: 'Teleconsulta not found' });
    if (!authorized || !userId) return res.status(403).json({ success: false, message: 'No tienes permiso para acceder a esta teleconsulta.' });

    const now = Date.now();
    const fresh = (teleconsultationSignals.get(roomId) || []).filter((signal) => now - signal.createdAt < 30 * 60 * 1000);
    teleconsultationSignals.set(roomId, fresh);

    res.json({
      success: true,
      data: fresh.filter((signal) => signal.id > after && signal.senderId !== userId),
    });
  } catch (error) {
    console.error('Get teleconsultation signals error:', error);
    res.status(500).json({ success: false, message: 'Error loading teleconsultation signals' });
  }
};
