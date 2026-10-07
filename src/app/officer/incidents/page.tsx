'use client';

import { Repeat } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function IncidentsPage() {
  const router = useRouter();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Repeat className="h-5 w-5 text-indigo-500" />
          Recurring Issues
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-slate-600">
          Recurring-issue detection is not yet backed by persisted grievance data for the officer portal.
        </p>
        <Button variant="outline" onClick={() => router.push('/officer/grievances')}>
          Return to Assigned Grievances
        </Button>
      </CardContent>
    </Card>
  );
}
