'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { appointmentAPI } from '@/utils/api';
import { ArrowLeft, CalendarCheck, CheckCircle2, Clock3, CreditCard, Mail, MapPin, Phone, RotateCcw, Stethoscope, UserRound, Video } from 'lucide-react';

function formatDate(value?: string) {
  if (!value) return 'Sin fecha';
  const [datePart] = String(value).split('T');
  const [year, month, day] = datePart.split('-');
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function formatTime(value?: string) {
  return String(value || '').slice(0, 5) || 'Sin hora';
}

function appointmentDateTime(appointment: any) {
  if (!appointment?.appointment_date) return null;
  const [datePart] = String(appointment.appointment_date).split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  if (!year || !month || !day) return null;
  const [hour = 0, minute = 0] = formatTime(appointment.appointment_time).split(':').map(Number);
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

function canRestoreCompletedAppointment(appointment: any) {
  if (appointment?.status !== 'completed') return false;
  const dateTime = appointmentDateTime(appointment);
  return Boolean(dateTime && dateTime.getTime() > Date.now());
}

function isTeleconsultation(appointment: any) {
  return appointment?.appointment_type === 'teleconsulta' || Boolean(appointment?.video_room_url || appointment?.video_room_id);
}

function statusLabel(status?: string) {
  const labels: Record<string, string> = {
    scheduled: 'Programada',
    confirmed: 'Confirmada',
    completed: 'Completada',
    cancelled: 'Cancelada',
  };
  return labels[status || ''] || status || 'No disponible';
}

export default function AppointmentDetailPage() {
  const params = useParams();
  const appointmentId = params.id as string;
  const [appointment, setAppointment] = useState<any>(null);
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        setRole(JSON.parse(stored).role || '');
      } catch {
        setRole('');
      }
    }
    loadAppointment();
  }, [appointmentId]);

  const loadAppointment = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await appointmentAPI.getById(appointmentId);
      setAppointment(response.data);
    } catch (err: any) {
      setError(err.message || 'No se pudo cargar la cita.');
    } finally {
      setLoading(false);
    }
  };

  const restoreAppointment = async () => {
    if (!appointment) return;
    setSaving(true);
    setError('');
    try {
      await appointmentAPI.update(appointment.id, { status: 'confirmed' });
      await loadAppointment();
    } catch (err: any) {
      setError(err.message || 'No se pudo restaurar la cita.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#f6f8fb] p-4 md:p-8">
        <main className="mx-auto max-w-5xl">
          {loading ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 text-gray-500">Cargando cita...</div>
          ) : error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
          ) : appointment ? (
            <AppointmentDetail appointment={appointment} role={role} saving={saving} onRestore={restoreAppointment} />
          ) : null}
        </main>
      </div>
    </ProtectedRoute>
  );
}

