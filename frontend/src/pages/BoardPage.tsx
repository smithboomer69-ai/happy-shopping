import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, errorMessage } from '../lib/api'
import type { CreatePostInput } from '../lib/api'
import { Breadcrumbs } from '../components/Breadcrumbs'
import { EmptyState } from '../components/EmptyState'
import { ErrorState } from '../components/ErrorState'
import { NewPostForm } from '../components/NewPostForm'
import { PostCard } from '../components/PostCard'
import { Spinner } from '../components/Spinner'
import { useBoard, usePostVote, useWorkspace } from '../hooks/useSignalQueries'
import type { Post } from '../lib/types'

export function BoardPage() {
  const { workspaceId = '', boardId = '' } = useParams()
  const queryClient = useQueryClient()
  const workspaceQuery = useWorkspace(workspaceId)
  const boardQuery = useBoard(workspaceId, boardId)
  const postsQuery = useQuery({
    queryKey: ['posts', boardId],
    queryFn: () => api.listPosts(boardId),
  })
  const voteMutation = usePostVote(boardId)

  // Board view is sorted by vote count (spec), with recency as a stable tiebreak.
  const posts = useMemo(() => {
    const list = postsQuery.data ?? []
    return [...list].sort((a, b) => {
      if (b.voteCount !== a.voteCount) return b.voteCount - a.voteCount
      return (b.createdAt ?? '').localeCompare(a.createdAt ?? '')
    })
  }, [postsQuery.data])

  const createPost = useMutation({
    mutationFn: (input: CreatePostInput) => api.createPost(boardId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['posts', boardId] })
    },
  })

  const [postError, setPostError] = useState<string | null>(null)

  async function handleCreatePost(input: CreatePostInput) {
    setPostError(null)
    try {
      await createPost.mutateAsync(input)
    } catch (err) {
      setPostError(errorMessage(err))
      throw err
    }
  }

  return (
    <div className="page">
      <Breadcrumbs
        crumbs={[
          { label: 'Workspaces', to: '/' },
          { label: workspaceQuery.data?.name ?? 'Workspace', to: `/workspaces/${workspaceId}` },
          { label: boardQuery.data?.name ?? 'Board' },
        ]}
      />

      <header className="page-header">
        <h1 className="page-title">{boardQuery.data?.name ?? 'Board'}</h1>
        {boardQuery.data?.description ? (
          <p className="page-subtitle">{boardQuery.data.description}</p>
        ) : (
          <p className="page-subtitle">Feature requests, sorted by votes.</p>
        )}
      </header>

      <NewPostForm onSubmit={handleCreatePost} submitting={createPost.isPending} error={postError} />

      {postsQuery.isLoading ? (
        <div className="full-page-center" role="status">
          <Spinner />
        </div>
      ) : null}

      {postsQuery.isError ? (
        <ErrorState message={errorMessage(postsQuery.error)} onRetry={() => postsQuery.refetch()} />
      ) : null}

      {!postsQuery.isLoading && !postsQuery.isError && posts.length === 0 ? (
        <EmptyState
          title="No feature requests yet"
          body="Be the first to suggest a feature for this board."
        />
      ) : null}

      {posts.length > 0 ? (
        <ul className="post-list">
          {posts.map((post: Post) => (
            <li key={post.id}>
              <PostCard
                post={post}
                detailPath={`/workspaces/${workspaceId}/boards/${boardId}/posts/${post.id}`}
                onToggleVote={(postId) => void voteMutation.mutate(postId)}
                voteBusy={voteMutation.isPending && voteMutation.variables === post.id}
              />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
