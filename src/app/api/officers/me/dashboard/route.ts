import { getAuthUser } from '@/server/api-utils';
import { getOfficerDashboardStats } from '@/server/data/grievances';
import { isDatabaseConfigured } from '@/server/db';

export async function GET() {
  const user = await getAuthUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'officer') {
    return Response.json({ error: 'Only officers can view officer dashboard metrics.' }, { status: 403 });
  }
  if (!isDatabaseConfigured()) {
    return Response.json({ error: 'The grievance database is not configured.' }, { status: 503 });
  }

  try {
    return Response.json(await getOfficerDashboardStats(user.userId));
  } catch (error) {
    console.error('Officer dashboard metrics lookup failed:', error);
    return Response.json({ error: 'Officer dashboard metrics could not be loaded.' }, { status: 500 });
  }
}
