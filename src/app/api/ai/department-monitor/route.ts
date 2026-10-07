import { NextRequest } from 'next/server';
import { getAuthUser } from '@/server/api-utils';
import { store } from '@/server/data/store';
import { checkDepartmentMisrouting, rerouteGrievance } from '@/server/ai/department-monitor';

export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user || user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
  const audit = checkDepartmentMisrouting(store.grievances);
  return Response.json(audit);
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user || user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
  try {
    const body = await req.json();
    const { grievanceId, targetDepartmentId } = body;

    if (!grievanceId || !targetDepartmentId) {
      return Response.json({ error: 'Missing grievanceId or targetDepartmentId' }, { status: 400 });
    }

    const success = rerouteGrievance(grievanceId, targetDepartmentId);
    if (!success) {
      return Response.json({ error: 'Grievance not found or failed to reroute' }, { status: 404 });
    }

    return Response.json({
      success: true,
      message: `Grievance ${grievanceId} auto-rerouted to target department successfully.`
    });
  } catch (error: any) {
    return Response.json({ error: error.message || 'Reroute failed' }, { status: 500 });
  }
}
