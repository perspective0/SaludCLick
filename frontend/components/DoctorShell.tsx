'use client';

import { ReactNode, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CalendarCheck,
  ClipboardList,
  FileText,
  FlaskConical,
  Home,
  LogOut,
  Menu,
  MessageSquare,
  Pill,
  Search,
  Settings,
  Users,
  X,
} from 'lucide-react';
import NotificationBell from './NotificationBell';
import { doctorAPI } from '@/utils/api';

type DoctorShellProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
  backHref?: string;
  backLabel?: string;
  hideBack?: boolean;
};

const navItems = [
  { href: '/doctor/dashboard', label: 'Dashboard', icon: Home },
  { href: '/doctor/patients', label: 'Pacientes', icon: Users },
  { href: '/appointments', label: 'Citas medicas', icon: CalendarCheck },
  { href: '/doctor/medical-records', label: 'Registros medicos', icon: ClipboardList },
  { href: '/doctor/prescriptions', label: 'Recetas', icon: Pill },
  { href: '/doctor/vademecum', label: 'Vademecum', icon: Search },
  { href: '/doctor/lab-orders', label: 'Analiticas y estudios', icon: FlaskConical },
  { href: '/doctor/documents', label: 'Documentos medicos', icon: FileText },
  { href: '/doctor/feedback', label: 'Preguntas y recomendaciones', icon: MessageSquare },
  { href: '/secretary/dashboard', label: 'Equipo de apoyo', icon: Users },
  { href: '/doctor/profile', label: 'Perfil profesional', icon: Settings },
];

export default function DoctorShell({ title, subtitle, children, actions, backHref, backLabel = 'Volver', hideBack = false }: DoctorShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setUser(parsed);
        if (parsed?.role === 'doctor' && parsed?.id) {
          doctorAPI.getById(parsed.id)
            .then((response) => {
              const avatar = response?.data?.avatar;
              if (!avatar) return;
              const nextUser = { ...parsed, avatar };
              setUser(nextUser);
              localStorage.setItem('user', JSON.stringify(nextUser));
            })
            .catch((err) => {
              console.error('Error loading doctor avatar:', err);
            });
        }
      } catch (err) {
        console.error('Error parsing user:', err);
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const defaultBackHref = getDoctorBackHref(pathname);
  const resolvedBackHref = backHref || defaultBackHref;
  const showBack = !hideBack && Boolean(resolvedBackHref);

  return (
    <div className="dashboard-shell min-h-screen text-gray-950 dark:text-slate-100">
      <div className="flex min-h-screen">
        <aside className={`dashboard-sidebar fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 lg:sticky lg:top-0 lg:translate-x-0 lg:inset-auto h-screen ${
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
              <p className="px-2 mb-2 text-[11px] font-semibold uppercase text-gray-400">Portal medico</p>
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      active ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="p-3 border-t border-gray-100 shrink-0 dark:border-slate-800">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 text-white flex items-center justify-center font-bold overflow-hidden">
                  {user?.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.avatar} alt={`Foto de ${user?.firstName || 'medico'}`} className="h-full w-full object-cover" />
                  ) : (
                    user?.firstName?.[0] || 'D'
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">{user?.firstName} {user?.lastName}</p>
                  <p className="text-xs text-gray-500">Medico</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Cerrar sesion
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

        <div className="flex-1 min-w-0">
          <header className="dashboard-header sticky top-0 z-30">
            <div className="min-h-20 px-4 md:px-8 py-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="lg:hidden w-10 h-10 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 flex items-center justify-center"
                  aria-label="Abrir menu"
                >
                  {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
                {showBack && (
                  <Link
                    href={resolvedBackHref}
                    className="hidden h-10 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 sm:inline-flex"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    {backLabel}
                  </Link>
                )}
                <div className="min-w-0">
                  <h1 className="text-xl md:text-2xl font-bold truncate">{title}</h1>
                  {subtitle && <p className="text-sm text-gray-500 truncate">{subtitle}</p>}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <NotificationBell />
                {actions}
              </div>
            </div>
          </header>

          <main className="p-4 md:p-8">
            {showBack && (
              <Link
                href={resolvedBackHref}
                className="mb-4 inline-flex h-10 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 sm:hidden"
              >
                <ArrowLeft className="h-4 w-4" />
                {backLabel}
              </Link>
            )}
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

function getDoctorBackHref(pathname: string | null) {
  if (!pathname || pathname === '/doctor/dashboard') return '';
  if (pathname.startsWith('/doctor/patients/')) return '/doctor/patients';
  if (pathname.startsWith('/doctor/consultation')) return '/doctor/patients';
  if (pathname.startsWith('/appointments/')) return '/appointments';
  if (pathname.startsWith('/secretary')) return '/doctor/dashboard';
  if (pathname.startsWith('/doctor')) return '/doctor/dashboard';
  if (pathname.startsWith('/appointments')) return '/doctor/dashboard';
  return '/doctor/dashboard';
}
