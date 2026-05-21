'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { appointmentAPI } from '@/utils/api';
import { formatDate } from '@/utils/helpers';
import Link from 'next/link';

export default function DoctorDashboardPage() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'scheduled' | 'completed'>('all');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (error) {
        console.error('Error parsing user:', error);
      }
    }
    loadAppointments();
  }, [filter]);

  const loadAppointments = async () => {
    try {
      setLoading(true);
      const response = await appointmentAPI.list({ 
        status: filter === 'all' ? undefined : filter 
      });
      setAppointments(response.data || []);
    } catch (error) {
      console.error('Error loading appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteAppointment = async (appointmentId: string) => {
    try {
      await appointmentAPI.update(appointmentId, { status: 'completed' });
      loadAppointments();
    } catch (error) {
      console.error('Error completing appointment:', error);
      alert('Error al completar la cita');
    }
  };

  return (
    <ProtectedRoute requiredRole="doctor">
      <div className="min-h-screen bg-light py-12">
        <div className="container-main">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Dashboard - {user?.firstName}</h1>
            <p className="text-gray-600">Gestiona tus citas y pacientes</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="card bg-gradient-to-br from-primary to-blue-600 text-white">
              <h3 className="text-sm font-semibold opacity-90">Citas Hoy</h3>
              <p className="text-3xl font-bold">
                {appointments.filter(a => {
                  const today = new Date().toISOString().split('T')[0];
                  return a.appointment_date === today && a.status === 'scheduled';
                }).length}
              </p>
            </div>
            <div className="card bg-gradient-to-br from-secondary to-green-600 text-white">
              <h3 className="text-sm font-semibold opacity-90">Citas Próximas</h3>
              <p className="text-3xl font-bold">
                {appointments.filter(a => a.status === 'scheduled').length}
              </p>
            </div>
            <div className="card bg-gradient-to-br from-accent to-red-600 text-white">
              <h3 className="text-sm font-semibold opacity-90">Pacientes</h3>
              <p className="text-3xl font-bold">
                {new Set(appointments.map(a => a.patient_id)).size}
              </p>
            </div>
          </div>

          <div className="mb-6 flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                filter === 'all'
                  ? 'bg-primary text-white'
                  : 'bg-white text-primary border border-primary'
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => setFilter('scheduled')}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                filter === 'scheduled'
                  ? 'bg-primary text-white'
                  : 'bg-white text-primary border border-primary'
              }`}
            >
              Programadas
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                filter === 'completed'
                  ? 'bg-primary text-white'
                  : 'bg-white text-primary border border-primary'
              }`}
            >
              Completadas
            </button>
          </div>

          <div className="card">
            <h2 className="text-2xl font-bold mb-6">Citas</h2>

            {loading ? (
              <p className="text-center py-8">Cargando citas...</p>
            ) : appointments.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600">No hay citas</p>
              </div>
            ) : (
              <div className="space-y-4">
                {appointments.map((apt) => (
                  <div
                    key={apt.id}
                    className="border rounded-lg p-4 hover:shadow-md transition"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-bold text-lg">
                          {apt.patient_first_name} {apt.patient_last_name}
                        </h3>
                        <p className="text-gray-600 mb-2">{apt.patient_email}</p>
                        <p className="text-sm">
                          📅 {formatDate(apt.appointment_date)} a las {apt.appointment_time}
                        </p>
                        {apt.reason_for_visit && (
                          <p className="text-sm text-gray-600 mt-2">
                            Motivo: {apt.reason_for_visit}
                          </p>
                        )}
                      </div>
                      <div className="text-right space-y-2">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-semibold block ${
                            apt.status === 'scheduled'
                              ? 'bg-blue-100 text-blue-800'
                              : apt.status === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {apt.status === 'scheduled'
                            ? 'Programada'
                            : apt.status === 'completed'
                            ? 'Completada'
                            : 'Cancelada'}
                        </span>
                        {apt.status === 'scheduled' && (
                          <button
                            onClick={() => handleCompleteAppointment(apt.id)}
                            className="text-xs bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                          >
                            Marcar Completada
                          </button>
                        )}
                        <Link
                          href={`/appointments/${apt.id}`}
                          className="text-xs text-primary hover:underline block"
                        >
                          Ver Detalles
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-8 flex gap-4">
            <Link href="/doctor/patients" className="btn-secondary">
              Mis Pacientes
            </Link>
            <Link href="/doctor/medical-records" className="btn-secondary">
              Registros Médicos
            </Link>
            <Link href="/doctor/prescriptions" className="btn-secondary">
              Recetas
            </Link>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
