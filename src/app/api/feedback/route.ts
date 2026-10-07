import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getAuthUser } from '@/server/api-utils';
import { createGrievanceFeedback, isValidGrievanceId } from '@/server/data/grievances';
import { isDatabaseConfigured } from '@/server/db';

const feedbackSchema = z.object({
  grievanceId: z.uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(5000).optional(),
});

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'citizen') return Response.json({ error: 'Only citizens can submit feedback.' }, { status: 403 });
  if (!isDatabaseConfigured()) {
    return Response.json({ error: 'The grievance database is not configured.' }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const parsed = feedbackSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: 'Please provide a valid grievance ID and rating.' }, { status: 400 });
  if (!isValidGrievanceId(parsed.data.grievanceId)) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const feedback = await createGrievanceFeedback(
      parsed.data.grievanceId,
      user.userId,
      parsed.data.rating,
      parsed.data.comment,
    );
    if (!feedback.ok) {
      if (feedback.reason === 'not_found') return Response.json({ error: 'Not found' }, { status: 404 });
      if (feedback.reason === 'already_submitted') {
        return Response.json({ error: 'Feedback has already been submitted for this grievance.' }, { status: 409 });
      }
      return Response.json({ error: 'Feedback can be submitted only after the grievance is resolved.' }, { status: 409 });
    }
    return Response.json(feedback.feedback, { status: 201 });
  } catch (error) {
    console.error('Grievance feedback creation failed:', error);
    return Response.json({ error: 'Feedback could not be saved.' }, { status: 500 });
  }
}
