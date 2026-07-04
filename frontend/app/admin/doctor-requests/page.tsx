'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { adminAPI } from '@/utils/api';
import { 
  Stethoscope, 
  Search, 
  Filter, 
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  Mail,
  Phone,
  Building2,
  FileText,
  Shield,
  Users,
  BarChart3,
  Settings,
  LogOut,
  Bell,
  Menu,
  X,
  Home,
  Calendar,
  RefreshCw,
  Eye,
  MessageSquare,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Ban,
  BadgeCheck
} from 'lucide-react';

type RequestItem = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  clinic?: string;
  document_number?: string;
  id_front_image?: string;
  id_back_image?: string;
  exequatur_image?: string;
  specialty_proof_image?: string;
  license_number?: string;
  exequatur?: string;
  specialty?: string;
  verification_status?: 'verified' | 'pending_review' | 'rejected';
  verification_score?: number;
  verification_source?: string;
  verification_message?: string;
  verification_checked_at?: string;
  manual_verification_status?: 'approved' | 'rejected';
  manual_verification_notes?: string;
  message?: string;
  status?: string;
  created_at?: string;
  especialidad?: string;
};

export default function AdminDoctorRequestsPage() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [items, setItems] = useState<RequestItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<RequestItem | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [adminMessage, setAdminMessage] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
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

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const data = await adminAPI.listDoctorRequests();
      setItems(data.data || []);
    } catch (error) {
      console.error('Error fetching requests:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  useEffect(() => {
    let filtered = items;
    
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.license_number && item.license_number.includes(searchTerm)) ||
        (item.clinic && item.clinic.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (statusFilter) {
      filtered = filtered.filter(item => item.status === statusFilter);
    }

    setFilteredItems(filtered);
    setCurrentPage(1);
  }, [searchTerm, statusFilter, items]);

  const approve = async (id: string) => {
    try {
      setAdminMessage('');
      await adminAPI.approveDoctorRequest(id);
      fetchRequests();
      setShowModal(false);
    } catch (error: any) {
      console.error('Error approving request:', error);
      setAdminMessage(error.message || 'No se pudo aprobar la solicitud');
    }
  };

  const revalidateRequest = async (id: string) => {
    try {
      setAdminMessage('');
      await adminAPI.verifyDoctorRequest(id);
      await fetchRequests();
    } catch (error: any) {
      console.error('Error validating request:', error);
      setAdminMessage(error.message || 'No se pudo revalidar la solicitud');
    }
  };

  const reviewVerification = async (id: string, status: 'approved' | 'rejected') => {
    try {
      setAdminMessage('');
      const notes = window.prompt(
        status === 'approved'
          ? 'Nota de aprobación manual de exequatur y documentos'
          : 'Motivo para rechazar la validación'
      );
      await adminAPI.reviewDoctorVerification(id, { status, notes: notes || undefined });
      await fetchRequests();
    } catch (error: any) {
      console.error('Error reviewing verification:', error);
      setAdminMessage(error.message || 'No se pudo actualizar la revisión');
    }
  };

  const reject = async (id: string) => {
    try {
      await adminAPI.rejectDoctorRequest(id, rejectReason);
      fetchRequests();
      setShowRejectModal(false);
      setRejectId(null);
      setRejectReason('');
    } catch (error) {
      console.error('Error rejecting request:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'rejected': return <XCircle className="w-5 h-5 text-red-500" />;
      case 'pending': return <Clock className="w-5 h-5 text-yellow-500" />;
      default: return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-700 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-700 border-red-200';
      case 'pending': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusName = (status: string) => {
    switch (status) {
      case 'approved': return 'Aprobado';
      case 'rejected': return 'Rechazado';
      case 'pending': return 'Pendiente';
      default: return 'Pendiente';
    }
  };

  const getVerificationName = (item: RequestItem) => {
    if (item.manual_verification_status === 'approved') return 'Validado manualmente';
    if (item.manual_verification_status === 'rejected') return 'Revisión rechazada';
    if (item.verification_status === 'verified') return 'Validado';
    if (item.verification_status === 'rejected') return 'No válido';
    return 'Requiere revisión';
  };

  const getVerificationColor = (item: RequestItem) => {
    if (item.manual_verification_status === 'approved' || item.verification_status === 'verified') {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    if (item.manual_verification_status === 'rejected' || item.verification_status === 'rejected') {
      return 'bg-red-50 text-red-700 border-red-200';
    }
    return 'bg-amber-50 text-amber-700 border-amber-200';
  };

  const canApprove = (item: RequestItem) =>
    item.verification_status === 'verified' || item.manual_verification_status === 'approved';

  // Paginación
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredItems.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

  const stats = {
    total: items.length,
    pending: items.filter(i => i.status === 'pending' || !i.status).length,
    approved: items.filter(i => i.status === 'approved').length,
    rejected: items.filter(i => i.status === 'rejected').length,
    needsReview: items.filter(i => i.status !== 'approved' && !canApprove(i)).length,
  };

  return (
    <ProtectedRoute requiredRole="admin">
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex">
        {/* Sidebar */}
        <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl transform transition-transform duration-300 lg:translate-x-0 lg:static lg:inset-auto ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
          <div className="h-full flex flex-col">
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
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-blue-50 text-blue-700 font-medium relative"
              >
                <Stethoscope className="w-5 h-5" />
                Solicitudes Médicos
                {stats.pending > 0 && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {stats.pending}
                  </span>
                )}
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

            <div className="p-4 border-t border-gray-100">
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
        <div className="flex-1 min-w-0">
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
                    Solicitudes de Médicos
                  </h1>
                  <p className="text-sm text-gray-500">
                    Revisa y aprueba las solicitudes de profesionales
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={fetchRequests}
                  disabled={loading}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <RefreshCw className={`w-5 h-5 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative">
                  <Bell className="w-5 h-5 text-gray-600" />
                  {stats.pending > 0 && (
                    <span className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full"></span>
                  )}
                </button>
              </div>
            </div>
          </header>

          <div className="p-4 md:p-8">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <p className="text-xs text-gray-500">Total Solicitudes</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <p className="text-xs text-gray-500">Pendientes</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <p className="text-xs text-gray-500">Aprobadas</p>
                <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <p className="text-xs text-gray-500">Por validar</p>
                <p className="text-2xl font-bold text-amber-600">{stats.needsReview}</p>
              </div>
            </div>

            {adminMessage && (
              <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {adminMessage}
              </div>
            )}

            {/* Barra de búsqueda y filtros */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Buscar por nombre, email, colegiatura..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="flex gap-2">
                  {['', 'pending', 'approved', 'rejected'].map((status) => (
                    <button
                      key={status || 'all'}
                      onClick={() => setStatusFilter(status)}
                      className={`px-4 py-2 rounded-lg border transition text-sm font-medium ${
                        statusFilter === status
                          ? 'bg-blue-500 text-white border-blue-500'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      {status ? getStatusName(status) : 'Todos'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Lista de solicitudes */}
            <div className="space-y-4">
              {loading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="bg-white rounded-2xl p-6 animate-pulse">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                        <div className="flex-1">
                          <div className="h-5 bg-gray-200 rounded w-1/3 mb-2"></div>
                          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                        </div>
                      </div>
                      <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                    </div>
                  ))}
                </div>
              ) : currentItems.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center">
                  <Stethoscope className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-gray-900 mb-2">No hay solicitudes</h3>
                  <p className="text-gray-500">
                    {searchTerm || statusFilter 
                      ? 'No se encontraron solicitudes con los filtros actuales' 
                      : 'No hay solicitudes de médicos pendientes'}
                  </p>
                </div>
              ) : (
                <>
                  {currentItems.map((item) => (
                    <div
                      key={item.id}
                      className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                        {/* Info del médico */}
                        <div className="flex-1">
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-lg font-bold text-blue-600">
                                {item.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                              </span>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="text-lg font-bold text-gray-900">{item.name}</h3>
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(item.status || 'pending')}`}>
                                  {getStatusName(item.status || 'pending')}
                                </span>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <Mail className="w-4 h-4 text-gray-400" />
                                  {item.email}
                                </div>
                                {item.phone && (
                                  <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Phone className="w-4 h-4 text-gray-400" />
                                    {item.phone}
                                  </div>
                                )}
                                {item.license_number && (
                                  <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <FileText className="w-4 h-4 text-gray-400" />
                                    Exequatur: {item.exequatur || item.license_number}
                                  </div>
                                )}
                                <div className="flex items-center gap-2 text-sm">
                                  <BadgeCheck className="w-4 h-4 text-gray-400" />
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getVerificationColor(item)}`}>
                                    {getVerificationName(item)}
                                    {typeof item.verification_score === 'number' ? ` · ${item.verification_score}%` : ''}
                                  </span>
                                </div>
                                {item.clinic && (
                                  <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Building2 className="w-4 h-4 text-gray-400" />
                                    {item.clinic}
                                  </div>
                                )}
                              </div>

                              {item.message && (
                                <div className="mt-3 flex items-start gap-2 text-sm text-gray-500 bg-gray-50 rounded-lg p-3">
                                  <MessageSquare className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                                  <p className="italic">"{item.message}"</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Acciones */}
                        <div className="flex lg:flex-col gap-2 lg:min-w-[140px]">
                          <button
                            onClick={() => revalidateRequest(item.id)}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-50 text-slate-700 rounded-xl hover:bg-slate-100 transition-colors text-sm font-medium"
                          >
                            <RefreshCw className="w-4 h-4" />
                            Revalidar
                          </button>

                          {!canApprove(item) && item.status !== 'approved' && (
                            <button
                              onClick={() => reviewVerification(item.id, 'approved')}
                              className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl hover:bg-emerald-100 transition-colors text-sm font-medium"
                            >
                              <BadgeCheck className="w-4 h-4" />
                              Validar documentos
                            </button>
                          )}

                          <button
                            onClick={() => {
                              setSelectedRequest(item);
                              setShowModal(true);
                            }}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 transition-colors text-sm font-medium"
                          >
                            <Eye className="w-4 h-4" />
                            Detalles
                          </button>
                          
                          {item.status !== 'approved' && (
                            <button
                              onClick={() => approve(item.id)}
                              disabled={!canApprove(item)}
                              className="flex items-center justify-center gap-2 px-4 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <CheckCircle className="w-4 h-4" />
                              Aprobar
                            </button>
                          )}
                          
                          {item.status !== 'rejected' && item.status !== 'approved' && (
                            <button
                              onClick={() => {
                                setRejectId(item.id);
                                setShowRejectModal(true);
                              }}
                              className="flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-xl hover:bg-red-100 transition-colors text-sm font-medium"
                            >
                              <Ban className="w-4 h-4" />
                              Rechazar
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Paginación */}
                  {totalPages > 1 && (
                    <div className="bg-white rounded-2xl px-6 py-4 border border-gray-100 flex items-center justify-between">
                      <p className="text-sm text-gray-500">
                        Mostrando {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredItems.length)} de {filteredItems.length}
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
        {showModal && selectedRequest && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">Detalles de la Solicitud</h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-full flex items-center justify-center">
                    <span className="text-2xl font-bold text-blue-600">
                      {selectedRequest.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-gray-900">{selectedRequest.name}</h4>
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(selectedRequest.status || 'pending')}`}>
                      {getStatusName(selectedRequest.status || 'pending')}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-500 mb-1">Email</p>
                    <p className="font-medium">{selectedRequest.email}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-500 mb-1">Teléfono</p>
                    <p className="font-medium">{selectedRequest.phone || 'No proporcionado'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-500 mb-1">Número de exequatur</p>
                    <p className="font-medium">{selectedRequest.exequatur || selectedRequest.license_number || 'No proporcionado'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-500 mb-1">Cédula / documento</p>
                    <p className="font-medium">{selectedRequest.document_number || 'No proporcionado'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-500 mb-1">Consultorio/Centro</p>
                    <p className="font-medium">{selectedRequest.clinic || 'No proporcionado'}</p>
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-4">
                  <h4 className="mb-3 font-semibold text-gray-900">Documentos adjuntos</h4>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <DocumentLink label="Cédula frontal" value={selectedRequest.id_front_image} />
                    <DocumentLink label="Cédula reverso" value={selectedRequest.id_back_image} />
                    <DocumentLink label="Exequátur" value={selectedRequest.exequatur_image} />
                    <DocumentLink label="Soporte especialidad" value={selectedRequest.specialty_proof_image} />
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">Validación médica</p>
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border ${getVerificationColor(selectedRequest)}`}>
                        {getVerificationName(selectedRequest)}
                        {typeof selectedRequest.verification_score === 'number' ? ` · ${selectedRequest.verification_score}%` : ''}
                      </span>
                      <p className="mt-3 text-sm text-gray-600">
                        {selectedRequest.verification_message || 'Sin resultado de validación registrado.'}
                      </p>
                      {selectedRequest.verification_source && (
                        <a
                          href={selectedRequest.verification_source}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-flex text-sm font-medium text-blue-600 hover:underline"
                        >
                          Ver fuente de consulta
                        </a>
                      )}
                      {selectedRequest.manual_verification_notes && (
                        <p className="mt-2 text-sm text-gray-500">
                          Nota manual: {selectedRequest.manual_verification_notes}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        onClick={() => revalidateRequest(selectedRequest.id)}
                        className="px-3 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm font-medium hover:bg-slate-200"
                      >
                        Revalidar
                      </button>
                      {!canApprove(selectedRequest) && (
                        <button
                          onClick={() => reviewVerification(selectedRequest.id, 'approved')}
                          className="px-3 py-2 rounded-lg bg-emerald-100 text-emerald-700 text-sm font-medium hover:bg-emerald-200"
                        >
                          Aprobar revisión
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {selectedRequest.message && (
                  <div className="bg-blue-50 rounded-xl p-4">
                    <p className="text-xs text-blue-600 mb-1 font-medium">Mensaje del solicitante</p>
                    <p className="text-gray-700 italic">"{selectedRequest.message}"</p>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  {selectedRequest.status !== 'approved' && (
                    <button
                      onClick={() => {
                        approve(selectedRequest.id);
                      }}
                      disabled={!canApprove(selectedRequest)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <CheckCircle className="w-5 h-5" />
                      Aprobar Solicitud
                    </button>
                  )}
                  {selectedRequest.status !== 'rejected' && selectedRequest.status !== 'approved' && (
                    <button
                      onClick={() => {
                        setShowModal(false);
                        setRejectId(selectedRequest.id);
                        setShowRejectModal(true);
                      }}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors"
                    >
                      <Ban className="w-5 h-5" />
                      Rechazar Solicitud
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de rechazo */}
        {showRejectModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6">
              <div className="text-center mb-6">
                <div className="inline-flex p-3 bg-red-100 rounded-full mb-4">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Rechazar Solicitud</h3>
                <p className="text-sm text-gray-500 mt-2">
                  ¿Por qué rechazas esta solicitud? El médico recibirá una notificación con el motivo.
                </p>
              </div>
              
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Ej: Documentación incompleta, colegiatura no verificable..."
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent mb-4"
                rows={3}
              />
              
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectId(null);
                    setRejectReason('');
                  }}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => rejectId && reject(rejectId)}
                  className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors"
                >
                  Rechazar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}

function DocumentLink({ label, value }: { label: string; value?: string }) {
  if (!value) {
    return (
      <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-sm text-gray-500">
        <p className="font-medium text-gray-700">{label}</p>
        <p className="mt-1">No adjunto</p>
      </div>
    );
  }

  return (
    <a
      href={value}
      target="_blank"
      rel="noreferrer"
      className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm text-blue-700 hover:bg-blue-100"
    >
      <p className="font-semibold">{label}</p>
      <p className="mt-1">Abrir imagen</p>
    </a>
  );
}
