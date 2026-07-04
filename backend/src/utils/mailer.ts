import nodemailer from 'nodemailer';
import { getSettings } from '../services/settingsService';

const smtpHost = process.env.SMTP_HOST;
const smtpPort = Number(process.env.SMTP_PORT || 587);
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const fromEmail = process.env.SMTP_FROM || smtpUser;

const isConfigured = Boolean(smtpHost && smtpUser && smtpPass);

const transporter = isConfigured
  ? nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    })
  : null;

export async function sendEmail(options: { to: string; subject: string; text: string; html?: string }) {
  const settings = await getSettings('notifications');
  if (!settings.emailNotifications) return;
  const configuredHost = settings.smtpHost || smtpHost;
  const configuredPort = Number(settings.smtpPort || smtpPort);
  const configuredUser = settings.smtpUser || smtpUser;
  const configuredPass = settings.smtpPassword || smtpPass;
  const configuredFrom = process.env.SMTP_FROM || configuredUser;
  const activeTransporter = configuredHost && configuredUser && configuredPass
    ? nodemailer.createTransport({ host: configuredHost, port: configuredPort, secure: configuredPort === 465, auth: { user: configuredUser, pass: configuredPass } })
    : transporter;
  if (!activeTransporter || !configuredFrom) {
    console.log('SMTP no configurado, no se envía email:', options.subject, options.to);
    return;
  }

  await activeTransporter.sendMail({
    from: configuredFrom,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
  });
}

export async function sendAdminNotification(options: { subject: string; text: string }) {
  const general = await getSettings('general');
  const adminEmail = general.adminEmail || process.env.SMTP_ADMIN || smtpUser;
  if (!adminEmail) {
    console.log('SMTP_ADMIN no configurado, no se envía notificación administrativa.');
    return;
  }

  await sendEmail({
    to: adminEmail,
    subject: options.subject,
    text: options.text,
  });
}
