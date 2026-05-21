import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SaludClick - Gestión de Citas Médicas',
  description: 'Plataforma de telemedicina para agendar citas con médicos especializados. Conecta pacientes, médicos y secretarias en una sola plataforma.',
  keywords: 'médicos, citas, telemedicina, salud, doctor',
  openGraph: {
    title: 'SaludClick - Plataforma de Citas Médicas',
    description: 'Agenda tus citas médicas de forma fácil y segura',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" type="image/png" href="/icono.png" />
        <link rel="shortcut icon" type="image/png" href="/icono.png" />
        <link rel="apple-touch-icon" href="/icono.png" />
      </head>
      <body className="bg-light text-dark">{children}</body>
    </html>
  );
}
