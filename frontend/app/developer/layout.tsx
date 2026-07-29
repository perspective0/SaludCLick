import { createPageMetadata } from '@/lib/seo';

export const metadata = createPageMetadata({
  title: 'Desarrollador',
  description:
    'Información sobre el desarrollo, la tecnología y la visión detrás de la plataforma SaludClick.',
  path: '/developer',
});

export default function DeveloperLayout({ children }: { children: React.ReactNode }) {
  return children;
}

