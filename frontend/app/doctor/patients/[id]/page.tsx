'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import DoctorShell from '@/components/DoctorShell';
import { appointmentAPI, doctorAPI, medicalAPI } from '@/utils/api';
import { formatDate } from '@/utils/helpers';
import {
  Activity,
  AlertCircle,
  CalendarCheck,
  ClipboardList,
  FileText,
  Mail,
  NotebookTabs,
  Phone,
  Pill,
  PlusCircle,
  Stethoscope,
  UserRound,
} from 'lucide-react';

type Patient = {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  document_number?: string;
  date_of_birth?: string;
  birth_date?: string;
  address?: string;
  city?: string;
};

type Appointment = {
  id: string;
  patient_id?: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  reason_for_visit?: string;
};

const mockClinicalSummary = {
  personalHistory: ['Sin antecedentes personales registrados en sistema.'],
  familyHistory: ['Sin antecedentes familiares registrados en sistema.'],
  allergies: ['No registra alergias documentadas.'],
  currentMedications: ['Sin medicamentos actuales documentados.'],
  documents: [
    { name: 'Resultados de laboratorio', date: 'Pendiente de carga', type: 'PDF' },
    { name: 'Imagen diagnostica', date: 'Pendiente de carga', type: 'Archivo' },
  ],
};

const appointmentStatus: Record<string, string> = {
  scheduled: 'Programada',
  confirmed: 'Confirmada',
  waiting: 'En espera',
  completed: 'Completada',
  cancelled: 'Cancelada',
  'no-show': 'No asistió',
};

