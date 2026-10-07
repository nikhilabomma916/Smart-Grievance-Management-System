import { NextRequest } from 'next/server';
import { getAuthUser } from '@/server/api-utils';
import {
  getGrievanceAnalysis,
  getLatestGrievanceAIDecision,
  getLatestGrievanceRecommendation,
  getGrievanceCitizenUpdates,
  getGrievanceFeedback,
  getGrievanceResolutions,
  getGrievanceForUser,
  getGrievanceInternalNotes,
  getGrievanceParticipants,
  getPublicAssignedOfficer,
  getGrievanceStatusHistory,
  isValidGrievanceId,
  updateGrievance,
} from '@/server/data/grievances';
import { isDatabaseConfigured } from '@/server/db';
import { grievanceUpdateSchema } from '@/server/validation/grievance';
import { buildGrievanceAnalysisSummary } from '@/server/ai/priority-engine';

type RouteContext = { params: Promise<{ id: string }> };

function databaseErrorResponse(error: unknown): Response {
  console.error('Grievance detail database operation failed:', error);
  const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;
  if (code === '42P01') {
    return Response.json({ error: 'The grievance database migration has not been applied.' }, { status: 503 });
  }
  if (code === 'ENOTFOUND' || code === 'EAI_AGAIN' || code === 'ECONNREFUSED' ||
      code === 'ETIMEDOUT' || code === 'ECONNRESET') {
    return Response.json({ error: 'The database is currently unavailable.' }, { status: 503 });
  }
  return Response.json({ error: 'The grievance request could not be completed.' }, { status: 500 });
}

