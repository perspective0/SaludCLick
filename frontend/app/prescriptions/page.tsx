'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import { medicalAPI } from '@/utils/api';
import { formatDoctorName } from '@/utils/names';
import { ArrowLeft } from 'lucide-react';

export default function PrescriptionsPage() {
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    patientId: '',
    medication: '',
    dosage: '',
    frequency: '',
    duration: '',
    instructions: '',
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
    loadPrescriptions();
  }, []);

  const loadPrescriptions = async () => {
    try {
      setLoading(true);
      const patientId = JSON.parse(localStorage.getItem('user') || '{}').id;
      const response = await medicalAPI.getPatientPrescriptions(patientId);
      setPrescriptions(response.data || []);
    } catch (error) {
      console.error('Error loading prescriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await medicalAPI.createPrescription(formData);
      setShowForm(false);
      setFormData({
        patientId: '',
        medication: '',
        dosage: '',
        frequency: '',
        duration: '',
        instructions: '',
      });
      loadPrescriptions();
    } catch (error) {
      console.error('Error creating prescription:', error);
      alert('Error al crear la receta');
    }
  };

  const downloadPrescription = (prescription: any) => {
    alert('Función de descarga en desarrollo');
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
                <h1 className="text-4xl font-bold mb-2">Recetas</h1>
                <p className="text-gray-600">Tus recetas médicas</p>
              </div>
            </div>
            {user?.role === 'doctor' && (
              <button onClick={() => setShowForm(!showForm)} className="btn-primary">
                + Nueva Receta
              </button>
            )}
          </div>

          {showForm && user?.role === 'doctor' && (
            <div className="card mb-8">
              <h2 className="text-2xl font-bold mb-6">Crear Receta</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">ID del Paciente</label>
                    <input
                      type="text"
                      value={formData.patientId}
                      onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
                      required
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Medicamento</label>
                    <input
                      type="text"
                      value={formData.medication}
                      onChange={(e) => setFormData({ ...formData, medication: e.target.value })}
                      required
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Dosis</label>
                    <input
                      type="text"
                      value={formData.dosage}
                      onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                      placeholder="ej: 500mg"
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Frecuencia</label>
                    <input
                      type="text"
                      value={formData.frequency}
                      onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                      placeholder="ej: 3 veces al día"
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Duración</label>
                    <input
                      type="text"
                      value={formData.duration}
                      onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                      placeholder="ej: 7 días"
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Instrucciones</label>
                  <textarea
                    value={formData.instructions}
                    onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-primary"
                    rows={4}
                    placeholder="Instrucciones adicionales"
                  />
                </div>

                <div className="flex gap-4">
                  <button type="submit" className="btn-primary">Guardar Receta</button>
                  <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          )}

          {loading ? (
            <p className="text-center py-12">Cargando recetas...</p>
          ) : prescriptions.length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-gray-600">No hay recetas</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {prescriptions.map((prescription: any) => (
                <div key={prescription.id} className="card border-l-4 border-primary">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold">{prescription.medication}</h3>
                      <p className="text-gray-600">
                        {formatDoctorName(prescription.doctor_first_name, prescription.doctor_last_name)}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        prescription.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : prescription.status === 'expired'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {prescription.status === 'active'
                        ? 'Activa'
                        : prescription.status === 'expired'
                        ? 'Expirada'
                        : 'Usada'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
                    <div>
                      <p className="text-gray-600">Dosis</p>
                      <p className="font-semibold">{prescription.dosage || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Frecuencia</p>
                      <p className="font-semibold">{prescription.frequency || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Duración</p>
                      <p className="font-semibold">{prescription.duration || 'N/A'}</p>
                    </div>
                  </div>

                  {prescription.instructions && (
                    <div className="mb-4 p-3 bg-blue-50 rounded">
                      <p className="text-sm text-gray-700">
                        <strong>Instrucciones:</strong> {prescription.instructions}
                      </p>
                    </div>
                  )}

                  <button
                    onClick={() => downloadPrescription(prescription)}
                    className="text-primary hover:underline text-sm font-semibold"
                  >
                    📥 Descargar PDF
                  </button>
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
