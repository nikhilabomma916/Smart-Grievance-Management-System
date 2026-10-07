# Supabase Setup

The app connects to Supabase's PostgreSQL database using the `pg` driver. Registration and login require the authentication and citizen-profile tables created by the initial migration.

1. In Supabase, open **Project Settings → Database** and copy the connection string. Use the direct connection when the development machine supports IPv6; otherwise choose the Session pooler connection string.
2. Set `DATABASE_URL` in the ignored `.env.local` file. URL-encode reserved characters in the password (for example, `@` as `%40`) and add `?sslmode=require` to the connection string. Do not commit `.env.local` or share its contents.
3. Keep `AUTH_SECRET` in `.env.local` set to a randomly generated secret of at least 32 characters.
4. In the Supabase **SQL Editor**, apply any migrations that have not yet been applied, in order:
   `001_auth.sql`, `002_griveances.sql`, `003_officer_workflow.sql`,
   `004_notifications.sql`, `005_department_admin_role.sql`, and
   `006_resolution_verification.sql`. Do not rerun or modify previously applied migrations.
5. Provision officers and administrators through the existing trusted database/admin process. A department administrator must have role `department_admin` and a valid `department_id`; the server loads that scope from the active account record.
6. Start the app with `npm run dev`, register a citizen account if needed, and create a grievance through `/citizen/submit`.

Registration and login require migration 001; department-administrator accounts require migrations 003 and 005. Grievance endpoints require migrations 001–003; notification-backed workflows require migration 004; resolution verification, reopen history, and the `REOPENED` status require migration 006. Grievance attachments currently persist metadata only: image data remains available to the existing client-side preview/vision flow, but no image binary or data URL is stored in PostgreSQL until object storage is configured. No database credentials belong in source control.