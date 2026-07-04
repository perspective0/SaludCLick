import type { Metadata } from 'next';
import LanguageToggle from '@/components/LanguageToggle';
import ThemeToggle from '@/components/ThemeToggle';
import PageTransition from '@/components/PageTransition';
import RuntimeSettings from '@/components/RuntimeSettings';
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
    <html lang="es" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" type="image/png" href="/icono.png" />
        <link rel="shortcut icon" type="image/png" href="/icono.png" />
        <link rel="apple-touch-icon" href="/icono.png" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var savedTheme = localStorage.getItem('saludclick_theme');
                var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                var theme = savedTheme || (prefersDark ? 'dark' : 'light');
                document.documentElement.classList.toggle('dark', theme === 'dark');
                document.documentElement.style.colorScheme = theme;
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body className="bg-light text-dark">
        <RuntimeSettings />
        <PageTransition>{children}</PageTransition>
        <ThemeToggle />
        <LanguageToggle floating />
      </body>
    </html>
  );
}
