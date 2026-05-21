'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store';
import { doctorAPI, appointmentAPI } from '@/utils/api';

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
  });
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

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
    } catch (error) {
      console.error('Error loading doctor:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableSlots = async (date: string) => {
    try {
      const response = await appointmentAPI.getAvailableSlots(doctorId, date);
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
                Dr. {doctor.first_name} {doctor.last_name}
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
                  {doctor.health_center_name}
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
                    Fecha de la Cita *
                  </label>
                  <input
                    type="date"
                    value={booking.date}
                    onChange={handleDateChange}
                    min={new Date().toISOString().split('T')[0]}
                    required
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-primary"
                  />
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
