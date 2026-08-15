export interface User {
  id: string
  email: string
  name?: string | null
  createdAt?: string
}

export interface Workspace {
  id: string
  name: string
  role?: 'owner' | 'member'
  createdAt?: string
}

export interface Board {
  id: string
  workspaceId: string
  name: string
  postCount?: number
  createdAt?: string
}

export interface Author {
  id: string
  name?: string | null
  email: string
}

export interface Post {
  id: string
  boardId: string
  title: string
  description: string | null
  voteCount: number
  viewerVoted: boolean
  createdAt?: string
  author?: Author
}

export interface Comment {
  id: string
  postId: string
  body: string
  createdAt?: string
  author?: Author
}
