import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getAuthUser } from '@/server/api-utils';
import {
  countUnreadNotifications,
  listNotifications,
  markNotificationsRead,
  materializeSlaNotifications,
} from '@/server/data/notifications';
import { isDatabaseConfigured } from '@/server/db';

const markReadSchema = z.object({
  id: z.uuid().optional(),
  all: z.literal(true).optional(),
}).strict().refine((value) => Boolean(value.id) !== (value.all === true));

function unavailableResponse(error: unknown): Response {
  console.error('Notification operation failed:', error);
  const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;
  if (code === '42P01') {
    return Response.json({ error: 'The notification migration has not been applied.' }, { status: 503 });
  }
  return Response.json({ error: 'Notifications are temporarily unavailable.' }, { status: 500 });
}

export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isDatabaseConfigured()) {
    return Response.json({ error: 'The grievance database is not configured.' }, { status: 503 });
  }

  try {
    await materializeSlaNotifications(user);
    const requestedLimit = Number(req.nextUrl.searchParams.get('limit') || 100);
    if (!Number.isInteger(requestedLimit) || requestedLimit < 1 || requestedLimit > 100) {
      return Response.json({ error: 'Notification limit must be between 1 and 100.' }, { status: 400 });
    }
    const [notifications, unreadCount] = await Promise.all([
      listNotifications(user.userId, requestedLimit),
      countUnreadNotifications(user.userId),
    ]);
    return Response.json({
      notifications,
      unreadCount,
    });
  } catch (error) {
    return unavailableResponse(error);
  }
}

export async function PATCH(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isDatabaseConfigured()) {
    return Response.json({ error: 'The grievance database is not configured.' }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const parsed = markReadSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'Provide a notification ID or set all to true.' }, { status: 400 });
  }

  try {
    const updatedCount = await markNotificationsRead(user.userId, parsed.data);
    return Response.json({ success: true, updatedCount });
  } catch (error) {
    return unavailableResponse(error);
  }
}
