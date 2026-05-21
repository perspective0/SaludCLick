'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { doctorAPI } from '@/utils/api';
import DoctorCard from '@/components/DoctorCard';

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [specialty, setSpecialty] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    loadDoctors();
  }, [specialty, page]);

  const loadDoctors = async () => {
    try {
      setLoading(true);
      const response = await doctorAPI.list({ specialty, page, limit: 12 });
      setDoctors(response.data);
    } catch (error) {
      console.error('Error loading doctors:', error);
    } finally {
      setLoading(false);
    }
  };

  const specialties = [
    'Cardiología',
    'Medicina General',
    'Pediatría',
    'Dermatología',
    'Psicología',
    'Neurología',
  ];

  return (
    <div className="min-h-screen bg-light py-12">
      <div className="container-main">
        <h1 className="text-4xl font-bold mb-8">Encuentra tu Médico Ideal</h1>

        {/* Filters */}
        <div className="mb-8">
          <select
            value={specialty}
            onChange={(e) => {
              setSpecialty(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:border-primary"
          >
            <option value="">Todas las especialidades</option>
            {specialties.map((spec) => (
              <option key={spec} value={spec}>
                {spec}
              </option>
            ))}
          </select>
        </div>

        {/* Doctors Grid */}
        {loading ? (
          <div className="text-center py-12">
            <p>Cargando médicos...</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
              {doctors.map((doctor) => (
                <DoctorCard
                  key={doctor.id}
                  id={doctor.id}
                  name={`${doctor.first_name} ${doctor.last_name}`}
                  specialty={doctor.specialties?.[0] || 'Especialidad'}
                  healthCenter={doctor.health_center_name}
                  rating={doctor.average_rating || 4.5}
                  consultationPrice={doctor.consultation_price || 50}
                  yearsExperience={doctor.years_experience || 5}
                />
              ))}
            </div>

            {doctors.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-600 mb-4">No se encontraron médicos</p>
                <Link href="/doctors" className="btn-primary">
                  Ver todos los médicos
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
