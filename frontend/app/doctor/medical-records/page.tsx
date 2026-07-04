'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import DoctorShell from '@/components/DoctorShell';
import SOAPForm from '@/components/doctor/SOAPForm';
import VitalSignsCard from '@/components/doctor/VitalSignsCard';
import {
  buildStructuredConsultationNotes,
  emptySOAP,
  emptyVitalSigns,
  getAge,
  getFullName,
  SOAPData,
  VitalSigns,
} from '@/components/doctor/clinical';
import { appointmentAPI, clinicalAPI, doctorAPI, medicalAPI } from '@/utils/api';
import { formatDate } from '@/utils/helpers';
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  FilePlus2,
  FlaskConical,
  HeartPulse,
  Pill,
  Save,
  Search,
  ShieldAlert,
  Stethoscope,
  UserRound,
} from 'lucide-react';

type ClinicalForm = {
  personalHistory: string;
  familyHistory: string;
  allergies: string;
  currentMedications: string;
  evolution: string;
};

const emptyClinicalForm: ClinicalForm = {
  personalHistory: '',
  familyHistory: '',
  allergies: '',
  currentMedications: '',
  evolution: '',
};

const draftKey = (patientId: string) => `medicalRecordDraft:${patientId}`;

export default function DoctorMedicalRecordsPage() {
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [records, setRecords] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [backendTimeline, setBackendTimeline] = useState<any[]>([]);
  const [draftId, setDraftId] = useState('');
  const [vitals, setVitals] = useState<VitalSigns>(emptyVitalSigns);
  const [soap, setSoap] = useState<SOAPData>(emptySOAP);
  const [clinicalForm, setClinicalForm] = useState<ClinicalForm>(emptyClinicalForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      setLoading(false);
      return;
    }

    const user = JSON.parse(storedUser);
    const patientId = new URLSearchParams(window.location.search).get('patientId') || '';
    if (patientId) setSelectedPatientId(patientId);
    loadWorkspace(user.id, patientId);
  }, []);

  useEffect(() => {
    if (!selectedPatientId) {
      setRecords([]);
      setPrescriptions([]);
      setAppointments([]);
      return;
    }

    loadPatientClinicalData(selectedPatientId);
  }, [selectedPatientId]);

  useEffect(() => {
    if (!selectedPatientId) return;
    const timer = window.setTimeout(() => {
      saveDraft(false);
    }, 2500);
    return () => window.clearTimeout(timer);
  }, [clinicalForm, selectedPatientId, soap, vitals]);

  const selectedPatient = useMemo(
    () => patients.find((patient) => patient.id === selectedPatientId),
    [patients, selectedPatientId]
  );

  const patientAppointments = useMemo(
    () => appointments.filter((appointment) => appointment.patient_id === selectedPatientId),
    [appointments, selectedPatientId]
  );

  const nextAppointment = patientAppointments
    .filter((appointment) => appointment.appointment_date >= new Date().toISOString().split('T')[0] && !['completed', 'cancelled', 'no-show'].includes(appointment.status))
    .sort((a, b) => `${a.appointment_date}T${a.appointment_time}`.localeCompare(`${b.appointment_date}T${b.appointment_time}`))[0];

  const lastRecord = records[0];

  const timeline = useMemo(() => {
    const recordEvents = records.map((record) => ({
      id: `record-${record.id}`,
      date: record.created_at,
      title: record.diagnosis || 'Consulta medica',
      detail: record.treatment || record.symptoms || 'Registro clinico',
      type: 'Consulta',
    }));
    const prescriptionEvents = prescriptions.map((prescription) => ({
      id: `prescription-${prescription.id}`,
      date: prescription.created_at,
      title: 'Receta emitida',
      detail: formatMedications(prescription.medications),
      type: 'Receta',
    }));
    const appointmentEvents = patientAppointments.map((appointment) => ({
      id: `appointment-${appointment.id}`,
      date: appointment.appointment_date,
      title: appointment.reason_for_visit || 'Cita medica',
      detail: appointment.status,
      type: 'Cita',
    }));

    if (backendTimeline.length) {
      return backendTimeline.map((event) => ({
        id: `${event.type}-${event.id}`,
        date: event.event_date,
        title: event.title,
        detail: event.detail,
        type: event.type,
      }));
    }

    return [...recordEvents, ...prescriptionEvents, ...appointmentEvents]
      .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
      .slice(0, 12);
  }, [backendTimeline, patientAppointments, prescriptions, records]);

  const loadWorkspace = async (doctorId: string, initialPatientId: string) => {
    setLoading(true);
    setError('');
    try {
      const response = await doctorAPI.getPatients(doctorId, { limit: 100 });
      const data = dedupePatients(response?.data || []);
      setPatients(data);
      const patientToLoad = initialPatientId || data[0]?.id || '';
      if (!initialPatientId && patientToLoad) setSelectedPatientId(patientToLoad);
      if (patientToLoad) await loadPatientClinicalData(patientToLoad);
    } catch (err) {
      console.error('Error loading patients:', err);
      setError('No se pudieron cargar los pacientes.');
    } finally {
      setLoading(false);
    }
  };

  const loadPatientClinicalData = async (patientId: string) => {
    setError('');
    try {
      const [recordResponse, prescriptionResponse, appointmentResponse, summaryResponse, timelineResponse, draftResponse] = await Promise.all([
        medicalAPI.getPatientHistory(patientId),
        medicalAPI.getPatientPrescriptions(patientId),
        appointmentAPI.list({ limit: 100 }),
        clinicalAPI.getSummary(patientId).catch(() => null),
        clinicalAPI.getTimeline(patientId).catch(() => null),
        clinicalAPI.getConsultationDraft(patientId).catch(() => null),
      ]);
      setRecords(recordResponse?.data || []);
      setPrescriptions(prescriptionResponse?.data || []);
      setAppointments(appointmentResponse?.data || []);
      setBackendTimeline(timelineResponse?.data || []);
      hydrateClinicalSummary(summaryResponse?.data);
      hydrateDraft(draftResponse?.data, patientId);
    } catch (err) {
      console.error('Error loading records:', err);
      setError('No se pudo cargar la informacion clinica del paciente.');
    }
  };

  const hydrateClinicalSummary = (summary: any) => {
    if (!summary) return;
    setClinicalForm((current) => ({
      ...current,
      allergies: current.allergies || summary.allergies?.filter((item: any) => item.is_active).map((item: any) => item.name).join(', ') || '',
      currentMedications: current.currentMedications || summary.medications?.filter((item: any) => item.is_active).map((item: any) => `${item.medication}${item.dosage ? ` ${item.dosage}` : ''}`).join(', ') || '',
      personalHistory: current.personalHistory || summary.antecedents?.personal_history || '',
      familyHistory: current.familyHistory || summary.antecedents?.family_history || '',
    }));
  };

  const hydrateDraft = (draft: any, patientId: string) => {
    if (!draft?.draft_data) {
      loadLocalDraft(patientId);
      return;
    }
    const data = typeof draft.draft_data === 'string' ? JSON.parse(draft.draft_data) : draft.draft_data;
    setDraftId(draft.id || '');
    setVitals({ ...emptyVitalSigns, ...data.vitals });
    setSoap({ ...emptySOAP, ...data.soap });
    setClinicalForm({ ...emptyClinicalForm, ...data.clinicalForm });
    setLastSavedAt(draft.updated_at || data.savedAt || '');
  };

  const loadLocalDraft = (patientId: string) => {
    const stored = localStorage.getItem(draftKey(patientId));
    if (!stored) {
      setVitals(emptyVitalSigns);
      setSoap(emptySOAP);
      setClinicalForm(emptyClinicalForm);
      setLastSavedAt('');
      return;
    }

    try {
      const draft = JSON.parse(stored);
      setVitals({ ...emptyVitalSigns, ...draft.vitals });
      setSoap({ ...emptySOAP, ...draft.soap });
      setClinicalForm({ ...emptyClinicalForm, ...draft.clinicalForm });
      setLastSavedAt(draft.savedAt || '');
    } catch {
      localStorage.removeItem(draftKey(patientId));
    }
  };

  const saveDraft = async (showMessage = true) => {
    if (!selectedPatientId) return;
    const savedAt = new Date().toISOString();
    const draftData = { vitals, soap, clinicalForm, savedAt };
    try {
      const response = await clinicalAPI.saveConsultationDraft({ patientId: selectedPatientId, draftData });
      setDraftId(response?.data?.id || '');
      localStorage.removeItem(draftKey(selectedPatientId));
      setLastSavedAt(response?.data?.updated_at || savedAt);
      if (showMessage) setSuccess('Borrador guardado en el backend.');
    } catch (err) {
      console.error('Error saving backend draft:', err);
      localStorage.setItem(draftKey(selectedPatientId), JSON.stringify(draftData));
      setLastSavedAt(savedAt);
      if (showMessage) setSuccess(getDraftFallbackMessage(err));
    }
  };

  const saveRecord = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!window.confirm('¿Finalizar esta consulta y crear el registro medico?')) return;
    if (!selectedPatientId) {
      setError('Selecciona un paciente antes de guardar.');
      return;
    }
    if (!soap.primaryDiagnosis.trim() || !soap.treatment.trim()) {
      setError('Diagnostico principal y tratamiento son obligatorios para finalizar.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const notes = [
        clinicalForm.personalHistory && `Antecedentes personales: ${clinicalForm.personalHistory}`,
        clinicalForm.familyHistory && `Antecedentes familiares: ${clinicalForm.familyHistory}`,
        clinicalForm.allergies && `Alergias: ${clinicalForm.allergies}`,
        clinicalForm.currentMedications && `Medicamentos actuales: ${clinicalForm.currentMedications}`,
        clinicalForm.evolution && `Evolucion: ${clinicalForm.evolution}`,
        buildStructuredConsultationNotes(soap),
      ].filter(Boolean).join('\n\n');

      await medicalAPI.createRecord({
        patientId: selectedPatientId,
        diagnosis: soap.primaryDiagnosis,
        icd10Code: soap.primaryDiagnosisIcd10 || undefined,
        treatment: soap.treatment,
        symptoms: soap.symptoms || soap.reasonForVisit,
        notes,
        vitalSigns: vitals,
      });

      if (clinicalForm.allergies.trim()) {
        await clinicalAPI.createAllergy(selectedPatientId, { name: clinicalForm.allergies, type: 'clinica', severity: 'no especificada', isActive: true }).catch(() => null);
      }
      if (clinicalForm.currentMedications.trim()) {
        await clinicalAPI.createMedication(selectedPatientId, { medication: clinicalForm.currentMedications, isActive: true }).catch(() => null);
      }
      if (clinicalForm.personalHistory.trim() || clinicalForm.familyHistory.trim()) {
        await clinicalAPI.saveAntecedents(selectedPatientId, {
          personalHistory: clinicalForm.personalHistory,
          familyHistory: clinicalForm.familyHistory,
        }).catch(() => null);
      }
      if (draftId) {
        await clinicalAPI.deleteConsultationDraft(draftId).catch(() => null);
      }

      localStorage.removeItem(draftKey(selectedPatientId));
      setVitals(emptyVitalSigns);
      setSoap(emptySOAP);
      setClinicalForm(emptyClinicalForm);
      setLastSavedAt('');
      setSuccess('Consulta finalizada y registro medico creado.');
      await loadPatientClinicalData(selectedPatientId);
    } catch (err: any) {
      setError(getClinicalErrorMessage(err, 'No se pudo crear el registro medico. El borrador se conserva.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProtectedRoute requiredRole="doctor">
      <DoctorShell
        title="Registros medicos"
        subtitle="Consulta clinica estructurada, historial y seguimiento"
        actions={
          <div className="flex flex-wrap gap-2">
            <button onClick={() => saveDraft(true)} disabled={!selectedPatientId} className="h-10 px-3 rounded-xl border border-gray-200 text-sm font-semibold hover:bg-gray-50 disabled:opacity-60 inline-flex items-center gap-2" title="Guardar borrador en este dispositivo">
              <Save className="w-4 h-4" />
              Borrador
            </button>
            <button onClick={() => saveRecord()} disabled={!selectedPatientId || saving} className="h-10 px-3 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 inline-flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              {saving ? 'Guardando...' : 'Finalizar'}
            </button>
          </div>
        }
      >
        <div className="space-y-5">
          {error && <Alert tone="rose" text={error} />}
          {success && <Alert tone="emerald" text={success} />}

          <section className="rounded-2xl bg-white border border-gray-200 p-4">
            <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 lg:items-center">
              <label>
                <span className="block text-sm font-semibold text-gray-700 mb-1">Paciente</span>
                <select
                  value={selectedPatientId}
                  onChange={(event) => setSelectedPatientId(event.target.value)}
                  className="w-full h-11 rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecciona un paciente</option>
                  {patients.map((patient) => (
                    <option key={patient.id} value={patient.id}>
                      {patient.first_name} {patient.last_name}
                    </option>
                  ))}
                </select>
              </label>

              <PatientHeader patient={selectedPatient} lastRecord={lastRecord} nextAppointment={nextAppointment} allergies={clinicalForm.allergies} />
            </div>
          </section>

          {loading ? (
            <RecordSkeleton />
          ) : !selectedPatient ? (
            <EmptyState icon={UserRound} title="Selecciona un paciente" text="Elige un paciente para ver su historia clinica y crear una nueva consulta." />
          ) : (
            <form onSubmit={saveRecord} className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-6">
              <main className="space-y-5 min-w-0">
                <VitalSignsCard value={vitals} onChange={setVitals} />

                <section className="rounded-2xl bg-white border border-gray-200 p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <ShieldAlert className="w-5 h-5 text-amber-600" />
                    <h2 className="text-lg font-bold text-gray-900">Antecedentes y contexto</h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Textarea label="Antecedentes personales" value={clinicalForm.personalHistory} onChange={(value) => setClinicalForm({ ...clinicalForm, personalHistory: value })} />
                    <Textarea label="Antecedentes familiares" value={clinicalForm.familyHistory} onChange={(value) => setClinicalForm({ ...clinicalForm, familyHistory: value })} />
                    <Input label="Alergias críticas" value={clinicalForm.allergies} onChange={(value) => setClinicalForm({ ...clinicalForm, allergies: value })} placeholder="Penicilina, AINEs..." />
                    <Input label="Medicamentos actuales" value={clinicalForm.currentMedications} onChange={(value) => setClinicalForm({ ...clinicalForm, currentMedications: value })} placeholder="Losartan 50 mg..." />
                  </div>
                </section>

                <SOAPForm value={soap} onChange={setSoap} />

                <section className="rounded-2xl bg-white border border-gray-200 p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <HeartPulse className="w-5 h-5 text-blue-600" />
                    <h2 className="text-lg font-bold text-gray-900">Evolucion clinica</h2>
                  </div>
                  <Textarea label="Evolucion" value={clinicalForm.evolution} onChange={(value) => setClinicalForm({ ...clinicalForm, evolution: value })} />
                </section>

                <ClinicalTimeline events={timeline} />
              </main>

              <ClinicalSidebar
                patient={selectedPatient}
                prescriptions={prescriptions}
                records={records}
                nextAppointment={nextAppointment}
                currentMedications={clinicalForm.currentMedications}
                allergies={clinicalForm.allergies}
              />

              <div className="xl:col-span-2 sticky bottom-4 z-20 rounded-2xl bg-white/95 backdrop-blur border border-gray-200 shadow-lg p-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <p className="text-xs text-gray-500">
                    {lastSavedAt ? `Autoguardado: ${new Date(lastSavedAt).toLocaleTimeString('es-DO')}` : 'El borrador se guarda automaticamente en este dispositivo.'}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => saveDraft(true)} className="h-10 px-3 rounded-xl border border-gray-200 text-sm font-semibold hover:bg-gray-50 inline-flex items-center gap-2">
                      <Save className="w-4 h-4" />
                      Guardar borrador
                    </button>
                    <Link href={`/doctor/prescriptions?patientId=${selectedPatientId}`} className="h-10 px-3 rounded-xl border border-gray-200 text-sm font-semibold hover:bg-gray-50 inline-flex items-center gap-2" title="Generar receta para este paciente">
                      <Pill className="w-4 h-4" />
                      Generar receta
                    </Link>
                    <button type="button" className="h-10 px-3 rounded-xl border border-gray-200 text-sm font-semibold hover:bg-gray-50 inline-flex items-center gap-2" title="Solicitud de laboratorio pendiente de backend">
                      <FlaskConical className="w-4 h-4" />
                      Laboratorio
                    </button>
                    <Link href="/appointments" className="h-10 px-3 rounded-xl border border-gray-200 text-sm font-semibold hover:bg-gray-50 inline-flex items-center gap-2">
                      <CalendarClock className="w-4 h-4" />
                      Reagendar
                    </Link>
                    <button type="submit" disabled={saving} className="h-10 px-4 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 inline-flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      {saving ? 'Finalizando...' : 'Finalizar consulta'}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          )}
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

function PatientHeader({ patient, lastRecord, nextAppointment, allergies }: { patient: any; lastRecord?: any; nextAppointment?: any; allergies: string }) {
  if (!patient) {
    return (
      <div className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500">
        Selecciona un paciente para cargar el resumen clinico.
      </div>
    );
  }

  const importantDiagnosis = lastRecord?.diagnosis || 'Sin diagnostico registrado';

  return (
    <div className="rounded-2xl bg-gray-950 text-white p-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <p className="text-xs text-blue-200 font-semibold uppercase">Paciente en consulta</p>
          <h2 className="text-xl font-bold text-white">{getFullName(patient)}</h2>
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-300">
            <span>{getAge(patient.birth_date)}</span>
            <span>Sexo: {patient.sex || 'No disponible'}</span>
            <span>Ultima consulta: {lastRecord?.created_at ? new Date(lastRecord.created_at).toLocaleDateString('es-DO') : 'Sin registro'}</span>
            <span>Proxima cita: {nextAppointment ? formatDate(nextAppointment.appointment_date) : 'No agendada'}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <ClinicalBadge label="Alergias" value={allergies || 'No registradas'} tone={allergies ? 'rose' : 'emerald'} />
          <ClinicalBadge label="Diagnostico" value={importantDiagnosis} tone="blue" />
          <ClinicalBadge label="Estado" value={nextAppointment ? 'Seguimiento' : 'Activo'} tone="amber" />
        </div>
      </div>
    </div>
  );
}

function ClinicalSidebar({ patient, prescriptions, records, nextAppointment, currentMedications, allergies }: { patient: any; prescriptions: any[]; records: any[]; nextAppointment?: any; currentMedications: string; allergies: string }) {
  return (
    <aside className="space-y-5 xl:sticky xl:top-28 h-fit">
      <SidebarPanel title="Datos rapidos" icon={UserRound}>
        <InfoLine label="Paciente" value={getFullName(patient)} />
        <InfoLine label="Correo" value={patient?.email || 'Sin correo'} />
        <InfoLine label="Telefono" value={patient?.phone || 'Sin telefono'} />
      </SidebarPanel>

      <SidebarPanel title="Alertas clinicas" icon={AlertCircle}>
        <Tag tone={allergies ? 'rose' : 'emerald'}>{allergies || 'Sin alergias registradas'}</Tag>
        <Tag tone="blue">{currentMedications || 'Sin medicamentos actuales'}</Tag>
      </SidebarPanel>

      <SidebarPanel title="Recetas recientes" icon={Pill}>
        {prescriptions.length ? (
          <div className="space-y-2">
            {prescriptions.slice(0, 4).map((prescription) => (
              <div key={prescription.id} className="rounded-xl bg-gray-50 p-3">
                <p className="text-sm font-semibold text-gray-900">{formatMedications(prescription.medications)}</p>
                <p className="text-xs text-gray-500">{formatSimpleDate(prescription.created_at)}</p>
              </div>
            ))}
          </div>
        ) : (
          <SmallEmpty text="Sin recetas recientes." />
        )}
      </SidebarPanel>

      <SidebarPanel title="Historial rapido" icon={ClipboardList}>
        {records.length ? (
          <div className="space-y-2">
            {records.slice(0, 4).map((record) => (
              <div key={record.id} className="rounded-xl bg-gray-50 p-3">
                <p className="text-sm font-semibold text-gray-900">{record.diagnosis || 'Registro clinico'}</p>
                <p className="text-xs text-gray-500">{formatSimpleDate(record.created_at)}</p>
              </div>
            ))}
          </div>
        ) : (
          <SmallEmpty text="Sin registros previos." />
        )}
      </SidebarPanel>

      <SidebarPanel title="Proxima cita" icon={CalendarClock}>
        {nextAppointment ? (
          <div className="rounded-xl bg-blue-50 p-3">
            <p className="text-sm font-semibold text-blue-950">{formatDate(nextAppointment.appointment_date)}</p>
            <p className="text-xs text-blue-700">{nextAppointment.appointment_time} · {nextAppointment.reason_for_visit || 'Sin motivo'}</p>
          </div>
        ) : (
          <SmallEmpty text="Sin citas proximas." />
        )}
      </SidebarPanel>
    </aside>
  );
}

function ClinicalTimeline({ events }: { events: { id: string; date?: string; title: string; detail: string; type: string }[] }) {
  return (
    <section className="rounded-2xl bg-white border border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-4">
        <ClipboardList className="w-5 h-5 text-blue-600" />
        <h2 className="text-lg font-bold text-gray-900">Timeline clinica</h2>
      </div>
      {events.length === 0 ? (
        <EmptyState icon={Search} title="Sin timeline clinica" text="Consultas, recetas y citas apareceran aqui." compact />
      ) : (
        <div className="relative space-y-4">
          {events.map((event) => (
            <article key={event.id} className="grid grid-cols-[84px_1fr] gap-4">
              <div className="text-right">
                <p className="text-xs font-semibold text-gray-400">{formatSimpleDate(event.date)}</p>
                <p className="text-[11px] text-blue-600 font-semibold">{event.type}</p>
              </div>
              <div className="relative rounded-xl bg-gray-50 p-3">
                <span className="absolute -left-2 top-4 w-3 h-3 rounded-full bg-blue-600" />
                <p className="text-sm font-bold text-gray-900">{event.title}</p>
                <p className="text-sm text-gray-500 mt-1">{event.detail}</p>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function SidebarPanel({ title, icon: Icon, children }: { title: string; icon: any; children: any }) {
  return (
    <section className="rounded-2xl bg-white border border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-5 h-5 text-blue-600" />
        <h2 className="font-bold text-gray-900">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Input({ label, value, onChange, placeholder = '' }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <label>
      <span className="block text-sm font-semibold text-gray-700 mb-1">{label}</span>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full h-10 rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </label>
  );
}

function Textarea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="md:col-span-2">
      <span className="block text-sm font-semibold text-gray-700 mb-1">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={3}
        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </label>
  );
}

function ClinicalBadge({ label, value, tone }: { label: string; value: string; tone: 'rose' | 'emerald' | 'blue' | 'amber' }) {
  const styles = {
    rose: 'bg-rose-50 text-rose-800 border-rose-200',
    emerald: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    blue: 'bg-blue-50 text-blue-800 border-blue-200',
    amber: 'bg-amber-50 text-amber-800 border-amber-200',
  };
  return (
    <div className={`max-w-48 rounded-xl border px-3 py-2 ${styles[tone]}`}>
      <p className="text-[11px] font-semibold uppercase opacity-70">{label}</p>
      <p className="text-xs font-bold truncate">{value}</p>
    </div>
  );
}

function Tag({ tone, children }: { tone: 'rose' | 'emerald' | 'blue'; children: any }) {
  const styles = {
    rose: 'bg-rose-50 text-rose-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    blue: 'bg-blue-50 text-blue-700',
  };
  return <p className={`mb-2 last:mb-0 rounded-xl px-3 py-2 text-sm font-semibold ${styles[tone]}`}>{children}</p>;
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-t border-gray-100 py-2 first:border-t-0 first:pt-0 last:pb-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-semibold text-gray-900 text-right truncate">{value}</span>
    </div>
  );
}

function Alert({ tone, text }: { tone: 'rose' | 'emerald'; text: string }) {
  const styles = tone === 'rose' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700';
  return <div className={`rounded-xl border px-4 py-3 text-sm ${styles}`}>{text}</div>;
}

function EmptyState({ icon: Icon, title, text, compact = false }: { icon: any; title: string; text: string; compact?: boolean }) {
  return (
    <div className={`text-center ${compact ? 'py-5' : 'py-12'}`}>
      <Icon className={`${compact ? 'w-8 h-8' : 'w-14 h-14'} text-gray-300 mx-auto mb-3`} />
      <p className="font-semibold text-gray-700">{title}</p>
      <p className="text-sm text-gray-500 mt-1">{text}</p>
    </div>
  );
}

function SmallEmpty({ text }: { text: string }) {
  return <div className="rounded-xl bg-gray-50 p-4 text-center text-sm text-gray-500">{text}</div>;
}

function RecordSkeleton() {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-6 animate-pulse">
      <div className="space-y-5">
        <div className="h-44 rounded-2xl bg-gray-100" />
        <div className="h-64 rounded-2xl bg-gray-100" />
        <div className="h-96 rounded-2xl bg-gray-100" />
      </div>
      <div className="h-96 rounded-2xl bg-gray-100" />
    </div>
  );
}

function dedupePatients(patients: any[]) {
  return Array.from(new Map(patients.map((patient) => [patient.id, patient])).values());
}

function formatSimpleDate(value?: string) {
  if (!value) return 'Sin fecha';
  return new Date(value).toLocaleDateString('es-DO');
}

function formatMedications(value: any) {
  const medications = typeof value === 'string' ? safeJson(value) : value;
  if (!Array.isArray(medications) || medications.length === 0) return 'Sin medicamentos registrados';
  return medications.map((item) => `${item.name || item.medication || 'Medicamento'} ${item.dosage || ''} ${item.frequency || ''}`.trim()).join(', ');
}

function safeJson(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return [];
  }
}
