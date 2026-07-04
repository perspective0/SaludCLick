'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CalendarCheck, MapPin, Stethoscope } from 'lucide-react';

interface DoctorCardProps {
  id: string;
  name: string;
  specialty: string;
  healthCenter: string;
  healthCenters?: Array<{ id: string; name: string; city?: string | null; address?: string | null }>;
  image?: string;
  rating: number | string | null;
  consultationPrice: number | string | null;
  yearsExperience: number | string | null;
  recommendedByLocation?: boolean;
  distanceKm?: number | null;
}

export default function DoctorCard({
  id,
  name,
  specialty,
  healthCenter,
  healthCenters = [],
  image,
  rating,
  consultationPrice,
  yearsExperience,
  recommendedByLocation = false,
  distanceKm = null,
}: DoctorCardProps) {
  const normalizedRating = Number(rating);
  const displayRating = Number.isFinite(normalizedRating) ? normalizedRating.toFixed(1) : 'N/A';
  const normalizedPrice = Number(consultationPrice);
  const displayPrice = Number.isFinite(normalizedPrice) ? normalizedPrice : 0;
  const normalizedExperience = Number(yearsExperience);
  const displayExperience = Number.isFinite(normalizedExperience) ? normalizedExperience : 0;
  const displayHealthCenter = healthCenters.length
    ? healthCenters
        .map((center) => `${center.name || 'Centro asignado'}${center.city ? ` - ${center.city}` : ''}`)
        .join(', ')
    : healthCenter;

  const bookingPath = `/booking?doctorId=${id}`;
  const loginPath = `/login?redirect=${encodeURIComponent(bookingPath)}`;
  const registerPath = `/register?type=patient&redirect=${encodeURIComponent(bookingPath)}`;
  const [primaryBookingPath, setPrimaryBookingPath] = useState(loginPath);

  useEffect(() => {
    if (localStorage.getItem('user')) {
      setPrimaryBookingPath(bookingPath);
    }
  }, [bookingPath]);

  return (
    <article className="group rounded-2xl border border-white/70 bg-white/90 p-4 shadow-sm ring-1 ring-gray-100 backdrop-blur transition-all hover:-translate-y-1 hover:shadow-xl">
      <div className="relative mb-4 h-48 w-full overflow-hidden rounded-xl bg-gradient-to-br from-blue-100 via-cyan-100 to-emerald-100">
        {image ? (
          <Image src={image} alt={name} width={400} height={320} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Stethoscope className="h-14 w-14 text-blue-500" />
          </div>
        )}
        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-blue-700 shadow-sm">
          {specialty}
        </span>
        {recommendedByLocation && (
          <span className="absolute bottom-3 left-3 rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white shadow-sm">
            {distanceKm !== null ? `A ${distanceKm} km aprox.` : 'Cerca de ti'}
          </span>
        )}
      </div>

      <h3 className="text-lg font-bold text-gray-950">{name}</h3>
      <p className="mt-1 flex items-center gap-1.5 text-xs text-gray-500">
        <MapPin className="h-3.5 w-3.5" />
        {displayHealthCenter || 'Centro no asignado'}
      </p>

      <div className="my-4 flex justify-between rounded-xl bg-gray-50 px-3 py-3 text-sm">
        <span className="text-yellow-500">⭐ {displayRating}</span>
        <span className="text-gray-600">{displayExperience} años</span>
      </div>

      <div className="flex items-center justify-between gap-3">
        <span className="font-bold text-blue-700">
          ${displayPrice}
        </span>
        <Link
          href={primaryBookingPath}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
        >
          <CalendarCheck className="h-4 w-4" />
          Agendar
        </Link>
      </div>
      <Link href={registerPath} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50">
        Crear cuenta para reservar
      </Link>
    </article>
  );
}
