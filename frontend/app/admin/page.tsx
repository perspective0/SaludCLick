'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { appointmentAPI, doctorAPI } from '@/utils/api';
import Link from 'next/link';

export default function AdminPage() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalDoctors: 0,
    totalAppointments: 0,
    totalCenters: 0,
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'doctors' | 'appointments'>('dashboard');

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      // Aquí iría la llamada a endpoints de admin
      setStats({
        totalUsers: 256,
        totalDoctors: 45,
        totalAppointments: 1243,
        totalCenters: 12,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute requiredRole="admin">
      <div className="min-h-screen bg-light py-12">
        <div className="container-main">
          <h1 className="text-4xl font-bold mb-8">Panel Administrativo</h1>

          {/* Tabs */}
          <div className="flex gap-4 mb-8 border-b">
            {(['dashboard', 'doctors', 'appointments'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 font-semibold transition ${
                  activeTab === tab
                    ? 'border-b-2 border-primary text-primary'
                    : 'text-gray-600 hover:text-primary'
                }`}
              >
                {tab === 'dashboard'
                  ? 'Dashboard'
                  : tab === 'doctors'
                  ? 'Médicos'
                  : 'Citas'}
              </button>
            ))}
          </div>

          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="card bg-gradient-to-br from-primary to-blue-600 text-white">
                <h3 className="text-sm font-semibold opacity-90">Usuarios</h3>
                <p className="text-3xl font-bold">{stats.totalUsers}</p>
              </div>
              <div className="card bg-gradient-to-br from-secondary to-green-600 text-white">
                <h3 className="text-sm font-semibold opacity-90">Médicos</h3>
                <p className="text-3xl font-bold">{stats.totalDoctors}</p>
              </div>
              <div className="card bg-gradient-to-br from-accent to-red-600 text-white">
                <h3 className="text-sm font-semibold opacity-90">Citas</h3>
                <p className="text-3xl font-bold">{stats.totalAppointments}</p>
              </div>
              <div className="card bg-gradient-to-br from-purple-500 to-pink-600 text-white">
                <h3 className="text-sm font-semibold opacity-90">Centros</h3>
                <p className="text-3xl font-bold">{stats.totalCenters}</p>
              </div>
            </div>
          )}

          {/* Doctors Tab */}
          {activeTab === 'doctors' && (
            <div className="card">
              <h2 className="text-2xl font-bold mb-6">Gestionar Médicos</h2>
              <p className="text-gray-600">Funcionalidad en desarrollo</p>
            </div>
          )}

          {/* Appointments Tab */}
          {activeTab === 'appointments' && (
            <div className="card">
              <h2 className="text-2xl font-bold mb-6">Gestionar Citas</h2>
              <p className="text-gray-600">Funcionalidad en desarrollo</p>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
