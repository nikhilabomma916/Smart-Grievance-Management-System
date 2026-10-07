import { getAuthUser } from '@/server/api-utils';
import { getAllGrievancesForAnalysis } from '@/server/data/grievances';
import { isDatabaseConfigured } from '@/server/db';
import { detectIncidents } from '@/server/ai/incident-detection';

export async function GET() {
  const user = await getAuthUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'admin' && user.role !== 'department_admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
  if (user.role === 'department_admin' && !user.departmentId) return Response.json({ error: 'No department is assigned to this account.' }, { status: 403 });
  if (!isDatabaseConfigured()) {
    return Response.json({ error: 'The grievance database is not configured.' }, { status: 503 });
  }

  try {
    return Response.json(detectIncidents(await getAllGrievancesForAnalysis(
      user.role === 'department_admin' ? user.departmentId : undefined,
    )));
  } catch (error) {
    console.error('Incident analytics could not be loaded:', error);
    return Response.json({ error: 'Incident analytics could not be loaded.' }, { status: 500 });
  }
}
