import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import PublicOnlyRoute from './components/PublicOnlyRoute'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import {
  NotFoundPage,
  PermissionDeniedPage,
  SessionExpiredPage,
  StatePage,
  WorkspacePlaceholder,
} from './pages/StatePage'
import { PublicOrderingRoutes } from './pages/PublicOrdering'
import OwnerOverview from './pages/OwnerOverview'
import ManagerOverview from './pages/ManagerOverview'
import PlatformConsole from './pages/PlatformConsole'
import WorkspaceAccessRoute from './components/WorkspaceAccessRoute'
import './index.css'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/r/:restaurantSlug/*" element={<PublicOrderingRoutes />} />
          <Route element={<PublicOnlyRoute />}>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route
              path="/application-status"
              element={
                <StatePage
                  title="Application status"
                  message="Your registration application is being reviewed."
                  action={{ label: 'Refresh status', to: '/dashboard' }}
                />
              }
            />
            <Route element={<WorkspaceAccessRoute role="owner" />}>
              <Route path="/owner" element={<OwnerOverview />} />
              <Route path="/owner/*" element={<WorkspacePlaceholder />} />
            </Route>
            <Route element={<WorkspaceAccessRoute role="manager" />}>
              <Route path="/manager" element={<ManagerOverview />} />
              <Route path="/manager/*" element={<WorkspacePlaceholder role="manager" />} />
            </Route>
            <Route element={<WorkspaceAccessRoute role="platform" />}>
              <Route path="/platform" element={<PlatformConsole />} />
              <Route path="/platform/*" element={<WorkspacePlaceholder role="platform" />} />
            </Route>
            <Route
              path="/restricted"
              element={
                <StatePage
                  title="Account access is restricted"
                  message="Normal restaurant operations are currently unavailable. You can still review permitted account and support options."
                />
              }
            />
            <Route
              path="/not-live"
              element={
                <StatePage
                  title="Restaurant is not live yet"
                  message="Your owner is still completing setup. Operations will become available when the restaurant is activated."
                  role="manager"
                />
              }
            />
            <Route path="/permission-denied" element={<PermissionDeniedPage />} />
            <Route
              path="/maintenance"
              element={
                <StatePage
                  title="Temporarily unavailable"
                  message="FairPrice is undergoing maintenance. Please try again shortly."
                />
              }
            />
            <Route path="/session-expired" element={<SessionExpiredPage />} />
          </Route>

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
