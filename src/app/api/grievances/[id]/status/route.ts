import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getAuthUser } from '@/server/api-utils';
import { changeOfficerGrievanceStatus, isValidGrievanceId } from '@/server/data/grievances';
import { isDatabaseConfigured } from '@/server/db';

type RouteContext = { params: Promise<{ id: string }> };
const statusSchema = z.object({
  status: z.enum(['IN_PROGRESS', 'AWAITING_INFORMATION', 'RESOLVED']),
  citizenMessage: z.string().trim().min(1).max(5000).optional(),
}).strict().superRefine((value, context) => {
  if (value.status === 'AWAITING_INFORMATION' && !value.citizenMessage) {
    context.addIssue({
      code: 'custom',
      path: ['citizenMessage'],
      message: 'A message explaining the information request is required.',
    });
  }
});

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const user = await getAuthUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'officer') {
    return Response.json({ error: 'Only officers can use officer status actions.' }, { status: 403 });
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
  const parsed = statusSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'A valid officer status transition is required.' }, { status: 400 });
  }
  if (parsed.data.status === 'IN_PROGRESS' && parsed.data.citizenMessage) {
    return Response.json({ error: 'A citizen message is only supported when requesting information or resolving.' }, { status: 400 });
  }

  try {
    const result = await changeOfficerGrievanceStatus(
      id,
      user.userId,
      parsed.data.status,
      parsed.data.citizenMessage,
    );
    if (!result.ok) {
      if (result.reason === 'not_assigned') return Response.json({ error: 'Not found' }, { status: 404 });
      return Response.json({ error: 'This status transition is not allowed.' }, { status: 409 });
    }
    return Response.json({ grievance: result.grievance });
  } catch (error) {
    console.error('Officer grievance status update failed:', error);
    return Response.json({ error: 'The grievance status could not be updated.' }, { status: 500 });
  }
}
