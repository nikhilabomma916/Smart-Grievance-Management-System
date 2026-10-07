import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getAuthUser } from '@/server/api-utils';
import { assignGrievanceToOfficer, isValidGrievanceId } from '@/server/data/grievances';
import { isDatabaseConfigured } from '@/server/db';

type RouteContext = { params: Promise<{ id: string }> };
const assignmentSchema = z.object({ officerId: z.uuid() });

export async function POST(req: NextRequest, ctx: RouteContext) {
  const user = await getAuthUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'admin' && user.role !== 'department_admin') {
    return Response.json({ error: 'Only administrators can assign grievances.' }, { status: 403 });
  }
  if (user.role === 'department_admin' && !user.departmentId) {
    return Response.json({ error: 'The department administrator account has no assigned department.' }, { status: 403 });
  }
  if (!isDatabaseConfigured()) {
    return Response.json({ error: 'The grievance database is not configured.' }, { status: 503 });
  }

  const { id } = await ctx.params;
  if (!isValidGrievanceId(id)) return Response.json({ error: 'Not found' }, { status: 404 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const parsed = assignmentSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: 'A valid officer ID is required.' }, { status: 400 });

  try {
    const result = await assignGrievanceToOfficer(id, parsed.data.officerId, user);
    if (!result.ok) {
      if (result.reason === 'not_found') return Response.json({ error: 'Not found' }, { status: 404 });
      if (result.reason === 'inactive_officer') {
        return Response.json({ error: 'The selected active officer was not found.' }, { status: 404 });
      }
      if (result.reason === 'department_mismatch') {
        return Response.json({ error: 'The officer is not assigned to this grievance department.' }, { status: 409 });
      }
      return Response.json({ error: 'Resolved or closed grievances cannot be assigned.' }, { status: 409 });
    }
    return Response.json({ success: true, grievance: result.grievance });
  } catch (error) {
    console.error('Grievance assignment failed:', error);
    return Response.json({ error: 'The grievance could not be assigned.' }, { status: 500 });
  }
}
