'use client';

import Image from 'next/image';
import Link from 'next/link';

interface DoctorCardProps {
  id: string;
  name: string;
  specialty: string;
  healthCenter: string;
  image?: string;
  rating: number;
  consultationPrice: number;
  yearsExperience: number;
}

export default function DoctorCard({
  id,
  name,
  specialty,
  healthCenter,
  image,
  rating,
  consultationPrice,
  yearsExperience,
}: DoctorCardProps) {
  return (
    <div className="card hover:shadow-xl transition-all">
      {/* Doctor Image */}
      <div className="w-full h-48 bg-gradient-to-br from-primary to-secondary rounded-lg mb-4 flex items-center justify-center overflow-hidden">
        {image ? (
          <Image src={image} alt={name} width={200} height={200} />
        ) : (
          <span className="text-white text-3xl">👨‍⚕️</span>
        )}
      </div>

      {/* Doctor Info */}
      <h3 className="text-lg font-bold mb-1">{name}</h3>
      
      <p className="text-sm text-secondary font-semibold mb-1">{specialty}</p>
      
      <p className="text-xs text-gray-600 mb-3">{healthCenter}</p>

      {/* Stats */}
      <div className="flex justify-between text-sm mb-3 pb-3 border-b">
        <span className="text-yellow-500">⭐ {rating.toFixed(1)}</span>
        <span className="text-gray-600">{yearsExperience} años</span>
      </div>

      {/* Price and Button */}
      <div className="flex justify-between items-center">
        <span className="font-bold text-primary">
          ${consultationPrice}
        </span>
        <Link
          href={`/doctors/${id}/book`}
          className="btn-primary text-sm px-4 py-1"
        >
          Agendar
        </Link>
      </div>
    </div>
  );
}
