import type { Context, MiddlewareHandler } from "hono";
import { getCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import { eq } from "drizzle-orm";
import { COOKIE_NAME, verifyToken } from "../lib/auth";
import { users, type User } from "../db/schema";
import type { DB } from "../db";

export type AppEnv = {
  Variables: {
    user: User;
    userId: string;
  };
};

export function requireAuth(db: DB): MiddlewareHandler<AppEnv> {
  return createMiddleware<AppEnv>(async (c, next) => {
    const authHeader = c.req.header("Authorization");
    const bearer = authHeader?.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : undefined;
    const token = bearer ?? getCookie(c, COOKIE_NAME);

    const session = await verifyToken(token);
    if (!session) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const user = db.select().from(users).where(eq(users.id, session.sub)).get();
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    c.set("user", user);
    c.set("userId", user.id);
    await next();
  });
}

export function getUserId(c: Context<AppEnv>): string {
  return c.get("userId");
}

export function getCurrentUser(c: Context<AppEnv>): User {
  return c.get("user");
}
