'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import NotificationBell from '@/components/NotificationBell';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { adminAPI } from '@/utils/api';
import { getUserGreeting } from '@/utils/helpers';
import { 
  Users, 
  Stethoscope, 
  UserCheck, 
  CalendarCheck, 
  Building2, 
  Clock,
  ArrowRight,
  TrendingUp,
  Activity,
  BarChart3,
  Settings,
  LogOut,
  Search,
  Menu,
  X,
  Home,
  UserPlus,
  Shield,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  FileText,
  CreditCard,
  MessageSquare,
  Beaker
} from 'lucide-react';

// Componente de tarjeta de estadística
function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  gradient, 
  subtitle 
}: { 
  title: string; 
  value: number; 
  icon: any; 
  gradient: string;
  subtitle?: string;
}) {
  return (
    <div className={`${gradient} rounded-2xl p-6 text-white shadow-lg ring-1 ring-white/10 transition-all hover:-translate-y-0.5 hover:shadow-xl`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-sm font-medium opacity-90">{title}</p>
          <p className="text-3xl font-bold mt-1">{value.toLocaleString()}</p>
          {subtitle && (
            <p className="text-xs opacity-75 mt-1">{subtitle}</p>
          )}
        </div>
        <div className="p-3 bg-white/20 rounded-xl">
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}

// Componente de enlace rápido
function QuickLink({ 
  href, 
  icon: Icon, 
  label, 
  badge 
}: { 
  href: string; 
  icon: any; 
  label: string; 
  badge?: number;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 transition-all hover:border-blue-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-900/80 dark:hover:border-blue-400 group"
    >
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
          <Icon className="w-5 h-5 text-blue-600" />
        </div>
        <span className="font-medium text-gray-700 group-hover:text-gray-900">
          {label}
        </span>
      </div>
      <div className="flex items-center gap-3">
        {badge && badge > 0 && (
          <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
            {badge}
          </span>
        )}
        <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
      </div>
    </Link>
  );
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalDoctors: 0,
    totalPatients: 0,
    totalAppointments: 0,
    totalHealthCenters: 0,
    totalLaboratories: 0,
    pendingDoctorRequests: 0,
    todayAppointments: 0,
    activeUsers: 0,
  });
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (error) {
        console.error('Error parsing user:', error);
      }
    }
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      setLoadError('');
      const [statsResponse, activityResponse] = await Promise.all([
        adminAPI.stats(),
        adminAPI.activity(),
      ]);

      setStats(statsResponse.data || stats);
      setRecentActivity(activityResponse.data || []);
      setLastUpdate(new Date().toLocaleTimeString('es-DO'));
    } catch (error: any) {
      console.error('Error loading stats:', error);
      setLoadError(error.message || 'No se pudieron cargar los datos administrativos');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const formatActivityTime = (value?: string) => {
    if (!value) return '';
    return new Date(value).toLocaleString('es-DO');
  };

  return (
    <ProtectedRoute requiredRole="admin">
      <div className="dashboard-shell flex min-h-screen overflow-x-hidden text-gray-950 dark:text-slate-100">
        {/* Sidebar */}
        <aside className={`dashboard-sidebar fixed inset-y-0 left-0 z-50 h-dvh w-[min(16rem,86vw)] transform transition-transform duration-300 lg:w-64 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
          <div className="h-full min-h-0 flex flex-col">
            {/* Logo */}
            <div className="p-4 border-b border-gray-100 shrink-0">
              <Link href="/admin" className="flex items-center gap-2">
                <Shield className="w-7 h-7 text-blue-600" />
                <div>
                  <h1 className="text-base font-bold text-gray-900">SaludClick</h1>
                  <p className="text-xs text-gray-500">Panel Admin</p>
                </div>
              </Link>
            </div>

            {/* Navigation */}
            <nav className="flex-1 min-h-0 p-3 space-y-1 overflow-y-auto">
              <p className="text-[11px] font-semibold text-gray-400 uppercase mb-2 px-2">
                Principal
              </p>
              <Link
                href="/admin"
                className="flex items-center gap-3 px-3 py-2 rounded-xl bg-blue-50 text-blue-700 text-sm font-medium"
              >
                <Home className="w-5 h-5" />
                Dashboard
              </Link>
              <Link
                href="/admin/users"
                className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <Users className="w-5 h-5" />
                Usuarios
              </Link>
              <Link
                href="/admin/doctor-requests"
                className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors relative"
              >
                <Stethoscope className="w-5 h-5" />
                Solicitudes Médicos
                {stats.pendingDoctorRequests > 0 && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {stats.pendingDoctorRequests}
                  </span>
                )}
              </Link>
              <Link
                href="/admin/appointments"
                className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <CalendarCheck className="w-5 h-5" />
                Citas médicas
              </Link>
              <Link
                href="/admin/doctor-payments"
                className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <CreditCard className="w-5 h-5" />
                Pagos Médicos
              </Link>

              <p className="text-[11px] font-semibold text-gray-400 uppercase mb-2 mt-3 px-2">
                Gestión
              </p>
              <Link
                href="/admin/health-centers"
                className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <Building2 className="w-5 h-5" />
                Centros de Salud
              </Link>
              <Link
                href="/admin/laboratories"
                className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <Beaker className="w-5 h-5" />
                Laboratorios
              </Link>
              <Link
                href="/admin/feedback"
                className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <MessageSquare className="w-5 h-5" />
                Preguntas y Recomendaciones
              </Link>
              <Link
                href="/admin/reports"
                className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <BarChart3 className="w-5 h-5" />
                Reportes
              </Link>
              <Link
                href="/admin/settings"
                className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <Settings className="w-5 h-5" />
                Configuración
              </Link>
            </nav>

            {/* User info */}
            <div className="mt-auto p-3 border-t border-gray-100 shrink-0">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-bold">
                  {user?.firstName?.[0] || 'A'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs text-gray-500">Administrador</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Cerrar Sesión
              </button>
            </div>
          </div>
        </aside>

        {/* Overlay para móvil */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Contenido Principal */}
        <div className="flex-1 min-w-0 overflow-x-hidden lg:pl-64">
          {/* Header */}
          <header className="dashboard-header sticky top-0 z-30">
            <div className="px-4 md:px-8 py-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="lg:hidden rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-slate-800"
                >
                  {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
                <div>
                  <h1 className="text-xl md:text-2xl font-bold text-gray-900">
                    {getUserGreeting(user, 'Admin')}
                  </h1>
                  <p className="text-sm text-gray-500">
                    {new Date().toLocaleDateString('es-DO', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Actualizar */}
                <button
                  onClick={loadStats}
                  disabled={loading}
                  className="rounded-lg p-2 transition-colors hover:bg-gray-100 dark:hover:bg-slate-800"
                  title="Actualizar datos"
                >
                  <RefreshCw className={`w-5 h-5 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
                </button>

                <NotificationBell />
              </div>
            </div>
          </header>

          {/* Contenido del Dashboard */}
          <div className="p-4 md:p-8">
            {loadError && (
              <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {loadError}. Vuelve a iniciar sesion si el problema continua.
              </div>
            )}

            {/* Stats Grid */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl p-6 animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-2/3 mb-4"></div>
                    <div className="h-8 bg-gray-200 rounded w-1/3"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatCard
                  title="Usuarios Totales"
                  value={stats.totalUsers}
                  icon={Users}
                  gradient="bg-gradient-to-br from-blue-500 to-blue-600"
                />
                <StatCard
                  title="Médicos"
                  value={stats.totalDoctors}
                  icon={Stethoscope}
                  gradient="bg-gradient-to-br from-purple-500 to-purple-600"
                />
                <StatCard
                  title="Pacientes"
                  value={stats.totalPatients}
                  icon={UserCheck}
                  gradient="bg-gradient-to-br from-green-500 to-green-600"
                />
                <StatCard
                  title="Citas médicas totales"
                  value={stats.totalAppointments}
                  icon={CalendarCheck}
                  gradient="bg-gradient-to-br from-orange-500 to-orange-600"
                />
                <StatCard
                  title="Centros de Salud"
                  value={stats.totalHealthCenters}
                  icon={Building2}
                  gradient="bg-gradient-to-br from-indigo-500 to-indigo-600"
                />
                <StatCard
                  title="Laboratorios"
                  value={stats.totalLaboratories}
                  icon={Beaker}
                  gradient="bg-gradient-to-br from-cyan-500 to-cyan-600"
                />
                <StatCard
                  title="Solicitudes Pendientes"
                  value={stats.pendingDoctorRequests}
                  icon={Clock}
                  gradient="bg-gradient-to-br from-red-500 to-red-600"
                />
                <StatCard
                  title="Citas médicas hoy"
                  value={stats.todayAppointments || 0}
                  icon={Activity}
                  gradient="bg-gradient-to-br from-teal-500 to-teal-600"
                />
                <StatCard
                  title="Usuarios Activos"
                  value={stats.activeUsers || 0}
                  icon={TrendingUp}
                  gradient="bg-gradient-to-br from-pink-500 to-pink-600"
                />
              </div>
            )}

            {/* Última actualización */}
            {lastUpdate && (
              <p className="text-xs text-gray-500 mb-6">
                Última actualización: {lastUpdate}
              </p>
            )}

            {/* Grid de Acciones Rápidas y Actividad */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Acciones Rápidas */}
              <div className="lg:col-span-2">
                <div className="dashboard-panel p-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Settings className="w-5 h-5 text-blue-600" />
                    Gestión Rápida
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <QuickLink
                      href="/admin/doctor-requests"
                      icon={Stethoscope}
                      label="Solicitudes de Médicos"
                      badge={stats.pendingDoctorRequests}
                    />
                    <QuickLink
                      href="/admin/users"
                      icon={Users}
                      label="Gestionar Usuarios"
                    />
                    <QuickLink
                      href="/admin/health-centers"
                      icon={Building2}
                      label="Centros de Salud"
                    />
                    <QuickLink
                      href="/admin/laboratories"
                      icon={Beaker}
                      label="Laboratorios"
                    />
                    <QuickLink
                      href="/admin/appointments"
                      icon={CalendarCheck}
                      label="Ver citas médicas"
                    />
                    <QuickLink
                      href="/admin/doctor-payments"
                      icon={CreditCard}
                      label="Pagos Médicos"
                    />
                    <QuickLink
                      href="/admin/feedback"
                      icon={MessageSquare}
                      label="Preguntas y Recomendaciones"
                    />
                    <QuickLink
                      href="/admin/users/create"
                      icon={UserPlus}
                      label="Crear Usuario"
                    />
                    <QuickLink
                      href="/admin/reports"
                      icon={FileText}
                      label="Generar Reporte"
                    />
                  </div>
                </div>
              </div>

              {/* Actividad Reciente */}
              <div className="dashboard-panel flex h-[420px] flex-col p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2 shrink-0">
                  <Activity className="w-5 h-5 text-blue-600" />
                  Actividad Reciente
                </h2>
                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-2">
                  {recentActivity.length === 0 && (
                    <p className="text-sm text-gray-500">Sin actividad reciente.</p>
                  )}
                  {recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3 pb-3 border-b border-gray-50 last:border-0">
                      <div className={`p-1.5 rounded-full mt-0.5 ${
                        activity.type === 'doctor' ? 'bg-purple-100' :
                        activity.type === 'appointment' ? 'bg-green-100' :
                        activity.type === 'pending' ? 'bg-red-100' :
                        'bg-blue-100'
                      }`}>
                        {activity.type === 'doctor' && <Stethoscope className="w-3 h-3 text-purple-600" />}
                        {activity.type === 'appointment' && <CalendarCheck className="w-3 h-3 text-green-600" />}
                        {activity.type === 'pending' && <Clock className="w-3 h-3 text-red-600" />}
                        {activity.type === 'system' && <Settings className="w-3 h-3 text-blue-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                        <p className="text-xs text-gray-500">{activity.user}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{formatActivityTime(activity.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
