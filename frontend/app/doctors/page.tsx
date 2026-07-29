import DoctorsClient from './DoctorsClient';
import { absoluteUrl, createPageMetadata } from '@/lib/seo';
import { getDoctorsForSeo } from '@/lib/server-doctors';

export const revalidate = 300;

export const metadata = createPageMetadata({
  title: 'Médicos verificados',
  description:
    'Encuentra médicos por especialidad, centro de salud o modalidad de atención y agenda tu próxima cita con SaludClick.',
  path: '/doctors',
});

export default async function DoctorsPage() {
  const doctors = (await getDoctorsForSeo(24)) || [];

  const itemListSchema = doctors.length
    ? {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: 'Médicos disponibles en SaludClick',
        numberOfItems: doctors.length,
        itemListElement: doctors.map((doctor, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          url: absoluteUrl(`/doctors/${doctor.id}`),
          name: [doctor.first_name, doctor.last_name].filter(Boolean).join(' '),
        })),
      }
    : null;

  return (
    <>
      {itemListSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
        />
      )}
      <DoctorsClient initialDoctors={doctors} />
    </>
  );
}
