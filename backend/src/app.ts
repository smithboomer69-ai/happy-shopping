import { Hono } from "hono";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
import { authRoutes } from "./routes/auth";
import { workspaceRoutes } from "./routes/workspaces";
import { boardRoutes } from "./routes/boards";
import { postRoutes } from "./routes/posts";
import type { DB } from "./db";
import type { AppEnv } from "./middleware/auth";
import { isProd } from "./lib/env";

const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  /\.ctonew\.app$/,
];

export function createApp(db: DB) {
  const app = new Hono<AppEnv>();

  if (!isProd) app.use("*", logger());

  app.use(
    "*",
    cors({
      credentials: true,
      origin: (origin) => {
        if (!origin) return "*";
        const allowed = ALLOWED_ORIGINS.some((o) =>
          o instanceof RegExp ? o.test(origin) : o === origin,
        );
        return allowed ? origin : null;
      },
    }),
  );

  app.get("/api/health", (c) => c.json({ status: "ok", service: "signal-api" }));

  app.route("/api/auth", authRoutes(db));
  app.route("/api/workspaces", workspaceRoutes(db));
  app.route("/api/boards", boardRoutes(db));
  app.route("/api/posts", postRoutes(db));

  app.notFound((c) => c.json({ error: "Not found" }, 404));
  app.onError((err, c) => {
    console.error(err);
    return c.json({ error: "Internal server error" }, 500);
  });

  return app;
}
