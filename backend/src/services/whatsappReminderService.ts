import { query, queryOne } from '../db';
import { sendAppointmentReminderWhatsApp } from './whatsappNotifications';

type ReminderType = 'appointment_24h' | 'appointment_2h';

type ReminderCandidate = {
  id: string;
  patient_id: string;
  patient_phone: string;
  patient_first_name: string;
  patient_last_name: string;
  doctor_first_name: string;
  doctor_last_name: string;
  appointment_date_label: string;
  appointment_time_label: string;
  hours_until: string | number;
};

let reminderTimer: NodeJS.Timeout | null = null;

async function ensureWhatsAppReminderTable() {
  await query(
    'ALTER TABLE patients ADD COLUMN IF NOT EXISTS whatsapp_reminders_enabled BOOLEAN NOT NULL DEFAULT false'
  );
  await query('ALTER TABLE patients ADD COLUMN IF NOT EXISTS whatsapp_consent_at TIMESTAMPTZ');
  await query(`
    CREATE TABLE IF NOT EXISTS whatsapp_reminder_deliveries (
      appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
      reminder_type VARCHAR(40) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'processing',
      attempts INTEGER NOT NULL DEFAULT 1,
      provider VARCHAR(40),
      message_id TEXT,
      error_message TEXT,
      sent_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (appointment_id, reminder_type)
    )
  `);
}

async function claimReminder(appointmentId: string, reminderType: ReminderType) {
  return queryOne(
    `INSERT INTO whatsapp_reminder_deliveries
       (appointment_id, reminder_type, status, attempts, updated_at)
     VALUES ($1, $2, 'processing', 1, CURRENT_TIMESTAMP)
     ON CONFLICT (appointment_id, reminder_type)
     DO UPDATE SET
       status = 'processing',
       attempts = whatsapp_reminder_deliveries.attempts + 1,
       error_message = NULL,
       updated_at = CURRENT_TIMESTAMP
     WHERE whatsapp_reminder_deliveries.status = 'failed'
       AND whatsapp_reminder_deliveries.updated_at < NOW() - INTERVAL '5 minutes'
     RETURNING appointment_id`,
    [appointmentId, reminderType]
  );
}

export async function processDueWhatsAppAppointmentReminders() {
  if (
    process.env.WHATSAPP_ENABLED !== 'true' ||
    process.env.WHATSAPP_REMINDERS_ENABLED !== 'true'
  ) {
    return { processed: 0, sent: 0, failed: 0, skipped: true };
  }

  await ensureWhatsAppReminderTable();
  const appointmentTimeZone =
    process.env.APPOINTMENT_TIME_ZONE ||
    'America/Santo_Domingo';

  const candidates = await query(
    `SELECT
       a.id,
       a.patient_id,
       pu.phone AS patient_phone,
       pu.first_name AS patient_first_name,
       pu.last_name AS patient_last_name,
       du.first_name AS doctor_first_name,
       du.last_name AS doctor_last_name,
       TO_CHAR(a.appointment_date, 'DD/MM/YYYY') AS appointment_date_label,
       TO_CHAR(a.appointment_time, 'HH24:MI') AS appointment_time_label,
       EXTRACT(EPOCH FROM (
         ((a.appointment_date::timestamp + a.appointment_time) AT TIME ZONE $1) - NOW()
       )) / 3600 AS hours_until
     FROM appointments a
     JOIN patients p ON p.id = a.patient_id
     JOIN users pu ON pu.id = a.patient_id
     JOIN users du ON du.id = a.doctor_id
     WHERE a.status IN ('scheduled', 'confirmed')
       AND p.whatsapp_reminders_enabled = true
       AND COALESCE(REGEXP_REPLACE(pu.phone, '\\D', '', 'g'), '') <> ''
       AND ((a.appointment_date::timestamp + a.appointment_time) AT TIME ZONE $1) > NOW()
       AND ((a.appointment_date::timestamp + a.appointment_time) AT TIME ZONE $1) <= NOW() + INTERVAL '24 hours'
     ORDER BY a.appointment_date, a.appointment_time`,
    [appointmentTimeZone]
  );

  let sent = 0;
  let failed = 0;

  for (const appointment of candidates.rows as ReminderCandidate[]) {
    const hoursUntil = Number(appointment.hours_until);
    const reminderHours: 24 | 2 = hoursUntil <= 2 ? 2 : 24;
    const reminderType: ReminderType =
      reminderHours === 2 ? 'appointment_2h' : 'appointment_24h';
    const claimed = await claimReminder(appointment.id, reminderType);

    if (!claimed) continue;

    try {
      const result = await sendAppointmentReminderWhatsApp({
        to: appointment.patient_phone,
        patientName: `${appointment.patient_first_name} ${appointment.patient_last_name}`.trim(),
        doctorName: `${appointment.doctor_first_name} ${appointment.doctor_last_name}`.trim(),
        appointmentDate: appointment.appointment_date_label,
        appointmentTime: appointment.appointment_time_label,
        reminderHours,
      });

      await query(
        `UPDATE whatsapp_reminder_deliveries
         SET status = 'sent',
             provider = $3,
             message_id = $4,
             sent_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE appointment_id = $1 AND reminder_type = $2`,
        [appointment.id, reminderType, result.provider, result.messageId || null]
      );
      sent += 1;
    } catch (error: any) {
      const message = String(error?.message || error || 'Unknown WhatsApp error').slice(0, 1000);
      await query(
        `UPDATE whatsapp_reminder_deliveries
         SET status = 'failed',
             error_message = $3,
             updated_at = CURRENT_TIMESTAMP
         WHERE appointment_id = $1 AND reminder_type = $2`,
        [appointment.id, reminderType, message]
      );
      console.error(`WhatsApp ${reminderType} reminder error for appointment ${appointment.id}:`, message);
      failed += 1;
    }
  }

  return {
    processed: candidates.rowCount || 0,
    sent,
    failed,
    skipped: false,
  };
}

export function startWhatsAppReminderScheduler() {
  if (
    reminderTimer ||
    process.env.NODE_ENV === 'test' ||
    process.env.WHATSAPP_ENABLED !== 'true' ||
    process.env.WHATSAPP_REMINDERS_ENABLED !== 'true'
  ) {
    return;
  }

  const configuredMinutes = Number(process.env.WHATSAPP_REMINDER_INTERVAL_MINUTES || 15);
  const intervalMinutes = Number.isFinite(configuredMinutes)
    ? Math.min(Math.max(configuredMinutes, 5), 60)
    : 15;
  const run = () => {
    processDueWhatsAppAppointmentReminders().catch((error) => {
      console.error('WhatsApp appointment reminder scheduler error:', error);
    });
  };

  const initialTimer = setTimeout(run, 10_000);
  initialTimer.unref();
  reminderTimer = setInterval(run, intervalMinutes * 60_000);
  reminderTimer.unref();
}
