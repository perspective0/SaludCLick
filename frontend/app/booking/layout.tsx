import { createPageMetadata } from '@/lib/seo';

export const metadata = createPageMetadata({
  title: 'Agendar cita médica',
  description:
    'Busca un profesional y agenda una cita médica presencial o una teleconsulta de forma sencilla con SaludClick.',
  path: '/booking',
});

export default function BookingLayout({ children }: { children: React.ReactNode }) {
  return children;
}

