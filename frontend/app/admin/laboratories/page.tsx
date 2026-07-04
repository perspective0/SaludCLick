'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import { adminAPI } from '@/utils/api';
import {
  AlertCircle,
  ArrowLeft,
  Beaker,
  CheckCircle2,
  Edit,
  Globe,
  Mail,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from 'lucide-react';

type Laboratory = {
  id: string;
  name: string;
  address: string;
  city: string;
  state?: string;
  postal_code?: string;
  phone?: string;
  email?: string;
  website?: string;
  image?: string;
  description?: string;
  services?: string[];
  is_active: boolean;
  created_at: string;
};

const emptyForm = {
  name: '',
  address: '',
  city: '',
  state: '',
  postal_code: '',
  phone: '',
  email: '',
  website: '',
  image: '',
  description: '',
  services: '',
  is_active: true,
};

export default function AdminLaboratoriesPage() {
  const [laboratories, setLaboratories] = useState<Laboratory[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editing, setEditing] = useState<Laboratory | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Laboratory | null>(null);
  const [form, setForm] = useState(emptyForm);

  const loadLaboratories = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await adminAPI.listLaboratories();
      setLaboratories(response.data || []);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'No se pudieron cargar los laboratorios.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLaboratories();
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return laboratories;
    return laboratories.filter((lab) =>
      [lab.name, lab.address, lab.city, lab.state, lab.email, lab.phone, ...(lab.services || [])]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    );
  }, [laboratories, search]);

  const stats = {
    total: laboratories.length,
    active: laboratories.filter((lab) => lab.is_active).length,
    services: new Set(laboratories.flatMap((lab) => lab.services || [])).size,
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
    setError('');
    setSuccess('');
  };

  const openEdit = (lab: Laboratory) => {
    setEditing(lab);
    setForm({
      name: lab.name || '',
      address: lab.address || '',
      city: lab.city || '',
      state: lab.state || '',
      postal_code: lab.postal_code || '',
      phone: lab.phone || '',
      email: lab.email || '',
      website: lab.website || '',
      image: lab.image || '',
      description: lab.description || '',
      services: (lab.services || []).join(', '),
      is_active: lab.is_active !== false,
    });
    setShowForm(true);
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    const payload = {
      ...form,
      services: form.services.split(',').map((item) => item.trim()).filter(Boolean),
    };

    try {
      if (editing) {
        await adminAPI.updateLaboratory(editing.id, payload);
        setSuccess('Laboratorio actualizado exitosamente.');
      } else {
        await adminAPI.createLaboratory(payload);
        setSuccess('Laboratorio creado exitosamente.');
      }
      setShowForm(false);
      setEditing(null);
      await loadLaboratories();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'No se pudo guardar el laboratorio.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await adminAPI.deleteLaboratory(deleteTarget.id);
      setDeleteTarget(null);
      setSuccess('Laboratorio eliminado exitosamente.');
      await loadLaboratories();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'No se pudo eliminar el laboratorio.');
    }
  };

  return (
    <ProtectedRoute requiredRole="admin">
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
        <header className="bg-white border-b border-gray-100 sticky top-0 z-30">
          <div className="px-4 md:px-8 py-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <Link href="/admin/dashboard" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-2">
                <ArrowLeft className="w-4 h-4" />
                Panel administrativo
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">Laboratorios</h1>
              <p className="text-sm text-gray-500">Administra laboratorios clínicos y sus servicios disponibles.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={loadLaboratories} disabled={loading} className="p-2 rounded-lg hover:bg-gray-100" title="Actualizar">
                <RefreshCw className={`w-5 h-5 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium">
                <Plus className="w-4 h-4" />
                Nuevo laboratorio
              </button>
            </div>
          </div>
        </header>

        <main className="p-4 md:p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <p className="text-xs text-gray-500">Total</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <p className="text-xs text-gray-500">Activos</p>
              <p className="text-2xl font-bold text-green-600">{stats.active}</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <p className="text-xs text-gray-500">Servicios registrados</p>
              <p className="text-2xl font-bold text-blue-600">{stats.services}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
            <div className="relative">
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por nombre, ciudad, contacto o servicio..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              {success}
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {[0, 1, 2, 3].map((item) => (
                <div key={item} className="h-52 bg-white rounded-xl animate-pulse border border-gray-100" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center border border-gray-100">
              <Beaker className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-lg font-bold text-gray-900">No hay laboratorios</h2>
              <p className="text-gray-500 mt-1">Crea el primer laboratorio o cambia la búsqueda.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filtered.map((lab) => (
                <article key={lab.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center overflow-hidden shrink-0">
                      {lab.image ? <img src={lab.image} alt={lab.name} className="w-full h-full object-cover" /> : <Beaker className="w-6 h-6 text-blue-600" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-gray-900 truncate">{lab.name}</h3>
                        <span className={`w-2 h-2 rounded-full ${lab.is_active ? 'bg-green-500' : 'bg-gray-300'}`} title={lab.is_active ? 'Activo' : 'Inactivo'} />
                      </div>
                      <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                        <MapPin className="w-4 h-4" />
                        {lab.city}{lab.state ? `, ${lab.state}` : ''} · {lab.address}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4 text-sm text-gray-600">
                    {lab.phone && <p className="flex items-center gap-2"><Phone className="w-4 h-4 text-gray-400" />{lab.phone}</p>}
                    {lab.email && <p className="flex items-center gap-2 min-w-0"><Mail className="w-4 h-4 text-gray-400 shrink-0" /><span className="truncate">{lab.email}</span></p>}
                    {lab.website && <p className="flex items-center gap-2 min-w-0"><Globe className="w-4 h-4 text-gray-400 shrink-0" /><span className="truncate">{lab.website}</span></p>}
                  </div>

                  {lab.description && <p className="text-sm text-gray-600 mt-4 line-clamp-2">{lab.description}</p>}

                  {(lab.services || []).length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-4">
                      {(lab.services || []).slice(0, 6).map((service) => (
                        <span key={service} className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">{service}</span>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2 mt-5 pt-4 border-t border-gray-100">
                    <button onClick={() => openEdit(lab)} className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium">
                      <Edit className="w-4 h-4" />
                      Editar
                    </button>
                    <button onClick={() => setDeleteTarget(lab)} className="inline-flex items-center justify-center px-3 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100" title="Eliminar">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </main>

        {showForm && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{editing ? 'Editar laboratorio' : 'Nuevo laboratorio'}</h2>
                  <p className="text-sm text-gray-500">Los campos marcados son obligatorios.</p>
                </div>
                <button onClick={() => setShowForm(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="md:col-span-2 text-sm font-medium text-gray-700">
                    Nombre *
                    <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1 w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </label>
                  <label className="md:col-span-2 text-sm font-medium text-gray-700">
                    Dirección *
                    <input required value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="mt-1 w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </label>
                  <label className="text-sm font-medium text-gray-700">
                    Ciudad *
                    <input required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="mt-1 w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </label>
                  <label className="text-sm font-medium text-gray-700">
                    Provincia/Estado
                    <input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} className="mt-1 w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </label>
                  <label className="text-sm font-medium text-gray-700">
                    Teléfono
                    <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1 w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </label>
                  <label className="text-sm font-medium text-gray-700">
                    Email
                    <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1 w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </label>
                  <label className="text-sm font-medium text-gray-700">
                    Sitio web
                    <input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://..." className="mt-1 w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </label>
                  <label className="text-sm font-medium text-gray-700">
                    URL de imagen
                    <input value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} placeholder="https://..." className="mt-1 w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </label>
                  <label className="md:col-span-2 text-sm font-medium text-gray-700">
                    Servicios
                    <input value={form.services} onChange={(e) => setForm({ ...form, services: e.target.value })} placeholder="Hemograma, Uroanálisis, Perfil lipídico" className="mt-1 w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </label>
                  <label className="md:col-span-2 text-sm font-medium text-gray-700">
                    Descripción
                    <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="mt-1 w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                  </label>
                  <label className="md:col-span-2 inline-flex items-center gap-2 text-sm font-medium text-gray-700">
                    <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="w-4 h-4 rounded border-gray-300" />
                    Laboratorio activo
                  </label>
                </div>
                <div className="flex gap-3 pt-4 border-t border-gray-100">
                  <button type="button" onClick={() => setShowForm(false)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50">Cancelar</button>
                  <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50">
                    {saving ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {deleteTarget && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6">
              <div className="text-center mb-6">
                <div className="inline-flex p-3 bg-red-100 rounded-full mb-4">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">Eliminar laboratorio</h2>
                <p className="text-sm text-gray-500 mt-2">Se eliminará {deleteTarget.name} del sistema.</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setDeleteTarget(null)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50">Cancelar</button>
                <button onClick={handleDelete} className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600">Eliminar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
