import { join } from "node:path";
import { applyMigrations, createDb, type DB } from "../src/db";
import { createApp } from "../src/app";
import type { AppEnv } from "../src/middleware/auth";
import type { Hono } from "hono";

export type TestApp = {
  app: Hono<AppEnv>;
  db: DB;
  close: () => void;
};

/** Fresh in-memory database + fully wired app, isolated per test. */
export function testApp(): TestApp {
  const { db, sqlite } = createDb(":memory:");
  applyMigrations(db, join(import.meta.dir, "../drizzle"));
  const app = createApp(db);
  return {
    app,
    db,
    close: () => sqlite.close(),
  };
}

export const JSON_HEADERS = { "Content-Type": "application/json" };

/** Typed JSON body parse for test responses. */
export function jsonOf(res: Response): Promise<any> {
  return jsonOf(res) as Promise<any>;
}

/** Registers a throwaway user and returns their auth token + workspace id. */
export async function registerUser(
  app: Hono<AppEnv>,
  email: string,
  password = "password123",
  name?: string,
) {
  const res = await app.request("/api/auth/register", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ email, password, name }),
  });
  const body = (await jsonOf(res)) as {
    token: string;
    user: { id: string };
  };
  return { token: body.token, userId: body.user.id, status: res.status };
}

export function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}
