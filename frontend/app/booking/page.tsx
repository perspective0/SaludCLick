'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { appointmentAPI, doctorAPI } from '@/utils/api';
import ProtectedRoute from '@/components/ProtectedRoute';
import Link from 'next/link';

export default function BookingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const doctorId = searchParams.get('doctorId');

  const [doctor, setDoctor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    appointmentDate: '',
    appointmentTime: '',
    reasonForVisit: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!doctorId) {
      router.push('/doctors');
      return;
    }
    loadDoctor();
  }, [doctorId]);

  const loadDoctor = async () => {
    try {
      setLoading(true);
      const response = await doctorAPI.getById(doctorId as string);
      setDoctor(response.data);
    } catch (error) {
      console.error('Error loading doctor:', error);
      setError('Error al cargar los datos del médico');
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value;
    setFormData({ ...formData, appointmentDate: date, appointmentTime: '' });
    setAvailableSlots([]);

    if (date && doctorId) {
      try {
        const response = await appointmentAPI.getAvailableSlots(doctorId, date);
        setAvailableSlots(response.data || []);
      } catch (error) {
        console.error('Error loading available slots:', error);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (!formData.appointmentDate || !formData.appointmentTime) {
        setError('Por favor selecciona fecha y hora');
        setSubmitting(false);
        return;
      }

      await appointmentAPI.create({
        doctorId,
        ...formData,
      });

      setSuccess(true);
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    } catch (error: any) {
      setError(error.message || 'Error al agendar la cita');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute requiredRole="patient">
        <div className="flex items-center justify-center min-h-screen">
          <p>Cargando...</p>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRole="patient">
      <div className="min-h-screen bg-light py-12">
        <div className="container-main">
          <Link href="/doctors" className="text-primary hover:underline mb-6 inline-block">
            ← Volver a médicos
          </Link>

          {success && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
              ✓ Cita agendada exitosamente. Serás redirigido a tu dashboard...
            </div>
          )}

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
              ✗ {error}
            </div>
          )}

          {doctor && (
            <div className="max-w-2xl mx-auto">
              {/* Doctor Info */}
              <div className="card mb-8 bg-gradient-to-r from-primary/10 to-secondary/10 border-l-4 border-primary">
                <h2 className="text-2xl font-bold mb-4">
                  Dr. {doctor.first_name} {doctor.last_name}
                </h2>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Especialidad</p>
                    <p className="font-semibold">{doctor.specialties?.[0] || 'Medicina General'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Experiencia</p>
                    <p className="font-semibold">{doctor.years_experience || 0} años</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Centro</p>
                    <p className="font-semibold">{doctor.health_center_name}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Consulta</p>
                    <p className="font-semibold">${doctor.consultation_price || 50}</p>
                  </div>
                </div>
              </div>

              {/* Booking Form */}
              <div className="card">
                <h3 className="text-xl font-bold mb-6">Agendar Cita</h3>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">Fecha de la Cita</label>
                    <input
                      type="date"
                      value={formData.appointmentDate}
                      onChange={handleDateChange}
                      min={new Date().toISOString().split('T')[0]}
                      required
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-primary"
                    />
                  </div>

                  {formData.appointmentDate && availableSlots.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium mb-2">Hora de la Cita</label>
                      <select
                        value={formData.appointmentTime}
                        onChange={(e) => setFormData({ ...formData, appointmentTime: e.target.value })}
                        required
                        className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-primary"
                      >
                        <option value="">Selecciona una hora</option>
                        {availableSlots.map((slot) => (
                          <option key={slot} value={slot}>
                            {slot}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {formData.appointmentDate && availableSlots.length === 0 && (
                    <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
                      No hay espacios disponibles para esta fecha
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium mb-2">Motivo de la Consulta</label>
                    <textarea
                      value={formData.reasonForVisit}
                      onChange={(e) => setFormData({ ...formData, reasonForVisit: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-primary"
                      placeholder="Describe brevemente tu motivo de consulta"
                      rows={4}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || !formData.appointmentTime}
                    className="w-full btn-primary disabled:opacity-50"
                  >
                    {submitting ? 'Agendando...' : 'Agendar Cita'}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
