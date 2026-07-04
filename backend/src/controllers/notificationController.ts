import { Request, Response } from 'express';
import webpush from 'web-push';
import { query, queryOne } from '../db';
import { auditClinicalAction } from '../utils/audit';

const generatedKeys = webpush.generateVAPIDKeys();
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || generatedKeys.publicKey;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || generatedKeys.privateKey;
const vapidSubject = process.env.VAPID_SUBJECT || process.env.SMTP_FROM || 'mailto:admin@saludclick.com';

webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

type PushSubscriptionPayload = {
  endpoint: string;
  expirationTime?: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
};

async function ensureNotificationTables() {
  await query(`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      endpoint TEXT NOT NULL UNIQUE,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      user_agent TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_used_at TIMESTAMP
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      role VARCHAR(30),
      type VARCHAR(40) DEFAULT 'general',
      title VARCHAR(160) NOT NULL,
      body TEXT NOT NULL,
      message TEXT,
      url TEXT,
      entity_type VARCHAR(60),
      entity_id UUID,
      status VARCHAR(20) DEFAULT 'unread',
      priority VARCHAR(20) DEFAULT 'normal',
      channel VARCHAR(30) DEFAULT 'in_app',
      provider_status VARCHAR(40),
      provider_response JSONB,
      scheduled_for TIMESTAMP,
      sent_at TIMESTAMP,
      read_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const migrations = [
    `ALTER TABLE notifications ADD COLUMN IF NOT EXISTS role VARCHAR(30)`,
    `ALTER TABLE notifications ADD COLUMN IF NOT EXISTS type VARCHAR(40) DEFAULT 'general'`,
    `ALTER TABLE notifications ADD COLUMN IF NOT EXISTS message TEXT`,
    `ALTER TABLE notifications ADD COLUMN IF NOT EXISTS entity_type VARCHAR(60)`,
    `ALTER TABLE notifications ADD COLUMN IF NOT EXISTS entity_id UUID`,
    `ALTER TABLE notifications ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'unread'`,
    `ALTER TABLE notifications ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'normal'`,
    `ALTER TABLE notifications ADD COLUMN IF NOT EXISTS channel VARCHAR(30) DEFAULT 'in_app'`,
    `ALTER TABLE notifications ADD COLUMN IF NOT EXISTS provider_status VARCHAR(40)`,
    `ALTER TABLE notifications ADD COLUMN IF NOT EXISTS provider_response JSONB`,
    `ALTER TABLE notifications ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMP`,
    `ALTER TABLE notifications ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP`,
    `UPDATE notifications SET message = body WHERE message IS NULL`,
    `UPDATE notifications SET status = CASE WHEN read_at IS NULL THEN 'unread' ELSE 'read' END WHERE status IS NULL`,
    `CREATE INDEX IF NOT EXISTS idx_notifications_user_status_created ON notifications(user_id, status, created_at)`,
    `CREATE INDEX IF NOT EXISTS idx_notifications_user_type_created ON notifications(user_id, type, created_at)`,
    `CREATE INDEX IF NOT EXISTS idx_notifications_entity ON notifications(entity_type, entity_id)`,
    `CREATE INDEX IF NOT EXISTS idx_notifications_scheduled ON notifications(scheduled_for)`,
    `CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id)`,
  ];

  for (const sql of migrations) {
    await query(sql);
  }
}

export const getVapidPublicKey = async (_req: Request, res: Response) => {
  return res.json({ success: true, data: { publicKey: vapidPublicKey } });
};

export const subscribeToPush = async (req: Request, res: Response) => {
  try {
    await ensureNotificationTables();

    const subscription = req.body.subscription as PushSubscriptionPayload | undefined;
    if (!req.user?.id || !subscription?.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
      return res.status(400).json({ success: false, message: 'Suscripcion invalida' });
    }

    const userAgent = req.headers['user-agent'] || '';
    const result = await query(
      `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, user_agent, updated_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
       ON CONFLICT (endpoint)
       DO UPDATE SET user_id = EXCLUDED.user_id,
                     p256dh = EXCLUDED.p256dh,
                     auth = EXCLUDED.auth,
                     user_agent = EXCLUDED.user_agent,
                     updated_at = CURRENT_TIMESTAMP
       RETURNING id`,
      [req.user.id, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth, userAgent]
    );

    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err: any) {
    console.error('subscribeToPush error', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

export const listNotifications = async (req: Request, res: Response) => {
  try {
    await ensureNotificationTables();
    await generateDueAppointmentReminders(req.user?.id);

    const { status, type, limit = 30 } = req.query;
    const params: any[] = [req.user?.id];
    const filters = ['user_id = $1', "status != 'archived'"];

    if (status && status !== 'all') {
      filters.push(`status = $${params.length + 1}`);
      params.push(status);
    }

    if (type && type !== 'all') {
      filters.push(`type = $${params.length + 1}`);
      params.push(type);
    }
    params.push(Number(limit) || 30);

    const result = await query(
      `SELECT id, role, type, title, COALESCE(message, body) AS message, body, url,
              entity_type, entity_id, status, priority, channel, scheduled_for,
              sent_at, read_at, created_at
       FROM notifications
       WHERE ${filters.join(' AND ')}
       ORDER BY created_at DESC
       LIMIT $${params.length}`,
      params
    );

    const unread = await queryOne(
      `SELECT COUNT(*)::int AS count FROM notifications WHERE user_id = $1 AND status = 'unread'`,
      [req.user?.id]
    );

    return res.json({
      success: true,
      data: result.rows,
      unread: unread?.count || 0,
    });
  } catch (err: any) {
    console.error('listNotifications error', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

export const markAllNotificationsRead = async (req: Request, res: Response) => {
  try {
    await ensureNotificationTables();

    const result = await query(
      `UPDATE notifications
       SET read_at = CURRENT_TIMESTAMP, status = 'read'
       WHERE user_id = $1 AND status = 'unread'
       RETURNING id`,
      [req.user?.id]
    );

    await auditClinicalAction(req, { action: 'read_all', entity: 'notifications', newData: { count: result.rowCount } }).catch(() => null);
    return res.json({ success: true });
  } catch (err: any) {
    console.error('markNotificationRead error', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

export const markNotificationRead = async (req: Request, res: Response) => {
  try {
    await ensureNotificationTables();
    const { id } = req.params;

    const result = await query(
      `UPDATE notifications
       SET read_at = CURRENT_TIMESTAMP, status = 'read'
       WHERE id = $1 AND user_id = $2
       RETURNING id, entity_type, entity_id`,
      [id, req.user?.id]
    );

    if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Notification not found' });
    await auditClinicalAction(req, { action: 'read', entity: 'notifications', entityId: id, newData: result.rows[0] }).catch(() => null);
    return res.json({ success: true, data: result.rows[0] });
  } catch (err: any) {
    console.error('markNotificationRead error', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

export const archiveNotification = async (req: Request, res: Response) => {
  try {
    await ensureNotificationTables();
    const { id } = req.params;

    const result = await query(
      `UPDATE notifications
       SET status = 'archived'
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [id, req.user?.id]
    );

    if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Notification not found' });
    await auditClinicalAction(req, { action: 'archive', entity: 'notifications', entityId: id }).catch(() => null);
    return res.json({ success: true });
  } catch (err: any) {
    console.error('archiveNotification error', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

type NotifyPayload = {
  title: string;
  body?: string;
  message?: string;
  url?: string;
  type?: string;
  entityType?: string;
  entityId?: string;
  priority?: 'low' | 'normal' | 'high';
  scheduledFor?: string | Date | null;
  channel?: 'in_app' | 'email' | 'whatsapp';
};

export async function notifyUser(userId: string, payload: NotifyPayload) {
  await ensureNotificationTables();

  const user = await queryOne('SELECT role FROM users WHERE id = $1', [userId]);
  const message = payload.message || payload.body || '';

  const inserted = await queryOne(
    `INSERT INTO notifications
      (user_id, role, type, title, body, message, url, entity_type, entity_id, priority, channel, scheduled_for, sent_at, status)
     SELECT $1,$2,$3,$4,$5,$5,$6,$7,$8,$9,$10,$11,CURRENT_TIMESTAMP,'unread'
     WHERE NOT EXISTS (
       SELECT 1 FROM notifications
       WHERE user_id = $1
         AND COALESCE(entity_type, '') = COALESCE($7, '')
         AND entity_id IS NOT DISTINCT FROM $8
         AND (
           COALESCE($7::text, '') IN ('appointment_24h', 'appointment_2h')
           OR (title = $4 AND created_at > NOW() - INTERVAL '10 minutes')
         )
     )
     RETURNING *`,
    [
      userId,
      user?.role || null,
      payload.type || 'general',
      payload.title,
      message,
      payload.url || null,
      payload.entityType || null,
      payload.entityId || null,
      payload.priority || 'normal',
      payload.channel || 'in_app',
      payload.scheduledFor || null,
    ]
  );

  if (!inserted) return;

  await query(
    `INSERT INTO audit_logs (user_id, action, entity, entity_id, new_data)
     VALUES ($1, 'create_auto', 'notifications', $2, $3)`,
    [userId, inserted.id, JSON.stringify({ type: inserted.type, title: inserted.title, entityType: inserted.entity_type })]
  ).catch(() => null);

  const subscriptions = await query(
    `SELECT id, endpoint, p256dh, auth
     FROM push_subscriptions
     WHERE user_id = $1`,
    [userId]
  );

  await Promise.all(
    subscriptions.rows.map(async (subscription: any) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          JSON.stringify({
            title: payload.title,
            body: message,
            url: payload.url || '/doctor/dashboard',
          })
        );

        await query('UPDATE push_subscriptions SET last_used_at = CURRENT_TIMESTAMP WHERE id = $1', [subscription.id]);
      } catch (err: any) {
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await query('DELETE FROM push_subscriptions WHERE id = $1', [subscription.id]);
        } else {
          console.error('sendNotification error', err);
        }
      }
    })
  );
}

