'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, CheckCheck } from 'lucide-react';
import { notificationAPI } from '@/utils/api';
import { getPushNotificationStatus, registerPushNotifications, PushNotificationStatus } from '@/utils/pushNotifications';
import { useI18n } from '@/i18n';
import { translateNotificationText } from '@/utils/notificationTranslations';

export default function NotificationBell() {
  const { locale } = useI18n();
  const en = locale === 'en';
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pushStatus, setPushStatus] = useState<PushNotificationStatus>('unsupported');
  const [pushLoading, setPushLoading] = useState(false);

  useEffect(() => {
    loadNotifications();
    const status = getPushNotificationStatus();
    setPushStatus(status);

    if (status === 'granted') {
      registerPushNotifications().catch((error) => {
        console.error('Error registering push notifications:', error);
      });
    }
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const response = await notificationAPI.list({ limit: 6 });
      setNotifications(response.data || []);
      setUnread(response.unread || 0);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markOne = async (id: string) => {
    try {
      await notificationAPI.markOneRead(id);
      await loadNotifications();
    } catch (error) {
      console.error('Error marking notification:', error);
    }
  };

  const markAll = async () => {
    try {
      await notificationAPI.markRead();
      await loadNotifications();
    } catch (error) {
      console.error('Error marking notifications:', error);
    }
  };

  const enablePush = async () => {
    try {
      setPushLoading(true);
      const result = await registerPushNotifications();
      setPushStatus(result.status);
    } catch (error) {
      console.error('Error enabling push notifications:', error);
      setPushStatus(getPushNotificationStatus());
    } finally {
      setPushLoading(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
        aria-label={en ? 'Notifications' : 'Notificaciones'}
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-[min(20rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <div>
              <p className="font-bold text-gray-900">{en ? 'Notifications' : 'Notificaciones'}</p>
              <p className="text-xs text-gray-500">{unread} {en ? 'unread' : 'sin leer'}</p>
            </div>
            <button onClick={markAll} className="rounded-lg p-2 text-gray-500 hover:bg-gray-50" title={en ? 'Mark all as read' : 'Marcar todas como leídas'}>
              <CheckCheck className="h-4 w-4" />
            </button>
          </div>

          {pushStatus === 'default' && (
            <div className="border-b border-blue-100 bg-blue-50 px-4 py-3">
              <button
                onClick={enablePush}
                disabled={pushLoading}
                className="w-full rounded-xl bg-blue-600 px-3 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {pushLoading ? (en ? 'Enabling...' : 'Activando...') : (en ? 'Enable browser notifications' : 'Activar avisos del navegador')}
              </button>
            </div>
          )}

          {pushStatus === 'denied' && (
            <div className="border-b border-amber-100 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-800">
              {en ? 'Browser notifications are blocked for this site.' : 'Los avisos del navegador estan bloqueados para este sitio.'}
            </div>
          )}

          <div className="max-h-80 overflow-y-auto p-2">
            {loading ? (
              <div className="space-y-2 p-2">{[...Array(3)].map((_, index) => <div key={index} className="h-16 animate-pulse rounded-xl bg-gray-100" />)}</div>
            ) : notifications.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-500">{en ? 'You have no pending notifications.' : 'No tienes notificaciones pendientes.'}</div>
            ) : (
              notifications.map((notification) => (
                <div key={notification.id} className={`rounded-xl p-3 ${notification.status === 'unread' ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                  <Link href={notification.url || '/notifications'} onClick={() => markOne(notification.id)} className="block">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-bold text-gray-900">{translateNotificationText(notification.title, en)}</p>
                      <Priority priority={notification.priority} en={en} />
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-gray-600">{translateNotificationText(notification.message || notification.body, en)}</p>
                  </Link>
                </div>
              ))
            )}
          </div>

          <Link href="/notifications" className="block border-t border-gray-100 px-4 py-3 text-center text-sm font-bold text-blue-600 hover:bg-gray-50">
            {en ? 'View all' : 'Ver todas'}
          </Link>
        </div>
      )}
    </div>
  );
}

function Priority({ priority, en }: { priority?: string; en: boolean }) {
  if (priority !== 'high') return null;
  return <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">{en ? 'High' : 'Alta'}</span>;
}
