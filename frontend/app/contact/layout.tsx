import { createPageMetadata } from '@/lib/seo';

export const metadata = createPageMetadata({
  title: 'Contacto',
  description:
    'Contacta al equipo de SaludClick para recibir ayuda con tu cuenta, tus citas o el uso de la plataforma.',
  path: '/contact',
});

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}

