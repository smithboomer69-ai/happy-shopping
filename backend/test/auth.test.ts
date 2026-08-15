import { describe, expect, test, afterEach } from "bun:test";
import { testApp, registerUser, JSON_HEADERS, authHeaders, jsonOf, type TestApp } from "./helpers";

let ctx: TestApp;

afterEach(() => ctx?.close());

function setup() {
  ctx = testApp();
  return ctx;
}

describe("POST /api/auth/register", () => {
  test("creates a user, returns token, and provisions a personal workspace", async () => {
    const { app } = setup();
    const res = await app.request("/api/auth/register", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ email: "Ada@Example.com", password: "password123", name: "Ada" }),
    });

    expect(res.status).toBe(201);
    const body = await jsonOf(res);
    expect(body.user.email).toBe("ada@example.com"); // normalized
    expect(body.user.name).toBe("Ada");
    expect(body.token).toBeTruthy();
    expect(body.user.passwordHash).toBeUndefined(); // never leak the hash

    // Personal workspace exists and the user is a member.
    const ws = await app.request("/api/workspaces", {
      headers: authHeaders(body.token),
    });
    expect(ws.status).toBe(200);
    const wsBody = await jsonOf(ws);
    expect(wsBody.workspaces).toHaveLength(1);
    expect(wsBody.workspaces[0].name).toBe("My Workspace");
    expect(wsBody.workspaces[0].role).toBe("owner");
  });

  test("rejects a duplicate email with 409", async () => {
    const { app } = setup();
    const first = await registerUser(app, "dup@example.com");
    expect(first.status).toBe(201);

    const res = await app.request("/api/auth/register", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ email: "dup@example.com", password: "password123" }),
    });
    expect(res.status).toBe(409);
    const body = await jsonOf(res);
    expect(body.error).toContain("already exists");
  });

  test("rejects invalid email and short password with 400", async () => {
    const { app } = setup();
    const badEmail = await app.request("/api/auth/register", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ email: "not-an-email", password: "password123" }),
    });
    expect(badEmail.status).toBe(400);

    const shortPw = await app.request("/api/auth/register", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ email: "ok@example.com", password: "short" }),
    });
    expect(shortPw.status).toBe(400);
  });
});

describe("POST /api/auth/login", () => {
  test("logs in with correct credentials", async () => {
    const { app } = setup();
    await registerUser(app, "login@example.com", "password123");

    const res = await app.request("/api/auth/login", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ email: "login@example.com", password: "password123" }),
    });
    expect(res.status).toBe(200);
    const body = await jsonOf(res);
    expect(body.token).toBeTruthy();
    expect(body.user.email).toBe("login@example.com");
  });

  test("rejects wrong password with 401", async () => {
    const { app } = setup();
    await registerUser(app, "login2@example.com", "password123");

    const res = await app.request("/api/auth/login", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ email: "login2@example.com", password: "wrong-password" }),
    });
    expect(res.status).toBe(401);
    expect((await jsonOf(res)).error).toBe("Invalid email or password");
  });

  test("rejects unknown email with 401 (no user enumeration)", async () => {
    const { app } = setup();
    const res = await app.request("/api/auth/login", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ email: "nobody@example.com", password: "password123" }),
    });
    expect(res.status).toBe(401);
  });
});

describe("session + cookie flow", () => {
  test("Set-Cookie httpOnly token is issued on login and usable on /me", async () => {
    const { app } = setup();
    await registerUser(app, "cookie@example.com");

    const login = await app.request("/api/auth/login", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ email: "cookie@example.com", password: "password123" }),
    });
    const setCookie = login.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("signal_token=");
    expect(setCookie).toContain("HttpOnly");

    const token = setCookie.split(";")[0]!.split("=")[1]!;
    const me = await app.request("/api/auth/me", {
      headers: { Cookie: `signal_token=${token}` },
    });
    expect(me.status).toBe(200);
    expect((await jsonOf(me)).user.email).toBe("cookie@example.com");
  });

  test("logout clears the auth cookie", async () => {
    const { app } = setup();
    await registerUser(app, "logout@example.com");

    const login = await app.request("/api/auth/login", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ email: "logout@example.com", password: "password123" }),
    });
    const setCookie = login.headers.get("set-cookie") ?? "";
    const token = setCookie.split(";")[0]!.split("=")[1]!;

    const out = await app.request("/api/auth/logout", {
      method: "POST",
      headers: { Cookie: `signal_token=${token}` },
    });
    expect(out.status).toBe(204);
    // The clearing cookie has an empty value + immediate expiry.
    const cleared = out.headers.get("set-cookie") ?? "";
    expect(cleared).toContain("signal_token=");
    expect(cleared).toContain("Max-Age=0");

    // With no credentials the session is gone.
    const me = await app.request("/api/auth/me");
    expect(me.status).toBe(401);
  });
});

describe("GET /api/auth/me", () => {
  test("returns the current user with a valid token", async () => {
    const { app } = setup();
    const { token, userId } = await registerUser(app, "me@example.com", "password123", "Me");

    const res = await app.request("/api/auth/me", { headers: authHeaders(token) });
    expect(res.status).toBe(200);
    const body = await jsonOf(res);
    expect(body.user.id).toBe(userId);
    expect(body.user.name).toBe("Me");
  });

  test("rejects missing/invalid tokens with 401", async () => {
    const { app } = setup();
    const noToken = await app.request("/api/auth/me");
    expect(noToken.status).toBe(401);

    const badToken = await app.request("/api/auth/me", {
      headers: { Authorization: "Bearer not.a.jwt" },
    });
    expect(badToken.status).toBe(401);
  });
});
