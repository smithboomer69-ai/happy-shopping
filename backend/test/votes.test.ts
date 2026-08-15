import { describe, expect, test, afterEach } from "bun:test";
import { testApp, registerUser, JSON_HEADERS, authHeaders, jsonOf, type TestApp } from "./helpers";
import { workspaceMembers } from "../src/db/schema";

let ctx: TestApp;
afterEach(() => ctx?.close());

function setup() {
  ctx = testApp();
  return ctx;
}

/** Adds `userId` as a member of `workspaceId` directly (v1 has no invite API). */
function addMember(workspaceId: string, userId: string, role: "owner" | "member" = "member") {
  ctx!.db.insert(workspaceMembers).values({ workspaceId, userId, role }).run();
}

async function createPostFixture(app: TestApp["app"], email: string) {
  const { token, userId } = await registerUser(app, email);
  const wsRes = await app.request("/api/workspaces", {
    method: "POST",
    headers: { ...JSON_HEADERS, ...authHeaders(token) },
    body: JSON.stringify({ name: "Acme" }),
  });
  const workspaceId = (await jsonOf(wsRes)).workspace.id as string;

  const boardRes = await app.request(`/api/workspaces/${workspaceId}/boards`, {
    method: "POST",
    headers: { ...JSON_HEADERS, ...authHeaders(token) },
    body: JSON.stringify({ name: "Ideas" }),
  });
  const boardId = (await jsonOf(boardRes)).board.id as string;

  const postRes = await app.request(`/api/boards/${boardId}/posts`, {
    method: "POST",
    headers: { ...JSON_HEADERS, ...authHeaders(token) },
    body: JSON.stringify({ title: "Keyboard shortcuts" }),
  });
  const postId = (await jsonOf(postRes)).post.id as string;

  return { token, userId, workspaceId, boardId, postId };
}

