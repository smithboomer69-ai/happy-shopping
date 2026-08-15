import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AuthForm } from '../AuthForm'

function renderForm(props: Partial<React.ComponentProps<typeof AuthForm>> = {}) {
  return render(
    <MemoryRouter>
      <AuthForm mode="login" onSubmit={vi.fn()} {...props} />
    </MemoryRouter>,
  )
}

describe('AuthForm', () => {
  it('rejects an invalid email', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    renderForm({ onSubmit })
    await user.type(screen.getByLabelText(/email/i), 'not-an-email')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /log in/i }))
    expect(screen.getByRole('alert')).toHaveTextContent('valid email')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('rejects a password shorter than 8 characters', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    renderForm({ onSubmit })
    await user.type(screen.getByLabelText(/email/i), 'ada@example.com')
    await user.type(screen.getByLabelText(/password/i), 'short')
    await user.click(screen.getByRole('button', { name: /log in/i }))
    expect(screen.getByRole('alert')).toHaveTextContent('at least 8 characters')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits normalized email and password on valid input', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    renderForm({ onSubmit })
    await user.type(screen.getByLabelText(/email/i), ' Ada@Example.com ')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /log in/i }))
    expect(onSubmit).toHaveBeenCalledWith({ email: 'ada@example.com', password: 'password123' })
  })

  it('links to the register page in login mode and vice versa', () => {
    const { rerender } = renderForm()
    expect(screen.getByRole('link', { name: /create an account/i })).toHaveAttribute(
      'href',
      '/register',
    )

    rerender(
      <MemoryRouter>
        <AuthForm mode="register" onSubmit={vi.fn()} />
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { name: /create your account/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /log in/i })).toHaveAttribute('href', '/login')
  })

  it('shows the server error passed as a prop', () => {
    renderForm({ error: 'Invalid credentials.' })
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid credentials.')
  })

  it('disables the submit button while busy', () => {
    renderForm({ busy: true })
    expect(screen.getByRole('button', { name: /logging in/i })).toBeDisabled()
  })
})
