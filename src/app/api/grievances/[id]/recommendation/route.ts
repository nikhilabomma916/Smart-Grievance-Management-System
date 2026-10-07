import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getAuthUser } from '@/server/api-utils';
import {
  getGrievanceAnalysis,
  getGrievanceForUser,
  getLatestGrievanceAIDecision,
  getLatestGrievanceRecommendation,
  isValidGrievanceId,
  persistGrievanceAIDecision,
  persistGrievanceRecommendation,
} from '@/server/data/grievances';
import { isDatabaseConfigured } from '@/server/db';
import { createAIService } from '@/server/ai/ai-service';
import { grievanceAIDecisionSchema, grievanceRecommendationSchema } from '@/server/validation/grievance';

type RouteContext = { params: Promise<{ id: string }> };
const generateSchema = z.object({ action: z.literal('generate') }).strict();

function migrationError(error: unknown): boolean {
  const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;
  return code === '42P01' || code === '42703';
}

async function loadAuthorizedGrievance(id: string) {
  const user = await getAuthUser();
  if (!user) return { response: Response.json({ error: 'Unauthorized' }, { status: 401 }) };
  if (user.role !== 'officer' && user.role !== 'admin' && user.role !== 'department_admin') {
    return { response: Response.json({ error: 'Only officers and administrators can access recommendations.' }, { status: 403 }) };
  }
  if (!isDatabaseConfigured()) {
    return { response: Response.json({ error: 'The grievance database is not configured.' }, { status: 503 }) };
  }
  const grievance = await getGrievanceForUser(id, user);
  if (!grievance) return { response: Response.json({ error: 'Not found' }, { status: 404 }) };
  if (user.role === 'officer' && grievance.assignedOfficerId !== user.userId) {
    return { response: Response.json({ error: 'Not found' }, { status: 404 }) };
  }
  return { user, grievance };
}

export async function GET(_req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  if (!isValidGrievanceId(id)) return Response.json({ error: 'Not found' }, { status: 404 });

  try {
    const access = await loadAuthorizedGrievance(id);
    if ('response' in access) return access.response;
    const [recommendation, latestDecision] = await Promise.all([
      getLatestGrievanceRecommendation(id),
      getLatestGrievanceAIDecision(id),
    ]);
    return Response.json({
      recommendation: recommendation ?? null,
      decision: recommendation?.id === latestDecision?.recommendationId ? latestDecision : null,
    });
  } catch (error) {
    console.error('Grievance recommendation lookup failed:', error);
    if (migrationError(error)) {
      return Response.json({ error: 'The officer workflow migration has not been applied.' }, { status: 503 });
    }
    return Response.json({ error: 'The recommendation could not be loaded.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  if (!isValidGrievanceId(id)) return Response.json({ error: 'Not found' }, { status: 404 });

  const user = await getAuthUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'officer') {
    return Response.json({ error: 'Only the assigned officer can generate or decide on recommendations.' }, { status: 403 });
  }
  if (!isDatabaseConfigured()) {
    return Response.json({ error: 'The grievance database is not configured.' }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }

  try {
    const access = await loadAuthorizedGrievance(id);
    if ('response' in access) return access.response;

    if (typeof body === 'object' && body !== null && 'action' in body && body.action === 'generate') {
      const parsedGenerate = generateSchema.safeParse(body);
      if (!parsedGenerate.success) {
        return Response.json({ error: 'Invalid recommendation generation request.' }, { status: 400 });
      }
      const analysis = await getGrievanceAnalysis(id);
      if (!analysis) {
        return Response.json({ error: 'Complete AI analysis before generating a resolution recommendation.' }, { status: 409 });
      }
      const service = await createAIService();
      const generated = grievanceRecommendationSchema.parse(
        await service.generateResolution(access.grievance, analysis),
      );
      const recommendation = await persistGrievanceRecommendation(id, user.userId, generated);
      if (!recommendation) return Response.json({ error: 'Not found' }, { status: 404 });
      return Response.json({ recommendation }, { status: 201 });
    }

    const parsedDecision = grievanceAIDecisionSchema.safeParse(body);
    if (!parsedDecision.success) {
      return Response.json({
        error: 'A valid recommendation decision is required.',
        fields: parsedDecision.error.issues.map(({ path, message }) => ({ field: path.join('.'), message })),
      }, { status: 400 });
    }

    const result = await persistGrievanceAIDecision(
      id,
      user.userId,
      parsedDecision.data.decision,
      parsedDecision.data.finalRecommendation,
      parsedDecision.data.officerNote,
    );
    if (!result.ok) {
      if (result.reason === 'not_assigned') return Response.json({ error: 'Not found' }, { status: 404 });
      if (result.reason === 'no_recommendation') {
        return Response.json({ error: 'Generate a persisted recommendation before recording a decision.' }, { status: 409 });
      }
      return Response.json({ error: 'A decision has already been recorded for this recommendation.' }, { status: 409 });
    }
    return Response.json({ decision: result.decision }, { status: 201 });
  } catch (error) {
    console.error('Grievance recommendation operation failed:', error);
    if (migrationError(error)) {
      return Response.json({ error: 'The officer workflow migration has not been applied.' }, { status: 503 });
    }
    return Response.json({ error: 'The recommendation operation could not be completed.' }, { status: 500 });
  }
}
