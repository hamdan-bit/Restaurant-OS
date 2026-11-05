import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

/**
 * Wraps routes that require authentication.
 * Redirects to /login if the user is not signed in.
 * Shows nothing while the auth state is loading to avoid flash.
 */
export default function ProtectedRoute() {
  const { user, loading } = useAuth()

  if (loading) {
    return <div className="auth-loading"><p>Loading your workspace…</p></div>
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