describe("POST /api/posts/:id/vote (toggle)", () => {
  test("first vote counts, second vote toggles off", async () => {
    const { app } = setup();
    const { token, postId } = await createPostFixture(app, "vote@example.com");

    const on = await app.request(`/api/posts/${postId}/vote`, {
      method: "POST",
      headers: authHeaders(token),
    });
    expect(on.status).toBe(200);
    expect(await jsonOf(on)).toEqual({ postId, voted: true, voteCount: 1 });

    const off = await app.request(`/api/posts/${postId}/vote`, {
      method: "POST",
      headers: authHeaders(token),
    });
    expect(await jsonOf(off)).toEqual({ postId, voted: false, voteCount: 0 });
  });

  test("two users each contribute one vote to the same post", async () => {
    const { app } = setup();
    const { workspaceId, postId } = await createPostFixture(app, "vote-a@example.com");
    const b = await registerUser(app, "vote-b@example.com");
    addMember(workspaceId, b.userId, "member");

    const v1 = await app.request(`/api/posts/${postId}/vote`, {
      method: "POST",
      headers: authHeaders(b.token),
    });
    const body = (await jsonOf(v1)) as { voted: boolean; voteCount: number };
    expect(body.voted).toBe(true);
    expect(body.voteCount).toBe(1);
  });

  test("a single user cannot vote twice (toggle semantics)", async () => {
    const { app } = setup();
    const { token, postId } = await createPostFixture(app, "vote-once@example.com");

    await app.request(`/api/posts/${postId}/vote`, { method: "POST", headers: authHeaders(token) });
    const again = await app.request(`/api/posts/${postId}/vote`, { method: "POST", headers: authHeaders(token) });

    expect((await jsonOf(again)).voteCount).toBe(0); // toggled back off
  });

  test("viewerVoted reflects the current user's vote", async () => {
    const { app } = setup();
    const { token, boardId, postId } = await createPostFixture(app, "viewer@example.com");

    const before = await app.request(`/api/boards/${boardId}/posts`, { headers: authHeaders(token) });
    expect((await jsonOf(before)).posts[0].viewerVoted).toBe(false);

    await app.request(`/api/posts/${postId}/vote`, { method: "POST", headers: authHeaders(token) });

    const after = await app.request(`/api/boards/${boardId}/posts`, { headers: authHeaders(token) });
    expect((await jsonOf(after)).posts[0].viewerVoted).toBe(true);
  });

  test("posts are sorted by vote count desc", async () => {
    const { app } = setup();
    const { workspaceId, token, boardId, postId: fixturePostId } = await createPostFixture(app, "sort@example.com");

    const p1 = await app.request(`/api/boards/${boardId}/posts`, {
      method: "POST",
      headers: { ...JSON_HEADERS, ...authHeaders(token) },
      body: JSON.stringify({ title: "Low priority" }),
    });
    const p2 = await app.request(`/api/boards/${boardId}/posts`, {
      method: "POST",
      headers: { ...JSON_HEADERS, ...authHeaders(token) },
      body: JSON.stringify({ title: "High priority" }),
    });
    const id1 = (await jsonOf(p1)).post.id as string;
    const id2 = (await jsonOf(p2)).post.id as string;

    // Two votes for p2, none for p1.
    await app.request(`/api/posts/${id2}/vote`, { method: "POST", headers: authHeaders(token) });
    const other = await registerUser(app, "sort2@example.com");
    addMember(workspaceId, other.userId, "member");
    await app.request(`/api/posts/${id2}/vote`, { method: "POST", headers: authHeaders(other.token) });

    const list = await app.request(`/api/boards/${boardId}/posts`, { headers: authHeaders(token) });
    const { posts } = await jsonOf(list);
    const mapped = posts.map((p: { id: string; voteCount: number }) => [p.id, p.voteCount]);
    expect(mapped[0]).toEqual([id2, 2]); // most-voted first
    // The two 0-vote posts tie; both come after the voted one.
    expect(mapped[1]![1]).toBe(0);
    expect(mapped[2]![1]).toBe(0);
    expect(new Set([mapped[1]![0], mapped[2]![0]])).toEqual(new Set([id1, fixturePostId]));
  });

  test("voting on a nonexistent or inaccessible post returns 404", async () => {
    const { app } = setup();
    const { token, postId } = await createPostFixture(app, "vote-404@example.com");
    const outsider = await registerUser(app, "vote-out@example.com");

    const missing = await app.request(`/api/posts/does-not-exist/vote`, {
      method: "POST",
      headers: authHeaders(token),
    });
    expect(missing.status).toBe(404);

    const inaccessible = await app.request(`/api/posts/${postId}/vote`, {
      method: "POST",
      headers: authHeaders(outsider.token),
    });
    expect(inaccessible.status).toBe(404);
  });

  test("voting requires auth", async () => {
    const { app } = setup();
    const res = await app.request("/api/posts/any-id/vote", { method: "POST" });
    expect(res.status).toBe(401);
  });
});

describe("comments", () => {
  test("create + list comments on a post", async () => {
    const { app } = setup();
    const { token, postId } = await createPostFixture(app, "comments@example.com");

    const created = await app.request(`/api/posts/${postId}/comments`, {
      method: "POST",
      headers: { ...JSON_HEADERS, ...authHeaders(token) },
      body: JSON.stringify({ body: "Love this idea!" }),
    });
    expect(created.status).toBe(201);
    const comment = (await jsonOf(created)).comment;
    expect(comment.body).toBe("Love this idea!");
    expect(comment.author.email).toBe("comments@example.com");

    const list = await app.request(`/api/posts/${postId}/comments`, {
      headers: authHeaders(token),
    });
    const { comments } = await jsonOf(list);
    expect(comments).toHaveLength(1);
    expect(comments[0].id).toBe(comment.id);
  });

  test("rejects empty comment body", async () => {
    const { app } = setup();
    const { token, postId } = await createPostFixture(app, "comments2@example.com");
    const res = await app.request(`/api/posts/${postId}/comments`, {
      method: "POST",
      headers: { ...JSON_HEADERS, ...authHeaders(token) },
      body: JSON.stringify({ body: "  " }),
    });
    expect(res.status).toBe(400);
  });

  test("non-member cannot comment on a post", async () => {
    const { app } = setup();
    const { postId } = await createPostFixture(app, "comments3@example.com");
    const outsider = await registerUser(app, "comments-out@example.com");

    const res = await app.request(`/api/posts/${postId}/comments`, {
      method: "POST",
      headers: { ...JSON_HEADERS, ...authHeaders(outsider.token) },
      body: JSON.stringify({ body: "sneaky" }),
    });
    expect(res.status).toBe(404);
  });
});
