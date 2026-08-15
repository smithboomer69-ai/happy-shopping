import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Spinner } from './Spinner'

export function ProtectedRoute() {
  const { status } = useAuth()

  if (status === 'loading') {
    return (
      <div className="full-page-center" role="status" aria-live="polite">
        <Spinner />
        <p className="text-muted">Loading…</p>
      </div>
    )
  }

  if (status !== 'authenticated') return <Navigate to="/login" replace />

  return <Outlet />
}
