export type ExternalNotificationChannel = 'email' | 'whatsapp';

export type ExternalNotificationPayload = {
  to: string;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
};

export async function sendExternalNotification(
  channel: ExternalNotificationChannel,
  payload: ExternalNotificationPayload
) {
  return {
    channel,
    providerStatus: 'not_configured',
    providerResponse: {
      message: 'External notification providers are prepared but not configured yet.',
      to: payload.to,
    },
  };
}
