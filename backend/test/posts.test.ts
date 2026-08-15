import { describe, expect, test, afterEach } from "bun:test";
import { testApp, registerUser, JSON_HEADERS, authHeaders, jsonOf, type TestApp } from "./helpers";

let ctx: TestApp;
afterEach(() => ctx?.close());

function setup() {
  ctx = testApp();
  return ctx;
}

/** Full happy-path fixture: user -> workspace -> board. Returns ids + token. */
async function createBoardFixture(app: TestApp["app"], email: string) {
  const { token, userId } = await registerUser(app, email);
  const ws = await app.request("/api/workspaces", {
    method: "POST",
    headers: { ...JSON_HEADERS, ...authHeaders(token) },
    body: JSON.stringify({ name: "Acme" }),
  });
  const workspace = (await jsonOf(ws)).workspace as { id: string };

  const board = await app.request(`/api/workspaces/${workspace.id}/boards`, {
    method: "POST",
    headers: { ...JSON_HEADERS, ...authHeaders(token) },
    body: JSON.stringify({ name: "Product Ideas" }),
  });
  const boardBody = (await jsonOf(board)).board as { id: string; postCount: number };

  return { token, userId, workspaceId: workspace.id, boardId: boardBody.id, postCount: boardBody.postCount };
}

describe("workspaces", () => {
  test("create + list workspaces", async () => {
    const { app } = setup();
    const { token } = await registerUser(app, "ws@example.com");

    const created = await app.request("/api/workspaces", {
      method: "POST",
      headers: { ...JSON_HEADERS, ...authHeaders(token) },
      body: JSON.stringify({ name: "Team Alpha" }),
    });
    expect(created.status).toBe(201);
    const workspace = (await jsonOf(created)).workspace;

    const list = await app.request("/api/workspaces", { headers: authHeaders(token) });
    const { workspaces } = await jsonOf(list);
    expect(workspaces).toHaveLength(2); // personal workspace + the one we made
    expect(workspaces.map((w: { name: string }) => w.name)).toEqual(
      expect.arrayContaining(["Team Alpha"]),
    );
  });

  test("requires auth", async () => {
    const { app } = setup();
    const res = await app.request("/api/workspaces", { method: "POST", headers: JSON_HEADERS, body: JSON.stringify({ name: "X" }) });
    expect(res.status).toBe(401);
  });

  test("rejects empty workspace name", async () => {
    const { app } = setup();
    const { token } = await registerUser(app, "ws2@example.com");
    const res = await app.request("/api/workspaces", {
      method: "POST",
      headers: { ...JSON_HEADERS, ...authHeaders(token) },
      body: JSON.stringify({ name: "   " }),
    });
    expect(res.status).toBe(400);
  });
});

describe("boards", () => {
  test("create board and list it with postCount", async () => {
    const { app } = setup();
    const { token, workspaceId, boardId, postCount } = await createBoardFixture(app, "boards@example.com");
    expect(boardId).toBeTruthy();
    expect(postCount).toBe(0);

    const list = await app.request(`/api/workspaces/${workspaceId}/boards`, {
      headers: authHeaders(token),
    });
    expect(list.status).toBe(200);
    const { boards } = await jsonOf(list);
    expect(boards).toHaveLength(1);
    expect(boards[0].name).toBe("Product Ideas");
    expect(boards[0].postCount).toBe(0);
  });

  test("non-member cannot access workspace boards (404, not 403)", async () => {
    const { app } = setup();
    const { workspaceId } = await createBoardFixture(app, "owner@example.com");
    const outsider = await registerUser(app, "outsider@example.com");

    const res = await app.request(`/api/workspaces/${workspaceId}/boards`, {
      headers: authHeaders(outsider.token),
    });
    expect(res.status).toBe(404);
  });
});

describe("posts", () => {
  test("create a post and see it in the board list", async () => {
    const { app } = setup();
    const { token, boardId } = await createBoardFixture(app, "posts@example.com");

    const created = await app.request(`/api/boards/${boardId}/posts`, {
      method: "POST",
      headers: { ...JSON_HEADERS, ...authHeaders(token) },
      body: JSON.stringify({ title: "Dark mode", description: "Please add dark mode" }),
    });
    expect(created.status).toBe(201);
    const post = (await jsonOf(created)).post;
    expect(post.title).toBe("Dark mode");
    expect(post.voteCount).toBe(0);
    expect(post.viewerVoted).toBe(false);
    expect(post.author.email).toBe("posts@example.com");

    const list = await app.request(`/api/boards/${boardId}/posts`, {
      headers: authHeaders(token),
    });
    const { posts } = await jsonOf(list);
    expect(posts).toHaveLength(1);
    expect(posts[0].id).toBe(post.id);
    expect(posts[0].voteCount).toBe(0);
  });

  test("rejects empty title", async () => {
    const { app } = setup();
    const { token, boardId } = await createBoardFixture(app, "posts2@example.com");
    const res = await app.request(`/api/boards/${boardId}/posts`, {
      method: "POST",
      headers: { ...JSON_HEADERS, ...authHeaders(token) },
      body: JSON.stringify({ title: "" }),
    });
    expect(res.status).toBe(400);
  });

  test("requires membership to view/create posts", async () => {
    const { app } = setup();
    const { boardId } = await createBoardFixture(app, "posts3@example.com");
    const outsider = await registerUser(app, "posts-out@example.com");

    const list = await app.request(`/api/boards/${boardId}/posts`, {
      headers: authHeaders(outsider.token),
    });
    expect(list.status).toBe(404);

    const create = await app.request(`/api/boards/${boardId}/posts`, {
      method: "POST",
      headers: { ...JSON_HEADERS, ...authHeaders(outsider.token) },
      body: JSON.stringify({ title: "Sneak" }),
    });
    expect(create.status).toBe(404);
  });

  test("unknown board id returns 404", async () => {
    const { app } = setup();
    const { token } = await registerUser(app, "posts4@example.com");
    const res = await app.request(`/api/boards/does-not-exist/posts`, {
      headers: authHeaders(token),
    });
    expect(res.status).toBe(404);
  });
});
