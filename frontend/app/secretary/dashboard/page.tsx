'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import DoctorShell from '@/components/DoctorShell';
import ManualPatientModal, { emptyManualPatientForm } from '@/components/ManualPatientModal';
import NotificationBell from '@/components/NotificationBell';
import { appointmentAPI, doctorAPI, secretaryAPI } from '@/utils/api';
import { getUserGreeting } from '@/utils/helpers';
import { formatDoctorName } from '@/utils/names';
import {
  CalendarCheck,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Home,
  Link2,
  LogOut,
  Mail,
  Menu,
  Phone,
  RefreshCw,
  Search,
  Stethoscope,
  UserPlus,
  Users,
  Video,
  X,
} from 'lucide-react';

type SecretaryForm = {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  password: string;
};

const emptyForm: SecretaryForm = { email: '', firstName: '', lastName: '', phone: '', password: '' };

const statusLabels: Record<string, string> = {
  scheduled: 'Programada',
  confirmed: 'Confirmada',
  completed: 'Completada',
  cancelled: 'Cancelada',
  'no-show': 'No asistio',
};

const statusClasses: Record<string, string> = {
  scheduled: 'bg-blue-50 text-blue-700 border-blue-200',
  confirmed: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelled: 'bg-rose-50 text-rose-700 border-rose-200',
  'no-show': 'bg-orange-50 text-orange-700 border-orange-200',
};

const activeStatuses = ['scheduled', 'confirmed'];

function toDisplayDateKey(value?: string) {
  const raw = String(value || '').trim();
  if (!raw) return '';

  const displayMatch = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (displayMatch) return raw;

  const [datePart] = raw.split('T');
  const isoMatch = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return `${day}/${month}/${year}`;
  }

  return raw;
}

