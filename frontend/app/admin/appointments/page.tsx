'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { adminAPI } from '@/utils/api';
import { formatDoctorName } from '@/utils/names';
import { 
  Calendar,
  Search, 
  Filter, 
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  UserCheck,
  Stethoscope,
  Building2,
  Shield,
  Users,
  BarChart3,
  Settings,
  LogOut,
  Bell,
  Menu,
  X,
  Home,
  RefreshCw,
  Eye,
  ChevronLeft,
  ChevronRight,
  Ban,
  CalendarCheck,
  FileText,
  MessageSquare,
  Phone,
  Mail,
  ArrowUpDown
} from 'lucide-react';

type AppointmentItem = {
  id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  reason_for_visit?: string;
  patient_first_name: string;
  patient_last_name: string;
  patient_email?: string;
  patient_phone?: string;
  doctor_first_name: string;
  doctor_last_name: string;
  doctor_specialty?: string;
  health_center_name: string;
};

export default function AdminAppointmentsPage() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [filteredAppointments, setFilteredAppointments] = useState<AppointmentItem[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentItem | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [serverTotalPages, setServerTotalPages] = useState(1);
  const [sortField, setSortField] = useState('appointment_date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const itemsPerPage = 10;

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
    loadAppointments();
  }, [statusFilter, searchTerm, currentPage]);

  useEffect(() => {
    let filtered = appointments;

    // Ordenamiento
    filtered.sort((a: any, b: any) => {
      if (sortDirection === 'asc') {
        return a[sortField] > b[sortField] ? 1 : -1;
      }
      return a[sortField] < b[sortField] ? 1 : -1;
    });

    setFilteredAppointments(filtered);
  }, [appointments, sortField, sortDirection]);

  const loadAppointments = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(searchTerm ? { search: searchTerm } : {}),
        page: currentPage,
        limit: itemsPerPage,
      };
      const response = await adminAPI.listAppointments(params);
      setAppointments(response.data || []);
      setTotalItems(response.total || 0);
      setServerTotalPages(response.totalPages || 1);
    } catch (err) {
      console.error(err);
      setError('No se pudieron cargar las citas.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await adminAPI.cancelAppointment(id);
      setShowCancelModal(false);
      setCancelId(null);
      loadAppointments();
    } catch (err) {
      console.error(err);
      setError('No se pudo cancelar la cita.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'scheduled': return <Clock className="w-4 h-4" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'cancelled': return <XCircle className="w-4 h-4" />;
      case 'no-show': return <AlertCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'completed': return 'bg-green-100 text-green-700 border-green-200';
      case 'cancelled': return 'bg-red-100 text-red-700 border-red-200';
      case 'no-show': return 'bg-orange-100 text-orange-700 border-orange-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusName = (status: string) => {
    switch (status) {
      case 'scheduled': return 'Programada';
      case 'completed': return 'Completada';
      case 'cancelled': return 'Cancelada';
      case 'no-show': return 'No asistió';
      default: return status;
    }
  };

  // Paginación
  const indexOfFirstItem = (currentPage - 1) * itemsPerPage;
  const indexOfLastItem = indexOfFirstItem + filteredAppointments.length;
  const currentItems = filteredAppointments;
  const totalPages = serverTotalPages;

  const stats = {
    total: totalItems,
    scheduled: appointments.filter(a => a.status === 'scheduled').length,
    completed: appointments.filter(a => a.status === 'completed').length,
    cancelled: appointments.filter(a => a.status === 'cancelled').length,
    noShow: appointments.filter(a => a.status === 'no-show').length,
  };

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
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-blue-50 text-blue-700 font-medium"
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
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
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
                    Citas médicas del sistema
                  </h1>
                  <p className="text-sm text-gray-500">
                    Supervisa y gestiona todas las citas médicas
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={loadAppointments}
                  disabled={loading}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <RefreshCw className={`w-5 h-5 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <Bell className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>
          </header>

          <div className="p-4 md:p-8">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <p className="text-xs text-gray-500">Total de citas médicas</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <p className="text-xs text-gray-500">Programadas</p>
                <p className="text-2xl font-bold text-blue-600">{stats.scheduled}</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <p className="text-xs text-gray-500">Completadas</p>
                <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <p className="text-xs text-gray-500">Canceladas</p>
                <p className="text-2xl font-bold text-red-600">{stats.cancelled}</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <p className="text-xs text-gray-500">No asistieron</p>
                <p className="text-2xl font-bold text-orange-600">{stats.noShow}</p>
              </div>
            </div>

            {/* Barra de búsqueda y filtros */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Buscar por paciente, doctor o centro..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { value: '', label: 'Todas' },
                    { value: 'scheduled', label: 'Programadas' },
                    { value: 'completed', label: 'Completadas' },
                    { value: 'cancelled', label: 'Canceladas' },
                    { value: 'no-show', label: 'No asistió' },
                  ].map((status) => (
                    <button
                      key={status.value}
                      onClick={() => {
                        setStatusFilter(status.value);
                        setCurrentPage(1);
                      }}
                      className={`px-4 py-2 rounded-lg border transition text-sm font-medium ${
                        statusFilter === status.value
                          ? 'bg-blue-500 text-white border-blue-500'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      {status.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                {error}
              </div>
            )}

            {/* Tabla de citas */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {loading ? (
                <div className="p-8 space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4 animate-pulse">
                      <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                          <th 
                            className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                            onClick={() => handleSort('appointment_date')}
                          >
                            <div className="flex items-center gap-1">
                              Fecha
                              <ArrowUpDown className="w-3 h-3" />
                            </div>
                          </th>
                          <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Hora
                          </th>
                          <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Paciente
                          </th>
                          <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Doctor
                          </th>
                          <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Centro
                          </th>
                          <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Estado
                          </th>
                          <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Acciones
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {currentItems.map((appointment) => (
                          <tr key={appointment.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-gray-400" />
                                <span className="font-medium text-gray-900">
                                  {new Date(appointment.appointment_date).toLocaleDateString('es-DO', {
                                    weekday: 'short',
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric'
                                  })}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-gray-400" />
                                <span className="text-gray-900">{appointment.appointment_time}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                  <UserCheck className="w-4 h-4 text-green-600" />
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900 text-sm">
                                    {appointment.patient_first_name} {appointment.patient_last_name}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                  <Stethoscope className="w-4 h-4 text-blue-600" />
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900 text-sm">
                                    {formatDoctorName(appointment.doctor_first_name, appointment.doctor_last_name)}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Building2 className="w-4 h-4 text-gray-400" />
                                {appointment.health_center_name}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(appointment.status)}`}>
                                {getStatusIcon(appointment.status)}
                                {getStatusName(appointment.status)}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => {
                                    setSelectedAppointment(appointment);
                                    setShowModal(true);
                                  }}
                                  className="p-2 hover:bg-blue-50 rounded-lg text-blue-600 transition-colors"
                                  title="Ver detalles"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                {appointment.status === 'scheduled' && (
                                  <button
                                    onClick={() => {
                                      setCancelId(appointment.id);
                                      setShowCancelModal(true);
                                    }}
                                    className="p-2 hover:bg-red-50 rounded-lg text-red-600 transition-colors"
                                    title="Cancelar cita"
                                  >
                                    <Ban className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                        {currentItems.length === 0 && (
                          <tr>
                            <td colSpan={7} className="px-6 py-12 text-center">
                              <CalendarCheck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                              <p className="text-gray-500 font-medium">No se encontraron citas</p>
                              <p className="text-sm text-gray-400 mt-1">
                                {searchTerm || statusFilter 
                                  ? 'Intenta con otros filtros de búsqueda' 
                                  : 'No hay citas registradas en el sistema'}
                              </p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Paginación */}
                  {totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                      <p className="text-sm text-gray-500">
                        Mostrando {totalItems === 0 ? 0 : indexOfFirstItem + 1}-{Math.min(indexOfLastItem, totalItems)} de {totalItems}
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setCurrentPage(currentPage - 1)}
                          disabled={currentPage === 1}
                          className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        {[...Array(totalPages)].map((_, i) => (
                          <button
                            key={i}
                            onClick={() => setCurrentPage(i + 1)}
                            className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                              currentPage === i + 1
                                ? 'bg-blue-500 text-white'
                                : 'border border-gray-200 hover:bg-gray-50'
                            }`}
                          >
                            {i + 1}
                          </button>
                        ))}
                        <button
                          onClick={() => setCurrentPage(currentPage + 1)}
                          disabled={currentPage === totalPages}
                          className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Modal de detalles */}
        {showModal && selectedAppointment && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">Detalles de la Cita</h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3 mb-6">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(selectedAppointment.status)}`}>
                    {getStatusIcon(selectedAppointment.status)}
                    {getStatusName(selectedAppointment.status)}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-500 mb-1">Fecha</p>
                    <p className="font-medium">
                      {new Date(selectedAppointment.appointment_date).toLocaleDateString('es-DO', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-500 mb-1">Hora</p>
                    <p className="font-medium">{selectedAppointment.appointment_time}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-500 mb-1">Paciente</p>
                    <p className="font-medium">
                      {selectedAppointment.patient_first_name} {selectedAppointment.patient_last_name}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-500 mb-1">Doctor</p>
                    <p className="font-medium">
                      {formatDoctorName(selectedAppointment.doctor_first_name, selectedAppointment.doctor_last_name)}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-500 mb-1">Centro de Salud</p>
                    <p className="font-medium">{selectedAppointment.health_center_name}</p>
                  </div>
                  {selectedAppointment.reason_for_visit && (
                    <div className="bg-gray-50 rounded-xl p-4 md:col-span-2">
                      <p className="text-xs text-gray-500 mb-1">Motivo de Consulta</p>
                      <p className="font-medium">{selectedAppointment.reason_for_visit}</p>
                    </div>
                  )}
                </div>

                {selectedAppointment.status === 'scheduled' && (
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => {
                        setShowModal(false);
                        setCancelId(selectedAppointment.id);
                        setShowCancelModal(true);
                      }}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors"
                    >
                      <Ban className="w-5 h-5" />
                      Cancelar Cita
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal de cancelación */}
        {showCancelModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6">
              <div className="text-center mb-6">
                <div className="inline-flex p-3 bg-red-100 rounded-full mb-4">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">¿Cancelar esta cita?</h3>
                <p className="text-sm text-gray-500 mt-2">
                  Esta acción no se puede deshacer. Se notificará al paciente y al médico sobre la cancelación.
                </p>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowCancelModal(false);
                    setCancelId(null);
                  }}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => cancelId && handleCancel(cancelId)}
                  className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors"
                >
                  Sí, Cancelar Cita
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
