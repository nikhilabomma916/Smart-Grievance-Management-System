# Smart Grievance Management System

This is a full-stack Next.js application. The frontend and backend run in one
project; API endpoints are implemented as Next.js route handlers.

## Project structure

```text
src/
  app/                Next.js pages, layouts, and API routes
    api/              Backend HTTP endpoints (/api/...)
  components/         Reusable frontend UI components
  lib/                Shared utilities, constants, and types
  server/             Backend services, authentication, validation, and data access
  proxy.ts            Request authentication and role-based routing
database/             SQL migrations and database documentation
public/               Static assets
```

Frontend pages live in `src/app/`; reusable UI lives in `src/components/`.
Backend request handlers live in `src/app/api/`, and their server-side logic
lives in `src/server/`. The `database/` folder contains schema migrations.

## Getting started

Install dependencies and start the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.
