'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import DoctorShell from '@/components/DoctorShell';
import { appointmentAPI, doctorAPI, secretaryAPI } from '@/utils/api';
import { formatDoctorName } from '@/utils/names';
import { CalendarCheck, CalendarPlus, CheckCircle2, ChevronLeft, ChevronRight, Clock3, CreditCard, ExternalLink, FileText, Home, LogOut, MapPin, Menu, RotateCcw, Search, UserRound, Video, X, XCircle } from 'lucide-react';

type AppointmentFilter = 'active' | 'all' | 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
const activeAppointmentStatuses = ['scheduled', 'confirmed'];

const monthFormatter = new Intl.DateTimeFormat('es-DO', { month: 'long', year: 'numeric' });
const dayFormatter = new Intl.DateTimeFormat('es-DO', { weekday: 'short' });

function appointmentDate(value?: string) {
  if (!value) return null;
  const [datePart] = String(value).split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function dateKey(value?: string) {
  return String(value || '').split('T')[0];
}

function formatDate(value?: string) {
  const date = appointmentDate(value);
  if (!date) return 'Sin fecha';
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
}

function formatTime(value?: string) {
  return String(value || '').slice(0, 5) || 'Sin hora';
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function appointmentStartsAt(appointment: any) {
  const date = appointmentDate(appointment?.appointment_date);
  if (!date) return null;
  const [hour = 0, minute = 0] = formatTime(appointment?.appointment_time).split(':').map(Number);
  date.setHours(hour, minute, 0, 0);
  return date;
}

function canRestoreCompletedAppointment(appointment: any) {
  if (appointment?.status !== 'completed') return false;
  const startsAt = appointmentStartsAt(appointment);
  return Boolean(startsAt && startsAt.getTime() > Date.now());
}

function isTeleconsultation(appointment: any) {
  return appointment?.appointment_type === 'teleconsulta' || Boolean(appointment?.video_room_url || appointment?.video_room_id);
}

function isExternalUrl(value?: string) {
  return /^https?:\/\//i.test(String(value || ''));
}

function statusLabel(status?: string) {
  const labels: Record<string, string> = {
    scheduled: 'Programada',
    confirmed: 'Confirmada',
    completed: 'Completada',
    cancelled: 'Cancelada',
  };

  return labels[status || ''] || status || 'No disponible';
}

export default function AppointmentsPage() {
  const router = useRouter();
  const [role, setRole] = useState('');
  const [user, setUser] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [assignedDoctors, setAssignedDoctors] = useState<any[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [appointments, setAppointments] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [filter, setFilter] = useState<AppointmentFilter>('active');
  const [calendarDate, setCalendarDate] = useState(() => new Date());
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [rescheduleTarget, setRescheduleTarget] = useState<any>(null);
  const [cancelTarget, setCancelTarget] = useState<any>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    patientId: '',
    appointmentDate: '',
    appointmentTime: '',
    appointmentType: 'presencial',
    videoRoomUrl: '',
    reasonForVisit: '',
  });
  const [rescheduleForm, setRescheduleForm] = useState({ appointmentDate: '', appointmentTime: '', videoRoomUrl: '' });
  const [cancelReason, setCancelReason] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      const user = JSON.parse(stored);
      setUser(user);
      setRole(user.role);
      if (user.role === 'secretary') {
        loadSecretaryDoctors();
      }
    }
  }, []);

  useEffect(() => {
    loadAppointments();
  }, [filter, selectedDoctorId]);

  useEffect(() => {
    const doctorId = role === 'doctor' ? user?.id : selectedDoctorId;
    if (doctorId && (role === 'doctor' || role === 'secretary')) {
      loadPatients(doctorId);
    }
  }, [role, user?.id, selectedDoctorId]);

  const loadSecretaryDoctors = async () => {
    try {
      const response = await secretaryAPI.assignedDoctors();
      const doctors = response.data || [];
      setAssignedDoctors(doctors);
      const storedDoctorId = localStorage.getItem('secretarySelectedDoctorId') || '';
      const nextDoctorId = doctors.some((doctor: any) => doctor.id === storedDoctorId)
        ? storedDoctorId
        : doctors[0]?.id || '';
      setSelectedDoctorId(nextDoctorId);
      if (nextDoctorId) localStorage.setItem('secretarySelectedDoctorId', nextDoctorId);
    } catch (err) {
      console.error(err);
      setError('No se pudieron cargar los medicos asignados.');
    }
  };

  const loadAppointments = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await appointmentAPI.list({
        status: filter === 'all' || filter === 'active' ? undefined : filter,
        ...(role === 'secretary' && selectedDoctorId ? { doctorId: selectedDoctorId } : {}),
      });
      const data = response.data || [];
      setAppointments(data);
      setSelectedAppointment((current: any) => data.find((appointment: any) => appointment.id === current?.id) || null);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las citas medicas.');
    } finally {
      setLoading(false);
    }
  };

  const loadPatients = async (doctorId: string) => {
    try {
      const response = await doctorAPI.getPatients(doctorId, { limit: 100 });
      const nextPatients = response.data || [];
      setPatients(nextPatients);
      setCreateForm((current) => ({
        ...current,
        patientId: nextPatients.some((patient: any) => patient.id === current.patientId)
          ? current.patientId
          : nextPatients[0]?.id || '',
      }));
    } catch (err) {
      console.error(err);
      setError('No se pudieron cargar los pacientes del medico.');
    }
  };

  const createAppointment = async () => {
    const doctorId = role === 'doctor' ? user?.id : selectedDoctorId;
    if (!doctorId || !createForm.patientId) {
      setError('Selecciona medico y paciente para crear la cita.');
      return;
    }

    setActionLoading(true);
    setError('');
    try {
      await appointmentAPI.create({
        doctorId,
        patientId: createForm.patientId,
        appointmentDate: createForm.appointmentDate,
        appointmentTime: createForm.appointmentTime,
        appointmentType: createForm.appointmentType,
        videoRoomUrl: createForm.appointmentType === 'teleconsulta' ? createForm.videoRoomUrl : undefined,
        reasonForVisit: createForm.reasonForVisit,
      });
      setCreateModalOpen(false);
      setCreateForm({
        patientId: patients[0]?.id || '',
        appointmentDate: '',
        appointmentTime: '',
        appointmentType: 'presencial',
        videoRoomUrl: '',
        reasonForVisit: '',
      });
      await loadAppointments();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'No se pudo crear la cita.');
    } finally {
      setActionLoading(false);
    }
  };

  const completeAppointment = async (id: string) => {
    setActionLoading(true);
    setError('');
    try {
      await appointmentAPI.update(id, { status: 'completed' });
      await loadAppointments();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'No se pudo completar la cita.');
    } finally {
      setActionLoading(false);
    }
  };

  const restoreAppointment = async (id: string) => {
    setActionLoading(true);
    setError('');
    try {
      await appointmentAPI.update(id, { status: 'confirmed' });
      await loadAppointments();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'No se pudo restaurar la cita.');
    } finally {
      setActionLoading(false);
    }
  };

  const openCancelModal = (appointment: any) => {
    setCancelTarget(appointment);
    setCancelReason('');
  };

  const cancelAppointment = async () => {
    if (!cancelTarget) return;
    setActionLoading(true);
    setError('');
    try {
      await appointmentAPI.cancel(cancelTarget.id, cancelReason.trim());
      setCancelTarget(null);
      setCancelReason('');
      await loadAppointments();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'No se pudo cancelar la cita.');
    } finally {
      setActionLoading(false);
    }
  };

  const openRescheduleModal = (appointment: any) => {
    setRescheduleTarget(appointment);
    setRescheduleForm({
      appointmentDate: String(appointment.appointment_date || '').slice(0, 10),
      appointmentTime: formatTime(appointment.appointment_time),
      videoRoomUrl: isExternalUrl(appointment.video_room_url) ? appointment.video_room_url : '',
    });
  };

  const rescheduleAppointment = async () => {
    if (!rescheduleTarget) return;
    setActionLoading(true);
    setError('');
    try {
      await appointmentAPI.update(rescheduleTarget.id, {
        appointmentDate: rescheduleForm.appointmentDate,
        appointmentTime: rescheduleForm.appointmentTime,
        ...(isTeleconsultation(rescheduleTarget) ? { videoRoomUrl: rescheduleForm.videoRoomUrl } : {}),
      });
      setRescheduleTarget(null);
      await loadAppointments();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'No se pudo reagendar la cita.');
    } finally {
      setActionLoading(false);
    }
  };

  const changeSelectedDoctor = (doctorId: string) => {
    setSelectedDoctorId(doctorId);
    localStorage.setItem('secretarySelectedDoctorId', doctorId);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return appointments;
    return appointments.filter((appointment) =>
      Object.values(appointment).filter(Boolean).join(' ').toLowerCase().includes(term)
    );
  }, [appointments, search]);

  const visibleAppointments = useMemo(() => {
    if (filter !== 'active') return filtered;
    return filtered.filter((appointment) => activeAppointmentStatuses.includes(appointment.status));
  }, [filter, filtered]);

  const calendarDays = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const first = new Date(year, month, 1);
    const start = new Date(first);
    start.setDate(first.getDate() - first.getDay());

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return date;
    });
  }, [calendarDate]);

  const appointmentsByDay = useMemo(() => {
    const map = new Map<string, any[]>();
    visibleAppointments.forEach((appointment) => {
      const date = appointmentDate(appointment.appointment_date);
      if (!date) return;
      const key = dateKey(appointment.appointment_date);
      map.set(key, [...(map.get(key) || []), appointment]);
    });

    map.forEach((items) => items.sort((a, b) => formatTime(a.appointment_time).localeCompare(formatTime(b.appointment_time))));
    return map;
  }, [visibleAppointments]);

  const changeMonth = (offset: number) => {
    setCalendarDate((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  };

  const content = (
    <div className="space-y-6">
      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Metric title="Activas" value={appointments.filter((a) => activeAppointmentStatuses.includes(a.status)).length} icon={CalendarCheck} />
        <Metric title="Programadas" value={appointments.filter((a) => a.status === 'scheduled').length} icon={Clock3} />
        <Metric title="Confirmadas" value={appointments.filter((a) => a.status === 'confirmed').length} icon={CheckCircle2} />
        <Metric title="Completadas" value={appointments.filter((a) => a.status === 'completed').length} icon={CheckCircle2} />
      </section>

      <section className="rounded-2xl bg-white border border-gray-200 overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar cita..."
              className="h-10 w-full lg:w-72 rounded-xl border border-gray-200 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            {(role === 'doctor' || role === 'secretary') && (
              <button
                onClick={() => setCreateModalOpen(true)}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
                disabled={role === 'secretary' && !selectedDoctorId}
              >
                <CalendarPlus className="h-4 w-4" />
                Nueva cita
              </button>
            )}
            {role === 'secretary' && (
              <select
                value={selectedDoctorId}
                onChange={(event) => changeSelectedDoctor(event.target.value)}
                className="h-10 w-full sm:w-72 rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            )}
            <div className="flex flex-wrap gap-2">
              {([
                ['active', 'Activas'],
                ['scheduled', 'Programadas'],
                ['confirmed', 'Confirmadas'],
                ['completed', 'Completadas'],
                ['cancelled', 'Canceladas'],
                ['all', 'Todas'],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setFilter(value)}
                  className={`px-3 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                    filter === value ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-5 space-y-3">
            {[...Array(4)].map((_, index) => <AppointmentSkeleton key={index} />)}
          </div>
        ) : visibleAppointments.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <CalendarCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="font-semibold text-gray-700">No hay citas para esta vista.</p>
            <p className="text-sm text-gray-500 mt-1">Cambia el filtro o revisa otra fecha.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 p-5 xl:grid-cols-[1fr_340px]">
            <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
              <div className="flex flex-col gap-3 border-b border-gray-100 p-4 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-lg font-bold capitalize text-gray-900">{monthFormatter.format(calendarDate)}</h2>
                <div className="flex items-center gap-2">
                  <button onClick={() => changeMonth(-1)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50" aria-label="Mes anterior">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button onClick={() => setCalendarDate(new Date())} className="h-9 rounded-lg border border-gray-200 px-3 text-sm font-semibold hover:bg-gray-50">
                    Hoy
                  </button>
                  <button onClick={() => changeMonth(1)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50" aria-label="Mes siguiente">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50">
                {calendarDays.slice(0, 7).map((day) => (
                  <div key={day.toISOString()} className="px-2 py-3 text-center text-xs font-bold uppercase text-gray-500">
                    {dayFormatter.format(day)}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7">
                {calendarDays.map((day) => {
                  const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
                  const dayAppointments = appointmentsByDay.get(key) || [];
                  const inMonth = day.getMonth() === calendarDate.getMonth();
                  const isToday = sameDay(day, new Date());

                  return (
                    <div key={key} className={`min-h-32 border-b border-r border-gray-100 p-2 ${inMonth ? 'bg-white' : 'bg-gray-50/70'}`}>
                      <div className={`mb-2 inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold ${isToday ? 'bg-blue-600 text-white' : inMonth ? 'text-gray-800' : 'text-gray-400'}`}>
                        {day.getDate()}
                      </div>
                      <div className="space-y-1">
                        {dayAppointments.slice(0, 4).map((appointment) => (
                          <button
                            key={appointment.id}
                            onClick={() => setSelectedAppointment(appointment)}
                            className={`block w-full rounded-lg border px-2 py-1 text-left text-xs font-semibold transition hover:shadow-sm ${appointmentClass(appointment)} ${selectedAppointment?.id === appointment.id ? 'ring-2 ring-blue-500' : ''}`}
                          >
                            <span className="block truncate">{formatTime(appointment.appointment_time)} · {getAppointmentName(appointment, role)}</span>
                          </button>
                        ))}
                        {dayAppointments.length > 4 && <p className="px-2 text-xs font-semibold text-gray-500">+{dayAppointments.length - 4} mas</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <AppointmentDetailPanel
              appointment={selectedAppointment}
              role={role}
              onComplete={completeAppointment}
              onRestore={restoreAppointment}
              onCancel={openCancelModal}
              onReschedule={openRescheduleModal}
            />
          </div>
        )}
      </section>

      <RescheduleModal
        appointment={rescheduleTarget}
        form={rescheduleForm}
        saving={actionLoading}
        onChange={setRescheduleForm}
        onClose={() => setRescheduleTarget(null)}
        onSubmit={rescheduleAppointment}
      />
      <CancelAppointmentModal
        appointment={cancelTarget}
        reason={cancelReason}
        saving={actionLoading}
        onReasonChange={setCancelReason}
        onClose={() => setCancelTarget(null)}
        onSubmit={cancelAppointment}
      />
      <CreateAppointmentModal
        open={createModalOpen}
        patients={patients}
        form={createForm}
        saving={actionLoading}
        onChange={setCreateForm}
        onClose={() => setCreateModalOpen(false)}
        onSubmit={createAppointment}
      />
    </div>
  );

  if (role === 'doctor') {
    return (
      <ProtectedRoute requiredRole="doctor">
        <DoctorShell title="Citas medicas" subtitle="Agenda y seguimiento de atenciones">
          {content}
        </DoctorShell>
      </ProtectedRoute>
    );
  }

  if (role === 'secretary') {
    return (
      <ProtectedRoute requiredRole="secretary">
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
                  <Link href="/secretary/dashboard" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
                    <Home className="w-5 h-5" />
                    Dashboard
                  </Link>
                  <Link href="/appointments" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium bg-blue-50 text-blue-700">
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
                      <h1 className="text-xl md:text-2xl font-bold truncate">Citas medicas</h1>
                      <p className="text-sm text-gray-500 truncate">Agenda y seguimiento por medico asignado</p>
                    </div>
                  </div>
                </div>
              </header>
              <main className="p-4 md:p-8">{content}</main>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#f6f8fb] p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Mis citas medicas</h1>
          {content}
        </div>
      </div>
    </ProtectedRoute>
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

function AppointmentDetailPanel({
  appointment,
  role,
  onComplete,
  onRestore,
  onCancel,
  onReschedule,
}: {
  appointment: any;
  role: string;
  onComplete: (id: string) => void;
  onRestore: (id: string) => void;
  onCancel: (appointment: any) => void;
  onReschedule: (appointment: any) => void;
}) {
  if (!appointment) {
    return (
      <aside className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-gray-500">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm">
          <CalendarCheck className="h-7 w-7 text-blue-500" />
        </div>
        <p className="font-bold text-gray-800">Selecciona una cita</p>
        <p className="mt-2 text-sm leading-6">Haz click en un evento del calendario para revisar datos del paciente, modalidad y acciones disponibles.</p>
      </aside>
    );
  }

  const teleconsultation = isTeleconsultation(appointment);
  const panelTone = teleconsultation
    ? 'from-violet-600 to-indigo-600'
    : 'from-sky-600 to-blue-600';
  const typeBadge = teleconsultation
    ? 'border-violet-200 bg-violet-50 text-violet-700'
    : 'border-sky-200 bg-sky-50 text-sky-700';
  const restoreAllowed = canRestoreCompletedAppointment(appointment);
  const canManage = (role === 'doctor' || role === 'secretary') && appointment.status !== 'cancelled';

  return (
    <aside className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className={`bg-gradient-to-br ${panelTone} p-5 text-white`}>
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15">
              {teleconsultation ? <Video className="h-6 w-6" /> : <MapPin className="h-6 w-6" />}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase text-white/70">Detalle de cita</p>
              <h2 className="mt-1 truncate text-2xl font-bold leading-tight">{getAppointmentName(appointment, role)}</h2>
            </div>
          </div>
          <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold">
            {statusLabel(appointment.status)}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white/12 p-3">
            <p className="text-xs font-semibold text-white/65">Fecha</p>
            <p className="mt-1 font-bold">{formatDate(appointment.appointment_date)}</p>
          </div>
          <div className="rounded-2xl bg-white/12 p-3">
            <p className="text-xs font-semibold text-white/65">Hora</p>
            <p className="mt-1 font-bold">{formatTime(appointment.appointment_time)}</p>
          </div>
        </div>
      </div>

      <div className="space-y-5 p-5">
        <div className="flex flex-wrap gap-2">
          <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${typeBadge}`}>
            {teleconsultation ? 'Teleconsulta' : 'Presencial'}
          </span>
          <span className="inline-flex rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-bold text-gray-600">
            {statusLabel(appointment.status)}
          </span>
          {restoreAllowed && (
            <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
              Puede restaurarse
            </span>
          )}
        </div>

        <div className="grid gap-3">
          <Detail icon={UserRound} label={role === 'doctor' ? 'Paciente' : 'Profesional'} value={getAppointmentName(appointment, role)} />
          {(role === 'doctor' || role === 'secretary') && (
            <Detail icon={UserRound} label="Cédula" value={appointment.document_number || 'No registrada'} />
          )}
          {(role === 'doctor' || role === 'secretary') && (
            <Detail icon={CreditCard} label="Seguro" value={appointment.has_insurance ? `${appointment.insurance_provider || 'Seguro no especificado'} · ${appointment.insurance_number || 'NSS/póliza pendiente'}` : 'No indicado'} />
          )}
          {role === 'secretary' && (
            <Detail icon={UserRound} label="Medico" value={formatDoctorName(appointment.doctor_first_name, appointment.doctor_last_name)} />
          )}
          <Detail icon={MapPin} label="Centro" value={appointment.health_center_name || 'No disponible'} />
        </div>

        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-bold text-gray-800">
            <FileText className="h-4 w-4 text-blue-600" />
            Motivo de consulta
          </div>
          <p className="text-sm leading-6 text-gray-600">{appointment.reason_for_visit || 'Sin motivo indicado'}</p>
        </div>

        {restoreAllowed && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Esta cita fue marcada como completada, pero la fecha reservada aun no ha pasado. Puedes devolverla a confirmada si fue un error.
          </div>
        )}
      </div>

      <div className="border-t border-gray-100 bg-gray-50 p-5">
        <div className="flex flex-col gap-2">
          {teleconsultation && appointment.video_room_url && (
          <Link href={appointment.video_room_url} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-violet-600 px-3 text-sm font-bold text-white shadow-sm hover:bg-violet-700">
            <Video className="h-4 w-4" />
            Abrir teleconsulta
          </Link>
        )}
        <Link href={`/appointments/${appointment.id}`} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white text-sm font-bold text-gray-700 hover:bg-gray-50">
          <ExternalLink className="h-4 w-4" />
          Ver detalles completos
        </Link>
        {canManage && restoreAllowed && (
          <button onClick={() => onRestore(appointment.id)} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-amber-500 px-3 text-sm font-bold text-white shadow-sm hover:bg-amber-600">
            <RotateCcw className="h-4 w-4" />
            Restaurar a confirmada
          </button>
        )}
        {canManage && appointment.status !== 'completed' && (
          <>
            <button onClick={() => onComplete(appointment.id)} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 text-sm font-bold text-white shadow-sm hover:bg-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              Marcar completada
            </button>
            <button onClick={() => onReschedule(appointment)} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-3 text-sm font-bold text-blue-700 hover:bg-blue-50">
              <RotateCcw className="h-4 w-4" />
              Reagendar
            </button>
            <button onClick={() => onCancel(appointment)} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-3 text-sm font-bold text-rose-700 hover:bg-rose-50">
              <XCircle className="h-4 w-4" />
              Cancelar
            </button>
          </>
        )}
        </div>
      </div>
    </aside>
  );
}

function CreateAppointmentModal({
  open,
  patients,
  form,
  saving,
  onChange,
  onClose,
  onSubmit,
}: {
  open: boolean;
  patients: any[];
  form: { patientId: string; appointmentDate: string; appointmentTime: string; appointmentType: string; videoRoomUrl: string; reasonForVisit: string };
  saving: boolean;
  onChange: (value: { patientId: string; appointmentDate: string; appointmentTime: string; appointmentType: string; videoRoomUrl: string; reasonForVisit: string }) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 p-4">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
        className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="border-b border-gray-100 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase text-blue-600">Nueva cita</p>
              <h2 className="mt-1 text-xl font-bold text-gray-950">Agendar paciente</h2>
              <p className="mt-1 text-sm text-gray-500">Crea una cita para un paciente asociado a este medico.</p>
            </div>
            <button type="button" onClick={onClose} className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-gray-100" aria-label="Cerrar">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-sm font-semibold text-gray-700">Paciente</span>
            <select
              required
              value={form.patientId}
              onChange={(event) => onChange({ ...form, patientId: event.target.value })}
              className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {patients.length === 0 ? (
                <option value="">Sin pacientes asociados</option>
              ) : (
                patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {`${patient.first_name || ''} ${patient.last_name || ''}`.trim() || patient.email || 'Paciente'}
                  </option>
                ))
              )}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-gray-700">Fecha</span>
            <input
              type="date"
              required
              value={form.appointmentDate}
              onChange={(event) => onChange({ ...form, appointmentDate: event.target.value })}
              className="h-11 w-full rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-gray-700">Hora</span>
            <input
              type="time"
              required
              value={form.appointmentTime}
              onChange={(event) => onChange({ ...form, appointmentTime: event.target.value })}
              className="h-11 w-full rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>

          <label className="block sm:col-span-2">
            <span className="mb-1 block text-sm font-semibold text-gray-700">Modalidad</span>
            <select
              value={form.appointmentType}
              onChange={(event) => onChange({ ...form, appointmentType: event.target.value })}
              className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="presencial">Presencial</option>
              <option value="teleconsulta">Teleconsulta</option>
            </select>
          </label>

          {form.appointmentType === 'teleconsulta' && (
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-sm font-semibold text-gray-700">Enlace de videollamada</span>
              <input
                type="url"
                value={form.videoRoomUrl}
                onChange={(event) => onChange({ ...form, videoRoomUrl: event.target.value })}
                placeholder="https://meet.google.com/... o https://zoom.us/j/..."
                className="h-11 w-full rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="mt-1 block text-xs text-gray-500">Si lo dejas vacio, SaludClick creara una sala interna como respaldo.</span>
            </label>
          )}

          <label className="block sm:col-span-2">
            <span className="mb-1 block text-sm font-semibold text-gray-700">Motivo</span>
            <textarea
              value={form.reasonForVisit}
              onChange={(event) => onChange({ ...form, reasonForVisit: event.target.value })}
              rows={4}
              placeholder="Ej: seguimiento, dolor, control..."
              className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-gray-100 bg-gray-50 p-5 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={saving} className="h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-60">
            Volver
          </button>
          <button type="submit" disabled={saving || patients.length === 0} className="h-11 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60">
            {saving ? 'Creando...' : 'Crear cita'}
          </button>
        </div>
      </form>
    </div>
  );
}