export async function notifyAppointmentUsers(appointmentId: string, payload: NotifyPayload) {
  const appointment = await queryOne(
    `SELECT patient_id, doctor_id
     FROM appointments
     WHERE id = $1`,
    [appointmentId]
  );

  if (!appointment) return;

  const secretaries = await query(
    `SELECT id
     FROM secretaries
     WHERE doctor_id = $1`,
    [appointment.doctor_id]
  );
  const recipients = new Set<string>([
    appointment.patient_id,
    appointment.doctor_id,
    ...secretaries.rows.map((secretary: any) => secretary.id),
  ]);

  await Promise.all(Array.from(recipients).map((recipientId) => notifyUser(recipientId, payload)));
}

export async function generateDueAppointmentReminders(userId?: string) {
  if (!userId) return;

  const user = await queryOne('SELECT role FROM users WHERE id = $1', [userId]);
  const isSecretary = user?.role === 'secretary';

  const appointments = await query(
    `SELECT a.id, a.patient_id, a.doctor_id, a.appointment_date, a.appointment_time, a.status,
            pu.first_name AS patient_first_name, pu.last_name AS patient_last_name,
            du.first_name AS doctor_first_name, du.last_name AS doctor_last_name
     FROM appointments a
     JOIN users pu ON pu.id = a.patient_id
     JOIN users du ON du.id = a.doctor_id
     WHERE (
       a.patient_id = $1
       OR a.doctor_id = $1
       OR EXISTS (
         SELECT 1 FROM secretaries s
         WHERE s.id = $1 AND s.doctor_id = a.doctor_id
       )
     )
       AND a.status IN ('scheduled', 'confirmed')
       AND (a.appointment_date::timestamp + a.appointment_time) BETWEEN NOW() AND NOW() + INTERVAL '24 hours'`,
    [userId]
  );

  for (const appointment of appointments.rows) {
    const appointmentAt = new Date(`${appointment.appointment_date.toISOString().slice(0, 10)}T${String(appointment.appointment_time).slice(0, 8)}`);
    const diffHours = (appointmentAt.getTime() - Date.now()) / 36e5;
    const reminderType = diffHours <= 2 ? 'appointment_2h' : 'appointment_24h';
    const recipientIsDoctor = userId === appointment.doctor_id;
    const recipientIsPatient = userId === appointment.patient_id;
    const patientName = `${appointment.patient_first_name} ${appointment.patient_last_name}`.trim();
    const doctorName = `${appointment.doctor_first_name} ${appointment.doctor_last_name}`.trim();
    const time = String(appointment.appointment_time).slice(0, 5);

    await notifyUser(userId, {
      type: 'appointment',
      title: diffHours <= 2 ? 'Cita próxima en 2 horas' : 'Cita próxima en 24 horas',
      body: recipientIsDoctor
        ? `Tienes cita con ${patientName} a las ${time}.`
        : recipientIsPatient
          ? `Tienes cita con Dr. ${doctorName} a las ${time}.`
          : isSecretary
            ? `La cita de ${patientName} con Dr. ${doctorName} es a las ${time}.`
            : `Tienes una cita próxima a las ${time}.`,
      url: recipientIsPatient ? '/patient/appointments' : isSecretary ? '/secretary/dashboard' : '/appointments',
      entityType: reminderType,
      entityId: appointment.id,
      priority: diffHours <= 2 ? 'high' : 'normal',
    });
  }
}
