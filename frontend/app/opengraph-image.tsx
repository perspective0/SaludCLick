import { headers } from 'next/headers';
import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'SaludClick, tu salud a un clic de distancia';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

function getRequestOrigin() {
  const requestHeaders = headers();
  const host =
    requestHeaders.get('x-forwarded-host') ||
    requestHeaders.get('host') ||
    'salud-c-lick.vercel.app';
  const protocol =
    requestHeaders.get('x-forwarded-proto') ||
    (host.startsWith('localhost') || host.startsWith('127.0.0.1')
      ? 'http'
      : 'https');

  return `${protocol}://${host}`;
}

export default function OpenGraphImage() {
  const logoUrl = new URL('/saludclick.png', getRequestOrigin()).toString();

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          overflow: 'hidden',
          background:
            'linear-gradient(135deg, #f8fafc 0%, #ecfeff 46%, #dbeafe 100%)',
          color: '#0f172a',
          fontFamily: 'Arial, Helvetica, sans-serif',
          padding: '72px 84px',
        }}
      >
        <div
          style={{
            position: 'absolute',
            width: 460,
            height: 460,
            borderRadius: '50%',
            right: -110,
            top: -160,
            background: 'rgba(14, 165, 233, 0.13)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            width: 340,
            height: 340,
            borderRadius: '50%',
            left: -170,
            bottom: -210,
            background: 'rgba(37, 99, 235, 0.11)',
          }}
        />

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            width: '100%',
            zIndex: 1,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <img
              src={logoUrl}
              alt="SaludClick"
              width="500"
              height="161"
              style={{
                width: 500,
                height: 161,
                objectFit: 'contain',
                objectPosition: 'left center',
              }}
            />
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              maxWidth: 930,
              gap: 22,
            }}
          >
            <div
              style={{
                display: 'flex',
                color: '#0f172a',
                fontSize: 56,
                fontWeight: 750,
                lineHeight: 1.08,
                letterSpacing: -2,
              }}
            >
              Tu salud, a un clic de distancia
            </div>
            <div
              style={{
                display: 'flex',
                color: '#475569',
                fontSize: 27,
                lineHeight: 1.4,
              }}
            >
              Encuentra médicos, agenda citas y accede a atención presencial o
              por teleconsulta.
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              color: '#0369a1',
              fontSize: 22,
              fontWeight: 700,
            }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: '#10b981',
              }}
            />
            salud-c-lick.vercel.app
          </div>
        </div>
      </div>
    ),
    size
  );
}
