import { NextRequest } from 'next/server';
import { getAuthUser } from '@/server/api-utils';
import { aiMonitoring } from '@/server/ai/monitoring-service';
import { store } from '@/server/data/store';
import { detectIncidents } from '@/server/ai/incident-detection';

export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user || user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type');

  if (type === 'predictions') {
    return Response.json(aiMonitoring.getSLAPredictions());
  }

  if (type === 'events') {
    return Response.json(aiMonitoring.getEvents(50));
  }

  const stats = aiMonitoring.getStats();
  const events = aiMonitoring.getEvents(20);
  const predictions = aiMonitoring.getSLAPredictions();

  return Response.json({
    stats,
    events,
    predictions,
    activeIncidents: detectIncidents(store.grievances),
    duplicateCount: store.duplicateLinks.length,
    totalGrievances: store.grievances.length
  });
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user || user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
  try {
    const body = await req.json();
    const { action, payload } = body;

    if (action === 'SIMULATE_EVENT') {
      const wards = ['12', '7', '4', '8', '3', '15'];
      const categories = ['cat-water-supply', 'cat-hazards', 'cat-potholes', 'cat-garbage', 'cat-streetlights'];
      const ward = payload?.ward || wards[Math.floor(Math.random() * wards.length)];
      const category = payload?.category || categories[Math.floor(Math.random() * categories.length)];

      const isCritical = category === 'cat-hazards';

      const simulatedEvent = aiMonitoring.addEvent({
        type: isCritical ? 'SAFETY_ESCALATION' : 'TRIAGE',
        title: isCritical 
          ? `High-Risk Incident Auto-Escalated in Ward ${ward}`
          : `Grievance Auto-Triaged in Ward ${ward}`,
        description: isCritical 
          ? `Urgent civic defect detected. Prioritized to CRITICAL with 4h resolution target.`
          : `Classified under ${category} with geospatial zone verification. Routed to municipal field team.`,
        severity: isCritical ? 'CRITICAL' : 'HIGH',
        ward,
        meta: { automated: true }
      });

      return Response.json({ success: true, event: simulatedEvent });
    }

    return Response.json({ success: true });
  } catch (error: any) {
    return Response.json({ error: error.message || 'Action failed' }, { status: 500 });
  }
}
