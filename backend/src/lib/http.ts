import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

/** Consistent JSON error envelope: { error: string } (+ optional field). */
export function apiError(
  c: Context,
  status: ContentfulStatusCode,
  message: string,
  field?: string,
) {
  return c.json(field ? { error: message, field } : { error: message }, status);
}
