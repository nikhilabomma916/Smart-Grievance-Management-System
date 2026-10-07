ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('citizen', 'officer', 'department_admin', 'admin'));

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_department_admin_department_check;

ALTER TABLE users
  ADD CONSTRAINT users_department_admin_department_check
  CHECK (role <> 'department_admin' OR department_id IS NOT NULL);

ALTER TABLE grievance_status_history
  DROP CONSTRAINT IF EXISTS grievance_status_history_changed_by_role_check;

ALTER TABLE grievance_status_history
  ADD CONSTRAINT grievance_status_history_changed_by_role_check
  CHECK (changed_by_role IN ('citizen', 'officer', 'department_admin', 'admin'));

ALTER TABLE grievance_internal_notes
  DROP CONSTRAINT IF EXISTS grievance_internal_notes_author_role_check;

ALTER TABLE grievance_internal_notes
  ADD CONSTRAINT grievance_internal_notes_author_role_check
  CHECK (author_role IN ('officer', 'department_admin', 'admin'));
