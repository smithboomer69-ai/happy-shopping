import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { and, desc, eq, sql } from "drizzle-orm";
import type { DB } from "../db";
import { posts, users, votes } from "../db/schema";
import { apiError } from "../lib/http";
import { newId } from "../lib/id";
import { getUserId, requireAuth } from "../middleware/auth";
import { findBoardForMember } from "../lib/access";
import type { AppEnv } from "../middleware/auth";

const createPostSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().trim().max(5000).optional(),
});

export function boardRoutes(db: DB) {
  const app = new Hono<AppEnv>();
  app.use("*", requireAuth(db));

  // GET /api/boards/:id/posts — sorted by vote count (desc), then newest first.
  app.get("/:id/posts", (c) => {
    const userId = getUserId(c);
    const boardId = c.req.param("id");

    if (!findBoardForMember(db, userId, boardId)) {
      return apiError(c, 404, "Board not found");
    }

    const voteCounts = db
      .select({ postId: votes.postId, count: sql<number>`count(*)`.as("count") })
      .from(votes)
      .groupBy(votes.postId)
      .as("vote_counts");

    const viewerVotes = db
      .select({ postId: votes.postId })
      .from(votes)
      .where(eq(votes.userId, userId))
      .as("viewer_votes");

    const rows = db
      .select({
        id: posts.id,
        boardId: posts.boardId,
        title: posts.title,
        description: posts.description,
        createdAt: posts.createdAt,
        authorId: users.id,
        authorName: users.name,
        authorEmail: users.email,
        voteCount: sql<number>`coalesce(${voteCounts.count}, 0)`,
        viewerVoteId: viewerVotes.postId,
      })
      .from(posts)
      .leftJoin(voteCounts, eq(voteCounts.postId, posts.id))
      .leftJoin(users, eq(users.id, posts.authorId))
      .leftJoin(
        viewerVotes,
        and(eq(viewerVotes.postId, posts.id)),
      )
      .where(eq(posts.boardId, boardId))
      .orderBy(desc(sql`coalesce(${voteCounts.count}, 0)`), desc(posts.createdAt))
      .all();

    const result = rows.map((r) => ({
      id: r.id,
      boardId: r.boardId,
      title: r.title,
      description: r.description,
      createdAt: r.createdAt,
      author: { id: r.authorId, name: r.authorName, email: r.authorEmail },
      voteCount: r.voteCount,
      viewerVoted: r.viewerVoteId !== null,
    }));

    return c.json({ posts: result });
  });

  // POST /api/boards/:id/posts
  app.post("/:id/posts", zValidator("json", createPostSchema), (c) => {
    const userId = getUserId(c);
    const boardId = c.req.param("id");

    const board = findBoardForMember(db, userId, boardId);
    if (!board) {
      return apiError(c, 404, "Board not found");
    }

    const { title, description } = c.req.valid("json");
    const id = newId();
    db.insert(posts)
      .values({ id, boardId, authorId: userId, title, description: description ?? null })
      .run();

    const author = db.select().from(users).where(eq(users.id, userId)).get();
    return c.json(
      {
        post: {
          id,
          boardId,
          title,
          description: description ?? null,
          createdAt: db.select().from(posts).where(eq(posts.id, id)).get()!.createdAt,
          author: { id: userId, name: author?.name ?? null, email: author!.email },
          voteCount: 0,
          viewerVoted: false,
        },
      },
      201,
    );
  });

  return app;
}
