import { useState } from 'react'
import { UserCircle, Mail, ShieldCheck, KeyRound, Save, CheckCircle2, XCircle, Clock, CalendarPlus, LogOut, MonitorSmartphone } from 'lucide-react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { useAuth, ROLE_META } from '../auth/AuthContext.jsx'
import { authApi, session } from '../services/api.js'
import { PageHero, Avatar, Badge, Modal } from '../components/ui.jsx'
import { useToast } from '../components/Toaster.jsx'
import { passwordScore } from './Login.jsx'
import { timeAgo, formatDate } from '../utils/helpers.js'

const MODULES = ['events', 'categories', 'venues', 'organizers', 'students', 'registrations', 'attendance', 'feedback']

export default function Profile() {
  const { user, setUser, can, logout } = useAuth()
  const navigate = useNavigate()
  const role = ROLE_META[user.role]
  const [name, setName] = useState(user.name)
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(null)
  const toast = useToast()
  const outlet = useOutletContext()
  const [confirmAll, setConfirmAll] = useState(false)

  async function saveName(e) {
    e.preventDefault()
    if (name.trim().length < 3) { setErrors({ name: 'Name must be at least 3 characters' }); return }
    setBusy('name')
    try { setUser(await authApi.updateProfile(name.trim())); toast('Profile updated') }
    catch (err) { setErrors(err.fields || {}); toast(err.message, 'error') }
    setBusy(null)
  }
  async function savePw(e) {
    e.preventDefault()
    const errs = {}
    if (!pw.current) errs.current = 'Enter your current password'
    if (pw.next.length < 8 || !/[A-Za-z]/.test(pw.next) || !/\d/.test(pw.next)) errs.next = 'Use at least 8 characters with letters and numbers'
    else if (pw.next === pw.current) errs.next = 'Choose a password different from the current one'
    if (pw.next !== pw.confirm) errs.confirm = 'Passwords do not match'
    setErrors(errs)
    if (Object.keys(errs).length) return
    setBusy('pw')
    try {
      const r = await authApi.changePassword(pw.current, pw.next)
      const persistent = (() => { try { return Boolean(localStorage.getItem('cms-token')) } catch { return true } })()
      if (r?.token) session.set(r.token, persistent)
      try { sessionStorage.removeItem('cms-weak-pw') } catch { /* ignore */ }
      outlet?.clearWeakPw?.()
      setPw({ current: '', next: '', confirm: '' })
      toast('Password changed. Other devices have been signed out.')
    }
    catch (err) { setErrors(err.fields || {}); toast(err.message, 'error') }
    setBusy(null)
  }

  const studentWrites = user.role === 'student'
  return (
    <>
      <PageHero icon={UserCircle} tone="indigo" title="My profile" subtitle="Your account, permissions and security settings." />
      <div className="profile-grid">
        <div className="card profile-card">
          <div className="profile-banner" />
          <Avatar name={user.name} size={86} />
          <h2>{user.name}</h2>
          <div className="td-muted"><Mail size={13} style={{ verticalAlign: -2 }} /> {user.email}</div>
          <Badge tone={role.tone}>{role.label}</Badge>
          <div className="profile-facts">
            <div><Clock size={14} /> Last sign-in <b>{user.lastLogin ? timeAgo(user.lastLogin) : 'now'}</b></div>
            <div><CalendarPlus size={14} /> Member since <b>{user.createdAt ? formatDate(String(user.createdAt).slice(0, 10)) : '—'}</b></div>
          </div>
          <button className="btn btn-ghost" onClick={() => { logout(); navigate('/login') }}><LogOut /> Sign out</button>
        </div>

        <div className="profile-forms">
          <form className="card card-body" onSubmit={saveName}>
            <h3 className="form-title"><UserCircle size={17} /> Personal details</h3>
            <div className={`field ${errors.name ? 'invalid' : ''}`}>
              <label htmlFor="pname">Display name</label>
              <input id="pname" value={name} onChange={(e) => { setName(e.target.value); setErrors({}) }} />
              {errors.name && <div className="field-error">{errors.name}</div>}
            </div>
            <div className="field"><label>Email</label><input value={user.email} disabled /></div>
            <button className="btn btn-primary" disabled={busy === 'name' || name === user.name}>{busy === 'name' ? <span className="btn-spinner" /> : <Save />} Save</button>
          </form>

          <form className="card card-body" onSubmit={savePw}>
            <h3 className="form-title"><KeyRound size={17} /> Change password</h3>
            {[['current', 'Current password'], ['next', 'New password'], ['confirm', 'Confirm new password']].map(([k, l]) => (
              <div key={k} className={`field ${errors[k] ? 'invalid' : ''}`}>
                <label htmlFor={`pw-${k}`}>{l}</label>
                <input id={`pw-${k}`} type="password" value={pw[k]} onChange={(e) => { setPw((p) => ({ ...p, [k]: e.target.value })); setErrors({}) }} autoComplete={k === 'current' ? 'current-password' : 'new-password'} />
                {errors[k] && <div className="field-error">{errors[k]}</div>}
              </div>
            ))}
            {pw.next && (
              <div className="pw-strength" data-s={passwordScore(pw.next)}>
                {[0, 1, 2, 3].map((i) => <span key={i} />)}
                <em>{['Too weak', 'Weak', 'Fair', 'Good', 'Strong'][passwordScore(pw.next)]}</em>
              </div>
            )}
            <p className="td-muted" style={{ margin: 0 }}>At least 8 characters, including letters and numbers. Changing it signs out your other sessions.</p>
            <button className="btn btn-primary" disabled={busy === 'pw'}>{busy === 'pw' ? <span className="btn-spinner" /> : <KeyRound />} Update password</button>
          </form>

          <div className="card card-body">
            <h3 className="form-title"><MonitorSmartphone size={17} /> Sessions</h3>
            <p className="td-muted" style={{ marginTop: -6 }}>Signed in on a shared or lost device? End every session, including this one.</p>
            <button className="btn btn-danger-soft" onClick={() => setConfirmAll(true)}><LogOut /> Sign out of all devices</button>
          </div>

          <div className="card card-body">
            <h3 className="form-title"><ShieldCheck size={17} /> What you can do</h3>
            <p className="td-muted" style={{ marginTop: -6 }}>{role.desc}</p>
            <div className="perm-grid">
              {MODULES.map((m, i) => {
                const ok = can(m) || (studentWrites && (m === 'registrations' || m === 'feedback'))
                return (
                  <div key={m} className={`perm ${ok ? 'ok' : ''}`} style={{ '--i': i }}>
                    {ok ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
                    <span>{m[0].toUpperCase() + m.slice(1)}</span>
                    <em>{ok ? (studentWrites ? 'own only' : 'manage') : 'view'}</em>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
      {confirmAll && (
        <Modal title="Sign out everywhere?" width={420} onClose={() => setConfirmAll(false)}
          footer={<><button className="btn btn-ghost" onClick={() => setConfirmAll(false)}>Cancel</button>
            <button className="btn btn-danger" onClick={async () => { await authApi.logoutAll(); logout(); navigate('/login') }}><LogOut /> Sign out all</button></>}>
          <p style={{ margin: 0, color: 'var(--text-2)', lineHeight: 1.6 }}>Every browser and device currently signed in to your account will need to sign in again.</p>
        </Modal>
      )}
    </>
  )
}
