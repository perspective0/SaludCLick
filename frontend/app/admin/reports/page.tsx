'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { adminAPI } from '@/utils/api';
import { formatDoctorName } from '@/utils/names';
import { 
  Shield,
  Users,
  BarChart3,
  Settings,
  LogOut,
  Bell,
  Menu,
  X,
  Home,
  Stethoscope,
  Building2,
  Calendar,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Award,
  Activity,
  PieChart,
  FileText,
  Download,
  Filter,
  Eye,
  ChevronRight,
  Star,
  UserCheck,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  Zap
} from 'lucide-react';

type ReportStats = {
  users: number;
  doctors: number;
  patients: number;
  secretaries: number;
  appointments: number;
  healthCenters: number;
};

type StatusCount = {
  status: string;
  count: string;
};

type TopItem = {
  id: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  appointment_count: string;
};

// Componente de tarjeta de estadística mejorada
function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  color,
  trend,
  subtitle 
}: { 
  title: string; 
  value: number; 
  icon: any; 
  color: string;
  trend?: 'up' | 'down';
  subtitle?: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-xl ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        {trend && (
          <span className={`flex items-center gap-1 text-xs font-medium ${
            trend === 'up' ? 'text-green-600' : 'text-red-600'
          }`}>
            {trend === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            12%
          </span>
        )}
      </div>
      <p className="text-sm text-gray-500 mb-1">{title}</p>
      <p className="text-3xl font-bold text-gray-900">{value.toLocaleString()}</p>
      {subtitle && (
        <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
      )}
    </div>
  );
}

