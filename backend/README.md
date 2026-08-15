# Signal API (backend)

Bun + Hono + TypeScript + Drizzle ORM (SQLite via `bun:sqlite`). REST under `/api`.

## Quick start

```bash
bun install
bun run dev          # http://localhost:3001 (watch mode)
bun test             # unit + integration tests (Bun's runner, vitest-compatible API)
bun run typecheck    # tsc --noEmit
```

The server applies DB migrations automatically on boot (SQL in `drizzle/`).

## Environment (`.env`)

| Var | Default | Notes |
|---|---|---|
| `JWT_SECRET` | dev-only fallback | **Set in production** (min 16 chars) |
| `DATABASE_URL` | `./data/signal.db` | SQLite file path |
| `PORT` | `3001` | HTTP port |
| `NODE_ENV` | `development` | `production` enables Secure cookies, disables request logging |

## Layout

```
src/
  index.ts          server entry (Bun.serve, auto-migrate, 0.0.0.0:PORT)
  app.ts            Hono app assembly: CORS, health, route mounting, error handling
  db/
    schema.ts       Drizzle schema: users, workspaces, workspace_members, boards,
                    posts, votes (composite PK = one vote/user/post), comments
    index.ts        createDb() + applyMigrations()
  lib/
    auth.ts         argon2id password hashing (Bun.password), JWT sign/verify, cookie name
    access.ts       workspace/board membership checks (404 for non-members)
    http.ts         JSON error envelope
    env.ts          env parsing
    id.ts           UUID ids
  middleware/auth.ts  requireAuth: Bearer or httpOnly cookie -> user on context
  routes/
    auth.ts         register / login / logout / me
    workspaces.ts   list + create workspaces, boards under a workspace
    boards.ts       posts under a board (sorted by vote count desc)
    posts.ts        vote toggle, comments
test/               integration (auth, posts, votes, workspaces) + unit (auth lib)
drizzle/            generated SQL migrations (drizzle-kit)
openapi.yaml        the API contract (canonical copy also in /home/team/shared/)
```

## Design decisions

- **SQLite via `bun:sqlite`** (native, zero-dep) with Drizzle. WAL mode, FK enforcement on.
- **Auth:** JWT in an httpOnly cookie *and* returned in the body for API clients.
  Stateless: logout clears the cookie; bearer tokens live until expiry. Passwords:
  argon2id via `Bun.password`.
- **Register auto-creates a personal workspace** ("My Workspace", owner) so the product
  is usable immediately after signup.
- **Access control:** every read/write resolves the resource through the current user's
  workspace membership and returns **404** (not 403) for anything the user can't see,
  so the API doesn't leak resource existence.
- **Votes:** composite primary key `(post_id, user_id)` enforces one-vote-per-user at
  the DB level; the endpoint toggles.
- **Board post list** is returned pre-sorted by vote count (desc, then newest) and
  includes `viewerVoted` for the requesting user.
- **Tests run with `bun test`, not Vitest.** The stack uses `bun:sqlite`, which only
  exists under the Bun runtime; Bun's runner is API-compatible with Vitest
  (`describe`/`test`/`expect`), so the same test files could run under Vitest if the
  DB driver ever becomes Node-compatible. The frontend uses Vitest as usual.

## API contract

Canonical OpenAPI: `openapi.yaml` (published to `/home/team/shared/openapi.yaml`,
with a quick-reference at `/home/team/shared/API_CONTRACT.md`).

## DB changes

```bash
bun run db:generate   # diff schema -> new SQL migration in drizzle/
bun run db:push       # apply to the dev DB directly
```
