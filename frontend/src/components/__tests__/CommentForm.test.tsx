import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CommentForm } from '../CommentForm'

describe('CommentForm', () => {
  it('blocks empty comments', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<CommentForm onSubmit={onSubmit} />)
    await user.click(screen.getByRole('button', { name: /add comment/i }))
    expect(screen.getByRole('alert')).toHaveTextContent('Comment cannot be empty.')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits the trimmed body and clears the textarea', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<CommentForm onSubmit={onSubmit} />)
    await user.type(screen.getByLabelText(/add a comment/i), '  Great idea!  ')
    await user.click(screen.getByRole('button', { name: /add comment/i }))
    expect(onSubmit).toHaveBeenCalledWith('Great idea!')
    expect(screen.getByLabelText(/add a comment/i)).toHaveValue('')
  })

  it('shows the server error when posting fails', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockRejectedValue(new Error('boom'))
    render(<CommentForm onSubmit={onSubmit} error="Could not post comment" />)
    await user.type(screen.getByLabelText(/add a comment/i), 'Nice.')
    await user.click(screen.getByRole('button', { name: /add comment/i }))
    expect(screen.getByRole('alert')).toHaveTextContent('Could not post comment')
  })
})
