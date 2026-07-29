import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/lib/seo';
import { getDoctorsForSeo } from '@/lib/server-doctors';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const publicRoutes = [
    { path: '/', priority: 1, changeFrequency: 'weekly' as const },
    { path: '/doctors', priority: 0.9, changeFrequency: 'daily' as const },
    { path: '/booking', priority: 0.8, changeFrequency: 'weekly' as const },
    { path: '/about', priority: 0.7, changeFrequency: 'monthly' as const },
    { path: '/faq', priority: 0.6, changeFrequency: 'monthly' as const },
    { path: '/contact', priority: 0.6, changeFrequency: 'monthly' as const },
    { path: '/privacy', priority: 0.3, changeFrequency: 'yearly' as const },
    { path: '/terms', priority: 0.3, changeFrequency: 'yearly' as const },
  ];

  const doctors = (await getDoctorsForSeo(200)) || [];
  const doctorRoutes = doctors
    .filter((doctor) => doctor?.id)
    .map((doctor) => ({
      url: absoluteUrl(`/doctors/${doctor.id}`),
      lastModified: doctor.updated_at ? new Date(doctor.updated_at) : undefined,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));

  return [
    ...publicRoutes.map((route) => ({
      url: absoluteUrl(route.path),
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    })),
    ...doctorRoutes,
  ];
}
