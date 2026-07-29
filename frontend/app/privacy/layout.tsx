import { createPageMetadata } from '@/lib/seo';

export const metadata = createPageMetadata({
  title: 'Política de privacidad',
  description:
    'Consulta cómo SaludClick trata y protege la información personal y de salud de sus usuarios.',
  path: '/privacy',
});

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children;
}

