import { useState } from 'react'
import type { FormEvent } from 'react'

interface CommentFormProps {
  onSubmit: (body: string) => Promise<void>
  submitting?: boolean
  error?: string | null
}

export function CommentForm({ onSubmit, submitting = false, error = null }: CommentFormProps) {
  const [body, setBody] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!body.trim()) {
      setValidationError('Comment cannot be empty.')
      return
    }
    setValidationError(null)
    try {
      await onSubmit(body.trim())
      setBody('')
    } catch {
      // Server error surfaces via the `error` prop; keep the draft intact.
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      <div className="form-field">
        <label className="form-field__label" htmlFor="comment-body">
          Add a comment
        </label>
        <textarea
          id="comment-body"
          className="input textarea"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Share your thoughts on this feature…"
          rows={3}
          maxLength={1000}
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
      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Posting…' : 'Add comment'}
        </button>
      </div>
    </form>
  )
}
