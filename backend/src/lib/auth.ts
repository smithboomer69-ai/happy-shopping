import { sign, verify } from "hono/jwt";
import { env } from "./env";

export const COOKIE_NAME = "signal_token";
export const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export interface SessionPayload {
  sub: string; // user id
  email: string;
}

export function hashPassword(password: string): Promise<string> {
  return Bun.password.hash(password, {
    algorithm: "argon2id",
    memoryCost: 19_456, // 19 MiB
    timeCost: 2,
  });
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return Bun.password.verify(password, hash);
}

export function signToken(payload: SessionPayload): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return sign(
    {
      sub: payload.sub,
      email: payload.email,
      iat: now,
      exp: now + TOKEN_TTL_SECONDS,
    },
    env.JWT_SECRET,
  );
}

/** Returns the session payload, or null when the token is missing/expired/invalid. */
export async function verifyToken(token: string | undefined | null): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const payload = await verify(token, env.JWT_SECRET, "HS256");
    if (typeof payload.sub !== "string" || !payload.sub) return null;
    return { sub: payload.sub, email: String(payload.email ?? "") };
  } catch {
    return null;
  }
}
