import { randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import type { Notification, UserRole } from '@/lib/types';
import { getDatabasePool } from '@/server/db';

export type NotificationType = Notification['type'];

interface NewNotification {
  userId: string;
  grievanceId: string;
  eventKey: string;
  type: NotificationType;
  title: string;
  message: string;
}

export async function insertNotification(
  client: PoolClient,
  notification: NewNotification,
): Promise<void> {
  await client.query(
    `INSERT INTO grievance_notifications
      (user_id, grievance_id, event_key, type, title, message)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (event_key) DO NOTHING`,
    [
      notification.userId,
      notification.grievanceId,
      notification.eventKey,
      notification.type,
      notification.title,
      notification.message,
    ],
  );
}

export async function notifyActiveAdministrators(
  client: PoolClient,
  notification: Omit<NewNotification, 'userId' | 'eventKey'>,
): Promise<void> {
  const administrators = await client.query<{ id: string }>(
    `SELECT id FROM users WHERE role = 'admin' AND account_status = 'active'`,
  );
  for (const administrator of administrators.rows) {
    await insertNotification(client, {
      ...notification,
      userId: administrator.id,
      eventKey: `${notification.type}:${notification.grievanceId}:${administrator.id}:${randomUUID()}`,
    });
  }
}

export async function notifyDepartmentAdministrators(
  client: PoolClient,
  departmentId: string,
  notification: Omit<NewNotification, 'userId' | 'eventKey'>,
): Promise<void> {
  const administrators = await client.query<{ id: string }>(
    `SELECT id FROM users
     WHERE role = 'department_admin' AND department_id = $1 AND account_status = 'active'`,
    [departmentId],
  );
  for (const administrator of administrators.rows) {
    await insertNotification(client, {
      ...notification,
      userId: administrator.id,
      eventKey: `${notification.type}:${notification.grievanceId}:${administrator.id}:${randomUUID()}`,
    });
  }
}

export async function notifyDepartmentOfficers(
  client: PoolClient,
  notification: Omit<NewNotification, 'userId' | 'eventKey'> & { departmentId: string },
): Promise<void> {
  const officers = await client.query<{ id: string }>(
    `SELECT id FROM users
     WHERE role = 'officer' AND account_status = 'active' AND department_id = $1`,
    [notification.departmentId],
  );
  for (const officer of officers.rows) {
    await insertNotification(client, {
      userId: officer.id,
      grievanceId: notification.grievanceId,
      eventKey: `${notification.type}:${notification.grievanceId}:${officer.id}:${randomUUID()}`,
      type: notification.type,
      title: notification.title,
      message: notification.message,
    });
  }
}

export interface ListedNotification extends Notification {
  grievanceId: string;
}

export async function listNotifications(userId: string, limit = 100): Promise<ListedNotification[]> {
  const result = await getDatabasePool().query(
    `SELECT id, user_id, grievance_id, title, message, type, is_read, created_at
     FROM grievance_notifications
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [userId, limit],
  );
  return result.rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    grievanceId: row.grievance_id,
    title: row.title,
    message: row.message,
    type: row.type,
    read: row.is_read,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : new Date(row.created_at).toISOString(),
  }));
}

export async function countUnreadNotifications(userId: string): Promise<number> {
  const result = await getDatabasePool().query<{ count: string }>(
    `SELECT COUNT(*)::text AS count
     FROM grievance_notifications
     WHERE user_id = $1 AND is_read = FALSE`,
    [userId],
  );
  return Number(result.rows[0]?.count || 0);
}

export async function markNotificationsRead(
  userId: string,
  options: { id?: string; all?: boolean },
): Promise<number> {
  const result = await getDatabasePool().query(
    `UPDATE grievance_notifications
     SET is_read = TRUE, read_at = NOW()
     WHERE user_id = $1 AND is_read = FALSE
       AND ($2::boolean = TRUE OR id = $3)`,
    [userId, options.all === true, options.id ?? null],
  );
  return result.rowCount ?? 0;
}

export async function materializeSlaNotifications(user: {
  userId: string;
  role: UserRole;
  departmentId?: string;
}): Promise<void> {
  const pool = getDatabasePool();
  await pool.query(
    `INSERT INTO grievance_notifications
      (user_id, grievance_id, event_key, type, title, message)
     SELECT
       $1,
       g.id,
       'sla:' || g.id::text || ':' || to_char(g.sla_deadline, 'YYYYMMDDHH24MISS') || ':' ||
         CASE WHEN g.sla_deadline <= NOW() THEN 'breached' ELSE 'approaching' END,
       CASE WHEN g.sla_deadline <= NOW() THEN 'sla_breached' ELSE 'sla_approaching' END,
       CASE WHEN g.sla_deadline <= NOW() THEN 'SLA deadline breached' ELSE 'SLA deadline approaching' END,
       'Complaint ' || g.id::text || CASE
         WHEN g.sla_deadline <= NOW() THEN ' has passed its SLA deadline.'
         ELSE ' is due within 24 hours.'
       END
     FROM grievances g
     WHERE g.sla_deadline IS NOT NULL
       AND g.status NOT IN ('RESOLVED', 'CLOSED')
       AND (
         ($2 = 'citizen' AND g.citizen_id = $1)
         OR ($2 = 'officer' AND g.assigned_officer_id = $1)
         OR ($2 = 'department_admin' AND g.department_id = $3)
         OR ($2 = 'admin')
       )
       AND g.sla_deadline <= NOW() + INTERVAL '24 hours'
     ON CONFLICT (event_key) DO NOTHING`,
    [user.userId, user.role, user.departmentId ?? null],
  );
}
