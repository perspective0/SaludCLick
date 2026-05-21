import nodemailer from 'nodemailer';

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
  if (!transporter || !fromEmail) {
    console.log('SMTP no configurado, no se envía email:', options.subject, options.to);
    return;
  }

  await transporter.sendMail({
    from: fromEmail,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
  });
}

export async function sendAdminNotification(options: { subject: string; text: string }) {
  const adminEmail = process.env.SMTP_ADMIN || smtpUser;
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
