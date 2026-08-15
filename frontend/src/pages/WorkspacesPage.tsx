import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, errorMessage } from '../lib/api'
import { EmptyState } from '../components/EmptyState'
import { ErrorState } from '../components/ErrorState'
import { Spinner } from '../components/Spinner'
import { formatDate } from '../lib/format'

export function WorkspacesPage() {
  const queryClient = useQueryClient()
  const workspacesQuery = useQuery({ queryKey: ['workspaces'], queryFn: api.listWorkspaces })
  const createWorkspace = useMutation({
    mutationFn: api.createWorkspace,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['workspaces'] })
      setName('')
    },
  })

  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim()) return
    setError(null)
    try {
      await createWorkspace.mutateAsync(name.trim())
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1 className="page-title">Workspaces</h1>
        <p className="page-subtitle">Pick a workspace to see its boards and feature requests.</p>
      </header>

      <form className="card form" onSubmit={handleCreate}>
        <div className="form-row">
          <input
            className="input"
            type="text"
            placeholder="New workspace name"
            aria-label="New workspace name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={80}
          />
          <button
            type="submit"
            className="btn btn-primary"
            disabled={createWorkspace.isPending || !name.trim()}
          >
            {createWorkspace.isPending ? 'Creating…' : 'Create workspace'}
          </button>
        </div>
        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}
      </form>

      {workspacesQuery.isLoading ? (
        <div className="full-page-center" role="status">
          <Spinner />
        </div>
      ) : null}

      {workspacesQuery.isError ? (
        <ErrorState message={errorMessage(workspacesQuery.error)} onRetry={() => workspacesQuery.refetch()} />
      ) : null}

      {workspacesQuery.data && workspacesQuery.data.length === 0 ? (
        <EmptyState
          title="No workspaces yet"
          body="Create your first workspace to start collecting feature requests."
        />
      ) : null}

      {workspacesQuery.data && workspacesQuery.data.length > 0 ? (
        <ul className="card-grid">
          {workspacesQuery.data.map((workspace) => (
            <li key={workspace.id}>
              <Link to={`/workspaces/${workspace.id}`} className="card card-link">
                <h2 className="card-link__title">{workspace.name}</h2>
                {workspace.createdAt ? (
                  <p className="card-link__meta">Created {formatDate(workspace.createdAt)}</p>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
