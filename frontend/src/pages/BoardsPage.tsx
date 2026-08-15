import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, errorMessage } from '../lib/api'
import { Breadcrumbs } from '../components/Breadcrumbs'
import { EmptyState } from '../components/EmptyState'
import { ErrorState } from '../components/ErrorState'
import { Spinner } from '../components/Spinner'
import { useWorkspace } from '../hooks/useSignalQueries'
import { formatDate } from '../lib/format'

export function BoardsPage() {
  const { workspaceId = '' } = useParams()
  const queryClient = useQueryClient()
  const workspaceQuery = useWorkspace(workspaceId)
  const boardsQuery = useQuery({
    queryKey: ['boards', workspaceId],
    queryFn: () => api.listBoards(workspaceId),
  })
  const createBoard = useMutation({
    mutationFn: (input: { name: string }) => api.createBoard(workspaceId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['boards', workspaceId] })
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
      await createBoard.mutateAsync({ name: name.trim() })
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <div className="page">
      <Breadcrumbs crumbs={[{ label: 'Workspaces', to: '/' }, { label: workspaceQuery.data?.name ?? 'Workspace' }]} />

      <header className="page-header">
        <h1 className="page-title">{workspaceQuery.data?.name ?? 'Boards'}</h1>
        <p className="page-subtitle">Each board collects feature requests for one area of your product.</p>
      </header>

      <form className="card form" onSubmit={handleCreate}>
        <h2 className="form__heading">New board</h2>
        <div className="form-field">
          <label className="form-field__label" htmlFor="board-name">
            Name
          </label>
          <input
            id="board-name"
            className="input"
            type="text"
            placeholder="e.g. Mobile App"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={80}
          />
        </div>
        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={createBoard.isPending || !name.trim()}>
            {createBoard.isPending ? 'Creating…' : 'Create board'}
          </button>
        </div>
      </form>

      {boardsQuery.isLoading ? (
        <div className="full-page-center" role="status">
          <Spinner />
        </div>
      ) : null}

      {boardsQuery.isError ? (
        <ErrorState message={errorMessage(boardsQuery.error)} onRetry={() => boardsQuery.refetch()} />
      ) : null}

      {boardsQuery.data && boardsQuery.data.length === 0 ? (
        <EmptyState
          title="No boards yet"
          body="Create a board to start collecting feature requests."
        />
      ) : null}

      {boardsQuery.data && boardsQuery.data.length > 0 ? (
        <ul className="card-grid">
          {boardsQuery.data.map((board) => (
            <li key={board.id}>
              <Link to={`/workspaces/${workspaceId}/boards/${board.id}`} className="card card-link">
                <h2 className="card-link__title">{board.name}</h2>
                {typeof board.postCount === 'number' ? (
                  <p className="card-link__meta">
                    {board.postCount} post{board.postCount === 1 ? '' : 's'}
                  </p>
                ) : null}
                {board.createdAt ? (
                  <p className="card-link__meta">Created {formatDate(board.createdAt)}</p>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
