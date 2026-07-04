'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { doctorAPI, patientAPI } from '@/utils/api';
import { formatDoctorName } from '@/utils/names';
import DoctorCard from '@/components/DoctorCard';
import PatientShell from '@/components/PatientShell';
import { ArrowLeft, Building2, MapPin, Search, SlidersHorizontal, Sparkles, Stethoscope, Video } from 'lucide-react';

export default function DoctorsPage() {
  const router = useRouter();
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [specialty, setSpecialty] = useState('');
  const [healthCenter, setHealthCenter] = useState('');
  const [healthCenters, setHealthCenters] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [location, setLocation] = useState('');
  const [recommendByLocation, setRecommendByLocation] = useState(false);
  const [teleconsultationOnly, setTeleconsultationOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        setUser(null);
      }
    }
    loadHealthCenters();
  }, []);

  useEffect(() => {
    loadDoctors();
  }, [specialty, healthCenter, page]);

  useEffect(() => {
    if (user?.role === 'patient') {
      loadPatientLocation();
    }
  }, [user?.role]);

  const loadDoctors = async () => {
    try {
      setLoading(true);
      const response = await doctorAPI.list({ specialty, healthCenter, page, limit: 24 });
      setDoctors(response.data || []);
    } catch (error) {
      console.error('Error loading doctors:', error);
      setDoctors([]);
    } finally {
      setLoading(false);
    }
  };

  const loadHealthCenters = async () => {
    try {
      const response = await doctorAPI.listHealthCenters();
      setHealthCenters(response.data || []);
    } catch (error) {
      console.error('Error loading health centers:', error);
      setHealthCenters([]);
    }
  };

  const loadPatientLocation = async () => {
    try {
      const response = await patientAPI.profile();
      const patient = response.data || {};
      const suggestedLocation = [patient.city, patient.address].filter(Boolean).join(', ');
      if (suggestedLocation) {
        setLocation(suggestedLocation);
        setRecommendByLocation(true);
      }
    } catch (error) {
      console.error('Error loading patient location:', error);
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

  const recommendedDoctors = useMemo(() => {
    const term = search.trim().toLowerCase();
    const patientCity = findKnownLocation(location);
    const getClosestDistance = (doctor: any) => {
      if (!recommendByLocation || !patientCity) return null;
      const centers = getDoctorCenters(doctor);
      const distances = centers
        .map((center: DoctorCenter) => findKnownLocation([center.city, center.address, center.name].filter(Boolean).join(' ')))
        .filter(Boolean)
        .map((centerCity: Coordinates | null) => getDistanceKm(patientCity, centerCity as Coordinates));

      if (!distances.length) return null;
      return Math.min(...distances);
    };

    return doctors.filter((doctor) => {
      if (teleconsultationOnly && !doctor.teleconsultation_enabled) return false;
      if (!term) return true;
      const searchable = [
        doctor.first_name,
        doctor.last_name,
        doctor.health_center_name,
        ...(doctor.health_centers || []).flatMap((center: any) => [center.name, center.city, center.address]),
        ...(doctor.specialties || []),
      ].filter(Boolean).join(' ').toLowerCase();
      return searchable.includes(term);
    }).sort((a, b) => {
      const aDistance = getClosestDistance(a);
      const bDistance = getClosestDistance(b);
      if (aDistance !== null && bDistance !== null && aDistance !== bDistance) return aDistance - bDistance;
      if (aDistance !== null && bDistance === null) return -1;
      if (aDistance === null && bDistance !== null) return 1;
      return Number(b.average_rating || 0) - Number(a.average_rating || 0);
    }).map((doctor) => ({
      ...doctor,
      distanceKm: getClosestDistance(doctor),
      recommendedByLocation: getClosestDistance(doctor) !== null,
    }));
  }, [doctors, location, recommendByLocation, search, teleconsultationOnly]);

  const recommendedCount = recommendedDoctors.filter((doctor) => doctor.recommendedByLocation).length;
  const recognizedLocation = findKnownLocation(location);

  const content = (
    <div className="relative min-h-screen overflow-hidden bg-[#eef5f8]">
      <div className="pointer-events-none absolute -left-24 top-24 h-80 w-80 rounded-full bg-cyan-300/30 blur-3xl" />
      <div className="pointer-events-none absolute right-[-120px] top-10 h-96 w-96 rounded-full bg-blue-400/25 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-72 w-72 rounded-full bg-emerald-300/20 blur-3xl" />

      <div className={`relative mx-auto max-w-7xl ${user?.role === 'patient' ? 'px-0 py-0' : 'px-4 py-8 md:px-8'}`}>
        {user?.role !== 'patient' && (
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="inline-flex items-center gap-3">
            <span className="flex h-14 w-44 items-center justify-center rounded-2xl bg-white px-4 shadow-md ring-1 ring-white/70">
              <Image src="/saludclick.png" alt="SaludClick" width={220} height={80} className="h-10 w-auto object-contain" priority />
            </span>
          </Link>
          <button
            onClick={() => router.back()}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/70 bg-white/80 px-4 text-sm font-semibold text-gray-700 shadow-sm backdrop-blur hover:bg-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </button>
        </header>
        )}

        <section className="mb-8 rounded-3xl bg-gray-950 px-6 py-8 text-white shadow-2xl md:px-10">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_380px] lg:items-end">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm text-cyan-100">
                <Sparkles className="h-4 w-4" />
                Profesionales verificados
              </div>
              <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-white drop-shadow-[0_3px_18px_rgba(125,211,252,0.4)] md:text-5xl">
                Encuentra el médico ideal para tu próxima consulta
              </h1>
              <p className="mt-4 max-w-2xl text-base font-medium text-cyan-50">
                Filtra por especialidad, centro médico o teleconsulta y agenda con el profesional que encaje contigo.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <HeroStat label="Médicos" value={doctors.length || 0} icon={Stethoscope} />
              <HeroStat label="Teleconsulta" value={doctors.filter((doctor) => doctor.teleconsultation_enabled).length} icon={Video} />
            </div>
          </div>
        </section>

        <section className="mb-8 rounded-2xl border border-white/70 bg-white/85 p-4 shadow-lg backdrop-blur">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_220px_220px_auto]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por médico, especialidad o centro..."
                className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={specialty}
              onChange={(event) => {
                setSpecialty(event.target.value);
                setPage(1);
              }}
              className="h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todas las especialidades</option>
              {specialties.map((spec) => (
                <option key={spec} value={spec}>{spec}</option>
              ))}
            </select>
            <select
              value={healthCenter}
              onChange={(event) => {
                setHealthCenter(event.target.value);
                setPage(1);
              }}
              className="h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos los centros</option>
              {healthCenters.map((center) => (
                <option key={center.id} value={center.id}>{center.name}</option>
              ))}
            </select>
            <button
              onClick={() => setTeleconsultationOnly(!teleconsultationOnly)}
              className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold transition ${
                teleconsultationOnly ? 'border-violet-600 bg-violet-600 text-white' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Teleconsulta
            </button>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto]">
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="Tu ciudad o sector para recomendar centros cercanos..."
                className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={() => setRecommendByLocation(!recommendByLocation)}
              className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold transition ${
                recommendByLocation ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <MapPin className="h-4 w-4" />
              Recomendar por ubicación
            </button>
          </div>
          {recommendByLocation && location && (
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
              <Building2 className="h-4 w-4" />
              {recognizedLocation && recommendedCount
                ? `${recommendedCount} médicos ordenados por cercanía aproximada a ${location}`
                : `No reconozco esa ubicación todavía; mostrando mejores coincidencias por valoración`}
            </div>
          )}
        </section>

        {loading ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3 lg:grid-cols-4">
            {[...Array(8)].map((_, index) => <DoctorSkeleton key={index} />)}
          </div>
        ) : recommendedDoctors.length ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3 lg:grid-cols-4">
            {recommendedDoctors.map((doctor) => (
              <DoctorCard
                key={doctor.id}
                id={doctor.id}
                name={formatDoctorName(doctor.first_name, doctor.last_name)}
                specialty={doctor.specialties?.[0] || 'Especialidad'}
                healthCenter={doctor.health_center_name}
                healthCenters={doctor.health_centers || doctor.healthCenters || []}
                image={doctor.avatar}
                rating={doctor.average_rating || 4.5}
                consultationPrice={doctor.consultation_price || 50}
                yearsExperience={doctor.years_experience || 5}
                recommendedByLocation={doctor.recommendedByLocation}
                distanceKm={doctor.distanceKm}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-white/70 bg-white/85 p-12 text-center shadow-lg backdrop-blur">
            <Stethoscope className="mx-auto mb-4 h-12 w-12 text-gray-300" />
            <p className="font-semibold text-gray-800">No se encontraron médicos</p>
            <p className="mt-1 text-sm text-gray-500">Cambia los filtros o vuelve a ver todo el listado.</p>
            <Link href="/doctors" className="mt-5 inline-flex h-10 items-center rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white">
              Ver todos los médicos
            </Link>
          </div>
        )}
      </div>
    </div>
  );

  if (user?.role === 'patient') {
    return (
      <PatientShell title="Médicos" subtitle="Encuentra profesionales y agenda tu próxima consulta">
        <div className="-mx-4 -my-6 md:-mx-8">{content}</div>
      </PatientShell>
    );
  }

  return content;
}

function HeroStat({ label, value, icon: Icon }: { label: string; value: number; icon: any }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
      <Icon className="mb-3 h-5 w-5 text-cyan-200" />
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-gray-300">{label}</p>
    </div>
  );
}

