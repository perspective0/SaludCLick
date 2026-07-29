import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createPageMetadata } from '@/lib/seo';

interface LocalePageProps {
  params: {
    locale: string;
  };
}

const locales = ['es', 'en'] as const;

type Locale = (typeof locales)[number];

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export function generateMetadata({ params }: LocalePageProps): Metadata {
  const isEnglish = params.locale === 'en';

  return createPageMetadata({
    title: isEnglish ? 'SaludClick in English' : 'SaludClick en español',
    description: isEnglish
      ? 'Temporary language landing page for SaludClick.'
      : 'Página temporal de idioma de SaludClick.',
    path: `/${params.locale}`,
    noIndex: true,
  });
}

export default function LocalePage({ params }: LocalePageProps) {
  const locale = params.locale as Locale;

  if (!locales.includes(locale)) {
    notFound();
  }

  const isEnglish = locale === 'en';

  return (
    <div className="min-h-screen bg-light text-dark py-16">
      <div className="container-main">
        <h1 className="text-5xl font-bold mb-6">
          {isEnglish ? 'Welcome to SaludClick' : 'Bienvenido a SaludClick'}
        </h1>
        <p className="text-lg text-gray-600 mb-8 max-w-3xl">
          {isEnglish
            ? 'Your trusted medical appointment platform for patients, doctors and clinic staff.'
            : 'Tu plataforma de citas médicas para pacientes, médicos y personal de salud.'}
        </p>
        <div className="flex flex-col gap-4 sm:flex-row">
          <Link href="/" className="btn-primary">
            {isEnglish ? 'Go to Home' : 'Ir al inicio'}
          </Link>
          <Link href={isEnglish ? '/es' : '/en'} className="btn-secondary">
            {isEnglish ? 'Ver versión en español' : 'View English version'}
          </Link>
        </div>
      </div>
    </div>
  );
}
