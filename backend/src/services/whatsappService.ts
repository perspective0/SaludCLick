type WhatsAppTemplateComponent = {
  type: string;
  parameters?: Array<{ type: string; text: string }>;
};

type SendTemplateOptions = {
  to: string;
  templateName?: string;
  languageCode?: string;
  components?: WhatsAppTemplateComponent[];
};

export type WhatsAppSendResult = {
  provider: 'whatsapp_cloud_api';
  messageId?: string;
  raw: any;
};

export function getWhatsAppConfigStatus() {
  return {
    enabled: process.env.WHATSAPP_ENABLED === 'true',
    hasAccessToken: Boolean(process.env.WHATSAPP_ACCESS_TOKEN),
    hasPhoneNumberId: Boolean(process.env.WHATSAPP_PHONE_NUMBER_ID),
    hasBusinessAccountId: Boolean(process.env.WHATSAPP_BUSINESS_ACCOUNT_ID),
    apiVersion: process.env.WHATSAPP_API_VERSION || 'v25.0',
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || null,
    businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || null,
    testRecipient: maskPhone(process.env.WHATSAPP_TEST_RECIPIENT || ''),
  };
}

export function normalizeWhatsAppPhone(value: string) {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';
  return digits;
}

export async function sendWhatsAppTemplate({
  to,
  templateName = 'hello_world',
  languageCode = 'en_US',
  components,
}: SendTemplateOptions): Promise<WhatsAppSendResult> {
  const enabled = process.env.WHATSAPP_ENABLED === 'true';
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const apiVersion = process.env.WHATSAPP_API_VERSION || 'v25.0';
  const recipient = normalizeWhatsAppPhone(to);

  if (!enabled) {
    throw new Error('WhatsApp is disabled. Set WHATSAPP_ENABLED=true.');
  }
  if (!accessToken || !phoneNumberId) {
    throw new Error('WhatsApp access token or phone number ID is missing.');
  }
  if (!recipient) {
    throw new Error('WhatsApp recipient phone is required.');
  }

  const payload: any = {
    messaging_product: 'whatsapp',
    to: recipient,
    type: 'template',
    template: {
      name: templateName,
      language: { code: languageCode },
    },
  };

  if (components?.length) {
    payload.template.components = components;
  }

  const response = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const raw: any = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = raw?.error?.message || `WhatsApp API error ${response.status}`;
    throw new Error(message);
  }

  return {
    provider: 'whatsapp_cloud_api',
    messageId: raw?.messages?.[0]?.id,
    raw,
  };
}

function maskPhone(value: string) {
  const digits = normalizeWhatsAppPhone(value);
  if (digits.length <= 4) return digits || null;
  return `${'*'.repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`;
}
