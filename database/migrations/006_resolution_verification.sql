ALTER TABLE grievances
  DROP CONSTRAINT IF EXISTS grievances_status_check;

ALTER TABLE grievances
  ADD CONSTRAINT grievances_status_check
  CHECK (status IN (
    'SUBMITTED', 'AI_ANALYZED', 'ASSIGNED', 'IN_PROGRESS',
    'AWAITING_INFORMATION', 'RESOLVED', 'CLOSED', 'SLA_AT_RISK',
    'ESCALATED', 'REOPENED'
  ));

ALTER TABLE grievance_status_history
  DROP CONSTRAINT IF EXISTS grievance_status_history_from_status_check;

ALTER TABLE grievance_status_history
  ADD CONSTRAINT grievance_status_history_from_status_check
  CHECK (from_status IS NULL OR from_status IN (
    'SUBMITTED', 'AI_ANALYZED', 'ASSIGNED', 'IN_PROGRESS',
    'AWAITING_INFORMATION', 'RESOLVED', 'CLOSED', 'SLA_AT_RISK',
    'ESCALATED', 'REOPENED'
  ));

ALTER TABLE grievance_status_history
  DROP CONSTRAINT IF EXISTS grievance_status_history_to_status_check;

ALTER TABLE grievance_status_history
  ADD CONSTRAINT grievance_status_history_to_status_check
  CHECK (to_status IN (
    'SUBMITTED', 'AI_ANALYZED', 'ASSIGNED', 'IN_PROGRESS',
    'AWAITING_INFORMATION', 'RESOLVED', 'CLOSED', 'SLA_AT_RISK',
    'ESCALATED', 'REOPENED'
  ));

CREATE TABLE IF NOT EXISTS grievance_resolutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grievance_id UUID NOT NULL REFERENCES grievances(id) ON DELETE CASCADE,
  resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  resolved_by_role VARCHAR(16) NOT NULL
    CHECK (resolved_by_role IN ('officer', 'department_admin', 'admin')),
  details TEXT NOT NULL CHECK (length(trim(details)) BETWEEN 1 AND 5000),
  resolved_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS grievance_resolutions_grievance_resolved_idx
  ON grievance_resolutions (grievance_id, resolved_at DESC);

INSERT INTO grievance_resolutions
  (grievance_id, resolved_by, resolved_by_role, details, resolved_at)
SELECT
  history.grievance_id,
  history.changed_by,
  CASE
    WHEN history.changed_by_role IN ('officer', 'department_admin', 'admin')
      THEN history.changed_by_role
    ELSE 'admin'
  END,
  COALESCE(NULLIF(trim(history.note), ''), 'Resolution recorded before resolution verification was enabled.'),
  history.changed_at
FROM grievance_status_history AS history
WHERE history.to_status = 'RESOLVED'
  AND NOT EXISTS (
    SELECT 1
    FROM grievance_resolutions AS resolution
    WHERE resolution.grievance_id = history.grievance_id
      AND resolution.resolved_at = history.changed_at
  );
