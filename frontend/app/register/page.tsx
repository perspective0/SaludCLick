'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userType = searchParams.get('type') || 'patient';

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    acceptTerms: false,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (formData.password !== formData.confirmPassword) {
        setError('Las contraseñas no coinciden');
        setLoading(false);
        return;
      }

      if (!formData.acceptTerms) {
        setError('Debes aceptar los términos y condiciones');
        setLoading(false);
        return;
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/auth/register`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firstName: formData.firstName,
            lastName: formData.lastName,
            email: formData.email,
            password: formData.password,
            phone: formData.phone,
            role: userType,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error en el registro');
      }

      const data = await response.json();

      // Store token if registration includes auto-login
      if (data.data?.token) {
        localStorage.setItem('token', data.data.token);
        localStorage.setItem('user', JSON.stringify(data.data.user));
        router.push('/dashboard');
      } else {
        router.push('/login?registered=true');
      }
    } catch (err: any) {
      setError(err.message || 'Error al registrarse');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-light py-12">
      <div className="container-main">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold mb-2 text-center">Crear Cuenta</h1>
          <p className="text-center text-gray-600 mb-6">
            {userType === 'doctor' ? 'Registrarse como Médico' : 'Registrarse como Paciente'}
          </p>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                name="firstName"
                placeholder="Nombre"
                value={formData.firstName}
                onChange={handleChange}
                required
                className="px-4 py-2 border rounded-lg focus:outline-none focus:border-primary"
              />
              <input
                type="text"
                name="lastName"
                placeholder="Apellido"
                value={formData.lastName}
                onChange={handleChange}
                required
                className="px-4 py-2 border rounded-lg focus:outline-none focus:border-primary"
              />
            </div>

            <input
              type="email"
              name="email"
              placeholder="Correo electrónico"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-primary"
            />

            <input
              type="tel"
              name="phone"
              placeholder="Teléfono"
              value={formData.phone}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-primary"
            />

            <input
              type="password"
              name="password"
              placeholder="Contraseña"
              value={formData.password}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-primary"
            />

            <input
              type="password"
              name="confirmPassword"
              placeholder="Confirmar contraseña"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-primary"
            />

            <label className="flex items-center">
              <input
                type="checkbox"
                name="acceptTerms"
                checked={formData.acceptTerms}
                onChange={handleChange}
                required
                className="mr-2"
              />
              <span className="text-sm text-gray-600">
                Acepto los{' '}
                <Link href="/terms" className="text-primary hover:underline">
                  términos y condiciones
                </Link>
              </span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary disabled:opacity-50"
            >
              {loading ? 'Registrando...' : 'Crear Cuenta'}
            </button>
          </form>

          <p className="text-center mt-4 text-gray-600">
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" className="text-primary hover:underline font-semibold">
              Inicia sesión
            </Link>
          </p>

          <div className="mt-6 text-center">
            {userType === 'patient' ? (
              <p className="text-sm text-gray-600">
                ¿Eres médico?{' '}
                <Link
                  href="/register?type=doctor"
                  className="text-primary hover:underline font-semibold"
                >
                  Registrarse aquí
                </Link>
              </p>
            ) : (
              <p className="text-sm text-gray-600">
                ¿Eres paciente?{' '}
                <Link
                  href="/register?type=patient"
                  className="text-primary hover:underline font-semibold"
                >
                  Registrarse aquí
                </Link>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