function AppointmentDetail({ appointment, role, saving, onRestore }: { appointment: any; role: string; saving: boolean; onRestore: () => void }) {
  const teleconsultation = isTeleconsultation(appointment);
  const personName = `${appointment.first_name || ''} ${appointment.last_name || ''}`.trim() || 'No disponible';
  const tone = teleconsultation ? 'from-violet-600 to-indigo-600' : 'from-sky-600 to-blue-600';
  const restoreAllowed = canRestoreCompletedAppointment(appointment);
  const canManage = role === 'doctor' || role === 'secretary';

  return (
    <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
      <section className={`bg-gradient-to-br ${tone} p-6 text-white md:p-8`}>
        <Link href="/appointments" className="mb-6 inline-flex items-center gap-2 rounded-xl bg-white/15 px-3 py-2 text-sm font-semibold hover:bg-white/20">
          <ArrowLeft className="h-4 w-4" />
          Volver a citas
        </Link>

        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15">
              {teleconsultation ? <Video className="h-7 w-7" /> : <Stethoscope className="h-7 w-7" />}
            </div>
            <p className="text-sm font-bold uppercase text-white/70">Detalle de cita medica</p>
            <h1 className="mt-2 text-3xl font-bold md:text-4xl">{personName}</h1>
            <p className="mt-2 text-base font-medium text-white/85">
              {formatDate(appointment.appointment_date)} · {formatTime(appointment.appointment_time)}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-white/15 px-4 py-2 text-sm font-bold">
              {teleconsultation ? 'Teleconsulta' : 'Presencial'}
            </span>
            <span className="rounded-full bg-white/15 px-4 py-2 text-sm font-bold">
              {statusLabel(appointment.status)}
            </span>
            {restoreAllowed && (
              <span className="rounded-full bg-amber-300 px-4 py-2 text-sm font-bold text-amber-950">
                Puede restaurarse
              </span>
            )}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 p-6 md:p-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Info icon={CalendarCheck} label="Fecha" value={formatDate(appointment.appointment_date)} />
            <Info icon={Clock3} label="Hora" value={formatTime(appointment.appointment_time)} />
            <Info icon={UserRound} label="Nombre" value={personName} />
            {canManage && <Info icon={UserRound} label="Cédula" value={appointment.document_number || 'No registrada'} />}
            <Info icon={Mail} label="Correo" value={appointment.email || 'No disponible'} />
            <Info icon={Phone} label="Telefono" value={appointment.phone || 'No disponible'} />
            {canManage && (
              <Info
                icon={CreditCard}
                label="Seguro médico"
                value={appointment.has_insurance ? `${appointment.insurance_provider || 'Seguro no especificado'} · ${appointment.insurance_number || 'NSS/póliza pendiente'}` : 'No indicado'}
              />
            )}
            <Info icon={MapPin} label="Centro" value={appointment.health_center_name || 'No disponible'} />
            <Info icon={MapPin} label="Direccion" value={[appointment.address, appointment.city].filter(Boolean).join(', ') || 'No disponible'} />
            <Info icon={Phone} label="Telefono centro" value={appointment.center_phone || 'No disponible'} />
          </div>

          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
            <p className="text-sm font-bold text-gray-900">Motivo de consulta</p>
            <p className="mt-3 text-sm leading-6 text-gray-600">{appointment.reason_for_visit || 'Sin motivo indicado.'}</p>
          </div>

          {restoreAllowed && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <div className="flex items-start gap-3">
                <RotateCcw className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
                <div>
                  <p className="font-bold text-amber-900">Cita completada antes de tiempo</p>
                  <p className="mt-1 text-sm leading-6 text-amber-800">
                    Esta cita esta marcada como completada, pero la fecha reservada aun no ha pasado. Si fue un error, puedes devolverla a confirmada.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <aside className="space-y-4 rounded-2xl border border-gray-200 bg-gray-50 p-5">
          <div>
            <p className="text-sm font-bold text-gray-900">Acciones</p>
            <p className="mt-1 text-sm text-gray-500">Gestion rapida de esta cita.</p>
          </div>
          <div className="mt-4 flex flex-col gap-2">
            {teleconsultation && appointment.video_room_url && (
              <Link href={appointment.video_room_url} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-bold text-white hover:bg-violet-700">
                <Video className="h-4 w-4" />
                Abrir teleconsulta
              </Link>
            )}
            {canManage && restoreAllowed && (
              <button
                onClick={onRestore}
                disabled={saving}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 text-sm font-bold text-white hover:bg-amber-600 disabled:opacity-60"
              >
                <RotateCcw className="h-4 w-4" />
                {saving ? 'Restaurando...' : 'Restaurar a confirmada'}
              </button>
            )}
            <Link href="/appointments" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-bold text-gray-700 hover:bg-gray-50">
              <CalendarCheck className="h-4 w-4" />
              Ver calendario
            </Link>
          </div>

          <div className="rounded-2xl bg-white p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-blue-600" />
              <p className="text-xs font-semibold uppercase text-gray-400">Estado actual</p>
            </div>
            <p className="mt-2 font-bold text-gray-900">{statusLabel(appointment.status)}</p>
            <p className="mt-2 text-sm leading-5 text-gray-500">
              {restoreAllowed
                ? 'Disponible para restaurar porque la fecha reservada aun no ha pasado.'
                : teleconsultation
                  ? 'La sala estara disponible desde el enlace de teleconsulta.'
                  : 'El paciente debe asistir al centro indicado.'}
            </p>
          </div>
        </aside>
      </section>
    </div>
  );
}

function Info({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <Icon className="mb-3 h-5 w-5 text-blue-600" />
      <p className="text-xs font-semibold uppercase text-gray-400">{label}</p>
      <p className="mt-1 break-words font-bold text-gray-900">{value}</p>
    </div>
  );
}
