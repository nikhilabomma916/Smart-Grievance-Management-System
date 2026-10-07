import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getAuthUser } from '@/server/api-utils';
import { getGrievanceMapMarkers } from '@/server/data/analytics';
import { isDatabaseConfigured } from '@/server/db';
import { GRIEVANCE_STATUSES, PRIORITY_LEVELS } from '@/server/validation/grievance';
import { GRIEVANCE_CATEGORIES } from '@/server/validation/grievance';

const filtersSchema = z.object({
  category: z.enum(GRIEVANCE_CATEGORIES).optional(),
  priority: z.enum(PRIORITY_LEVELS).optional(),
  status: z.enum(GRIEVANCE_STATUSES).optional(),
});

export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'admin' && user.role !== 'department_admin') {
    return Response.json({ error: 'Only administrators can view grievance locations.' }, { status: 403 });
  }
  if (user.role === 'department_admin' && !user.departmentId) {
    return Response.json({ error: 'The department administrator account has no assigned department.' }, { status: 403 });
  }
  if (!isDatabaseConfigured()) {
    return Response.json({ error: 'The grievance database is not configured.' }, { status: 503 });
  }

  const parsed = filtersSchema.safeParse({
    category: req.nextUrl.searchParams.get('category') || undefined,
    priority: req.nextUrl.searchParams.get('priority') || undefined,
    status: req.nextUrl.searchParams.get('status') || undefined,
  });
  if (!parsed.success) {
    return Response.json({ error: 'One or more geographic filters are invalid.' }, { status: 400 });
  }

  try {
    const markers = await getGrievanceMapMarkers({
      ...(user.role === 'department_admin' ? { departmentId: user.departmentId } : {}),
      ...(parsed.data.category ? { categoryId: parsed.data.category } : {}),
      ...(parsed.data.priority ? { priorityLevel: parsed.data.priority } : {}),
      ...(parsed.data.status ? { status: parsed.data.status } : {}),
    });
    return Response.json({ markers });
  } catch (error) {
    console.error('Grievance map locations could not be loaded:', error);
    return Response.json({ error: 'Grievance locations could not be loaded.' }, { status: 500 });
  }
}