function RescheduleModal({
  appointment,
  form,
  saving,
  onChange,
  onClose,
  onSubmit,
}: {
  appointment: any;
  form: { appointmentDate: string; appointmentTime: string; videoRoomUrl: string };
  saving: boolean;
  onChange: (value: { appointmentDate: string; appointmentTime: string; videoRoomUrl: string }) => void;
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
              <h2 className="mt-1 text-xl font-bold text-gray-950">{getAppointmentName(appointment, 'doctor')}</h2>
              <p className="mt-1 text-sm text-gray-500">
                Actual: {formatDate(appointment.appointment_date)} a las {formatTime(appointment.appointment_time)}
              </p>
            </div>
            <button type="button" onClick={onClose} className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-gray-100" aria-label="Cerrar">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-gray-700">Nueva fecha</span>
            <input
              type="date"
              required
              value={form.appointmentDate}
              onChange={(event) => onChange({ ...form, appointmentDate: event.target.value })}
              className="h-11 w-full rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-gray-700">Nueva hora</span>
            <input
              type="time"
              required
              value={form.appointmentTime}
              onChange={(event) => onChange({ ...form, appointmentTime: event.target.value })}
              className="h-11 w-full rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>
          {isTeleconsultation(appointment) && (
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-sm font-semibold text-gray-700">Enlace de videollamada</span>
              <input
                type="url"
                value={form.videoRoomUrl}
                onChange={(event) => onChange({ ...form, videoRoomUrl: event.target.value })}
                placeholder="https://meet.google.com/... o https://zoom.us/j/..."
                className="h-11 w-full rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="mt-1 block text-xs text-gray-500">Pega aqui el enlace externo para reemplazar la sala interna.</span>
            </label>
          )}
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-gray-100 bg-gray-50 p-5 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={saving} className="h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-60">
            Volver
          </button>
          <button type="submit" disabled={saving} className="h-11 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60">
            {saving ? 'Guardando...' : 'Guardar nueva fecha'}
          </button>
        </div>
      </form>
    </div>
  );
}

