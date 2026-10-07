import { getAuthUser } from '@/server/api-utils';
import { getAdminAnalytics } from '@/server/data/analytics';
import { isDatabaseConfigured } from '@/server/db';

export async function GET() {
  const user = await getAuthUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'admin' && user.role !== 'department_admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
  if (user.role === 'department_admin' && !user.departmentId) return Response.json({ error: 'No department is assigned to this account.' }, { status: 403 });
  if (!isDatabaseConfigured()) {
    return Response.json({ error: 'The grievance database is not configured.' }, { status: 503 });
  }

  try {
    const analytics = await getAdminAnalytics(
      user.role === 'department_admin' ? user.departmentId : undefined,
    );
    return Response.json({
      dailyVolume: analytics.dailyVolume,
      resolutionTrend: analytics.resolutionTrend,
      escalationTrend: analytics.escalationTrend,
    });
  } catch (error) {
    console.error('Analytics trends could not be loaded:', error);
    return Response.json({ error: 'Analytics trends could not be loaded.' }, { status: 500 });
  }
}
