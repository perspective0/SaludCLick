'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import NotificationBell from '@/components/NotificationBell';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { adminAPI } from '@/utils/api';
import { 
  Building2, 
  Search, 
  Plus, 
  MapPin,
  Phone,
  Mail,
  Calendar,
  Shield,
  Users,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  Home,
  Stethoscope,
  RefreshCw,
  Eye,
  ChevronLeft,
  ChevronRight,
  Edit,
  Trash2,
  AlertCircle,
  CheckCircle,
  Clock,
  Hospital,
  Beaker
} from 'lucide-react';

type CenterItem = {
  id: string;
  name: string;
  city: string;
  address?: string;
  state?: string;
  postal_code?: string;
  phone?: string;
  email?: string;
  image?: string;
  description?: string;
  created_at: string;
  total_doctors?: number;
  total_appointments?: number;
  is_active?: boolean;
};

function CenterAvatar({
  center,
  sizeClass = 'w-12 h-12',
  iconClass = 'w-6 h-6',
}: {
  center: Pick<CenterItem, 'name' | 'image'>;
  sizeClass?: string;
  iconClass?: string;
}) {
  const [imageError, setImageError] = useState(false);
  const showImage = Boolean(center.image && !imageError);

  return (
    <div className={`${sizeClass} bg-gradient-to-br from-blue-100 to-cyan-100 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden`}>
      {showImage ? (
        <img
          src={center.image}
          alt={`Foto de ${center.name}`}
          className="w-full h-full object-cover"
          onError={() => setImageError(true)}
        />
      ) : (
        <Hospital className={`${iconClass} text-blue-600`} />
      )}
    </div>
  );
}

