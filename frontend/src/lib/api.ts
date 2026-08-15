import type { Board, Comment, Post, User, Workspace } from './types'

/**
 * API client for the Signal backend (Bun + Hono).
 *
 * Built against the published contract — source of truth:
 *   /home/team/shared/openapi.yaml  (see also API_CONTRACT.md)
 *
 * Contract conventions implemented here:
 *   - Collections are wrapped: `{ workspaces: [] }`, `{ boards: [] }`, etc.
 *     (unwrapped transparently so callers get plain arrays).
 *   - register/login return `{ user, token }` — the token is also set as the
 *     httpOnly `signal_token` cookie, so we keep `credentials: 'include'` and
 *     surface `user` to callers.
 *   - `GET /api/auth/me` returns `{ user }` (401 = signed out).
 *   - Vote toggle returns `{ postId, voted, voteCount }` (see normalizeVoteResult).
 *   - Errors are `{ error, field? }`.
 */

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api'

export class ApiError extends Error {
  readonly status: number
  readonly details: unknown

  constructor(status: number, message: string, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  signal?: AbortSignal
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, signal } = options
  const headers: Record<string, string> = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  let response: Response
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      credentials: 'include',
      signal,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch (error) {
    throw new ApiError(0, 'Network error — is the server running?', error)
  }

  if (!response.ok) {
    let message = `${response.status} ${response.statusText}`.trim()
    let details: unknown
    try {
      const payload: unknown = await response.json()
      details = payload
      if (payload && typeof payload === 'object') {
        const record = payload as Record<string, unknown>
        if (typeof record.error === 'string') message = record.error
        else if (typeof record.message === 'string') message = record.message
      }
    } catch {
      // Non-JSON error body; keep the status text.
    }
    throw new ApiError(response.status, message, details)
  }

  if (response.status === 204) return undefined as T
  const text = await response.text()
  return (text ? JSON.parse(text) : undefined) as T
}

export interface AuthPayload {
  email: string
  password: string
}

export interface CreatePostInput {
  title: string
  description: string
}

/** Contract shape for the vote toggle: `{ postId, voted, voteCount }`. */
export interface VoteResponse {
  postId: string
  voted: boolean
  voteCount: number
}

export interface VoteResult {
  voteCount: number
  voted: boolean
}

/**
 * Normalize a vote-toggle response into { voteCount, voted }.
 * Accepts the contract shape { postId, voted, voteCount } plus two legacy
 * shapes that may come from earlier backend iterations: the full post object
 * ({ voteCount, viewerVoted }) and { voteCount, userVoted }. Falls back to the
 * caller's optimistic value when the shape is unrecognized.
 */
export function normalizeVoteResult(raw: unknown, fallback: VoteResult): VoteResult {
  if (raw && typeof raw === 'object') {
    const record = raw as Record<string, unknown>
    const source = (record.post as Record<string, unknown> | undefined) ?? record
    const voteCount = typeof source.voteCount === 'number' ? source.voteCount : undefined
    const voted =
      typeof source.voted === 'boolean'
        ? source.voted
        : typeof source.viewerVoted === 'boolean'
          ? source.viewerVoted
          : typeof source.userVoted === 'boolean'
            ? source.userVoted
            : undefined
    if (voteCount !== undefined && voted !== undefined) return { voteCount, voted }
  }
  return fallback
}

export const api = {
  register: async (input: AuthPayload) =>
    (await request<{ user: User }>('/auth/register', { method: 'POST', body: input })).user,
  login: async (input: AuthPayload) =>
    (await request<{ user: User }>('/auth/login', { method: 'POST', body: input })).user,
  logout: () => request<void>('/auth/logout', { method: 'POST' }),
  me: async () => (await request<{ user: User }>('/auth/me')).user,

  listWorkspaces: async () => (await request<{ workspaces: Workspace[] }>('/workspaces')).workspaces,
  createWorkspace: async (name: string) =>
    (await request<{ workspace: Workspace }>('/workspaces', { method: 'POST', body: { name } }))
      .workspace,

  listBoards: async (workspaceId: string) =>
    (await request<{ boards: Board[] }>(`/workspaces/${workspaceId}/boards`)).boards,
  createBoard: async (workspaceId: string, input: { name: string }) =>
    (await request<{ board: Board }>(`/workspaces/${workspaceId}/boards`, {
      method: 'POST',
      body: input,
    })).board,

  listPosts: async (boardId: string) =>
    (await request<{ posts: Post[] }>(`/boards/${boardId}/posts`)).posts,
  createPost: async (boardId: string, input: CreatePostInput) =>
    (await request<{ post: Post }>(`/boards/${boardId}/posts`, { method: 'POST', body: input }))
      .post,

  vote: (postId: string) => request<VoteResponse>(`/posts/${postId}/vote`, { method: 'POST' }),

  listComments: async (postId: string) =>
    (await request<{ comments: Comment[] }>(`/posts/${postId}/comments`)).comments,
  addComment: async (postId: string, body: string) =>
    (await request<{ comment: Comment }>(`/posts/${postId}/comments`, {
      method: 'POST',
      body: { body },
    })).comment,
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return 'Something went wrong. Please try again.'
}
