'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { subscribeToNotifications, type AppNotification } from '@/lib/notify';

const AUTO_DISMISS_MS = 3690;
const EXIT_ANIMATION_MS = 260;

type DisplayedNotification = AppNotification & { exiting?: boolean };

export default function NotificationStack() {
  const [notifications, setNotifications] = useState<DisplayedNotification[]>([]);

  useEffect(() => {
    return subscribeToNotifications((notification) => {
      setNotifications((prev) => [...prev, notification]);
      setTimeout(() => {
        setNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, exiting: true } : n)));
        setTimeout(() => {
          setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
        }, EXIT_ANIMATION_MS);
      }, notification.durationMs ?? AUTO_DISMISS_MS);
    });
  }, []);

  if (notifications.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          role="status"
          className={`notify-toast card-shadow flex items-center gap-2.5 rounded-lg px-4 py-3 text-sm font-medium ${notification.exiting ? 'notify-toast-exit' : ''}`}
        >
          <Bell size={15} strokeWidth={1.75} className="shrink-0 opacity-90" aria-hidden="true" />
          <span>{notification.message}</span>
          {notification.href && (
            <Link href={notification.href} className="ml-1 shrink-0 whitespace-nowrap underline underline-offset-2 opacity-90 transition hover:opacity-100">
              {notification.linkLabel ?? 'Vai'}
            </Link>
          )}
        </div>
      ))}
    </div>
  );
}
