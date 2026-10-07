'use client';

import { NotificationCenter } from '@/components/civic/notification-center';

export default function CitizenNotificationsPage() {
  return (
    <NotificationCenter
      complaintHref={(grievanceId) => `/citizen/grievances/${grievanceId}`}
    />
  );
}
