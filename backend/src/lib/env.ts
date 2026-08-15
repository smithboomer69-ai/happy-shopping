import { z } from "zod";

const envSchema = z.object({
  // JWT signing secret. In production this MUST be provided.
  JWT_SECRET: z.string().min(16).optional(),
  // SQLite database file. Defaults to ./data/signal.db.
  DATABASE_URL: z.string().optional(),
  // HTTP port for the API server.
  PORT: z.coerce.number().int().positive().optional(),
  // "production" flips cookie flags (Secure) and suppresses dev logging.
  NODE_ENV: z.enum(["development", "production", "test"]).optional(),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  throw new Error(`Invalid environment: ${parsed.error.message}`);
}

export const env = {
  JWT_SECRET:
    parsed.data.JWT_SECRET ??
    "dev-only-signal-secret-change-me-in-production-123456",
  DATABASE_URL: parsed.data.DATABASE_URL ?? "./data/signal.db",
  PORT: parsed.data.PORT ?? 3001,
  NODE_ENV: parsed.data.NODE_ENV ?? "development",
};

export const isProd = env.NODE_ENV === "production";
export const isTest = env.NODE_ENV === "test";
