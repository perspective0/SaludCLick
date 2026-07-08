'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { feedbackAPI } from '@/utils/api';
import {
  AlertCircle,
  Archive,
  BarChart3,
  Bell,
  Building2,
  Calendar,
  CheckCircle,
  DollarSign,
  Home,
  Lightbulb,
  LogOut,
  Menu,
  MessageSquare,
  RefreshCw,
  Save,
  Search,
  Settings,
  Shield,
  Stethoscope,
  Users,
  X,
} from 'lucide-react';

type FeedbackItem = {
  id: string;
  type: 'question' | 'recommendation';
  audience: string;
  subject: string;
  message: string;
  status: 'new' | 'reviewing' | 'resolved' | 'archived';
  admin_response?: string;
  created_at: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  role?: string;
};

const typeLabels = {
  question: 'Pregunta',
  recommendation: 'Recomendación',
};

const statusLabels = {
  new: 'Nuevo',
  reviewing: 'En revisión',
  resolved: 'Resuelto',
  archived: 'Archivado',
};

export default function AdminFeedbackPage() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [summary, setSummary] = useState({ total: 0, question: 0, recommendation: 0, new: 0, reviewing: 0, resolved: 0, archived: 0 });
  const [filters, setFilters] = useState({ type: '', status: '', audience: '' });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<FeedbackItem | null>(null);
  const [form, setForm] = useState({ status: 'reviewing', adminResponse: '' });

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (err) {
        console.error('Error parsing user:', err);
      }
    }
  }, []);

  const loadFeedback = async () => {
    setLoading(true);
    setError('');
    try {
      const cleanFilters = Object.fromEntries(Object.entries(filters).filter(([, value]) => value));
      const response = await feedbackAPI.list(cleanFilters);
      setItems(response.data || []);
      setSummary(response.summary || summary);
    } catch (err: any) {
      setError(err?.message || 'No se pudo cargar el buzón.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeedback();
  }, [filters.type, filters.status, filters.audience]);

  const filteredItems = useMemo(() => {
    const term = search.toLowerCase();
    if (!term) return items;

    return items.filter((item) =>
      item.subject.toLowerCase().includes(term) ||
      item.message.toLowerCase().includes(term) ||
      `${item.first_name || ''} ${item.last_name || ''}`.toLowerCase().includes(term) ||
      (item.email || '').toLowerCase().includes(term)
    );
  }, [items, search]);

  const openItem = (item: FeedbackItem) => {
    setSelected(item);
    setForm({
      status: item.status,
      adminResponse: item.admin_response || '',
    });
  };

  const saveItem = async () => {
    if (!selected) return;
    setError('');
    try {
      await feedbackAPI.update(selected.id, form);
      setSelected(null);
      await loadFeedback();
    } catch (err: any) {
      setError(err?.message || 'No se pudo actualizar la entrada.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const getStatusClass = (status: string) => {
    if (status === 'resolved') return 'bg-green-100 text-green-700';
    if (status === 'reviewing') return 'bg-blue-100 text-blue-700';
    if (status === 'archived') return 'bg-gray-100 text-gray-700';
    return 'bg-yellow-100 text-yellow-700';
  };

  return (
    <ProtectedRoute requiredRole="admin">
      <div className="flex min-h-screen overflow-x-hidden bg-gradient-to-br from-gray-50 to-blue-50">
        <aside className={`fixed inset-y-0 left-0 z-50 h-dvh w-[min(16rem,86vw)] bg-white shadow-xl transform transition-transform duration-300 lg:w-64 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
          <div className="h-full min-h-0 flex flex-col">
            <div className="p-4 border-b border-gray-100 shrink-0">
              <Link href="/admin" className="flex items-center gap-2">
                <Shield className="w-7 h-7 text-blue-600" />
                <div>
                  <h1 className="text-base font-bold text-gray-900">SaludClick</h1>
                  <p className="text-xs text-gray-500">Panel Admin</p>
                </div>
              </Link>
            </div>

            <nav className="flex-1 min-h-0 p-3 space-y-1 overflow-y-auto">
              <p className="text-[11px] font-semibold text-gray-400 uppercase mb-2 px-2">Principal</p>
              <Link href="/admin" className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                <Home className="w-5 h-5" />
                Dashboard
              </Link>
              <Link href="/admin/users" className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                <Users className="w-5 h-5" />
                Usuarios
              </Link>
              <Link href="/admin/doctor-requests" className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                <Stethoscope className="w-5 h-5" />
                Solicitudes Médicos
              </Link>
              <Link href="/admin/appointments" className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                <Calendar className="w-5 h-5" />
                Citas médicas
              </Link>

              <p className="text-[11px] font-semibold text-gray-400 uppercase mb-2 mt-3 px-2">Gestión</p>
              <Link href="/admin/health-centers" className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                <Building2 className="w-5 h-5" />
                Centros de Salud
              </Link>
              <Link href="/admin/doctor-payments" className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                <DollarSign className="w-5 h-5" />
                Pagos Doctores
              </Link>
              <Link href="/admin/feedback" className="flex items-center gap-3 px-3 py-2 rounded-xl bg-blue-50 text-blue-700 text-sm font-medium">
                <MessageSquare className="w-5 h-5" />
                Preguntas y Recomendaciones
              </Link>
              <Link href="/admin/reports" className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                <BarChart3 className="w-5 h-5" />
                Reportes
              </Link>
              <Link href="/admin/settings" className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                <Settings className="w-5 h-5" />
                Configuración
              </Link>
            </nav>

            <div className="mt-auto p-3 border-t border-gray-100 shrink-0">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-bold">
                  {user?.firstName?.[0] || 'A'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{user?.firstName} {user?.lastName}</p>
                  <p className="text-xs text-gray-500">Administrador</p>
                </div>
              </div>
              <button onClick={handleLogout} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                <LogOut className="w-4 h-4" />
                Cerrar Sesión
              </button>
            </div>
          </div>
        </aside>

        {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

        <div className="flex-1 min-w-0 overflow-x-hidden lg:pl-64">
          <header className="bg-white shadow-sm sticky top-0 z-30">
            <div className="px-4 md:px-8 py-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden p-2 hover:bg-gray-100 rounded-lg">
                  {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
                <div>
                  <h1 className="text-xl md:text-2xl font-bold text-gray-900">Preguntas y Recomendaciones</h1>
                  <p className="text-sm text-gray-500">Buzón central para solicitudes, ideas y comentarios de usuarios</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={loadFeedback} disabled={loading} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <RefreshCw className={`w-5 h-5 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <Bell className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>
          </header>

          <div className="p-4 md:p-8">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
              <Stat label="Total" value={summary.total} icon={<MessageSquare className="w-5 h-5 text-gray-900" />} />
              <Stat label="Preguntas" value={summary.question} icon={<AlertCircle className="w-5 h-5 text-blue-600" />} />
              <Stat label="Recomendaciones" value={summary.recommendation} icon={<Lightbulb className="w-5 h-5 text-yellow-600" />} />
              <Stat label="Resueltas" value={summary.resolved} icon={<CheckCircle className="w-5 h-5 text-green-600" />} />
              <Stat label="Archivadas" value={summary.archived} icon={<Archive className="w-5 h-5 text-gray-600" />} />
            </div>

            <div>
              <section>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_160px_160px_160px] gap-3">
                    <div className="relative">
                      <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Buscar por asunto, mensaje o usuario..."
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <Select value={filters.type} onChange={(type) => setFilters({ ...filters, type })} options={[['', 'Todos'], ['question', 'Preguntas'], ['recommendation', 'Recomendaciones']]} />
                    <Select value={filters.status} onChange={(status) => setFilters({ ...filters, status })} options={[['', 'Estados'], ['new', 'Nuevo'], ['reviewing', 'En revisión'], ['resolved', 'Resuelto'], ['archived', 'Archivado']]} />
                    <Select value={filters.audience} onChange={(audience) => setFilters({ ...filters, audience })} options={[['', 'Audiencia'], ['general', 'General'], ['patient', 'Pacientes'], ['doctor', 'Doctores']]} />
                  </div>
                </div>

                {error && (
                  <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    {error}
                  </div>
                )}

                <div className="space-y-3">
                  {loading ? (
                    [...Array(4)].map((_, i) => <div key={i} className="h-28 bg-white rounded-2xl border border-gray-100 animate-pulse" />)
                  ) : filteredItems.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                      <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500 font-medium">No hay entradas para mostrar</p>
                      <p className="text-sm text-gray-400 mt-1">Cuando pacientes o doctores envíen mensajes aparecerán aquí.</p>
                    </div>
                  ) : (
                    filteredItems.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => openItem(item)}
                        className="w-full text-left bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-all"
                      >
                        <div className="flex flex-col md:flex-row md:items-start gap-3 justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <span className="inline-flex px-2.5 py-1 rounded-full bg-cyan-50 text-cyan-700 text-xs font-medium">
                                {typeLabels[item.type]}
                              </span>
                              <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${getStatusClass(item.status)}`}>
                                {statusLabels[item.status]}
                              </span>
                              <span className="text-xs text-gray-400">{item.audience}</span>
                            </div>
                            <h2 className="font-bold text-gray-900 truncate">{item.subject}</h2>
                            <p className="text-sm text-gray-500 line-clamp-2 mt-1">{item.message}</p>
                          </div>
                          <div className="text-sm text-gray-500 md:text-right md:min-w-44">
                            <p className="font-medium text-gray-700">{item.first_name ? `${item.first_name} ${item.last_name || ''}` : 'Usuario no disponible'}</p>
                            <p className="truncate">{item.email || 'Sin correo'}</p>
                            <p>{new Date(item.created_at).toLocaleDateString('es-DO')}</p>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </section>

            </div>
          </div>
        </div>

        {selected && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full p-6">
              <div className="flex items-start justify-between mb-5">
                <div>
                  <div className="flex gap-2 mb-2">
                    <span className="inline-flex px-2.5 py-1 rounded-full bg-cyan-50 text-cyan-700 text-xs font-medium">{typeLabels[selected.type]}</span>
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${getStatusClass(selected.status)}`}>{statusLabels[selected.status]}</span>
                  </div>
                  <h2 className="text-lg font-bold text-gray-900">{selected.subject}</h2>
                  <p className="text-sm text-gray-500">{selected.email || 'Sin correo registrado'}</p>
                </div>
                <button onClick={() => setSelected(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <p className="text-sm text-gray-700 whitespace-pre-line">{selected.message}</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                  <Select value={form.status} onChange={(status) => setForm({ ...form, status })} options={[['new', 'Nuevo'], ['reviewing', 'En revisión'], ['resolved', 'Resuelto'], ['archived', 'Archivado']]} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Respuesta o nota interna</label>
                  <textarea
                    value={form.adminResponse}
                    onChange={(e) => setForm({ ...form, adminResponse: e.target.value })}
                    placeholder="Escribe la respuesta o seguimiento..."
                    rows={4}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={() => setSelected(null)} className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors">
                  Cancelar
                </button>
                <button onClick={saveItem} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors">
                  <Save className="w-4 h-4" />
                  Guardar cambios
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}

function Stat({ label, value, icon }: { label: string; value: number; icon: ReactNode }) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <p className="text-xs text-gray-500">{label}</p>
      <div className="flex items-center gap-2 mt-1">
        {icon}
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Array<[string, string]>;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      {options.map(([optionValue, label]) => (
        <option key={optionValue || label} value={optionValue}>
          {label}
        </option>
      ))}
    </select>
  );
}
