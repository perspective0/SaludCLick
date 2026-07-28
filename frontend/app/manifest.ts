import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'SaludClick - Citas médicas y salud digital',
    short_name: 'SaludClick',
    description:
      'Encuentra médicos, agenda citas presenciales o teleconsultas y gestiona tu información de salud.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#f8fafc',
    theme_color: '#0ea5e9',
    lang: 'es-DO',
    categories: ['health', 'medical', 'lifestyle'],
    icons: [
      {
        src: '/icons/pwa-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/pwa-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/pwa-maskable-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      {
        name: 'Buscar médicos',
        short_name: 'Médicos',
        description: 'Explora los médicos disponibles en SaludClick.',
        url: '/doctors',
        icons: [
          {
            src: '/icons/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
        ],
      },
      {
        name: 'Agendar una cita',
        short_name: 'Agendar',
        description: 'Comienza a agendar una cita médica.',
        url: '/booking',
        icons: [
          {
            src: '/icons/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
        ],
      },
    ],
  };
}
