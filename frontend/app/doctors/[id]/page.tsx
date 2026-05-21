'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { doctorAPI } from '@/utils/api';
import { formatDate } from '@/utils/helpers';

export default function DoctorDetailsPage({
  params,
}: {
  params: { id: string };
}) {
  const [doctor, setDoctor] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (error) {
        console.error('Error parsing user:', error);
      }
    }
    loadDoctor();
  }, [params.id]);

  const loadDoctor = async () => {
    try {
      setLoading(true);
      const response = await doctorAPI.getById(params.id);
      setDoctor(response.data);
    } catch (error) {
      console.error('Error loading doctor:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Cargando...</p>
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="min-h-screen bg-light py-12">
        <div className="container-main">
          <div className="text-center">
            <p className="text-gray-600 mb-4">Médico no encontrado</p>
            <Link href="/doctors" className="btn-primary">
              Volver a Médicos
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-light py-12">
      <div className="container-main">
        <Link href="/doctors" className="text-primary hover:underline mb-6 inline-block">
          ← Volver a médicos
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            <div className="card">
              <div className="flex flex-col sm:flex-row gap-6 mb-6">
                {doctor.avatar && (
                  <div className="relative w-32 h-32 rounded-lg overflow-hidden flex-shrink-0">
                    <Image
                      src={doctor.avatar}
                      alt={`${doctor.first_name} ${doctor.last_name}`}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                <div className="flex-1">
                  <h1 className="text-3xl font-bold mb-2">
                    Dr. {doctor.first_name} {doctor.last_name}
                  </h1>
                  <p className="text-lg text-secondary font-semibold mb-4">
                    {doctor.specialties?.[0] || 'Medicina General'}
                  </p>
                  <div className="space-y-2 text-sm">
                    <p><strong>Licencia:</strong> {doctor.license_number}</p>
                    <p><strong>Experiencia:</strong> {doctor.years_experience || 0} años</p>
                    <p><strong>Centro:</strong> {doctor.health_center_name}</p>
                    <p><strong>Consulta:</strong> ${doctor.consultation_price || 50}</p>
                  </div>
                </div>
              </div>

              <div className="mb-6 pb-6 border-b">
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-bold text-secondary">{doctor.average_rating || 4.5}</span>
                  <span className="text-yellow-400">★★★★★</span>
                  <span className="text-gray-600">({reviews.length} reseñas)</span>
                </div>
              </div>

              {doctor.bio && (
                <div className="mb-6">
                  <h2 className="text-xl font-bold mb-3">Sobre el Médico</h2>
                  <p className="text-gray-700">{doctor.bio}</p>
                </div>
              )}

              {doctor.specialties && doctor.specialties.length > 0 && (
                <div className="mb-6">
                  <h2 className="text-xl font-bold mb-3">Especialidades</h2>
                  <div className="flex flex-wrap gap-2">
                    {doctor.specialties.map((spec: string) => (
                      <span key={spec} className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-semibold">
                        {spec}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-8">
                {user?.role === 'patient' ? (
                  <Link href={`/booking?doctorId=${params.id}`} className="btn-primary block text-center">
                    Agendar Cita
                  </Link>
                ) : (
                  <p className="text-gray-600 text-center">
                    Inicia sesión como paciente para agendar una cita
                  </p>
                )}
              </div>
            </div>
          </div>

          <div>
            <div className="card">
              <h2 className="text-xl font-bold mb-4">Reseñas</h2>
              {reviews.length === 0 ? (
                <p className="text-gray-600 text-center py-8">Sin reseñas aún</p>
              ) : (
                <div className="space-y-4">
                  {reviews.map((review: any) => (
                    <div key={review.id} className="pb-4 border-b">
                      <div className="flex justify-between items-start mb-2">
                        <strong>{review.patient_name}</strong>
                        <span className="text-yellow-400">★ {review.rating}</span>
                      </div>
                      <p className="text-sm text-gray-600">{review.comment}</p>
                      <p className="text-xs text-gray-500 mt-2">{formatDate(review.created_at)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
