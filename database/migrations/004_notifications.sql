CREATE TABLE IF NOT EXISTS grievance_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  grievance_id UUID NOT NULL REFERENCES grievances(id) ON DELETE CASCADE,
  event_key TEXT NOT NULL UNIQUE,
  type VARCHAR(32) NOT NULL CHECK (type IN (
    'complaint_received', 'analysis_completed', 'department_assigned',
    'complaint_assigned', 'status_updated', 'info_requested',
    'sla_approaching', 'sla_breached', 'sla_warning', 'complaint_resolved',
    'complaint_escalated', 'feedback_requested', 'complaint_reopened',
    'new_assignment'
  )),
  title VARCHAR(160) NOT NULL,
  message VARCHAR(1000) NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS grievance_notifications_user_created_idx
  ON grievance_notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS grievance_notifications_user_unread_idx
  ON grievance_notifications (user_id, created_at DESC)
  WHERE is_read = FALSE;
