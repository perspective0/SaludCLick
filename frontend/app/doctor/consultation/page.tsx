'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import DoctorShell from '@/components/DoctorShell';
import ConsultationPanel from '@/components/doctor/ConsultationPanel';
import SOAPForm from '@/components/doctor/SOAPForm';
import VitalSignsCard from '@/components/doctor/VitalSignsCard';
import {
  buildStructuredConsultationNotes,
  ClinicalPatient,
  emptySOAP,
  emptyVitalSigns,
  getAge,
  getFullName,
  SOAPData,
  VitalSigns,
} from '@/components/doctor/clinical';
import { appointmentAPI, clinicalAPI, doctorAPI, medicalAPI } from '@/utils/api';
import { formatDate } from '@/utils/helpers';
import { AlertCircle, CalendarClock, CheckCircle2, FlaskConical, Pill, Save } from 'lucide-react';

const draftKey = (patientId: string, appointmentId?: string | null) => `consultationDraft:${patientId}:${appointmentId || 'standalone'}`;

export default function DoctorConsultationPage() {
  return (
    <Suspense fallback={<ConsultationFallback />}>
      <DoctorConsultationContent />
    </Suspense>
  );
}

function DoctorConsultationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const patientId = searchParams.get('patientId') || '';
  const appointmentId = searchParams.get('appointmentId');
  const [patients, setPatients] = useState<ClinicalPatient[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [clinicalSummary, setClinicalSummary] = useState<any>(null);
  const [draftId, setDraftId] = useState('');
  const [vitals, setVitals] = useState<VitalSigns>(emptyVitalSigns);
  const [soap, setSoap] = useState<SOAPData>(emptySOAP);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser || !patientId) {
      setLoading(false);
      return;
    }

    const parsed = JSON.parse(storedUser);
    loadConsultation(parsed.id);
  }, [patientId, appointmentId]);

  const patient = useMemo(
    () => patients.find((item) => item.id === patientId),
    [patientId, patients]
  );

  const appointment = useMemo(
    () => appointments.find((item) => item.id === appointmentId) || appointments.find((item) => item.patient_id === patientId),
    [appointmentId, appointments, patientId]
  );

  const patientAppointments = useMemo(
    () => appointments.filter((item) => item.patient_id === patientId),
    [appointments, patientId]
  );

  const lastRecord = records[0];

  const loadConsultation = async (doctorId: string) => {
    setLoading(true);
    setError('');
    try {
      const [patientResponse, appointmentResponse, recordResponse, prescriptionResponse, summaryResponse, draftResponse] = await Promise.all([
        doctorAPI.getPatients(doctorId, { limit: 100 }),
        appointmentAPI.list({ limit: 100 }),
        medicalAPI.getPatientHistory(patientId),
        medicalAPI.getPatientPrescriptions(patientId),
        clinicalAPI.getSummary(patientId).catch(() => null),
        clinicalAPI.getConsultationDraft(patientId).catch(() => null),
      ]);
      setPatients(Array.from(new Map((patientResponse?.data || []).map((item: ClinicalPatient) => [item.id, item])).values()) as ClinicalPatient[]);
      setAppointments(appointmentResponse?.data || []);
      setRecords(recordResponse?.data || []);
      setPrescriptions(prescriptionResponse?.data || []);
      setClinicalSummary(summaryResponse?.data || null);
      hydrateDraft(draftResponse?.data);
    } catch (err) {
      console.error('Error loading consultation:', err);
      setError('No se pudo cargar la consulta medica.');
      loadLocalDraft();
    } finally {
      setLoading(false);
    }
  };

  const hydrateDraft = (draft: any) => {
    if (!draft?.draft_data) {
      loadLocalDraft();
      return;
    }
    const data = typeof draft.draft_data === 'string' ? JSON.parse(draft.draft_data) : draft.draft_data;
    setDraftId(draft.id || '');
    setVitals({ ...emptyVitalSigns, ...data.vitals });
    setSoap({ ...emptySOAP, ...data.soap });
  };

  const loadLocalDraft = () => {
    const stored = localStorage.getItem(draftKey(patientId, appointmentId));
    if (!stored) return;
    try {
      const draft = JSON.parse(stored);
      setVitals({ ...emptyVitalSigns, ...draft.vitals });
      setSoap({ ...emptySOAP, ...draft.soap });
    } catch {
      localStorage.removeItem(draftKey(patientId, appointmentId));
    }
  };

  const saveDraft = async () => {
    const draftData = { vitals, soap, notes: buildStructuredConsultationNotes(soap), savedAt: new Date().toISOString() };
    try {
      const response = await clinicalAPI.saveConsultationDraft({ patientId, appointmentId, draftData });
      setDraftId(response?.data?.id || '');
      localStorage.removeItem(draftKey(patientId, appointmentId));
      setSuccess('Borrador guardado en el backend.');
    } catch (err) {
      console.error('Error saving backend draft:', err);
      localStorage.setItem(draftKey(patientId, appointmentId), JSON.stringify(draftData));
      setSuccess(getDraftFallbackMessage(err));
    }
  };

  const finishConsultation = async () => {
    if (!window.confirm('¿Finalizar esta consulta y crear el registro medico?')) return;
    if (!patientId) {
      setError('Selecciona un paciente antes de finalizar.');
      return;
    }
    if (!soap.primaryDiagnosis.trim() || !soap.treatment.trim()) {
      setError('Diagnostico principal y tratamiento son obligatorios.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await medicalAPI.createRecord({
        patientId,
        appointmentId,
        diagnosis: soap.primaryDiagnosis,
        icd10Code: soap.primaryDiagnosisIcd10 || undefined,
        treatment: soap.treatment,
        symptoms: soap.symptoms || soap.reasonForVisit,
        vitalSigns: vitals,
        notes: buildStructuredConsultationNotes(soap),
      });

      if (appointmentId) {
        await appointmentAPI.update(appointmentId, { status: 'completed' });
      }
      if (draftId) {
        await clinicalAPI.deleteConsultationDraft(draftId).catch(() => null);
      }

      localStorage.removeItem(draftKey(patientId, appointmentId));
      setSuccess('Consulta finalizada y registro clinico creado.');
      router.push(`/doctor/patients/${patientId}`);
    } catch (err: any) {
      console.error('Error finishing consultation:', err);
      setError(getClinicalErrorMessage(err, 'No se pudo finalizar la consulta. El borrador se conserva.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProtectedRoute requiredRole="doctor">
      <DoctorShell
        title="Consulta medica"
        subtitle="Flujo clinico SOAP, signos vitales, receta y seguimiento"
        actions={
          <div className="flex flex-wrap gap-2">
            <button onClick={saveDraft} className="h-10 px-3 rounded-xl border border-gray-200 text-sm font-semibold hover:bg-gray-50 inline-flex items-center gap-2">
              <Save className="w-4 h-4" />
              Guardar borrador
            </button>
            <button onClick={finishConsultation} disabled={saving} className="h-10 px-3 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 inline-flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              {saving ? 'Finalizando...' : 'Finalizar consulta'}
            </button>
          </div>
        }
      >
        <div className="space-y-6">
          {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 flex items-center gap-2"><AlertCircle className="w-5 h-5" />{error}</div>}
          {success && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>}

          {loading ? (
            <div className="space-y-6 animate-pulse">
              <div className="h-40 rounded-2xl bg-gray-100" />
              <div className="h-96 rounded-2xl bg-gray-100" />
            </div>
          ) : !patient ? (
            <section className="rounded-2xl bg-white border border-gray-200 p-12 text-center">
              <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="font-semibold text-gray-700">Selecciona un paciente para iniciar consulta.</p>
              <Link href="/doctor/patients" className="mt-4 inline-flex h-10 px-4 rounded-xl bg-gray-900 text-white text-sm font-semibold items-center">Ir a pacientes</Link>
            </section>
          ) : (
            <>
              <section className="rounded-2xl bg-gray-950 text-white p-5">
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4">
                  <div>
                    <p className="text-sm text-blue-200 font-medium">Consulta en curso</p>
                    <h1 className="text-2xl font-bold mt-1 text-white">{getFullName(patient)}</h1>
                    <div className="mt-3 flex flex-wrap gap-2 text-sm text-gray-300">
                      <span>{getAge(patient.birth_date)}</span>
                      <span>Sexo: {patient.sex || 'No disponible'}</span>
                      <span>Motivo: {appointment?.reason_for_visit || soap.reasonForVisit || 'No registrado'}</span>
                      <span>Ultima consulta: {lastRecord?.created_at ? new Date(lastRecord.created_at).toLocaleDateString('es-DO') : 'Sin registro'}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                    <ClinicalBadge label="Alergias" value={clinicalSummary?.allergies?.[0]?.name || 'Sin alergias registradas'} tone="amber" />
                    <ClinicalBadge label="Signos criticos" value="Sin alertas activas" tone="emerald" />
                  </div>
                </div>
              </section>

              <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6">
                <div className="space-y-6">
                  <VitalSignsCard value={vitals} onChange={setVitals} />
                  <SOAPForm value={soap} onChange={setSoap} />

                  <section className="rounded-2xl bg-white border border-gray-200 p-5">
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/doctor/prescriptions?patientId=${patientId}`} className="h-10 px-3 rounded-xl border border-gray-200 text-sm font-semibold hover:bg-gray-50 inline-flex items-center gap-2">
                        <Pill className="w-4 h-4" />
                        Generar receta
                      </Link>
                      <Link href={`/doctor/lab-orders?patientId=${patientId}${lastRecord?.id ? `&recordId=${lastRecord.id}` : ''}`} className="h-10 px-3 rounded-xl border border-gray-200 text-sm font-semibold hover:bg-gray-50 inline-flex items-center gap-2">
                        <FlaskConical className="w-4 h-4" />
                        Ordenar laboratorio
                      </Link>
                      <Link href="/appointments" className="h-10 px-3 rounded-xl border border-gray-200 text-sm font-semibold hover:bg-gray-50 inline-flex items-center gap-2">
                        <CalendarClock className="w-4 h-4" />
                        Reagendar
                      </Link>
                      <button onClick={finishConsultation} disabled={saving} className="h-10 px-3 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60 inline-flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        Finalizar consulta
                      </button>
                    </div>
                  </section>
                </div>

                <ConsultationPanel
                  patientId={patientId}
                  appointments={patientAppointments}
                  prescriptions={prescriptions}
                  records={records}
                />
              </div>
            </>
          )}
        </div>
      </DoctorShell>
    </ProtectedRoute>
  );
}

function ConsultationFallback() {
  return (
    <ProtectedRoute requiredRole="doctor">
      <DoctorShell title="Consulta medica" subtitle="Flujo clinico SOAP, signos vitales, receta y seguimiento">
        <div className="space-y-6 animate-pulse">
          <div className="h-40 rounded-2xl bg-gray-100" />
          <div className="h-96 rounded-2xl bg-gray-100" />
        </div>
      </DoctorShell>
    </ProtectedRoute>
  );
}

function getClinicalErrorMessage(error: any, fallback: string) {
  if (error?.status === 403) return 'No tienes permiso para acceder a este paciente.';
  if (error?.status === 409) return 'Hay un conflicto con los datos clinicos. Revisa la informacion e intenta nuevamente.';
  if (error?.status === 400) return error?.message || 'Hay datos clinicos invalidos.';
  return error?.message || fallback;
}

function getDraftFallbackMessage(error: any) {
  if (error?.status === 401) return 'Sesion expirada: borrador guardado localmente.';
  if (error?.status === 403) return 'Sin permiso para sincronizar este paciente: borrador guardado localmente.';
  if (error?.status === 400) return `${error?.message || 'Datos incompletos'}: borrador guardado localmente.`;
  return 'No se pudo sincronizar con el servidor: borrador guardado localmente.';
}

function ClinicalBadge({ label, value, tone }: { label: string; value: string; tone: 'amber' | 'emerald' }) {
  const styles = tone === 'amber' ? 'bg-amber-50 text-amber-100 border-amber-400/30' : 'bg-emerald-50 text-emerald-100 border-emerald-400/30';
  return (
    <div className={`rounded-xl border px-3 py-2 ${styles}`}>
      <p className="text-xs opacity-80">{label}</p>
      <p className="font-semibold text-white">{value}</p>
    </div>
  );
}
