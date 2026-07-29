import {
  getWhatsAppConfigStatus,
  sendWhatsAppNotification,
} from '../src/services/whatsappService';

const ENV_NAMES = [
  'WHATSAPP_ENABLED',
  'WHATSAPP_PROVIDER',
  'WHATSAPP_EVOLUTION_BASE_URL',
  'WHATSAPP_EVOLUTION_API_KEY',
  'WHATSAPP_EVOLUTION_INSTANCE',
  'WHATSAPP_ACCESS_TOKEN',
  'WHATSAPP_PHONE_NUMBER_ID',
  'WHATSAPP_DEFAULT_COUNTRY_CODE',
] as const;

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
    return;
  }
  process.env[name] = value;
}

describe('WhatsApp notifications', () => {
  const originalFetch = global.fetch;
  const originalEnv = Object.fromEntries(
    ENV_NAMES.map((name) => [name, process.env[name]])
  );

  afterEach(() => {
    global.fetch = originalFetch;
    ENV_NAMES.forEach((name) => restoreEnv(name, originalEnv[name]));
    jest.restoreAllMocks();
  });

  it('sends plain text through Evolution API', async () => {
    process.env.WHATSAPP_ENABLED = 'true';
    process.env.WHATSAPP_PROVIDER = 'evolution';
    process.env.WHATSAPP_EVOLUTION_BASE_URL = 'https://evolution.example.com/';
    process.env.WHATSAPP_EVOLUTION_API_KEY = 'test-api-key';
    process.env.WHATSAPP_EVOLUTION_INSTANCE = 'saludclick';

    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ key: { id: 'message-123' } }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await sendWhatsAppNotification({
      to: '+1 (809) 555-0101',
      text: 'Recordatorio de cita',
    });

    expect(result).toMatchObject({
      provider: 'evolution_api',
      messageId: 'message-123',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      new URL('https://evolution.example.com/message/sendText/saludclick'),
      expect.objectContaining({
        method: 'POST',
        headers: {
          apikey: 'test-api-key',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          number: '18095550101',
          textMessage: {
            text: 'Recordatorio de cita',
          },
          linkPreview: false,
        }),
      })
    );
  });

  it('requires an approved template for proactive Meta notifications', async () => {
    process.env.WHATSAPP_ENABLED = 'true';
    process.env.WHATSAPP_PROVIDER = 'cloud';
    process.env.WHATSAPP_ACCESS_TOKEN = 'test-token';
    process.env.WHATSAPP_PHONE_NUMBER_ID = 'phone-number-id';

    await expect(
      sendWhatsAppNotification({
        to: '18095550101',
        text: 'Recordatorio de cita',
      })
    ).rejects.toThrow('Meta-approved WhatsApp template');
  });

  it('sends an approved template through Meta Cloud API', async () => {
    process.env.WHATSAPP_ENABLED = 'true';
    process.env.WHATSAPP_PROVIDER = 'cloud';
    process.env.WHATSAPP_ACCESS_TOKEN = 'test-token';
    process.env.WHATSAPP_PHONE_NUMBER_ID = 'phone-number-id';
    process.env.WHATSAPP_DEFAULT_COUNTRY_CODE = '1';

    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ messages: [{ id: 'wamid-123' }] }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const components = [
      {
        type: 'body',
        parameters: [{ type: 'text', text: 'Ana' }],
      },
    ];
    const result = await sendWhatsAppNotification({
      to: '809-555-0101',
      text: 'Texto de respaldo',
      templateName: 'recordatorio_cita',
      languageCode: 'es',
      components,
    });

    expect(result).toMatchObject({
      provider: 'whatsapp_cloud_api',
      messageId: 'wamid-123',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://graph.facebook.com/v25.0/phone-number-id/messages',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: '18095550101',
          type: 'template',
          template: {
            name: 'recordatorio_cita',
            language: { code: 'es' },
            components,
          },
        }),
      })
    );
  });

  it('reports whether Evolution API is completely configured', () => {
    process.env.WHATSAPP_ENABLED = 'true';
    process.env.WHATSAPP_PROVIDER = 'evolution';
    process.env.WHATSAPP_EVOLUTION_BASE_URL = 'https://evolution.example.com';
    process.env.WHATSAPP_EVOLUTION_API_KEY = 'test-api-key';
    process.env.WHATSAPP_EVOLUTION_INSTANCE = 'saludclick';

    expect(getWhatsAppConfigStatus()).toMatchObject({
      enabled: true,
      provider: 'evolution',
      configured: true,
      hasEvolutionApiKey: true,
      evolutionInstance: 'saludclick',
    });
  });
});
