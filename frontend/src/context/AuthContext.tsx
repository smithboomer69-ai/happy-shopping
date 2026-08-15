import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { api, ApiError } from '../lib/api'
import type { User } from '../lib/types'

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

interface AuthContextValue {
  user: User | null
  status: AuthStatus
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

/**
 * Resolve the current session on app load.
 * Prefers GET /auth/me. If the backend has not implemented it (404/405),
 * probe auth by listing workspaces (401 ⇒ signed out, 200 ⇒ signed in).
 */
async function fetchCurrentUser(): Promise<User | null> {
  try {
    return await api.me()
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 401) return null
      if (error.status === 404 || error.status === 405) {
        try {
          await api.listWorkspaces()
          return null
        } catch (probeError) {
          if (probeError instanceof ApiError && probeError.status === 401) return null
          throw probeError
        }
      }
    }
    throw error
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [user, setUser] = useState<User | null>(null)
  const [status, setStatus] = useState<AuthStatus>('loading')

  useEffect(() => {
    let cancelled = false
    fetchCurrentUser()
      .then((current) => {
        if (cancelled) return
        setUser(current)
        setStatus(current ? 'authenticated' : 'unauthenticated')
      })
      .catch(() => {
        if (!cancelled) setStatus('unauthenticated')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      async login(email, password) {
        const next = await api.login({ email, password })
        setUser(next)
        setStatus('authenticated')
        await queryClient.invalidateQueries()
      },
      async register(email, password) {
        const next = await api.register({ email, password })
        setUser(next)
        setStatus('authenticated')
        await queryClient.invalidateQueries()
      },
      async logout() {
        try {
          await api.logout()
        } finally {
          setUser(null)
          setStatus('unauthenticated')
          queryClient.clear()
        }
      },
    }),
    [user, status, queryClient],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
