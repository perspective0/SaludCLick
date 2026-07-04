'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { AlertTriangle, CheckCircle2, ShieldCheck, XCircle } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

export default function PublicPrescriptionVerificationPage() {
  const params = useParams();
  const code = String(params.code || '');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    verifyPrescription();
  }, [code]);

  const verifyPrescription = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(`${API_URL}/prescriptions/verify/${encodeURIComponent(code)}`, {
        cache: 'no-store',
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || 'No se pudo verificar la receta.');
      }

      setResult(payload.data);
    } catch (err: any) {
      setResult(null);
      setError(err?.message || 'No se pudo verificar la receta.');
    } finally {
      setLoading(false);
    }
  };

  const valid = Boolean(result?.valid);

  return (
    <main className="min-h-screen bg-[#eef5f8] px-4 py-8 text-gray-900">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="mb-6 inline-flex items-center text-sm font-bold text-blue-700 hover:text-blue-800">
          SaludClick
        </Link>

        <section className="rounded-2xl border border-white/70 bg-white p-6 shadow-xl md:p-8">
          <div className="mb-6 flex flex-col gap-4 border-b border-gray-100 pb-6 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-sm font-bold text-blue-700">
                <ShieldCheck className="h-4 w-4" />
                Verificacion de receta
              </div>
              <h1 className="text-3xl font-black text-gray-950">Documento SaludClick</h1>
              <p className="mt-2 break-all text-sm font-semibold text-gray-500">{code}</p>
            </div>

            {!loading && (
              <span className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-sm font-bold ${valid ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                {valid ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                {valid ? 'Valida' : 'No valida'}
              </span>
            )}
          </div>

          {loading ? (
            <div className="h-60 animate-pulse rounded-2xl bg-gray-100" />
          ) : error ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-800">
              <div className="mb-2 flex items-center gap-2 font-black">
                <AlertTriangle className="h-5 w-5" />
                No se encontro la receta
              </div>
              <p className="text-sm">{error}</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className={`rounded-2xl border p-5 ${valid ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'}`}>
                <p className={`font-black ${valid ? 'text-emerald-800' : 'text-rose-800'}`}>
                  {valid ? 'Documento autentico emitido por SaludClick.' : getInvalidMessage(result)}
                </p>
                <p className="mt-1 text-sm text-gray-600">Confirma que el codigo impreso coincida exactamente con el mostrado aqui. Esta vista muestra solo datos necesarios para autenticidad.</p>
              </div>

              <div className={`rounded-2xl border p-5 ${result.documentIntact ? 'border-emerald-200 bg-white' : 'border-amber-200 bg-amber-50'}`}>
                <div className="flex items-start gap-3">
                  {result.documentIntact ? <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" /> : <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" />}
                  <div>
                    <p className="font-black text-gray-950">Documento integro</p>
                    <p className="mt-1 text-sm text-gray-600">
                      {result.documentIntact ? 'El documento no ha sido alterado desde su emision.' : 'No se pudo confirmar la integridad criptografica del documento.'}
                    </p>
                    {result.documentHash && (
                      <p className="mt-3 break-all rounded-xl bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-500">
                        {result.documentHashAlgorithm || 'SHA-256'}: {result.documentHash}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Info label="Medico" value={result.doctor || 'No disponible'} />
                <Info label="Especialidad" value={formatSpecialties(result.specialties)} />
                <Info label="Exequatur" value={result.licenseNumber || 'No disponible'} />
                <Info label="CMD" value={result.cmdNumber || 'No disponible'} />
                <Info label="Centro de salud" value={result.healthCenter || 'No especificado'} />
                <Info label="Paciente" value={result.patient || 'No disponible'} />
                <Info label="Estado" value={result.statusLabel || result.status || 'No disponible'} />
                <Info label="Emitida" value={formatDate(result.issuedAt)} />
                <Info label="Vence" value={result.expiryDate ? formatDate(result.expiryDate) : 'No especificada'} />
                <Info label="Codigo de receta" value={result.validationCode || code} />
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <p className="text-xs font-black uppercase text-gray-400">{label}</p>
      <p className="mt-1 font-bold text-gray-900">{value}</p>
    </div>
  );
}

function formatDate(value: string) {
  return value ? new Date(value).toLocaleString('es-DO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : 'No disponible';
}

function formatSpecialties(value: any) {
  if (Array.isArray(value)) return value.filter(Boolean).join(', ') || 'No disponible';
  return String(value || '').replace(/[{}"]/g, '').split(',').filter(Boolean).join(', ') || 'No disponible';
}

function getInvalidMessage(result: any) {
  if (result && result.documentIntact === false) return 'No se pudo confirmar la integridad del documento.';
  return 'El documento no esta activo o esta vencido.';
}
