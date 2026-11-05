import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { getAccountDestination, type AccountDestination } from '../lib/data-services'
import { ErrorState, LoadingState, StatePage } from './StatePage'

export default function Dashboard() {
  const [destination, setDestination] = useState<AccountDestination | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const resolveDestination = async () => {
    setRefreshing(true)
    setError(null)
    try {
      setDestination(await getAccountDestination())
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : 'Unable to resolve your workspace.')
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    let active = true
    getAccountDestination()
      .then((result) => active && setDestination(result))
      .catch((reason: unknown) => active && setError(reason instanceof Error ? reason.message : 'Unable to resolve your workspace.'))
      .finally(() => active && setRefreshing(false))
    return () => { active = false }
  }, [])

  if (error) {
    return <ErrorState title="Workspace unavailable" message={error} action={{ label: 'Sign out and try again', to: '/login' }} />
  }
  if (!destination) return <LoadingState message="Finding your FairPrice workspace…" />
  if (destination.kind === 'application') {
    const status = destination.application.status
    const message = status === 'REJECTED'
      ? destination.application.decision_reason ?? 'Your application was not approved.'
      : status === 'MORE_INFORMATION_REQUIRED'
        ? destination.application.decision_reason ?? 'The platform team needs more information.'
        : status === 'APPROVED'
          ? 'Your tenant is being provisioned. Please refresh shortly.'
          : 'Your restaurant application is awaiting platform approval.'
    return <StatePage title={status === 'REJECTED' ? 'Application not approved' : 'Application status'} message={message} action={{ label: refreshing ? 'Checking status…' : 'Refresh status', to: '/dashboard', onClick: resolveDestination }} />
  }
  if (destination.kind === 'empty') {
    return <StatePage title="No workspace yet" message="Your account is ready, but it is not linked to a restaurant workspace or application." action={{ label: 'Register your restaurant', to: '/register' }} />
  }
  return <Navigate to={destination.path} replace />
}
