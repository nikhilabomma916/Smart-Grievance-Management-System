'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { 
  ArrowLeft, Brain, Check, AlertTriangle, FileText,
  MapPin, Clock, Users, Zap, Repeat, Plus, AlertCircle
} from 'lucide-react';
import { PriorityBadge, StatusBadge, SLAIndicator, LoadingState, EmptyState } from '@/components/civic/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { DEPARTMENT_NAMES } from '@/lib/constants';

export default function GrievanceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [actionError, setActionError] = useState('');
  const [showRecommendationEdit, setShowRecommendationEdit] = useState(false);
  const [recommendationSummary, setRecommendationSummary] = useState('');
  const [decisionNote, setDecisionNote] = useState('');

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/grievances/${id}`);
        if (res.ok) {
          const result = await res.json();
          setData(result);
        }
      } catch (error) {
        console.error('Error fetching grievance:', error);
      } finally {
        setLoading(false);
      }
    }
    if (id) fetchData();
  }, [id]);

  const handleStatusChange = async (newStatus: 'IN_PROGRESS' | 'AWAITING_INFORMATION' | 'RESOLVED') => {
    setActionLoading(true);
    setActionError('');
    try {
      const res = await fetch(`/api/grievances/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          ...(['AWAITING_INFORMATION', 'RESOLVED'].includes(newStatus) && statusMessage.trim()
            ? { citizenMessage: statusMessage.trim() }
            : {}),
        }),
      });
      const updated = await res.json();
      if (!res.ok) throw new Error(updated.error || 'The grievance status could not be updated.');
      setData((prev: any) => ({ ...prev, ...updated, grievance: updated.grievance }));
      setStatusMessage('');
    } catch (error) {
      console.error('Error updating status:', error);
      setActionError(error instanceof Error ? error.message : 'The grievance status could not be updated.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!noteContent.trim()) return;
    setActionLoading(true);
    setActionError('');
    try {
      const res = await fetch(`/api/grievances/${id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: noteContent, isInternal: true })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'The internal note could not be saved.');
      setNoteContent('');
      const freshRes = await fetch(`/api/grievances/${id}`);
      const freshData = await freshRes.json();
      if (!freshRes.ok) throw new Error(freshData.error || 'The grievance details could not be refreshed.');
      setData(freshData);
    } catch (error) {
      console.error('Error adding note:', error);
      setActionError(error instanceof Error ? error.message : 'The internal note could not be saved.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEscalate = async () => {
    setActionLoading(true);
    setActionError('');
    try {
      const response = await fetch(`/api/grievances/${id}/escalate`, { method: 'POST' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'The grievance could not be escalated.');
      setData((previous: any) => ({ ...previous, grievance: result.grievance }));
    } catch (error) {
      console.error('Error escalating grievance:', error);
      setActionError(error instanceof Error ? error.message : 'The grievance could not be escalated.');
    } finally {
      setActionLoading(false);
    }
  };

  const refreshGrievance = async () => {
    const response = await fetch(`/api/grievances/${id}`);
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'The grievance details could not be refreshed.');
    setData(result);
  };

  const handleRecommendationAction = async (
    action: 'generate' | 'ACCEPTED' | 'MODIFIED' | 'REJECTED',
  ) => {
    setActionLoading(true);
    setActionError('');
    try {
      let payload: Record<string, unknown>;
      if (action === 'generate') {
        payload = { action: 'generate' };
      } else {
        payload = { decision: action };
        if (decisionNote.trim()) payload.officerNote = decisionNote.trim();
        if (action === 'MODIFIED') {
          const original = data?.recommendation;
          if (!original || !recommendationSummary.trim()) {
            throw new Error('Enter a final recommendation summary before saving the modification.');
          }
          payload.finalRecommendation = {
            summary: recommendationSummary.trim(),
            keyFindings: original.keyFindings,
            recommendedActions: original.recommendedActions,
            ...(original.suggestedCitizenResponse
              ? { suggestedCitizenResponse: original.suggestedCitizenResponse }
              : {}),
            ...(original.escalationRecommendation
              ? { escalationRecommendation: original.escalationRecommendation }
              : {}),
            ...(original.relevantKnowledge ? { relevantKnowledge: original.relevantKnowledge } : {}),
          };
        }
      }
      const response = await fetch(`/api/grievances/${id}/recommendation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'The recommendation action could not be saved.');
      setShowRecommendationEdit(false);
      setDecisionNote('');
      await refreshGrievance();
    } catch (error) {
      console.error('Recommendation action failed:', error);
      setActionError(error instanceof Error ? error.message : 'The recommendation action could not be saved.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <LoadingState message="Loading grievance details..." />;
  if (!data || !data.grievance) return <EmptyState title="Not Found" description="The grievance could not be found." />;

  const { grievance, analysis, internalNotes, statusHistory, duplicates } = data;
  const score = grievance.priorityScore ?? 0;
  const { recommendation, recommendationDecision } = data;

  return (
    <div className="space-y-6 pb-20">
      {actionError && <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{actionError}</p>}
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="text-slate-500 hover:text-slate-900">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
      </div>

      {/* 1. Header */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-slate-500 font-mono">
              <span>{grievance.id}</span>
              <span>•</span>
              <span>{format(new Date(grievance.createdAt), 'MMM d, yyyy h:mm a')}</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">{grievance.title}</h1>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <div className="flex gap-2">
              <PriorityBadge level={grievance.priority} score={score} />
              <StatusBadge status={grievance.status} />
            </div>
            {grievance.slaDeadline && <SLAIndicator deadline={grievance.slaDeadline} />}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          
          {/* 2. Complaint Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-slate-500" />
                Complaint Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-md text-slate-700 whitespace-pre-wrap text-sm border border-slate-100">
                {grievance.description}
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                <div className="space-y-1">
                  <div className="text-xs text-slate-500 font-medium">Category</div>
                  <div className="text-sm font-medium">{grievance.category}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-slate-500 font-medium">Location</div>
                  <div className="text-sm font-medium flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-slate-400" />
                    <span className="truncate" title={grievance.location.address}>{grievance.location.address}</span>
                  </div>
                </div>
                {grievance.duration && (
                  <div className="space-y-1">
                    <div className="text-xs text-slate-500 font-medium">Duration</div>
                    <div className="text-sm font-medium flex items-center gap-1">
                      <Clock className="h-3 w-3 text-slate-400" />
                      {grievance.duration}
                    </div>
                  </div>
                )}
                {grievance.affectedCount && (
                  <div className="space-y-1">
                    <div className="text-xs text-slate-500 font-medium">Affected</div>
                    <div className="text-sm font-medium flex items-center gap-1">
                      <Users className="h-3 w-3 text-slate-400" />
                      {grievance.affectedCount}
                    </div>
                  </div>
                )}
              </div>
              {grievance.attachments?.length > 0 && (
                <div className="border-t pt-4">
                  <div className="mb-2 text-xs font-medium text-slate-500">Attachments</div>
                  <ul className="space-y-1 text-sm">
                    {grievance.attachments.map((attachment: any) => (
                      <li key={attachment.id} className="flex items-center justify-between gap-3">
                        <span className="truncate">{attachment.fileName}</span>
                        <span className="shrink-0 text-xs text-slate-500">
                          {attachment.fileType} · {Math.ceil(attachment.fileSize / 1024)} KB
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 3 & 4. AI Summary and Priority Breakdown */}
          {analysis && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <Card className="border-indigo-100 bg-indigo-50/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2 text-indigo-900">
                    <Brain className="h-4 w-4 text-indigo-500" /> AI Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-700 mb-3">{analysis.summary}</p>
                  <dl className="mb-3 grid grid-cols-1 gap-x-4 gap-y-1 text-xs text-slate-600 sm:grid-cols-2">
                    <div><dt className="inline font-medium">AI category: </dt><dd className="inline">{analysis.category}</dd></div>
                    {analysis.subcategory && <div><dt className="inline font-medium">Subcategory: </dt><dd className="inline">{analysis.subcategory}</dd></div>}
                    {analysis.issueType && <div><dt className="inline font-medium">Issue type: </dt><dd className="inline">{analysis.issueType}</dd></div>}
                    {analysis.extractedLocation && <div><dt className="inline font-medium">Extracted location: </dt><dd className="inline">{analysis.extractedLocation}</dd></div>}
                    {analysis.extractedDuration && <div><dt className="inline font-medium">Extracted duration: </dt><dd className="inline">{analysis.extractedDuration}</dd></div>}
                    {analysis.affectedPopulation && <div><dt className="inline font-medium">Affected population: </dt><dd className="inline">{analysis.affectedPopulation}</dd></div>}
                    {analysis.confidence !== undefined && <div><dt className="inline font-medium">Analysis confidence: </dt><dd className="inline">{Math.round(analysis.confidence * 100)}%</dd></div>}
                    {analysis.aiProvider && <div><dt className="inline font-medium">Provider: </dt><dd className="inline">{analysis.aiProvider}</dd></div>}
                  </dl>
                  <div className="space-y-1">
                    {analysis.reasoning?.map((finding: string, i: number) => (
                      <div key={i} className="flex gap-2 text-xs text-slate-600">
                        <span className="text-indigo-400">•</span> {finding}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Zap className="h-4 w-4 text-amber-500" /> Overall Priority: {grievance.priorityLevel || 'Unavailable'} ({score}/100)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div><span className="text-slate-500">AI urgency:</span> {analysis.urgency}</div>
                  <div><span className="text-slate-500">Impact:</span> {analysis.impact}</div>
                  <div><span className="text-slate-500">Safety risk:</span> {analysis.safetyRisk ? 'Identified' : 'Not identified'}</div>
                </CardContent>
              </Card>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Brain className="h-4 w-4 text-indigo-500" /> AI Resolution Recommendation
              </CardTitle>
              <CardDescription>
                Recommendations are generated from this grievance's persisted details and analysis. No confidence score is supplied.
              </CardDescription>
            </CardHeader>
            {recommendation ? (
              <CardContent className="space-y-4">
                <div className="rounded-md border border-indigo-100 bg-indigo-50/50 p-4 text-sm text-indigo-950">
                  {recommendation.summary}
                </div>
                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase text-slate-500">Key findings</h3>
                  <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
                    {recommendation.keyFindings.map((finding: string, index: number) => (
                      <li key={index}>{finding}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase text-slate-500">Recommended actions</h3>
                  <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-700">
                    {recommendation.recommendedActions.map((action: any, index: number) => (
                      <li key={index}>
                        {typeof action === 'string' ? action : action.action}
                        {typeof action !== 'string' && (
                          <span className="ml-2 text-xs text-slate-500">
                            {DEPARTMENT_NAMES[action.department] || action.department}
                          </span>
                        )}
                      </li>
                    ))}
                  </ol>
                </div>
                {recommendation.suggestedCitizenResponse && (
                  <div>
                    <h3 className="mb-2 text-xs font-semibold uppercase text-slate-500">Suggested citizen response</h3>
                    <p className="rounded-md bg-slate-50 p-3 text-sm text-slate-700">
                      {recommendation.suggestedCitizenResponse}
                    </p>
                  </div>
                )}
                {recommendation.escalationRecommendation && (
                  <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                    {recommendation.escalationRecommendation}
                  </p>
                )}
                {recommendationDecision ? (
                  <div className="space-y-2 border-t pt-4">
                    <p className="text-sm font-semibold">
                      Officer decision: {recommendationDecision.decision.toLowerCase()}
                    </p>
                    {recommendationDecision.finalRecommendation && (
                      <div>
                        <p className="text-xs font-medium text-slate-500">Authoritative final recommendation</p>
                        <p className="text-sm text-slate-700">
                          {recommendationDecision.finalRecommendation.summary}
                        </p>
                      </div>
                    )}
                    {recommendationDecision.officerNote && (
                      <p className="text-sm text-slate-600">Officer note: {recommendationDecision.officerNote}</p>
                    )}
                    <p className="text-xs text-slate-500">
                      Recorded {format(new Date(recommendationDecision.createdAt), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 border-t pt-4">
                    {showRecommendationEdit && (
                      <>
                        <label className="block text-sm font-medium" htmlFor="final-recommendation">
                          Modified final recommendation summary
                        </label>
                        <Textarea
                          id="final-recommendation"
                          value={recommendationSummary}
                          maxLength={20000}
                          onChange={(event) => setRecommendationSummary(event.target.value)}
                        />
                      </>
                    )}
                    <Textarea
                      placeholder="Optional decision note"
                      maxLength={5000}
                      value={decisionNote}
                      onChange={(event) => setDecisionNote(event.target.value)}
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        className="border-red-200 text-red-600"
                        onClick={() => void handleRecommendationAction('REJECTED')}
                        disabled={actionLoading}
                      >
                        Reject
                      </Button>
                      {showRecommendationEdit ? (
                        <Button
                          onClick={() => void handleRecommendationAction('MODIFIED')}
                          disabled={actionLoading || !recommendationSummary.trim()}
                        >
                          Save Modified Decision
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          onClick={() => {
                            setRecommendationSummary(recommendation.summary);
                            setShowRecommendationEdit(true);
                          }}
                          disabled={actionLoading}
                        >
                          Modify
                        </Button>
                      )}
                      <Button
                        className="bg-emerald-600 text-white hover:bg-emerald-700"
                        onClick={() => void handleRecommendationAction('ACCEPTED')}
                        disabled={actionLoading}
                      >
                        <Check className="mr-2 h-4 w-4" /> Accept & Record
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            ) : (
              <CardContent className="space-y-3">
                <p className="text-sm text-slate-600">
                  {analysis
                    ? 'No recommendation has been generated for this grievance yet.'
                    : 'Complete AI analysis before generating a resolution recommendation.'}
                </p>
                <Button
                  onClick={() => void handleRecommendationAction('generate')}
                  disabled={actionLoading || !analysis}
                >
                  Generate Recommendation
                </Button>
              </CardContent>
            )}
          </Card>

          {/* 10. Internal Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Internal Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {internalNotes?.length > 0 ? (
                <div className="space-y-4">
                  {internalNotes.map((note: any, i: number) => (
                    <div key={i} className="flex gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">
                        {note.authorId?.substring(0, 2).toUpperCase() || 'O'}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-baseline mb-1">
                          <span className="text-sm font-medium text-slate-900">{note.authorName}</span>
                          <span className="text-xs text-slate-500">{format(new Date(note.createdAt), 'MMM d, h:mm a')}</span>
                        </div>
                        <p className="text-sm text-slate-700">{note.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-sm text-slate-500">No internal notes yet.</div>
              )}

              <div className="pt-2">
                <Textarea 
                  placeholder="Add an internal note (not visible to citizen)..." 
                  className="mb-2 text-sm"
                  maxLength={5000}
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                />
                <div className="flex justify-end">
                  <Button size="sm" onClick={handleAddNote} disabled={actionLoading || !noteContent.trim()}>
                    <Plus className="mr-2 h-4 w-4" /> Add Note
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Citizen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div><span className="text-slate-500">Name:</span> {data.citizen?.name || 'Not available'}</div>
              {data.citizen?.phone && (
                <div><span className="text-slate-500">Phone:</span> {data.citizen.phone}</div>
              )}
            </CardContent>
          </Card>

          {/* 11. Status Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Update Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {grievance.status === 'ASSIGNED' && (
                <Button
                  className="w-full justify-start"
                  onClick={() => void handleStatusChange('IN_PROGRESS')}
                  disabled={actionLoading}
                >
                  <Clock className="mr-2 h-4 w-4 text-blue-500" /> Mark In Progress
                </Button>
              )}
              {grievance.status === 'IN_PROGRESS' && (
                <>
                  <Textarea
                    placeholder="Optional message to the citizen (required when requesting information)..."
                    className="text-sm"
                    maxLength={5000}
                    value={statusMessage}
                    onChange={(event) => setStatusMessage(event.target.value)}
                  />
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => void handleStatusChange('AWAITING_INFORMATION')}
                    disabled={actionLoading || !statusMessage.trim()}
                  >
                    <AlertCircle className="mr-2 h-4 w-4 text-amber-500" /> Request Information
                  </Button>
                  <Button
                    className="w-full justify-start"
                    onClick={() => void handleStatusChange('RESOLVED')}
                    disabled={actionLoading}
                  >
                    <Check className="mr-2 h-4 w-4 text-emerald-500" /> Resolve Issue
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start border-red-200 hover:bg-red-50 hover:text-red-700"
                    onClick={() => void handleEscalate()}
                    disabled={actionLoading}
                  >
                    <AlertTriangle className="mr-2 h-4 w-4 text-red-500" /> Escalate
                  </Button>
                </>
              )}
              {grievance.status === 'AWAITING_INFORMATION' && (
                <Button
                  className="w-full justify-start"
                  onClick={() => void handleStatusChange('IN_PROGRESS')}
                  disabled={actionLoading}
                >
                  <Clock className="mr-2 h-4 w-4 text-blue-500" /> Resume Work
                </Button>
              )}
              {!['ASSIGNED', 'IN_PROGRESS', 'AWAITING_INFORMATION'].includes(grievance.status) && (
                <p className="text-sm text-slate-500">No officer status action is available for this grievance state.</p>
              )}
            </CardContent>
          </Card>

          {/* 9. Assignment */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5 text-slate-500" /> Assignment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <div className="text-xs text-slate-500 font-medium">Department</div>
                <div className="text-sm font-medium">
                  {DEPARTMENT_NAMES[grievance.departmentId || ''] || grievance.departmentId || 'Unassigned'}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-slate-500 font-medium">Officer</div>
                <div className="text-sm font-medium">{data.assignedOfficer?.name || 'Unassigned'}</div>
                {data.assignedOfficer?.email && (
                  <div className="text-xs text-slate-500">{data.assignedOfficer.email}</div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 5. Similar Complaints */}
          {duplicates && duplicates.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Repeat className="h-4 w-4 text-slate-500" /> Similar Reports
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {duplicates.map((dup: any) => (
                    <div key={dup.id} className="flex flex-col p-2 bg-slate-50 rounded border border-slate-100 text-sm cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => router.push(`/officer/grievances/${dup.id}`)}>
                      <div className="flex justify-between items-center">
                        <span className="font-mono text-xs text-slate-500">{dup.id.substring(0, 8)}</span>
                        <Badge variant="outline" className="text-[10px]">{Math.round(dup.similarity * 100)}% match</Badge>
                      </div>
                      <span className="truncate font-medium mt-1 text-slate-900">{dup.title}</span>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-xs text-slate-500 truncate max-w-[120px]">{dup.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* 12. Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
                {statusHistory?.map((history: any, i: number) => (
                  <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-100 text-slate-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-3 rounded border border-slate-200 bg-white shadow-sm">
                      <div className="flex justify-between mb-1">
                        <div className="font-semibold text-slate-900 text-sm">{history.to}</div>
                        <time className="font-mono text-xs text-slate-500">{format(new Date(history.createdAt), 'MMM d')}</time>
                      </div>
                      <div className="text-xs text-slate-500">Status updated</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
