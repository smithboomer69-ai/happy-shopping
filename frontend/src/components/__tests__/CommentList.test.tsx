import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CommentList } from '../CommentList'
import type { Comment } from '../../lib/types'

const comments: Comment[] = [
  {
    id: 'c1',
    postId: 'p1',
    body: 'This would save us hours.',
    createdAt: '2026-08-02T09:00:00Z',
    author: { id: 'u1', email: 'ada@example.com' },
  },
  {
    id: 'c2',
    postId: 'p1',
    body: 'Agreed, shipping it would be a big win.',
    author: { id: 'u2', email: 'grace@example.com' },
  },
]

describe('CommentList', () => {
  it('renders each comment with its author and body', () => {
    render(<CommentList comments={comments} />)
    expect(screen.getByText('This would save us hours.')).toBeInTheDocument()
    expect(screen.getByText('Agreed, shipping it would be a big win.')).toBeInTheDocument()
    expect(screen.getByText('ada@example.com')).toBeInTheDocument()
    expect(screen.getByText('grace@example.com')).toBeInTheDocument()
  })

  it('shows an empty-state message when there are no comments', () => {
    render(<CommentList comments={[]} />)
    expect(screen.getByText(/no comments yet/i)).toBeInTheDocument()
  })

  it('shows a loading message while fetching', () => {
    render(<CommentList comments={undefined} loading />)
    expect(screen.getByText(/loading comments/i)).toBeInTheDocument()
  })
})
