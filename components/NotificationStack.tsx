'use client';

import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { subscribeToNotifications, type AppNotification } from '@/lib/notify';

const AUTO_DISMISS_MS = 3690;

export default function NotificationStack() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  useEffect(() => {
    return subscribeToNotifications((notification) => {
      setNotifications((prev) => [...prev, notification]);
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
      }, AUTO_DISMISS_MS);
    });
  }, []);

  if (notifications.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          role="status"
          className="notify-toast card-shadow flex items-center gap-2.5 rounded-lg border border-grid-border bg-card-bg px-4 py-3 text-sm text-primary"
        >
          <Bell size={15} strokeWidth={1.75} className="shrink-0 text-secondary" aria-hidden="true" />
          {notification.message}
        </div>
      ))}
    </div>
  );
}
