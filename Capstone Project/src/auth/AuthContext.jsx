/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { authApi, session } from '../services/api.js'

// Mirrors server/auth.js PERMISSIONS so the UI hides what the API would refuse.
const WRITE = {
  admin: '*',
  organizer: ['events', 'registrations', 'attendance', 'feedback'],
  student: [],
}

const AuthCtx = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(!session.token)

  useEffect(() => {
    if (!session.token) return
    authApi.me().then(setUser).catch(() => session.clear()).finally(() => setReady(true))
  }, [])

  useEffect(() => {
    const onExpired = () => { session.clear(); setUser(null) }
    window.addEventListener('auth:expired', onExpired)
    return () => window.removeEventListener('auth:expired', onExpired)
  }, [])

  const login = useCallback(async (email, password, remember = true) => {
    const { token, user: u, passwordWeak } = await authApi.login(email, password, remember)
    session.set(token, remember)
    try { passwordWeak ? sessionStorage.setItem('cms-weak-pw', '1') : sessionStorage.removeItem('cms-weak-pw') } catch { /* ignore */ }
    setUser(u)
    return u
  }, [])

  const register = useCallback(async (name, email, password, remember = true) => {
    const { token, user: u } = await authApi.register(name, email, password, remember)
    session.set(token, remember)
    setUser(u)
    return u
  }, [])

  const logout = useCallback(() => { authApi.logout(); session.clear(); setUser(null) }, [])

  const value = useMemo(() => ({
    user, ready, login, register, logout, setUser,
    can: (resource) => {
      const w = WRITE[user?.role]
      return w === '*' || (Array.isArray(w) && w.includes(resource))
    },
    is: (...roles) => roles.includes(user?.role),
  }), [user, ready, login, register, logout])

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}

export const useAuth = () => useContext(AuthCtx)

export const ROLE_META = {
  admin: { label: 'Administrator', tone: 'violet', desc: 'Full access to every module and user management' },
  organizer: { label: 'Organizer', tone: 'info', desc: 'Manage events, registrations, attendance and feedback' },
  student: { label: 'Student', tone: 'success', desc: 'Browse events, register, cancel and give feedback' },
}