export async function GET(_req: NextRequest, ctx: RouteContext) {
  const user = await getAuthUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isDatabaseConfigured()) {
    return Response.json({ error: 'The grievance database is not configured.' }, { status: 503 });
  }

  const { id } = await ctx.params;
  if (!isValidGrievanceId(id)) return Response.json({ error: 'Not Found' }, { status: 404 });

  try {
    const grievance = await getGrievanceForUser(id, user);
    if (!grievance) return Response.json({ error: 'Not Found' }, { status: 404 });

    if (user.role === 'citizen') {
      const [statusHistory, citizenUpdates, feedback, resolutions, assignedOfficer] = await Promise.all([
        getGrievanceStatusHistory(id),
        getGrievanceCitizenUpdates(id, true),
        getGrievanceFeedback(id),
        getGrievanceResolutions(id),
        getPublicAssignedOfficer(id),
      ]);
      const publicGrievance = {
        id: grievance.id,
        title: grievance.title,
        description: grievance.description,
        categoryId: grievance.categoryId,
        status: grievance.status,
        ...(grievance.priorityScore !== undefined ? { priorityScore: grievance.priorityScore } : {}),
        ...(grievance.priorityLevel ? { priorityLevel: grievance.priorityLevel } : {}),
        location: grievance.location,
        ...(grievance.duration ? { duration: grievance.duration } : {}),
        ...(grievance.affectedCount !== undefined ? { affectedCount: grievance.affectedCount } : {}),
        ...(grievance.slaDeadline ? { slaDeadline: grievance.slaDeadline } : {}),
        createdAt: grievance.createdAt,
        updatedAt: grievance.updatedAt,
        ...(grievance.resolvedAt ? { resolvedAt: grievance.resolvedAt } : {}),
        ...(grievance.departmentId ? { departmentId: grievance.departmentId } : {}),
        attachments: grievance.attachments.map((attachment) => ({
          id: attachment.id,
          fileName: attachment.fileName,
          fileType: attachment.fileType,
          fileSize: attachment.fileSize,
          uploadedAt: attachment.uploadedAt,
        })),
      };
      const publicTimeline = statusHistory.map((entry) => ({
        fromStatus: entry.fromStatus,
        toStatus: entry.toStatus,
        timestamp: entry.timestamp,
      }));

      return Response.json({
        grievance: publicGrievance,
        statusHistory: publicTimeline,
        citizenUpdates,
        feedback: feedback
          ? { rating: feedback.rating, ...(feedback.comment ? { comment: feedback.comment } : {}), createdAt: feedback.createdAt }
          : null,
        resolutions: resolutions.map((resolution) => ({
          id: resolution.id,
          details: resolution.details,
          resolvedAt: resolution.resolvedAt,
        })),
        ...(assignedOfficer ? { assignedOfficer } : {}),
      });
    }

    const [
      storedAnalysis,
      statusHistory,
      internalNotes,
      citizenUpdates,
      feedback,
      resolutions,
      participants,
      publicAssignedOfficer,
      recommendation,
      latestDecision,
    ] = await Promise.all([
      getGrievanceAnalysis(id),
      getGrievanceStatusHistory(id),
      getGrievanceInternalNotes(id),
      getGrievanceCitizenUpdates(id),
      getGrievanceFeedback(id),
      getGrievanceResolutions(id),
      getGrievanceParticipants(id),
      Promise.resolve(undefined),
      getLatestGrievanceRecommendation(id),
      getLatestGrievanceAIDecision(id),
    ]);
    const analysis = storedAnalysis
      ? {
          ...storedAnalysis,
          summary: buildGrievanceAnalysisSummary(
            storedAnalysis,
            grievance.priorityLevel && grievance.priorityScore !== undefined
              ? { level: grievance.priorityLevel, score: grievance.priorityScore }
              : undefined,
          ),
        }
      : undefined;
    const timeline = statusHistory.map((entry) => ({
      ...(user.role === 'citizen'
        ? {
            id: entry.id,
            fromStatus: entry.fromStatus,
            toStatus: entry.toStatus,
            note: entry.note,
            timestamp: entry.timestamp,
          }
        : entry),
      to: entry.toStatus,
      createdAt: entry.timestamp,
    }));

    return Response.json({
      ...grievance,
      grievance,
      analysis: analysis ?? null,
      recommendation: recommendation ?? null,
      recommendationDecision: recommendation?.id === latestDecision?.recommendationId
        ? latestDecision
        : null,
      statusHistory: timeline,
      notes: internalNotes,
      internalNotes,
      updates: citizenUpdates,
      citizenUpdates,
      feedback: feedback ?? null,
      resolutions,
      duplicates: [],
      ...(publicAssignedOfficer ? { assignedOfficer: publicAssignedOfficer } : {}),
      ...(participants ? {
        citizen: { name: participants.citizenName, ...(participants.citizenPhone ? { phone: participants.citizenPhone } : {}) },
        assignedOfficer: participants.assignedOfficerName
          ? {
              name: participants.assignedOfficerName,
              ...(participants.assignedOfficerEmail ? { email: participants.assignedOfficerEmail } : {}),
              ...(participants.assignedOfficerDepartmentId
                ? { departmentId: participants.assignedOfficerDepartmentId }
                : {}),
            }
          : null,
      } : {}),
    });
  } catch (error) {
    return databaseErrorResponse(error);
  }
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const user = await getAuthUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'admin' && user.role !== 'department_admin') {
    return Response.json({ error: 'Only administrators can update grievance records.' }, { status: 403 });
  }
  if (!isDatabaseConfigured()) {
    return Response.json({ error: 'The grievance database is not configured.' }, { status: 503 });
  }

  const { id } = await ctx.params;
  if (!isValidGrievanceId(id)) return Response.json({ error: 'Not Found' }, { status: 404 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const parsed = grievanceUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({
      error: 'Please provide valid grievance updates.',
      fields: parsed.error.issues.map(({ path, message }) => ({ field: path.join('.'), message })),
    }, { status: 400 });
  }
  if (user.role === 'department_admin' &&
      Object.keys(parsed.data).some((key) => key !== 'status' && key !== 'reason')) {
    return Response.json({
      error: 'Department administrators may only update grievance status and its public update.',
    }, { status: 403 });
  }
  if (user.role === 'department_admin' && parsed.data.status &&
      !['IN_PROGRESS', 'AWAITING_INFORMATION', 'RESOLVED', 'ESCALATED'].includes(parsed.data.status)) {
    return Response.json({ error: 'This status cannot be set by a department administrator.' }, { status: 403 });
  }
  if (user.role === 'department_admin' && parsed.data.status === 'RESOLVED' && !parsed.data.reason) {
    return Response.json({ error: 'A resolution summary is required.' }, { status: 400 });
  }
  try {
    const updated = await updateGrievance(id, user, parsed.data);
    if (!updated) return Response.json({ error: 'Not Found' }, { status: 404 });
    return Response.json({ grievance: updated });
  } catch (error) {
    return databaseErrorResponse(error);
  }
}
