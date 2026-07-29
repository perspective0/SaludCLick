import type { Metadata, Viewport } from 'next';
import LanguageToggle from '@/components/LanguageToggle';
import ThemeToggle from '@/components/ThemeToggle';
import PageTransition from '@/components/PageTransition';
import InstallAppNotice from '@/components/InstallAppNotice';
import PWARegistration from '@/components/PWARegistration';
import RuntimeSettings from '@/components/RuntimeSettings';
import {
  getSiteUrl,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TITLE,
} from '@/lib/seo';
import './globals.css';

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: siteUrl,
  applicationName: SITE_NAME,
  manifest: '/manifest.webmanifest',
  title: {
    default: SITE_TITLE,
    template: '%s | SaludClick',
  },
  description: SITE_DESCRIPTION,
  keywords: [
    'SaludClick',
    'citas médicas',
    'médicos',
    'telemedicina',
    'teleconsulta',
    'salud digital',
    'agenda médica',
  ],
  authors: [{ name: 'SaludClick', url: siteUrl }],
  creator: 'SaludClick',
  publisher: 'SaludClick',
  category: 'health',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    url: '/',
    locale: 'es_DO',
    siteName: 'SaludClick',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'SaludClick, tu salud a un clic de distancia',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ['/opengraph-image'],
  },
  icons: {
    icon: [{ url: '/icono.png', type: 'image/png' }],
    shortcut: ['/icono.png'],
    apple: [
      {
        url: '/icons/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'SaludClick',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  alternates: {
    canonical: '/',
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
    other: {
      'msvalidate.01': 'CD69EF50D8126383D3096AB83EFE93FD',
    },
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f8fafc' },
    { media: '(prefers-color-scheme: dark)', color: '#020617' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
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
        <PWARegistration />
        <InstallAppNotice />
        <RuntimeSettings />
        <PageTransition>{children}</PageTransition>
        <ThemeToggle />
        <LanguageToggle floating />
      </body>
    </html>
  );
}