function DoctorSkeleton() {
  return (
    <div className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm">
      <div className="mb-4 h-48 animate-pulse rounded-xl bg-gray-100" />
      <div className="mb-2 h-5 w-36 animate-pulse rounded bg-gray-100" />
      <div className="mb-4 h-4 w-48 animate-pulse rounded bg-gray-100" />
      <div className="h-20 animate-pulse rounded-xl bg-gray-100" />
    </div>
  );
}

type Coordinates = { lat: number; lng: number };
type DoctorCenter = { name?: string | null; city?: string | null; address?: string | null };

const DOMINICAN_LOCATIONS: Record<string, Coordinates> = {
  'azua': { lat: 18.4532, lng: -70.7349 },
  'baoruco': { lat: 18.4814, lng: -71.4197 },
  'bahoruco': { lat: 18.4814, lng: -71.4197 },
  'barahona': { lat: 18.2085, lng: -71.1008 },
  'dajabon': { lat: 19.5488, lng: -71.7083 },
  'dajabón': { lat: 19.5488, lng: -71.7083 },
  'duarte': { lat: 19.3008, lng: -70.2526 },
  'el seibo': { lat: 18.7656, lng: -69.0389 },
  'el seybo': { lat: 18.7656, lng: -69.0389 },
  'elias piña': { lat: 18.8775, lng: -71.7028 },
  'elías piña': { lat: 18.8775, lng: -71.7028 },
  'espaillat': { lat: 19.3935, lng: -70.5258 },
  'hato mayor': { lat: 18.7628, lng: -69.2568 },
  'hermanas mirabal': { lat: 19.3776, lng: -70.4176 },
  'independencia': { lat: 18.4939, lng: -71.8502 },
  'la altagracia': { lat: 18.615, lng: -68.7079 },
  'la romana': { lat: 18.4273, lng: -68.9728 },
  'la vega': { lat: 19.2221, lng: -70.5296 },
  'maria trinidad sanchez': { lat: 19.3767, lng: -69.8474 },
  'maría trinidad sánchez': { lat: 19.3767, lng: -69.8474 },
  'monseñor nouel': { lat: 18.9369, lng: -70.4092 },
  'monsenor nouel': { lat: 18.9369, lng: -70.4092 },
  'monte cristi': { lat: 19.8483, lng: -71.6453 },
  'monte plata': { lat: 18.807, lng: -69.784 },
  'pedernales': { lat: 18.0384, lng: -71.744 },
  'peravia': { lat: 18.2796, lng: -70.3319 },
  'puerto plata': { lat: 19.7808, lng: -70.6871 },
  'samana': { lat: 19.2056, lng: -69.3369 },
  'samaná': { lat: 19.2056, lng: -69.3369 },
  'san cristobal': { lat: 18.4167, lng: -70.1098 },
  'san cristóbal': { lat: 18.4167, lng: -70.1098 },
  'san jose de ocoa': { lat: 18.5466, lng: -70.5063 },
  'san josé de ocoa': { lat: 18.5466, lng: -70.5063 },
  'san juan': { lat: 18.8059, lng: -71.2299 },
  'san pedro de macoris': { lat: 18.4539, lng: -69.3086 },
  'san pedro de macorís': { lat: 18.4539, lng: -69.3086 },
  'sanchez ramirez': { lat: 19.0527, lng: -70.1494 },
  'sánchez ramírez': { lat: 19.0527, lng: -70.1494 },
  'santiago': { lat: 19.4517, lng: -70.697 },
  'santiago rodriguez': { lat: 19.4719, lng: -71.3417 },
  'santiago rodríguez': { lat: 19.4719, lng: -71.3417 },
  'santo domingo': { lat: 18.4861, lng: -69.9312 },
  'valverde': { lat: 19.5519, lng: -71.0781 },
  'distrito nacional': { lat: 18.4861, lng: -69.9312 },
  'santo domingo este': { lat: 18.4885, lng: -69.8571 },
  'santo domingo norte': { lat: 18.5489, lng: -69.9063 },
  'santo domingo oeste': { lat: 18.5001, lng: -70.0017 },
  'santiago de los caballeros': { lat: 19.4517, lng: -70.697 },
  jarabacoa: { lat: 19.1167, lng: -70.6333 },
  constanza: { lat: 18.9092, lng: -70.744 },
  moca: { lat: 19.3935, lng: -70.5258 },
  bonao: { lat: 18.9369, lng: -70.4092 },
  'san francisco de macoris': { lat: 19.3008, lng: -70.2526 },
  'san francisco de macorís': { lat: 19.3008, lng: -70.2526 },
  bani: { lat: 18.2796, lng: -70.3319 },
  baní: { lat: 18.2796, lng: -70.3319 },
  higuey: { lat: 18.615, lng: -68.7079 },
  higüey: { lat: 18.615, lng: -68.7079 },
  'punta cana': { lat: 18.5601, lng: -68.3725 },
  nagua: { lat: 19.3767, lng: -69.8474 },
  mao: { lat: 19.5519, lng: -71.0781 },
  'valverde mao': { lat: 19.5519, lng: -71.0781 },
  'san juan de la maguana': { lat: 18.8059, lng: -71.2299 },
  neyba: { lat: 18.4814, lng: -71.4197 },
  neiba: { lat: 18.4814, lng: -71.4197 },
  comendador: { lat: 18.8775, lng: -71.7028 },
  jimani: { lat: 18.4939, lng: -71.8502 },
  jimaní: { lat: 18.4939, lng: -71.8502 },
  salcedo: { lat: 19.3776, lng: -70.4176 },
  cotui: { lat: 19.0527, lng: -70.1494 },
  cotuí: { lat: 19.0527, lng: -70.1494 },
  'sabaneta': { lat: 19.4719, lng: -71.3417 },
};

function getDoctorCenters(doctor: any) {
  const centers = doctor.health_centers || doctor.healthCenters || [];
  if (centers.length) return centers;
  return [{ name: doctor.health_center_name, city: doctor.city, address: doctor.address }];
}

function findKnownLocation(value: string): Coordinates | null {
  const normalized = normalizeLocation(value);
  if (!normalized) return null;

  const exact = DOMINICAN_LOCATIONS[normalized];
  if (exact) return exact;

  const match = Object.entries(DOMINICAN_LOCATIONS)
    .sort((a, b) => b[0].length - a[0].length)
    .find(([name]) => normalized.includes(name) || name.includes(normalized));

  return match?.[1] || null;
}

function normalizeLocation(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getDistanceKm(from: Coordinates, to: Coordinates) {
  const earthRadiusKm = 6371;
  const dLat = toRadians(to.lat - from.lat);
  const dLng = toRadians(to.lng - from.lng);
  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return Math.round(earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}
