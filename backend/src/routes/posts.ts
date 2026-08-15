import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { and, asc, eq, sql } from "drizzle-orm";
import type { DB } from "../db";
import { comments, posts, users, votes } from "../db/schema";
import { apiError } from "../lib/http";
import { newId } from "../lib/id";
import { getUserId, requireAuth } from "../middleware/auth";
import { findBoardForMember } from "../lib/access";
import type { AppEnv } from "../middleware/auth";

const createCommentSchema = z.object({
  body: z.string().trim().min(1, "Comment is required").max(2000),
});

/**
 * Resolves the board a post lives on — but only if the current user is a
 * member of that board's workspace. Returns null otherwise.
 */
function findPostBoardForMember(db: DB, userId: string, postId: string) {
  const post = db.select().from(posts).where(eq(posts.id, postId)).get();
  if (!post) return null;
  return findBoardForMember(db, userId, post.boardId);
}

function countVotes(db: DB, postId: string): number {
  return (
    db
      .select({ count: sql<number>`count(*)` })
      .from(votes)
      .where(eq(votes.postId, postId))
      .get()?.count ?? 0
  );
}

export function postRoutes(db: DB) {
  const app = new Hono<AppEnv>();
  app.use("*", requireAuth(db));

  // POST /api/posts/:id/vote — toggle the current user's vote on a post.
  app.post("/:id/vote", (c) => {
    const userId = getUserId(c);
    const postId = c.req.param("id");

    if (!findPostBoardForMember(db, userId, postId)) {
      return apiError(c, 404, "Post not found");
    }

    const existing = db
      .select()
      .from(votes)
      .where(and(eq(votes.postId, postId), eq(votes.userId, userId)))
      .get();

    let voted: boolean;
    if (existing) {
      db.delete(votes)
        .where(and(eq(votes.postId, postId), eq(votes.userId, userId)))
        .run();
      voted = false;
    } else {
      db.insert(votes).values({ postId, userId }).run();
      voted = true;
    }

    return c.json({ postId, voted, voteCount: countVotes(db, postId) });
  });

  // GET /api/posts/:id/comments — flat list, oldest first.
  app.get("/:id/comments", (c) => {
    const userId = getUserId(c);
    const postId = c.req.param("id");

    if (!findPostBoardForMember(db, userId, postId)) {
      return apiError(c, 404, "Post not found");
    }

    const rows = db
      .select({
        id: comments.id,
        postId: comments.postId,
        body: comments.body,
        createdAt: comments.createdAt,
        authorId: users.id,
        authorName: users.name,
        authorEmail: users.email,
      })
      .from(comments)
      .innerJoin(users, eq(users.id, comments.authorId))
      .where(eq(comments.postId, postId))
      .orderBy(asc(comments.createdAt))
      .all();

    const result = rows.map((r) => ({
      id: r.id,
      postId: r.postId,
      body: r.body,
      createdAt: r.createdAt,
      author: { id: r.authorId, name: r.authorName, email: r.authorEmail },
    }));

    return c.json({ comments: result });
  });

  // POST /api/posts/:id/comments
  app.post("/:id/comments", zValidator("json", createCommentSchema), (c) => {
    const userId = getUserId(c);
    const postId = c.req.param("id");

    if (!findPostBoardForMember(db, userId, postId)) {
      return apiError(c, 404, "Post not found");
    }

    const { body } = c.req.valid("json");
    const id = newId();
    db.insert(comments).values({ id, postId, authorId: userId, body }).run();

    const author = db.select().from(users).where(eq(users.id, userId)).get();
    const created = db.select().from(comments).where(eq(comments.id, id)).get();

    return c.json(
      {
        comment: {
          id,
          postId,
          body,
          createdAt: created!.createdAt,
          author: { id: userId, name: author?.name ?? null, email: author!.email },
        },
      },
      201,
    );
  });

  return app;
}
