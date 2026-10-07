'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, MapPin, Clock, Users, Building2,
  AlertTriangle, CheckCircle2, MessageSquare, Star, Paperclip, UserRound
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { PriorityBadge, StatusBadge, SLAIndicator, LoadingState, ErrorState } from '@/components/civic/shared';
import { CATEGORY_NAMES, DEPARTMENT_NAMES } from '@/lib/constants';
import type { PriorityLevel } from '@/lib/types';

interface GrievanceDetail {
  id: string;
  title: string;
  description: string;
  categoryId: string;
  status: string;
  priorityScore?: number;
  priorityLevel?: PriorityLevel;
  location: { address?: string; area?: string; ward?: string; city?: string };
  duration?: string;
  affectedCount?: number;
  slaDeadline?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  departmentId?: string;
  attachments: {
    id: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    uploadedAt: string;
  }[];
}

interface AssignedOfficer {
  name: string;
  departmentId?: string;
}

interface StatusEntry {
  fromStatus?: string | null;
  toStatus: string;
  timestamp: string;
}

interface Update {
  message: string;
  createdAt: string;
}

interface Resolution {
  id: string;
  details: string;
  resolvedAt: string;
}

export default function GrievanceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState<{
    grievance: GrievanceDetail;
    statusHistory: StatusEntry[];
    citizenUpdates: Update[];
    feedback?: { rating: number; comment?: string };
    resolutions: Resolution[];
    duplicates?: { grievanceId: string; similarity: number }[];
    assignedOfficer?: AssignedOfficer | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [actionError, setActionError] = useState('');
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [reopenReason, setReopenReason] = useState('');
  const [resolutionLoading, setResolutionLoading] = useState(false);

  const loadGrievance = useCallback(async () => {
    const response = await fetch(`/api/grievances/${params.id}`, { cache: 'no-store' });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'The grievance could not be loaded.');
    const normalized = {
      grievance: payload.grievance,
      statusHistory: payload.statusHistory ?? [],
      citizenUpdates: payload.citizenUpdates ?? payload.updates ?? [],
      feedback: payload.feedback,
      resolutions: payload.resolutions ?? [],
      duplicates: payload.duplicates ?? [],
      assignedOfficer: payload.assignedOfficer ?? null,
    };
    setData(normalized);
  }, [params.id]);

  const retryLoading = async () => {
    setLoading(true);
    setError('');
    try {
      await loadGrievance();
    } catch (loadError) {
      console.error('Grievance detail retry failed:', loadError);
      setError('Unable to load this grievance. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGrievance()
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'The grievance could not be loaded.'))
      .finally(() => setLoading(false));
  }, [loadGrievance]);

  const handleResolutionAction = async (action: 'confirm' | 'reopen') => {
    if (!data || (action === 'reopen' && !reopenReason.trim())) return;
    const message = action === 'confirm'
      ? 'Confirm that this grievance has been resolved?'
      : 'Reopen this grievance and send the reason to the department?';
    if (!window.confirm(message)) return;

    setResolutionLoading(true);
    setActionError('');
    try {
      const response = await fetch(`/api/grievances/${data.grievance.id}/resolution`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          ...(action === 'reopen' ? { reason: reopenReason.trim() } : {}),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'The resolution action could not be completed.');
      setReopenReason('');
      await loadGrievance();
    } catch (resolutionError) {
      console.error('Grievance resolution action failed:', resolutionError);
      setActionError(resolutionError instanceof Error ? resolutionError.message : 'The resolution action could not be completed.');
    } finally {
      setResolutionLoading(false);
    }
  };

  const handleFeedback = async () => {
    if (feedbackRating === 0 || !data) return;
    setFeedbackLoading(true);
    setActionError('');
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grievanceId: data.grievance.id, rating: feedbackRating, comment: feedbackComment }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Your feedback could not be submitted.');
      setFeedbackSubmitted(true);
    } catch (feedbackError) {
      console.error('Grievance feedback could not be submitted:', feedbackError);
      setActionError(feedbackError instanceof Error ? feedbackError.message : 'Your feedback could not be submitted.');
    } finally {
      setFeedbackLoading(false);
    }
  };

  if (loading) return <LoadingState message="Loading grievance details..." />;
  if (error || !data) return <ErrorState title="Grievance unavailable" message={error || 'This grievance could not be loaded.'} onRetry={() => void retryLoading()} />;

  const g = data.grievance;
  const latestResolution = data.resolutions[0];

  return (
    <div className="space-y-6">
      {actionError && <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{actionError}</p>}
      {/* Back + Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" onClick={() => router.back()}>
          <ArrowLeft className="size-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-semibold text-primary">{g.id}</span>
            <StatusBadge status={g.status} />
            {g.priorityLevel && <PriorityBadge level={g.priorityLevel} score={g.priorityScore} />}
          </div>
          <h1 className="mt-1 text-xl font-bold">{g.title}</h1>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Complaint */}
          <Card>
            <CardHeader><CardTitle className="text-base">Complaint Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-relaxed text-muted-foreground">{g.description}</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2"><span className="text-muted-foreground">Category:</span><span className="font-medium">{CATEGORY_NAMES[g.categoryId] || g.categoryId}</span></div>
                <div className="flex items-center gap-2"><MapPin className="size-3.5 text-muted-foreground" /><span>{[g.location?.address, g.location?.area, g.location?.ward, g.location?.city].filter(Boolean).join(', ') || 'Location not provided'}</span></div>
                {g.duration && <div className="flex items-center gap-2"><Clock className="size-3.5 text-muted-foreground" /><span>{g.duration}</span></div>}
                {g.affectedCount && <div className="flex items-center gap-2"><Users className="size-3.5 text-muted-foreground" /><span>{g.affectedCount} affected</span></div>}
              </div>
            </CardContent>
          </Card>

          {g.attachments.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Paperclip className="size-4" />Evidence</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {g.attachments.map((attachment) => (
                  <div key={attachment.id} className="flex items-start justify-between gap-3 rounded-lg border p-3">
                    <div className="min-w-0">
                      <p className="break-all text-sm font-medium">{attachment.fileName}</p>
                      <p className="text-xs text-muted-foreground">
                        {attachment.fileType} · {(attachment.fileSize / (1024 * 1024)).toFixed(2)} MB · Uploaded {new Date(attachment.uploadedAt).toLocaleString('en-IN')}
                      </p>
                    </div>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground">
                  The current storage setup retains evidence details only; image files are not available for preview or download.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Duplicates */}
          {data.duplicates && data.duplicates.length > 0 && (
            <Card className="border-amber-200 dark:border-amber-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="size-4" />
                  Similar Complaints Detected ({data.duplicates.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Your complaint appears similar to {data.duplicates.length} other{data.duplicates.length > 1 ? ' complaints' : ' complaint'}.
                  This may indicate a wider issue being tracked by the department.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Updates */}
          {data.citizenUpdates.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2 text-base"><MessageSquare className="size-4" /> Updates</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.citizenUpdates.map((u, i) => (
                    <div key={i} className="rounded-lg bg-muted/50 p-3">
                      <p className="text-sm">{u.message}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{new Date(u.createdAt).toLocaleString('en-IN')}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {(g.status === 'RESOLVED' || g.status === 'CLOSED' || g.status === 'REOPENED') && (
            <Card className="border-emerald-200 dark:border-emerald-800">
              <CardHeader><CardTitle className="flex items-center gap-2 text-base"><CheckCircle2 className="size-4 text-emerald-600" />Resolution details</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {latestResolution?.details || 'The assigned team marked this grievance as resolved.'}
                </p>
                {(latestResolution?.resolvedAt || g.resolvedAt) && <p className="text-xs text-muted-foreground">Resolved {new Date(latestResolution?.resolvedAt || g.resolvedAt!).toLocaleString('en-IN')}</p>}
                {data.resolutions.length > 1 && (
                  <div className="border-t pt-3">
                    <p className="mb-2 text-xs font-medium text-muted-foreground">Previous resolution attempts</p>
                    <ul className="space-y-2">
                      {data.resolutions.slice(1).map((resolution) => (
                        <li key={resolution.id} className="text-xs text-muted-foreground">
                          <span>{new Date(resolution.resolvedAt).toLocaleString('en-IN')}: </span>{resolution.details}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {g.status === 'RESOLVED' && (
            <Card>
              <CardHeader><CardTitle className="text-base">Verify this resolution</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">Confirm the issue is fixed, or reopen it if the problem remains.</p>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => void handleResolutionAction('confirm')} disabled={resolutionLoading}>
                    {resolutionLoading ? 'Saving…' : 'Confirm resolution'}
                  </Button>
                </div>
                <div className="space-y-2">
                  <Textarea
                    value={reopenReason}
                    onChange={(event) => setReopenReason(event.target.value)}
                    placeholder="Explain why the issue is not resolved (required to reopen)"
                    maxLength={2000}
                    rows={3}
                  />
                  <Button
                    variant="outline"
                    onClick={() => void handleResolutionAction('reopen')}
                    disabled={resolutionLoading || !reopenReason.trim()}
                  >
                    Reopen grievance
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          {g.status === 'CLOSED' && (
            <Card>
              <CardHeader><CardTitle className="text-base">Still having this issue?</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  value={reopenReason}
                  onChange={(event) => setReopenReason(event.target.value)}
                  placeholder="Explain why the issue is not resolved (required to reopen)"
                  maxLength={2000}
                  rows={3}
                />
                <Button
                  variant="outline"
                  onClick={() => void handleResolutionAction('reopen')}
                  disabled={resolutionLoading || !reopenReason.trim()}
                >
                  {resolutionLoading ? 'Reopening…' : 'Reopen grievance'}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Feedback */}
          {(g.status === 'RESOLVED' || g.status === 'CLOSED') && !data.feedback && !feedbackSubmitted && (
            <Card>
              <CardHeader><CardTitle className="text-base">Was your issue resolved?</CardTitle></CardHeader>
              <CardContent>
                {!showFeedback ? (
                  <Button variant="outline" onClick={() => setShowFeedback(true)} className="gap-2">
                    <Star className="size-4" /> Give Feedback
                  </Button>
                ) : (
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button key={n} onClick={() => setFeedbackRating(n)} className={`flex size-10 items-center justify-center rounded-lg border text-lg transition-all ${feedbackRating >= n ? 'border-amber-400 bg-amber-50 text-amber-500' : 'hover:border-amber-300'}`}>
                          ★
                        </button>
                      ))}
                    </div>
                    <Textarea placeholder="Additional comments (optional)" value={feedbackComment} onChange={(e) => setFeedbackComment(e.target.value)} rows={3} />
                    <Button onClick={handleFeedback} disabled={feedbackRating === 0 || feedbackLoading}>
                      {feedbackLoading ? 'Submitting…' : 'Submit Feedback'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          {data.feedback && (
            <Card>
              <CardHeader><CardTitle className="text-base">Your feedback</CardTitle></CardHeader>
              <CardContent className="space-y-1">
                <p className="text-amber-500" aria-label={`${data.feedback.rating} out of 5 stars`}>{'★'.repeat(data.feedback.rating)}{'☆'.repeat(5 - data.feedback.rating)}</p>
                {data.feedback.comment && <p className="text-sm text-muted-foreground">{data.feedback.comment}</p>}
              </CardContent>
            </Card>
          )}
          {feedbackSubmitted && (
            <Card className="border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10">
              <CardContent className="flex items-center gap-3 py-4">
                <CheckCircle2 className="size-5 text-emerald-500" />
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Thank you for your feedback!</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Status Timeline */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Status Timeline</CardTitle></CardHeader>
            <CardContent>
              {data.statusHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground">No status history is available yet.</p>
              ) : (
                <div className="space-y-0">
                  {data.statusHistory.map((entry, index) => (
                    <div key={`${entry.toStatus}-${entry.timestamp}-${index}`} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                          <CheckCircle2 className="size-3.5" />
                        </div>
                        {index < data.statusHistory.length - 1 && <div className="min-h-[24px] w-0.5 flex-1 bg-primary/40" />}
                      </div>
                      <div className="pb-4">
                        <p className="text-sm font-medium">{entry.toStatus.replace(/_/g, ' ')}</p>
                        {entry.fromStatus && <p className="text-xs text-muted-foreground">Changed from {entry.fromStatus.replace(/_/g, ' ')}</p>}
                        <p className="text-xs text-muted-foreground">{new Date(entry.timestamp).toLocaleString('en-IN')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* SLA */}
          {g.slaDeadline && (
            <Card>
              <CardHeader><CardTitle className="text-sm">SLA Deadline</CardTitle></CardHeader>
              <CardContent>
                <SLAIndicator deadline={g.slaDeadline} />
                <p className="mt-2 text-xs text-muted-foreground">
                  Deadline: {new Date(g.slaDeadline).toLocaleString('en-IN')}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Department */}
          {g.departmentId && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Assigned Department</CardTitle></CardHeader>
              <CardContent className="flex items-center gap-2 text-sm">
                <Building2 className="size-4 text-primary" />
                <span className="font-medium">{DEPARTMENT_NAMES[g.departmentId] || g.departmentId}</span>
              </CardContent>
            </Card>
          )}

          {data.assignedOfficer && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Assigned officer</CardTitle></CardHeader>
              <CardContent className="flex items-center gap-2 text-sm">
                <UserRound className="size-4 text-primary" />
                <span className="font-medium">{data.assignedOfficer.name}</span>
              </CardContent>
            </Card>
          )}

          {/* Info */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Details</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between gap-3"><span className="text-muted-foreground">Submitted</span><span className="text-right">{new Date(g.createdAt).toLocaleString('en-IN')}</span></div>
              <Separator />
              <div className="flex justify-between gap-3"><span className="text-muted-foreground">Last Updated</span><span className="text-right">{new Date(g.updatedAt).toLocaleString('en-IN')}</span></div>
              {g.resolvedAt && <>
                <Separator />
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">Resolved</span><span className="text-right">{new Date(g.resolvedAt).toLocaleString('en-IN')}</span></div>
              </>}
            </CardContent>
          </Card>

          <p className="text-center text-xs text-muted-foreground">
            AI assists authorized officers. Final decisions remain with authorized human officials.
          </p>
        </div>
      </div>
    </div>
  );
}
