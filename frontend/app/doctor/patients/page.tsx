'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import DoctorShell from '@/components/DoctorShell';
import ManualPatientModal, { emptyManualPatientForm } from '@/components/ManualPatientModal';
import { appointmentAPI, doctorAPI, medicalAPI } from '@/utils/api';
import { formatDate } from '@/utils/helpers';
import { useI18n } from '@/i18n';
import {
  CalendarCheck,
  ClipboardList,
  FilePlus2,
  Mail,
  Phone,
  Pill,
  Plus,
  Search,
  UserRound,
  Users,
} from 'lucide-react';

type PatientStatus = 'all' | 'active' | 'pending' | 'inactive';

type PatientItem = {
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
  appointment_date?: string;
  appointment_time?: string;
  status?: PatientStatus;
};

type AppointmentItem = {
  id: string;
  patient_id?: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
};

const statusLabels: Record<PatientStatus, string> = {
  all: 'Todos',
  active: 'Activo',
  pending: 'Pendiente',
  inactive: 'Inactivo',
};

const statusClasses: Record<Exclude<PatientStatus, 'all'>, string> = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  inactive: 'bg-gray-50 text-gray-600 border-gray-200',
};

export default function DoctorPatientsPage() {
  const { locale } = useI18n();
  const en = locale === 'en';
  const [patients, setPatients] = useState<PatientItem[]>([]);
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [recordsByPatient, setRecordsByPatient] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<PatientStatus>('all');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [showManualForm, setShowManualForm] = useState(false);
  const [savingManualPatient, setSavingManualPatient] = useState(false);
  const [manualPatientForm, setManualPatientForm] = useState(emptyManualPatientForm);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      setLoading(false);
      return;
    }

    const user = JSON.parse(storedUser);
    setDoctorId(user.id);
    loadPatientWorkspace(user.id);
  }, []);

  const loadPatientWorkspace = async (doctorId: string) => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const [patientResponse, appointmentResponse] = await Promise.all([
        doctorAPI.getPatients(doctorId, { limit: 100 }),
        appointmentAPI.list({ limit: 100 }),
      ]);
      const uniquePatients = dedupePatients(patientResponse?.data || []);
      setPatients(uniquePatients);
      setAppointments(appointmentResponse?.data || []);
      const recordEntries = await Promise.all(
        uniquePatients.slice(0, 12).map(async (patient) => {
          try {
            const response = await medicalAPI.getPatientHistory(patient.id, { limit: 3 });
            return [patient.id, response?.data || []] as const;
          } catch {
            return [patient.id, []] as const;
          }
        })
      );
      setRecordsByPatient(Object.fromEntries(recordEntries));
    } catch (err) {
      console.error('Error loading patients:', err);
      setError(en ? 'Could not load the patient list.' : 'No se pudo cargar la lista de pacientes.');
    } finally {
      setLoading(false);
    }
  };

  const saveManualPatient = async (event: FormEvent) => {
    event.preventDefault();
    if (!doctorId) return;

    setSavingManualPatient(true);
    setError('');
    setSuccess('');
    try {
      const response = await doctorAPI.createManualPatient(doctorId, manualPatientForm);
      const patient = response?.data;
      setSuccess(en ? 'Patient registered successfully. You can now evaluate them and save their record.' : 'Paciente registrado correctamente. Ya puedes evaluarlo y guardar su expediente.');
      setManualPatientForm(emptyManualPatientForm);
      setShowManualForm(false);
      await loadPatientWorkspace(doctorId);
      if (patient?.id && window.confirm(en ? 'Patient registered. Start a consultation now?' : 'Paciente registrado. ¿Iniciar consulta ahora?')) {
        window.location.href = `/doctor/consultation?patientId=${patient.id}`;
      }
    } catch (err: any) {
      setError(err?.message || (en ? 'Could not register the patient.' : 'No se pudo registrar el paciente.'));
    } finally {
      setSavingManualPatient(false);
    }
  };

  const patientRows = useMemo(() => {
    return patients.map((patient) => {
      const patientAppointments = appointments
        .filter((appointment) => appointment.patient_id === patient.id)
        .sort((a, b) => `${a.appointment_date}T${a.appointment_time}`.localeCompare(`${b.appointment_date}T${b.appointment_time}`));
      const now = new Date().toISOString().split('T')[0];
      const past = patientAppointments.filter((appointment) => appointment.appointment_date < now || appointment.status === 'completed');
      const next = patientAppointments.find((appointment) => appointment.appointment_date >= now && !['completed', 'cancelled', 'no-show'].includes(appointment.status));
      const last = past[past.length - 1] || patientAppointments[patientAppointments.length - 1];
      const status = getPatientStatus(patient, last, next);
      const recentDiagnosis = recordsByPatient[patient.id]?.[0]?.diagnosis || (en ? 'No recent diagnosis' : 'Sin diagnóstico reciente');
      const clinicalBadge = getClinicalBadge(status, recentDiagnosis, recordsByPatient[patient.id]?.length || 0, en);

      return {
        ...patient,
        age: getAge(patient.birth_date || patient.date_of_birth, en),
        status,
        recentDiagnosis,
        clinicalBadge,
        lastAppointment: last,
        nextAppointment: next,
      };
    });
  }, [appointments, patients, recordsByPatient]);

  const filteredPatients = useMemo(() => {
    const term = search.toLowerCase().trim();
    return patientRows.filter((patient) => {
      const matchesStatus = statusFilter === 'all' || patient.status === statusFilter;
      const matchesSearch = !term || [
        patient.first_name,
        patient.last_name,
        patient.email,
        patient.phone,
        patient.document_number,
      ].filter(Boolean).join(' ').toLowerCase().includes(term);

      return matchesStatus && matchesSearch;
    });
  }, [patientRows, search, statusFilter]);

  return (
    <ProtectedRoute requiredRole="doctor">
      <DoctorShell
        title={en ? 'Patients' : 'Pacientes'}
        subtitle={en ? 'Clinical management, follow-up and quick access to patient profiles' : 'Gestión clínica, seguimiento y acceso rápido al perfil del paciente'}
        actions={
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={() => setShowManualForm(true)}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              {en ? 'Register patient' : 'Registrar paciente'}
            </button>
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={en ? 'Name, phone, email or document...' : 'Nombre, teléfono, correo o documento...'}
                className="h-10 w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-gray-200 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        }
      >
        <div className="space-y-6">
          {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
          {success && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>}
          {showManualForm && (
            <ManualPatientModal
              form={manualPatientForm}
              saving={savingManualPatient}
              onChange={setManualPatientForm}
              onClose={() => setShowManualForm(false)}
              onSubmit={saveManualPatient}
            />
          )}

          <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Metric title={en ? 'Patients' : 'Pacientes'} value={patientRows.length} icon={Users} />
            <Metric title={en ? 'Active' : 'Activos'} value={patientRows.filter((p) => p.status === 'active').length} icon={UserRound} />
            <Metric title={en ? 'Pending' : 'Pendientes'} value={patientRows.filter((p) => p.status === 'pending').length} icon={CalendarCheck} />
            <Metric title={en ? 'Results' : 'Resultados'} value={filteredPatients.length} icon={Search} />
          </section>

          <section className="rounded-2xl bg-white border border-gray-200 p-4">
            <div className="flex flex-wrap gap-2">
              {(['all', 'active', 'pending', 'inactive'] as PatientStatus[]).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`h-9 px-3 rounded-xl text-sm font-semibold transition-colors ${
                    statusFilter === status ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {en ? ({ all: 'All', active: 'Active', pending: 'Pending', inactive: 'Inactive' } as Record<PatientStatus, string>)[status] : statusLabels[status]}
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-2xl bg-white border border-gray-200 overflow-hidden">
            <div className="hidden xl:grid grid-cols-[1.3fr_0.7fr_1fr_1fr_0.7fr_0.8fr] gap-4 px-5 py-3 bg-gray-50 text-xs font-semibold uppercase text-gray-400">
              <span>{en ? 'Patient' : 'Paciente'}</span>
              <span>{en ? 'Age' : 'Edad'}</span>
              <span>{en ? 'Contact' : 'Contacto'}</span>
              <span>{en ? 'Appointments' : 'Citas'}</span>
              <span>{en ? 'Status' : 'Estado'}</span>
              <span>{en ? 'Actions' : 'Acciones'}</span>
            </div>

            {loading ? (
              [...Array(6)].map((_, index) => <PatientSkeleton key={index} />)
            ) : filteredPatients.length === 0 ? (
              <EmptyState en={en} />
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredPatients.map((patient) => (
                  <PatientRow key={patient.id} patient={patient} en={en} />
                ))}
              </div>
            )}
          </section>
        </div>
      </DoctorShell>
    </ProtectedRoute>
  );
}

function PatientRow({ patient, en }: { patient: PatientItem & { age: string; status: Exclude<PatientStatus, 'all'>; recentDiagnosis: string; clinicalBadge: { label: string; className: string }; lastAppointment?: AppointmentItem; nextAppointment?: AppointmentItem }; en: boolean }) {
  return (
    <article className="p-5 hover:bg-gray-50 transition-colors">
      <div className="grid grid-cols-1 xl:grid-cols-[1.3fr_0.7fr_1fr_1fr_0.7fr_0.8fr] gap-4 xl:items-center">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold shrink-0">
            {(patient.first_name?.[0] || 'P')}{patient.last_name?.[0] || ''}
          </div>
          <div className="min-w-0">
            <h2 className="font-bold text-gray-900 truncate">{patient.first_name} {patient.last_name}</h2>
            <div className="mt-1 flex flex-wrap gap-2">
              <p className="text-xs text-gray-500 truncate">{patient.document_number || (en ? 'No document registered' : 'Sin documento registrado')}</p>
              <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${patient.clinicalBadge.className}`}>{patient.clinicalBadge.label}</span>
            </div>
          </div>
        </div>

        <InfoStack label={en ? 'Age' : 'Edad'} value={patient.age} />

        <div className="space-y-1 text-sm text-gray-600">
          <p className="inline-flex items-center gap-1.5"><Phone className="w-4 h-4 text-gray-400" />{patient.phone || (en ? 'No phone' : 'Sin teléfono')}</p>
          <p className="block truncate"><Mail className="inline w-4 h-4 text-gray-400 mr-1.5" />{patient.email || (en ? 'No email' : 'Sin correo')}</p>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <InfoStack label={en ? 'Last' : 'Última'} value={patient.lastAppointment ? formatDate(patient.lastAppointment.appointment_date) : (en ? 'No appointments' : 'Sin citas')} />
          <InfoStack label={en ? 'Next' : 'Próxima'} value={patient.nextAppointment ? formatDate(patient.nextAppointment.appointment_date) : (en ? 'Not scheduled' : 'No agendada')} />
        </div>

        <div className="space-y-2">
          <span className={`w-fit inline-flex border px-2.5 py-1 rounded-full text-xs font-semibold ${statusClasses[patient.status]}`}>
            {en ? ({ active: 'Active', pending: 'Pending', inactive: 'Inactive' } as Record<string, string>)[patient.status] : statusLabels[patient.status]}
          </span>
          <p className="text-xs text-gray-500">{patient.recentDiagnosis}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href={`/doctor/patients/${patient.id}`} className="h-10 px-3 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 inline-flex items-center">
            {en ? 'View profile' : 'Ver perfil'}
          </Link>
          <Link href={`/doctor/consultation?patientId=${patient.id}${patient.nextAppointment ? `&appointmentId=${patient.nextAppointment.id}` : ''}`} className="h-10 px-3 rounded-xl border border-blue-200 text-blue-700 text-sm font-semibold hover:bg-blue-50 inline-flex items-center" title={en ? 'Start consultation' : 'Iniciar consulta'} aria-label={en ? 'Start consultation' : 'Iniciar consulta'}>
            <ClipboardList className="w-4 h-4" />
          </Link>
          <Link href={`/doctor/medical-records?patientId=${patient.id}`} className="h-10 px-3 rounded-xl border border-gray-200 text-sm font-semibold hover:bg-white inline-flex items-center" title={en ? 'New medical record' : 'Nuevo registro médico'} aria-label={en ? 'New medical record' : 'Nuevo registro médico'}>
            <FilePlus2 className="w-4 h-4" />
          </Link>
          <Link href={`/doctor/prescriptions?patientId=${patient.id}`} className="h-10 px-3 rounded-xl border border-gray-200 text-sm font-semibold hover:bg-white inline-flex items-center" title={en ? 'New prescription' : 'Nueva receta'} aria-label={en ? 'New prescription' : 'Nueva receta'}>
            <Pill className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </article>
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

function InfoStack({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-gray-400">{label}</p>
      <p className="text-sm font-semibold text-gray-800">{value}</p>
    </div>
  );
}

function EmptyState({ en }: { en: boolean }) {
  return (
    <div className="p-12 text-center">
      <UserRound className="w-14 h-14 text-gray-300 mx-auto mb-3" />
      <p className="font-semibold text-gray-700">{en ? 'No patients to display' : 'No hay pacientes para mostrar'}</p>
      <p className="text-sm text-gray-500 mt-1">{en ? 'Adjust the search or status filter.' : 'Ajusta la búsqueda o el filtro de estado.'}</p>
    </div>
  );
}

function PatientSkeleton() {
  return (
    <div className="p-5 animate-pulse flex items-center gap-4">
      <div className="w-12 h-12 rounded-full bg-gray-100" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-gray-100 rounded w-1/3" />
        <div className="h-3 bg-gray-100 rounded w-1/2" />
      </div>
      <div className="hidden md:block h-10 bg-gray-100 rounded-xl w-28" />
    </div>
  );
}

function dedupePatients(patients: PatientItem[]) {
  return Array.from(new Map(patients.map((patient) => [patient.id, patient])).values());
}

function getPatientStatus(patient: PatientItem, last?: AppointmentItem, next?: AppointmentItem): Exclude<PatientStatus, 'all'> {
  if (patient.status && patient.status !== 'all') return patient.status;
  if (next) return 'pending';
  if (last) return 'active';
  return 'inactive';
}

function getClinicalBadge(status: Exclude<PatientStatus, 'all'>, diagnosis: string, recordCount: number, en: boolean) {
  if (diagnosis.toLowerCase().includes('crit')) {
    return { label: en ? 'critical' : 'crítico', className: 'bg-rose-50 text-rose-700' };
  }
  if (status === 'pending') {
    return { label: en ? 'pending' : 'pendiente', className: 'bg-amber-50 text-amber-700' };
  }
  if (recordCount > 0) {
    return { label: en ? 'follow-up' : 'seguimiento', className: 'bg-blue-50 text-blue-700' };
  }
  return { label: en ? 'new' : 'nuevo', className: 'bg-emerald-50 text-emerald-700' };
}

function getAge(birthDate?: string, en = false) {
  if (!birthDate) return en ? 'Not available' : 'No disponible';
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return en ? 'Not available' : 'No disponible';
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDelta = today.getMonth() - birth.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birth.getDate())) age -= 1;
  return `${age} ${en ? 'years' : 'años'}`;
}
