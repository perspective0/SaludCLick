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

function escapeMarkdown(value: string) {
  return value.replace(/([_*\[\]()~`>#+\-=|{}.!])/g, '\\$1');
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

  const message = [
    '*NUEVA SOLICITUD DE MEDICO - SaludClick*',
    '',
    `Dr(a). ${escapeMarkdown(`${payload.firstName} ${payload.lastName}`.trim())}`,
    '',
    '*Informacion de contacto:*',
    `Email: ${escapeMarkdown(payload.email)}`,
    `Telefono: ${escapeMarkdown(payload.phone || 'No proporcionado')}`,
    `Exequatur: ${escapeMarkdown(payload.exequatur || 'Pendiente')}`,
    `Especialidad: ${escapeMarkdown(payload.specialty || 'No indicada')}`,
    '',
    `Solicitado: ${escapeMarkdown(requestedAt)}`,
    '',
    'Accion requerida: Revisar documentacion y aprobar/rechazar solicitud',
  ].join('\n');

  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: 'MarkdownV2',
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Telegram notification failed: ${response.status} ${body}`);
  }
}