export default function AdminHealthCentersPage() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [centers, setCenters] = useState<CenterItem[]>([]);
  const [filteredCenters, setFilteredCenters] = useState<CenterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCenter, setSelectedCenter] = useState<CenterItem | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    postal_code: '',
    phone: '',
    email: '',
    image: '',
    description: '',
  });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
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

  useEffect(() => {
    loadCenters();
  }, []);

  useEffect(() => {
    let filtered = centers;
    
    if (searchTerm) {
      filtered = centers.filter(center =>
        center.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        center.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (center.address && center.address.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (center.email && center.email.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    setFilteredCenters(filtered);
    setCurrentPage(1);
  }, [searchTerm, centers]);

  const loadCenters = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await adminAPI.listHealthCenters();
      setCenters(response.data || []);
    } catch (err) {
      console.error(err);
      setError('No se pudieron cargar los centros de salud.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await adminAPI.deleteHealthCenter(id);
      setShowDeleteModal(false);
      setDeleteId(null);
      loadCenters();
    } catch (err) {
      console.error(err);
      setError('No se pudo eliminar el centro de salud.');
    }
  };

  const openEditModal = (center: CenterItem) => {
    setSelectedCenter(center);
    setEditForm({
      name: center.name || '',
      address: center.address || '',
      city: center.city || '',
      state: center.state || '',
      postal_code: center.postal_code || '',
      phone: center.phone || '',
      email: center.email || '',
      image: center.image || '',
      description: center.description || '',
    });
    setShowModal(false);
    setShowEditModal(true);
    setError('');
  };

  const handleUpdate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedCenter) return;

    try {
      const response = await adminAPI.updateHealthCenter(selectedCenter.id, editForm);
      const updatedCenter = response.data || { ...selectedCenter, ...editForm };
      setCenters((prev) =>
        prev.map((center) => (center.id === selectedCenter.id ? { ...center, ...updatedCenter } : center))
      );
      setShowEditModal(false);
      setSelectedCenter(null);
      await loadCenters();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'No se pudo actualizar el centro de salud.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  // Paginación
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredCenters.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredCenters.length / itemsPerPage);

  const stats = {
    total: centers.length,
    active: centers.filter(c => c.is_active !== false).length,
    totalDoctors: centers.reduce((sum, c) => sum + (c.total_doctors || 0), 0),
    totalAppointments: centers.reduce((sum, c) => sum + (c.total_appointments || 0), 0),
  };

  return (
    <ProtectedRoute requiredRole="admin">
      <div className="flex min-h-screen overflow-x-hidden bg-gradient-to-br from-gray-50 to-blue-50">
        {/* Sidebar */}
        <aside className={`fixed inset-y-0 left-0 z-50 w-[min(16rem,86vw)] bg-white shadow-xl transform transition-transform duration-300 lg:w-64 lg:translate-x-0 lg:static lg:inset-auto ${
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
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-blue-50 text-blue-700 font-medium"
              >
                <Building2 className="w-5 h-5" />
                Centros de Salud
              </Link>
              <Link
                href="/admin/laboratories"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <Beaker className="w-5 h-5" />
                Laboratorios
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
        <div className="min-w-0 flex-1 overflow-x-hidden">
          {/* Header */}
          <header className="bg-white shadow-sm sticky top-0 z-30">
            <div className="flex items-center justify-between gap-3 px-4 py-4 md:px-8">
              <div className="flex min-w-0 items-center gap-4">
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
                >
                  {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
                <div className="min-w-0">
                  <h1 className="truncate text-xl md:text-2xl font-bold text-gray-900">
                    Centros de Salud
                  </h1>
                  <p className="truncate text-sm text-gray-500">
                    Administra los centros médicos disponibles
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  onClick={loadCenters}
                  disabled={loading}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <RefreshCw className={`w-5 h-5 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
                </button>
                <NotificationBell />
              </div>
            </div>
          </header>

          <div className="p-4 md:p-8">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <p className="text-xs text-gray-500">Total Centros</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <p className="text-xs text-gray-500">Activos</p>
                <p className="text-2xl font-bold text-green-600">{stats.active}</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <p className="text-xs text-gray-500">Médicos</p>
                <p className="text-2xl font-bold text-blue-600">{stats.totalDoctors}</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <p className="text-xs text-gray-500">Citas médicas totales</p>
                <p className="text-2xl font-bold text-purple-600">{stats.totalAppointments}</p>
              </div>
            </div>

            {/* Barra de búsqueda */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Buscar por nombre, ciudad o dirección..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <Link
                  href="/admin/health-centers/create"
                  className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-white transition-colors hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" />
                  <span className="font-medium">Nuevo Centro</span>
                </Link>
              </div>
            </div>

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                {error}
              </div>
            )}

            {/* Grid de centros */}
            <div className="space-y-4">
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-white rounded-2xl p-6 animate-pulse">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                        <div className="flex-1">
                          <div className="h-5 bg-gray-200 rounded w-2/3 mb-2"></div>
                          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : currentItems.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center">
                  <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-gray-900 mb-2">No hay centros de salud</h3>
                  <p className="text-gray-500">
                    {searchTerm 
                      ? 'No se encontraron centros con los filtros actuales' 
                      : 'Agrega el primer centro de salud al sistema'}
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {currentItems.map((center) => (
                      <div
                        key={center.id}
                        className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all"
                      >
                        <div className="flex items-start gap-4 mb-4">
                          <CenterAvatar center={center} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-lg font-bold text-gray-900 truncate">{center.name}</h3>
                              {center.is_active !== false && (
                                <span className="flex-shrink-0 w-2 h-2 bg-green-500 rounded-full" title="Activo"></span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 text-sm text-gray-500">
                              <MapPin className="w-3.5 h-3.5" />
                              {center.city}
                              {center.address && ` • ${center.address}`}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2 mb-4">
                          {center.phone && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Phone className="w-4 h-4 text-gray-400" />
                              {center.phone}
                            </div>
                          )}
                          {center.email && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Mail className="w-4 h-4 text-gray-400" />
                              {center.email}
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            Creado: {new Date(center.created_at).toLocaleDateString('es-DO')}
                          </div>
                        </div>

                        {(center.total_doctors !== undefined || center.total_appointments !== undefined) && (
                          <div className="flex gap-3 mb-4">
                            {center.total_doctors !== undefined && (
                              <div className="flex-1 bg-blue-50 rounded-lg p-2 text-center">
                                <p className="text-xs text-blue-600 font-medium">{center.total_doctors}</p>
                                <p className="text-xs text-blue-500">Médicos</p>
                              </div>
                            )}
                            {center.total_appointments !== undefined && (
                              <div className="flex-1 bg-green-50 rounded-lg p-2 text-center">
                                <p className="text-xs text-green-600 font-medium">{center.total_appointments}</p>
                                <p className="text-xs text-green-500">Citas médicas</p>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-4">
                          <button
                            onClick={() => {
                              setSelectedCenter(center);
                              setShowModal(true);
                            }}
                            className="flex min-w-[112px] flex-1 items-center justify-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100"
                          >
                            <Eye className="w-4 h-4" />
                            Detalles
                          </button>
                          <button
                            onClick={() => openEditModal(center)}
                            className="flex min-w-[112px] flex-1 items-center justify-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
                          >
                            <Edit className="w-4 h-4" />
                            Editar
                          </button>
                          <button
                            onClick={() => {
                              setDeleteId(center.id);
                              setShowDeleteModal(true);
                            }}
                            className="flex min-w-11 items-center justify-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-100"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Paginación */}
                  {totalPages > 1 && (
                    <div className="bg-white rounded-2xl px-6 py-4 border border-gray-100 flex items-center justify-between">
                      <p className="text-sm text-gray-500">
                        Mostrando {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredCenters.length)} de {filteredCenters.length}
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
        {showModal && selectedCenter && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">Detalles del Centro</h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-4 mb-6">
                  <CenterAvatar center={selectedCenter} sizeClass="w-16 h-16" iconClass="w-8 h-8" />
                  <div>
                    <h4 className="text-xl font-bold text-gray-900">{selectedCenter.name}</h4>
                    <p className="text-sm text-gray-500">{selectedCenter.city}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedCenter.address && (
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-xs text-gray-500 mb-1">Dirección</p>
                      <p className="font-medium">{selectedCenter.address}</p>
                    </div>
                  )}
                  {selectedCenter.phone && (
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-xs text-gray-500 mb-1">Teléfono</p>
                      <p className="font-medium">{selectedCenter.phone}</p>
                    </div>
                  )}
                  {selectedCenter.email && (
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-xs text-gray-500 mb-1">Email</p>
                      <p className="font-medium">{selectedCenter.email}</p>
                    </div>
                  )}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-500 mb-1">Fecha de Registro</p>
                    <p className="font-medium">
                      {new Date(selectedCenter.created_at).toLocaleDateString('es-DO', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                  {selectedCenter.total_doctors !== undefined && (
                    <div className="bg-blue-50 rounded-xl p-4">
                      <p className="text-xs text-blue-600 mb-1">Médicos Asociados</p>
                      <p className="font-bold text-2xl text-blue-700">{selectedCenter.total_doctors}</p>
                    </div>
                  )}
                  {selectedCenter.total_appointments !== undefined && (
                    <div className="bg-green-50 rounded-xl p-4">
                      <p className="text-xs text-green-600 mb-1">Citas médicas realizadas</p>
                      <p className="font-bold text-2xl text-green-700">{selectedCenter.total_appointments}</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => openEditModal(selectedCenter)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors"
                  >
                    <Edit className="w-5 h-5" />
                    Editar Centro
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de edición */}
        {showEditModal && selectedCenter && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Editar Centro de Salud</h3>
                  <p className="text-sm text-gray-500">{selectedCenter.name}</p>
                </div>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedCenter(null);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleUpdate} className="p-6 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre <span className="text-red-500">*</span>
                    </label>
                    <input
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      required
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Dirección <span className="text-red-500">*</span>
                    </label>
                    <input
                      value={editForm.address}
                      onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                      required
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ciudad <span className="text-red-500">*</span>
                    </label>
                    <input
                      value={editForm.city}
                      onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                      required
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Provincia/Estado</label>
                    <input
                      value={editForm.state}
                      onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Código Postal</label>
                    <input
                      value={editForm.postal_code}
                      onChange={(e) => setEditForm({ ...editForm, postal_code: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                    <input
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">URL de Imagen</label>
                    <input
                      value={editForm.image}
                      onChange={(e) => setEditForm({ ...editForm, image: e.target.value })}
                      placeholder="https://ejemplo.com/imagen.jpg"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  {editForm.image && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Vista previa</label>
                      <div className="w-24 h-24 rounded-full overflow-hidden bg-blue-50 border border-blue-100 flex items-center justify-center">
                        <img
                          src={editForm.image}
                          alt="Vista previa del centro"
                          className="w-full h-full object-cover"
                          onError={(event) => {
                            event.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                    </div>
                  )}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                    <textarea
                      value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setSelectedCenter(null);
                    }}
                    className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700"
                  >
                    Guardar cambios
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal de eliminación */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6">
              <div className="text-center mb-6">
                <div className="inline-flex p-3 bg-red-100 rounded-full mb-4">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">¿Eliminar este centro?</h3>
                <p className="text-sm text-gray-500 mt-2">
                  Esta acción no se puede deshacer. Se eliminará el centro de salud y toda su información asociada.
                </p>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteId(null);
                  }}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => deleteId && handleDelete(deleteId)}
                  className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
