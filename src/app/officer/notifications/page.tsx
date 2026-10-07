'use client';

import { NotificationCenter } from '@/components/civic/notification-center';

export default function OfficerNotificationsPage() {
  return (
    <NotificationCenter
      complaintHref={(grievanceId) => `/officer/grievances/${grievanceId}`}
    />
  );
}
