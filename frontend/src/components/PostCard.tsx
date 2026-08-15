import { Link } from 'react-router-dom'
import type { Post } from '../lib/types'
import { formatDate } from '../lib/format'
import { UpvoteButton } from './UpvoteButton'

interface PostCardProps {
  post: Post
  detailPath: string
  onToggleVote: (postId: string) => void
  voteBusy?: boolean
}

export function PostCard({ post, detailPath, onToggleVote, voteBusy = false }: PostCardProps) {
  return (
    <article className="post-card">
      <div className="post-card__vote">
        <UpvoteButton
          voteCount={post.voteCount}
          voted={post.viewerVoted}
          busy={voteBusy}
          onToggle={() => onToggleVote(post.id)}
        />
      </div>
      <div className="post-card__body">
        <h3 className="post-card__title">
          <Link to={detailPath}>{post.title}</Link>
        </h3>
        {post.description ? <p className="post-card__description">{post.description}</p> : null}
        <div className="post-card__meta">
          {post.author ? <span className="post-card__author">{post.author.email}</span> : null}
          {post.createdAt ? (
            <time dateTime={post.createdAt}>{formatDate(post.createdAt)}</time>
          ) : null}
        </div>
      </div>
    </article>
  )
}
