import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'

interface AuthFormProps {
  mode: 'login' | 'register'
  onSubmit: (values: { email: string; password: string }) => Promise<void>
  busy?: boolean
  error?: string | null
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD_LENGTH = 8

export function AuthForm({ mode, onSubmit, busy = false, error = null }: AuthFormProps) {
  const isLogin = mode === 'login'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalizedEmail = email.trim().toLowerCase()
    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      setValidationError('Enter a valid email address.')
      return
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setValidationError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
      return
    }
    setValidationError(null)
    try {
      await onSubmit({ email: normalizedEmail, password })
    } catch {
      // Server error surfaces via the `error` prop.
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card card">
        <div className="auth-card__brand">
          <span className="brand__mark" aria-hidden="true">
            ▲
          </span>
          <span>Signal</span>
        </div>
        <h1 className="auth-card__title">{isLogin ? 'Log in' : 'Create your account'}</h1>
        <p className="auth-card__subtitle">
          {isLogin ? 'Welcome back.' : 'Start collecting feature requests in minutes.'}
        </p>
        <form className="form" onSubmit={handleSubmit} noValidate>
          <div className="form-field">
            <label className="form-field__label" htmlFor="auth-email">
              Email
            </label>
            <input
              id="auth-email"
              className="input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@company.com"
            />
          </div>
          <div className="form-field">
            <label className="form-field__label" htmlFor="auth-password">
              Password
            </label>
            <input
              id="auth-password"
              className="input"
              type="password"
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
            />
          </div>
          {validationError ? (
            <p className="form-error" role="alert">
              {validationError}
            </p>
          ) : null}
          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}
          <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
            {busy
              ? isLogin
                ? 'Logging in…'
                : 'Creating account…'
              : isLogin
                ? 'Log in'
                : 'Create account'}
          </button>
        </form>
        <p className="auth-card__switch">
          {isLogin ? (
            <>
              New to Signal? <Link to="/register">Create an account</Link>
            </>
          ) : (
            <>
              Already have an account? <Link to="/login">Log in</Link>
            </>
          )}
        </p>
      </div>
    </div>
  )
}
