'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { appointmentAPI, doctorAPI, notificationAPI, secretaryAPI } from '@/utils/api';
import { useI18n } from '@/i18n';
import { formatDate, getUserGreeting } from '@/utils/helpers';
import {
  Activity,
  AlertCircle,
  ArrowRight,
  Bell,
  CalendarClock,
  CalendarCheck,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock3,
  FileText,
  FlaskConical,
  HeartPulse,
  Home,
  LogOut,
  Menu,
  MessageSquare,
  NotebookPen,
  Pill,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Stethoscope,
  UserRound,
  Users,
  X,
} from 'lucide-react';

type AppointmentFilter = 'all' | 'scheduled' | 'confirmed' | 'waiting' | 'completed' | 'cancelled' | 'no-show';

type AppointmentItem = {
  id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  patient_id?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  reason_for_visit?: string;
  patient_first_name?: string;
  patient_last_name?: string;
  patient_email?: string;
  patient_phone?: string;
  health_center_name?: string;
  appointment_type?: string;
  video_room_url?: string;
  video_room_id?: string;
};

type ClinicalTask = {
  id: string;
  title: string;
  patient: string;
  type: 'call' | 'review' | 'appointment' | 'record';
  due: string;
  completed: boolean;
  completedAt?: number;
};

type NotificationItem = {
  id: string;
  title: string;
  body: string;
  url?: string;
  read_at?: string | null;
  created_at: string;
};

const statusLabels: Record<string, string> = {
  scheduled: 'Programada',
  confirmed: 'Confirmada',
  waiting: 'En espera',
  completed: 'Completada',
  cancelled: 'Cancelada',
  'no-show': 'No asistió',
};

const statusClasses: Record<string, string> = {
  scheduled: 'bg-blue-50 text-blue-700 border-blue-200',
  confirmed: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  waiting: 'bg-amber-50 text-amber-700 border-amber-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelled: 'bg-rose-50 text-rose-700 border-rose-200',
  'no-show': 'bg-orange-50 text-orange-700 border-orange-200',
};

const appointmentFilters: { value: AppointmentFilter; label: string }[] = [
  { value: 'scheduled', label: 'Programadas' },
  { value: 'confirmed', label: 'Confirmadas' },
  { value: 'waiting', label: 'En espera' },
  { value: 'completed', label: 'Completadas' },
  { value: 'cancelled', label: 'Canceladas' },
  { value: 'no-show', label: 'No asistio' },
  { value: 'all', label: 'Todas' },
];

const appointmentFilterLabels: Record<AppointmentFilter, { es: string; en: string }> = {
  scheduled: { es: 'Programadas', en: 'Scheduled' },
  confirmed: { es: 'Confirmadas', en: 'Confirmed' },
  waiting: { es: 'En espera', en: 'Waiting' },
  completed: { es: 'Completadas', en: 'Completed' },
  cancelled: { es: 'Canceladas', en: 'Cancelled' },
  'no-show': { es: 'No asistio', en: 'No-show' },
  all: { es: 'Todas', en: 'All' },
};

const taskTranslations: Record<string, string> = {
  'Llamar para confirmar control': 'Call to confirm follow-up',
  'Revisar resultado de laboratorio': 'Review lab result',
  'Completar expediente clinico': 'Complete clinical record',
  'Paciente pendiente': 'Pending patient',
  'Paciente reciente': 'Recent patient',
  'Siguiente paciente': 'Next patient',
  'Hoy 10:30': 'Today 10:30',
  'Hoy 13:00': 'Today 1:00 PM',
  'Antes de cierre': 'Before closing',
};

function localizeTaskText(value: string, en: boolean) {
  return en ? taskTranslations[value] || value : value;
}

const defaultTasks: ClinicalTask[] = [
  { id: 'task-1', title: 'Llamar para confirmar control', patient: 'Paciente pendiente', type: 'call', due: 'Hoy 10:30', completed: false },
  { id: 'task-2', title: 'Revisar resultado de laboratorio', patient: 'Paciente reciente', type: 'review', due: 'Hoy 13:00', completed: false },
  { id: 'task-3', title: 'Completar expediente clinico', patient: 'Siguiente paciente', type: 'record', due: 'Antes de cierre', completed: false },
];

const dayNames = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
const completedTaskVisibleMs = 8000;

