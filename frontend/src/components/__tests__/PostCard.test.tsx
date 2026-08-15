import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { PostCard } from '../PostCard'
import type { Post } from '../../lib/types'

const post: Post = {
  id: 'p1',
  boardId: 'b1',
  title: 'Dark mode',
  description: 'Please add a dark theme.',
  voteCount: 4,
  userVoted: false,
  createdAt: '2026-08-01T10:00:00Z',
  author: { id: 'u1', email: 'ada@example.com' },
}

function renderCard(props: Partial<React.ComponentProps<typeof PostCard>> = {}) {
  return render(
    <MemoryRouter>
      <PostCard
        post={post}
        detailPath="/workspaces/w1/boards/b1/posts/p1"
        onToggleVote={vi.fn()}
        {...props}
      />
    </MemoryRouter>,
  )
}

describe('PostCard', () => {
  it('renders the title, description and vote count', () => {
    renderCard()
    expect(screen.getByText('Dark mode')).toBeInTheDocument()
    expect(screen.getByText('Please add a dark theme.')).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument()
    expect(screen.getByText('ada@example.com')).toBeInTheDocument()
  })

  it('links the title to the post detail page', () => {
    renderCard()
    expect(screen.getByRole('link', { name: 'Dark mode' })).toHaveAttribute(
      'href',
      '/workspaces/w1/boards/b1/posts/p1',
    )
  })

  it('forwards vote toggles with the post id', async () => {
    const user = userEvent.setup()
    const onToggleVote = vi.fn()
    renderCard({ onToggleVote })
    await user.click(screen.getByRole('button', { name: /upvote/i }))
    expect(onToggleVote).toHaveBeenCalledWith('p1')
  })

  it('marks the upvote button as pressed when the user already voted', () => {
    renderCard({ post: { ...post, userVoted: true, voteCount: 5 } })
    expect(screen.getByRole('button', { name: /^remove upvote/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })
})
