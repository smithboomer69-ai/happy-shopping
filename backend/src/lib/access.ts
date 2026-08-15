import { and, eq } from "drizzle-orm";
import { boards, workspaceMembers, workspaces } from "../db/schema";
import type { DB } from "../db";

/**
 * Returns the workspace only when `userId` is a member of it, else null.
 * Used to hide the existence of workspaces from non-members.
 */
export function findWorkspaceForMember(
  db: DB,
  userId: string,
  workspaceId: string,
) {
  return db
    .select({ workspace: workspaces })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, userId),
      ),
    )
    .get();
}

/**
 * Returns the board only when `userId` is a member of the board's workspace.
 */
export function findBoardForMember(db: DB, userId: string, boardId: string) {
  const row = db
    .select({ board: boards })
    .from(boards)
    .innerJoin(workspaces, eq(boards.workspaceId, workspaces.id))
    .innerJoin(
      workspaceMembers,
      and(
        eq(workspaceMembers.workspaceId, workspaces.id),
        eq(workspaceMembers.userId, userId),
      ),
    )
    .where(eq(boards.id, boardId))
    .get();
  return row?.board ?? null;
}
