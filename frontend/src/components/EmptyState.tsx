import type { ReactNode } from 'react'

interface EmptyStateProps {
  title: string
  body?: string
  action?: ReactNode
}

export function EmptyState({ title, body, action }: EmptyStateProps) {
  return (
    <div className="empty-state card">
      <h2 className="empty-state__title">{title}</h2>
      {body ? <p className="empty-state__body">{body}</p> : null}
      {action}
    </div>
  )
}
