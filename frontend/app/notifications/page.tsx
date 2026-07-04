'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import { notificationAPI } from '@/utils/api';
import { ArrowLeft, Bell, CheckCheck, Search, Trash2 } from 'lucide-react';

type Filter = 'all' | 'unread' | 'appointment' | 'prescription' | 'clinical';

export default function NotificationsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [homeHref, setHomeHref] = useState('/dashboard');

  useEffect(() => {
    try {
      const role = JSON.parse(localStorage.getItem('user') || '{}')?.role;
      setHomeHref(
        role === 'doctor' ? '/doctor/dashboard' :
        role === 'patient' ? '/patient/dashboard' :
        role === 'secretary' ? '/secretary/dashboard' :
        role === 'admin' ? '/admin/dashboard' :
        '/dashboard'
      );
    } catch {
      setHomeHref('/dashboard');
    }
    loadNotifications();
  }, [filter]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      setError('');
      const params = filter === 'unread' ? { status: 'unread' } : filter === 'all' ? {} : { type: filter };
      const response = await notificationAPI.list({ ...params, limit: 80 });
      setItems(response.data || []);
    } catch (err: any) {
      setError(err?.status === 403 ? 'No tienes permiso para ver estas notificaciones.' : 'No se pudieron cargar las notificaciones.');
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return items;
    return items.filter((item) => `${item.title} ${item.message} ${item.type}`.toLowerCase().includes(term));
  }, [items, search]);

  const markAll = async () => {
    await notificationAPI.markRead();
    await loadNotifications();
  };

  const markOne = async (id: string) => {
    await notificationAPI.markOneRead(id);
    await loadNotifications();
  };

  const archive = async (id: string) => {
    await notificationAPI.archive(id);
    await loadNotifications();
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#f6f8fb] px-4 py-8 md:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <Link href={homeHref} className="mt-0.5 inline-flex h-10 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                <ArrowLeft className="h-4 w-4" />
                Volver
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Notificaciones</h1>
                <p className="mt-1 text-sm text-gray-500">Recordatorios, avisos de citas, recetas y alertas clínicas.</p>
              </div>
            </div>
            <button onClick={markAll} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700">
              <CheckCheck className="h-4 w-4" />
              Marcar todo leído
            </button>
          </div>

          {error && <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

          <section className="rounded-2xl border border-gray-200 bg-white">
            <div className="flex flex-col gap-4 border-b border-gray-100 p-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar notificación"
                  className="h-10 w-full rounded-xl border border-gray-200 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 lg:w-80"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {(['all', 'unread', 'appointment', 'prescription', 'clinical'] as Filter[]).map((value) => (
                  <button
                    key={value}
                    onClick={() => setFilter(value)}
                    className={`rounded-xl border px-3 py-2 text-sm font-semibold ${
                      filter === value ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {label(value)}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-5">
              {loading ? (
                <div className="space-y-3">{[...Array(5)].map((_, index) => <div key={index} className="h-24 animate-pulse rounded-2xl bg-gray-100" />)}</div>
              ) : filtered.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-12 text-center">
                  <Bell className="mx-auto mb-3 h-9 w-9 text-gray-300" />
                  <p className="font-bold text-gray-800">No hay notificaciones para esta vista</p>
                  <p className="mt-1 text-sm text-gray-500">Los recordatorios y avisos aparecerán aquí cuando se generen.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filtered.map((item) => (
                    <article key={item.id} className={`rounded-2xl border p-4 ${item.status === 'unread' ? 'border-blue-100 bg-blue-50' : 'border-gray-200 bg-white'}`}>
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <Link href={item.url || '#'} onClick={() => markOne(item.id)} className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="font-bold text-gray-900">{item.title}</h2>
                            <Badge text={label(item.type)} />
                            {item.priority === 'high' && <Badge text="Alta" tone="danger" />}
                          </div>
                          <p className="mt-1 text-sm text-gray-600">{item.message || item.body}</p>
                          <p className="mt-2 text-xs text-gray-400">{formatDate(item.created_at)}</p>
                        </Link>
                        <button onClick={() => archive(item.id)} className="rounded-xl border border-gray-200 p-2 text-gray-500 hover:bg-gray-50" title="Archivar">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </ProtectedRoute>
  );
}

function Badge({ text, tone = 'neutral' }: { text: string; tone?: 'neutral' | 'danger' }) {
  return <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${tone === 'danger' ? 'bg-rose-100 text-rose-700' : 'bg-white text-gray-600'}`}>{text}</span>;
}

function label(value: string) {
  const labels: Record<string, string> = {
    all: 'Todas',
    unread: 'No leídas',
    appointment: 'Citas',
    prescription: 'Recetas',
    clinical: 'Clínicas',
    general: 'General',
  };
  return labels[value] || value;
}

function formatDate(value: string) {
  return value ? new Date(value).toLocaleString('es-DO', { dateStyle: 'medium', timeStyle: 'short' }) : '';
}
