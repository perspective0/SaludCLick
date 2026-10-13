'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { authAPI, saveToken } from '@/utils/api';
import { useAuthStore } from '@/store';
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight,
  AlertCircle,
  Shield,
  Users,
  Stethoscope,
  CheckCircle,
  LogIn
} from 'lucide-react';

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50" />}>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setUser = useAuthStore((state) => state.setUser);
  const redirect = searchParams.get('redirect');
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const googleStatus = searchParams.get('google');
    if (googleStatus === 'error') {
      setError(searchParams.get('message') || 'No se pudo iniciar sesión con Google.');
      return;
    }
    if (googleStatus !== 'success') return;

    const googleToken = searchParams.get('token');
    if (googleToken) saveToken(googleToken);

    let active = true;
    authAPI.me().then((response) => {
      if (!active || !response.data) return;
      const user = {
        id: response.data.id,
        email: response.data.email,
        firstName: response.data.first_name || response.data.firstName,
        lastName: response.data.last_name || response.data.lastName,
        role: response.data.role,
        avatar: response.data.avatar,
      };
      setUser(user);
      localStorage.setItem('user', JSON.stringify(user));
      const role = user.role;
      const redirectUrl = redirect && redirect.startsWith('/') ? redirect : role === 'doctor' ? '/doctor/dashboard' : role === 'admin' ? '/admin/dashboard' : role === 'secretary' ? '/secretary/dashboard' : '/patient/dashboard';
      router.replace(redirectUrl);
    }).catch(() => {
      if (active) setError('La cuenta de Google se autenticó, pero no se pudo cargar el perfil.');
    });
    return () => { active = false; };
  }, [redirect, router, searchParams]);

  const handleGoogleLogin = () => {
    const currentRedirect = redirect && redirect.startsWith('/') ? redirect : '';
    window.location.assign(authAPI.googleLoginUrl(currentRedirect));
  };

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
      // Validaciones básicas
      if (!formData.email || !formData.password) {
        setError('Por favor completa todos los campos');
        setLoading(false);
        return;
      }

      const data = await authAPI.login(formData.email, formData.password);
      
      if (data.data?.user) {
        setUser(data.data.user);
        if (data.data.token) {
          saveToken(data.data.token);
        } else {
          localStorage.removeItem('token');
        }
        localStorage.setItem('user', JSON.stringify(data.data.user));
        
        // Si "Recuérdame" está activado, guardar el email
        if (formData.rememberMe) {
          localStorage.setItem('rememberedEmail', formData.email);
        } else {
          localStorage.removeItem('rememberedEmail');
        }
      }
      
      // Redirect based on user role
      const role = data.data?.user?.role;
      const redirectUrl = redirect && redirect.startsWith('/')
        ? redirect
        :
        role === 'doctor' ? '/doctor/dashboard' :
        role === 'admin' ? '/admin/dashboard' :
        role === 'patient' ? '/patient/dashboard' :
        role === 'secretary' ? '/secretary/dashboard' :
        '/dashboard';
      router.push(redirectUrl);
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 flex">
      {/* Panel izquierdo - Decorativo */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 to-cyan-600 p-12 relative overflow-hidden">
        {/* Círculos decorativos */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2"></div>
        <div className="absolute top-1/2 left-1/2 w-48 h-48 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2"></div>

        <div className="relative z-10 flex flex-col justify-center text-white max-w-md">
          <Link href="/" className="mb-12">
            <Image
              src="/saludclick.png"
              alt="SaludClick"
              width={200}
              height={80}
              priority
              className="h-16 w-auto brightness-0 invert"
            />
          </Link>

          <h1 className="text-4xl font-bold mb-6">
            Bienvenido de vuelta
          </h1>
          
          <p className="text-lg text-blue-100 mb-8 leading-relaxed">
            Accede a tu cuenta para gestionar tus citas médicas, consultar tu historial 
            y conectarte con profesionales de la salud.
          </p>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-blue-200" />
              <span>Acceso seguro a tu historial médico</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-blue-200" />
              <span>Gestiona tus citas en un solo lugar</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-blue-200" />
              <span>Conecta con +500 profesionales verificados</span>
            </div>
          </div>

          <div className="mt-12 flex items-center gap-4 text-sm text-blue-200">
            <Shield className="w-4 h-4" />
              <span>Protegido con encriptación AES-256 y SSL/TLS</span>
          </div>
        </div>
      </div>

      {/* Panel derecho - Formulario */}
      <div className="flex-1 flex items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-md">
          {/* Logo móvil */}
          <div className="lg:hidden mb-8 text-center">
            <Link href="/">
              <Image
                src="/saludclick.png"
                alt="SaludClick"
                width={160}
                height={60}
                priority
                className="h-12 w-auto mx-auto"
              />
            </Link>
          </div>

          {/* Formulario */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-6">
              <div className="inline-flex p-3 bg-blue-100 rounded-full mb-4">
                <LogIn className="w-6 h-6 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Iniciar Sesión</h2>
              <p className="text-gray-600 mt-1">
                Ingresa tus credenciales para acceder
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <Mail className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    name="email"
                    autoComplete="username"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder="correo@ejemplo.com"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    autoComplete="current-password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    placeholder="••••••••"
                    className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <label className="flex items-center cursor-pointer group">
                  <input
                    type="checkbox"
                    name="rememberMe"
                    checked={formData.rememberMe}
                    onChange={handleChange}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-600 group-hover:text-gray-900 transition-colors">
                    Recuérdame
                  </span>
                </label>
                <Link 
                  href="/forgot-password" 
                  className="text-sm text-blue-600 hover:underline font-medium"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-3 rounded-xl font-semibold hover:shadow-lg hover:scale-[1.02] transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Iniciando sesión...
                  </>
                ) : (
                  <>
                    Iniciar Sesión
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
              <div className="relative flex justify-center"><span className="bg-white px-3 text-sm text-gray-500">o continúa con</span></div>
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 rounded-xl border border-gray-300 bg-white py-3 font-semibold text-gray-700 transition hover:bg-gray-50 hover:border-gray-400"
            >
              <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M21.35 12.27c0-.72-.06-1.42-.18-2.09H12v3.96h5.24a4.48 4.48 0 0 1-1.95 2.94v2.45h3.15c1.84-1.7 2.91-4.2 2.91-7.26Z" />
                <path fill="#34A853" d="M12 21.7c2.63 0 4.84-.87 6.45-2.37l-3.15-2.45c-.87.58-1.98.92-3.3.92-2.54 0-4.7-1.72-5.47-4.03H3.28v2.53A9.74 9.74 0 0 0 12 21.7Z" />
                <path fill="#FBBC05" d="M6.53 13.77A5.85 5.85 0 0 1 6.22 12c0-.62.11-1.22.31-1.77V7.7H3.28A9.74 9.74 0 0 0 2.25 12c0 1.57.38 3.05 1.03 4.3l3.25-2.53Z" />
                <path fill="#EA4335" d="M12 6.2c1.43 0 2.72.49 3.73 1.46l2.8-2.8C16.84 3.27 14.63 2.3 12 2.3a9.74 9.74 0 0 0-8.72 5.4l3.25 2.53C7.3 7.92 9.46 6.2 12 6.2Z" />
              </svg>
              Continuar con Google
            </button>

            <div className="mt-6 text-center">
              <p className="text-gray-600">
                ¿No tienes cuenta?{' '}
                <Link href={redirect ? `/register?type=patient&redirect=${encodeURIComponent(redirect)}` : '/register'} className="text-blue-600 hover:underline font-semibold">
                  Regístrate aquí
                </Link>
              </p>
            </div>

            {/* Opciones de registro rápido */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-500 text-center mb-4">
                ¿Eres nuevo? Regístrate como:
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Link
                  href={redirect ? `/register?type=patient&redirect=${encodeURIComponent(redirect)}` : '/register?type=patient'}
                  className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-blue-200 text-blue-600 rounded-xl hover:bg-blue-50 hover:border-blue-300 transition-all group"
                >
                  <Users className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  <span className="font-medium text-sm">Paciente</span>
                </Link>
                <Link
                  href="/register?type=doctor"
                  className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-cyan-200 text-cyan-600 rounded-xl hover:bg-cyan-50 hover:border-cyan-300 transition-all group"
                >
                  <Stethoscope className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  <span className="font-medium text-sm">Médico</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Footer del formulario */}
          <div className="mt-6 text-center text-sm text-gray-500">
            <div className="flex items-center justify-center gap-2">
              <Shield className="w-4 h-4" />
                <span>Conexión segura mediante SSL/TLS</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
