import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getAuthUser } from '@/server/api-utils';
import { isValidGrievanceId, updateOfficerDepartment } from '@/server/data/grievances';
import { isDatabaseConfigured } from '@/server/db';
import { DEPARTMENT_IDS } from '@/lib/constants';

type RouteContext = { params: Promise<{ id: string }> };
const officerUpdateSchema = z.object({
  departmentId: z.enum(DEPARTMENT_IDS).nullable(),
}).strict();

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const user = await getAuthUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'admin') {
    return Response.json({ error: 'Only administrators can update officer departments.' }, { status: 403 });
  }
  if (!isDatabaseConfigured()) {
    return Response.json({ error: 'The officer database is not configured.' }, { status: 503 });
  }

  const { id } = await ctx.params;
  if (!isValidGrievanceId(id)) return Response.json({ error: 'Officer not found.' }, { status: 404 });
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const parsed = officerUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'A valid department ID or null is required.' }, { status: 400 });
  }

  try {
    const result = await updateOfficerDepartment(id, parsed.data.departmentId);
    if (result === 'not_found') return Response.json({ error: 'Active officer not found.' }, { status: 404 });
    if (result === 'has_assigned_cases') {
      return Response.json({
        error: "Reassign this officer's active grievances before changing them to a different department.",
      }, { status: 409 });
    }
    return Response.json({ success: true });
  } catch (error) {
    console.error('Officer department update failed:', error);
    const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;
    if (code === '42703') {
      return Response.json({ error: 'The officer workflow migration has not been applied.' }, { status: 503 });
    }
    return Response.json({ error: 'The officer department could not be updated.' }, { status: 500 });
  }
}
