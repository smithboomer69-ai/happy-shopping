import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NewPostForm } from '../NewPostForm'

describe('NewPostForm', () => {
  it('requires a title and does not submit without one', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<NewPostForm onSubmit={onSubmit} />)
    await user.click(screen.getByRole('button', { name: /post feature/i }))
    expect(screen.getByRole('alert')).toHaveTextContent('Title is required.')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits trimmed values, then clears the form', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<NewPostForm onSubmit={onSubmit} />)
    await user.type(screen.getByLabelText(/^title/i), '  Dark mode  ')
    await user.type(screen.getByLabelText(/description/i), 'Please add it.')
    await user.click(screen.getByRole('button', { name: /post feature/i }))
    expect(onSubmit).toHaveBeenCalledWith({ title: 'Dark mode', description: 'Please add it.' })
    expect(screen.getByLabelText(/^title/i)).toHaveValue('')
    expect(screen.getByLabelText(/description/i)).toHaveValue('')
  })

  it('keeps the draft and shows the server error when submission fails', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockRejectedValue(new Error('boom'))
    render(<NewPostForm onSubmit={onSubmit} error="Board is full" />)
    await user.type(screen.getByLabelText(/^title/i), 'Dark mode')
    await user.click(screen.getByRole('button', { name: /post feature/i }))
    expect(screen.getByRole('alert')).toHaveTextContent('Board is full')
    expect(screen.getByLabelText(/^title/i)).toHaveValue('Dark mode')
  })

  it('shows a pending label and disables submit while posting', () => {
    render(<NewPostForm onSubmit={vi.fn()} submitting />)
    expect(screen.getByRole('button', { name: /posting/i })).toBeDisabled()
  })
})
