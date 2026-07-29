type WhatsAppTemplateComponent = {
  type: string;
  parameters?: Array<{ type: string; text: string }>;
};

export type SendTemplateOptions = {
  to: string;
  templateName?: string;
  languageCode?: string;
  components?: WhatsAppTemplateComponent[];
};

type SendTextOptions = {
  to: string;
  text: string;
};

type SendNotificationOptions = SendTextOptions & {
  templateName?: string;
  languageCode?: string;
  components?: WhatsAppTemplateComponent[];
};

export type WhatsAppSendResult = {
  provider: 'whatsapp_cloud_api' | 'evolution_api';
  messageId?: string;
  raw: any;
};

function getConfiguredProvider() {
  return String(process.env.WHATSAPP_PROVIDER || 'cloud').trim().toLowerCase() === 'evolution'
    ? 'evolution'
    : 'cloud';
}

export function getWhatsAppConfigStatus() {
  const provider = getConfiguredProvider();

  return {
    enabled: process.env.WHATSAPP_ENABLED === 'true',
    provider,
    configured: provider === 'evolution'
      ? Boolean(
          process.env.WHATSAPP_EVOLUTION_BASE_URL &&
          process.env.WHATSAPP_EVOLUTION_API_KEY &&
          process.env.WHATSAPP_EVOLUTION_INSTANCE
        )
      : Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID),
    hasAccessToken: Boolean(process.env.WHATSAPP_ACCESS_TOKEN),
    hasPhoneNumberId: Boolean(process.env.WHATSAPP_PHONE_NUMBER_ID),
    hasBusinessAccountId: Boolean(process.env.WHATSAPP_BUSINESS_ACCOUNT_ID),
    hasEvolutionBaseUrl: Boolean(process.env.WHATSAPP_EVOLUTION_BASE_URL),
    hasEvolutionApiKey: Boolean(process.env.WHATSAPP_EVOLUTION_API_KEY),
    evolutionInstance: process.env.WHATSAPP_EVOLUTION_INSTANCE || null,
    apiVersion: process.env.WHATSAPP_API_VERSION || 'v25.0',
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || null,
    businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || null,
    testRecipient: maskPhone(process.env.WHATSAPP_TEST_RECIPIENT || ''),
    adminRecipient: maskPhone(process.env.WHATSAPP_ADMIN_RECIPIENT || ''),
    remindersEnabled: process.env.WHATSAPP_REMINDERS_ENABLED === 'true',
  };
}

export function normalizeWhatsAppPhone(value: string) {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';
  const defaultCountryCode = String(
    process.env.WHATSAPP_DEFAULT_COUNTRY_CODE || ''
  ).replace(/\D/g, '');
  if (defaultCountryCode && digits.length === 10) {
    return `${defaultCountryCode}${digits}`;
  }
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

export async function sendWhatsAppText({
  to,
  text,
}: SendTextOptions): Promise<WhatsAppSendResult> {
  const enabled = process.env.WHATSAPP_ENABLED === 'true';
  const provider = getConfiguredProvider();
  const recipient = normalizeWhatsAppPhone(to);
  const cleanText = String(text || '').trim();

  if (!enabled) {
    throw new Error('WhatsApp is disabled. Set WHATSAPP_ENABLED=true.');
  }
  if (!recipient) {
    throw new Error('WhatsApp recipient phone is required.');
  }
  if (!cleanText) {
    throw new Error('WhatsApp message text is required.');
  }

  if (provider === 'cloud') {
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const apiVersion = process.env.WHATSAPP_API_VERSION || 'v25.0';

    if (!accessToken || !phoneNumberId) {
      throw new Error('WhatsApp access token or phone number ID is missing.');
    }

    const response = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: recipient,
        type: 'text',
        text: {
          preview_url: false,
          body: cleanText,
        },
      }),
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

  const baseUrl = String(process.env.WHATSAPP_EVOLUTION_BASE_URL || '').trim().replace(/\/+$/, '');
  const apiKey = String(process.env.WHATSAPP_EVOLUTION_API_KEY || '').trim();
  const instance = String(process.env.WHATSAPP_EVOLUTION_INSTANCE || '').trim();

  if (!baseUrl || !apiKey || !instance) {
    throw new Error('Evolution API URL, API key or instance is missing.');
  }

  let endpoint: URL;
  try {
    endpoint = new URL(`${baseUrl}/message/sendText/${encodeURIComponent(instance)}`);
  } catch {
    throw new Error('Evolution API URL is invalid.');
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      apikey: apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      number: recipient,
      textMessage: {
        text: cleanText,
      },
      linkPreview: false,
    }),
  });

  const raw: any = await response.json().catch(async () => ({
    message: await response.text().catch(() => ''),
  }));
  if (!response.ok) {
    const message = raw?.message || raw?.error || `Evolution API error ${response.status}`;
    throw new Error(typeof message === 'string' ? message : JSON.stringify(message));
  }

  return {
    provider: 'evolution_api',
    messageId: raw?.key?.id || raw?.messageId,
    raw,
  };
}

export async function sendWhatsAppNotification({
  to,
  text,
  templateName,
  languageCode,
  components,
}: SendNotificationOptions): Promise<WhatsAppSendResult> {
  if (getConfiguredProvider() === 'evolution') {
    return sendWhatsAppText({ to, text });
  }

  if (!templateName) {
    throw new Error('A Meta-approved WhatsApp template is required for this notification.');
  }

  return sendWhatsAppTemplate({
    to,
    templateName,
    languageCode,
    components,
  });
}

function maskPhone(value: string) {
  const digits = normalizeWhatsAppPhone(value);
  if (digits.length <= 4) return digits || null;
  return `${'*'.repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`;
}
