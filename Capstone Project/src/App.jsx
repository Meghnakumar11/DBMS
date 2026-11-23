import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import { useAuth } from './auth/AuthContext.jsx'
import { Crest } from './components/ui.jsx'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Portal from './pages/Portal.jsx'
import Students from './pages/Students.jsx'
import Events from './pages/Events.jsx'
import Categories from './pages/Categories.jsx'
import Venues from './pages/Venues.jsx'
import Organizers from './pages/Organizers.jsx'
import Registrations from './pages/Registrations.jsx'
import Attendance from './pages/Attendance.jsx'
import Feedback from './pages/Feedback.jsx'
import Users from './pages/Users.jsx'
import Profile from './pages/Profile.jsx'
import SettingsPage from './pages/SettingsPage.jsx'
import AuditLog from './pages/AuditLog.jsx'

function Splash() {
  return (
    <div className="splash">
      <Crest size={96} />
      <div className="splash-name">K.R. Mangalam University</div>
      <div className="spinner" />
    </div>
  )
}

function RequireAuth({ children }) {
  const { user, ready } = useAuth()
  const location = useLocation()
  if (!ready) return <Splash />
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return children
}

function Only({ roles, children }) {
  const { user } = useAuth()
  return roles.includes(user?.role) ? children : <Navigate to="/" replace />
}

export default function App() {
  const { user } = useAuth()
  const staff = ['admin', 'organizer']
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<RequireAuth><Layout /></RequireAuth>}>
        <Route path="/" element={user?.role === 'student' ? <Portal /> : <Dashboard />} />
        <Route path="/events" element={<Events />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/venues" element={<Venues />} />
        <Route path="/organizers" element={<Organizers />} />
        <Route path="/students" element={<Only roles={staff}><Students /></Only>} />
        <Route path="/registrations" element={<Only roles={staff}><Registrations /></Only>} />
        <Route path="/attendance" element={<Only roles={staff}><Attendance /></Only>} />
        <Route path="/feedback" element={<Only roles={staff}><Feedback /></Only>} />
        <Route path="/users" element={<Only roles={['admin']}><Users /></Only>} />
        <Route path="/audit" element={<Only roles={['admin']}><AuditLog /></Only>} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
