import { notifyDoctorRequestTelegram } from '../src/utils/telegram';

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
    return;
  }

  process.env[name] = value;
}

describe('Telegram doctor request notifications', () => {
  const originalFetch = global.fetch;
  const originalBotToken = process.env.TELEGRAM_BOT_TOKEN;
  const originalChatId = process.env.TELEGRAM_DOCTOR_REQUESTS_CHAT_ID;
  const originalFrontendUrl = process.env.FRONTEND_URL;
  const originalPublicAppUrl = process.env.PUBLIC_APP_URL;

  afterEach(() => {
    global.fetch = originalFetch;
    restoreEnv('TELEGRAM_BOT_TOKEN', originalBotToken);
    restoreEnv('TELEGRAM_DOCTOR_REQUESTS_CHAT_ID', originalChatId);
    restoreEnv('FRONTEND_URL', originalFrontendUrl);
    restoreEnv('PUBLIC_APP_URL', originalPublicAppUrl);
    jest.restoreAllMocks();
  });

  it('adds a button that opens the pending doctor requests page', async () => {
    process.env.TELEGRAM_BOT_TOKEN = '123456789:test-token';
    process.env.TELEGRAM_DOCTOR_REQUESTS_CHAT_ID = '987654321';
    process.env.FRONTEND_URL = 'https://salud-c-lick.vercel.app/';
    delete process.env.PUBLIC_APP_URL;

    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      text: jest.fn().mockResolvedValue(''),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    await notifyDoctorRequestTelegram({
      firstName: 'Ana <Prueba>',
      lastName: 'Pérez',
      email: 'ana@example.com',
      specialty: 'Cardiología',
      phone: '809-555-0101',
      exequatur: '12345',
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const requestOptions = fetchMock.mock.calls[0][1] as RequestInit;
    const body = JSON.parse(String(requestOptions.body));

    expect(body.parse_mode).toBe('HTML');
    expect(body.text).toContain(
      '<b>NUEVA SOLICITUD DE MÉDICO - SaludClick</b>'
    );
    expect(body.text).toContain('Ana &lt;Prueba&gt; Pérez');
    expect(body.reply_markup.inline_keyboard).toEqual([
      [
        {
          text: 'Revisar solicitud',
          url: 'https://salud-c-lick.vercel.app/admin/doctor-requests',
        },
      ],
    ]);
  });
});
