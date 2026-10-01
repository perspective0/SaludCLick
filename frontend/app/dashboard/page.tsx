'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store';
import { appointmentAPI } from '@/utils/api';
import { formatDate, getUserGreeting } from '@/utils/helpers';
import { useI18n } from '@/i18n';

export default function DashboardPage() {
  const { locale } = useI18n();
  const en = locale === 'en';
  const { user, isAuthenticated } = useAuthStore();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      window.location.href = '/login';
      return;
    }
    loadAppointments();
  }, [isAuthenticated]);

  const loadAppointments = async () => {
    try {
      setLoading(true);
      const response = await appointmentAPI.list({ limit: 10 });
      setAppointments(response.data || []);
    } catch (error) {
      console.error('Error loading appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-light py-12">
      <div className="container-main">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">
            {getUserGreeting(user)}
          </h1>
          <p className="text-gray-600">
            {user?.role === 'patient'
              ? (en ? 'Manage your appointments and medical records' : 'Gestiona tus citas y historial médico')
              : (en ? 'Manage your appointments and patients' : 'Gestiona tus citas y pacientes')}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="card bg-gradient-to-br from-primary to-blue-600 text-white">
            <h3 className="text-sm font-semibold opacity-90">{en ? 'Upcoming appointments' : 'Citas médicas próximas'}</h3>
            <p className="text-3xl font-bold">
              {appointments.filter(a => a.status === 'scheduled').length}
            </p>
          </div>
          <div className="card bg-gradient-to-br from-secondary to-green-600 text-white">
            <h3 className="text-sm font-semibold opacity-90">{en ? 'Completed appointments' : 'Citas médicas completadas'}</h3>
            <p className="text-3xl font-bold">
              {appointments.filter(a => a.status === 'completed').length}
            </p>
          </div>
          <div className="card bg-gradient-to-br from-accent to-red-600 text-white">
            <h3 className="text-sm font-semibold opacity-90">{en ? 'Complete profile' : 'Perfil Completo'}</h3>
            <p className="text-3xl font-bold">
              {user ? '100%' : '0%'}
            </p>
          </div>
        </div>

        {/* Appointments Section */}
        <div className="card mb-8">
          <h2 className="text-2xl font-bold mb-6">{en ? 'Your appointments' : 'Tus citas médicas'}</h2>

          {loading ? (
            <p>{en ? 'Loading appointments...' : 'Cargando citas...'}</p>
          ) : appointments.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">{en ? 'You have no scheduled appointments' : 'No tienes citas agendadas'}</p>
              {user?.role === 'patient' && (
                <a href="/doctors" className="btn-primary inline-block">
                  {en ? 'Find doctors' : 'Buscar Médicos'}
                </a>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {appointments.map((apt) => (
                <div
                  key={apt.id}
                  className="border rounded-lg p-4 hover:shadow-md transition"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-lg">
                        {apt.first_name} {apt.last_name}
                      </h3>
                      <p className="text-gray-600 mb-2">
                        {apt.health_center_name}
                      </p>
                      <p className="text-sm">
                        📅 {formatDate(apt.appointment_date)} {en ? 'at' : 'a las'} {apt.appointment_time}
                      </p>
                      {apt.reason_for_visit && (
                        <p className="text-sm text-gray-600 mt-2">
                          {en ? 'Reason' : 'Motivo'}: {apt.reason_for_visit}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          apt.status === 'scheduled'
                            ? 'bg-blue-100 text-blue-800'
                            : apt.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {apt.status === 'scheduled'
                          ? (en ? 'Scheduled' : 'Programada')
                          : apt.status === 'completed'
                          ? (en ? 'Completed' : 'Completada')
                          : (en ? 'Cancelled' : 'Cancelada')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {user?.role === 'patient' && (
          <div className="flex gap-4">
            <a href="/doctors" className="btn-primary">
              {en ? 'Book a new appointment' : 'Agendar Nueva Cita'}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
