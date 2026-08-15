# Signal — Feature-Request Board

A real, working SaaS: a feature-request / feedback board for product teams. Production-quality reference build demonstrating end-to-end delivery (backend, frontend, tests, API contract).

## Monorepo layout

```
backend/    Bun + Hono + TypeScript + Drizzle (SQLite) — REST API under /api
frontend/   Vite + React + TypeScript — React Router + TanStack Query
```

## Quick start

Backend (API):

```bash
cd backend
bun install
bun run dev        # http://localhost:3001 (health: GET /api/health)
bun test           # unit + integration tests
```

Frontend (web app):

```bash
cd frontend
bun install
bun run dev        # Vite dev server
bun test           # component tests (vitest)
```

## API contract

- `backend/openapi.yaml` — OpenAPI 3.0 spec (source of truth)
- Published for the team at `/home/team/shared/openapi.yaml` + `API_CONTRACT.md`

## Quality bar

- Backend: unit tests for services; integration tests for auth, posts, votes.
- Frontend: component tests for key components.
- QA: Playwright E2E happy paths + edge cases.
