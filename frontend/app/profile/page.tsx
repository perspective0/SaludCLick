'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useRouter } from 'next/navigation';
import { apiRequest } from '@/utils/api';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        setUser(parsed);
        setFormData({
          firstName: parsed.firstName || '',
          lastName: parsed.lastName || '',
          phone: parsed.phone || '',
          email: parsed.email || '',
        });
      } catch (err) {
        console.error('Error parsing user:', err);
      }
    }
    setLoading(false);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const response = await apiRequest(`/profile`, {
        method: 'PUT',
        body: JSON.stringify(formData),
      });

      const updatedUser = { ...user, ...formData };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      setIsEditing(false);
      setSuccess('Perfil actualizado correctamente');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Error al actualizar el perfil');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Cargando...</div>;
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-light py-12">
        <div className="container-main max-w-2xl">
          <h1 className="text-4xl font-bold mb-8">Mi Perfil</h1>

          {success && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
              ✓ {success}
            </div>
          )}

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
              ✗ {error}
            </div>
          )}

          <div className="card">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Información Personal</h2>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className={isEditing ? 'btn-secondary' : 'btn-primary'}
              >
                {isEditing ? 'Cancelar' : 'Editar'}
              </button>
            </div>

            {isEditing ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Nombre</label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-primary"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Apellido</label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-primary"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-primary"
                    disabled
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Teléfono</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-primary"
                  />
                </div>

                <button type="submit" className="btn-primary w-full">
                  Guardar Cambios
                </button>
              </form>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-600 mb-1">Nombre</p>
                    <p className="font-semibold text-lg">{user?.firstName}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 mb-1">Apellido</p>
                    <p className="font-semibold text-lg">{user?.lastName}</p>
                  </div>
                </div>

                <div>
                  <p className="text-gray-600 mb-1">Email</p>
                  <p className="font-semibold text-lg">{user?.email}</p>
                </div>

                <div>
                  <p className="text-gray-600 mb-1">Teléfono</p>
                  <p className="font-semibold text-lg">{user?.phone || 'No especificado'}</p>
                </div>

                <div>
                  <p className="text-gray-600 mb-1">Rol</p>
                  <p className="font-semibold text-lg capitalize">
                    {user?.role === 'patient' ? 'Paciente' : user?.role === 'doctor' ? 'Médico' : user?.role}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
