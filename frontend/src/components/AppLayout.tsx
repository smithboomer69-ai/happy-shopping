import { Link, NavLink, Outlet } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

export function AppLayout() {
  const { user, logout } = useAuth()
  const [signingOut, setSigningOut] = useState(false)

  async function handleSignOut() {
    setSigningOut(true)
    try {
      await logout()
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="container app-header__inner">
          <Link to="/" className="brand">
            <span className="brand__mark" aria-hidden="true">
              ▲
            </span>
            Signal
          </Link>
          <nav className="app-nav" aria-label="Primary">
            <NavLink to="/" end>
              Workspaces
            </NavLink>
          </nav>
          <div className="app-header__account">
            {user ? <span className="account-email">{user.email}</span> : null}
            <button type="button" className="btn btn-ghost btn-sm" onClick={handleSignOut} disabled={signingOut}>
              {signingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        </div>
      </header>
      <main className="container app-main">
        <Outlet />
      </main>
    </div>
  )
}
