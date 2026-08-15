import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, errorMessage } from '../lib/api'
import { Breadcrumbs } from '../components/Breadcrumbs'
import { CommentForm } from '../components/CommentForm'
import { CommentList } from '../components/CommentList'
import { ErrorState } from '../components/ErrorState'
import { Spinner } from '../components/Spinner'
import { UpvoteButton } from '../components/UpvoteButton'
import { useBoard, usePostVote, useWorkspace } from '../hooks/useSignalQueries'
import { formatDate } from '../lib/format'

export function PostPage() {
  const { workspaceId = '', boardId = '', postId = '' } = useParams()
  const queryClient = useQueryClient()
  const workspaceQuery = useWorkspace(workspaceId)
  const boardQuery = useBoard(workspaceId, boardId)
  const postsQuery = useQuery({
    queryKey: ['posts', boardId],
    queryFn: () => api.listPosts(boardId),
  })
  const commentsQuery = useQuery({
    queryKey: ['comments', postId],
    queryFn: () => api.listComments(postId),
  })
  const voteMutation = usePostVote(boardId)

  const addComment = useMutation({
    mutationFn: (body: string) => api.addComment(postId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['comments', postId] })
    },
  })

  const [commentError, setCommentError] = useState<string | null>(null)

  async function handleAddComment(body: string) {
    setCommentError(null)
    try {
      await addComment.mutateAsync(body)
    } catch (err) {
      setCommentError(errorMessage(err))
      throw err
    }
  }

  const post = postsQuery.data?.find((candidate) => candidate.id === postId)

  return (
    <div className="page">
      <Breadcrumbs
        crumbs={[
          { label: 'Workspaces', to: '/' },
          { label: workspaceQuery.data?.name ?? 'Workspace', to: `/workspaces/${workspaceId}` },
          { label: boardQuery.data?.name ?? 'Board', to: `/workspaces/${workspaceId}/boards/${boardId}` },
          { label: post?.title ?? 'Post' },
        ]}
      />

      {postsQuery.isLoading ? (
        <div className="full-page-center" role="status">
          <Spinner />
        </div>
      ) : null}

      {postsQuery.isError ? (
        <ErrorState message={errorMessage(postsQuery.error)} onRetry={() => postsQuery.refetch()} />
      ) : null}

      {!postsQuery.isLoading && !postsQuery.isError && !post ? (
        <ErrorState message="This post could not be found." />
      ) : null}

      {post ? (
        <>
          <article className="card post-detail">
            <div className="post-detail__vote">
              <UpvoteButton
                voteCount={post.voteCount}
                voted={post.viewerVoted}
                busy={voteMutation.isPending && voteMutation.variables === post.id}
                onToggle={() => voteMutation.mutate(post.id)}
              />
            </div>
            <div className="post-detail__content">
              <h1 className="post-detail__title">{post.title}</h1>
              <div className="post-detail__meta">
                {post.author ? <span>{post.author.email}</span> : null}
                {post.createdAt ? (
                  <time dateTime={post.createdAt}>{formatDate(post.createdAt)}</time>
                ) : null}
              </div>
              {post.description ? <p className="post-detail__description">{post.description}</p> : null}
            </div>
          </article>

          <section className="comments-section" aria-label="Comments">
            <h2 className="comments-section__title">Comments</h2>
            <CommentForm onSubmit={handleAddComment} submitting={addComment.isPending} error={commentError} />
            {commentsQuery.isError ? (
              <ErrorState message={errorMessage(commentsQuery.error)} onRetry={() => commentsQuery.refetch()} />
            ) : (
              <CommentList comments={commentsQuery.data} loading={commentsQuery.isLoading} />
            )}
          </section>
        </>
      ) : null}
    </div>
  )
}
