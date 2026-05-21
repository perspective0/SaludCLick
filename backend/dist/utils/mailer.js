"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmail = sendEmail;
exports.sendAdminNotification = sendAdminNotification;
const nodemailer_1 = __importDefault(require("nodemailer"));
const smtpHost = process.env.SMTP_HOST;
const smtpPort = Number(process.env.SMTP_PORT || 587);
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const fromEmail = process.env.SMTP_FROM || smtpUser;
const isConfigured = Boolean(smtpHost && smtpUser && smtpPass);
const transporter = isConfigured
    ? nodemailer_1.default.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
            user: smtpUser,
            pass: smtpPass,
        },
    })
    : null;
async function sendEmail(options) {
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
async function sendAdminNotification(options) {
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
//# sourceMappingURL=mailer.js.map