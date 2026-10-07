import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getAuthUser } from '@/server/api-utils';
import {
  createGrievanceInternalNote,
  getGrievanceForUser,
  getGrievanceInternalNotes,
  isValidGrievanceId,
} from '@/server/data/grievances';
import { isDatabaseConfigured } from '@/server/db';

type RouteContext = { params: Promise<{ id: string }> };
const noteSchema = z.object({ content: z.string().trim().min(1).max(5000) });

export async function GET(_req: NextRequest, ctx: RouteContext) {
  const user = await getAuthUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role === 'citizen') return Response.json({ error: 'Only officers and administrators can access internal notes.' }, { status: 403 });
  if (!isDatabaseConfigured()) {
    return Response.json({ error: 'The grievance database is not configured.' }, { status: 503 });
  }

  const { id } = await ctx.params;
  if (!isValidGrievanceId(id)) return Response.json({ error: 'Not found' }, { status: 404 });
  try {
    if (!(await getGrievanceForUser(id, user))) return Response.json({ error: 'Not found' }, { status: 404 });
    return Response.json(await getGrievanceInternalNotes(id));
  } catch (error) {
    console.error('Grievance notes lookup failed:', error);
    return Response.json({ error: 'Grievance notes could not be loaded.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  const user = await getAuthUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role === 'citizen') return Response.json({ error: 'Only officers and administrators can add internal notes.' }, { status: 403 });
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
  const parsed = noteSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: 'A note between 1 and 5000 characters is required.' }, { status: 400 });

  try {
    const actorRole = user.role === 'officer'
      ? 'officer'
      : user.role === 'department_admin'
        ? 'department_admin'
        : 'admin';
    const note = await createGrievanceInternalNote(id, {
      userId: user.userId,
      name: user.name,
      role: actorRole,
      ...(user.departmentId ? { departmentId: user.departmentId } : {}),
    }, parsed.data.content);
    if (!note) return Response.json({ error: 'Not found' }, { status: 404 });
    return Response.json(note, { status: 201 });
  } catch (error) {
    console.error('Grievance note creation failed:', error);
    return Response.json({ error: 'The grievance note could not be saved.' }, { status: 500 });
  }
}
