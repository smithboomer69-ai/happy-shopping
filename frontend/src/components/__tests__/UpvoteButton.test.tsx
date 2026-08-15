import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UpvoteButton } from '../UpvoteButton'

describe('UpvoteButton', () => {
  it('renders the vote count', () => {
    render(<UpvoteButton voteCount={7} voted={false} onToggle={vi.fn()} />)
    expect(screen.getByText('7')).toBeInTheDocument()
  })

  it('reflects the voted state via aria-pressed', () => {
    const { rerender } = render(<UpvoteButton voteCount={1} voted={false} onToggle={vi.fn()} />)
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false')
    rerender(<UpvoteButton voteCount={1} voted onToggle={vi.fn()} />)
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true')
  })

  it('labels the action based on voted state', () => {
    render(<UpvoteButton voteCount={3} voted={false} onToggle={vi.fn()} />)
    expect(screen.getByRole('button', { name: /^upvote/i })).toBeInTheDocument()

    const { rerender } = render(<UpvoteButton voteCount={3} voted={false} onToggle={vi.fn()} />)
    rerender(<UpvoteButton voteCount={3} voted onToggle={vi.fn()} />)
    expect(screen.getByRole('button', { name: /^remove upvote/i })).toBeInTheDocument()
  })

  it('calls onToggle when clicked', async () => {
    const user = userEvent.setup()
    const onToggle = vi.fn()
    render(<UpvoteButton voteCount={0} voted={false} onToggle={onToggle} />)
    await user.click(screen.getByRole('button'))
    expect(onToggle).toHaveBeenCalledTimes(1)
  })

  it('is disabled while busy and does not fire onToggle', async () => {
    const user = userEvent.setup()
    const onToggle = vi.fn()
    render(<UpvoteButton voteCount={2} voted onToggle={onToggle} busy />)
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    await user.click(button)
    expect(onToggle).not.toHaveBeenCalled()
  })

  it('respects the disabled prop', async () => {
    const user = userEvent.setup()
    const onToggle = vi.fn()
    render(<UpvoteButton voteCount={5} voted={false} onToggle={onToggle} disabled />)
    await user.click(screen.getByRole('button'))
    expect(onToggle).not.toHaveBeenCalled()
  })
})