export default function AdminReportsPage() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [totals, setTotals] = useState<ReportStats | null>(null);
  const [statusCounts, setStatusCounts] = useState<StatusCount[]>([]);
  const [topDoctors, setTopDoctors] = useState<TopItem[]>([]);
  const [topCenters, setTopCenters] = useState<TopItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState<any>(null);
  const [dateRange, setDateRange] = useState('month');

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (error) {
        console.error('Error parsing user:', error);
      }
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [dateRange]);

  const loadReports = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await adminAPI.getReports({ range: dateRange });
      const data = response.data;
      setTotals(data.totals);
      setStatusCounts(data.statusCounts || []);
      setTopDoctors(data.topDoctors || []);
      setTopCenters(data.topCenters || []);
    } catch (err) {
      console.error(err);
      setError('No se pudieron cargar los reportes.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'scheduled': return <Clock className="w-5 h-5" />;
      case 'completed': return <CheckCircle className="w-5 h-5" />;
      case 'cancelled': return <XCircle className="w-5 h-5" />;
      case 'no-show': return <AlertCircle className="w-5 h-5" />;
      default: return <Activity className="w-5 h-5" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'text-blue-600 bg-blue-100';
      case 'completed': return 'text-green-600 bg-green-100';
      case 'cancelled': return 'text-red-600 bg-red-100';
      case 'no-show': return 'text-orange-600 bg-orange-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusName = (status: string) => {
    switch (status) {
      case 'scheduled': return 'Programadas';
      case 'completed': return 'Completadas';
      case 'cancelled': return 'Canceladas';
      case 'no-show': return 'No asistieron';
      default: return status;
    }
  };

  // Calcular totales para porcentajes
  const totalAppointmentsByStatus = statusCounts.reduce(
    (sum, item) => sum + parseInt(item.count), 0
  );

  return (
    <ProtectedRoute requiredRole="admin">
      <div className="flex min-h-screen overflow-x-hidden bg-gradient-to-br from-gray-50 to-blue-50">
        {/* Sidebar */}
        <aside className={`fixed inset-y-0 left-0 z-50 h-dvh w-[min(16rem,86vw)] bg-white shadow-xl transform transition-transform duration-300 lg:w-64 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
          <div className="flex h-full min-h-0 flex-col">
            <div className="p-6 border-b border-gray-100">
              <Link href="/admin" className="flex items-center gap-2">
                <Shield className="w-8 h-8 text-blue-600" />
                <div>
                  <h1 className="text-lg font-bold text-gray-900">SaludClick</h1>
                  <p className="text-xs text-gray-500">Panel Admin</p>
                </div>
              </Link>
            </div>

            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
              <p className="text-xs font-semibold text-gray-400 uppercase mb-3 px-2">
                Principal
              </p>
              <Link
                href="/admin"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <Home className="w-5 h-5" />
                Dashboard
              </Link>
              <Link
                href="/admin/users"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <Users className="w-5 h-5" />
                Usuarios
              </Link>
              <Link
                href="/admin/doctor-requests"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <Stethoscope className="w-5 h-5" />
                Solicitudes Médicos
              </Link>
              <Link
                href="/admin/appointments"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <Calendar className="w-5 h-5" />
                Citas médicas
              </Link>

              <p className="text-xs font-semibold text-gray-400 uppercase mb-3 mt-6 px-2">
                Gestión
              </p>
              <Link
                href="/admin/health-centers"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <Building2 className="w-5 h-5" />
                Centros de Salud
              </Link>
              <Link
                href="/admin/reports"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-blue-50 text-blue-700 font-medium"
              >
                <BarChart3 className="w-5 h-5" />
                Reportes
              </Link>
              <Link
                href="/admin/settings"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <Settings className="w-5 h-5" />
                Configuración
              </Link>
            </nav>

            <div className="mt-auto p-4 border-t border-gray-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-bold">
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

        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Contenido Principal */}
        <div className="flex-1 min-w-0 overflow-x-hidden lg:pl-64">
          {/* Header */}
          <header className="bg-white shadow-sm sticky top-0 z-30">
            <div className="px-4 md:px-8 py-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
                >
                  {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
                <div>
                  <h1 className="text-xl md:text-2xl font-bold text-gray-900">
                    Reportes del Sistema
                  </h1>
                  <p className="text-sm text-gray-500">
                    Métricas y estadísticas de la plataforma
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex bg-gray-100 rounded-lg p-1">
                  {[
                    { value: 'week', label: 'Semana' },
                    { value: 'month', label: 'Mes' },
                    { value: 'year', label: 'Año' },
                  ].map((range) => (
                    <button
                      key={range.value}
                      onClick={() => setDateRange(range.value)}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        dateRange === range.value
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {range.label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={loadReports}
                  disabled={loading}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <RefreshCw className={`w-5 h-5 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <Download className="w-5 h-5 text-gray-600" />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <Bell className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>
          </header>

          <div className="p-4 md:p-8">
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                {error}
              </div>
            )}

            {loading ? (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="bg-white rounded-2xl p-6 animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-2/3 mb-4"></div>
                      <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {[...Array(2)].map((_, i) => (
                    <div key={i} className="bg-white rounded-2xl p-6 animate-pulse">
                      <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                      <div className="space-y-3">
                        {[...Array(4)].map((_, j) => (
                          <div key={j} className="h-12 bg-gray-200 rounded-lg"></div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {/* Stats principales */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                  <StatCard
                    title="Usuarios nuevos"
                    value={totals?.users || 0}
                    icon={Users}
                    color="bg-blue-500"
                    trend="up"
                  />
                  <StatCard
                    title="Médicos nuevos"
                    value={totals?.doctors || 0}
                    icon={Stethoscope}
                    color="bg-purple-500"
                    trend="up"
                  />
                  <StatCard
                    title="Pacientes nuevos"
                    value={totals?.patients || 0}
                    icon={UserCheck}
                    color="bg-green-500"
                    trend="up"
                  />
                  <StatCard
                    title="Secretarias nuevas"
                    value={totals?.secretaries || 0}
                    icon={Users}
                    color="bg-orange-500"
                  />
                  <StatCard
                    title="Citas médicas"
                    value={totals?.appointments || 0}
                    icon={Calendar}
                    color="bg-cyan-500"
                    trend="up"
                  />
                  <StatCard
                    title="Centros nuevos"
                    value={totals?.healthCenters || 0}
                    icon={Building2}
                    color="bg-indigo-500"
                  />
                </div>

                {/* Grid de reportes */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  {/* Estado de citas */}
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <PieChart className="w-5 h-5 text-blue-600" />
                        Estado de citas médicas
                      </h2>
                      <span className="text-sm text-gray-500">
                        Total: {totalAppointmentsByStatus}
                      </span>
                    </div>
                    
                    {statusCounts.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Activity className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        No hay datos de estados
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {statusCounts.map((item) => {
                          const percentage = totalAppointmentsByStatus > 0
                            ? ((parseInt(item.count) / totalAppointmentsByStatus) * 100).toFixed(1)
                            : '0';
                          
                          return (
                            <div key={item.status} className="space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className={`p-1.5 rounded-lg ${getStatusColor(item.status)}`}>
                                    {getStatusIcon(item.status)}
                                  </div>
                                  <span className="font-medium text-gray-700">
                                    {getStatusName(item.status)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-sm font-bold text-gray-900">{item.count}</span>
                                  <span className="text-xs text-gray-500 w-12 text-right">{percentage}%</span>
                                </div>
                              </div>
                              <div className="w-full bg-gray-100 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full ${
                                    item.status === 'scheduled' ? 'bg-blue-500' :
                                    item.status === 'completed' ? 'bg-green-500' :
                                    item.status === 'cancelled' ? 'bg-red-500' :
                                    'bg-orange-500'
                                  }`}
                                  style={{ width: `${percentage}%` }}
                                ></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Top Doctores */}
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <Award className="w-5 h-5 text-yellow-500" />
                        Top Doctores
                      </h2>
                      <span className="text-sm text-gray-500">Más citas</span>
                    </div>

                    {topDoctors.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Stethoscope className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        No hay datos de doctores
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {topDoctors.map((doctor, index) => (
                          <div
                            key={doctor.id}
                            className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                          >
                            <div className="relative">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                index === 0 ? 'bg-yellow-100' :
                                index === 1 ? 'bg-gray-100' :
                                index === 2 ? 'bg-orange-100' :
                                'bg-blue-50'
                              }`}>
                                <span className={`font-bold ${
                                  index === 0 ? 'text-yellow-600' :
                                  index === 1 ? 'text-gray-600' :
                                  index === 2 ? 'text-orange-600' :
                                  'text-blue-600'
                                }`}>
                                  {doctor.first_name?.[0]}{doctor.last_name?.[0]}
                                </span>
                              </div>
                              {index < 3 && (
                                <span className={`absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                                  index === 0 ? 'bg-yellow-500' :
                                  index === 1 ? 'bg-gray-400' :
                                  'bg-orange-500'
                                }`}>
                                  {index + 1}
                                </span>
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">
                                {formatDoctorName(doctor.first_name, doctor.last_name)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-gray-900">{doctor.appointment_count}</p>
                              <p className="text-xs text-gray-500">citas</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Top Centros */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-blue-600" />
                      Centros con más citas médicas
                    </h2>
                    <Link
                      href="/admin/health-centers"
                      className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                    >
                      Ver todos
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>

                  {topCenters.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      No hay datos de centros
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {topCenters.map((center, index) => (
                        <div
                          key={center.id}
                          className="p-4 rounded-xl border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all"
                        >
                          <div className="flex items-center gap-3 mb-3">
                            <div className={`p-2 rounded-lg ${
                              index === 0 ? 'bg-yellow-100' :
                              index === 1 ? 'bg-gray-100' :
                              index === 2 ? 'bg-orange-100' :
                              'bg-blue-50'
                            }`}>
                              <Building2 className={`w-5 h-5 ${
                                index === 0 ? 'text-yellow-600' :
                                index === 1 ? 'text-gray-600' :
                                index === 2 ? 'text-orange-600' :
                                'text-blue-600'
                              }`} />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{center.name}</p>
                            </div>
                          </div>
                          <div className="flex items-end justify-between">
                            <div>
                              <p className="text-2xl font-bold text-gray-900">{center.appointment_count}</p>
                              <p className="text-xs text-gray-500">citas totales</p>
                            </div>
                            {index < 3 && (
                              <Star className={`w-5 h-5 ${
                                index === 0 ? 'text-yellow-500' :
                                index === 1 ? 'text-gray-400' :
                                'text-orange-500'
                              }`} />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
