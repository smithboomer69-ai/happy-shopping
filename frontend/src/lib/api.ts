import type { Board, Comment, Post, User, Workspace } from './types'

/**
 * API client for the Signal backend (Bun + Hono).
 *
 * Built against the contract in /home/team/shared/SPEC.md:
 *   POST /api/auth/register | login | logout
 *   GET|POST /api/workspaces
 *   GET|POST /api/workspaces/:id/boards
 *   GET|POST /api/boards/:id/posts
 *   POST /api/posts/:id/vote        (toggle)
 *   GET|POST /api/posts/:id/comments
 *
 * The backend owns the final OpenAPI contract; this client is written to be
 * tolerant of small shape differences so the two halves can land in any order.
 * Auth uses cookies (`credentials: 'include'`), so no token storage is needed.
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

export interface VoteResult {
  voteCount: number
  userVoted: boolean
}

/**
 * Normalize a vote-toggle response into { voteCount, userVoted }.
 * The backend may return the full post, an envelope { post }, or a bare
 * { voteCount, userVoted } — accept all three, falling back to the optimistic
 * value when the shape is unrecognized.
 */
export function normalizeVoteResult(raw: unknown, fallback: VoteResult): VoteResult {
  if (raw && typeof raw === 'object') {
    const record = raw as Record<string, unknown>
    const source = (record.post as Record<string, unknown> | undefined) ?? record
    const voteCount = typeof source.voteCount === 'number' ? source.voteCount : undefined
    const userVoted = typeof source.userVoted === 'boolean' ? source.userVoted : undefined
    if (voteCount !== undefined && userVoted !== undefined) return { voteCount, userVoted }
  }
  return fallback
}

export const api = {
  register: (input: AuthPayload) => request<User>('/auth/register', { method: 'POST', body: input }),
  login: (input: AuthPayload) => request<User>('/auth/login', { method: 'POST', body: input }),
  logout: () => request<void>('/auth/logout', { method: 'POST' }),
  me: () => request<User>('/auth/me'),

  listWorkspaces: () => request<Workspace[]>('/workspaces'),
  createWorkspace: (name: string) => request<Workspace>('/workspaces', { method: 'POST', body: { name } }),

  listBoards: (workspaceId: string) => request<Board[]>(`/workspaces/${workspaceId}/boards`),
  createBoard: (workspaceId: string, input: { name: string; description?: string }) =>
    request<Board>(`/workspaces/${workspaceId}/boards`, { method: 'POST', body: input }),

  listPosts: (boardId: string) => request<Post[]>(`/boards/${boardId}/posts`),
  createPost: (boardId: string, input: CreatePostInput) =>
    request<Post>(`/boards/${boardId}/posts`, { method: 'POST', body: input }),

  vote: (postId: string) => request<unknown>(`/posts/${postId}/vote`, { method: 'POST' }),

  listComments: (postId: string) => request<Comment[]>(`/posts/${postId}/comments`),
  addComment: (postId: string, body: string) =>
    request<Comment>(`/posts/${postId}/comments`, { method: 'POST', body: { body } }),
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return 'Something went wrong. Please try again.'
}