export default function DoctorDashboardPage() {
  const { locale } = useI18n();
  const en = locale === 'en';
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [doctorProfile, setDoctorProfile] = useState<any>(null);
  const [secretaries, setSecretaries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<AppointmentFilter>('scheduled');
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [error, setError] = useState('');
  const [user, setUser] = useState<any>(null);
  const [tasks, setTasks] = useState<ClinicalTask[]>([]);
  const [newTask, setNewTask] = useState({ title: '', patient: '', due: '' });
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [pushStatus, setPushStatus] = useState<'unsupported' | 'default' | 'granted' | 'denied'>('default');

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      setLoading(false);
      return;
    }

    try {
      const parsed = JSON.parse(userData);
      setUser(parsed);
      loadDashboard(parsed);
      loadNotifications();
      initializePushState();
      loadClinicalTasks();
    } catch (err) {
      console.error('Error parsing user:', err);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadAppointments();
    }
  }, [filter, user]);

  useEffect(() => {
    if (!tasks.some((task) => task.completed && task.completedAt)) return;

    const timer = window.setInterval(() => {
      persistTasks(removeExpiredTasks(tasks));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [tasks]);

  const today = new Date().toISOString().split('T')[0];

  const loadDashboard = async (currentUser: any) => {
    setLoading(true);
    setError('');
    await Promise.all([
      loadAppointments(),
      loadDoctorProfile(currentUser),
      loadSecretaries(),
    ]);
    setLoading(false);
  };

  const loadNotifications = async () => {
    try {
      const response = await notificationAPI.list();
      setNotifications(response.data || []);
      setUnreadNotifications(response.unread || 0);
    } catch (err) {
      console.error('Error loading notifications:', err);
    }
  };

  const initializePushState = async () => {
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setPushStatus('unsupported');
      return;
    }

    setPushStatus(Notification.permission as 'default' | 'granted' | 'denied');

    if (Notification.permission === 'granted') {
      await registerPushDevice();
    }
  };

  const registerPushDevice = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setPushStatus('unsupported');
      return;
    }

    const registration = await navigator.serviceWorker.register('/sw.js');
    const existingSubscription = await registration.pushManager.getSubscription();
    const publicKeyResponse = await notificationAPI.getVapidPublicKey();
    const publicKey = publicKeyResponse.data?.publicKey;

    if (!publicKey) {
      throw new Error('VAPID public key missing');
    }

    const subscription = existingSubscription || await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });

    await notificationAPI.subscribe(subscription);
    setPushStatus('granted');
  };

  const enableNotifications = async () => {
    setError('');
    try {
      if (!('Notification' in window)) {
        setPushStatus('unsupported');
      setError(en ? 'This browser does not support push notifications.' : 'Este navegador no soporta notificaciones push.');
        return;
      }

      const permission = await Notification.requestPermission();
      setPushStatus(permission as 'default' | 'granted' | 'denied');

      if (permission === 'granted') {
        await registerPushDevice();
        await loadNotifications();
      } else if (permission === 'denied') {
      setError(en ? 'Notifications are blocked on this device.' : 'Las notificaciones estan bloqueadas en este dispositivo.');
      }
    } catch (err) {
      console.error('Error enabling notifications:', err);
      setError(en ? 'Notifications could not be enabled on this device.' : 'No se pudieron activar las notificaciones en este dispositivo.');
    }
  };

  const openNotifications = async () => {
    setNotificationsOpen(!notificationsOpen);
    if (!notificationsOpen) {
      await loadNotifications();
      if (unreadNotifications > 0) {
        await notificationAPI.markRead();
        setUnreadNotifications(0);
      }
    }
  };

  const refreshDashboard = async () => {
    if (!user) return;
    setRefreshing(true);
    await loadDashboard(user);
    await loadNotifications();
    setRefreshing(false);
  };

  const loadDoctorProfile = async (currentUser: any) => {
    try {
      const response = await doctorAPI.getById(currentUser.id);
      setDoctorProfile(response?.data || null);
    } catch (err) {
      console.error('Error loading doctor profile:', err);
      setError(en ? 'The doctor profile could not be loaded.' : 'No se pudo cargar el perfil medico.');
    }
  };

  const loadSecretaries = async () => {
    try {
      const response = await secretaryAPI.list();
      setSecretaries(response?.data || []);
    } catch (err) {
      console.error('Error loading secretaries:', err);
    }
  };

  const loadAppointments = async () => {
    try {
      const response = await appointmentAPI.list({
        status: filter === 'all' ? undefined : filter,
      });
      setAppointments(response.data || []);
    } catch (err) {
      console.error('Error loading appointments:', err);
      setError(en ? 'Appointments could not be loaded.' : 'No se pudieron cargar las citas medicas.');
    }
  };

  const loadClinicalTasks = () => {
    const stored = localStorage.getItem('doctorClinicalTasks');
    if (!stored) {
      setTasks(defaultTasks);
      localStorage.setItem('doctorClinicalTasks', JSON.stringify(defaultTasks));
      return;
    }

    try {
      persistTasks(removeExpiredTasks(JSON.parse(stored)));
    } catch {
      setTasks(defaultTasks);
    }
  };

  const persistTasks = (nextTasks: ClinicalTask[]) => {
    setTasks(nextTasks);
    localStorage.setItem('doctorClinicalTasks', JSON.stringify(nextTasks));
  };

  const removeExpiredTasks = (taskList: ClinicalTask[]) => {
    const now = Date.now();
    return taskList.filter((task) => !task.completedAt || now - task.completedAt < completedTaskVisibleMs);
  };

  const addClinicalTask = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = newTask.title.trim();
    if (!title) return;

    const task: ClinicalTask = {
      id: `task-${Date.now()}`,
      title,
      patient: newTask.patient.trim() || 'Sin paciente asignado',
      type: 'record',
      due: newTask.due.trim() || 'Sin vencimiento',
      completed: false,
    };

    persistTasks([task, ...tasks]);
    setNewTask({ title: '', patient: '', due: '' });
  };

  const toggleTask = (taskId: string) => {
    const nextTasks = tasks.map((task) => (
      task.id === taskId
        ? { ...task, completed: !task.completed, completedAt: task.completed ? undefined : Date.now() }
        : task
    ));
    persistTasks(nextTasks);
  };

  const handleUpdateAppointmentStatus = async (appointmentId: string, status: AppointmentFilter) => {
    setError('');
    try {
      await appointmentAPI.update(appointmentId, { status });
      await loadAppointments();
    } catch (err) {
      console.error('Error updating appointment:', err);
      setError(en ? 'The appointment status could not be updated.' : 'No se pudo actualizar el estado de la cita.');
    }
  };

  const handleRescheduleAppointment = async (appointment: AppointmentItem) => {
    const appointmentDate = window.prompt('Nueva fecha de la cita (YYYY-MM-DD)', appointment.appointment_date);
    if (!appointmentDate) return;
    const appointmentTime = window.prompt('Nueva hora de la cita (HH:mm)', appointment.appointment_time);
    if (!appointmentTime) return;

    setError('');
    try {
      await appointmentAPI.update(appointment.id, { appointmentDate, appointmentTime });
      await loadAppointments();
    } catch (err) {
      console.error('Error rescheduling appointment:', err);
      setError(en ? 'The appointment could not be rescheduled.' : 'No se pudo reagendar la cita.');
    }
  };

  const handleCancelAppointment = async (appointmentId: string) => {
    if (!window.confirm('¿Cancelar esta cita medica?')) return;
    await handleUpdateAppointmentStatus(appointmentId, 'cancelled');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const sortedAppointments = useMemo(() => {
    return [...appointments].sort((a, b) => {
      const left = `${a.appointment_date}T${a.appointment_time || '00:00'}`;
      const right = `${b.appointment_date}T${b.appointment_time || '00:00'}`;
      return left.localeCompare(right);
    });
  }, [appointments]);

  const visibleAppointments = useMemo(() => {
    const term = search.trim().toLowerCase();

    return sortedAppointments.filter((appointment) => {
      if (dateFilter && appointment.appointment_date !== dateFilter) return false;
      if (!term) return true;
      const searchable = [
        appointment.first_name,
        appointment.last_name,
        appointment.email,
        appointment.phone,
        appointment.patient_first_name,
        appointment.patient_last_name,
        appointment.patient_email,
        appointment.patient_phone,
        appointment.reason_for_visit,
        appointment.health_center_name,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchable.includes(term);
    });
  }, [dateFilter, search, sortedAppointments]);

  const activeStatuses = ['scheduled', 'confirmed', 'waiting'];
  const todayAppointments = sortedAppointments.filter(
    (appointment) => appointment.appointment_date === today && activeStatuses.includes(appointment.status)
  );
  const scheduledAppointments = sortedAppointments.filter((appointment) => activeStatuses.includes(appointment.status));
  const completedAppointments = sortedAppointments.filter((appointment) => appointment.status === 'completed');
  const cancelledAppointments = sortedAppointments.filter((appointment) => appointment.status === 'cancelled');
  const nextAppointment = scheduledAppointments[0];
  const pendingTasks = tasks.filter((task) => !task.completed);
  const recentPatients = Array.from(
    new Map(sortedAppointments.map((appointment) => [appointment.patient_id || appointment.id, appointment])).values()
  ).slice(0, 4);

  const profileCompletion = useMemo(() => {
    if (!doctorProfile) return 0;
    const checks = [
      doctorProfile.bio,
      doctorProfile.specialties?.length,
      doctorProfile.consultation_price,
      doctorProfile.years_experience,
      doctorProfile.avatar,
      doctorProfile.availability?.length,
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [doctorProfile]);

  const clinicalAlerts = [
    ...(todayAppointments.length ? [`${todayAppointments.length} ${en ? 'active appointments today.' : 'citas activas para hoy.'}`] : []),
    ...(pendingTasks.length ? [`${pendingTasks.length} ${en ? 'clinical tasks pending.' : 'tareas clinicas pendientes.'}`] : []),
    ...(profileCompletion < 80 ? [en ? 'Professional profile is incomplete.' : 'Perfil profesional incompleto.'] : []),
    ...(cancelledAppointments.length ? [`${cancelledAppointments.length} ${en ? 'cancelled appointments in the visible schedule.' : 'citas canceladas en la agenda visible.'}`] : []),
  ];

  return (
    <ProtectedRoute requiredRole="doctor">
      <div className="min-h-screen bg-[#f6f8fb] text-gray-950">
        <div className="flex min-h-screen">
          <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl transform transition-transform duration-300 lg:fixed lg:top-0 lg:bottom-0 lg:translate-x-0 h-screen ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}>
            <div className="h-full min-h-0 flex flex-col">
              <div className="p-4 border-b border-gray-100 shrink-0">
                <Link href="/doctor/dashboard" className="flex items-center">
                  <Image
                    src="/saludclick.png"
                    alt="SaludClick"
                    width={260}
                    height={110}
                    priority
                    className="h-14 w-auto"
                  />
                </Link>
              </div>

              <nav className="flex-1 min-h-0 p-3 space-y-1 overflow-y-auto">
                <p className="px-2 mb-2 text-[11px] font-semibold uppercase text-gray-400">{en ? 'Main' : 'Principal'}</p>
                <DoctorNavLink href="/doctor/dashboard" active icon={Home} label="Dashboard" />
                <DoctorNavLink href="/doctor/patients" icon={Users} label={en ? 'Patients' : 'Pacientes'} />
                <DoctorNavLink href="/appointments" icon={CalendarCheck} label={en ? 'Appointments' : 'Citas medicas'} />
                <DoctorNavLink href="/doctor/medical-records" icon={ClipboardList} label={en ? 'Medical records' : 'Registros medicos'} />
                <DoctorNavLink href="/doctor/prescriptions" icon={Pill} label={en ? 'Prescriptions' : 'Recetas'} />
                <DoctorNavLink href="/doctor/vademecum" icon={Search} label={en ? 'Drug reference' : 'Vademecum'} />
                <DoctorNavLink href="/doctor/lab-orders" icon={FlaskConical} label={en ? 'Labs and studies' : 'Analiticas y estudios'} />
                <DoctorNavLink href="/doctor/documents" icon={FileText} label={en ? 'Medical documents' : 'Documentos medicos'} />
                <DoctorNavLink href="/doctor/feedback" icon={MessageSquare} label={en ? 'Feedback and suggestions' : 'Preguntas y recomendaciones'} />

                <p className="px-2 mt-6 mb-2 text-[11px] font-semibold uppercase text-gray-400">{en ? 'Operations' : 'Operacion'}</p>
                <DoctorNavLink href="/secretary/dashboard" icon={Users} label={en ? 'Support team' : 'Equipo de apoyo'} />
                <DoctorNavLink href="/doctor/profile" icon={Settings} label={en ? 'Professional profile' : 'Perfil profesional'} />
              </nav>

              <div className="p-3 border-t border-gray-100 shrink-0">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 text-white flex items-center justify-center font-bold">
                    {user?.firstName?.[0] || 'D'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{user?.firstName} {user?.lastName}</p>
                    <p className="text-xs text-gray-500">{en ? 'Doctor' : 'Medico'}</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  {en ? 'Sign out' : 'Cerrar sesion'}
                </button>
              </div>
            </div>
          </aside>

          {sidebarOpen && (
            <button
              aria-label="Cerrar menu"
              className="fixed inset-0 z-40 bg-black/40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          <div className="flex-1 min-w-0 lg:pl-64">
            <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-gray-200">
              <div className="h-20 px-4 md:px-8 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <button
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="lg:hidden w-10 h-10 rounded-lg hover:bg-gray-100 flex items-center justify-center"
                    aria-label="Abrir menu"
                  >
                    {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                  </button>
                  <div className="min-w-0">
                    <h1 className="text-xl md:text-2xl font-bold truncate">{getUserGreeting(user, 'Doctor')
                      .replace('Buenos días', en ? 'Good morning' : 'Buenos días')
                      .replace('Buenas tardes', en ? 'Good afternoon' : 'Buenas tardes')
                      .replace('Buenas noches', en ? 'Good evening' : 'Buenas noches')}</h1>
                    <p className="text-sm text-gray-500 truncate">{en ? 'Clinical schedule, patients and daily follow-up' : 'Agenda clinica, pacientes y seguimiento del dia'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={refreshDashboard}
                    disabled={loading || refreshing}
                    className="w-10 h-10 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors disabled:opacity-60"
                    title={en ? 'Refresh' : 'Actualizar'}
                  >
                    <RefreshCw className={`w-5 h-5 text-gray-600 ${refreshing ? 'animate-spin' : ''}`} />
                  </button>
                  <div className="relative">
                    <button
                      onClick={openNotifications}
                      className="relative w-10 h-10 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"
                      title={en ? 'Notifications' : 'Notificaciones'}
                    >
                      <Bell className="w-5 h-5 text-gray-600" />
                      {unreadNotifications > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center px-1">
                          {unreadNotifications > 9 ? '9+' : unreadNotifications}
                        </span>
                      )}
                    </button>

                    {notificationsOpen && (
                      <div className="absolute right-0 top-12 w-[min(360px,calc(100vw-2rem))] rounded-2xl border border-gray-200 bg-white shadow-xl overflow-hidden">
                        <div className="p-4 border-b border-gray-100 flex items-start justify-between gap-3">
                          <div>
                            <p className="font-bold text-gray-900">{en ? 'Notifications' : 'Notificaciones'}</p>
                            <p className="text-xs text-gray-500">{en ? 'New appointments, changes and cancellations' : 'Citas nuevas, cambios y cancelaciones'}</p>
                          </div>
                          {pushStatus !== 'granted' && (
                            <button
                              onClick={enableNotifications}
                              className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700"
                            >
                              {en ? 'Enable' : 'Activar'}
                            </button>
                          )}
                        </div>
                        <div className="max-h-96 overflow-y-auto">
                          {pushStatus === 'unsupported' && (
                            <div className="p-4 text-sm text-amber-700 bg-amber-50">
                              {en ? 'This browser does not support push notifications.' : 'Este navegador no soporta notificaciones push.'}
                            </div>
                          )}
                          {notifications.length === 0 ? (
                            <div className="p-6 text-center text-sm text-gray-500">{en ? 'No notifications right now.' : 'No hay notificaciones por ahora.'}</div>
                          ) : (
                            notifications.map((notification) => (
                              <Link
                                key={notification.id}
                                href={notification.url || '/doctor/dashboard'}
                                className="block p-4 border-b border-gray-100 hover:bg-gray-50"
                                onClick={() => setNotificationsOpen(false)}
                              >
                                <p className="font-semibold text-sm text-gray-900">{notification.title}</p>
                                <p className="text-sm text-gray-500 mt-1">{notification.body}</p>
                                <p className="text-xs text-gray-400 mt-2">{new Date(notification.created_at).toLocaleString(en ? 'en-US' : 'es-DO')}</p>
                              </Link>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </header>

            <main className="p-4 md:p-8 space-y-6">
              {error && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span className="text-sm font-medium">{error}</span>
                </div>
              )}

              <section className="grid grid-cols-1 xl:grid-cols-[1.25fr_0.9fr] gap-6">
                <div className="rounded-2xl bg-gray-950 text-white p-5 md:p-6 overflow-hidden">
                  <div className="max-w-3xl">
                    <p className="text-sm text-blue-200 font-medium mb-2">{en ? 'Doctor panel' : 'Panel medico'}</p>
                    <h2 className="text-2xl md:text-3xl font-bold leading-tight mb-2 text-white">
                      {en ? 'Today\'s visits' : 'Consulta de hoy'}
                    </h2>
                    <p className="text-sm text-gray-300 max-w-2xl">
                      {en ? 'Appointments, tasks, alerts and recent patients in one workspace.' : 'Agenda, tareas, alertas y pacientes recientes en una vista de trabajo.'}
                    </p>
                  </div>
                  <div className="mt-5 grid grid-cols-2 md:grid-cols-5 gap-3">
                    <HeroMetric label={en ? 'Today' : 'Hoy'} value={todayAppointments.length} icon={Clock3} />
                    <HeroMetric label={en ? 'Scheduled' : 'Programadas'} value={scheduledAppointments.length} icon={CalendarCheck} />
                    <HeroMetric label={en ? 'Completed' : 'Completadas'} value={completedAppointments.length} icon={CheckCircle2} />
                    <HeroMetric label={en ? 'Cancelled' : 'Canceladas'} value={cancelledAppointments.length} icon={X} />
                    <HeroMetric label={en ? 'Secretaries' : 'Secretarias'} value={secretaries.length} icon={Users} />
                  </div>
                </div>

                <div className="rounded-2xl bg-white border border-gray-200 p-6">
                  <div className="flex items-start justify-between gap-3 mb-5">
                    <div>
                      <p className="text-sm text-gray-500">{en ? 'Next visit' : 'Proxima atencion'}</p>
                      <h2 className="text-xl font-bold text-gray-900">{en ? 'Next patient' : 'Siguiente paciente'}</h2>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                      <HeartPulse className="w-5 h-5" />
                    </div>
                  </div>

                  {loading ? (
                    <SkeletonBlock />
                  ) : nextAppointment ? (
                    <div>
                      <div className="flex items-center gap-3 mb-5">
                        <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                          {getInitials(nextAppointment)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-gray-900 truncate">{getPatientName(nextAppointment)}</p>
                          <p className="text-sm text-gray-500">{formatDate(nextAppointment.appointment_date)} {en ? 'at' : 'a las'} {nextAppointment.appointment_time}</p>
                        </div>
                      </div>
                      <div className="rounded-xl bg-gray-50 p-4 mb-5">
                        <p className="text-xs font-semibold text-gray-400 uppercase mb-1">{en ? 'Reason' : 'Motivo'}</p>
                        <p className="text-sm text-gray-700">{nextAppointment.reason_for_visit || (en ? 'No reason recorded' : 'Sin motivo registrado')}</p>
                      </div>
                      <div className="flex gap-2">
                        <Link
                          href={`/appointments/${nextAppointment.id}`}
                          className="flex-1 h-11 rounded-xl bg-gray-900 text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors"
                        >
                          {en ? 'Open appointment' : 'Abrir cita'}
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleUpdateAppointmentStatus(nextAppointment.id, 'completed')}
                          className="h-11 px-4 rounded-xl border border-emerald-200 text-emerald-700 hover:bg-emerald-50 transition-colors"
                          title={en ? 'Mark as completed' : 'Marcar completada'}
                        >
                          <CheckCircle2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <EmptyState icon={CalendarCheck} title={en ? 'No scheduled appointments' : 'Sin citas programadas'} text={en ? 'You have no pending visits right now.' : 'No tienes atenciones pendientes en este momento.'} />
                  )}
                </div>
              </section>

              <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4">
                <QuickAction href="/doctor/patients" icon={Users} title={en ? 'My patients' : 'Mis pacientes'} text={en ? 'History and follow-up' : 'Historial y seguimiento'} />
                <QuickAction href="/doctor/medical-records" icon={FileText} title={en ? 'Medical records' : 'Registros medicos'} text={en ? 'Clinical notes' : 'Notas clinicas'} />
                <QuickAction href="/doctor/prescriptions" icon={Pill} title={en ? 'Prescriptions' : 'Recetas'} text={en ? 'Instructions and medications' : 'Indicaciones y farmacos'} />
                <QuickAction href="/doctor/vademecum" icon={Search} title={en ? 'Drug reference' : 'Vademecum'} text={en ? 'Medications and warnings' : 'Medicamentos y advertencias'} />
                <QuickAction href="/doctor/lab-orders" icon={FlaskConical} title={en ? 'Lab orders' : 'Analiticas'} text={en ? 'Laboratory orders' : 'Ordenes de laboratorio'} />
                <QuickAction href="/doctor/documents" icon={FileText} title={en ? 'Documents' : 'Documentos'} text={en ? 'Certificates and referrals' : 'Certificados y referimientos'} />
                <QuickAction href="/doctor/feedback" icon={MessageSquare} title={en ? 'Feedback' : 'Feedback'} text={en ? 'Questions and suggestions' : 'Preguntas y recomendaciones'} />
              </section>

              <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <DashboardPanel title={en ? 'Clinical alerts' : 'Alertas clinicas'} subtitle={en ? 'Today\'s priority' : 'Prioridad del dia'} icon={AlertCircle}>
                  {clinicalAlerts.length ? (
                    <div className="space-y-2">
                      {clinicalAlerts.map((alert) => (
                        <div key={alert} className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                          {alert}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState icon={CheckCircle2} title={en ? 'No alerts' : 'Sin alertas'} text={en ? 'Everything is up to date for now.' : 'Todo esta al dia por ahora.'} compact />
                  )}
                </DashboardPanel>

                <DashboardPanel title={en ? 'Clinical tasks' : 'Tareas clinicas'} subtitle={`${pendingTasks.length} ${en ? 'pending' : 'pendientes'}`} icon={ClipboardList}>
                  <form onSubmit={addClinicalTask} className="mb-3 space-y-2">
                    <input
                      value={newTask.title}
                      onChange={(event) => setNewTask({ ...newTask, title: event.target.value })}
                      placeholder={en ? 'New clinical task' : 'Nueva tarea clinica'}
                      className="h-10 w-full rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        value={newTask.patient}
                        onChange={(event) => setNewTask({ ...newTask, patient: event.target.value })}
                        placeholder={en ? 'Patient' : 'Paciente'}
                        className="h-9 min-w-0 rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        value={newTask.due}
                        onChange={(event) => setNewTask({ ...newTask, due: event.target.value })}
                        placeholder={en ? 'Due' : 'Vence'}
                        className="h-9 min-w-0 rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <button
                      type="submit"
                      className="h-9 w-full rounded-xl bg-gray-900 px-3 text-sm font-semibold text-white hover:bg-gray-800 transition-colors"
                    >
                      {en ? 'Add task' : 'Agregar tarea'}
                    </button>
                  </form>

                  <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
                    {tasks.length ? tasks.map((task) => (
                      <button
                        key={task.id}
                        onClick={() => toggleTask(task.id)}
                        className="w-full text-left rounded-xl border border-gray-100 bg-gray-50 px-3 py-3 hover:bg-white transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <span className={`mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${task.completed ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-gray-300 bg-white'}`}>
                            {task.completed && <CheckCircle2 className="w-3.5 h-3.5" />}
                          </span>
                          <span className="min-w-0">
                            <span className={`block text-sm font-semibold ${task.completed ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{localizeTaskText(task.title, en)}</span>
                            <span className="block text-xs text-gray-500">{localizeTaskText(task.patient, en)} · {localizeTaskText(task.due, en)}</span>
                          </span>
                        </div>
                      </button>
                    )) : (
                      <EmptyState icon={CheckCircle2} title={en ? 'No tasks' : 'Sin tareas'} text={en ? 'Add clinical follow-up tasks.' : 'Agrega tareas de seguimiento clinico.'} compact />
                    )}
                  </div>
                </DashboardPanel>

                <DashboardPanel title={en ? 'Recent patients' : 'Pacientes recientes'} subtitle={en ? 'Latest activity' : 'Ultima actividad'} icon={Users}>
                  {recentPatients.length ? (
                    <div className="space-y-3">
                      {recentPatients.map((appointment) => (
                        <Link key={appointment.id} href={`/doctor/medical-records?patientId=${appointment.patient_id || ''}`} className="flex items-center gap-3 rounded-xl hover:bg-gray-50 p-2 transition-colors">
                          <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">{getInitials(appointment)}</div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{getPatientName(appointment)}</p>
                            <p className="text-xs text-gray-500 truncate">{formatDate(appointment.appointment_date)} · {en ? ({ scheduled: 'Scheduled', confirmed: 'Confirmed', waiting: 'Waiting', completed: 'Completed', cancelled: 'Cancelled', 'no-show': 'No-show' } as Record<string, string>)[appointment.status] || appointment.status : statusLabels[appointment.status] || appointment.status}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <EmptyState icon={UserRound} title={en ? 'No recent patients' : 'Sin pacientes recientes'} text={en ? 'Activity will appear when you have appointments.' : 'La actividad aparecera cuando tengas citas.'} compact />
                  )}
                </DashboardPanel>
              </section>

              <section className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6">
                <div className="rounded-2xl bg-white border border-gray-200 overflow-hidden">
                  <div className="p-5 border-b border-gray-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">{en ? 'Clinical schedule' : 'Agenda clinica'}</h2>
                        <p className="text-sm text-gray-500">{en ? 'Appointments filtered by status and patient' : 'Citas medicas filtradas por estado y paciente'}</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input
                        value={dateFilter}
                        onChange={(event) => setDateFilter(event.target.value)}
                        type="date"
                        className="h-10 w-full sm:w-40 rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="flex h-10 w-full items-center rounded-xl border border-gray-200 bg-white focus-within:ring-2 focus-within:ring-blue-500 sm:w-56">
                        <Search className="ml-3 h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
                        <input
                          value={search}
                          onChange={(event) => setSearch(event.target.value)}
                          placeholder={en ? 'Search patient...' : 'Buscar paciente...'}
                          className="h-full min-w-0 flex-1 border-0 bg-transparent px-2 pr-3 text-sm outline-none focus:ring-0"
                        />
                      </div>
                      <div className="flex flex-wrap rounded-xl border border-gray-200 bg-gray-50 p-1 gap-1">
                        {appointmentFilters.map(({ value, label }) => (
                          <button
                            key={value}
                            onClick={() => setFilter(value)}
                            className={`h-8 px-3 rounded-lg text-xs font-semibold transition-colors ${
                              filter === value ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                            }`}
                          >
                            {appointmentFilterLabels[value][en ? 'en' : 'es']}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="divide-y divide-gray-100">
                    {loading ? (
                      [...Array(5)].map((_, index) => <AppointmentSkeleton key={index} />)
                    ) : visibleAppointments.length === 0 ? (
                      <div className="p-10">
                        <EmptyState icon={NotebookPen} title={en ? 'No appointments to show' : 'No hay citas para mostrar'} text={en ? 'Change the filter or check again later.' : 'Cambia el filtro o revisa nuevamente mas tarde.'} />
                      </div>
                    ) : (
                      visibleAppointments.slice(0, 12).map((appointment) => (
                        <AppointmentRow
                          key={appointment.id}
                          appointment={appointment}
                          en={en}
                          onStatusChange={handleUpdateAppointmentStatus}
                          onReschedule={handleRescheduleAppointment}
                          onCancel={handleCancelAppointment}
                        />
                      ))
                    )}
                  </div>
                </div>

                <div className="space-y-6">
                  <section className="rounded-2xl bg-white border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-5">
                      <div>
                        <h2 className="text-lg font-bold">{en ? 'Professional profile' : 'Perfil profesional'}</h2>
                        <p className="text-sm text-gray-500">{en ? 'Public settings' : 'Configuracion publica'}</p>
                      </div>
                      <ShieldCheck className="w-5 h-5 text-blue-600" />
                    </div>
                    {doctorProfile ? (
                      <div className="space-y-5">
                        <div>
                          <div className="flex items-center justify-between text-sm mb-2">
                            <span className="text-gray-500">{en ? 'Completeness' : 'Completitud'}</span>
                            <span className="font-semibold text-gray-900">{profileCompletion}%</span>
                          </div>
                          <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                            <div className="h-full bg-blue-600" style={{ width: `${profileCompletion}%` }} />
                          </div>
                        </div>
                        <InfoLine label={en ? 'Health center' : 'Centro'} value={doctorProfile.health_center_name || (en ? 'Not assigned' : 'No asignado')} />
                        <InfoLine label={en ? 'Specialties' : 'Especialidades'} value={doctorProfile.specialties?.join(', ') || (en ? 'No specialties' : 'Sin especialidades')} />
                        <InfoLine label={en ? 'Consultation' : 'Consulta'} value={doctorProfile.consultation_price ? `$${doctorProfile.consultation_price}` : (en ? 'No price' : 'Sin precio')} />
                        <InfoLine label={en ? 'Rating' : 'Valoracion'} value={doctorProfile.average_rating || (en ? 'No rating' : 'Sin valoracion')} />
                      </div>
                    ) : (
                      <EmptyState icon={UserRound} title={en ? 'Profile unavailable' : 'Perfil no disponible'} text={en ? 'Professional information could not be loaded.' : 'No se pudo cargar la informacion profesional.'} compact />
                    )}
                  </section>

                  <section className="rounded-2xl bg-white border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-5">
                      <div>
                        <h2 className="text-lg font-bold">{en ? 'Availability' : 'Disponibilidad'}</h2>
                        <p className="text-sm text-gray-500">{en ? 'Configured schedules' : 'Horarios configurados'}</p>
                      </div>
                      <Activity className="w-5 h-5 text-emerald-600" />
                    </div>
                    {doctorProfile?.availability?.length ? (
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {doctorProfile.availability.map((slot: any, index: number) => (
                          <div key={index} className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
                            <span className="text-sm font-semibold">{en ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][slot.day_of_week] || 'Day' : dayNames[slot.day_of_week] || 'Dia'}</span>
                            <span className="text-sm text-gray-600">{slot.start_time} - {slot.end_time}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <EmptyState icon={Clock3} title={en ? 'No schedules' : 'Sin horarios'} text={en ? 'Set your availability to receive bookings.' : 'Configura disponibilidad para recibir reservas.'} compact />
                    )}
                  </section>

                  <section className="rounded-2xl bg-white border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-5">
                      <div>
                        <h2 className="text-lg font-bold">Equipo de apoyo</h2>
                        <p className="text-sm text-gray-500">Secretarias asignadas</p>
                      </div>
                      <Users className="w-5 h-5 text-amber-600" />
                    </div>
                    {secretaries.length ? (
                      <div className="space-y-3">
                        {secretaries.slice(0, 4).map((secretary) => (
                          <div key={secretary.id} className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center font-bold text-sm">
                              {secretary.first_name?.[0] || 'S'}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold truncate">{secretary.first_name} {secretary.last_name}</p>
                              <p className="text-xs text-gray-500 truncate">{secretary.email}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <EmptyState icon={Users} title="Sin secretarias" text="Aun no hay personal asignado." compact />
                    )}
                  </section>
                </div>
              </section>

            </main>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

function DoctorNavLink({
  href,
  icon: Icon,
  label,
  active = false,
}: {
  href: string;
  icon: any;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
        active ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
      }`}
    >
      <Icon className="w-5 h-5" />
      {label}
    </Link>
  );
}

function HeroMetric({ label, value, icon: Icon }: { label: string; value: number; icon: any }) {
  return (
    <div className="rounded-xl bg-white/10 border border-white/10 p-4">
      <Icon className="w-5 h-5 text-blue-200 mb-3" />
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-gray-300">{label}</p>
    </div>
  );
}

function AppointmentRow({
  appointment,
  en,
  onStatusChange,
  onReschedule,
  onCancel,
}: {
  appointment: AppointmentItem;
  en: boolean;
  onStatusChange: (id: string, status: AppointmentFilter) => void;
  onReschedule: (appointment: AppointmentItem) => void;
  onCancel: (id: string) => void;
}) {
  const canManage = !['completed', 'cancelled', 'no-show'].includes(appointment.status);

  return (
    <div className="p-4 md:p-5 hover:bg-gray-50 transition-colors">
      <div className="flex flex-col lg:flex-row lg:items-center gap-4 justify-between">
        <div className="flex items-start gap-4 min-w-0">
          <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold shrink-0">
            {getInitials(appointment)}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h3 className="font-bold text-gray-900">{getPatientName(appointment)}</h3>
              <span className={`inline-flex border px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusClasses[appointment.status] || 'bg-gray-50 text-gray-700 border-gray-200'}`}>
                {en ? ({ scheduled: 'Scheduled', confirmed: 'Confirmed', waiting: 'Waiting', completed: 'Completed', cancelled: 'Cancelled', 'no-show': 'No-show' } as Record<string, string>)[appointment.status] || appointment.status : statusLabels[appointment.status] || appointment.status}
              </span>
              <span className={`inline-flex border px-2.5 py-0.5 rounded-full text-xs font-semibold ${appointment.appointment_type === 'teleconsulta' ? 'bg-violet-50 text-violet-700 border-violet-200' : 'bg-gray-50 text-gray-700 border-gray-200'}`}>
                {appointment.appointment_type === 'teleconsulta' ? (en ? 'Telehealth' : 'Teleconsulta') : (en ? 'In person' : 'Presencial')}
              </span>
            </div>
            <p className="text-sm text-gray-500 truncate">{appointment.patient_email || appointment.email || (en ? 'No email registered' : 'Sin correo registrado')}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-gray-600">
              <span className="inline-flex items-center gap-1.5">
                <CalendarCheck className="w-4 h-4 text-gray-400" />
                {formatDate(appointment.appointment_date)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock3 className="w-4 h-4 text-gray-400" />
                {appointment.appointment_time}
              </span>
              {appointment.reason_for_visit && (
                <span className="inline-flex items-center gap-1.5">
                  <NotebookPen className="w-4 h-4 text-gray-400" />
                  {appointment.reason_for_visit}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          {canManage && (
            <Link
              href={`/appointments/${appointment.id}`}
              className="h-10 px-3 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition-colors inline-flex items-center gap-2"
            >
              <Stethoscope className="w-4 h-4" />
              {en ? 'Start' : 'Iniciar'}
            </Link>
          )}
          {appointment.appointment_type === 'teleconsulta' && appointment.video_room_url && (
            <Link
              href={appointment.video_room_url}
              className="h-10 px-3 rounded-xl border border-violet-200 text-violet-700 text-sm font-semibold hover:bg-violet-50 transition-colors inline-flex items-center gap-2"
            >
              {en ? 'Telehealth' : 'Teleconsulta'}
            </Link>
          )}
          {canManage && (
            <button
              onClick={() => onReschedule(appointment)}
              className="h-10 px-3 rounded-xl border border-blue-200 text-blue-700 text-sm font-semibold hover:bg-blue-50 transition-colors inline-flex items-center gap-2"
              title={en ? 'Reschedule' : 'Reagendar'}
            >
              <CalendarClock className="w-4 h-4" />
              {en ? 'Reschedule' : 'Reagendar'}
            </button>
          )}
          {canManage && (
            <button
              onClick={() => onStatusChange(appointment.id, 'completed')}
              className="h-10 px-3 rounded-xl border border-emerald-200 text-emerald-700 text-sm font-semibold hover:bg-emerald-50 transition-colors inline-flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              {en ? 'Complete' : 'Completar'}
            </button>
          )}
          {canManage && (
            <button
              onClick={() => onCancel(appointment.id)}
              className="h-10 px-3 rounded-xl border border-rose-200 text-rose-700 text-sm font-semibold hover:bg-rose-50 transition-colors inline-flex items-center gap-2"
              title={en ? 'Cancel' : 'Cancelar'}
            >
              <X className="w-4 h-4" />
              {en ? 'Cancel' : 'Cancelar'}
            </button>
          )}
          <Link
            href={`/appointments/${appointment.id}`}
            className="h-10 px-3 rounded-xl border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-white transition-colors inline-flex items-center gap-2"
          >
            {en ? 'View' : 'Ver'}
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function DashboardPanel({ title, subtitle, icon: Icon, children }: { title: string; subtitle: string; icon: any; children: any }) {
  return (
    <section className="rounded-2xl bg-white border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <p className="text-sm text-gray-500">{subtitle}</p>
        </div>
        <Icon className="w-5 h-5 text-blue-600" />
      </div>
      {children}
    </section>
  );
}

function QuickAction({ href, icon: Icon, title, text }: { href: string; icon: any; title: string; text: string }) {
  return (
    <Link href={href} className="rounded-2xl bg-white border border-gray-200 p-5 hover:border-blue-200 hover:shadow-sm transition-all group">
      <div className="w-11 h-11 rounded-xl bg-gray-100 text-gray-700 flex items-center justify-center mb-4 group-hover:bg-blue-50 group-hover:text-blue-700 transition-colors">
        <Icon className="w-5 h-5" />
      </div>
      <h3 className="font-bold text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-500">{text}</p>
    </Link>
  );
}

function InfoLine({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-start justify-between gap-3 border-t border-gray-100 pt-3">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-semibold text-gray-900 text-right">{value}</span>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  text,
  compact = false,
}: {
  icon: any;
  title: string;
  text: string;
  compact?: boolean;
}) {
  return (
    <div className={`text-center ${compact ? 'py-3' : 'py-6'}`}>
      <Icon className={`${compact ? 'w-8 h-8' : 'w-12 h-12'} text-gray-300 mx-auto mb-3`} />
      <p className="font-semibold text-gray-700">{title}</p>
      <p className="text-sm text-gray-500 mt-1">{text}</p>
    </div>
  );
}

function SkeletonBlock() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-12 bg-gray-100 rounded-xl" />
      <div className="h-24 bg-gray-100 rounded-xl" />
      <div className="h-11 bg-gray-100 rounded-xl" />
    </div>
  );
}

function AppointmentSkeleton() {
  return (
    <div className="p-5 animate-pulse flex items-center gap-4">
      <div className="w-12 h-12 rounded-full bg-gray-100" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-gray-100 rounded w-1/3" />
        <div className="h-3 bg-gray-100 rounded w-1/2" />
      </div>
      <div className="h-10 bg-gray-100 rounded-xl w-24" />
    </div>
  );
}

function getPatientName(appointment: AppointmentItem) {
  return `${appointment.patient_first_name || appointment.first_name || ''} ${appointment.patient_last_name || appointment.last_name || ''}`.trim() || 'Paciente sin nombre';
}

function getInitials(appointment: AppointmentItem) {
  const first = appointment.patient_first_name?.[0] || appointment.first_name?.[0] || 'P';
  const last = appointment.patient_last_name?.[0] || appointment.last_name?.[0] || '';
  return `${first}${last}`.toUpperCase();
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}
