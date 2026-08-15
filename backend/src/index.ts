import { join } from "node:path";
import { createApp } from "./app";
import { applyMigrations, createDb } from "./db";
import { env } from "./lib/env";

const { db, sqlite } = createDb(env.DATABASE_URL);
applyMigrations(db, join(import.meta.dir, "../drizzle"));

const app = createApp(db);

Bun.serve({
  port: env.PORT,
  hostname: "0.0.0.0", // reachable from the frontend and the container network
  fetch: app.fetch,
});

console.log(`Signal API listening on http://0.0.0.0:${env.PORT} (db: ${env.DATABASE_URL})`);

// Keep the process alive is handled by Bun.serve; ensure clean shutdown closes the db.
process.on("SIGINT", () => {
  sqlite.close();
  process.exit(0);
});
process.on("SIGTERM", () => {
  sqlite.close();
  process.exit(0);
});
