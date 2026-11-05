import { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { canAccessWorkspace, type WorkspaceRole } from '../lib/data-services'
import { ErrorState, LoadingState } from '../pages/StatePage'

export default function WorkspaceAccessRoute({ role }: { role: WorkspaceRole }) {
  const [allowed, setAllowed] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    canAccessWorkspace(role)
      .then((result) => active && setAllowed(result))
      .catch((reason: unknown) => active && setError(reason instanceof Error ? reason.message : 'Unable to verify workspace permissions.'))
    return () => { active = false }
  }, [role])

  if (error) return <ErrorState title="Access check failed" message={error} />
  if (allowed === null) return <LoadingState message="Checking workspace permissions…" />
  if (!allowed) return <Navigate to="/permission-denied" replace />
  return <Outlet />
}
