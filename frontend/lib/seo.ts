import type { Metadata } from 'next';

const FALLBACK_SITE_URL = 'https://salud-c-lick.vercel.app';

export const SITE_NAME = 'SaludClick';
export const SITE_TITLE = 'SaludClick | Citas médicas y salud digital';
export const SITE_DESCRIPTION =
  'Encuentra médicos, agenda citas presenciales o teleconsultas y gestiona tu información de salud de forma fácil y segura.';

export function getSiteUrl(): URL {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL;

  try {
    const url = new URL(configuredUrl || FALLBACK_SITE_URL);
    const isLocalUrl = ['localhost', '127.0.0.1'].includes(url.hostname);

    if (process.env.NODE_ENV === 'production' && isLocalUrl) {
      return new URL(FALLBACK_SITE_URL);
    }

    return url;
  } catch {
    return new URL(FALLBACK_SITE_URL);
  }
}

export function absoluteUrl(path = '/'): string {
  return new URL(path, getSiteUrl()).toString();
}

type PageMetadataOptions = {
  title: string;
  description: string;
  path: string;
  noIndex?: boolean;
};

export function createPageMetadata({
  title,
  description,
  path,
  noIndex = false,
}: PageMetadataOptions): Metadata {
  const fullTitle = `${title} | ${SITE_NAME}`;

  return {
    title,
    description,
    alternates: {
      canonical: path,
    },
    openGraph: {
      type: 'website',
      url: path,
      locale: 'es_DO',
      siteName: SITE_NAME,
      title: fullTitle,
      description,
      images: [
        {
          url: '/opengraph-image',
          width: 1200,
          height: 630,
          alt: `${SITE_NAME}, tu salud a un clic de distancia`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: ['/opengraph-image'],
    },
    robots: noIndex
      ? {
          index: false,
          follow: false,
          noarchive: true,
        }
      : undefined,
  };
}

