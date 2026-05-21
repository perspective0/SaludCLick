'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
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
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/auth/login`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Credenciales inválidas');
      }

      const data = await response.json();
      
      // Store token in localStorage
      if (data.data?.token) {
        localStorage.setItem('token', data.data.token);
        localStorage.setItem('user', JSON.stringify(data.data.user));
      }
      
      // Redirect based on user role
      const redirectUrl = data.data?.user?.role === 'doctor' ? '/doctor/dashboard' : '/dashboard';
      router.push(redirectUrl);
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-light py-12">
      <div className="container-main">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold mb-6 text-center">Iniciar Sesión</h1>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Correo electrónico</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-primary"
                placeholder="tu@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Contraseña</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-primary"
                placeholder="••••••••"
              />
            </div>

            <div className="flex justify-between items-center">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="rememberMe"
                  checked={formData.rememberMe}
                  onChange={handleChange}
                  className="mr-2"
                />
                <span className="text-sm text-gray-600">Recuérdame</span>
              </label>
              <Link href="/forgot-password" className="text-sm text-primary hover:underline">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary disabled:opacity-50"
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </button>
          </form>

          <p className="text-center mt-6 text-gray-600">
            ¿No tienes cuenta?{' '}
            <Link href="/register" className="text-primary hover:underline font-semibold">
              Crea una aquí
            </Link>
          </p>

          <div className="mt-6 space-y-3">
            <p className="text-sm text-gray-600 text-center font-semibold">Registrarse como:</p>
            <Link
              href="/register?type=patient"
              className="w-full block text-center px-4 py-2 border-2 border-secondary text-secondary rounded-lg hover:bg-secondary hover:text-white transition"
            >
              Paciente
            </Link>
            <Link
              href="/register?type=doctor"
              className="w-full block text-center px-4 py-2 border-2 border-primary text-primary rounded-lg hover:bg-primary hover:text-white transition"
            >
              Médico
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
