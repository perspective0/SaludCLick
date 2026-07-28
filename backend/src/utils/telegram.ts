type DoctorRequestTelegramPayload = {
  firstName: string;
  lastName: string;
  email: string;
  specialty?: string | null;
  phone?: string | null;
  exequatur?: string | null;
};

const COMPROMISED_TELEGRAM_TOKENS = new Set([
  '8954084768:AAER7Ryd1c3Ac3rMPRLoCWzUjTxUcBw-L6g',
]);

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getDoctorRequestsUrl() {
  const configuredUrl =
    process.env.FRONTEND_URL ||
    process.env.PUBLIC_APP_URL ||
    'https://salud-c-lick.vercel.app';

  try {
    return new URL('/admin/doctor-requests', configuredUrl).toString();
  } catch {
    return 'https://salud-c-lick.vercel.app/admin/doctor-requests';
  }
}

export async function notifyDoctorRequestTelegram(payload: DoctorRequestTelegramPayload) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_DOCTOR_REQUESTS_CHAT_ID;

  if (!botToken || !chatId) {
    return;
  }

  if (COMPROMISED_TELEGRAM_TOKENS.has(botToken)) {
    throw new Error('Configured Telegram bot token was previously exposed. Rotate it before enabling Telegram notifications.');
  }

  const requestedAt = new Date().toLocaleString('es-DO', {
    timeZone: 'America/Santo_Domingo',
  });
  const doctorRequestsUrl = getDoctorRequestsUrl();

  const message = [
    '<b>NUEVA SOLICITUD DE MÉDICO - SaludClick</b>',
    '',
    `Dr(a). ${escapeHtml(`${payload.firstName} ${payload.lastName}`.trim())}`,
    '',
    '<b>Información de contacto:</b>',
    `Email: ${escapeHtml(payload.email)}`,
    `Teléfono: ${escapeHtml(payload.phone || 'No proporcionado')}`,
    `Exequatur: ${escapeHtml(payload.exequatur || 'Pendiente')}`,
    `Especialidad: ${escapeHtml(payload.specialty || 'No indicada')}`,
    '',
    `Solicitado: ${escapeHtml(requestedAt)}`,
    '',
    'Acción requerida: Revisar documentación y aprobar o rechazar la solicitud.',
  ].join('\n');

  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: 'Revisar solicitud',
              url: doctorRequestsUrl,
            },
          ],
        ],
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Telegram notification failed: ${response.status} ${body}`);
  }
}
