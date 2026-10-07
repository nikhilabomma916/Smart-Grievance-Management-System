'use client';

import { NotificationCenter } from '@/components/civic/notification-center';

export default function AdminNotificationsPage() {
  return (
    <NotificationCenter
      complaintHref={(grievanceId) => `/admin/grievances?grievanceId=${encodeURIComponent(grievanceId)}`}
    />
  );
}
