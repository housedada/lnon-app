// lib/notify.ts - Event bus per le notifiche push, richiamabile da qualsiasi
// componente client senza dover passare per un Context esplicito.

export interface AppNotification {
  id: string;
  message: string;
  durationMs?: number;
  href?: string;
  linkLabel?: string;
}

export interface NotifyOptions {
  durationMs?: number;
  href?: string;
  linkLabel?: string;
}

type Listener = (notification: AppNotification) => void;

const listeners = new Set<Listener>();

export function notify(message: string, options?: NotifyOptions) {
  const notification: AppNotification = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    message,
    ...options,
  };
  listeners.forEach((listener) => listener(notification));
}

export function subscribeToNotifications(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
