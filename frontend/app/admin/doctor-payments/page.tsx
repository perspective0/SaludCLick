'use client';

import { useEffect, useMemo, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { adminAPI } from '@/utils/api';
import { formatDoctorName } from '@/utils/names';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Clock,
  CreditCard,
  DollarSign,
  RefreshCw,
  Save,
  Search,
  Stethoscope,
  X,
  Shield,
  Users,
  BarChart3,
  Settings,
  LogOut,
  Bell,
  Menu,
  Home,
  Building2,
  Calendar,
  MessageSquare
} from 'lucide-react';

type PaymentRow = {
  doctor_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  health_center_name?: string;
  due_date: string;
  grace_until: string;
  amount: string;
  status: string;
  paid_at?: string;
  payment_method?: string;
  reference?: string;
  notes?: string;
};

const statusLabels: Record<string, string> = {
  paid: 'Pagado',
  pending: 'Pendiente',
  overdue: 'Vencido',
  waived: 'Exonerado',
};

function currentPeriod() {
  return new Date().toISOString().slice(0, 7);
}

export default function DoctorPaymentsPage() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [period, setPeriod] = useState(currentPeriod());
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [summary, setSummary] = useState({ total: 0, paid: 0, pending: 0, overdue: 0, waived: 0 });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<PaymentRow | null>(null);
  const [form, setForm] = useState({ status: 'pending', amount: '0', paymentMethod: '', reference: '', notes: '' });

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

  const loadPayments = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await adminAPI.listDoctorPayments(period);
      setRows(response.data || []);
      setSummary(response.summary || { total: 0, paid: 0, pending: 0, overdue: 0, waived: 0 });
    } catch (err: any) {
      setError(err?.message || 'No se pudieron cargar los pagos de doctores.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, [period]);

  const filteredRows = useMemo(() => {
    const term = search.toLowerCase();
    if (!term) return rows;
    return rows.filter((row) =>
      `${row.first_name} ${row.last_name}`.toLowerCase().includes(term) ||
      row.email.toLowerCase().includes(term) ||
      (row.health_center_name || '').toLowerCase().includes(term)
    );
  }, [rows, search]);

  const openEdit = (row: PaymentRow) => {
    setEditing(row);
    setForm({
      status: row.status,
      amount: String(row.amount || '0'),
      paymentMethod: row.payment_method || '',
      reference: row.reference || '',
      notes: row.notes || '',
    });
  };

  const savePayment = async () => {
    if (!editing) return;
    setError('');
    try {
      await adminAPI.updateDoctorPayment(editing.doctor_id, {
        period,
        status: form.status,
        amount: Number(form.amount || 0),
        paymentMethod: form.paymentMethod,
        reference: form.reference,
        notes: form.notes,
      });
      setEditing(null);
      await loadPayments();
    } catch (err: any) {
      setError(err?.message || 'No se pudo actualizar el pago.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const getStatusClass = (status: string) => {
    if (status === 'paid') return 'bg-green-100 text-green-700';
    if (status === 'overdue') return 'bg-red-100 text-red-700';
    if (status === 'waived') return 'bg-purple-100 text-purple-700';
    return 'bg-yellow-100 text-yellow-700';
  };

  return (
    <ProtectedRoute requiredRole="admin">
      <div className="flex min-h-screen overflow-x-hidden bg-gradient-to-br from-gray-50 to-blue-50">
        {/* Sidebar */}
        <aside className={`fixed inset-y-0 left-0 z-50 h-dvh w-[min(15rem,86vw)] bg-white shadow-xl transform transition-transform duration-300 lg:w-60 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
          <div className="flex h-full min-h-0 flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <Link href="/admin" className="flex items-center gap-2">
                <Shield className="w-6 h-6 text-blue-600" />
                <div>
                  <h1 className="text-sm font-bold text-gray-900">SaludClick</h1>
                  <p className="text-[11px] text-gray-500 leading-tight">Panel Admin</p>
                </div>
              </Link>
            </div>

            <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-hidden">
              <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1 px-2">
                Principal
              </p>
              <Link
                href="/admin"
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <Home className="w-4 h-4" />
                Dashboard
              </Link>
              <Link
                href="/admin/users"
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <Users className="w-4 h-4" />
                Usuarios
              </Link>
              <Link
                href="/admin/doctor-requests"
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <Stethoscope className="w-4 h-4" />
                Solicitudes Médicos
              </Link>
              <Link
                href="/admin/appointments"
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <Calendar className="w-4 h-4" />
                Citas médicas
              </Link>

              <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1 mt-2 px-2">
                Gestión
              </p>
              <Link
                href="/admin/health-centers"
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <Building2 className="w-4 h-4" />
                Centros de Salud
              </Link>
              <Link
                href="/admin/doctor-payments"
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 text-xs text-blue-700 font-medium"
              >
                <DollarSign className="w-4 h-4" />
                Pagos Doctores
              </Link>
              <Link
                href="/admin/feedback"
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <MessageSquare className="w-4 h-4" />
                Preguntas y Recomendaciones
              </Link>
              <Link
                href="/admin/reports"
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <BarChart3 className="w-4 h-4" />
                Reportes
              </Link>
              <Link
                href="/admin/settings"
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <Settings className="w-4 h-4" />
                Configuración
              </Link>
            </nav>

            <div className="mt-auto px-3 py-2 border-t border-gray-100">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  {user?.firstName?.[0] || 'A'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900 truncate">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-[11px] text-gray-500 leading-tight">Administrador</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
        <div className="flex-1 min-w-0 overflow-x-hidden lg:pl-60">
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
                    Pagos de Doctores
                  </h1>
                  <p className="text-sm text-gray-500">
                    Vencimiento mensual el día 25, con margen hasta el día 28
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={loadPayments}
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
                <p className="text-xs text-gray-500">Total</p>
                <div className="flex items-center gap-2 mt-1">
                  <CreditCard className="w-5 h-5 text-gray-900" />
                  <p className="text-2xl font-bold text-gray-900">{summary.total}</p>
                </div>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <p className="text-xs text-gray-500">Pagados</p>
                <div className="flex items-center gap-2 mt-1">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <p className="text-2xl font-bold text-green-600">{summary.paid}</p>
                </div>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <p className="text-xs text-gray-500">Pendientes</p>
                <div className="flex items-center gap-2 mt-1">
                  <Clock className="w-5 h-5 text-yellow-600" />
                  <p className="text-2xl font-bold text-yellow-600">{summary.pending}</p>
                </div>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <p className="text-xs text-gray-500">Vencidos</p>
                <div className="flex items-center gap-2 mt-1">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <p className="text-2xl font-bold text-red-600">{summary.overdue}</p>
                </div>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <p className="text-xs text-gray-500">Exonerados</p>
                <div className="flex items-center gap-2 mt-1">
                  <DollarSign className="w-5 h-5 text-purple-600" />
                  <p className="text-2xl font-bold text-purple-600">{summary.waived}</p>
                </div>
              </div>
            </div>

            {/* Filtros */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar doctor, email o centro..."
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex gap-2">
                  <input
                    type="month"
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                    className="px-4 py-2.5 border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                {error}
              </div>
            )}

            {/* Tabla */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Doctor</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Centro</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Monto</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Fechas</th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Estado</th>
                      <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {loading ? (
                      [...Array(5)].map((_, i) => (
                        <tr key={i}>
                          <td colSpan={6} className="px-6 py-4">
                            <div className="animate-pulse flex items-center gap-4">
                              <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                              <div className="flex-1">
                                <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                                <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : filteredRows.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center">
                          <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                          <p className="text-gray-500 font-medium">No se encontraron pagos</p>
                          <p className="text-sm text-gray-400 mt-1">
                            {search ? 'Intenta con otros términos de búsqueda' : 'No hay doctores para este periodo'}
                          </p>
                        </td>
                      </tr>
                    ) : (
                      filteredRows.map((row) => (
                        <tr key={row.doctor_id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                <Stethoscope className="w-5 h-5 text-blue-600" />
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{formatDoctorName(row.first_name, row.last_name)}</p>
                                <p className="text-sm text-gray-500">{row.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">{row.health_center_name || 'Sin centro'}</td>
                          <td className="px-6 py-4">
                            <span className="text-sm font-bold text-gray-900">
                              ${Number(row.amount || 0).toLocaleString()}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-sm">
                                <span className="text-gray-500">Vence:</span>
                                <span className="text-gray-900">{new Date(row.due_date).toLocaleDateString('es-DO')}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <span className="text-gray-500">Margen:</span>
                                <span className="text-gray-900">{new Date(row.grace_until).toLocaleDateString('es-DO')}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${getStatusClass(row.status)}`}>
                              {statusLabels[row.status] || row.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => openEdit(row)}
                              className="px-4 py-2 text-sm rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors font-medium"
                            >
                              Actualizar
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Modal de edición */}
        {editing && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Actualizar Pago</h2>
                  <p className="text-sm text-gray-500">
                    {formatDoctorName(editing.first_name, editing.last_name)}
                  </p>
                </div>
                <button onClick={() => setEditing(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="pending">Pendiente</option>
                    <option value="paid">Pagado</option>
                    <option value="overdue">Vencido</option>
                    <option value="waived">Exonerado</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monto</label>
                  <input
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Método de Pago</label>
                  <input
                    value={form.paymentMethod}
                    onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                    placeholder="Transferencia, Efectivo, Tarjeta..."
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Referencia</label>
                  <input
                    value={form.reference}
                    onChange={(e) => setForm({ ...form, reference: e.target.value })}
                    placeholder="Número de comprobante"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Notas adicionales..."
                    rows={3}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setEditing(null)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={savePayment}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  Guardar Cambios
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
