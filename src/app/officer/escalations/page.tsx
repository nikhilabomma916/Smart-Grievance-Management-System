'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import { PriorityBadge, StatusBadge, SLAIndicator, LoadingState, EmptyState } from '@/components/civic/shared';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function EscalationsPage() {
  const router = useRouter();
  const [grievances, setGrievances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/grievances');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Escalations could not be loaded.');
        const escalated = (data.data ?? []).filter((g: any) => g.status === 'ESCALATED' || g.status === 'SLA_AT_RISK');
        setGrievances(escalated);
      } catch (error) {
        console.error('Error fetching escalations:', error);
        setError(error instanceof Error ? error.message : 'Escalations could not be loaded.');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) return <LoadingState message="Loading escalations..." />;

  return (
    <div className="space-y-6">
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-red-500" /> Escalations & SLA Alerts
          </h1>
          <p className="text-slate-500">Cases requiring immediate administrative review or intervention.</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-red-100 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-red-50/50 hover:bg-red-50/50 border-b-red-100">
              <TableHead className="w-[100px]">ID</TableHead>
              <TableHead>Complaint</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>SLA Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {grievances.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center">
                  <EmptyState 
                    icon={<AlertTriangle className="h-8 w-8 text-slate-300" />}
                    title="No escalations" 
                    description="There are no escalated cases at the moment." 
                  />
                </TableCell>
              </TableRow>
            ) : (
              grievances.map((grievance) => (
                <TableRow 
                  key={grievance.id}
                  className="cursor-pointer hover:bg-slate-50"
                  onClick={() => router.push(`/officer/grievances/${grievance.id}`)}
                >
                  <TableCell className="font-mono text-xs text-slate-500">
                    {grievance.id.substring(0, 8)}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-slate-900 truncate max-w-xs">{grievance.title}</div>
                    <div className="text-xs text-slate-500 truncate max-w-xs">{grievance.location?.address || grievance.location?.area || 'Bangalore'}</div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={grievance.status} />
                  </TableCell>
                  <TableCell>
                    <PriorityBadge level={grievance.priorityLevel || grievance.priority || 'HIGH'} score={grievance.priorityScore} />
                  </TableCell>
                  <TableCell>
                    {grievance.slaDeadline ? (
                      <SLAIndicator deadline={grievance.slaDeadline} />
                    ) : (
                      <span className="text-slate-400 text-sm">None</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
