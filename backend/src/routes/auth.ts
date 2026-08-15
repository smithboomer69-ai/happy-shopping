import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { setCookie, deleteCookie } from "hono/cookie";
import type { DB } from "../db";
import { users, workspaces, workspaceMembers } from "../db/schema";
import { COOKIE_NAME, hashPassword, signToken, verifyPassword } from "../lib/auth";
import { apiError } from "../lib/http";
import { newId } from "../lib/id";
import { isProd } from "../lib/env";
import { getCurrentUser, requireAuth } from "../middleware/auth";
import type { AppEnv } from "../middleware/auth";

const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(200),
  name: z.string().trim().min(1).max(100).optional(),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(200),
});

function publicUser(u: typeof users.$inferSelect) {
  return { id: u.id, email: u.email, name: u.name, createdAt: u.createdAt };
}

export function authRoutes(db: DB) {
  const app = new Hono<AppEnv>();

  app.post("/register", zValidator("json", registerSchema), async (c) => {
    const { email, password, name } = c.req.valid("json");

    const existing = db.select().from(users).where(eq(users.email, email)).get();
    if (existing) {
      return apiError(c, 409, "An account with this email already exists", "email");
    }

    const passwordHash = await hashPassword(password);
    const id = newId();
    db.insert(users)
      .values({ id, email, passwordHash, name: name ?? null })
      .run();

    // New users get a personal workspace so the product is usable immediately.
    const wsId = newId();
    db.insert(workspaces)
      .values({ id: wsId, name: "My Workspace", createdBy: id })
      .run();
    db.insert(workspaceMembers)
      .values({ workspaceId: wsId, userId: id, role: "owner" })
      .run();

    const token = await signToken({ sub: id, email });
    setAuthCookie(c, token);

    const created = db.select().from(users).where(eq(users.id, id)).get();
    return c.json({ user: publicUser(created!), token }, 201);
  });

  app.post("/login", zValidator("json", loginSchema), async (c) => {
    const { email, password } = c.req.valid("json");

    const user = db.select().from(users).where(eq(users.email, email)).get();
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return apiError(c, 401, "Invalid email or password");
    }

    const token = await signToken({ sub: user.id, email: user.email });
    setAuthCookie(c, token);

    return c.json({ user: publicUser(user), token });
  });

  app.post("/logout", (c) => {
    deleteCookie(c, COOKIE_NAME, { path: "/" });
    return c.body(null, 204);
  });

  app.get("/me", requireAuth(db), (c) => {
    return c.json({ user: publicUser(getCurrentUser(c)) });
  });

  return app;
}

function setAuthCookie(c: Parameters<typeof setCookie>[0], token: string) {
  setCookie(c, COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "Lax",
    secure: isProd,
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}
