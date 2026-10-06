'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import PatientShell from '@/components/PatientShell';
import { patientAPI } from '@/utils/api';
import { formatDoctorName } from '@/utils/names';
import { useI18n } from '@/i18n';
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
  const { locale } = useI18n();
  const en = locale === 'en';
  const [data, setData] = useState<any>(null);
  const [patientName, setPatientName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      setPatientName(storedUser.firstName || storedUser.first_name || '');
    } catch {
      setPatientName('');
    }
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await patientAPI.dashboard();
      setData(response.data);
    } catch (err: any) {
      setError(err?.status === 403
        ? (en ? 'You do not have permission to access this portal.' : 'No tienes permiso para acceder a este portal.')
        : (en ? 'Could not load your patient portal.' : 'No se pudo cargar tu portal de paciente.'));
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
        title={en ? 'My health' : 'Mi salud'}
        subtitle={en ? 'Appointments, prescriptions and important information in one place' : 'Citas, recetas y datos importantes en un solo lugar'}
        actions={<Link href="/doctors" className="hidden h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700 sm:inline-flex"><Search className="h-4 w-4" /> {en ? 'Find doctors' : 'Buscar médicos'}</Link>}
      >
        {error && <Notice en={en} tone="error" title={en ? 'Error' : 'Error'} message={error} />}

        {loading ? (
          <DashboardSkeleton />
        ) : (
          <div className="space-y-5 md:space-y-6">
            <section className="dashboard-welcome overflow-hidden rounded-[1.75rem] text-white">
              <div className="relative grid gap-5 p-5 sm:p-7 lg:grid-cols-[1.15fr_.85fr] lg:p-8">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white/70">{en ? 'Your personal health space' : 'Tu espacio personal de salud'}</p>
                  <h2 className="mt-2 text-3xl font-black leading-tight tracking-tight md:text-4xl">
                    {en ? `Hello${patientName ? `, ${patientName}` : ''}` : `Hola${patientName ? `, ${patientName}` : ''}`}
                  </h2>
                  <p className="mt-3 max-w-xl text-sm leading-6 text-white/80 md:text-base">
                    {en ? 'What would you like to do today?' : '¿Qué te gustaría hacer hoy?'}
                  </p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Link href="/doctors" className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-blue-700 shadow-sm hover:bg-blue-50">
                      {en ? 'Book appointment' : 'Agendar cita'}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Link href="/patient/appointments" className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 text-sm font-bold text-white hover:bg-white/15">
                      {en ? 'View my appointments' : 'Ver mis citas'}
                    </Link>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur sm:p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-sm font-bold text-white/80">{en ? 'Next appointment' : 'Próxima cita'}</p>
                    <CalendarCheck className="h-5 w-5 text-white/80" />
                  </div>
                  {data?.nextAppointment ? (
                    <AppointmentHero appointment={data.nextAppointment} en={en} />
                  ) : (
                    <div className="rounded-2xl bg-white/10 p-4">
                      <p className="font-bold">{en ? 'No upcoming appointments' : 'Sin citas próximas'}</p>
                      <p className="mt-2 text-sm leading-6 text-white/80">{en ? 'When you book a visit, it will appear here with its key details.' : 'Cuando reserves una atención, aparecerá aquí con sus datos principales.'}</p>
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
              <Metric title={en ? 'Active appointments' : 'Citas activas'} value={activeAppointments.length} icon={CalendarDays} tone="blue" />
              <Metric title={en ? 'Prescriptions' : 'Recetas'} value={data?.prescriptions?.length || 0} icon={FileText} tone="emerald" />
              <Metric title={en ? 'Profile complete' : 'Perfil completo'} value={`${data?.profileCompleteness?.percentage || 0}%`} icon={UserRound} tone="amber" />
              <Metric title={en ? 'Visits' : 'Atenciones'} value={completedAppointments.length} icon={HeartPulse} tone="rose" />
            </section>

            <section className="grid gap-6 xl:grid-cols-[1fr_380px]">
              <div className="space-y-6">
                <Panel title={en ? 'Quick actions' : 'Acciones rápidas'} href="/doctors" action={en ? 'See all' : 'Ver todas'}>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <QuickAction href="/doctors" icon={Search} title={en ? 'Find a doctor' : 'Buscar médico'} text={en ? 'Specialty, center or name' : 'Especialidad, centro o nombre'} />
                    <QuickAction href="/patient/appointments" icon={CalendarDays} title={en ? 'My appointments' : 'Mis citas'} text={en ? 'Confirm or review schedule' : 'Confirmar o revisar agenda'} />
                    <QuickAction href="/patient/prescriptions" icon={FileText} title={en ? 'Prescriptions' : 'Recetas'} text={en ? 'View and print instructions' : 'Ver e imprimir indicaciones'} />
                    <QuickAction href="/patient/documents" icon={FileText} title={en ? 'Documents' : 'Documentos'} text={en ? 'Certificates and referrals' : 'Certificados y referimientos'} />
                  </div>
                </Panel>

                <Panel title={en ? 'Recent appointments' : 'Citas recientes'} href="/patient/appointments" action={en ? 'View schedule' : 'Ver agenda'}>
                  {data?.appointments?.length ? (
                    <div className="grid gap-3">
                      {data.appointments.slice(0, 4).map((appointment: any) => (
                        <AppointmentRow key={appointment.id} appointment={appointment} en={en} />
                      ))}
                    </div>
                  ) : (
                    <EmptyState en={en} title={en ? 'No appointment history' : 'Sin historial de citas'} message={en ? 'There are no appointments associated with your account yet.' : 'Todavía no hay citas asociadas a tu cuenta.'} />
                  )}
                </Panel>
              </div>

              <aside className="space-y-6">
                <section className="rounded-2xl border border-gray-200 bg-white p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">{en ? 'Care profile' : 'Perfil de atención'}</h2>
                      <p className="text-sm text-gray-500">{en ? 'Information needed for your visits' : 'Datos necesarios para tus consultas'}</p>
                    </div>
                    <ShieldCheck className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="font-semibold text-gray-600">{en ? 'Completeness' : 'Completitud'}</span>
                      <span className="font-bold text-gray-900">{data?.profileCompleteness?.percentage || 0}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                      <div className="h-full rounded-full bg-blue-600" style={{ width: `${data?.profileCompleteness?.percentage || 0}%` }} />
                    </div>
                    <Link href="/patient/profile" className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-xl border border-blue-200 text-sm font-bold text-blue-700 hover:bg-blue-50">
                      {en ? 'Complete profile' : 'Completar perfil'}
                    </Link>
                  </div>
                </section>

                <Panel title={en ? 'Recent prescriptions' : 'Recetas recientes'} href="/patient/prescriptions" action={en ? 'View prescriptions' : 'Ver recetas'}>
                  {data?.prescriptions?.length ? (
                    <div className="space-y-3">
                      {data.prescriptions.slice(0, 3).map((prescription: any) => (
                        <PrescriptionRow key={prescription.id} prescription={prescription} en={en} />
                      ))}
                    </div>
                  ) : (
                    <EmptyState en={en} title={en ? 'No prescriptions' : 'Sin recetas'} message={en ? 'Your issued prescriptions will appear here.' : 'Tus recetas emitidas aparecerán aquí.'} compact />
                  )}
                </Panel>

                <Panel title={en ? 'Notices' : 'Avisos'} href="/notifications" action={en ? 'View' : 'Ver'}>
                  {data?.notifications?.length ? (
                    <div className="space-y-3">
                      {data.notifications.slice(0, 4).map((item: any, index: number) => (
                        <div key={`${item.type}-${index}`} className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
                          <p className="text-sm font-bold text-blue-950">{translateNotificationTitle(item.title, en)}</p>
                          <p className="mt-1 text-sm text-blue-700">{translateNotificationMessage(item.message, en)}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState en={en} title={en ? 'No notices' : 'Sin avisos'} message={en ? 'We will notify you about appointment and prescription changes.' : 'Te avisaremos sobre cambios de citas y recetas.'} compact />
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

function AppointmentHero({ appointment, en }: { appointment: any; en: boolean }) {
  return (
    <div className="rounded-2xl bg-white p-4 text-gray-950">
      <div className="flex items-center gap-2 text-sm font-bold text-blue-700">
        <Clock3 className="h-4 w-4" />
        {formatDisplayDate(appointment.appointment_date)} · {String(appointment.appointment_time).slice(0, 5)}
      </div>
      <h3 className="mt-3 text-xl font-black">{formatDoctorName(appointment.doctor_first_name, appointment.doctor_last_name)}</h3>
      <p className="mt-1 text-sm text-gray-600">{appointment.specialties?.join?.(', ') || (en ? 'Medical visit' : 'Consulta médica')}</p>
      <p className="mt-3 flex items-center gap-2 text-sm text-gray-600">
        <MapPin className="h-4 w-4 text-gray-400" />
        {appointment.health_center_name || (en ? 'Medical center' : 'Centro médico')}
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
    <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
      <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${tones[tone]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-2xl font-black text-gray-950 sm:text-3xl">{value}</p>
      <p className="mt-0.5 text-xs leading-5 text-gray-500 sm:text-sm">{title}</p>
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
    <Link href={href} className="group rounded-2xl border border-gray-200 p-3 transition-all hover:border-blue-200 hover:bg-blue-50 sm:p-4">
      <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition-colors group-hover:bg-blue-100">
        <Icon className="h-5 w-5" />
      </span>
      <p className="text-sm font-bold text-gray-950 sm:text-base">{title}</p>
      <p className="mt-1 hidden text-sm text-gray-500 sm:block">{text}</p>
    </Link>
  );
}

function AppointmentRow({ appointment, en }: { appointment: any; en: boolean }) {
  return (
    <Link href="/patient/appointments" className="block rounded-2xl border border-gray-200 p-4 transition-colors hover:bg-gray-50">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-bold text-gray-950">{formatDisplayDate(appointment.appointment_date)} · {String(appointment.appointment_time).slice(0, 5)}</p>
            <StatusBadge status={appointment.status} en={en} />
          </div>
          <p className="mt-1 text-sm font-semibold text-gray-700">{formatDoctorName(appointment.doctor_first_name, appointment.doctor_last_name)}</p>
          <p className="text-sm text-gray-500">{appointment.health_center_name || (en ? 'Medical center' : 'Centro médico')}</p>
        </div>
        <ArrowRight className="hidden h-5 w-5 text-gray-300 sm:block" />
      </div>
    </Link>
  );
}

function PrescriptionRow({ prescription, en }: { prescription: any; en: boolean }) {
  return (
    <Link href={`/patient/prescriptions/${prescription.id}`} className="block rounded-xl border border-gray-200 p-4 hover:bg-gray-50">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-bold text-gray-900">{prescription.medicationNames?.slice(0, 2).join(', ') || (en ? 'Medical prescription' : 'Receta médica')}</p>
          <p className="mt-1 text-sm text-gray-500">{formatDoctorName(prescription.doctor_first_name, prescription.doctor_last_name)}</p>
        </div>
        <StatusBadge status={prescription.status} en={en} />
      </div>
    </Link>
  );
}

function StatusBadge({ status, en }: { status: string; en: boolean }) {
  const styles: Record<string, string> = {
    active: 'bg-emerald-50 text-emerald-700',
    scheduled: 'bg-blue-50 text-blue-700',
    confirmed: 'bg-emerald-50 text-emerald-700',
    completed: 'bg-gray-100 text-gray-700',
    cancelled: 'bg-rose-50 text-rose-700',
    expired: 'bg-amber-50 text-amber-700',
  };
  return <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${styles[status] || 'bg-gray-100 text-gray-700'}`}>{translateStatus(status, en)}</span>;
}

function EmptyState({ title, message, compact = false, en }: { title: string; message: string; compact?: boolean; en: boolean }) {
  return (
    <div className={`rounded-2xl border border-dashed border-gray-200 bg-gray-50 text-center ${compact ? 'p-5' : 'p-8'}`}>
      <AlertCircle className="mx-auto mb-2 h-5 w-5 text-gray-400" />
      <p className="font-bold text-gray-800">{title}</p>
      <p className="mt-1 text-sm text-gray-500">{message}</p>
    </div>
  );
}

function Notice({ title, message }: { title: string; message: string; tone: 'error'; en: boolean }) {
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

function translateStatus(status: string, en: boolean) {
  const labels: Record<string, string> = {
    active: en ? 'Active' : 'Activa',
    scheduled: en ? 'Scheduled' : 'Programada',
    confirmed: en ? 'Confirmed' : 'Confirmada',
    completed: en ? 'Completed' : 'Completada',
    cancelled: en ? 'Cancelled' : 'Cancelada',
    expired: en ? 'Expired' : 'Vencida',
  };
  return labels[status] || status || 'N/D';
}

function translateNotificationTitle(title: string, en: boolean) {
  if (!en) return title;
  const labels: Record<string, string> = {
    'Proxima cita programada': 'Upcoming appointment',
    'Receta reciente disponible': 'Recent prescription available',
    'Perfil incompleto': 'Incomplete profile',
    'Cita cancelada': 'Appointment cancelled',
  };
  return labels[title] || title;
}

function translateNotificationMessage(message: string, en: boolean) {
  if (!en) return message;
  if (/^\d{4}-\d{2}-\d{2} a las \d{2}:\d{2}$/.test(message)) {
    return message.replace(' a las ', ' at ');
  }
  if (message.startsWith('Completa tu perfil para mejorar tu atencion')) {
    return message.replace('Completa tu perfil para mejorar tu atencion', 'Complete your profile to improve your care');
  }
  if (message === 'Receta medica') return 'Medical prescription';
  return message;
}
