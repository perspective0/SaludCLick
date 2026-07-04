'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import { medicalAPI } from '@/utils/api';
import { formatDoctorName } from '@/utils/names';
import { ArrowLeft } from 'lucide-react';

export default function MedicalRecordsPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    patientId: '',
    diagnosis: '',
    treatment: '',
    notes: '',
  });

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (error) {
        console.error('Error parsing user:', error);
      }
    }
    loadRecords();
  }, []);

  const loadRecords = async () => {
    try {
      setLoading(true);
      const patientId = JSON.parse(localStorage.getItem('user') || '{}').id;
      const response = await medicalAPI.getPatientHistory(patientId);
      setRecords(response.data || []);
    } catch (error) {
      console.error('Error loading records:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await medicalAPI.createRecord(formData);
      setShowForm(false);
      setFormData({ patientId: '', diagnosis: '', treatment: '', notes: '' });
      loadRecords();
    } catch (error) {
      console.error('Error creating record:', error);
      alert('Error al crear el registro médico');
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-light py-12">
        <div className="container-main">
          <div className="mb-8 flex justify-between items-center">
            <div className="flex items-start gap-3">
              <Link href={getDashboardHref(user?.role)} className="mt-1 inline-flex h-10 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                <ArrowLeft className="h-4 w-4" />
                Volver
              </Link>
              <div>
                <h1 className="text-4xl font-bold mb-2">Registros Médicos</h1>
                <p className="text-gray-600">Tu historial médico</p>
              </div>
            </div>
            {user?.role === 'doctor' && (
              <button onClick={() => setShowForm(!showForm)} className="btn-primary">
                + Nuevo Registro
              </button>
            )}
          </div>

          {showForm && user?.role === 'doctor' && (
            <div className="card mb-8">
              <h2 className="text-2xl font-bold mb-6">Crear Registro Médico</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">ID del Paciente</label>
                  <input
                    type="text"
                    value={formData.patientId}
                    onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
                    required
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-primary"
                    placeholder="UUID del paciente"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Diagnóstico</label>
                  <input
                    type="text"
                    value={formData.diagnosis}
                    onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
                    required
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Tratamiento</label>
                  <textarea
                    value={formData.treatment}
                    onChange={(e) => setFormData({ ...formData, treatment: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-primary"
                    rows={4}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Notas Adicionales</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-primary"
                    rows={3}
                  />
                </div>

                <div className="flex gap-4">
                  <button type="submit" className="btn-primary">Guardar Registro</button>
                  <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          )}

          {loading ? (
            <p className="text-center py-12">Cargando registros...</p>
          ) : records.length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-gray-600">No hay registros médicos</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {records.map((record: any) => (
                <div key={record.id} className="card">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold">{record.diagnosis}</h3>
                      <p className="text-gray-600">
                        {formatDoctorName(record.doctor_first_name, record.doctor_last_name)}
                      </p>
                    </div>
                    <p className="text-sm text-gray-500">
                      {new Date(record.created_at).toLocaleDateString('es-ES')}
                    </p>
                  </div>

                  {record.treatment && (
                    <div className="mb-4">
                      <h4 className="font-semibold mb-2">Tratamiento</h4>
                      <p className="text-gray-700">{record.treatment}</p>
                    </div>
                  )}

                  {record.notes && (
                    <div className="mb-4">
                      <h4 className="font-semibold mb-2">Notas</h4>
                      <p className="text-gray-700">{record.notes}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}

function getDashboardHref(role?: string) {
  if (role === 'doctor') return '/doctor/dashboard';
  if (role === 'patient') return '/patient/dashboard';
  if (role === 'admin') return '/admin/dashboard';
  if (role === 'secretary') return '/secretary/dashboard';
  return '/dashboard';
}
