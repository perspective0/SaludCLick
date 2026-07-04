'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import PatientShell from '@/components/PatientShell';
import { patientAPI } from '@/utils/api';
import { formatDoctorName } from '@/utils/names';
import { CheckCircle2, FileText, Pill, Printer, Search, ShieldCheck } from 'lucide-react';

export default function PatientPrescriptionsPage() {
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadPrescriptions();
  }, []);

  const loadPrescriptions = async () => {
    try {
      setLoading(true);
      const response = await patientAPI.prescriptions();
      setPrescriptions(response.data || []);
    } catch (err: any) {
      setError(err?.status === 403 ? 'No tienes permiso para acceder a estas recetas.' : 'No se pudieron cargar tus recetas.');
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return prescriptions;
    return prescriptions.filter((prescription) => Object.values(prescription).filter(Boolean).join(' ').toLowerCase().includes(term));
  }, [prescriptions, search]);

  return (
    <ProtectedRoute requiredRole="patient">
      <PatientShell title="Mis recetas" subtitle="Consulta, valida e imprime tus recetas emitidas">
        {error && <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

        <section className="mb-6 grid gap-4 md:grid-cols-4">
          <Metric title="Total" value={prescriptions.length} icon={FileText} />
          <Metric title="Activas" value={prescriptions.filter((item) => item.status === 'active').length} icon={CheckCircle2} />
          <Metric title="Vencidas" value={prescriptions.filter((item) => item.status === 'expired').length} icon={ShieldCheck} />
          <Metric title="Resultados" value={filtered.length} icon={Search} />
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white">
          <div className="flex flex-col gap-4 border-b border-gray-100 p-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Historial de recetas</h2>
              <p className="text-sm text-gray-500">{prescriptions.length} receta(s) registradas</p>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar medicamento, doctor o código"
                className="h-10 w-full rounded-xl border border-gray-200 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 md:w-80"
              />
            </div>
          </div>

          <div className="p-5">
            {loading ? (
              <div className="space-y-3">{[...Array(4)].map((_, index) => <div key={index} className="h-28 animate-pulse rounded-2xl bg-gray-100" />)}</div>
            ) : filtered.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-10 text-center">
                <FileText className="mx-auto mb-3 h-8 w-8 text-gray-300" />
                <p className="font-bold text-gray-800">No hay recetas disponibles</p>
                <p className="mt-1 text-sm text-gray-500">Cuando tu médico emita una receta, podrás verla e imprimirla aquí.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {filtered.map((prescription) => (
                  <article key={prescription.id} className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0 p-5">
                        <div className="flex flex-wrap items-center gap-2">
                          <Pill className="h-5 w-5 text-blue-600" />
                          <h3 className="text-lg font-black text-gray-900">{prescription.medicationNames?.slice(0, 3).join(', ') || 'Receta médica'}</h3>
                          <StatusBadge status={prescription.status} />
                        </div>
                        <p className="mt-1 text-sm text-gray-500">{formatDoctorName(prescription.doctor_first_name, prescription.doctor_last_name)} · {formatDate(prescription.issued_at || prescription.created_at)}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">Código: {prescription.validation_code || 'Pendiente'}</span>
                          {prescription.expiry_date && <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">Vence: {formatDate(prescription.expiry_date)}</span>}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 border-t border-gray-100 bg-gray-50 p-5 lg:border-l lg:border-t-0">
                        <Link href={`/patient/prescriptions/${prescription.id}`} className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                          Ver receta
                        </Link>
                        <Link href={`/patient/prescriptions/${prescription.id}`} className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                          <Printer className="h-4 w-4" />
                          Imprimir
                        </Link>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </PatientShell>
    </ProtectedRoute>
  );
}

function Metric({ title, value, icon: Icon }: { title: string; value: number; icon: any }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <Icon className="mb-3 h-5 w-5 text-blue-600" />
      <p className="text-2xl font-black text-gray-950">{value}</p>
      <p className="text-sm text-gray-500">{title}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: 'bg-emerald-50 text-emerald-700',
    expired: 'bg-amber-50 text-amber-700',
    cancelled: 'bg-rose-50 text-rose-700',
    used: 'bg-gray-100 text-gray-700',
  };
  return <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${styles[status] || 'bg-gray-100 text-gray-700'}`}>{translateStatus(status)}</span>;
}

function formatDate(value: string) {
  return value ? new Date(value).toLocaleDateString('es-DO', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Fecha pendiente';
}

function translateStatus(status: string) {
  const labels: Record<string, string> = { active: 'Activa', expired: 'Vencida', cancelled: 'Anulada', used: 'Usada' };
  return labels[status] || status || 'N/D';
}
