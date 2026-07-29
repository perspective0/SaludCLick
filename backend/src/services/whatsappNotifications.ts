import { sendWhatsAppNotification } from './whatsappService';

export type DoctorRequestWhatsAppPayload = {
  firstName: string;
  lastName: string;
  email: string;
  specialty?: string | null;
  phone?: string | null;
  exequatur?: string | null;
};

export type AppointmentReminderWhatsAppPayload = {
  to: string;
  patientName: string;
  doctorName: string;
  appointmentDate: string;
  appointmentTime: string;
  reminderHours: 24 | 2;
};

function getPublicAppUrl(pathname: string) {
  const configuredUrl =
    process.env.FRONTEND_URL ||
    process.env.PUBLIC_APP_URL ||
    'https://salud-c-lick.vercel.app';

  try {
    return new URL(pathname, configuredUrl).toString();
  } catch {
    return `https://salud-c-lick.vercel.app${pathname}`;
  }
}

function templateParameters(values: string[]) {
  return [
    {
      type: 'body',
      parameters: values.map((text) => ({ type: 'text', text })),
    },
  ];
}

export async function notifyDoctorRequestWhatsApp(payload: DoctorRequestWhatsAppPayload) {
  const recipient =
    process.env.WHATSAPP_ADMIN_RECIPIENT ||
    process.env.WHATSAPP_TEST_RECIPIENT ||
    '';

  if (process.env.WHATSAPP_ENABLED !== 'true' || !recipient) {
    return null;
  }

  const fullName = `${payload.firstName} ${payload.lastName}`.trim();
  const requestedAt = new Date().toLocaleString('es-DO', {
    timeZone: 'America/Santo_Domingo',
  });
  const requestsUrl = getPublicAppUrl('/admin/doctor-requests');
  const text = [
    'NUEVA SOLICITUD DE MÉDICO - SaludClick',
    '',
    `Médico: ${fullName}`,
    `Email: ${payload.email}`,
    `Teléfono: ${payload.phone || 'No proporcionado'}`,
    `Exequatur: ${payload.exequatur || 'Pendiente'}`,
    `Especialidad: ${payload.specialty || 'No indicada'}`,
    `Solicitado: ${requestedAt}`,
    '',
    `Revisar solicitud: ${requestsUrl}`,
  ].join('\n');

  return sendWhatsAppNotification({
    to: recipient,
    text,
    templateName: process.env.WHATSAPP_DOCTOR_REQUEST_TEMPLATE,
    languageCode: process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'es',
    components: templateParameters([
      fullName,
      payload.email,
      payload.phone || 'No proporcionado',
      payload.exequatur || 'Pendiente',
      payload.specialty || 'No indicada',
      requestsUrl,
    ]),
  });
}

export async function sendAppointmentReminderWhatsApp(
  payload: AppointmentReminderWhatsAppPayload
) {
  const appointmentsUrl = getPublicAppUrl('/patient/appointments');
  const text = [
    `Hola ${payload.patientName},`,
    '',
    `Te recordamos que tienes una cita con Dr(a). ${payload.doctorName} el ${payload.appointmentDate} a las ${payload.appointmentTime}.`,
    '',
    `Consulta los detalles en SaludClick: ${appointmentsUrl}`,
  ].join('\n');

  return sendWhatsAppNotification({
    to: payload.to,
    text,
    templateName: process.env.WHATSAPP_APPOINTMENT_REMINDER_TEMPLATE,
    languageCode: process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'es',
    components: templateParameters([
      payload.patientName,
      payload.doctorName,
      payload.appointmentDate,
      payload.appointmentTime,
      appointmentsUrl,
    ]),
  });
}
