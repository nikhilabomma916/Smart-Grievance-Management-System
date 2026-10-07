import { NextRequest } from 'next/server';
import { getAuthUser } from '@/server/api-utils';
import { escalateGrievance, isValidGrievanceId } from '@/server/data/grievances';
import { isDatabaseConfigured } from '@/server/db';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, ctx: RouteContext) {
  const user = await getAuthUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role === 'citizen') return Response.json({ error: 'Unauthorized' }, { status: 403 });
  if (!isDatabaseConfigured()) {
    return Response.json({ error: 'The grievance database is not configured.' }, { status: 503 });
  }

  const { id } = await ctx.params;
  if (!isValidGrievanceId(id)) return Response.json({ error: 'Not found' }, { status: 404 });
  try {
    const result = await escalateGrievance(id, user);
    if (!result.ok) {
      if (result.reason === 'not_found') return Response.json({ error: 'Not found' }, { status: 404 });
      return Response.json({ error: 'Resolved or closed grievances cannot be escalated.' }, { status: 409 });
    }
    return Response.json({ success: true, grievance: result.grievance });
  } catch (error) {
    console.error('Grievance escalation failed:', error);
    return Response.json({ error: 'The grievance could not be escalated.' }, { status: 500 });
  }
}