function CancelAppointmentModal({
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
              <h2 className="mt-1 text-xl font-bold text-gray-950">{getAppointmentName(appointment, 'doctor')}</h2>
              <p className="mt-1 text-sm text-gray-500">
                {formatDate(appointment.appointment_date)} a las {formatTime(appointment.appointment_time)}
              </p>
            </div>
            <button type="button" onClick={onClose} className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-gray-100" aria-label="Cerrar">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="space-y-3 p-5">
          <p className="rounded-xl border border-rose-100 bg-rose-50 p-3 text-sm text-rose-700">
            Esta accion marcara la cita como cancelada y la quitara de las agendas activas.
          </p>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-gray-700">Motivo de cancelacion</span>
            <textarea
              value={reason}
              onChange={(event) => onReasonChange(event.target.value)}
              rows={4}
              placeholder="Ej: paciente solicita reagendar, medico no disponible..."
              className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </label>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-gray-100 bg-gray-50 p-5 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={saving} className="h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-60">
            Mantener cita
          </button>
          <button type="submit" disabled={saving} className="h-11 rounded-xl bg-rose-600 px-4 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-60">
            {saving ? 'Cancelando...' : 'Cancelar cita'}
          </button>
        </div>
      </form>
    </div>
  );
}

function Detail({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
      <Icon className="mb-2 h-4 w-4 text-blue-600" />
      <p className="text-xs font-semibold uppercase text-gray-400">{label}</p>
      <p className="mt-1 break-words text-sm font-bold text-gray-900">{value}</p>
    </div>
  );
}

