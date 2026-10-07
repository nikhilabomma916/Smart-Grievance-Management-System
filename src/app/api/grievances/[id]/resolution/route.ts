import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getAuthUser } from '@/server/api-utils';
import { isValidGrievanceId, updateCitizenResolution } from '@/server/data/grievances';
import { isDatabaseConfigured } from '@/server/db';

type RouteContext = { params: Promise<{ id: string }> };
const resolutionActionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('confirm') }).strict(),
  z.object({
    action: z.literal('reopen'),
    reason: z.string().trim().min(1).max(2000),
  }).strict(),
]);

export async function POST(req: NextRequest, ctx: RouteContext) {
  const user = await getAuthUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'citizen') {
    return Response.json({ error: 'Only citizens can confirm or reopen their grievances.' }, { status: 403 });
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
  const parsed = resolutionActionSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'Confirm the resolution or provide a reason to reopen it.' }, { status: 400 });
  }

  try {
    const result = await updateCitizenResolution(
      id,
      user.userId,
      parsed.data.action,
      parsed.data.action === 'reopen' ? parsed.data.reason : undefined,
    );
    if (!result.ok) {
      if (result.reason === 'not_found') return Response.json({ error: 'Not found' }, { status: 404 });
      return Response.json({
        error: parsed.data.action === 'confirm'
          ? 'Only a resolved grievance can be confirmed.'
          : 'Only a resolved or closed grievance can be reopened.',
      }, { status: 409 });
    }
    return Response.json({ grievance: result.grievance });
  } catch (error) {
    console.error('Citizen resolution action failed:', error);
    const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;
    if (code === '42P01') {
      return Response.json({ error: 'The resolution verification migration has not been applied.' }, { status: 503 });
    }
    return Response.json({ error: 'The resolution action could not be completed.' }, { status: 500 });
  }
}
