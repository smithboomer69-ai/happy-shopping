export interface User {
  id: string
  email: string
  createdAt?: string
}

export interface Workspace {
  id: string
  name: string
  createdAt?: string
}

export interface Board {
  id: string
  workspaceId: string
  name: string
  description?: string
  createdAt?: string
}

export interface PostAuthor {
  id: string
  email: string
}

export interface Post {
  id: string
  boardId: string
  title: string
  description: string
  voteCount: number
  userVoted: boolean
  createdAt?: string
  author?: PostAuthor
}

export interface Comment {
  id: string
  postId: string
  body: string
  createdAt?: string
  author?: PostAuthor
}
