import { NextRequest } from 'next/server';
import { getAuthUser } from '@/server/api-utils';
import {
  createGrievance,
  getCitizenGrievanceSummary,
  getRecentGrievancesForDuplicateCheck,
  listGrievances,
} from '@/server/data/grievances';
import { findSimilarGrievances } from '@/server/ai/duplicate-detection';
import { isDatabaseConfigured } from '@/server/db';
import { DEPARTMENT_IDS } from '@/lib/constants';
import {
  grievanceCreateSchema,
  GRIEVANCE_CATEGORIES,
  GRIEVANCE_STATUSES,
  PRIORITY_LEVELS,
} from '@/server/validation/grievance';
import { z } from 'zod';

const grievanceListFiltersSchema = z.object({
  status: z.enum(GRIEVANCE_STATUSES).optional(),
  category: z.enum(GRIEVANCE_CATEGORIES).optional(),
  priority: z.enum(PRIORITY_LEVELS).optional(),
  department: z.enum(DEPARTMENT_IDS).optional(),
  dateFrom: z.iso.date().optional(),
  dateTo: z.iso.date().optional(),
  search: z.string().trim().max(200).optional(),
}).strict().refine(
  ({ dateFrom, dateTo }) => !dateFrom || !dateTo || dateFrom <= dateTo,
  { path: ['dateTo'], message: 'End date must be on or after start date.' },
);

function databaseErrorResponse(error: unknown): Response {
  console.error('Grievance database operation failed:', error);
  const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;
  if (code === '42P01') {
    return Response.json({ error: 'The grievance database migration has not been applied.' }, { status: 503 });
  }
  if (code === 'ENOTFOUND' || code === 'EAI_AGAIN' || code === 'ECONNREFUSED' ||
      code === 'ETIMEDOUT' || code === 'ECONNRESET') {
    return Response.json({ error: 'The database is currently unavailable.' }, { status: 503 });
  }
  return Response.json({ error: 'The grievance could not be saved. Please try again.' }, { status: 500 });
}

export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isDatabaseConfigured()) {
    return Response.json({ error: 'The grievance database is not configured.' }, { status: 503 });
  }

  const searchParams = req.nextUrl.searchParams;
  if (user.role === 'department_admin' && !user.departmentId) {
    return Response.json({ error: 'The department administrator account has no assigned department.' }, { status: 403 });
  }
  const page = Number(searchParams.get('page') || 1);
  const limit = Number(searchParams.get('limit') || 50);
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 100) {
    return Response.json({ error: 'Page must be positive and limit must be between 1 and 100.' }, { status: 400 });
  }

  const parsedFilters = grievanceListFiltersSchema.safeParse({
    status: searchParams.get('status') || undefined,
    category: searchParams.get('category') || undefined,
    priority: searchParams.get('priority') || undefined,
    department: searchParams.get('department') || undefined,
    dateFrom: searchParams.get('dateFrom') || undefined,
    dateTo: searchParams.get('dateTo') || undefined,
    search: searchParams.get('search') || undefined,
  });
  if (!parsedFilters.success) {
    return Response.json({
      error: 'One or more grievance filters are invalid.',
      fields: parsedFilters.error.issues.map(({ path, message }) => ({ field: path.join('.'), message })),
    }, { status: 400 });
  }
  const filters = parsedFilters.data;

  try {
    const result = await listGrievances({
      page,
      limit,
      role: user.role,
      userId: user.userId,
      ...(user.role === 'department_admin' ? { userDepartmentId: user.departmentId } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.category ? { categoryId: filters.category } : {}),
      ...(filters.priority ? { priorityLevel: filters.priority } : {}),
      ...(filters.department && user.role !== 'department_admin'
        ? { departmentId: filters.department }
        : {}),
      ...(filters.dateFrom ? { dateFrom: filters.dateFrom } : {}),
      ...(filters.dateTo ? { dateTo: filters.dateTo } : {}),
      ...(user.role === 'admin' && searchParams.get('citizenId')
        ? { citizenId: searchParams.get('citizenId')! }
        : {}),
      ...(user.role === 'admin' && searchParams.get('officerId')
        ? { officerId: searchParams.get('officerId')! }
        : {}),
      ...(filters.search ? { search: filters.search } : {}),
    });
    const summary = user.role === 'citizen'
      ? await getCitizenGrievanceSummary(user.userId)
      : undefined;
    const data = user.role === 'citizen'
      ? result.data.map((grievance) => ({
          id: grievance.id,
          title: grievance.title,
          categoryId: grievance.categoryId,
          ...(grievance.departmentId ? { departmentId: grievance.departmentId } : {}),
          status: grievance.status,
          ...(grievance.priorityLevel ? { priorityLevel: grievance.priorityLevel } : {}),
          ...(grievance.priorityScore !== undefined ? { priorityScore: grievance.priorityScore } : {}),
          location: grievance.location,
          createdAt: grievance.createdAt,
          updatedAt: grievance.updatedAt,
          ...(grievance.slaDeadline ? { slaDeadline: grievance.slaDeadline } : {}),
        }))
      : result.data;
    return Response.json({
      data,
      meta: { total: result.total, page, limit },
      ...(summary ? { summary } : {}),
    });
  } catch (error) {
    return databaseErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'citizen') return Response.json({ error: 'Only citizens can submit grievances.' }, { status: 403 });
  if (!isDatabaseConfigured()) {
    return Response.json({ error: 'The grievance database is not configured.' }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }

  const parsed = grievanceCreateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({
      error: 'Please correct the grievance details.',
      fields: parsed.error.issues.map(({ path, message }) => ({ field: path.join('.'), message })),
    }, { status: 400 });
  }

  let confirmPotentialDuplicates = false;
  if (typeof body === 'object' && body !== null && 'confirmPotentialDuplicates' in body) {
    if (typeof body.confirmPotentialDuplicates !== 'boolean') {
      return Response.json({ error: 'Duplicate confirmation must be a boolean.' }, { status: 400 });
    }
    confirmPotentialDuplicates = body.confirmPotentialDuplicates;
  }

  try {
    if (!confirmPotentialDuplicates) {
      const recentGrievances = await getRecentGrievancesForDuplicateCheck();
      const similar = findSimilarGrievances({
        id: '',
        title: parsed.data.title,
        description: parsed.data.description,
        categoryId: parsed.data.categoryId,
        location: parsed.data.location,
        createdAt: new Date().toISOString(),
        status: 'SUBMITTED',
      }, recentGrievances);

      if (similar.length > 0) {
        const candidateById = new Map(recentGrievances.map((candidate) => [candidate.id, candidate]));
        return Response.json({
          error: 'Potentially similar complaints were found. Review them before continuing.',
          requiresConfirmation: true,
          potentialDuplicates: similar.slice(0, 5).flatMap(({ grievanceId, similarity }) => {
            const candidate = candidateById.get(grievanceId);
            return candidate ? [{
              grievanceId,
              similarity,
              categoryId: candidate.categoryId,
              status: candidate.status,
              createdAt: candidate.createdAt,
            }] : [];
          }),
        }, { status: 409 });
      }
    }

    const grievance = await createGrievance(user.userId, user.name, parsed.data);
    return Response.json({ grievance }, { status: 201 });
  } catch (error) {
    return databaseErrorResponse(error);
  }
}
