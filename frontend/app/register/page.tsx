'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  User, 
  Mail, 
  Phone, 
  Lock, 
  Eye, 
  EyeOff, 
  Stethoscope, 
  Users,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Shield,
  UserCheck,
  FileText,
  Building2
} from 'lucide-react';

const especialidades = [
  'Medicina General',
  'Cardiología',
  'Pediatría',
  'Dermatología',
  'Ginecología y Obstetricia',
  'Neurología',
  'Oftalmología',
  'Ortopedia',
  'Psiquiatría',
  'Medicina Interna',
  'Cirugía General',
  'Otorrinolaringología',
  'Urología',
  'Endocrinología',
  'Gastroenterología',
  'Neumología',
  'Reumatología',
  'Oncología',
  'Nefrología',
  'Otra especialidad'
];

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50" />}>
      <RegisterContent />
    </Suspense>
  );
}

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect');
  const [userType, setUserType] = useState('patient');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const t = params.get('type');
      if (t) setUserType(t);
    } catch (err) {
      /* ignore during SSR or if window is not available */
    }
  }, []);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    documentNumber: '',
    especialidad: '',
    exequatur: '',
    clinic: '',
    healthCenterId: '',
    healthCenterMode: 'existing',
    acceptTerms: false,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [healthCenters, setHealthCenters] = useState<any[]>([]);

  useEffect(() => {
    async function loadHealthCenters() {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/doctors/health-centers/list`);
        const data = await response.json();
        setHealthCenters(data?.data || []);
      } catch (err) {
        console.error('Error cargando centros:', err);
      }
    }

    loadHealthCenters();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    });

    // Calcular fortaleza de contraseña
    if (name === 'password') {
      let strength = 0;
      if (value.length >= 8) strength++;
      if (value.match(/[A-Z]/)) strength++;
      if (value.match(/[0-9]/)) strength++;
      if (value.match(/[^A-Za-z0-9]/)) strength++;
      setPasswordStrength(strength);
    }
  };

  const getPasswordStrengthColor = () => {
    switch (passwordStrength) {
      case 1: return 'bg-red-500';
      case 2: return 'bg-orange-500';
      case 3: return 'bg-yellow-500';
      case 4: return 'bg-green-500';
      default: return 'bg-gray-300';
    }
  };

  const getPasswordStrengthText = () => {
    switch (passwordStrength) {
      case 1: return 'Débil';
      case 2: return 'Regular';
      case 3: return 'Buena';
      case 4: return 'Excelente';
      default: return '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validaciones
      if (formData.password !== formData.confirmPassword) {
        setError('Las contraseñas no coinciden');
        setLoading(false);
        return;
      }

      if (formData.password.length < 8) {
        setError('La contraseña debe tener al menos 8 caracteres');
        setLoading(false);
        return;
      }

      if (!formData.acceptTerms) {
        setError('Debes aceptar los términos y condiciones');
        setLoading(false);
        return;
      }

      if (userType === 'doctor' && !formData.especialidad) {
        setError('Debes seleccionar tu especialidad');
        setLoading(false);
        return;
      }

      if (userType === 'doctor' && !formData.exequatur.trim()) {
        setError('Debes indicar tu número de exequatur para validar tu información médica');
        setLoading(false);
        return;
      }

      if (userType === 'doctor' && formData.healthCenterMode === 'existing' && !formData.healthCenterId) {
        setError('Selecciona un centro existente o marca "Otro..." si no aparece');
        setLoading(false);
        return;
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || '/api'}/auth/register`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            firstName: formData.firstName,
            lastName: formData.lastName,
            email: formData.email,
            password: formData.password,
            phone: formData.phone,
            documentNumber: userType === 'patient' ? formData.documentNumber : undefined,
            role: userType,
            ...(userType === 'doctor' && {
              especialidad: formData.especialidad,
              exequatur: formData.exequatur,
              clinic: formData.healthCenterMode === 'other' ? formData.clinic : undefined,
              healthCenterId: formData.healthCenterMode === 'existing' ? formData.healthCenterId : undefined,
              healthCenterMode: formData.healthCenterMode,
            }),
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error en el registro');
      }

      const data = await response.json();

      if (data.data?.user) {
        localStorage.removeItem('token');
        localStorage.setItem('user', JSON.stringify(data.data.user));
        const role = data.data.user?.role;
        const defaultRoute =
          role === 'doctor' ? '/doctor/dashboard' :
          role === 'admin' ? '/admin/dashboard' :
          role === 'secretary' ? '/secretary/dashboard' :
          role === 'patient' ? '/patient/dashboard' :
          '/dashboard';
        router.push(redirect && redirect.startsWith('/') ? redirect : defaultRoute);
      } else {
        // Si es médico, redirigir a página de espera
        if (userType === 'doctor') {
          router.push('/doctor/pending-approval');
        } else {
          router.push(redirect ? `/login?registered=true&redirect=${encodeURIComponent(redirect)}` : '/login?registered=true');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error al registrarse');
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
              src="/SaludClick.png"
              alt="SaludClick"
              width={200}
              height={80}
              priority
              className="h-16 w-auto brightness-0 invert"
            />
          </Link>

          <h1 className="text-4xl font-bold mb-6">
            {userType === 'doctor' ? 'Únete como Profesional de la Salud' : 'Comienza tu Viaje de Salud'}
          </h1>
          
          <p className="text-lg text-blue-100 mb-8 leading-relaxed">
            {userType === 'doctor' 
              ? 'Conecta con pacientes, gestiona tus citas y haz crecer tu práctica médica con nuestra plataforma.'
              : 'Agenda citas médicas, gestiona tu historial y conecta con los mejores profesionales de la salud.'}
          </p>

          <div className="space-y-4">
            {userType === 'patient' ? (
              <>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-blue-200" />
                  <span>Acceso a +500 médicos verificados</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-blue-200" />
                  <span>Agendamiento en segundos</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-blue-200" />
                  <span>Historial médico digital seguro</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-blue-200" />
                  <span>Gestión inteligente de citas</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-blue-200" />
                  <span>Portal profesional personalizado</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-blue-200" />
                  <span>Conecta con nuevos pacientes</span>
                </div>
              </>
            )}
          </div>

          <div className="mt-12 flex items-center gap-4 text-sm text-blue-200">
            <Shield className="w-4 h-4" />
            <span>Tus datos están protegidos con encriptación de grado médico</span>
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
                src="/SaludClick.png"
                alt="SaludClick"
                width={160}
                height={60}
                priority
                className="h-12 w-auto mx-auto"
              />
            </Link>
          </div>

          {/* Selector de tipo de usuario */}
          <div className="bg-white rounded-2xl shadow-xl p-1 mb-6 flex">
            <button
              onClick={() => setUserType('patient')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl transition-all ${
                userType === 'patient'
                  ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Users className="w-5 h-5" />
              <span className="font-medium">Paciente</span>
            </button>
            <button
              onClick={() => setUserType('doctor')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl transition-all ${
                userType === 'doctor'
                  ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Stethoscope className="w-5 h-5" />
              <span className="font-medium">Médico</span>
            </button>
          </div>

          {/* Formulario */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-6">
              <div className="inline-flex p-3 bg-blue-100 rounded-full mb-4">
                {userType === 'doctor' ? (
                  <Stethoscope className="w-6 h-6 text-blue-600" />
                ) : (
                  <UserCheck className="w-6 h-6 text-blue-600" />
                )}
              </div>
              <h2 className="text-2xl font-bold text-gray-900">
                {userType === 'doctor' ? 'Registro de Médico' : 'Crear Cuenta'}
              </h2>
              <p className="text-gray-600 mt-1">
                {userType === 'doctor' 
                  ? 'Completa tus datos para unirte a nuestra red' 
                  : 'Regístrate para comenzar a agendar citas'}
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                  <div className="relative">
                    <User className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      name="firstName"
                      placeholder="Juan"
                      value={formData.firstName}
                      onChange={handleChange}
                      required
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Apellido</label>
                  <div className="relative">
                    <User className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      name="lastName"
                      placeholder="Pérez"
                      value={formData.lastName}
                      onChange={handleChange}
                      required
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Correo Electrónico</label>
                <div className="relative">
                  <Mail className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    name="email"
                    placeholder="correo@ejemplo.com"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                <div className="relative">
                  <Phone className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    name="phone"
                    placeholder="+1 809 123 4567"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {userType === 'patient' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cédula</label>
                  <div className="relative">
                    <FileText className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      name="documentNumber"
                      placeholder="000-0000000-0"
                      value={formData.documentNumber}
                      onChange={handleChange}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>
              )}

              {/* Campo de especialidad - Solo para médicos */}
              {userType === 'doctor' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Especialidad</label>
                    <div className="relative">
                      <Stethoscope className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <select
                        name="especialidad"
                        value={formData.especialidad}
                        onChange={handleChange}
                        required
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none bg-white"
                      >
                        <option value="">Selecciona tu especialidad</option>
                        {especialidades.map(esp => (
                          <option key={esp} value={esp}>{esp}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Número de exequatur</label>
                    <div className="relative">
                      <FileText className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        name="exequatur"
                        placeholder="Ej: 123-45"
                        value={formData.exequatur}
                        onChange={handleChange}
                        required
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      />
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      Se validará junto a tu nombre completo usando la fuente oficial del SNS cuando esté disponible.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Centro o clínica</label>
                    <div className="relative">
                      <Building2 className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <select
                        name="healthCenterId"
                        value={formData.healthCenterMode === 'other' ? 'other' : formData.healthCenterId}
                        onChange={(event) => {
                          const value = event.target.value;
                          setFormData({
                            ...formData,
                            healthCenterMode: value === 'other' ? 'other' : 'existing',
                            healthCenterId: value === 'other' ? '' : value,
                            clinic: value === 'other' ? formData.clinic : '',
                          });
                        }}
                        required
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none bg-white"
                      >
                        <option value="">Selecciona un centro</option>
                        {healthCenters.map((center) => (
                          <option key={center.id} value={center.id}>
                            {center.name}{center.city ? ` - ${center.city}` : ''}
                          </option>
                        ))}
                        <option value="other">Otro...</option>
                      </select>
                    </div>
                    {formData.healthCenterMode === 'other' && (
                      <input
                        type="text"
                        name="clinic"
                        placeholder="Nombre del centro o clínica"
                        value={formData.clinic}
                        onChange={handleChange}
                        className="mt-3 w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      />
                    )}
                    <p className="mt-1 text-xs text-gray-500">
                      Si eliges Otro..., al completar tu perfil podrás seleccionar un centro existente o solicitar/crear uno nuevo.
                    </p>
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
                <div className="relative">
                  <Lock className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    placeholder="Mínimo 8 caracteres"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {formData.password && (
                  <div className="mt-2">
                    <div className="flex gap-1 mb-1">
                      {[1, 2, 3, 4].map((level) => (
                        <div
                          key={level}
                          className={`h-1 flex-1 rounded-full ${
                            level <= passwordStrength ? getPasswordStrengthColor() : 'bg-gray-200'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-gray-500">
                      Fortaleza: <span className="font-medium">{getPasswordStrengthText()}</span>
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Contraseña</label>
                <div className="relative">
                  <Lock className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    placeholder="Repite tu contraseña"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  name="acceptTerms"
                  checked={formData.acceptTerms}
                  onChange={handleChange}
                  required
                  className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors">
                  Acepto los{' '}
                  <Link href="/terms" className="text-blue-600 hover:underline font-medium">
                    términos y condiciones
                  </Link>{' '}
                  y la{' '}
                  <Link href="/privacy" className="text-blue-600 hover:underline font-medium">
                    política de privacidad
                  </Link>
                </span>
              </label>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-3 rounded-xl font-semibold hover:shadow-lg hover:scale-[1.02] transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Creando cuenta...
                  </>
                ) : (
                  <>
                    {userType === 'doctor' ? 'Solicitar Acceso' : 'Crear Cuenta'}
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-gray-600">
                ¿Ya tienes cuenta?{' '}
                <Link href={redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : '/login'} className="text-blue-600 hover:underline font-semibold">
                  Iniciar Sesión
                </Link>
              </p>
            </div>
          </div>

          {/* Footer del formulario */}
          <div className="mt-6 text-center text-sm text-gray-500">
            <div className="flex items-center justify-center gap-2">
              <Shield className="w-4 h-4" />
              <span>Protegido por encriptación SSL 256-bit</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