function todayDisplayDate() {
  const today = new Date();
  const day = String(today.getDate()).padStart(2, '0');
  const month = String(today.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${today.getFullYear()}`;
}

export default function SecretaryDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [secretaries, setSecretaries] = useState<any[]>([]);
  const [assignedDoctors, setAssignedDoctors] = useState<any[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState<SecretaryForm>(emptyForm);
  const [emailResults, setEmailResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ firstName: '', lastName: '', phone: '', doctorId: '' });
  const [statusFilter, setStatusFilter] = useState('active');
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [showManualPatientForm, setShowManualPatientForm] = useState(false);
  const [savingManualPatient, setSavingManualPatient] = useState(false);
  const [manualPatientForm, setManualPatientForm] = useState(emptyManualPatientForm);
  const [rescheduleTarget, setRescheduleTarget] = useState<any>(null);
  const [cancelTarget, setCancelTarget] = useState<any>(null);
  const [rescheduleForm, setRescheduleForm] = useState({ appointmentDate: '', appointmentTime: '' });
  const [cancelReason, setCancelReason] = useState('');

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const parsed = JSON.parse(userData);
      setUser(parsed);
      loadData(parsed);
      return;
    }
    loadData();
  }, []);

  useEffect(() => {
    const email = form.email.trim();
    if (user?.role !== 'doctor' || email.length < 3) {
      setEmailResults([]);
      return;
    }

    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const response = await secretaryAPI.search(email);
        setEmailResults(response.data || []);
      } catch (err) {
        console.error('Error searching secretary email', err);
      } finally {
        setSearching(false);
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [form.email, user?.role]);

  const assignedIds = useMemo(() => new Set(secretaries.map((item) => item.id)), [secretaries]);

  const loadData = async (currentUser = user) => {
    try {
      setLoading(true);
      if (currentUser?.role === 'doctor') {
        const response = await secretaryAPI.list();
        setSecretaries(response.data || []);
      }

      if (currentUser?.role === 'secretary') {
        const doctorsResponse = await secretaryAPI.assignedDoctors();
        const doctors = doctorsResponse.data || [];
        setAssignedDoctors(doctors);

        const storedDoctorId = localStorage.getItem('secretarySelectedDoctorId') || '';
        const nextDoctorId = doctors.some((doctor: any) => doctor.id === storedDoctorId)
          ? storedDoctorId
          : doctors[0]?.id || '';
        setSelectedDoctorId(nextDoctorId);

        const response = await appointmentAPI.list({ page: 1, limit: 100, ...(nextDoctorId ? { doctorId: nextDoctorId } : {}) });
        setAppointments(response.data || []);
      }
    } catch (err) {
      console.error('Error loading data', err);
      setError('No se pudo cargar el equipo de apoyo.');
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    await loadData(user);
  };

  const changeSelectedDoctor = async (doctorId: string) => {
    setSelectedDoctorId(doctorId);
    localStorage.setItem('secretarySelectedDoctorId', doctorId);
    setLoading(true);
    setError('');
    try {
      const response = await appointmentAPI.list({ page: 1, limit: 100, ...(doctorId ? { doctorId } : {}) });
      setAppointments(response.data || []);
    } catch (err: any) {
      setError(err.message || 'No se pudo cargar la agenda del medico seleccionado.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAppointmentStatus = async (appointmentId: string, status: string) => {
    setError('');
    setSuccess('');
    try {
      await appointmentAPI.update(appointmentId, { status });
      setSuccess('Cita actualizada.');
      await loadData(user);
    } catch (err: any) {
      setError(err.message || 'No se pudo actualizar la cita.');
    }
  };

  const openRescheduleModal = (appointment: any) => {
    setRescheduleTarget(appointment);
    setRescheduleForm({
      appointmentDate: String(appointment.appointment_date || '').slice(0, 10),
      appointmentTime: String(appointment.appointment_time || '').slice(0, 5),
    });
  };

  const handleRescheduleAppointment = async () => {
    if (!rescheduleTarget) return;
    setActionLoading(true);
    setError('');
    setSuccess('');
    try {
      await appointmentAPI.update(rescheduleTarget.id, {
        appointmentDate: rescheduleForm.appointmentDate,
        appointmentTime: rescheduleForm.appointmentTime,
      });
      setSuccess('Cita reagendada.');
      setRescheduleTarget(null);
      await loadData(user);
    } catch (err: any) {
      setError(err.message || 'No se pudo reagendar la cita.');
    } finally {
      setActionLoading(false);
    }
  };

  const openCancelModal = (appointment: any) => {
    setCancelTarget(appointment);
    setCancelReason('');
  };

  const handleCancelAppointment = async () => {
    if (!cancelTarget) return;
    setActionLoading(true);
    setError('');
    setSuccess('');
    try {
      await appointmentAPI.cancel(cancelTarget.id, cancelReason.trim());
      setSuccess('Cita cancelada.');
      setCancelTarget(null);
      await loadData(user);
    } catch (err: any) {
      setError(err.message || 'No se pudo cancelar la cita.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleManualPatientCreate = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedDoctorId) {
      setError('Selecciona un medico antes de registrar el paciente.');
      return;
    }

    setSavingManualPatient(true);
    setError('');
    setSuccess('');
    try {
      await doctorAPI.createManualPatient(selectedDoctorId, manualPatientForm);
      setSuccess('Paciente registrado correctamente. El medico ya puede evaluarlo en su modulo clinico.');
      setManualPatientForm(emptyManualPatientForm);
      setShowManualPatientForm(false);
      await loadData(user);
    } catch (err: any) {
      setError(err.message || 'No se pudo registrar el paciente.');
    } finally {
      setSavingManualPatient(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const sortedAppointments = useMemo(() => {
    return [...appointments].sort((a, b) => {
      const left = `${a.appointment_date}T${String(a.appointment_time || '00:00').slice(0, 5)}`;
      const right = `${b.appointment_date}T${String(b.appointment_time || '00:00').slice(0, 5)}`;
      return left.localeCompare(right);
    });
  }, [appointments]);

  const filteredAppointments = useMemo(() => {
    const term = search.trim().toLowerCase();
    return sortedAppointments.filter((appointment) => {
      if (dateFilter && toDisplayDateKey(appointment.appointment_date) !== toDisplayDateKey(dateFilter)) return false;
      if (statusFilter === 'active' && !activeStatuses.includes(appointment.status)) return false;
      if (statusFilter !== 'active' && statusFilter !== 'all' && appointment.status !== statusFilter) return false;
      if (!term) return true;

      return [
        appointment.first_name,
        appointment.last_name,
        appointment.email,
        appointment.phone,
        appointment.reason_for_visit,
        appointment.health_center_name,
      ].filter(Boolean).join(' ').toLowerCase().includes(term);
    });
  }, [dateFilter, search, sortedAppointments, statusFilter]);

  const today = todayDisplayDate();
  const todayAppointments = sortedAppointments.filter((appointment) => toDisplayDateKey(appointment.appointment_date) === today && activeStatuses.includes(appointment.status));
  const confirmedAppointments = sortedAppointments.filter((appointment) => appointment.status === 'confirmed');
  const pendingAppointments = sortedAppointments.filter((appointment) => appointment.status === 'scheduled');
  const nextAppointment = sortedAppointments.find((appointment) => activeStatuses.includes(appointment.status));
  const selectedDoctor = assignedDoctors.find((doctor) => doctor.id === selectedDoctorId) || assignedDoctors[0];

  const createOrLinkSecretary = async (payload: any, linked = false) => {
    const response = await secretaryAPI.create(payload);
    setSuccess(linked || response.data?.linkedExisting ? 'Secretaria existente asociada.' : 'Secretaria creada y asociada.');
    if (response.data?.temporaryPassword) {
      setSuccess(`Secretaria creada. Contrasena temporal: ${response.data.temporaryPassword}`);
    }
    setForm(emptyForm);
    setEmailResults([]);
    await loadData();
  };

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await createOrLinkSecretary({ ...form });
    } catch (err: any) {
      if (err.code === 'EXISTING_SECRETARY') {
        const existing = err.data;
        const shouldLink = confirm(`El correo ya pertenece a ${existing?.firstName || ''} ${existing?.lastName || ''}. ¿Asociar esta cuenta a tu equipo?`);
        if (shouldLink) {
          try {
            await createOrLinkSecretary({ ...form, linkExisting: true }, true);
          } catch (linkErr: any) {
            setError(linkErr.message || 'No se pudo asociar la secretaria existente.');
          }
        }
      } else {
        setError(err.message || 'No se pudo crear o asociar la secretaria.');
      }
    } finally {
      setSaving(false);
    }
  };

  const linkExisting = async (secretary: any) => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await createOrLinkSecretary({
        email: secretary.email,
        firstName: secretary.first_name,
        lastName: secretary.last_name,
        phone: secretary.phone || '',
        linkExisting: true,
      }, true);
    } catch (err: any) {
      setError(err.message || 'No se pudo asociar la secretaria.');
    } finally {
      setSaving(false);
    }
  };

  const content = (
    <div className="space-y-6">
      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
      {success && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>}
      {showManualPatientForm && (
        <ManualPatientModal
          form={manualPatientForm}
          saving={savingManualPatient}
          onChange={setManualPatientForm}
          onClose={() => setShowManualPatientForm(false)}
          onSubmit={handleManualPatientCreate}
        />
      )}

      {user?.role === 'secretary' ? (
        <>
          <section className="rounded-2xl bg-white border border-gray-200 p-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase text-gray-400">Trabajando con</p>
                <h2 className="text-xl font-bold text-gray-950 truncate">
                  {selectedDoctor ? formatDoctorName(selectedDoctor.first_name, selectedDoctor.last_name) : 'Sin medico asignado'}
                </h2>
                <p className="text-sm text-gray-500 truncate">
                  {selectedDoctor?.health_center_name || 'Centro no asignado'}
                  {selectedDoctor?.specialties?.length ? ` · ${selectedDoctor.specialties.join(', ')}` : ''}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 lg:items-center">
                <label className="block">
                  <span className="sr-only">Seleccionar medico</span>
                  <select
                    value={selectedDoctorId}
                    onChange={(event) => changeSelectedDoctor(event.target.value)}
                    disabled={assignedDoctors.length <= 1 || loading}
                    className="h-11 w-full sm:w-80 rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                  >
                    {assignedDoctors.length === 0 ? (
                      <option value="">Sin medicos asignados</option>
                    ) : (
                      assignedDoctors.map((doctor) => (
                        <option key={doctor.id} value={doctor.id}>
                          {formatDoctorName(doctor.first_name, doctor.last_name)}
                        </option>
                      ))
                    )}
                  </select>
                </label>
                <span className="inline-flex h-11 items-center rounded-xl bg-blue-50 px-3 text-sm font-semibold text-blue-700">
                  {assignedDoctors.length} medico{assignedDoctors.length === 1 ? '' : 's'}
                </span>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <MetricCard label="Citas hoy" value={todayAppointments.length} icon={CalendarCheck} tone="blue" />
            <MetricCard label="Por confirmar" value={pendingAppointments.length} icon={Clock3} tone="amber" />
            <MetricCard label="Confirmadas" value={confirmedAppointments.length} icon={CheckCircle2} tone="emerald" />
            <MetricCard label="Agenda visible" value={appointments.length} icon={Users} tone="slate" />
          </section>

          <section className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6">
            <div className="rounded-2xl bg-white border border-gray-200 overflow-hidden">
              <div className="p-5 border-b border-gray-100">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Agenda de {selectedDoctor ? formatDoctorName(selectedDoctor.first_name, selectedDoctor.last_name) : 'medico asignado'}</h2>
                    <p className="text-sm text-gray-500">Confirma, reagenda y revisa citas medicas</p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      type="button"
                      onClick={() => setShowManualPatientForm(true)}
                      disabled={!selectedDoctorId}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <UserPlus className="h-4 w-4" />
                      Registrar paciente
                    </button>
                    <div className="flex gap-2">
                      <input
                        value={dateFilter}
                        onChange={(event) => setDateFilter(event.target.value)}
                        type="text"
                        inputMode="numeric"
                        placeholder="dd/mm/aaaa"
                        pattern="\d{2}/\d{2}/\d{4}"
                        className="h-10 w-full sm:w-40 rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {dateFilter && (
                        <button
                          type="button"
                          onClick={() => setDateFilter('')}
                          className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                        >
                          Todas
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Buscar paciente..."
                        className="h-10 w-full sm:w-56 rounded-xl border border-gray-200 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap rounded-xl border border-gray-200 bg-gray-50 p-1 gap-1">
                  {[
                    ['active', 'Activas'],
                    ['scheduled', 'Programadas'],
                    ['confirmed', 'Confirmadas'],
                    ['completed', 'Completadas'],
                    ['cancelled', 'Canceladas'],
                    ['all', 'Todas'],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      onClick={() => {
                        setStatusFilter(value);
                        if (value === 'active') setDateFilter('');
                      }}
                      className={`h-8 px-3 rounded-lg text-xs font-semibold transition-colors ${
                        statusFilter === value ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="divide-y divide-gray-100">
                {loading ? (
                  [...Array(4)].map((_, index) => <AppointmentSkeleton key={index} />)
                ) : filteredAppointments.length === 0 ? (
                  <div className="p-10 text-center">
                    <CalendarCheck className="mx-auto mb-3 h-12 w-12 text-gray-300" />
                    <p className="font-semibold text-gray-700">No hay citas para mostrar</p>
                    <p className="mt-1 text-sm text-gray-500">Cambia el filtro o revisa otra fecha.</p>
                  </div>
                ) : (
                  filteredAppointments.map((appointment) => (
                    <SecretaryAppointmentRow
                      key={appointment.id}
                      appointment={appointment}
                      onConfirm={(id) => handleUpdateAppointmentStatus(id, 'confirmed')}
                      onComplete={(id) => handleUpdateAppointmentStatus(id, 'completed')}
                      onReschedule={openRescheduleModal}
                      onCancel={openCancelModal}
                    />
                  ))
                )}
              </div>
            </div>

            <aside className="space-y-6">
              <section className="rounded-2xl bg-white border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="text-lg font-bold">Proxima atencion</h2>
                    <p className="text-sm text-gray-500">Siguiente cita activa</p>
                  </div>
                  <CalendarClock className="w-5 h-5 text-blue-600" />
                </div>
                {nextAppointment ? (
                  <div className="space-y-4">
                    <div>
                      <p className="text-xl font-bold">{getPatientName(nextAppointment)}</p>
                      <p className="text-sm text-gray-500">{toDisplayDateKey(nextAppointment.appointment_date)} a las {String(nextAppointment.appointment_time).slice(0, 5)}</p>
                    </div>
                    {nextAppointment.reason_for_visit && <p className="rounded-xl bg-gray-50 p-3 text-sm text-gray-600">{nextAppointment.reason_for_visit}</p>}
                    <Link href={`/appointments/${nextAppointment.id}`} className="inline-flex h-10 w-full items-center justify-center rounded-xl bg-gray-900 px-3 text-sm font-semibold text-white">
                      Ver detalle
                    </Link>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No hay citas activas en la agenda visible.</p>
                )}
              </section>

              <section className="rounded-2xl bg-white border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="text-lg font-bold">Acciones rapidas</h2>
                    <p className="text-sm text-gray-500">Trabajo diario</p>
                  </div>
                  <Stethoscope className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="grid gap-3">
                  <button onClick={() => setDateFilter(today)} className="h-10 rounded-xl border border-gray-200 px-3 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                    Ver agenda de hoy
                  </button>
                  <button onClick={() => { setDateFilter(''); setStatusFilter('scheduled'); }} className="h-10 rounded-xl border border-amber-200 px-3 text-sm font-semibold text-amber-700 hover:bg-amber-50">
                    Citas por confirmar
                  </button>
                  <Link href="/appointments" className="inline-flex h-10 items-center justify-center rounded-xl border border-blue-200 px-3 text-sm font-semibold text-blue-700 hover:bg-blue-50">
                    Vista completa de citas
                  </Link>
                </div>
              </section>
            </aside>
          </section>
          <SecretaryRescheduleModal
            appointment={rescheduleTarget}
            form={rescheduleForm}
            saving={actionLoading}
            onChange={setRescheduleForm}
            onClose={() => setRescheduleTarget(null)}
            onSubmit={handleRescheduleAppointment}
          />
          <SecretaryCancelModal
            appointment={cancelTarget}
            reason={cancelReason}
            saving={actionLoading}
            onReasonChange={setCancelReason}
            onClose={() => setCancelTarget(null)}
            onSubmit={handleCancelAppointment}
          />
        </>
      ) : (
        <>
          <section className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-6">
            <div className="rounded-2xl bg-white border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-5">
                <UserPlus className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-bold">Agregar al equipo</h2>
              </div>
              <form onSubmit={handleCreate} className="space-y-4">
                <label className="block">
                  <span className="block text-sm font-semibold text-gray-700 mb-1">Correo</span>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      className="h-11 w-full rounded-xl border border-gray-200 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="secretaria@correo.com"
                      value={form.email}
                      onChange={(event) => setForm({ ...form, email: event.target.value })}
                      required
                    />
                  </div>
                </label>

                {form.email.trim().length >= 3 && (
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                    <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-gray-500">
                      <Search className="w-4 h-4" />
                      {searching ? 'Buscando...' : 'Coincidencias'}
                    </div>
                    {emailResults.length ? (
                      <div className="space-y-2">
                        {emailResults.map((result) => (
                          <div key={result.id} className="flex items-center justify-between gap-3 rounded-lg bg-white p-3">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold truncate">{result.first_name} {result.last_name}</p>
                              <p className="text-xs text-gray-500 truncate">{result.email}</p>
                            </div>
                            <button
                              type="button"
                              disabled={saving || result.assigned_to_current_doctor || assignedIds.has(result.id)}
                              onClick={() => linkExisting(result)}
                              className="inline-flex h-9 items-center gap-2 rounded-lg bg-gray-900 px-3 text-xs font-semibold text-white disabled:bg-gray-300"
                            >
                              <Link2 className="w-4 h-4" />
                              {result.assigned_to_current_doctor || assignedIds.has(result.id) ? 'Asignada' : 'Asociar'}
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500">No hay secretarias existentes con ese correo. Puedes crear una nueva abajo.</p>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input className="h-11 rounded-xl border border-gray-200 px-3 text-sm" placeholder="Nombre" value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} required />
                  <input className="h-11 rounded-xl border border-gray-200 px-3 text-sm" placeholder="Apellido" value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} required />
                </div>
                <input className="h-11 w-full rounded-xl border border-gray-200 px-3 text-sm" placeholder="Telefono" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
                <input className="h-11 w-full rounded-xl border border-gray-200 px-3 text-sm" placeholder="Contrasena temporal opcional" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
                <button disabled={saving} className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-blue-600 px-4 font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
                  {saving ? 'Guardando...' : 'Crear o asociar secretaria'}
                </button>
              </form>
            </div>

            <div className="rounded-2xl bg-white border border-gray-200 p-6">
              <div className="flex items-center justify-between gap-3 mb-5">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-amber-600" />
                  <h2 className="text-lg font-bold">Secretarias asignadas</h2>
                </div>
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">{secretaries.length}</span>
              </div>
              {loading ? (
                <p className="text-gray-500">Cargando...</p>
              ) : secretaries.length === 0 ? (
                <p className="text-gray-500">Aun no hay secretarias asignadas.</p>
              ) : (
                <div className="max-h-[520px] space-y-3 overflow-y-auto pr-1">
                  {secretaries.map((secretary) => (
                    <div key={`${secretary.id}-${secretary.doctor_id}`} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                      {editingId === secretary.id ? (
                        <form className="space-y-3" onSubmit={async (event) => {
                          event.preventDefault();
                          try {
                            await secretaryAPI.update(secretary.id, { firstName: editForm.firstName, lastName: editForm.lastName, phone: editForm.phone, doctorId: user?.role === 'admin' ? editForm.doctorId || undefined : undefined });
                            setEditingId(null);
                            await loadData();
                          } catch (err: any) {
                            setError(err.message || 'No se pudo actualizar.');
                          }
                        }}>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <input className="h-10 rounded-lg border border-gray-200 px-3 text-sm" value={editForm.firstName} onChange={(event) => setEditForm({ ...editForm, firstName: event.target.value })} required />
                            <input className="h-10 rounded-lg border border-gray-200 px-3 text-sm" value={editForm.lastName} onChange={(event) => setEditForm({ ...editForm, lastName: event.target.value })} required />
                          </div>
                          <input className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm" value={editForm.phone} onChange={(event) => setEditForm({ ...editForm, phone: event.target.value })} placeholder="Telefono" />
                          <div className="flex gap-2">
                            <button className="h-9 rounded-lg bg-blue-600 px-3 text-sm font-semibold text-white" type="submit">Guardar</button>
                            <button className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold" type="button" onClick={() => setEditingId(null)}>Cancelar</button>
                          </div>
                        </form>
                      ) : (
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold truncate">{secretary.first_name} {secretary.last_name}</p>
                            <p className="text-sm text-gray-500 truncate">{secretary.email}</p>
                            <p className="text-xs text-gray-400">Asignada: {new Date(secretary.assigned_at).toLocaleDateString()}</p>
                          </div>
                          <div className="flex gap-2">
                            <button className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold" onClick={() => { setEditingId(secretary.id); setEditForm({ firstName: secretary.first_name, lastName: secretary.last_name, phone: secretary.phone || '', doctorId: secretary.doctor_id || '' }); }}>Editar</button>
                            <button className="inline-flex h-9 items-center gap-1 rounded-lg border border-rose-200 bg-white px-3 text-sm font-semibold text-rose-600" onClick={async () => {
                              if (!confirm('Quitar la asignacion de esta secretaria? La cuenta seguira existiendo.')) return;
                              try {
                                await secretaryAPI.remove(secretary.id, user?.role === 'admin' ? { doctorId: secretary.doctor_id } : {});
                                await loadData();
                              } catch (err: any) {
                                setError(err.message || 'No se pudo quitar la asignacion.');
                              }
                            }}>
                              <X className="w-4 h-4" />
                              Quitar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );

  return (
    <ProtectedRoute requiredRole={['doctor', 'admin', 'secretary']}>
      {user?.role === 'doctor' ? (
        <DoctorShell title="Equipo de apoyo" subtitle="Asocia secretarias existentes o crea nuevas cuentas">
          {content}
        </DoctorShell>
      ) : user?.role === 'secretary' ? (
        <div className="min-h-screen bg-[#f6f8fb] text-gray-950">
          <div className="flex min-h-screen">
            <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl transform transition-transform duration-300 lg:sticky lg:top-0 lg:translate-x-0 lg:inset-auto h-screen ${
              sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`}>
              <div className="h-full min-h-0 flex flex-col">
                <div className="p-4 border-b border-gray-100 shrink-0">
                  <Link href="/secretary/dashboard" className="flex items-center">
                    <Image src="/saludclick.png" alt="SaludClick" width={260} height={110} priority className="h-14 w-auto" />
                  </Link>
                </div>

                <nav className="flex-1 min-h-0 p-3 space-y-1 overflow-y-auto">
                  <p className="px-2 mb-2 text-[11px] font-semibold uppercase text-gray-400">Portal secretaria</p>
                  <Link href="/secretary/dashboard" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium bg-blue-50 text-blue-700">
                    <Home className="w-5 h-5" />
                    Dashboard
                  </Link>
                  <Link href="/appointments" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
                    <CalendarCheck className="w-5 h-5" />
                    Citas medicas
                  </Link>
                </nav>

                <div className="p-3 border-t border-gray-100 shrink-0">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 text-white flex items-center justify-center font-bold">
                      {user?.firstName?.[0] || 'S'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate">{user?.firstName} {user?.lastName}</p>
                      <p className="text-xs text-gray-500">Secretaria</p>
                    </div>
                  </div>
                  <button onClick={handleLogout} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <LogOut className="w-4 h-4" />
                    Cerrar sesion
                  </button>
                </div>
              </div>
            </aside>

            {sidebarOpen && (
              <button aria-label="Cerrar menu" className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
            )}

            <div className="flex-1 min-w-0">
              <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-gray-200">
                <div className="min-h-20 px-4 md:px-8 py-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden w-10 h-10 rounded-lg hover:bg-gray-100 flex items-center justify-center" aria-label="Abrir menu">
                      {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </button>
                    <div className="min-w-0">
                      <h1 className="text-xl md:text-2xl font-bold truncate">{getUserGreeting(user, 'Secretaria')}</h1>
                      <p className="text-sm text-gray-500 truncate">Agenda, confirmaciones y apoyo operativo</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <NotificationBell />
                    <button onClick={refreshData} disabled={loading} className="inline-flex h-10 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60">
                      <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                      Actualizar
                    </button>
                  </div>
                </div>
              </header>
              <main className="p-4 md:p-8">{content}</main>
            </div>
          </div>
        </div>
      ) : (
        <div className="min-h-screen bg-[#f6f8fb] px-4 py-10 text-gray-950">
          <div className="mx-auto max-w-6xl">
            <div className="mb-6">
              <h1 className="text-3xl font-bold">{getUserGreeting(user, 'Secretaria')}</h1>
              <p className="text-gray-500">Gestion de apoyo y agenda asignada</p>
            </div>
            {content}
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}

function MetricCard({ label, value, icon: Icon, tone }: { label: string; value: number; icon: any; tone: 'blue' | 'amber' | 'emerald' | 'slate' }) {
  const tones = {
    blue: 'bg-blue-50 text-blue-700',
    amber: 'bg-amber-50 text-amber-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    slate: 'bg-slate-100 text-slate-700',
  };

  return (
    <div className="rounded-2xl bg-white border border-gray-200 p-5">
      <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${tones[tone]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-3xl font-bold text-gray-950">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  );
}

function SecretaryAppointmentRow({
  appointment,
  onConfirm,
  onComplete,
  onReschedule,
  onCancel,
}: {
  appointment: any;
  onConfirm: (id: string) => void;
  onComplete: (id: string) => void;
  onReschedule: (appointment: any) => void;
  onCancel: (appointment: any) => void;
}) {
  const canManage = !['completed', 'cancelled', 'no-show'].includes(appointment.status);

  return (
    <div className="p-4 md:p-5 hover:bg-gray-50 transition-colors">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h3 className="font-bold text-gray-900">{getPatientName(appointment)}</h3>
            <span className={`inline-flex border px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusClasses[appointment.status] || 'bg-gray-50 text-gray-700 border-gray-200'}`}>
              {statusLabels[appointment.status] || appointment.status}
            </span>
            <span className={`inline-flex border px-2.5 py-0.5 rounded-full text-xs font-semibold ${appointment.appointment_type === 'teleconsulta' ? 'bg-violet-50 text-violet-700 border-violet-200' : 'bg-gray-50 text-gray-700 border-gray-200'}`}>
              {appointment.appointment_type === 'teleconsulta' ? 'Teleconsulta' : 'Presencial'}
            </span>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
            <span className="inline-flex items-center gap-1.5">
              <CalendarCheck className="w-4 h-4 text-gray-400" />
              {toDisplayDateKey(appointment.appointment_date)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock3 className="w-4 h-4 text-gray-400" />
              {String(appointment.appointment_time || '').slice(0, 5)}
            </span>
            {appointment.phone && (
              <span className="inline-flex items-center gap-1.5">
                <Phone className="w-4 h-4 text-gray-400" />
                {appointment.phone}
              </span>
            )}
          </div>
          {appointment.reason_for_visit && <p className="mt-2 text-sm text-gray-500 line-clamp-1">Motivo: {appointment.reason_for_visit}</p>}
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          {canManage && appointment.status === 'scheduled' && (
            <button onClick={() => onConfirm(appointment.id)} className="h-10 px-3 rounded-xl border border-emerald-200 text-emerald-700 text-sm font-semibold hover:bg-emerald-50 inline-flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Confirmar
            </button>
          )}
          {canManage && (
            <button onClick={() => onReschedule(appointment)} className="h-10 px-3 rounded-xl border border-blue-200 text-blue-700 text-sm font-semibold hover:bg-blue-50 inline-flex items-center gap-2">
              <CalendarClock className="w-4 h-4" />
              Reagendar
            </button>
          )}
          {canManage && (
            <button onClick={() => onComplete(appointment.id)} className="h-10 px-3 rounded-xl border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-white">
              Completar
            </button>
          )}
          {appointment.appointment_type === 'teleconsulta' && appointment.video_room_url && (
            <Link href={appointment.video_room_url} className="h-10 px-3 rounded-xl border border-violet-200 text-violet-700 text-sm font-semibold hover:bg-violet-50 inline-flex items-center gap-2">
              <Video className="w-4 h-4" />
              Teleconsulta
            </Link>
          )}
          {canManage && (
            <button onClick={() => onCancel(appointment)} className="h-10 px-3 rounded-xl border border-rose-200 text-rose-700 text-sm font-semibold hover:bg-rose-50 inline-flex items-center gap-2">
              <X className="w-4 h-4" />
              Cancelar
            </button>
          )}
          <Link href={`/appointments/${appointment.id}`} className="h-10 px-3 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 inline-flex items-center">
            Ver
          </Link>
        </div>
      </div>
    </div>
  );
}

function AppointmentSkeleton() {
  return (
    <div className="p-5 animate-pulse flex items-center gap-4">
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-gray-100 rounded w-1/3" />
        <div className="h-3 bg-gray-100 rounded w-1/2" />
      </div>
      <div className="h-10 bg-gray-100 rounded-xl w-24" />
    </div>
  );
}

function SecretaryRescheduleModal({
  appointment,
  form,
  saving,
  onChange,
  onClose,
  onSubmit,
}: {
  appointment: any;
  form: { appointmentDate: string; appointmentTime: string };
  saving: boolean;
  onChange: (value: { appointmentDate: string; appointmentTime: string }) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  if (!appointment) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 p-4">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
        className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="border-b border-gray-100 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase text-blue-600">Reagendar cita</p>
              <h2 className="mt-1 text-xl font-bold text-gray-950">{getPatientName(appointment)}</h2>
              <p className="mt-1 text-sm text-gray-500">{toDisplayDateKey(appointment.appointment_date)} a las {String(appointment.appointment_time || '').slice(0, 5)}</p>
            </div>
            <button type="button" onClick={onClose} className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-gray-100" aria-label="Cerrar">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-gray-700">Nueva fecha</span>
            <input type="date" required value={form.appointmentDate} onChange={(event) => onChange({ ...form, appointmentDate: event.target.value })} className="h-11 w-full rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-gray-700">Nueva hora</span>
            <input type="time" required value={form.appointmentTime} onChange={(event) => onChange({ ...form, appointmentTime: event.target.value })} className="h-11 w-full rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </label>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-gray-100 bg-gray-50 p-5 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={saving} className="h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-60">Volver</button>
          <button type="submit" disabled={saving} className="h-11 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60">{saving ? 'Guardando...' : 'Guardar nueva fecha'}</button>
        </div>
      </form>
    </div>
  );
}

function SecretaryCancelModal({
  appointment,
  reason,
  saving,
  onReasonChange,
  onClose,
  onSubmit,
}: {
  appointment: any;
  reason: string;
  saving: boolean;
  onReasonChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  if (!appointment) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 p-4">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
        className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="border-b border-gray-100 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase text-rose-600">Cancelar cita</p>
              <h2 className="mt-1 text-xl font-bold text-gray-950">{getPatientName(appointment)}</h2>
              <p className="mt-1 text-sm text-gray-500">{toDisplayDateKey(appointment.appointment_date)} a las {String(appointment.appointment_time || '').slice(0, 5)}</p>
            </div>
            <button type="button" onClick={onClose} className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-gray-100" aria-label="Cerrar">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="space-y-3 p-5">
          <p className="rounded-xl border border-rose-100 bg-rose-50 p-3 text-sm text-rose-700">Esta accion marcara la cita como cancelada.</p>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-gray-700">Motivo de cancelacion</span>
            <textarea value={reason} onChange={(event) => onReasonChange(event.target.value)} rows={4} placeholder="Ej: paciente solicita reagendar..." className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500" />
          </label>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-gray-100 bg-gray-50 p-5 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={saving} className="h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-60">Mantener cita</button>
          <button type="submit" disabled={saving} className="h-11 rounded-xl bg-rose-600 px-4 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-60">{saving ? 'Cancelando...' : 'Cancelar cita'}</button>
        </div>
      </form>
    </div>
  );
}

function getPatientName(appointment: any) {
  return `${appointment.patient_first_name || appointment.first_name || ''} ${appointment.patient_last_name || appointment.last_name || ''}`.trim() || 'Paciente sin nombre';
}
