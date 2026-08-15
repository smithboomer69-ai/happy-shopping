interface UpvoteButtonProps {
  voteCount: number
  voted: boolean
  disabled?: boolean
  busy?: boolean
  onToggle: () => void
}

export function UpvoteButton({ voteCount, voted, disabled = false, busy = false, onToggle }: UpvoteButtonProps) {
  const isDisabled = disabled || busy
  const label = `${voted ? 'Remove upvote' : 'Upvote'}. ${voteCount} vote${voteCount === 1 ? '' : 's'}`

  return (
    <button
      type="button"
      className={`vote-button${voted ? ' vote-button--voted' : ''}`}
      aria-pressed={voted}
      aria-label={label}
      disabled={isDisabled}
      onClick={onToggle}
    >
      <svg className="vote-button__arrow" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M12 4l8 9h-5v7H9v-7H4z" />
      </svg>
      <span className="vote-button__count">{voteCount}</span>
    </button>
  )
}
