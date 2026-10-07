'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Building2, MapPin, Paperclip, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ErrorState, LoadingState, PriorityBadge, SLAIndicator, StatusBadge } from '@/components/civic/shared';
import { CATEGORY_NAMES, DEPARTMENT_NAMES } from '@/lib/constants';
import type { Grievance } from '@/lib/types';

interface AdminGrievanceDetail {
  grievance: Grievance;
  statusHistory: { id: string; fromStatus: string | null; toStatus: string; note?: string; timestamp: string }[];
  internalNotes: { id: string; authorName: string; authorRole: string; content: string; createdAt: string }[];
  citizenUpdates: { id: string; message: string; createdAt: string }[];
  citizen?: { name: string; phone?: string };
  assignedOfficer?: { name: string; email?: string; departmentId?: string } | null;
  feedback?: { rating: number; comment?: string; createdAt: string } | null;
}

export default function AdminGrievanceDetailPage() {
  const params = useParams<{ id: string }>();
  const [detail, setDetail] = useState<AdminGrievanceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    async function loadDetail() {
      try {
        const response = await fetch(`/api/grievances/${params.id}`, {
          cache: 'no-store',
          signal: controller.signal,
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'The grievance could not be loaded.');
        setDetail(result);
      } catch (loadError) {
        if (controller.signal.aborted) return;
        console.error('Administrator grievance detail could not be loaded:', loadError);
        setError(loadError instanceof Error ? loadError.message : 'The grievance could not be loaded.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void loadDetail();
    return () => controller.abort();
  }, [params.id]);

  if (loading) return <LoadingState message="Loading grievance details..." />;
  if (error || !detail) {
    return <ErrorState title="Grievance details unavailable" message={error || 'The grievance could not be loaded.'} onRetry={() => window.location.reload()} />;
  }

  const grievance = detail.grievance;
  const location = [
    grievance.location.address,
    grievance.location.area,
    grievance.location.ward,
    grievance.location.city,
  ].filter(Boolean).join(', ');

  return (
    <div className="space-y-6">
      <Link href="/admin/grievances"><Button variant="ghost" size="sm"><ArrowLeft className="mr-2 size-4" />Back to grievances</Button></Link>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="break-all font-mono text-xs text-muted-foreground">{grievance.id}</p>
          <h1 className="mt-1 text-2xl font-bold">{grievance.title}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge status={grievance.status} />
          <PriorityBadge level={grievance.priorityLevel || grievance.priority} score={grievance.priorityScore} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Complaint details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{grievance.description}</p>
              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <p><span className="text-muted-foreground">Category: </span>{CATEGORY_NAMES[grievance.categoryId] || grievance.categoryId}</p>
                <p className="flex items-center gap-1"><MapPin className="size-4 text-muted-foreground" />{location || 'Location not provided'}</p>
                <p><span className="text-muted-foreground">Submitted: </span>{new Date(grievance.createdAt).toLocaleString('en-IN')}</p>
                {grievance.resolvedAt && <p><span className="text-muted-foreground">Last resolved: </span>{new Date(grievance.resolvedAt).toLocaleString('en-IN')}</p>}
              </div>
              {grievance.slaDeadline && <div><p className="mb-1 text-sm font-medium">SLA deadline</p><SLAIndicator deadline={grievance.slaDeadline} /></div>}
              {grievance.attachments.length > 0 && (
                <div className="space-y-2 border-t pt-3">
                  <h2 className="flex items-center gap-2 text-sm font-semibold"><Paperclip className="size-4" />Evidence metadata</h2>
                  {grievance.attachments.map((attachment) => (
                    <p key={attachment.id} className="break-all text-sm text-muted-foreground">
                      {attachment.fileName} · {attachment.fileType} · {(attachment.fileSize / 1_048_576).toFixed(2)} MB
                    </p>
                  ))}
                  <p className="text-xs text-muted-foreground">Image binaries are not retained in the current storage configuration.</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Status history</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {detail.statusHistory.length ? detail.statusHistory.map((entry) => (
                <div key={entry.id} className="border-l-2 border-primary/30 pl-3">
                  <p className="text-sm font-medium">{entry.fromStatus ? `${entry.fromStatus.replace(/_/g, ' ')} → ` : ''}{entry.toStatus.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-muted-foreground">{new Date(entry.timestamp).toLocaleString('en-IN')}</p>
                  {entry.note && <p className="mt-1 text-sm text-muted-foreground">{entry.note}</p>}
                </div>
              )) : <p className="text-sm text-muted-foreground">No status events recorded.</p>}
            </CardContent>
          </Card>

          {detail.citizenUpdates.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Citizen updates</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {detail.citizenUpdates.map((update) => <div key={update.id} className="rounded-md bg-muted/50 p-3">
                  <p className="text-sm">{update.message}</p><p className="mt-1 text-xs text-muted-foreground">{new Date(update.createdAt).toLocaleString('en-IN')}</p>
                </div>)}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle>Internal officer notes</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {detail.internalNotes.length ? detail.internalNotes.map((note) => (
                <div key={note.id} className="rounded-md border p-3">
                  <p className="whitespace-pre-wrap text-sm">{note.content}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{note.authorName} · {note.authorRole} · {new Date(note.createdAt).toLocaleString('en-IN')}</p>
                </div>
              )) : <p className="text-sm text-muted-foreground">No internal notes.</p>}
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Routing and people</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="flex items-center gap-2"><Building2 className="size-4 text-primary" />{DEPARTMENT_NAMES[grievance.departmentId || ''] || 'Department not assigned'}</p>
              <p><span className="text-muted-foreground">Citizen: </span>{detail.citizen?.name || 'Unavailable'}</p>
              {detail.citizen?.phone && <p><span className="text-muted-foreground">Phone: </span>{detail.citizen.phone}</p>}
              {detail.assignedOfficer && <div className="border-t pt-3">
                <p className="flex items-center gap-2 font-medium"><UserRound className="size-4 text-primary" />{detail.assignedOfficer.name}</p>
                {detail.assignedOfficer.email && <p className="mt-1 break-all text-xs text-muted-foreground">{detail.assignedOfficer.email}</p>}
                {detail.assignedOfficer.departmentId && <p className="mt-1 text-xs text-muted-foreground">{DEPARTMENT_NAMES[detail.assignedOfficer.departmentId] || detail.assignedOfficer.departmentId}</p>}
              </div>}
            </CardContent>
          </Card>

          {detail.feedback && <Card>
            <CardHeader><CardTitle className="text-base">Citizen feedback</CardTitle></CardHeader>
            <CardContent>
              <p className="text-amber-500">{'★'.repeat(detail.feedback.rating)}{'☆'.repeat(5 - detail.feedback.rating)}</p>
              {detail.feedback.comment && <p className="mt-2 text-sm text-muted-foreground">{detail.feedback.comment}</p>}
            </CardContent>
          </Card>}
        </aside>
      </div>
    </div>
  );
}
