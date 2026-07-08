'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { appointmentAPI, doctorAPI } from '@/utils/api';
import { formatDoctorName } from '@/utils/names';
import ProtectedRoute from '@/components/ProtectedRoute';
import Link from 'next/link';
import { ArrowLeft, CalendarCheck, CalendarDays, Clock3, MapPin, MessageSquare, Stethoscope, Video } from 'lucide-react';

const DEFAULT_CONSULTATION_PRICE = 50;

type AppointmentSlot = {
  time: string;
  available: boolean;
};

function formatCurrencyRD(amount?: number | string | null) {
  const value = Number(amount ?? DEFAULT_CONSULTATION_PRICE);
  return `RD$ ${new Intl.NumberFormat('es-DO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : DEFAULT_CONSULTATION_PRICE)}`;
}

function formatDateDisplay(value?: string) {
  if (!value) return '';
  const [year, month, day] = value.split('-');
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function parseDateDisplay(value: string) {
  const match = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return '';

  const day = match[1].padStart(2, '0');
  const month = match[2].padStart(2, '0');
  const year = match[3];
  const parsed = new Date(`${year}-${month}-${day}T00:00:00`);

  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getFullYear() !== Number(year) ||
    parsed.getMonth() + 1 !== Number(month) ||
    parsed.getDate() !== Number(day)
  ) {
    return '';
  }

  return `${year}-${month}-${day}`;
}

function getTodayISO() {
  return new Date().toISOString().split('T')[0];
}

const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];

function getDayOfWeekFromISODate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() + 1 !== month ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }
  return parsed.getUTCDay();
}

function getConsultationDays(doctor: any, healthCenterId?: string) {
  const availability = Array.isArray(doctor?.availability) ? doctor.availability : [];
  const days = new Set<number>();
  availability.forEach((slot: any) => {
    if (slot.is_break) return;
    const slotCenterId = slot.health_center_id || slot.healthCenterId || '';
    if (healthCenterId && slotCenterId && slotCenterId !== healthCenterId) return;
    days.add(Number(slot.day_of_week ?? slot.dayOfWeek));
  });
  return Array.from(days).filter((day) => day >= 0 && day <= 6).sort((a, b) => a - b);
}

function dateMatchesConsultationDay(doctor: any, date: string, healthCenterId?: string) {
  const day = getDayOfWeekFromISODate(date);
  if (day === null) return false;
  return getConsultationDays(doctor, healthCenterId).includes(day);
}

function formatConsultationDays(days: number[]) {
  return days.length ? days.map((day) => dayNames[day]).join(', ') : 'Sin horarios configurados';
}

