import type { Metadata } from 'next';
import DoctorProfileClient from './DoctorProfileClient';
import { absoluteUrl, createPageMetadata } from '@/lib/seo';
import { getDoctorForSeo } from '@/lib/server-doctors';
import { formatDoctorName } from '@/utils/names';

export const revalidate = 300;

type DoctorPageProps = {
  params: { id: string };
};

function getDoctorName(doctor: any) {
  return formatDoctorName(doctor?.first_name, doctor?.last_name);
}

export async function generateMetadata({ params }: DoctorPageProps): Promise<Metadata> {
  const doctor = await getDoctorForSeo(params.id);

  if (!doctor) {
    return createPageMetadata({
      title: 'Perfil médico',
      description: 'Consulta el perfil profesional, las especialidades y las opciones de cita del médico en SaludClick.',
      path: `/doctors/${params.id}`,
    });
  }

  const name = getDoctorName(doctor);
  const specialty = doctor.specialties?.[0] || 'Medicina general';
  const center =
    doctor.health_centers?.[0]?.name ||
    doctor.health_center_name ||
    'SaludClick';

  return createPageMetadata({
    title: `${name} - ${specialty}`,
    description: `Consulta el perfil de ${name}, especialista en ${specialty} en ${center}, y agenda una cita en SaludClick.`,
    path: `/doctors/${params.id}`,
  });
}

export default async function DoctorDetailsPage({ params }: DoctorPageProps) {
  const doctor = await getDoctorForSeo(params.id);
  const reviews = doctor?.reviews || [];
  const name = doctor ? getDoctorName(doctor) : '';
  const centers = doctor?.health_centers || doctor?.healthCenters || [];
  const primaryCenter = centers[0];

  const physicianSchema = doctor
    ? {
        '@context': 'https://schema.org',
        '@type': 'Physician',
        '@id': `${absoluteUrl(`/doctors/${params.id}`)}#physician`,
        name,
        url: absoluteUrl(`/doctors/${params.id}`),
        image: doctor.avatar || undefined,
        description: doctor.bio || undefined,
        medicalSpecialty: doctor.specialties || undefined,
        address:
          primaryCenter?.address || primaryCenter?.city
            ? {
                '@type': 'PostalAddress',
                streetAddress: primaryCenter.address || undefined,
                addressLocality: primaryCenter.city || undefined,
                addressCountry: 'DO',
              }
            : undefined,
        aggregateRating:
          reviews.length && Number(doctor.average_rating) > 0
            ? {
                '@type': 'AggregateRating',
                ratingValue: Number(doctor.average_rating),
                reviewCount: reviews.length,
              }
            : undefined,
      }
    : null;

  return (
    <>
      {physicianSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(physicianSchema) }}
        />
      )}
      <DoctorProfileClient
        doctorId={params.id}
        initialDoctor={doctor}
        initialReviews={reviews}
      />
    </>
  );
}
