'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import PatientShell from '@/components/PatientShell';
import { patientAPI } from '@/utils/api';
import { formatDoctorName } from '@/utils/names';
import {
  AlertCircle,
  ArrowRight,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  HeartPulse,
  MapPin,
  Search,
  ShieldCheck,
  UserRound,
} from 'lucide-react';

const activeStatuses = ['scheduled', 'confirmed'];

export default function PatientDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await patientAPI.dashboard();
      setData(response.data);
    } catch (err: any) {
      setError(err?.status === 403 ? 'No tienes permiso para acceder a este portal.' : 'No se pudo cargar tu portal de paciente.');
    } finally {
      setLoading(false);
    }
  };

  const activeAppointments = useMemo(() => {
    return (data?.appointments || []).filter((appointment: any) => activeStatuses.includes(appointment.status));
  }, [data]);

  const completedAppointments = useMemo(() => {
    return (data?.appointments || []).filter((appointment: any) => appointment.status === 'completed');
  }, [data]);

  return (
    <ProtectedRoute requiredRole="patient">
      <PatientShell
        title="Mi salud"
        subtitle="Citas, recetas y datos importantes en un solo lugar"
        actions={<Link href="/doctors" className="hidden h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700 sm:inline-flex"><Search className="h-4 w-4" /> Buscar médicos</Link>}
      >
        {error && <Notice tone="error" title="Error" message={error} />}

        {loading ? (
          <DashboardSkeleton />
        ) : (
          <div className="space-y-6">
            <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-blue-700 via-sky-600 to-emerald-500 text-white">
              <div className="grid gap-6 p-6 lg:grid-cols-[1.2fr_.8fr] lg:p-8">
                <div className="min-w-0">
                  <p className="text-sm font-bold uppercase text-white/70">Bienvenido a SaludClick</p>
                  <h2 className="mt-2 text-3xl font-black leading-tight md:text-4xl">
                    {data?.nextAppointment ? 'Tu próxima atención está lista' : 'Tu portal de salud está al día'}
                  </h2>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-white/85">
                    Revisa tus próximas citas, consulta recetas y mantén tus datos actualizados para recibir una mejor atención.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <Link href="/doctors" className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-blue-700 hover:bg-blue-50">
                      Agendar cita
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Link href="/patient/appointments" className="inline-flex h-11 items-center gap-2 rounded-xl bg-white/15 px-4 text-sm font-bold text-white hover:bg-white/20">
                      Ver mis citas
                    </Link>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/15 bg-white/12 p-5 backdrop-blur">
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-sm font-bold text-white/80">Próxima cita</p>
                    <CalendarCheck className="h-5 w-5 text-white/80" />
                  </div>
                  {data?.nextAppointment ? (
                    <AppointmentHero appointment={data.nextAppointment} />
                  ) : (
                    <div className="rounded-2xl bg-white/10 p-4">
                      <p className="font-bold">Sin citas próximas</p>
                      <p className="mt-2 text-sm leading-6 text-white/80">Cuando reserves una atención, aparecerá aquí con sus datos principales.</p>
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-4">
              <Metric title="Citas activas" value={activeAppointments.length} icon={CalendarDays} tone="blue" />
              <Metric title="Recetas" value={data?.prescriptions?.length || 0} icon={FileText} tone="emerald" />
              <Metric title="Perfil completo" value={`${data?.profileCompleteness?.percentage || 0}%`} icon={UserRound} tone="amber" />
              <Metric title="Atenciones" value={completedAppointments.length} icon={HeartPulse} tone="rose" />
            </section>

            <section className="grid gap-6 xl:grid-cols-[1fr_380px]">
              <div className="space-y-6">
                <Panel title="Acciones rápidas" href="/doctors" action="Buscar médicos">
                  <div className="grid gap-3 sm:grid-cols-4">
                    <QuickAction href="/doctors" icon={Search} title="Buscar médico" text="Especialidad, centro o nombre" />
                    <QuickAction href="/patient/appointments" icon={CalendarDays} title="Mis citas" text="Confirmar o revisar agenda" />
                    <QuickAction href="/patient/prescriptions" icon={FileText} title="Recetas" text="Ver e imprimir indicaciones" />
                    <QuickAction href="/patient/documents" icon={FileText} title="Documentos" text="Certificados y referimientos" />
                  </div>
                </Panel>

                <Panel title="Citas recientes" href="/patient/appointments" action="Ver agenda">
                  {data?.appointments?.length ? (
                    <div className="grid gap-3">
                      {data.appointments.slice(0, 4).map((appointment: any) => (
                        <AppointmentRow key={appointment.id} appointment={appointment} />
                      ))}
                    </div>
                  ) : (
                    <EmptyState title="Sin historial de citas" message="Todavía no hay citas asociadas a tu cuenta." />
                  )}
                </Panel>
              </div>

              <aside className="space-y-6">
                <section className="rounded-2xl border border-gray-200 bg-white p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">Perfil de atención</h2>
                      <p className="text-sm text-gray-500">Datos necesarios para tus consultas</p>
                    </div>
                    <ShieldCheck className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="font-semibold text-gray-600">Completitud</span>
                      <span className="font-bold text-gray-900">{data?.profileCompleteness?.percentage || 0}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                      <div className="h-full rounded-full bg-blue-600" style={{ width: `${data?.profileCompleteness?.percentage || 0}%` }} />
                    </div>
                    <Link href="/patient/profile" className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-xl border border-blue-200 text-sm font-bold text-blue-700 hover:bg-blue-50">
                      Completar perfil
                    </Link>
                  </div>
                </section>

                <Panel title="Recetas recientes" href="/patient/prescriptions" action="Ver recetas">
                  {data?.prescriptions?.length ? (
                    <div className="space-y-3">
                      {data.prescriptions.slice(0, 3).map((prescription: any) => (
                        <PrescriptionRow key={prescription.id} prescription={prescription} />
                      ))}
                    </div>
                  ) : (
                    <EmptyState title="Sin recetas" message="Tus recetas emitidas aparecerán aquí." compact />
                  )}
                </Panel>

                <Panel title="Avisos" href="/notifications" action="Ver">
                  {data?.notifications?.length ? (
                    <div className="space-y-3">
                      {data.notifications.slice(0, 4).map((item: any, index: number) => (
                        <div key={`${item.type}-${index}`} className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
                          <p className="text-sm font-bold text-blue-950">{item.title}</p>
                          <p className="mt-1 text-sm text-blue-700">{item.message}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState title="Sin avisos" message="Te avisaremos sobre cambios de citas y recetas." compact />
                  )}
                </Panel>
              </aside>
            </section>
          </div>
        )}
      </PatientShell>
    </ProtectedRoute>
  );
}

function AppointmentHero({ appointment }: { appointment: any }) {
  return (
    <div className="rounded-2xl bg-white p-4 text-gray-950">
      <div className="flex items-center gap-2 text-sm font-bold text-blue-700">
        <Clock3 className="h-4 w-4" />
        {formatDisplayDate(appointment.appointment_date)} · {String(appointment.appointment_time).slice(0, 5)}
      </div>
      <h3 className="mt-3 text-xl font-black">{formatDoctorName(appointment.doctor_first_name, appointment.doctor_last_name)}</h3>
      <p className="mt-1 text-sm text-gray-600">{appointment.specialties?.join?.(', ') || 'Consulta médica'}</p>
      <p className="mt-3 flex items-center gap-2 text-sm text-gray-600">
        <MapPin className="h-4 w-4 text-gray-400" />
        {appointment.health_center_name || 'Centro médico'}
      </p>
    </div>
  );
}

function Metric({ title, value, icon: Icon, tone }: { title: string; value: string | number; icon: any; tone: 'blue' | 'emerald' | 'amber' | 'rose' }) {
  const tones = {
    blue: 'bg-blue-50 text-blue-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    rose: 'bg-rose-50 text-rose-700',
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${tones[tone]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-3xl font-black text-gray-950">{value}</p>
      <p className="text-sm text-gray-500">{title}</p>
    </div>
  );
}

function Panel({ title, href, action, children }: { title: string; href: string; action: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        <Link href={href} className="text-sm font-bold text-blue-600 hover:text-blue-700">{action}</Link>
      </div>
      {children}
    </section>
  );
}

function QuickAction({ href, icon: Icon, title, text }: { href: string; icon: any; title: string; text: string }) {
  return (
    <Link href={href} className="rounded-2xl border border-gray-200 p-4 transition-colors hover:border-blue-200 hover:bg-blue-50">
      <Icon className="mb-3 h-5 w-5 text-blue-600" />
      <p className="font-bold text-gray-950">{title}</p>
      <p className="mt-1 text-sm text-gray-500">{text}</p>
    </Link>
  );
}

function AppointmentRow({ appointment }: { appointment: any }) {
  return (
    <Link href="/patient/appointments" className="block rounded-2xl border border-gray-200 p-4 transition-colors hover:bg-gray-50">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-bold text-gray-950">{formatDisplayDate(appointment.appointment_date)} · {String(appointment.appointment_time).slice(0, 5)}</p>
            <StatusBadge status={appointment.status} />
          </div>
          <p className="mt-1 text-sm font-semibold text-gray-700">{formatDoctorName(appointment.doctor_first_name, appointment.doctor_last_name)}</p>
          <p className="text-sm text-gray-500">{appointment.health_center_name || 'Centro médico'}</p>
        </div>
        <ArrowRight className="hidden h-5 w-5 text-gray-300 sm:block" />
      </div>
    </Link>
  );
}

function PrescriptionRow({ prescription }: { prescription: any }) {
  return (
    <Link href={`/patient/prescriptions/${prescription.id}`} className="block rounded-xl border border-gray-200 p-4 hover:bg-gray-50">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-bold text-gray-900">{prescription.medicationNames?.slice(0, 2).join(', ') || 'Receta médica'}</p>
          <p className="mt-1 text-sm text-gray-500">{formatDoctorName(prescription.doctor_first_name, prescription.doctor_last_name)}</p>
        </div>
        <StatusBadge status={prescription.status} />
      </div>
    </Link>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: 'bg-emerald-50 text-emerald-700',
    scheduled: 'bg-blue-50 text-blue-700',
    confirmed: 'bg-emerald-50 text-emerald-700',
    completed: 'bg-gray-100 text-gray-700',
    cancelled: 'bg-rose-50 text-rose-700',
    expired: 'bg-amber-50 text-amber-700',
  };
  return <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${styles[status] || 'bg-gray-100 text-gray-700'}`}>{translateStatus(status)}</span>;
}

function EmptyState({ title, message, compact = false }: { title: string; message: string; compact?: boolean }) {
  return (
    <div className={`rounded-2xl border border-dashed border-gray-200 bg-gray-50 text-center ${compact ? 'p-5' : 'p-8'}`}>
      <AlertCircle className="mx-auto mb-2 h-5 w-5 text-gray-400" />
      <p className="font-bold text-gray-800">{title}</p>
      <p className="mt-1 text-sm text-gray-500">{message}</p>
    </div>
  );
}

function Notice({ title, message }: { title: string; message: string; tone: 'error' }) {
  return <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"><strong>{title}:</strong> {message}</div>;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-72 animate-pulse rounded-3xl bg-white" />
      <div className="grid gap-4 md:grid-cols-4">
        {[...Array(4)].map((_, index) => <div key={index} className="h-32 animate-pulse rounded-2xl bg-white" />)}
      </div>
    </div>
  );
}

function formatDisplayDate(value: string) {
  if (!value) return 'Fecha pendiente';
  const [datePart] = String(value).split('T');
  const [year, month, day] = datePart.split('-');
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function translateStatus(status: string) {
  const labels: Record<string, string> = {
    active: 'Activa',
    scheduled: 'Programada',
    confirmed: 'Confirmada',
    completed: 'Completada',
    cancelled: 'Cancelada',
    expired: 'Vencida',
  };
  return labels[status] || status || 'N/D';
}
