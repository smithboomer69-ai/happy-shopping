# Signal — Frontend

The frontend half of **Signal**, a feature-request / feedback board for product
teams. Built with Vite + React + TypeScript, React Router, and TanStack Query.
Component tests use Vitest + Testing Library.

## Requirements

- [Bun](https://bun.sh) (or Node ≥ 20) — `bun install`, `bun run …`

## Getting started

```bash
bun install
bun run dev        # Vite dev server on http://localhost:5173
```

The dev server proxies `/api/*` to the backend. By default it targets
`http://localhost:8787`; point `DEV_API_PROXY_TARGET` at the backend's actual
port in a local `.env` (see `.env.example`).

## API contract

The client (`src/lib/api.ts`) is built against the contract in `SPEC.md`:

| Method | Path                          | Purpose                  |
| ------ | ----------------------------- | ------------------------ |
| POST   | `/api/auth/register`          | Create an account        |
| POST   | `/api/auth/login`             | Log in (cookie session)  |
| POST   | `/api/auth/logout`            | Log out                  |
| GET    | `/api/auth/me`                | Current user (optional)  |
| GET    | `/api/workspaces`             | List workspaces          |
| POST   | `/api/workspaces`             | Create workspace         |
| GET    | `/api/workspaces/:id/boards`  | List boards              |
| POST   | `/api/workspaces/:id/boards`  | Create board             |
| GET    | `/api/boards/:id/posts`       | List posts (vote-sorted) |
| POST   | `/api/boards/:id/posts`       | Create post              |
| POST   | `/api/posts/:id/vote`         | Toggle upvote            |
| GET    | `/api/posts/:id/comments`     | List comments            |
| POST   | `/api/posts/:id/comments`     | Add comment              |

Auth uses `credentials: 'include'` (httpOnly cookie). If the backend exposes
`GET /api/auth/me` it is used to resolve the session on load; otherwise the
client falls back to probing the workspaces endpoint (401 ⇒ signed out).

The vote-toggle response is normalized to accept the full post, an envelope
`{ post }`, or a bare `{ voteCount, userVoted }` (see `normalizeVoteResult`).

## Scripts

```bash
bun run dev          # dev server
bun run typecheck    # tsc -b (strict)
bun run test         # vitest run (jsdom)
bun run test:watch   # vitest watch
bun run build        # typecheck + production build to dist/
bun run preview      # serve the production build
```

## Structure

```
src/
  components/   Shared UI (auth form, post card, upvote button, forms, …)
  pages/        Route screens (login, register, workspaces, boards, board, post)
  hooks/        Query hooks + optimistic vote mutation
  lib/          API client, types, query client, formatting
  context/      AuthProvider (session state)
  test/         Vitest setup + test utils
```
