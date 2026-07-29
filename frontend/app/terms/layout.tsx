import { createPageMetadata } from '@/lib/seo';

export const metadata = createPageMetadata({
  title: 'Términos y condiciones',
  description:
    'Consulta las condiciones de uso de SaludClick para pacientes, médicos y demás usuarios de la plataforma.',
  path: '/terms',
});

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children;
}

