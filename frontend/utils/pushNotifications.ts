import { notificationAPI } from './api';

export type PushNotificationStatus = 'unsupported' | 'default' | 'granted' | 'denied';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray;
}

export function getPushNotificationStatus(): PushNotificationStatus {
  if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    return 'unsupported';
  }

  return Notification.permission as PushNotificationStatus;
}

export async function registerPushNotifications() {
  if (getPushNotificationStatus() === 'unsupported') {
    throw new Error('Este navegador no soporta notificaciones push.');
  }

  const permission = Notification.permission === 'granted'
    ? 'granted'
    : await Notification.requestPermission();

  if (permission !== 'granted') {
    return { status: permission as PushNotificationStatus };
  }

  const keyResponse = await notificationAPI.getVapidPublicKey();
  const publicKey = keyResponse?.data?.publicKey;
  if (!publicKey) {
    throw new Error('No se pudo obtener la llave publica de notificaciones.');
  }

  const registration = await navigator.serviceWorker.register('/sw.js');
  const existingSubscription = await registration.pushManager.getSubscription();
  const subscription = existingSubscription || await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });

  await notificationAPI.subscribe(subscription);
  return { status: 'granted' as const };
}
