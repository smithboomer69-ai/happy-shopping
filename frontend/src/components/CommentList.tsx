import type { Comment } from '../lib/types'
import { formatDate } from '../lib/format'

interface CommentListProps {
  comments: Comment[] | undefined
  loading?: boolean
}

export function CommentList({ comments, loading = false }: CommentListProps) {
  if (loading) {
    return (
      <p className="text-muted" role="status">
        Loading comments…
      </p>
    )
  }

  if (!comments || comments.length === 0) {
    return <p className="text-muted">No comments yet — be the first to share your thoughts.</p>
  }

  return (
    <ul className="comment-list">
      {comments.map((comment) => (
        <li key={comment.id} className="comment">
          <div className="comment__header">
            <span className="comment__author">{comment.author?.email ?? 'Anonymous'}</span>
            {comment.createdAt ? (
              <time className="comment__date" dateTime={comment.createdAt}>
                {formatDate(comment.createdAt)}
              </time>
            ) : null}
          </div>
          <p className="comment__body">{comment.body}</p>
        </li>
      ))}
    </ul>
  )
}
