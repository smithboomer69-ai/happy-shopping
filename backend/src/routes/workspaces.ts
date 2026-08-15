import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { desc, eq, sql } from "drizzle-orm";
import type { DB } from "../db";
import { boards, posts, workspaceMembers, workspaces } from "../db/schema";
import { apiError } from "../lib/http";
import { newId } from "../lib/id";
import { getUserId, requireAuth } from "../middleware/auth";
import { findWorkspaceForMember } from "../lib/access";
import type { AppEnv } from "../middleware/auth";

const createWorkspaceSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
});

const createBoardSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
});

export function workspaceRoutes(db: DB) {
  const app = new Hono<AppEnv>();
  app.use("*", requireAuth(db));

  // GET /api/workspaces — workspaces the current user belongs to
  app.get("/", (c) => {
    const userId = getUserId(c);
    const rows = db
      .select({
        id: workspaces.id,
        name: workspaces.name,
        role: workspaceMembers.role,
        createdAt: workspaces.createdAt,
      })
      .from(workspaceMembers)
      .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
      .where(eq(workspaceMembers.userId, userId))
      .orderBy(desc(workspaces.createdAt))
      .all();

    return c.json({ workspaces: rows });
  });

  // POST /api/workspaces — create a workspace and join it as owner
  app.post("/", zValidator("json", createWorkspaceSchema), (c) => {
    const userId = getUserId(c);
    const { name } = c.req.valid("json");

    const id = newId();
    db.insert(workspaces).values({ id, name, createdBy: userId }).run();
    db.insert(workspaceMembers)
      .values({ workspaceId: id, userId, role: "owner" })
      .run();

    const workspace = db.select().from(workspaces).where(eq(workspaces.id, id)).get();
    return c.json({ workspace }, 201);
  });

  // GET /api/workspaces/:id/boards
  app.get("/:id/boards", (c) => {
    const userId = getUserId(c);
    const workspaceId = c.req.param("id");

    if (!findWorkspaceForMember(db, userId, workspaceId)) {
      return apiError(c, 404, "Workspace not found");
    }

    const rows = db
      .select({
        id: boards.id,
        workspaceId: boards.workspaceId,
        name: boards.name,
        createdAt: boards.createdAt,
      })
      .from(boards)
      .where(eq(boards.workspaceId, workspaceId))
      .orderBy(desc(boards.createdAt))
      .all();

    // postCount per board for the UI badge.
    const withCounts = rows.map((b) => {
      const { count } = db
        .select({ count: sql<number>`count(*)` })
        .from(posts)
        .where(eq(posts.boardId, b.id))
        .get()!;
      return { ...b, postCount: count };
    });

    return c.json({ boards: withCounts });
  });

  // POST /api/workspaces/:id/boards
  app.post("/:id/boards", zValidator("json", createBoardSchema), (c) => {
    const userId = getUserId(c);
    const workspaceId = c.req.param("id");

    if (!findWorkspaceForMember(db, userId, workspaceId)) {
      return apiError(c, 404, "Workspace not found");
    }

    const { name } = c.req.valid("json");
    const id = newId();
    db.insert(boards)
      .values({ id, workspaceId, name, createdBy: userId })
      .run();

    const board = db.select().from(boards).where(eq(boards.id, id)).get();
    return c.json({ board: { ...board!, postCount: 0 } }, 201);
  });

  return app;
}
