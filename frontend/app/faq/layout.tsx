import { createPageMetadata } from '@/lib/seo';

export const metadata = createPageMetadata({
  title: 'Preguntas frecuentes',
  description:
    'Resuelve tus dudas sobre citas médicas, teleconsultas, cuentas de pacientes, médicos y uso de SaludClick.',
  path: '/faq',
});

export default function FaqLayout({ children }: { children: React.ReactNode }) {
  return children;
}