function appointmentClass(appointment: any) {
  if (appointment.status === 'completed') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (appointment.status === 'cancelled') return 'border-rose-200 bg-rose-50 text-rose-700';

  if (isTeleconsultation(appointment)) {
    return 'border-violet-200 bg-violet-50 text-violet-700';
  }

  return 'border-sky-200 bg-sky-50 text-sky-700';
}

function PatientAppointmentRow({ appointment, role }: { appointment: any; role: string }) {
  return (
    <article className="rounded-2xl bg-white border border-gray-200 p-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="font-bold text-gray-900">{getAppointmentName(appointment, role)}</h2>
          <p className="text-sm text-gray-500 mt-1">{formatDate(appointment.appointment_date)} a las {formatTime(appointment.appointment_time)}</p>
          <span className={`mt-2 inline-flex border px-2.5 py-0.5 rounded-full text-xs font-semibold ${isTeleconsultation(appointment) ? 'bg-violet-50 text-violet-700 border-violet-200' : 'bg-sky-50 text-sky-700 border-sky-200'}`}>
            {isTeleconsultation(appointment) ? 'Teleconsulta' : 'Presencial'}
          </span>
          {appointment.reason_for_visit && <p className="text-sm text-gray-600 mt-2">{appointment.reason_for_visit}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          {isTeleconsultation(appointment) && appointment.video_room_url && (
            <Link href={appointment.video_room_url} className="px-3 py-2 rounded-xl border border-violet-200 text-violet-700 text-sm font-semibold hover:bg-violet-50">
              Abrir teleconsulta
            </Link>
          )}
          <Link href={`/appointments/${appointment.id}`} className="px-3 py-2 rounded-xl border border-gray-200 text-sm font-semibold hover:bg-white">
            Detalles
          </Link>
        </div>
      </div>
    </article>
  );
}

function AppointmentSkeleton() {
  return (
    <div className="rounded-2xl border border-gray-200 p-5 animate-pulse">
      <div className="h-5 bg-gray-100 rounded w-32 mb-3" />
      <div className="h-4 bg-gray-100 rounded w-56 mb-2" />
      <div className="h-4 bg-gray-100 rounded w-72" />
    </div>
  );
}

function getAppointmentName(appointment: any, role: string) {
  if (role === 'doctor') {
    return `${appointment.first_name || appointment.patient_first_name || ''} ${appointment.last_name || appointment.patient_last_name || ''}`.trim() || 'Paciente';
  }

  return formatDoctorName(appointment.first_name || appointment.doctor_first_name, appointment.last_name || appointment.doctor_last_name, false);
}
