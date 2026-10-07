'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  ArrowUpRight,
  Bell,
  CheckCircle2,
  FileText,
  UserCheck,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState, ErrorState, LoadingState } from '@/components/civic/shared';
import { cn } from '@/lib/utils';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  grievanceId: string;
  read: boolean;
  createdAt: string;
}

const typeIcons: Record<string, LucideIcon> = {
  complaint_received: FileText,
  analysis_completed: CheckCircle2,
  department_assigned: UserCheck,
  complaint_assigned: UserCheck,
  status_updated: ArrowUpRight,
  info_requested: AlertTriangle,
  sla_approaching: AlertTriangle,
  sla_breached: AlertTriangle,
  sla_warning: AlertTriangle,
  complaint_resolved: CheckCircle2,
  complaint_escalated: AlertTriangle,
  feedback_requested: CheckCircle2,
  complaint_reopened: AlertTriangle,
  new_assignment: UserCheck,
};

interface NotificationCenterProps {
  complaintHref: (grievanceId: string) => string;
}

export function NotificationCenter({ complaintHref }: NotificationCenterProps) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pendingId, setPendingId] = useState<string | null>(null);

  const loadNotifications = useCallback(async () => {
    setError('');
    try {
      const response = await fetch('/api/notifications', { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Notifications could not be loaded.');
      setNotifications(result.notifications || []);
    } catch (loadError) {
      console.error('Notifications could not be loaded:', loadError);
      setError(loadError instanceof Error ? loadError.message : 'Notifications could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadNotifications();
    const intervalId = window.setInterval(() => void loadNotifications(), 30_000);
    return () => window.clearInterval(intervalId);
  }, [loadNotifications]);

  const markRead = async (id?: string) => {
    setPendingId(id || 'all');
    setError('');
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(id ? { id } : { all: true }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Notification status could not be updated.');
      setNotifications((current) => current.map((notification) => (
        !id || notification.id === id ? { ...notification, read: true } : notification
      )));
    } catch (markError) {
      console.error('Notification read state could not be updated:', markError);
      setError(markError instanceof Error ? markError.message : 'Notification status could not be updated.');
    } finally {
      setPendingId(null);
    }
  };

  const openNotification = async (notification: Notification) => {
    if (!notification.read) await markRead(notification.id);
    router.push(complaintHref(notification.grievanceId));
  };

  if (loading) return <LoadingState message="Loading notifications..." />;
  if (error && notifications.length === 0) {
    return <ErrorState title="Notifications unavailable" message={error} onRetry={() => void loadNotifications()} />;
  }

  const unreadCount = notifications.filter((notification) => !notification.read).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
          <p className="text-sm text-muted-foreground">{unreadCount} unread</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={unreadCount === 0 || pendingId === 'all'}
          onClick={() => void markRead()}
        >
          Mark all as read
        </Button>
      </div>

      {error && <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}

      {notifications.length === 0 ? (
        <EmptyState icon={<Bell className="size-12" />} title="No notifications" description="Updates related to your grievances will appear here." />
      ) : (
        <div className="divide-y rounded-xl border bg-card shadow-sm">
          {notifications.map((notification) => {
            const Icon = typeIcons[notification.type] || Bell;
            return (
              <div key={notification.id} className={cn('flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start', !notification.read && 'bg-primary/[0.03]')}>
                <div className={cn('mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full', !notification.read ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground')}>
                  <Icon className="size-4" />
                </div>
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => void openNotification(notification)}
                  aria-label={`${notification.title}. Open related complaint`}
                >
                  <p className={cn('text-sm', !notification.read ? 'font-semibold' : 'font-medium')}>{notification.title}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{notification.message}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{new Date(notification.createdAt).toLocaleString('en-IN')}</p>
                </button>
                {!notification.read && (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={pendingId === notification.id}
                    onClick={() => void markRead(notification.id)}
                  >
                    Mark read
                  </Button>
                )}
                <span className="self-center text-xs font-medium text-primary">View complaint →</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
