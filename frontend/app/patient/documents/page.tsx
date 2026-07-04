'use client';

import { useEffect, useMemo, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import PatientShell from '@/components/PatientShell';
import { patientAPI } from '@/utils/api';
import { formatDoctorName } from '@/utils/names';
import { CheckCircle2, ExternalLink, FileCheck2, FileText, Printer, Search, ShieldCheck } from 'lucide-react';

const documentTypes: Record<string, string> = {
  certificate: 'Certificado medico',
  medical_constancy: 'Constancia medica',
  referral: 'Referimiento',
  disability: 'Incapacidad',
};

export default function PatientDocumentsPage() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await patientAPI.documents();
      setDocuments(response.data || []);
    } catch (err: any) {
      setError(err?.status === 403 ? 'No tienes permiso para acceder a estos documentos.' : 'No se pudieron cargar tus documentos medicos.');
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return documents;
    return documents.filter((document) => Object.values(document).filter(Boolean).join(' ').toLowerCase().includes(term));
  }, [documents, search]);

  const openPrint = async (document: any) => {
    const printWindow = window.open('about:blank', '_blank');
    if (!printWindow) {
      setError('El navegador bloqueo la ventana de impresion.');
      return;
    }
    printWindow.document.write('<p style="font-family:Arial;padding:32px;">Cargando documento...</p>');
    try {
      const html = await patientAPI.getDocumentPrintHtml(document.id);
      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
    } catch (err: any) {
      printWindow.document.body.innerHTML = 'No se pudo cargar el documento.';
      setError(err?.message || 'No se pudo imprimir el documento.');
    }
  };

  return (
    <ProtectedRoute requiredRole="patient">
      <PatientShell title="Mis documentos" subtitle="Certificados, constancias, referimientos e incapacidades">
        {error && <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

        <section className="mb-6 grid gap-4 md:grid-cols-4">
          <Metric title="Total" value={documents.length} icon={FileText} />
          <Metric title="Activos" value={documents.filter((item) => item.status === 'active').length} icon={CheckCircle2} />
          <Metric title="Tipos" value={new Set(documents.map((item) => item.order_type)).size} icon={FileCheck2} />
          <Metric title="Resultados" value={filtered.length} icon={Search} />
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white">
          <div className="flex flex-col gap-4 border-b border-gray-100 p-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Historial de documentos</h2>
              <p className="text-sm text-gray-500">{documents.length} documento(s) registrados</p>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar tipo, doctor o codigo"
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
                <p className="font-bold text-gray-800">No hay documentos disponibles</p>
                <p className="mt-1 text-sm text-gray-500">Cuando tu medico emita un documento, podras verlo e imprimirlo aqui.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {filtered.map((document) => (
                  <article key={document.id} className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0 p-5">
                        <div className="flex flex-wrap items-center gap-2">
                          <FileCheck2 className="h-5 w-5 text-blue-600" />
                          <h3 className="text-lg font-black text-gray-900">{document.documentTitle || documentTypes[document.order_type] || 'Documento medico'}</h3>
                          <StatusBadge status={document.status} />
                        </div>
                        <p className="mt-1 text-sm text-gray-500">{documentTypes[document.order_type] || 'Documento medico'} · {formatDoctorName(document.doctor_first_name, document.doctor_last_name)} · {formatDate(document.issued_at || document.created_at)}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">Codigo: {document.validation_code || 'Pendiente'}</span>
                          {document.health_center_name && <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">{document.health_center_name}</span>}
                          {document.documentCategory && <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">{document.documentCategory}</span>}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 border-t border-gray-100 bg-gray-50 p-5 lg:border-l lg:border-t-0">
                        <button type="button" onClick={() => openPrint(document)} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                          <Printer className="h-4 w-4" />
                          Imprimir
                        </button>
                        <a href={`/documents/verify/${encodeURIComponent(document.validation_code || '')}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                          <ExternalLink className="h-4 w-4" />
                          Validar
                        </a>
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
    cancelled: 'bg-rose-50 text-rose-700',
  };
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${styles[status] || 'bg-gray-100 text-gray-700'}`}><ShieldCheck className="h-3.5 w-3.5" />{translateStatus(status)}</span>;
}

function formatDate(value: string) {
  return value ? new Date(value).toLocaleDateString('es-DO', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Fecha pendiente';
}

function translateStatus(status: string) {
  const labels: Record<string, string> = { active: 'Activo', cancelled: 'Anulado' };
  return labels[status] || status || 'N/D';
}
