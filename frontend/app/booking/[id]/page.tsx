'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store';
import { doctorAPI, appointmentAPI } from '@/utils/api';
import { formatDoctorName } from '@/utils/names';

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

export default function BookingPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const doctorId = params.id as string;

  const [doctor, setDoctor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState({
    date: '',
    time: '',
    reason: '',
    appointmentType: 'presencial',
    healthCenterId: '',
  });
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [dateError, setDateError] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    loadDoctor();
  }, [isAuthenticated]);

  const loadDoctor = async () => {
    try {
      const response = await doctorAPI.getById(doctorId);
      setDoctor(response.data);
      const centers = getDoctorCenters(response.data);
      if (centers[0]?.id) {
        setBooking((current) => ({ ...current, healthCenterId: current.healthCenterId || centers[0].id }));
      }
    } catch (error) {
      console.error('Error loading doctor:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableSlots = async (date: string) => {
    if (!dateMatchesConsultationDay(doctor, date, booking.healthCenterId)) {
      setAvailableSlots([]);
      setDateError(`Este medico no consulta ese dia. Dias disponibles: ${formatConsultationDays(getConsultationDays(doctor, booking.healthCenterId))}.`);
      return;
    }
    setDateError('');
    try {
      const response = await appointmentAPI.getAvailableSlots(doctorId, date, booking.healthCenterId || undefined);
      setAvailableSlots(response.data.slots);
    } catch (error) {
      console.error('Error loading slots:', error);
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value;
    setBooking({ ...booking, date, time: '' });
    if (date) {
      loadAvailableSlots(date);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!booking.date || !booking.time) {
      alert('Por favor completa la fecha y hora');
      return;
    }

    try {
      setSubmitting(true);
      await appointmentAPI.create({
        doctorId,
        appointmentDate: booking.date,
        appointmentTime: booking.time,
        reasonForVisit: booking.reason,
        appointmentType: booking.appointmentType,
        healthCenterId: booking.healthCenterId,
      });

      alert('¡Cita agendada exitosamente!');
      router.push('/dashboard');
    } catch (error: any) {
      alert(error.message || 'Error al agendar la cita');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-light py-12 flex items-center justify-center">
        <p>Cargando información del médico...</p>
      </div>
    );
  }
  const healthCenters = getDoctorCenters(doctor);
  const consultationDays = getConsultationDays(doctor, booking.healthCenterId || healthCenters[0]?.id);

  if (!doctor) {
    return (
      <div className="min-h-screen bg-light py-12 flex items-center justify-center">
        <p>Médico no encontrado</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-light py-12">
      <div className="container-main max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">Agendar Cita</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Doctor Info */}
          <div className="md:col-span-1">
            <div className="card">
              <div className="mb-4">
                <div className="w-full h-48 bg-gray-200 rounded-lg mb-4 flex items-center justify-center">
                  <span className="text-gray-400">Foto</span>
                </div>
              </div>
              <h2 className="text-2xl font-bold mb-2">
                {formatDoctorName(doctor.first_name, doctor.last_name)}
              </h2>
              <p className="text-primary font-semibold mb-4">
                {doctor.specialties?.[0] || 'Especialidad'}
              </p>
              <div className="space-y-2 text-sm">
                <p>
                  <span className="font-semibold">Experiencia:</span>{' '}
                  {doctor.years_experience} años
                </p>
                <p>
                  <span className="font-semibold">Calificación:</span> ⭐{' '}
                  {doctor.average_rating?.toFixed(1)}
                </p>
                <p>
                  <span className="font-semibold">Tarifa:</span> ${doctor.consultation_price}
                </p>
                <p>
                  <span className="font-semibold">Centro:</span>{' '}
                  {healthCenters.map((center) => `${center.name}${center.city ? ` - ${center.city}` : ''}`).join(', ') || doctor.health_center_name}
                </p>
                <p>
                  <span className="font-semibold">Días de consulta:</span>{' '}
                  {formatConsultationDays(consultationDays)}
                </p>
              </div>
            </div>
          </div>

          {/* Booking Form */}
          <div className="md:col-span-2">
            <div className="card">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Tipo de cita
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setBooking({ ...booking, appointmentType: 'presencial' })}
                      className={`p-3 rounded-lg border font-semibold transition ${booking.appointmentType === 'presencial' ? 'bg-primary text-white border-primary' : 'border-gray-300 hover:border-primary'}`}
                    >
                      Presencial
                    </button>
                    {doctor.teleconsultation_enabled && (
                      <button
                        type="button"
                        onClick={() => setBooking({ ...booking, appointmentType: 'teleconsulta' })}
                        className={`p-3 rounded-lg border font-semibold transition ${booking.appointmentType === 'teleconsulta' ? 'bg-primary text-white border-primary' : 'border-gray-300 hover:border-primary'}`}
                      >
                        Teleconsulta
                      </button>
                    )}
                  </div>
                </div>
                {healthCenters.length > 1 && (
                  <div>
                    <label className="block text-sm font-semibold mb-2">
                      Centro de salud *
                    </label>
                    <select
                      value={booking.healthCenterId}
                      onChange={(event) => {
                        const healthCenterId = event.target.value;
                        setBooking({ ...booking, healthCenterId, time: '' });
                        setAvailableSlots([]);
                        if (booking.date) {
                          if (!dateMatchesConsultationDay(doctor, booking.date, healthCenterId)) {
                            setDateError(`Este medico no consulta ese dia en el centro seleccionado. Dias disponibles: ${formatConsultationDays(getConsultationDays(doctor, healthCenterId))}.`);
                            return;
                          }
                          setDateError('');
                          appointmentAPI.getAvailableSlots(doctorId, booking.date, healthCenterId)
                            .then((response) => setAvailableSlots(response.data.slots))
                            .catch((error) => console.error('Error loading slots:', error));
                        }
                      }}
                      required
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-primary"
                    >
                      {healthCenters.map((center) => (
                        <option key={center.id} value={center.id}>
                          {center.name}{center.city ? ` - ${center.city}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Fecha de la Cita *
                  </label>
                  <p className="mb-2 text-xs text-gray-600">Disponible: {formatConsultationDays(consultationDays)}</p>
                  <input
                    type="date"
                    value={booking.date}
                    onChange={handleDateChange}
                    min={new Date().toISOString().split('T')[0]}
                    required
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-primary"
                  />
                  {dateError && <p className="mt-2 text-sm text-red-600">{dateError}</p>}
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Hora de la Cita *
                  </label>
                  {availableSlots.length > 0 ? (
                    <div className="grid grid-cols-4 gap-2">
                      {availableSlots.map((slot) => (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setBooking({ ...booking, time: slot })}
                          className={`p-2 rounded-lg border transition ${
                            booking.time === slot
                              ? 'bg-primary text-white border-primary'
                              : 'border-gray-300 hover:border-primary'
                          }`}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  ) : booking.date ? (
                    <p className="text-red-600">No hay horarios disponibles para esta fecha</p>
                  ) : (
                    <p className="text-gray-600">Selecciona una fecha primero</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Motivo de la Consulta (Opcional)
                  </label>
                  <textarea
                    value={booking.reason}
                    onChange={(e) =>
                      setBooking({ ...booking, reason: e.target.value })
                    }
                    placeholder="Describe brevemente el motivo de tu consulta..."
                    rows={4}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-primary"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting || !booking.date || !booking.time}
                  className="w-full btn-primary disabled:opacity-50"
                >
                  {submitting ? 'Agendando...' : 'Confirmar Cita'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
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
