import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { AuthForm } from '../components/AuthForm'
import { useAuth } from '../context/AuthContext'
import { errorMessage } from '../lib/api'

export function LoginPage() {
  const { login, status } = useAuth()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (status === 'authenticated') return <Navigate to="/" replace />

  async function handleSubmit(values: { email: string; password: string }) {
    setBusy(true)
    setError(null)
    try {
      await login(values.email, values.password)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return <AuthForm mode="login" onSubmit={handleSubmit} busy={busy} error={error} />
}
