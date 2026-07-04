'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import { adminAPI } from '@/utils/api';
import { 
  ArrowLeft,
  User,
  Mail,
  Phone,
  Lock,
  Shield,
  Users,
  Stethoscope,
  UserCheck,
  Building2,
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff,
  Save
} from 'lucide-react';

export default function AdminCreateUserPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
    role: 'patient',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError('');
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Shield className="w-5 h-5" />;
      case 'doctor': return <Stethoscope className="w-5 h-5" />;
      case 'patient': return <UserCheck className="w-5 h-5" />;
      case 'secretary': return <Building2 className="w-5 h-5" />;
      default: return <Users className="w-5 h-5" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'doctor': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'patient': return 'bg-green-100 text-green-700 border-green-200';
      case 'secretary': return 'bg-orange-100 text-orange-700 border-orange-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getRoleName = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'doctor': return 'Médico';
      case 'patient': return 'Paciente';
      case 'secretary': return 'Secretaria';
      default: return role;
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    // Validaciones
    if (form.password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      setLoading(false);
      return;
    }

    try {
      await adminAPI.createUser({
        email: form.email,
        password: form.password,
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone,
        role: form.role,
      });
      
      setSuccess('Usuario creado exitosamente');
      setTimeout(() => {
        router.push('/admin/users');
      }, 1500);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'No se pudo crear el usuario.');
    } finally {
      setLoading(false);
    }
  };

  const roles = [
    { value: 'patient', label: 'Paciente', icon: UserCheck, color: 'bg-green-100 text-green-700 border-green-200' },
    { value: 'doctor', label: 'Médico', icon: Stethoscope, color: 'bg-blue-100 text-blue-700 border-blue-200' },
    { value: 'secretary', label: 'Secretaria', icon: Building2, color: 'bg-orange-100 text-orange-700 border-orange-200' },
    { value: 'admin', label: 'Administrador', icon: Shield, color: 'bg-purple-100 text-purple-700 border-purple-200' },
  ];

  return (
    <ProtectedRoute requiredRole="admin">
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-8">
        <div className="max-w-2xl mx-auto px-4">
          {/* Header */}
          <div className="mb-8">
            <Link
              href="/admin/users"
              className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium">Volver a Usuarios</span>
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Crear Nuevo Usuario</h1>
            <p className="text-gray-500">
              Agrega un nuevo usuario al sistema con el rol correspondiente
            </p>
          </div>

          {/* Mensajes */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}
          {success && (
            <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl flex items-center gap-2">
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm">{success}</p>
            </div>
          )}

          {/* Formulario */}
          <form onSubmit={handleSubmit}>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 space-y-6">
              {/* Información Personal */}
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-600" />
                  Información Personal
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={form.firstName}
                        onChange={(e) => handleChange('firstName', e.target.value)}
                        placeholder="Juan"
                        required
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Apellido <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={form.lastName}
                        onChange={(e) => handleChange('lastName', e.target.value)}
                        placeholder="Pérez"
                        required
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Información de Contacto */}
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Mail className="w-5 h-5 text-blue-600" />
                  Información de Contacto
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => handleChange('email', e.target.value)}
                        placeholder="correo@ejemplo.com"
                        required
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Teléfono
                    </label>
                    <div className="relative">
                      <Phone className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={form.phone}
                        onChange={(e) => handleChange('phone', e.target.value)}
                        placeholder="+1 809 123 4567"
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Rol de Usuario */}
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-blue-600" />
                  Rol de Usuario
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {roles.map((role) => {
                    const Icon = role.icon;
                    return (
                      <button
                        key={role.value}
                        type="button"
                        onClick={() => handleChange('role', role.value)}
                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                          form.role === role.value
                            ? `${role.color} border-current`
                            : 'border-gray-200 text-gray-400 hover:border-gray-300'
                        }`}
                      >
                        <Icon className="w-6 h-6" />
                        <span className="text-sm font-medium">{role.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Seguridad */}
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Lock className="w-5 h-5 text-blue-600" />
                  Seguridad
                </h2>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contraseña <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={(e) => handleChange('password', e.target.value)}
                      placeholder="Mínimo 8 caracteres"
                      required
                      className="w-full pl-10 pr-12 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    La contraseña debe tener al menos 8 caracteres
                  </p>
                </div>
              </div>

              {/* Vista previa del rol seleccionado */}
              <div className={`p-4 rounded-xl border ${getRoleColor(form.role)}`}>
                <div className="flex items-center gap-2">
                  {getRoleIcon(form.role)}
                  <span className="font-medium">
                    Se creará un usuario con rol: {getRoleName(form.role)}
                  </span>
                </div>
              </div>

              {/* Botones */}
              <div className="flex items-center justify-between gap-3 pt-4 border-t border-gray-100">
                <Link
                  href="/admin/users"
                  className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </Link>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-2.5 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Creando...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      Crear Usuario
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </ProtectedRoute>
  );
}