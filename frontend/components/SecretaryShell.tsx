'use client';

import { ReactNode, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { CalendarCheck, Clock3, Home, LogOut, Menu, X } from 'lucide-react';
import NotificationBell from './NotificationBell';

const navItems = [
  { href: '/secretary/dashboard', label: 'Dashboard', icon: Home },
  { href: '/appointments', label: 'Citas médicas', icon: CalendarCheck },
  { href: '/queue', label: 'Seguimiento de turnos', icon: Clock3 },
];

export default function SecretaryShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    try {
      setUser(JSON.parse(localStorage.getItem('user') || 'null'));
    } catch {
      setUser(null);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  return (
    <div className="dashboard-shell min-h-screen text-gray-950">
      <div className="flex min-h-screen">
        <aside className={`dashboard-sidebar fixed inset-y-0 left-0 z-50 h-dvh w-64 transform transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex h-full min-h-0 flex-col">
            <div className="border-b border-gray-100 p-4">
              <Link href="/secretary/dashboard" className="flex items-center">
                <Image src="/saludclick.png" alt="SaludClick" width={260} height={110} priority className="h-14 w-auto" />
              </Link>
              <p className="mt-2 px-1 text-sm font-medium text-gray-500">Portal secretaria</p>
            </div>
            <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto p-3">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return <Link key={item.href} href={item.href} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold ${active ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}><Icon className="h-5 w-5" />{item.label}</Link>;
              })}
            </nav>
            <div className="mt-auto border-t border-gray-100 p-3">
              <div className="mb-2 flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">{user?.firstName?.[0] || 'S'}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{user?.firstName} {user?.lastName}</p><p className="text-xs text-gray-500">Secretaria</p></div></div>
              <button onClick={handleLogout} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50"><LogOut className="h-4 w-4" />Cerrar sesión</button>
            </div>
          </div>
        </aside>
        {sidebarOpen && <button aria-label="Cerrar menú" className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />}
        <div className="min-w-0 flex-1 overflow-x-hidden lg:pl-64">
          <header className="dashboard-header sticky top-0 z-30"><div className="flex min-h-20 items-center justify-between gap-4 px-4 py-4 md:px-8"><div className="flex min-w-0 items-center gap-4"><button onClick={() => setSidebarOpen(!sidebarOpen)} className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-gray-100 lg:hidden" aria-label="Abrir menú">{sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button><div className="min-w-0"><h1 className="truncate text-xl font-bold md:text-2xl">{title}</h1>{subtitle && <p className="truncate text-sm text-gray-500">{subtitle}</p>}</div></div><NotificationBell /></div></header>
          <main className="p-4 md:p-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
