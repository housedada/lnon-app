// lib/notify.ts - Event bus per le notifiche push, richiamabile da qualsiasi
// componente client senza dover passare per un Context esplicito.

export type NotificationType = 'default';

export interface AppNotification {
  id: string;
  message: string;
  type: NotificationType;
}

type Listener = (notification: AppNotification) => void;

const listeners = new Set<Listener>();

export function notify(message: string, type: NotificationType = 'default') {
  const notification: AppNotification = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    message,
    type,
  };
  listeners.forEach((listener) => listener(notification));
}

export function subscribeToNotifications(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
