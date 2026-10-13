export function translateNotificationText(value: string | undefined, en: boolean) {
  if (!value || !en) return value || '';

  const appointment = value.match(/^Cita próxima en (\d+) horas?$/i);
  if (appointment) return `Upcoming appointment in ${appointment[1]} hours`;

  const appointmentMessage = value.match(/^Tienes cita con (.+) a las (.+)\.$/i);
  if (appointmentMessage) return `You have an appointment with ${appointmentMessage[1]} at ${appointmentMessage[2]}.`;

  return value;
}
