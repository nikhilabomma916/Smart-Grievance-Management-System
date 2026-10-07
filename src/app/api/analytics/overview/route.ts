import { getAuthUser } from '@/server/api-utils';
import { getAdminAnalytics } from '@/server/data/analytics';
import { isDatabaseConfigured } from '@/server/db';

export async function GET() {
  const user = await getAuthUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'admin' && user.role !== 'department_admin') {
    return Response.json({ error: 'Only administrators can view analytics.' }, { status: 403 });
  }
  if (user.role === 'department_admin' && !user.departmentId) {
    return Response.json({ error: 'The department administrator account has no assigned department.' }, { status: 403 });
  }
  if (!isDatabaseConfigured()) {
    return Response.json({ error: 'The grievance database is not configured.' }, { status: 503 });
  }

  try {
    return Response.json(await getAdminAnalytics(
      user.role === 'department_admin' ? user.departmentId : undefined,
    ));
  } catch (error) {
    console.error('Admin analytics could not be loaded:', error);
    const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;
    if (code === '42P01') {
      return Response.json({ error: 'The grievance database migration has not been applied.' }, { status: 503 });
    }
    return Response.json({ error: 'System analytics could not be loaded.' }, { status: 500 });
  }
}
