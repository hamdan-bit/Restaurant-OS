import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function PublicOnlyRoute() {
  const { user, loading } = useAuth()

  if (loading) {
    return <div className="auth-loading"><p>Loading…</p></div>
  }

  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
