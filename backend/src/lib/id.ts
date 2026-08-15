import { randomUUID } from "node:crypto";

/** UUID v7-style id. Falls back to v4 semantics — both are unique & sortable enough for v1. */
export function newId(): string {
  return randomUUID();
}
