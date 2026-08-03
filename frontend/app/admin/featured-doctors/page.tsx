'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowUpRight,
  CalendarCheck,
  Check,
  Home,
  LogOut,
  Menu,
  Search,
  Shield,
  Star,
  Stethoscope,
  Users,
  X,
} from 'lucide-react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { adminAPI } from '@/utils/api';
import { formatDoctorName } from '@/utils/names';

type FeaturedDoctor = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  avatar?: string;
  specialties?: string[];
  average_rating?: number | string;
  consultation_price?: number | string;
  health_center_name?: string;
  city?: string;
  featured_on_home: boolean;
};

const MAX_FEATURED_DOCTORS = 4;

export default function FeaturedDoctorsPage() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [doctors, setDoctors] = useState<FeaturedDoctor[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadDoctors = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await adminAPI.listFeaturedDoctors();
      setDoctors(response.data || []);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'No se pudo cargar la lista de médicos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDoctors();
  }, []);

  const selectedDoctors = useMemo(
    () => doctors.filter((doctor) => doctor.featured_on_home),
    [doctors]
  );

  const visibleDoctors = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('es');
    if (!term) return doctors;

    return doctors.filter((doctor) => {
      const searchable = [
        doctor.first_name,
        doctor.last_name,
        doctor.email,
        ...(doctor.specialties || []),
        doctor.health_center_name,
        doctor.city,
      ].filter(Boolean).join(' ').toLocaleLowerCase('es');

      return searchable.includes(term);
    });
  }, [doctors, search]);

  const toggleFeatured = async (doctor: FeaturedDoctor) => {
    const nextValue = !doctor.featured_on_home;
    if (nextValue && selectedDoctors.length >= MAX_FEATURED_DOCTORS) {
      setSuccess('');
      setError(`Puedes seleccionar un máximo de ${MAX_FEATURED_DOCTORS} especialistas.`);
      return;
    }

    setSavingId(doctor.id);
    setError('');
    setSuccess('');

    try {
      await adminAPI.updateFeaturedDoctor(doctor.id, nextValue);
      setDoctors((current) => current.map((item) => (
        item.id === doctor.id ? { ...item, featured_on_home: nextValue } : item
      )));
      setSuccess(
        nextValue
          ? `${formatDoctorName(doctor.first_name, doctor.last_name)} aparecerá en el inicio.`
          : `${formatDoctorName(doctor.first_name, doctor.last_name)} fue retirado del inicio.`
      );
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'No se pudo actualizar la selección.');
    } finally {
      setSavingId('');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  return (
    <ProtectedRoute requiredRole="admin">
      <div className="dashboard-shell flex min-h-screen overflow-x-hidden text-gray-950 dark:text-slate-100">
        <aside className={`dashboard-sidebar fixed inset-y-0 left-0 z-50 h-dvh w-[min(16rem,86vw)] transform transition-transform duration-300 lg:w-64 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
          <div className="flex h-full min-h-0 flex-col">
            <div className="shrink-0 border-b border-gray-100 p-4">
              <Link href="/admin" className="flex items-center gap-2">
                <Shield className="h-7 w-7 text-blue-600" />
                <div>
                  <h1 className="text-base font-bold text-gray-900">SaludClick</h1>
                  <p className="text-xs text-gray-500">Panel Admin</p>
                </div>
              </Link>
            </div>

            <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto p-3">
              <p className="mb-2 px-2 text-[11px] font-semibold uppercase text-gray-400">Principal</p>
              <AdminLink href="/admin" icon={Home} label="Dashboard" />
              <AdminLink href="/admin/users" icon={Users} label="Usuarios" />
              <AdminLink href="/admin/doctor-requests" icon={Stethoscope} label="Solicitudes Médicos" />
              <AdminLink href="/admin/featured-doctors" icon={Star} label="Especialistas destacados" active />
              <AdminLink href="/admin/appointments" icon={CalendarCheck} label="Citas médicas" />
            </nav>

            <div className="mt-auto border-t border-gray-100 p-4">
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50"
              >
                <LogOut className="h-4 w-4" />
                Cerrar sesión
              </button>
            </div>
          </div>
        </aside>

        {sidebarOpen && (
          <button
            type="button"
            aria-label="Cerrar menú"
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <div className="min-w-0 flex-1 lg:ml-64">
          <header className="dashboard-header sticky top-0 z-30">
            <div className="flex items-center justify-between px-4 py-4 md:px-8">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSidebarOpen(true)}
                  className="rounded-lg p-2 hover:bg-gray-100 lg:hidden"
                  aria-label="Abrir menú"
                >
                  <Menu className="h-6 w-6" />
                </button>
                <div className="min-w-0">
                  <h1 className="truncate text-xl font-bold text-gray-900 md:text-2xl">Especialistas destacados</h1>
                  <p className="hidden text-sm text-gray-500 sm:block">Elige qué médicos se muestran en la página de inicio.</p>
                </div>
              </div>
              <Link
                href="/"
                target="_blank"
                className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:border-blue-200 hover:text-blue-700"
              >
                <span className="hidden sm:inline">Ver inicio</span>
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </header>

          <main className="p-4 md:p-8">
            <section className="mb-6 overflow-hidden rounded-2xl bg-gradient-to-r from-slate-950 via-blue-950 to-sky-900 p-6 text-white shadow-xl">
              <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
                <div>
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-semibold text-sky-100">
                    <Star className="h-4 w-4 fill-current" />
                    Portada de SaludClick
                  </div>
                  <h2 className="text-2xl font-black">Selecciona hasta {MAX_FEATURED_DOCTORS} médicos</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-sky-100">
                    Solo los especialistas marcados aquí aparecerán en “Médicos destacados” del inicio.
                    Los cambios se guardan al instante.
                  </p>
                </div>
                <div className="shrink-0 rounded-2xl bg-white/10 px-6 py-4 text-center ring-1 ring-white/15">
                  <p className="text-3xl font-black">{selectedDoctors.length}/{MAX_FEATURED_DOCTORS}</p>
                  <p className="text-xs font-semibold uppercase tracking-wide text-sky-100">Seleccionados</p>
                </div>
              </div>
            </section>

            {error && (
              <div className="mb-5 flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                <span>{error}</span>
                <button type="button" onClick={() => setError('')} aria-label="Cerrar mensaje">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {success && (
              <div className="mb-5 flex items-start justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                <span className="inline-flex items-center gap-2"><Check className="h-4 w-4" />{success}</span>
                <button type="button" onClick={() => setSuccess('')} aria-label="Cerrar mensaje">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {selectedDoctors.length > 0 && (
              <section className="dashboard-panel mb-6 p-5">
                <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900">
                  <Star className="h-5 w-5 fill-amber-400 text-amber-500" />
                  Selección actual
                </h2>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {selectedDoctors.map((doctor) => (
                    <div key={doctor.id} className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
                      <DoctorAvatar doctor={doctor} size="small" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-gray-900">{formatDoctorName(doctor.first_name, doctor.last_name)}</p>
                        <p className="truncate text-xs text-gray-600">{doctor.specialties?.[0] || 'Medicina general'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="dashboard-panel overflow-hidden">
              <div className="border-b border-gray-100 p-5">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Médicos disponibles</h2>
                    <p className="text-sm text-gray-500">Solo se muestran médicos activos y verificados.</p>
                  </div>
                  <label className="relative block w-full sm:w-80">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="search"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Buscar médico o especialidad"
                      className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                  </label>
                </div>
              </div>

              {loading ? (
                <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
                  {[1, 2, 3, 4, 5, 6].map((item) => (
                    <div key={item} className="h-48 animate-pulse rounded-2xl bg-gray-100" />
                  ))}
                </div>
              ) : visibleDoctors.length > 0 ? (
                <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
                  {visibleDoctors.map((doctor) => {
                    const isSelected = doctor.featured_on_home;
                    const selectionFull = !isSelected && selectedDoctors.length >= MAX_FEATURED_DOCTORS;
                    return (
                      <article
                        key={doctor.id}
                        className={`rounded-2xl border p-5 transition ${
                          isSelected
                            ? 'border-amber-300 bg-amber-50/70 shadow-sm'
                            : 'border-gray-200 bg-white hover:border-blue-200 hover:shadow-sm'
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <DoctorAvatar doctor={doctor} />
                          <div className="min-w-0 flex-1">
                            <h3 className="truncate font-bold text-gray-900">{formatDoctorName(doctor.first_name, doctor.last_name)}</h3>
                            <p className="truncate text-sm font-semibold text-blue-700">{doctor.specialties?.[0] || 'Medicina general'}</p>
                            <p className="mt-1 truncate text-xs text-gray-500">{doctor.health_center_name || 'Sin centro principal'}</p>
                          </div>
                          <span className="shrink-0 text-sm font-bold text-amber-600">
                            ★ {Number(doctor.average_rating || 0).toFixed(1)}
                          </span>
                        </div>

                        <div className="mt-5 flex items-center justify-between gap-3 border-t border-gray-200/70 pt-4">
                          <span className={`text-xs font-semibold ${isSelected ? 'text-amber-700' : 'text-gray-500'}`}>
                            {isSelected ? 'Visible en el inicio' : 'No visible en el inicio'}
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleFeatured(doctor)}
                            disabled={savingId === doctor.id || selectionFull}
                            title={selectionFull ? `Ya seleccionaste ${MAX_FEATURED_DOCTORS} especialistas` : undefined}
                            className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                              isSelected
                                ? 'bg-white text-red-600 ring-1 ring-red-200 hover:bg-red-50'
                                : 'bg-blue-600 text-white hover:bg-blue-700'
                            }`}
                          >
                            <Star className={`h-4 w-4 ${isSelected ? 'fill-amber-400 text-amber-500' : ''}`} />
                            {savingId === doctor.id ? 'Guardando...' : isSelected ? 'Quitar' : 'Destacar'}
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="px-5 py-16 text-center">
                  <Stethoscope className="mx-auto mb-3 h-12 w-12 text-gray-300" />
                  <h3 className="font-bold text-gray-700">No se encontraron médicos</h3>
                  <p className="mt-1 text-sm text-gray-500">Prueba con otro nombre o especialidad.</p>
                </div>
              )}
            </section>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}

function AdminLink({
  href,
  icon: Icon,
  label,
  active = false,
}: {
  href: string;
  icon: any;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
        active ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
      }`}
    >
      <Icon className="h-5 w-5" />
      {label}
    </Link>
  );
}

function DoctorAvatar({ doctor, size = 'normal' }: { doctor: FeaturedDoctor; size?: 'small' | 'normal' }) {
  const dimensions = size === 'small' ? 'h-10 w-10 rounded-xl' : 'h-14 w-14 rounded-2xl';
  return (
    <div className={`relative grid shrink-0 place-items-center overflow-hidden bg-blue-100 text-blue-700 ${dimensions}`}>
      {doctor.avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={doctor.avatar}
          alt={formatDoctorName(doctor.first_name, doctor.last_name)}
          className="h-full w-full object-cover"
        />
      ) : (
        <Stethoscope className={size === 'small' ? 'h-5 w-5' : 'h-7 w-7'} />
      )}
    </div>
  );
}
