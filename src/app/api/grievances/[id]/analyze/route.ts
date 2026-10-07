import { NextRequest } from 'next/server';
import { getAuthUser } from '@/server/api-utils';
import {
  getAllGrievancesForAnalysis,
  getDepartmentForCategory,
  getGrievanceForUser,
  isValidGrievanceId,
  persistGrievanceAnalysis,
} from '@/server/data/grievances';
import { isDatabaseConfigured } from '@/server/db';
import { createAIService } from '@/server/ai/ai-service';
import { buildGrievanceAnalysisSummary, calculateGrievancePriority } from '@/server/ai/priority-engine';
import { findSimilarGrievances } from '@/server/ai/duplicate-detection';
import { detectIncidents } from '@/server/ai/incident-detection';
import { aiAnalysisResultSchema } from '@/server/validation/grievance';

type RouteContext = { params: Promise<{ id: string }> };

function databaseErrorResponse(error: unknown): Response {
  console.error('Grievance analysis database operation failed:', error);
  const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;
  if (code === '42P01') {
    return Response.json({ error: 'The grievance database migration has not been applied.' }, { status: 503 });
  }
  if (code === 'ENOTFOUND' || code === 'EAI_AGAIN' || code === 'ECONNREFUSED' ||
      code === 'ETIMEDOUT' || code === 'ECONNRESET') {
    return Response.json({ error: 'The database is currently unavailable.' }, { status: 503 });
  }
  return Response.json({ error: 'The grievance analysis could not be saved.' }, { status: 500 });
}

export async function POST(_req: NextRequest, ctx: RouteContext) {
  const user = await getAuthUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isDatabaseConfigured()) {
    return Response.json({ error: 'The grievance database is not configured.' }, { status: 503 });
  }

  const { id } = await ctx.params;
  if (!isValidGrievanceId(id)) return Response.json({ error: 'Not found' }, { status: 404 });

  try {
    const grievance = await getGrievanceForUser(id, user);
    if (!grievance) return Response.json({ error: 'Not found' }, { status: 404 });

    const allGrievances = await getAllGrievancesForAnalysis(
      user.role === 'department_admin' ? user.departmentId : undefined,
    );
    const aiService = await createAIService();
    const rawAnalysisResult = await aiService.analyzeGrievance(
      grievance.title,
      grievance.description,
      grievance.categoryId,
      grievance.location.address || grievance.location.area,
      grievance.duration,
      grievance.affectedCount,
    );
    const analysisResult = aiAnalysisResultSchema.parse(rawAnalysisResult);
    const duplicates = findSimilarGrievances(grievance, allGrievances);

    const priority = calculateGrievancePriority(analysisResult, grievance, duplicates.length);
    const analysisToPersist = {
      ...analysisResult,
      summary: buildGrievanceAnalysisSummary(analysisResult, priority),
    };
    const departmentId = getDepartmentForCategory(analysisResult.category) ?? grievance.departmentId;

    const analysis = await persistGrievanceAnalysis(id, user, analysisToPersist, priority, departmentId);
    if (!analysis) return Response.json({ error: 'Not found' }, { status: 404 });

    return Response.json({
      analysis,
      priority,
      duplicates,
      ...(['admin', 'department_admin'].includes(user.role)
        ? { incidents: detectIncidents(allGrievances) }
        : {}),
      department: departmentId,
    });
  } catch (error) {
    const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;
    if (code === '42P01' || code === 'ENOTFOUND' || code === 'EAI_AGAIN' ||
        code === 'ECONNREFUSED' || code === 'ETIMEDOUT' || code === 'ECONNRESET') {
      return databaseErrorResponse(error);
    }
    console.error('Grievance analysis failed:', error);
    return Response.json({ error: 'The grievance could not be analyzed.' }, { status: 500 });
  }
}
