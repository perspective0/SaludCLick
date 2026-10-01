'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import PatientShell from '@/components/PatientShell';
import { appointmentAPI, patientAPI, reviewAPI } from '@/utils/api';
import { formatDoctorName } from '@/utils/names';
import { useI18n } from '@/i18n';
import { CalendarDays, CheckCircle2, Clock3, MapPin, Search, Star, Stethoscope, Video, X, XCircle } from 'lucide-react';

type AppointmentFilter = 'active' | 'all' | 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no-show';
const activeStatuses = ['scheduled', 'confirmed'];

function isTeleconsultation(appointment: any) {
  return appointment?.appointment_type === 'teleconsulta' || Boolean(appointment?.video_room_url || appointment?.video_room_id);
}

export default function PatientAppointmentsPage() {
  const { locale } = useI18n();
  const en = locale === 'en';
  const [appointments, setAppointments] = useState<any[]>([]);
  const [filter, setFilter] = useState<AppointmentFilter>('active');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<any>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [reviewTarget, setReviewTarget] = useState<any>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadAppointments();
  }, [filter]);

  const loadAppointments = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await patientAPI.appointments({ status: filter === 'active' ? 'all' : filter });
      setAppointments(response.data || []);
    } catch (err: any) {
      setError(err?.status === 403 ? (en ? 'You do not have permission to access these appointments.' : 'No tienes permiso para acceder a estas citas.') : (en ? 'Your appointments could not be loaded.' : 'No se pudieron cargar tus citas.'));
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    const byStatus = filter === 'active'
      ? appointments.filter((appointment) => activeStatuses.includes(appointment.status))
      : appointments;
    if (!term) return byStatus;
    return byStatus.filter((appointment) => Object.values(appointment).filter(Boolean).join(' ').toLowerCase().includes(term));
  }, [appointments, filter, search]);

  const confirmAppointment = async (id: string) => {
    try {
      setSaving(true);
      setError('');
      await patientAPI.confirmAppointment(id);
      setSuccess(en ? 'Attendance confirmed successfully.' : 'Asistencia confirmada correctamente.');
      await loadAppointments();
    } catch (err: any) {
      setError(err?.status === 409 ? (en ? 'This appointment cannot be confirmed in its current state.' : 'Esta cita no puede confirmarse en su estado actual.') : (en ? 'The appointment could not be confirmed.' : 'No se pudo confirmar la cita.'));
    } finally {
      setSaving(false);
    }
  };

  const openCancelModal = (appointment: any) => {
    setCancelTarget(appointment);
    setCancelReason('');
  };

  const cancelAppointment = async () => {
    if (!cancelTarget) return;
    try {
      setSaving(true);
      setError('');
      await appointmentAPI.cancel(cancelTarget.id, cancelReason.trim() || (en ? 'Cancelled by patient' : 'Cancelada por el paciente'));
      setSuccess(en ? 'Appointment cancelled successfully.' : 'Cita cancelada correctamente.');
      setCancelTarget(null);
      await loadAppointments();
    } catch (err: any) {
      setError(err?.status === 403 ? (en ? 'You do not have permission to cancel this appointment.' : 'No tienes permiso para cancelar esta cita.') : (en ? 'The appointment could not be cancelled.' : 'No se pudo cancelar la cita.'));
    } finally {
      setSaving(false);
    }
  };

  const openReviewModal = (appointment: any) => {
    setReviewTarget(appointment);
    setReviewRating(appointment.review_rating || 5);
    setReviewComment('');
  };

  const submitReview = async () => {
    if (!reviewTarget) return;
    try {
      setSaving(true);
      setError('');
      await reviewAPI.create({
        doctorId: reviewTarget.doctor_id,
        appointmentId: reviewTarget.id,
        rating: reviewRating,
        comment: reviewComment.trim() || undefined,
      });
      setSuccess(en ? 'Thank you for rating your visit.' : 'Gracias por valorar tu atención.');
      setReviewTarget(null);
      setReviewComment('');
      await loadAppointments();
    } catch (err: any) {
      setError(err?.status === 409 ? (en ? 'You can only rate completed appointments.' : 'Solo puedes valorar citas completadas.') : err?.message || (en ? 'The rating could not be saved.' : 'No se pudo guardar la valoración.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProtectedRoute requiredRole="patient">
      <PatientShell title={en ? 'My appointments' : 'Mis citas'} subtitle={en ? 'View, confirm or cancel your scheduled visits' : 'Consulta, confirma o cancela tus atenciones programadas'}>
        {error && <Alert tone="error" message={error} />}
        {success && <Alert tone="success" message={success} />}

        <section className="mb-6 grid gap-4 md:grid-cols-4">
          <Metric title={en ? 'Active' : 'Activas'} value={appointments.filter((item) => activeStatuses.includes(item.status)).length} icon={CalendarDays} />
          <Metric title={en ? 'Scheduled' : 'Programadas'} value={appointments.filter((item) => item.status === 'scheduled').length} icon={Clock3} />
          <Metric title={en ? 'Confirmed' : 'Confirmadas'} value={appointments.filter((item) => item.status === 'confirmed').length} icon={CheckCircle2} />
          <Metric title={en ? 'History' : 'Historial'} value={appointments.filter((item) => ['completed', 'cancelled'].includes(item.status)).length} icon={XCircle} />
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white">
          <div className="flex flex-col gap-4 border-b border-gray-100 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={en ? 'Search by doctor, center or reason' : 'Buscar por doctor, centro o motivo'}
                className="h-10 w-full rounded-xl border border-gray-200 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 lg:w-80"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {(['active', 'all', 'scheduled', 'confirmed', 'completed', 'cancelled'] as AppointmentFilter[]).map((value) => (
                <button
                  key={value}
                  onClick={() => setFilter(value)}
                  className={`rounded-xl border px-3 py-2 text-sm font-semibold ${
                    filter === value ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {translateStatus(value, en)}
                </button>
              ))}
            </div>
          </div>

          <div className="p-5">
            {loading ? (
              <div className="space-y-3">{[...Array(4)].map((_, index) => <Skeleton key={index} />)}</div>
            ) : filtered.length === 0 ? (
              <EmptyState en={en} />
            ) : (
              <div className="grid gap-4">
                {filtered.map((appointment) => (
                  <article key={appointment.id} className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0 p-5">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-lg font-black text-gray-900">{formatDate(appointment.appointment_date, en)} · {String(appointment.appointment_time).slice(0, 5)}</p>
                          <StatusBadge status={appointment.status} en={en} />
                        </div>
                        <p className="mt-3 flex items-center gap-2 font-bold text-gray-800"><Stethoscope className="h-4 w-4 text-blue-600" /> {formatDoctorName(appointment.doctor_first_name, appointment.doctor_last_name)}</p>
                        <p className="mt-1 flex items-center gap-2 text-sm text-gray-500">
                          {isTeleconsultation(appointment) ? <Video className="h-4 w-4 text-violet-500" /> : <MapPin className="h-4 w-4 text-gray-400" />}
                          {appointment.specialties?.join?.(', ') || (en ? 'Medical visit' : 'Consulta médica')} · {isTeleconsultation(appointment) ? (en ? 'Telehealth' : 'Teleconsulta') : appointment.health_center_name || (en ? 'Medical center' : 'Centro médico')}
                        </p>
                        <p className="mt-2 text-sm text-gray-600">{appointment.reason_for_visit || (en ? 'Reason not specified' : 'Motivo no especificado')}</p>
                      </div>
                      <div className="flex flex-wrap gap-2 border-t border-gray-100 bg-gray-50 p-5 lg:border-l lg:border-t-0">
                        {isTeleconsultation(appointment) && appointment.video_room_url && ['scheduled', 'confirmed'].includes(appointment.status) && (
                          <Link href={appointment.video_room_url} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-violet-600 px-3 text-sm font-bold text-white hover:bg-violet-700">
                            <Video className="h-4 w-4" />
                            {en ? 'Open telehealth visit' : 'Abrir teleconsulta'}
                          </Link>
                        )}
                        {appointment.status === 'scheduled' && (
                          <button disabled={saving} onClick={() => confirmAppointment(appointment.id)} className="h-10 rounded-xl bg-blue-600 px-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60">
                            {en ? 'Confirm attendance' : 'Confirmar asistencia'}
                          </button>
                        )}
                        {['scheduled', 'confirmed'].includes(appointment.status) && (
                          <button disabled={saving} onClick={() => openCancelModal(appointment)} className="h-10 rounded-xl border border-rose-200 bg-white px-3 text-sm font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-60">
                            {en ? 'Cancel' : 'Cancelar'}
                          </button>
                        )}
                        {appointment.status === 'completed' && !appointment.review_id && (
                          <button disabled={saving} onClick={() => openReviewModal(appointment)} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-yellow-500 px-3 text-sm font-bold text-white hover:bg-yellow-600 disabled:opacity-60">
                            <Star className="h-4 w-4 fill-current" />
                            {en ? 'Rate doctor' : 'Valorar médico'}
                          </button>
                        )}
                        {appointment.review_id && (
                          <span className="inline-flex h-10 items-center gap-2 rounded-xl bg-yellow-50 px-3 text-sm font-bold text-yellow-700">
                            <Star className="h-4 w-4 fill-current" />
                            {en ? 'Rated' : 'Valorada'} {appointment.review_rating}/5
                          </span>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
        <CancelModal appointment={cancelTarget} reason={cancelReason} saving={saving} onReasonChange={setCancelReason} onClose={() => setCancelTarget(null)} onSubmit={cancelAppointment} />
        <ReviewModal appointment={reviewTarget} rating={reviewRating} comment={reviewComment} saving={saving} onRatingChange={setReviewRating} onCommentChange={setReviewComment} onClose={() => setReviewTarget(null)} onSubmit={submitReview} />
      </PatientShell>
    </ProtectedRoute>
  );
}

function ReviewModal({
  appointment,
  rating,
  comment,
  saving,
  onRatingChange,
  onCommentChange,
  onClose,
  onSubmit,
}: {
  appointment: any;
  rating: number;
  comment: string;
  saving: boolean;
  onRatingChange: (value: number) => void;
  onCommentChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const { locale } = useI18n();
  const en = locale === 'en';
  if (!appointment) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 p-4">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
        className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="border-b border-gray-100 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase text-yellow-600">{en ? 'Rate visit' : 'Valorar atención'}</p>
              <h2 className="mt-1 text-xl font-black text-gray-950">{formatDoctorName(appointment.doctor_first_name, appointment.doctor_last_name)}</h2>
              <p className="mt-1 text-sm text-gray-500">{formatDate(appointment.appointment_date, en)} · {String(appointment.appointment_time).slice(0, 5)}</p>
            </div>
            <button type="button" onClick={onClose} className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-gray-100" aria-label={en ? 'Close' : 'Cerrar'}>
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="space-y-4 p-5">
          <div>
            <span className="mb-2 block text-sm font-semibold text-gray-700">{en ? 'Rating' : 'Puntuación'}</span>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => onRatingChange(value)}
                  className={`inline-flex h-11 w-11 items-center justify-center rounded-xl border ${value <= rating ? 'border-yellow-400 bg-yellow-50 text-yellow-500' : 'border-gray-200 text-gray-300 hover:bg-gray-50'}`}
                  aria-label={`${value} ${en ? 'stars' : 'estrellas'}`}
                >
                  <Star className={`h-6 w-6 ${value <= rating ? 'fill-current' : ''}`} />
                </button>
              ))}
            </div>
          </div>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-gray-700">{en ? 'Optional comment' : 'Comentario opcional'}</span>
            <textarea value={comment} onChange={(event) => onCommentChange(event.target.value)} rows={4} placeholder={en ? 'Tell us about your visit...' : 'Cuéntanos cómo fue tu atención...'} className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500" />
          </label>
        </div>
        <div className="flex flex-col-reverse gap-3 border-t border-gray-100 bg-gray-50 p-5 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={saving} className="h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-60">{en ? 'Close' : 'Cerrar'}</button>
          <button type="submit" disabled={saving} className="h-11 rounded-xl bg-yellow-500 px-4 text-sm font-bold text-white hover:bg-yellow-600 disabled:opacity-60">{saving ? (en ? 'Saving...' : 'Guardando...') : (en ? 'Submit rating' : 'Enviar valoración')}</button>
        </div>
      </form>
    </div>
  );
}

function Metric({ title, value, icon: Icon }: { title: string; value: number; icon: any }) {
  return <div className="rounded-2xl border border-gray-200 bg-white p-5"><Icon className="mb-3 h-5 w-5 text-blue-600" /><p className="text-2xl font-bold">{value}</p><p className="text-sm text-gray-500">{title}</p></div>;
}

function StatusBadge({ status, en }: { status: string; en: boolean }) {
  const styles: Record<string, string> = {
    scheduled: 'bg-blue-50 text-blue-700',
    confirmed: 'bg-emerald-50 text-emerald-700',
    completed: 'bg-gray-100 text-gray-700',
    cancelled: 'bg-rose-50 text-rose-700',
    'no-show': 'bg-amber-50 text-amber-700',
  };
  return <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${styles[status] || 'bg-gray-100 text-gray-700'}`}>{translateStatus(status, en)}</span>;
}

function Alert({ message, tone }: { message: string; tone: 'error' | 'success' }) {
  return <div className={`mb-4 rounded-xl border px-4 py-3 text-sm ${tone === 'error' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>{message}</div>;
}

function Skeleton() {
  return <div className="h-28 animate-pulse rounded-2xl bg-gray-100" />;
}

function EmptyState({ en }: { en: boolean }) {
  return <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-10 text-center"><CalendarDays className="mx-auto mb-3 h-8 w-8 text-gray-300" /><p className="font-bold text-gray-800">{en ? 'No appointments for this view' : 'No hay citas para esta vista'}</p><p className="mt-1 text-sm text-gray-500">{en ? 'Change the filter or book a new visit from the doctor directory.' : 'Cambia el filtro o agenda una nueva consulta desde el directorio médico.'}</p></div>;
}

function formatDate(value: string, en = false) {
  return value ? new Date(value).toLocaleDateString(en ? 'en-US' : 'es-DO', { day: '2-digit', month: 'short', year: 'numeric' }) : (en ? 'Date pending' : 'Fecha pendiente');
}

function translateStatus(status: string, en = false) {
  const labels: Record<string, string> = {
    active: en ? 'Active' : 'Activas',
    all: en ? 'All' : 'Todas',
    scheduled: en ? 'Scheduled' : 'Programada',
    confirmed: en ? 'Confirmed' : 'Confirmada',
    completed: en ? 'Completed' : 'Completada',
    cancelled: en ? 'Cancelled' : 'Cancelada',
    'no-show': en ? 'No-show' : 'No asistió',
  };
  return labels[status] || status || (en ? 'N/A' : 'N/D');
}

function CancelModal({
  appointment,
  reason,
  saving,
  onReasonChange,
  onClose,
  onSubmit,
}: {
  appointment: any;
  reason: string;
  saving: boolean;
  onReasonChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const { locale } = useI18n();
  const en = locale === 'en';
  if (!appointment) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 p-4">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
        className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="border-b border-gray-100 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase text-rose-600">{en ? 'Cancel appointment' : 'Cancelar cita'}</p>
              <h2 className="mt-1 text-xl font-black text-gray-950">{formatDoctorName(appointment.doctor_first_name, appointment.doctor_last_name)}</h2>
              <p className="mt-1 text-sm text-gray-500">{formatDate(appointment.appointment_date, en)} · {String(appointment.appointment_time).slice(0, 5)}</p>
            </div>
            <button type="button" onClick={onClose} className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-gray-100" aria-label={en ? 'Close' : 'Cerrar'}>
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="space-y-3 p-5">
          <p className="rounded-xl border border-rose-100 bg-rose-50 p-3 text-sm text-rose-700">{en ? 'The appointment will be cancelled. If you need another date, you can book again.' : 'La cita se marcará como cancelada. Si necesitas otra fecha, puedes agendar nuevamente.'}</p>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-gray-700">{en ? 'Reason' : 'Motivo'}</span>
            <textarea value={reason} onChange={(event) => onReasonChange(event.target.value)} rows={4} placeholder={en ? 'E.g. I will not be able to attend...' : 'Ej: no podré asistir...'} className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500" />
          </label>
        </div>
        <div className="flex flex-col-reverse gap-3 border-t border-gray-100 bg-gray-50 p-5 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={saving} className="h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-60">{en ? 'Keep appointment' : 'Mantener cita'}</button>
          <button type="submit" disabled={saving} className="h-11 rounded-xl bg-rose-600 px-4 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-60">{saving ? (en ? 'Cancelling...' : 'Cancelando...') : (en ? 'Cancel appointment' : 'Cancelar cita')}</button>
        </div>
      </form>
    </div>
  );
}
