'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import DoctorShell from '@/components/DoctorShell';
import { vademecumAPI } from '@/utils/api';
import { AlertTriangle, Search, Star } from 'lucide-react';

export default function DoctorVademecumPage() {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [recent, setRecent] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadShortcuts = async () => {
    try {
      const [favoriteResponse, recentResponse] = await Promise.all([
        vademecumAPI.favorites(),
        vademecumAPI.recent(),
      ]);
      setFavorites(favoriteResponse?.data || []);
      setRecent(recentResponse?.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadShortcuts();
  }, []);

  useEffect(() => {
    const term = search.trim();
    if (term.length < 2) {
      setResults([]);
      return;
    }
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError('');
      try {
        const response = await vademecumAPI.search(term, 20);
        setResults(response?.data || []);
      } catch (err: any) {
        setError(err?.message || 'No se pudo buscar en el vademecum.');
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  const openDetail = async (item: any) => {
    setSelected(item);
    try {
      const response = await vademecumAPI.detail(item.id);
      setSelected(response?.data || item);
    } catch (err) {
      console.error(err);
    }
  };

  const addFavorite = async () => {
    if (!selected?.id) return;
    await vademecumAPI.addFavorite(selected.id);
    await loadShortcuts();
  };

  return (
    <ProtectedRoute requiredRole="doctor">
      <DoctorShell title="Vademecum" subtitle="Consulta medicamentos, presentaciones, sugerencias y advertencias">
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px] gap-6">
          <main className="space-y-6">
            <section className="rounded-2xl bg-white border border-gray-200 p-5">
              <label className="block">
                <span className="block text-sm font-semibold text-gray-700 mb-2">Buscar medicamento</span>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Nombre comercial, principio activo, concentracion o laboratorio"
                    className="h-11 w-full rounded-xl border border-gray-200 pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </label>
            </section>

            {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

            <section className="rounded-2xl bg-white border border-gray-200 p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">Resultados</h2>
                {loading && <span className="text-sm text-gray-500">Buscando...</span>}
              </div>
              {results.length === 0 ? (
                <p className="text-sm text-gray-500">Escribe al menos dos caracteres para buscar.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {results.map((item) => (
                    <button key={item.id} type="button" onClick={() => openDetail(item)} className="rounded-xl border border-gray-200 p-4 text-left hover:border-blue-200 hover:bg-blue-50">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-bold text-gray-900">{item.nombre_comercial}</p>
                          <p className="text-sm text-gray-600">{item.principio_activo}</p>
                          <p className="mt-1 text-xs text-gray-500">{[item.concentracion, item.forma_farmaceutica, item.via_administracion].filter(Boolean).join(' · ')}</p>
                        </div>
                        {item.controlado && <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700">Controlado</span>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>
          </main>

          <aside className="space-y-6 xl:sticky xl:top-28 h-fit">
            <section className="rounded-2xl bg-white border border-gray-200 p-5">
              <div className="mb-4 flex items-center justify-between gap-2">
                <h2 className="text-lg font-bold text-gray-900">Ficha rapida</h2>
                {selected?.id && (
                  <button type="button" onClick={addFavorite} className="h-9 w-9 rounded-lg border border-gray-200 hover:bg-gray-50 inline-flex items-center justify-center" title="Agregar a favoritos">
                    <Star className="h-4 w-4" />
                  </button>
                )}
              </div>
              {!selected ? (
                <p className="text-sm text-gray-500">Selecciona un medicamento para ver su informacion.</p>
              ) : (
                <div className="space-y-4">
                  <div>
                    <p className="text-xl font-bold text-gray-900">{selected.nombre_comercial}</p>
                    <p className="text-sm text-gray-600">{selected.principio_activo}</p>
                    <p className="mt-1 text-sm text-gray-500">{[selected.concentracion, selected.forma_farmaceutica, selected.presentacion, selected.via_administracion].filter(Boolean).join(' · ')}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selected.requiere_receta && <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">Requiere receta</span>}
                    {selected.controlado && <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700">Controlado</span>}
                    {selected.otc && <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">OTC</span>}
                    {selected.disponible_rd && <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">Disponible RD</span>}
                  </div>
                  <InfoRows item={selected} />
                  <DetailList title="Posologias sugeridas" items={selected.posologias || []} />
                  <WarningList items={selected.advertencias || []} />
                </div>
              )}
            </section>

            <ShortcutList title="Favoritos" items={favorites} onPick={openDetail} />
            <ShortcutList title="Recientes" items={recent} onPick={openDetail} />
          </aside>
        </div>
      </DoctorShell>
    </ProtectedRoute>
  );
}

function InfoRows({ item }: { item: any }) {
  const rows = [
    ['Laboratorio', item.laboratorio],
    ['Categoria', item.categoria_farmacologica],
    ['Registro sanitario', item.registro_sanitario],
  ].filter((row) => row[1]);
  if (!rows.length) return null;
  return (
    <div className="rounded-xl border border-gray-200 divide-y divide-gray-100">
      {rows.map(([label, value]) => (
        <div key={label} className="grid grid-cols-[120px_1fr] gap-3 px-3 py-2 text-sm">
          <span className="font-semibold text-gray-500">{label}</span>
          <span className="text-gray-900">{value}</span>
        </div>
      ))}
    </div>
  );
}

function DetailList({ title, items }: { title: string; items: any[] }) {
  if (!items.length) return null;
  return (
    <div>
      <p className="mb-2 text-sm font-bold text-gray-900">{title}</p>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="rounded-xl bg-gray-50 p-3 text-sm text-gray-700">
            <p className="font-semibold text-gray-900">{item.grupo_paciente}</p>
            <p>{[item.dosis_sugerida, item.frecuencia, item.duracion].filter(Boolean).join(' · ')}</p>
            {item.notas && <p className="mt-1 text-xs text-gray-500">{item.notas}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

function WarningList({ items }: { items: any[] }) {
  if (!items.length) return null;
  return (
    <div>
      <p className="mb-2 text-sm font-bold text-gray-900">Advertencias</p>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <p className="flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4" />{item.severidad} · {item.tipo}</p>
            <p>{item.mensaje}</p>
            {item.recomendacion && <p className="mt-1 text-xs">{item.recomendacion}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

function ShortcutList({ title, items, onPick }: { title: string; items: any[]; onPick: (item: any) => void }) {
  return (
    <section className="rounded-2xl bg-white border border-gray-200 p-5">
      <h2 className="mb-3 text-lg font-bold text-gray-900">{title}</h2>
      {items.length === 0 ? (
        <p className="text-sm text-gray-500">Sin medicamentos.</p>
      ) : (
        <div className="space-y-2">
          {items.slice(0, 8).map((item) => (
            <button key={`${title}-${item.id}`} type="button" onClick={() => onPick(item)} className="w-full rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-left hover:bg-white">
              <p className="text-sm font-semibold text-gray-900">{item.nombre_comercial}</p>
              <p className="text-xs text-gray-500">{item.principio_activo} · {item.concentracion || 'Sin concentracion'}</p>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
