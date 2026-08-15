import { useState } from 'react'
import type { FormEvent } from 'react'
import type { CreatePostInput } from '../lib/api'

interface NewPostFormProps {
  onSubmit: (input: CreatePostInput) => Promise<void>
  submitting?: boolean
  error?: string | null
}

export function NewPostForm({ onSubmit, submitting = false, error = null }: NewPostFormProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!title.trim()) {
      setValidationError('Title is required.')
      return
    }
    setValidationError(null)
    try {
      await onSubmit({ title: title.trim(), description: description.trim() })
      setTitle('')
      setDescription('')
    } catch {
      // Server error surfaces via the `error` prop; keep the draft intact.
    }
  }

  return (
    <form className="card form" onSubmit={handleSubmit} noValidate>
      <h2 className="form__heading">Suggest a feature</h2>
      <div className="form-field">
        <label className="form-field__label" htmlFor="post-title">
          Title
        </label>
        <input
          id="post-title"
          className="input"
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="A short, clear title"
          maxLength={120}
        />
      </div>
      <div className="form-field">
        <label className="form-field__label" htmlFor="post-description">
          Description <span className="optional">(optional)</span>
        </label>
        <textarea
          id="post-description"
          className="input textarea"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="What should this feature do, and why does it matter?"
          rows={4}
          maxLength={2000}
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
          {submitting ? 'Posting…' : 'Post feature'}
        </button>
      </div>
    </form>
  )
}