export default function DoctorPatientProfilePage() {
  const params = useParams();
  const patientId = String(params?.id || '');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser || !patientId) {
      setLoading(false);
      return;
    }

    const user = JSON.parse(storedUser);
    loadPatientProfile(user.id, patientId);
  }, [patientId]);

  const patient = useMemo(
    () => patients.find((item) => item.id === patientId),
    [patientId, patients]
  );

  const patientAppointments = useMemo(
    () => appointments
      .filter((appointment) => appointment.patient_id === patientId)
      .sort((a, b) => `${b.appointment_date}T${b.appointment_time}`.localeCompare(`${a.appointment_date}T${a.appointment_time}`)),
    [appointments, patientId]
  );

  const loadPatientProfile = async (doctorId: string, currentPatientId: string) => {
    setLoading(true);
    setError('');
    try {
      const [patientResponse, appointmentResponse, recordResponse, prescriptionResponse] = await Promise.all([
        doctorAPI.getPatients(doctorId, { limit: 100 }),
        appointmentAPI.list({ limit: 100 }),
        medicalAPI.getPatientHistory(currentPatientId),
        medicalAPI.getPatientPrescriptions(currentPatientId),
      ]);

      setPatients(Array.from(new Map((patientResponse?.data || []).map((item: Patient) => [item.id, item])).values()) as Patient[]);
      setAppointments(appointmentResponse?.data || []);
      setRecords(recordResponse?.data || []);
      setPrescriptions(prescriptionResponse?.data || []);
    } catch (err) {
      console.error('Error loading patient profile:', err);
      setError('No se pudo cargar el perfil del paciente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute requiredRole="doctor">
      <DoctorShell
        title={patient ? `${patient.first_name} ${patient.last_name}` : 'Perfil del paciente'}
        subtitle="Datos clínicos, historial y acciones rápidas"
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href={`/doctor/medical-records?patientId=${patientId}`} className="h-10 px-3 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 inline-flex items-center gap-2">
              <Stethoscope className="w-4 h-4" />
              Nueva consulta
            </Link>
            <Link href={`/doctor/prescriptions?patientId=${patientId}`} className="h-10 px-3 rounded-xl border border-gray-200 text-sm font-semibold hover:bg-white inline-flex items-center gap-2">
              <Pill className="w-4 h-4" />
              Nueva receta
            </Link>
          </div>
        }
      >
        <div className="space-y-6">
          {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

          {loading ? (
            <ProfileSkeleton />
          ) : !patient ? (
            <EmptyState icon={UserRound} title="Paciente no encontrado" text="No aparece en la lista de pacientes asociados a este médico." />
          ) : (
            <>
              <section className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-6">
                <div className="rounded-2xl bg-white border border-gray-200 p-6">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xl font-bold">
                      {(patient.first_name?.[0] || 'P')}{patient.last_name?.[0] || ''}
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-xl font-bold text-gray-900 truncate">{patient.first_name} {patient.last_name}</h2>
                      <p className="text-sm text-gray-500">{patient.document_number || 'Documento no registrado'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InfoCard label="Edad" value={getAge(patient.birth_date || patient.date_of_birth)} icon={UserRound} />
                    <InfoCard label="Teléfono" value={patient.phone || 'Sin teléfono'} icon={Phone} />
                    <InfoCard label="Correo" value={patient.email || 'Sin correo'} icon={Mail} />
                    <InfoCard label="Dirección" value={patient.address || 'Sin dirección'} icon={NotebookTabs} />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Metric title="Citas" value={patientAppointments.length} icon={CalendarCheck} />
                  <Metric title="Registros" value={records.length} icon={ClipboardList} />
                  <Metric title="Recetas" value={prescriptions.length} icon={Pill} />
                </div>
              </section>

              <section className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6">
                <div className="space-y-6">
                  <Panel title="Historia clínica estructurada" icon={ClipboardList}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <ClinicalBlock title="Antecedentes personales" items={mockClinicalSummary.personalHistory} />
                      <ClinicalBlock title="Antecedentes familiares" items={mockClinicalSummary.familyHistory} />
                      <ClinicalBlock title="Alergias" items={mockClinicalSummary.allergies} />
                      <ClinicalBlock title="Medicamentos actuales" items={mockClinicalSummary.currentMedications} />
                    </div>
                  </Panel>

                  <Panel title="Registros médicos" icon={FileText}>
                    {records.length === 0 ? (
                      <EmptyState icon={ClipboardList} title="Sin registros" text="Crea una nueva consulta para iniciar la historia clínica." compact />
                    ) : (
                      <div className="divide-y divide-gray-100">
                        {records.slice(0, 5).map((record) => (
                          <article key={record.id} className="py-4 first:pt-0 last:pb-0">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
                              <h3 className="font-bold text-gray-900">{record.diagnosis || 'Registro clínico'}</h3>
                              <span className="text-xs text-gray-500">{formatRecordDate(record.created_at)}</span>
                            </div>
                            <p className="text-sm text-gray-600"><strong>Motivo/Sintomas:</strong> {record.symptoms || 'No registrado'}</p>
                            <p className="text-sm text-gray-600 mt-1"><strong>Tratamiento:</strong> {record.treatment || 'No registrado'}</p>
                            <div className="mt-3 flex flex-wrap gap-2 text-xs">
                              <ClinicalPill label="PA" value={record.blood_pressure} />
                              <ClinicalPill label="FC" value={record.heart_rate ? `${record.heart_rate} lpm` : ''} />
                              <ClinicalPill label="Peso" value={record.weight ? `${record.weight} kg` : ''} />
                              <ClinicalPill label="Altura" value={record.height ? `${record.height} cm` : ''} />
                              <ClinicalPill label="IMC" value={record.bmi} />
                            </div>
                            {record.notes && <p className="text-sm text-gray-500 mt-2">{record.notes}</p>}
                          </article>
                        ))}
                      </div>
                    )}
                  </Panel>

                  <Panel title="Recetas emitidas" icon={Pill}>
                    {prescriptions.length === 0 ? (
                      <EmptyState icon={Pill} title="Sin recetas" text="Las recetas emitidas para este paciente apareceran aqui." compact />
                    ) : (
                      <div className="divide-y divide-gray-100">
                        {prescriptions.slice(0, 5).map((prescription) => (
                          <article key={prescription.id} className="py-4 first:pt-0 last:pb-0">
                            <div className="flex items-start justify-between gap-3">
                              <p className="font-bold text-gray-900">{formatMedications(prescription.medications)}</p>
                              <span className="text-xs text-gray-500">{formatRecordDate(prescription.created_at)}</span>
                            </div>
                            {prescription.notes && <p className="text-sm text-gray-500 mt-2">{prescription.notes}</p>}
                          </article>
                        ))}
                      </div>
                    )}
                  </Panel>
                </div>

                <aside className="space-y-6">
                  <Panel title="Acciones rapidas" icon={PlusCircle}>
                    <div className="grid grid-cols-1 gap-2">
                      <Link href={`/doctor/medical-records?patientId=${patientId}`} className="h-11 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 flex items-center justify-center">Nueva consulta</Link>
                      <Link href={`/doctor/prescriptions?patientId=${patientId}`} className="h-11 rounded-xl border border-gray-200 text-sm font-semibold hover:bg-gray-50 flex items-center justify-center">Nueva receta</Link>
                      <Link href="/appointments" className="h-11 rounded-xl border border-gray-200 text-sm font-semibold hover:bg-gray-50 flex items-center justify-center">Nueva cita</Link>
                      <button className="h-11 rounded-xl border border-gray-200 text-sm font-semibold text-gray-500 cursor-not-allowed">Editar paciente</button>
                    </div>
                  </Panel>

                  <Panel title="Historial de citas" icon={CalendarCheck}>
                    {patientAppointments.length === 0 ? (
                      <EmptyState icon={CalendarCheck} title="Sin citas" text="No hay citas asociadas." compact />
                    ) : (
                      <div className="space-y-3">
                        {patientAppointments.slice(0, 6).map((appointment) => (
                          <div key={appointment.id} className="rounded-xl bg-gray-50 p-3">
                            <p className="text-sm font-semibold text-gray-900">{formatDate(appointment.appointment_date)} · {appointment.appointment_time}</p>
                            <p className="text-xs text-gray-500">{appointmentStatus[appointment.status] || appointment.status}</p>
                            {appointment.reason_for_visit && <p className="text-xs text-gray-500 mt-1">{appointment.reason_for_visit}</p>}
                          </div>
                        ))}
                      </div>
                    )}
                  </Panel>

                  <Panel title="Documentos y adjuntos" icon={FileText}>
                    <div className="space-y-3">
                      {mockClinicalSummary.documents.map((document) => (
                        <div key={document.name} className="rounded-xl border border-gray-100 p-3">
                          <p className="text-sm font-semibold text-gray-900">{document.name}</p>
                          <p className="text-xs text-gray-500">{document.type} · {document.date}</p>
                        </div>
                      ))}
                    </div>
                  </Panel>

                  <Panel title="Notas clínicas recientes" icon={Activity}>
                    {records[0]?.notes ? (
                      <p className="text-sm text-gray-600">{records[0].notes}</p>
                    ) : (
                      <EmptyState icon={AlertCircle} title="Sin notas recientes" text="Aún no hay notas registradas." compact />
                    )}
                  </Panel>
                </aside>
              </section>
            </>
          )}
        </div>
      </DoctorShell>
    </ProtectedRoute>
  );
}

function Panel({ title, icon: Icon, children }: { title: string; icon: any; children: any }) {
  return (
    <section className="rounded-2xl bg-white border border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-5 h-5 text-blue-600" />
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function ClinicalPill({ label, value }: { label: string; value?: string | number }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <span className="rounded-full bg-blue-50 px-2.5 py-1 font-semibold text-blue-800">
      {label}: {value}
    </span>
  );
}

function Metric({ title, value, icon: Icon }: { title: string; value: number; icon: any }) {
  return (
    <div className="rounded-2xl bg-white border border-gray-200 p-5">
      <Icon className="w-5 h-5 text-blue-600 mb-3" />
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm text-gray-500">{title}</p>
    </div>
  );
}

function InfoCard({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
  return (
    <div className="rounded-xl bg-gray-50 p-4 min-w-0">
      <Icon className="w-4 h-4 text-gray-400 mb-2" />
      <p className="text-xs font-semibold uppercase text-gray-400">{label}</p>
      <p className="text-sm font-semibold text-gray-800 truncate">{value}</p>
    </div>
  );
}

function ClinicalBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-xl bg-gray-50 p-4">
      <p className="font-semibold text-gray-900 mb-2">{title}</p>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item} className="text-sm text-gray-600">{item}</li>
        ))}
      </ul>
    </div>
  );
}

function EmptyState({ icon: Icon, title, text, compact = false }: { icon: any; title: string; text: string; compact?: boolean }) {
  return (
    <div className={`text-center ${compact ? 'py-4' : 'py-12'}`}>
      <Icon className={`${compact ? 'w-8 h-8' : 'w-14 h-14'} text-gray-300 mx-auto mb-3`} />
      <p className="font-semibold text-gray-700">{title}</p>
      <p className="text-sm text-gray-500 mt-1">{text}</p>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-48 rounded-2xl bg-gray-100" />
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6">
        <div className="h-96 rounded-2xl bg-gray-100" />
        <div className="h-96 rounded-2xl bg-gray-100" />
      </div>
    </div>
  );
}

function getAge(birthDate?: string) {
  if (!birthDate) return 'No disponible';
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return 'No disponible';
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDelta = today.getMonth() - birth.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birth.getDate())) age -= 1;
  return `${age} años`;
}

function formatRecordDate(value?: string) {
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
