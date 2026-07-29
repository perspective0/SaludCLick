import { createPageMetadata } from '@/lib/seo';

export const metadata = createPageMetadata({
  title: 'Sobre nosotros',
  description:
    'Conoce cómo SaludClick conecta pacientes, médicos y centros de salud para simplificar el acceso a la atención médica.',
  path: '/about',
});

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}

