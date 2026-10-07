import { getAuthUser } from '@/server/api-utils';
import { getAdminAnalytics } from '@/server/data/analytics';
import { isDatabaseConfigured } from '@/server/db';

export async function GET() {
  const user = await getAuthUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'admin' && user.role !== 'department_admin') {
    return Response.json({ error: 'Only administrators can view department monitoring.' }, { status: 403 });
  }
  if (user.role === 'department_admin' && !user.departmentId) {
    return Response.json({ error: 'The department administrator account has no assigned department.' }, { status: 403 });
  }
  if (!isDatabaseConfigured()) {
    return Response.json({ error: 'The grievance database is not configured.' }, { status: 503 });
  }

  try {
    const analytics = await getAdminAnalytics(
      user.role === 'department_admin' ? user.departmentId : undefined,
    );
    return Response.json(analytics.departments.map((department) => ({
      id: department.departmentId,
      name: department.departmentName,
      headId: 'Unassigned',
      headOfficerName: 'Unassigned',
      metrics: {
        totalGrievances: department.total,
        openGrievances: department.total - department.resolved,
        avgResolutionTimeHours: department.averageResolutionHours,
      },
      stats: {
        officers: analytics.officers.filter((officer) => officer.departmentId === department.departmentId).length,
        grievances: department.total,
      },
    })));
  } catch (error) {
    console.error('Department monitoring could not be loaded:', error);
    return Response.json({ error: 'Department monitoring could not be loaded.' }, { status: 500 });
  }
}
