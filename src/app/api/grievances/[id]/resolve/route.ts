import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getAuthUser } from '@/server/api-utils';
import { changeOfficerGrievanceStatus, isValidGrievanceId, updateGrievance } from '@/server/data/grievances';
import { isDatabaseConfigured } from '@/server/db';

type RouteContext = { params: Promise<{ id: string }> };
const resolutionSchema = z.object({ resolution: z.string().trim().min(1).max(5000) });

export async function POST(req: NextRequest, ctx: RouteContext) {
  const user = await getAuthUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'officer' && user.role !== 'department_admin' && user.role !== 'admin') {
    return Response.json({ error: 'Unauthorized' }, { status: 403 });
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
  const parsed = resolutionSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: 'A resolution summary is required.' }, { status: 400 });

  try {
    if (user.role === 'officer') {
      const result = await changeOfficerGrievanceStatus(
        id,
        user.userId,
        'RESOLVED',
        parsed.data.resolution,
      );
      if (!result.ok) {
        if (result.reason === 'not_assigned') return Response.json({ error: 'Not found' }, { status: 404 });
        return Response.json({ error: 'Only an in-progress grievance can be resolved by its assigned officer.' }, { status: 409 });
      }
      return Response.json({ success: true, grievance: result.grievance });
    }

    const grievance = await updateGrievance(id, user, {
      status: 'RESOLVED',
      resolvedAt: new Date().toISOString(),
      reason: parsed.data.resolution,
    });
    if (!grievance) return Response.json({ error: 'Not found' }, { status: 404 });
    return Response.json({ success: true, grievance });
  } catch (error) {
    console.error('Grievance resolution failed:', error);
    return Response.json({ error: 'The grievance could not be resolved.' }, { status: 500 });
  }
}
