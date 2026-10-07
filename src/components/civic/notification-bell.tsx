'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell } from 'lucide-react';

interface NotificationBellProps {
  href: string;
}

export function NotificationBell({ href }: NotificationBellProps) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    const loadUnreadCount = async () => {
      try {
        const response = await fetch('/api/notifications', {
          cache: 'no-store',
          signal: controller.signal,
        });

        if (!response.ok) {
          if (active && (response.status === 401 || response.status === 403)) {
            setUnreadCount(0);
          }
          return;
        }

        const result = await response.json();
        if (active && typeof result?.unreadCount === 'number' && Number.isInteger(result.unreadCount)) {
          setUnreadCount(result.unreadCount);
        }
      } catch (error: unknown) {
        if (!active) return;
        const maybeAbortError = error && typeof error === 'object' && 'name' in error
          ? error.name
          : undefined;
        if (maybeAbortError === 'AbortError') return;
        setUnreadCount(0);
      }
    };

    void loadUnreadCount();
    const intervalId = window.setInterval(() => void loadUnreadCount(), 15_000);
    return () => {
      active = false;
      controller.abort();
      window.clearInterval(intervalId);
    };
  }, []);

  return (
    <Link href={href} aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`} className="relative inline-flex size-9 items-center justify-center rounded-md hover:bg-muted">
      <Bell className="size-5 text-muted-foreground" />
      {unreadCount > 0 && (
        <span className="absolute -right-1 -top-1 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </Link>
  );
}
