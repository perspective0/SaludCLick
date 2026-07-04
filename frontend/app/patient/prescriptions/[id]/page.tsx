'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import PatientShell from '@/components/PatientShell';
import { patientAPI } from '@/utils/api';
import { formatDoctorName } from '@/utils/names';
import { FileText, Printer, ShieldCheck } from 'lucide-react';

export default function PatientPrescriptionDetailPage() {
  const params = useParams();
  const id = String(params.id);
  const [prescription, setPrescription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadPrescription();
  }, [id]);

  const loadPrescription = async () => {
    try {
      setLoading(true);
      const response = await patientAPI.prescription(id);
      setPrescription(response.data);
    } catch (err: any) {
      setError(err?.status === 403 ? 'No tienes permiso para acceder a esta receta.' : 'No se pudo cargar la receta.');
    } finally {
      setLoading(false);
    }
  };

  const printPrescription = async () => {
    try {
      setPrinting(true);
      const response = await fetch(patientAPI.getPrescriptionPrintUrl(id), {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('No se pudo generar la receta imprimible.');
      const html = await response.text();
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch (err: any) {
      setError(err.message || 'No se pudo imprimir la receta.');
    } finally {
      setPrinting(false);
    }
  };

  const medications = parseMedications(prescription?.medications);

  return (
    <ProtectedRoute requiredRole="patient">
      <PatientShell title="Detalle de receta" subtitle="Información segura para consulta e impresión">
        {error && <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

        {loading ? (
          <div className="h-96 animate-pulse rounded-2xl bg-white" />
        ) : prescription ? (
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <section className="rounded-2xl border border-gray-200 bg-white p-6">
              <div className="mb-6 flex flex-col gap-4 border-b border-gray-100 pb-6 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="mb-2 flex items-center gap-2 text-blue-700">
                    <FileText className="h-5 w-5" />
                    <span className="text-sm font-bold">Receta médica</span>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">{formatDoctorName(prescription.doctor_first_name, prescription.doctor_last_name)}</h2>
                  <p className="text-sm text-gray-500">{prescription.health_center_name || 'Centro médico'} · Lic. {prescription.doctor_license_number || prescription.license_number || 'N/D'}</p>
                </div>
                <StatusBadge status={prescription.status} />
              </div>

              <div className="mb-6 grid gap-4 md:grid-cols-2">
                <Info label="Paciente" value={`${prescription.patient_first_name} ${prescription.patient_last_name}`} />
                <Info label="Fecha emisión" value={formatDate(prescription.issued_at || prescription.created_at)} />
                <Info label="Diagnóstico asociado" value={prescription.diagnosis || 'No especificado'} />
                <Info label="Vence" value={prescription.expiry_date ? formatDate(prescription.expiry_date) : 'No especificado'} />
              </div>

              <h3 className="mb-3 text-lg font-bold text-gray-900">Medicamentos</h3>
              <div className="space-y-3">
                {medications.length ? medications.map((medication: any, index: number) => (
                  <div key={`${medication.name}-${index}`} className="rounded-2xl border border-gray-200 p-4">
                    <p className="font-bold text-gray-900">{index + 1}. {medication.name || medication.medication}</p>
                    <div className="mt-3 grid gap-3 text-sm md:grid-cols-3">
                      <Info label="Dosis" value={medication.dosage || 'N/D'} compact />
                      <Info label="Frecuencia" value={medication.frequency || 'N/D'} compact />
                      <Info label="Duración" value={medication.duration || 'N/D'} compact />
                    </div>
                    {medication.instructions && <p className="mt-3 text-sm text-gray-600">{medication.instructions}</p>}
                  </div>
                )) : (
                  <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">No hay medicamentos detallados.</div>
                )}
              </div>

              {prescription.notes && (
                <div className="mt-6 rounded-2xl bg-blue-50 p-4 text-sm text-blue-800">
                  <strong>Indicaciones generales:</strong> {prescription.notes}
                </div>
              )}
            </section>

            <aside className="h-fit rounded-2xl border border-gray-200 bg-white p-5 lg:sticky lg:top-28">
              <div className="mb-4 rounded-2xl border border-dashed border-blue-200 bg-blue-50 p-4 text-center">
                <ShieldCheck className="mx-auto mb-2 h-8 w-8 text-blue-600" />
                <p className="text-sm font-bold text-blue-900">Código de validación</p>
                <p className="mt-2 break-all text-lg font-black text-blue-700">{prescription.validation_code || 'Pendiente'}</p>
              </div>
              <button
                onClick={printPrescription}
                disabled={printing}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                <Printer className="h-4 w-4" />
                {printing ? 'Generando...' : 'Imprimir / guardar PDF'}
              </button>
              <p className="mt-3 text-xs text-gray-500">La impresión usa el HTML seguro del backend y requiere tu sesión activa.</p>
            </aside>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center text-gray-500">Receta no encontrada.</div>
        )}
      </PatientShell>
    </ProtectedRoute>
  );
}

function Info({ label, value, compact = false }: { label: string; value: string; compact?: boolean }) {
  return <div><p className="text-xs font-bold uppercase text-gray-400">{label}</p><p className={`${compact ? 'text-sm' : 'text-base'} font-semibold text-gray-800`}>{value}</p></div>;
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: 'bg-emerald-50 text-emerald-700',
    expired: 'bg-amber-50 text-amber-700',
    cancelled: 'bg-rose-50 text-rose-700',
    used: 'bg-gray-100 text-gray-700',
  };
  return <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${styles[status] || 'bg-gray-100 text-gray-700'}`}>{status || 'N/D'}</span>;
}

function parseMedications(value: any) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    return JSON.parse(value);
  } catch {
    return [];
  }
}

function formatDate(value: string) {
  return value ? new Date(value).toLocaleDateString('es-DO', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Fecha pendiente';
}