function normalizeDateDisplay(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 8);

  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export default function BookingPage() {
  const router = useRouter();
  const calendarInputRef = useRef<HTMLInputElement>(null);
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [doctor, setDoctor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<AppointmentSlot[]>([]);
  const [dateInput, setDateInput] = useState('');
  const [formData, setFormData] = useState({
    appointmentDate: '',
    appointmentTime: '',
    appointmentType: 'presencial',
    healthCenterId: '',
    reasonForVisit: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('doctorId');
    setDoctorId(id);
    if (!id) router.push('/doctors');
  }, [router]);

  useEffect(() => {
    if (!doctorId) return;
    loadDoctor();
  }, [doctorId]);

  const loadDoctor = async () => {
    try {
      setLoading(true);
      const response = await doctorAPI.getById(doctorId as string);
      setDoctor(response.data);
      const centers = getDoctorCenters(response.data);
      if (centers[0]?.id) {
        setFormData((current) => ({ ...current, healthCenterId: current.healthCenterId || centers[0].id }));
      }
    } catch (err) {
      console.error('Error loading doctor:', err);
      setError('Error al cargar los datos del médico');
    } finally {
      setLoading(false);
    }
  };

  const updateDateSelection = async (date: string, displayValue: string) => {
    setFormData((current) => ({ ...current, appointmentDate: date, appointmentTime: '' }));
    setDateInput(displayValue);
    setAvailableSlots([]);

    if (!date || !doctorId) {
      return;
    }

    try {
      const response = await appointmentAPI.getAvailableSlots(doctorId, date, formData.healthCenterId || undefined);
      const slots = response.data?.allSlots || response.data?.slots || response.data || [];
      setAvailableSlots(
        slots.map((slot: string | AppointmentSlot) =>
          typeof slot === 'string' ? { time: slot, available: true } : slot
        )
      );
    } catch (err) {
      console.error('Error loading available slots:', err);
    }
  };

  const handleDateChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const displayValue = normalizeDateDisplay(event.target.value);
    setDateInput(displayValue);

    const date = parseDateDisplay(displayValue);
    setFormData((current) => ({ ...current, appointmentDate: date, appointmentTime: '' }));
    setAvailableSlots([]);

    if (displayValue.length < 10 || !date) {
      return;
    }

    if (date < getTodayISO()) {
      return;
    }

    const consultationDaysForCenter = getConsultationDays(doctor, formData.healthCenterId);
    if (!dateMatchesConsultationDay(doctor, date, formData.healthCenterId)) {
      setError(`Este medico no consulta ese dia. Dias disponibles: ${formatConsultationDays(consultationDaysForCenter)}.`);
      return;
    }

    setError('');
    await updateDateSelection(date, displayValue);
  };

  const handleCalendarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const date = event.target.value;
    const consultationDaysForCenter = getConsultationDays(doctor, formData.healthCenterId);
    if (!dateMatchesConsultationDay(doctor, date, formData.healthCenterId)) {
      setFormData((current) => ({ ...current, appointmentDate: date, appointmentTime: '' }));
      setDateInput(formatDateDisplay(date));
      setAvailableSlots([]);
      setError(`Este medico no consulta ese dia. Dias disponibles: ${formatConsultationDays(consultationDaysForCenter)}.`);
      return;
    }
    setError('');
    await updateDateSelection(date, formatDateDisplay(date));
  };

  const openCalendar = () => {
    const input = calendarInputRef.current;
    if (!input) return;

    if (typeof input.showPicker === 'function') {
      try {
        input.showPicker();
        return;
      } catch {
        // Some mobile browsers only open native date pickers from a direct input tap.
      }
    }

    input.focus();
    input.click();
  };

  const handleCalendarTap = () => {
    const input = calendarInputRef.current;
    if (!input || typeof input.showPicker !== 'function') {
      return;
    }

    try {
      input.showPicker();
    } catch {
      input.focus();
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (!formData.appointmentDate || !formData.appointmentTime) {
        setError('Por favor selecciona una fecha válida en formato dd/mm/aaaa y una hora');
        return;
      }

      await appointmentAPI.create({ doctorId, ...formData });
      setSuccess(true);
      setTimeout(() => router.push('/patient/dashboard'), 1800);
    } catch (err: any) {
      setError(err.message || 'Error al agendar la cita');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedTypeLabel = formData.appointmentType === 'teleconsulta' ? 'Teleconsulta' : 'Presencial';
  const doctorName = useMemo(() => doctor ? formatDoctorName(doctor.first_name, doctor.last_name) : 'Médico', [doctor]);
  const consultationPrice = formatCurrencyRD(doctor?.consultation_price);
  const consultationDuration = `${doctor?.consultation_duration || 30} minutos`;
  const specialty = doctor?.specialties?.[0] || 'Medicina General';
  const healthCenters = getDoctorCenters(doctor);
  const selectedHealthCenter = healthCenters.find((center) => center.id === formData.healthCenterId) || healthCenters[0];
  const consultationDays = useMemo(
    () => getConsultationDays(doctor, formData.healthCenterId || selectedHealthCenter?.id),
    [doctor, formData.healthCenterId, selectedHealthCenter?.id]
  );
  const healthCenter = selectedHealthCenter
    ? `${selectedHealthCenter.name}${selectedHealthCenter.city ? ` - ${selectedHealthCenter.city}` : ''}`
    : doctor?.health_center_name || 'No asignado';

  const handleCenterChange = async (healthCenterId: string) => {
    setFormData((current) => ({ ...current, healthCenterId, appointmentTime: '' }));
    setAvailableSlots([]);
    if (formData.appointmentDate && doctorId) {
      const consultationDaysForCenter = getConsultationDays(doctor, healthCenterId);
      if (!dateMatchesConsultationDay(doctor, formData.appointmentDate, healthCenterId)) {
        setError(`Este medico no consulta ese dia en el centro seleccionado. Dias disponibles: ${formatConsultationDays(consultationDaysForCenter)}.`);
        return;
      }
      setError('');
      try {
        const response = await appointmentAPI.getAvailableSlots(doctorId, formData.appointmentDate, healthCenterId || undefined);
        const slots = response.data?.allSlots || response.data?.slots || response.data || [];
        setAvailableSlots(
          slots.map((slot: string | AppointmentSlot) =>
            typeof slot === 'string' ? { time: slot, available: true } : slot
          )
        );
      } catch (err) {
        console.error('Error loading available slots:', err);
      }
    }
  };

  if (loading) {
    return (
      <ProtectedRoute requiredRole="patient">
        <div className="flex min-h-screen items-center justify-center bg-[#eef5f8]">
          <p className="text-gray-500">Cargando reserva...</p>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRole="patient">
      <div className="relative min-h-screen overflow-hidden bg-[#eef5f8]">
        <div className="pointer-events-none absolute -left-24 top-24 h-80 w-80 rounded-full bg-cyan-300/30 blur-3xl" />
        <div className="pointer-events-none absolute right-[-120px] top-10 h-96 w-96 rounded-full bg-blue-400/20 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/2 h-72 w-72 rounded-full bg-emerald-300/20 blur-3xl" />

        <main className="relative mx-auto max-w-6xl px-4 py-8 md:px-8">
          <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <Link href="/" className="inline-flex items-center gap-3">
              <span className="flex h-14 w-44 items-center justify-center rounded-2xl bg-white px-4 shadow-md ring-1 ring-white/70">
                <Image src="/saludclick.png" alt="SaludClick" width={220} height={80} className="h-10 w-auto object-contain" priority />
              </span>
            </Link>
            <Link href="/doctors" className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/70 bg-white/80 px-4 text-sm font-semibold text-gray-700 shadow-sm backdrop-blur hover:bg-white">
              <ArrowLeft className="h-4 w-4" />
              Volver a médicos
            </Link>
          </header>

          {success && (
            <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
              Cita agendada exitosamente. Te llevaremos a tu panel.
            </div>
          )}

          {error && (
            <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
              {error}
            </div>
          )}

          {doctor && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr]">
              <aside className="relative overflow-hidden rounded-3xl bg-gray-950 p-6 text-white shadow-2xl">
                <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-cyan-300/20 blur-2xl" />
                <div className="pointer-events-none absolute -bottom-16 left-6 h-36 w-36 rounded-full bg-blue-400/20 blur-2xl" />
                <div className="relative mb-6 flex items-center gap-4">
                  <div className="rounded-2xl bg-white/10 p-3">
                    <Stethoscope className="h-7 w-7 text-cyan-100" />
                  </div>
                </div>
                <div className="relative">
                  <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-cyan-100">Reserva de consulta</p>
                  <h1 className="text-3xl font-bold text-white drop-shadow-[0_2px_12px_rgba(125,211,252,0.25)]">{doctorName}</h1>
                  <p className="mt-2 text-base font-medium text-cyan-50">{specialty}</p>
                </div>

                <div className="relative mt-6 space-y-3">
                  <InfoLine icon={MapPin} label="Centro" value={healthCenter} />
                  <InfoLine icon={Clock3} label="Duración" value={consultationDuration} />
                  <InfoLine icon={CalendarDays} label="Días de consulta" value={formatConsultationDays(consultationDays)} />
                  <InfoLine icon={CalendarCheck} label="Consulta" value={consultationPrice} />
                  <InfoLine icon={Video} label="Teleconsulta" value={doctor.teleconsultation_enabled ? 'Disponible' : 'No disponible'} />
                </div>
              </aside>

              <section className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-xl backdrop-blur md:p-8">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-950">Reservar cita</h2>
                  <p className="mt-1 text-sm text-gray-500">Elige modalidad, fecha y hora disponible para confirmar tu consulta.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">Tipo de cita</label>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <TypeButton
                        active={formData.appointmentType === 'presencial'}
                        icon={MapPin}
                        title="Presencial"
                        text="Atención en el centro médico."
                        onClick={() => setFormData({ ...formData, appointmentType: 'presencial' })}
                      />
                      {doctor.teleconsultation_enabled && (
                        <TypeButton
                          active={formData.appointmentType === 'teleconsulta'}
                          icon={Video}
                          title="Teleconsulta"
                          text="Consulta virtual desde SaludClick."
                          onClick={() => setFormData({ ...formData, appointmentType: 'teleconsulta' })}
                        />
                      )}
                    </div>
                  </div>

                  {healthCenters.length > 1 && (
                    <label>
                      <span className="mb-2 block text-sm font-semibold text-gray-700">Centro de salud</span>
                      <select
                        value={formData.healthCenterId}
                        onChange={(event) => handleCenterChange(event.target.value)}
                        required
                        className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {healthCenters.map((center) => (
                          <option key={center.id} value={center.id}>
                            {center.name}{center.city ? ` - ${center.city}` : ''}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}

                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <label>
                      <span className="mb-2 block text-sm font-semibold text-gray-700">Fecha</span>
                      <p className="mb-2 text-xs font-medium text-gray-500">Disponible: {formatConsultationDays(consultationDays)}</p>
                      <div className="relative">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={dateInput}
                          onChange={handleDateChange}
                          placeholder="dd/mm/aaaa"
                          maxLength={10}
                          pattern="\d{2}/\d{2}/\d{4}"
                          required
                          className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 pr-14 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          type="button"
                          onClick={openCalendar}
                          className="absolute right-2 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-blue-600 transition hover:bg-blue-50"
                          aria-label="Seleccionar fecha en calendario"
                        >
                          <CalendarDays className="h-5 w-5" />
                        </button>
                        <input
                          ref={calendarInputRef}
                          type="date"
                          value={formData.appointmentDate}
                          onChange={handleCalendarChange}
                          onClick={handleCalendarTap}
                          min={getTodayISO()}
                          tabIndex={-1}
                          aria-label="Seleccionar fecha"
                          className="absolute right-2 top-1/2 h-9 w-9 -translate-y-1/2 cursor-pointer opacity-0"
                        />
                      </div>
                    </label>
                    <div>
                      <span className="mb-2 block text-sm font-semibold text-gray-700">Hora</span>
                      <div className="min-h-12 rounded-xl border border-gray-200 bg-gray-50 p-2">
                        {formData.appointmentDate && availableSlots.length > 0 ? (
                          <div className="grid grid-cols-3 gap-2">
                            {availableSlots.map((slot) => (
                              <button
                                key={slot.time}
                                type="button"
                                disabled={!slot.available}
                                onClick={() => setFormData({ ...formData, appointmentTime: slot.time })}
                                title={slot.available ? 'Horario disponible' : 'Horario ocupado'}
                                className={`h-9 rounded-lg text-sm font-semibold transition ${
                                  !slot.available
                                    ? 'cursor-not-allowed border border-gray-200 bg-gray-200 text-gray-400 line-through'
                                    : formData.appointmentTime === slot.time
                                      ? 'bg-blue-600 text-white'
                                      : 'bg-white text-gray-600 hover:bg-blue-50'
                                }`}
                              >
                                {slot.time}
                              </button>
                            ))}
                          </div>
                        ) : formData.appointmentDate ? (
                          <p className="px-2 py-2 text-sm text-amber-700">No hay espacios disponibles para esta fecha.</p>
                        ) : (
                          <p className="px-2 py-2 text-sm text-gray-500">Selecciona una fecha primero.</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <label>
                    <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
                      <MessageSquare className="h-4 w-4" />
                      Motivo de la consulta
                    </span>
                    <textarea
                      value={formData.reasonForVisit}
                      onChange={(event) => setFormData({ ...formData, reasonForVisit: event.target.value })}
                      className="min-h-28 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Describe brevemente tu motivo de consulta"
                    />
                  </label>

                  <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                    <p className="text-sm font-semibold text-blue-900">Resumen</p>
                    <dl className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                      <SummaryItem label="Médico" value={doctorName} />
                      <SummaryItem label="Especialidad" value={specialty} />
                      <SummaryItem label="Modalidad" value={selectedTypeLabel} />
                      <SummaryItem label="Centro" value={healthCenter} />
                      <SummaryItem label="Fecha" value={formData.appointmentDate ? formatDateDisplay(formData.appointmentDate) : 'Pendiente'} />
                      <SummaryItem label="Hora" value={formData.appointmentTime || 'Pendiente'} />
                      <SummaryItem label="Duración" value={consultationDuration} />
                      <SummaryItem label="Costo" value={consultationPrice} />
                    </dl>
                    <div className="mt-3 rounded-xl bg-white/70 p-3 text-sm">
                      <p className="font-semibold text-blue-900">Motivo</p>
                      <p className="mt-1 text-blue-700">{formData.reasonForVisit.trim() || 'Sin motivo indicado todavía.'}</p>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || !formData.appointmentTime}
                    className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-blue-600 px-4 font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
                  >
                    {submitting ? 'Agendando...' : 'Confirmar cita'}
                  </button>
                </form>
              </section>
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}

function InfoLine({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white/10 p-3">
      <Icon className="h-5 w-5 text-cyan-200" />
      <div>
        <p className="text-xs text-gray-300">{label}</p>
        <p className="text-sm font-semibold">{value}</p>
      </div>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/70 p-3">
      <dt className="text-xs font-semibold uppercase text-blue-500">{label}</dt>
      <dd className="mt-1 font-semibold text-blue-950">{value}</dd>
    </div>
  );
}

function TypeButton({ active, icon: Icon, title, text, onClick }: { active: boolean; icon: any; title: string; text: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-4 text-left transition ${
        active ? 'border-blue-600 bg-blue-50 shadow-sm' : 'border-gray-200 bg-white hover:bg-gray-50'
      }`}
    >
      <Icon className={`mb-3 h-5 w-5 ${active ? 'text-blue-600' : 'text-gray-400'}`} />
      <p className="font-semibold text-gray-950">{title}</p>
      <p className="mt-1 text-sm text-gray-500">{text}</p>
    </button>
  );
}

function getDoctorCenters(doctor: any) {
  const centers = doctor?.health_centers || doctor?.healthCenters || [];
  if (Array.isArray(centers) && centers.length) {
    return centers.map((center: any) => ({
      ...center,
      name: center.name || center.health_center_name || 'Centro asignado',
    }));
  }
  return doctor?.health_center_id
    ? [{
        id: doctor.health_center_id,
        name: doctor.health_center_name || 'Centro asignado',
        address: doctor.address,
        city: doctor.city,
      }]
    : [];
}
