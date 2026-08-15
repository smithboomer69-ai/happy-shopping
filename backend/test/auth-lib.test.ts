import { describe, expect, test } from "bun:test";
import { hashPassword, signToken, verifyPassword, verifyToken } from "../src/lib/auth";

describe("password hashing", () => {
  test("hashes and verifies a password", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(hash).not.toBe("correct horse battery staple");
    expect(await verifyPassword("correct horse battery staple", hash)).toBe(true);
    expect(await verifyPassword("wrong password", hash)).toBe(false);
  });

  test("produces unique salts per hash", async () => {
    const a = await hashPassword("same-password");
    const b = await hashPassword("same-password");
    expect(a).not.toBe(b);
  });
});

describe("JWT token helpers", () => {
  test("signs and verifies a token round-trip", async () => {
    const token = await signToken({ sub: "user-1", email: "u1@example.com" });
    const session = await verifyToken(token);
    expect(session).toEqual({ sub: "user-1", email: "u1@example.com" });
  });

  test("returns null for garbage tokens", async () => {
    expect(await verifyToken("not-a-token")).toBeNull();
    expect(await verifyToken("")).toBeNull();
    expect(await verifyToken(null)).toBeNull();
    expect(await verifyToken(undefined)).toBeNull();
  });

  test("returns null for a token signed with the wrong secret", async () => {
    // Sign with a different secret, then verify with the module's real one.
    const { sign } = await import("hono/jwt");
    const tampered = await sign({ sub: "user-1", email: "x@x.com" }, "a-totally-different-secret-1234567890");
    expect(await verifyToken(tampered)).toBeNull();
  });
});
