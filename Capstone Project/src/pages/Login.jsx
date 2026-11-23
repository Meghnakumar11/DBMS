import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import {
  Mail, MapPin, Lock, User, Eye, EyeOff, ArrowRight, AlertCircle, CheckCircle2,
  ShieldCheck, CalendarCheck, BarChart3, Users, ArrowUp,
} from 'lucide-react'
import { useAuth } from '../auth/AuthContext.jsx'
import { Crest } from '../components/ui.jsx'
import { BRAND } from '../brand.js'
import logo from '../assets/krmu-logo.png'

const FEATURES = [
  { icon: CalendarCheck, title: 'Event lifecycle', text: 'Plan, schedule and track every campus event in one place.' },
  { icon: Users, title: 'Participation', text: 'Registrations, waitlists and live attendance check-in.' },
  { icon: BarChart3, title: 'Insights', text: 'Attendance rates, ratings and trends at a glance.' },
  { icon: ShieldCheck, title: 'Role-based access', text: 'Admins, organizers and students see only what they should.' },
]

export function passwordScore(p = '') {
  return [/.{8,}/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(p)).length
}

export default function Login() {
  const { user, login, register } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [remember, setRemember] = useState(true)
  const [errors, setErrors] = useState({})
  const [show, setShow] = useState(false)
  const [caps, setCaps] = useState(false)
  const [busy, setBusy] = useState(false)
  const [shake, setShake] = useState(false)
  const [done, setDone] = useState(false)

  if (user && !done) return <Navigate to={location.state?.from || '/'} replace />

  const set = (k) => (e) => { setForm((f) => ({ ...f, [k]: e.target.value })); setErrors((er) => ({ ...er, [k]: undefined, _form: undefined })) }
  const switchMode = (m) => { setMode(m); setErrors({}); setForm((f) => ({ ...f, password: '' })) }

  function localCheck(f) {
    const e = {}
    if (mode === 'register' && f.name.trim().length < 3) e.name = 'Enter your full name'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email.trim())) e.email = 'Enter a valid email address'
    if (!f.password) e.password = 'Password is required'
    else if (mode === 'register' && (f.password.length < 8 || !/[A-Za-z]/.test(f.password) || !/\d/.test(f.password)))
      e.password = 'Use at least 8 characters with letters and numbers'
    return e
  }

  async function submit(e) {
    e.preventDefault()
    const errs = localCheck(form)
    setErrors(errs)
    if (Object.keys(errs).length) { setShake(true); setTimeout(() => setShake(false), 420); return }
    setBusy(true)
    try {
      if (mode === 'register') await register(form.name.trim(), form.email.trim(), form.password, remember)
      else await login(form.email.trim(), form.password, remember)
      setDone(true)
      setTimeout(() => navigate(location.state?.from || '/', { replace: true }), 450)
    } catch (err) {
      setErrors({ ...(err.fields || {}), _form: err.message, _locked: err.status === 429 })
      setShake(true); setTimeout(() => setShake(false), 420)
      setBusy(false)
    }
  }

  const onPwKey = (e) => setCaps(e.getModifierState?.('CapsLock'))
  const score = passwordScore(form.password)

  return (
    <div className={`auth ${done ? 'auth-done' : ''}`}>
      <aside className="auth-showcase">
        <div className="auth-grid" aria-hidden="true" />
        <img className="auth-watermark" src={logo} alt="" aria-hidden="true" />
        <div className="auth-brand">
          <Crest size={64} />
          <div>
            <div className="auth-brand-name">{BRAND.university}</div>
            <div className="auth-brand-sub">{BRAND.portal}</div>
          </div>
        </div>
        <div className="auth-pitch">
          <span className="auth-kicker">Office of Student Affairs · Event Cell</span>
          <h2>{BRAND.tagline.replace('comes together.', '')}<em>comes together.</em></h2>
          <p>Manage students, venues, organizers, registrations, attendance and feedback, backed by a secure MongoDB database.</p>
          <ul className="auth-features">
            {FEATURES.map((f, i) => (
              <li key={f.title} style={{ '--i': i }}>
                <div className="auth-feature-icon"><f.icon size={17} /></div>
                <div><b>{f.title}</b><span>{f.text}</span></div>
              </li>
            ))}
          </ul>
        </div>
        <div className="auth-foot-note">
          <span><MapPin size={14} /> {BRAND.location}</span>
          <span><ShieldCheck size={14} /> Secured sign-in · encrypted passwords</span>
        </div>
      </aside>

      <main className="auth-panel">
        <div className={`auth-card ${shake ? 'shake' : ''}`}>
          <div className="auth-mobile-brand"><Crest size={48} /> <div><b>{BRAND.university}</b><span>{BRAND.portal}</span></div></div>
          <div className="auth-card-crest"><Crest size={84} /></div>
          <h1 key={mode}>{mode === 'login' ? 'Sign in' : 'Create a student account'}</h1>
          <p className="auth-sub">{mode === 'login' ? `Welcome to the ${BRAND.university} ${BRAND.portal}. Use your university email and password.` : 'Available for students whose university email is on record.'}</p>

          <div className="auth-tabs" data-mode={mode}>
            <span className="auth-tab-pill" />
            <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => switchMode('login')}>Sign in</button>
            <button type="button" className={mode === 'register' ? 'active' : ''} onClick={() => switchMode('register')}>Student sign-up</button>
          </div>

          {errors._form && (
            <div className={`form-alert ${errors._locked ? 'locked' : ''}`}><AlertCircle /> <span>{errors._form}</span></div>
          )}

          <form onSubmit={submit} noValidate className="auth-form">
            {mode === 'register' && (
              <Field icon={User} label="Full name" error={errors.name} id="name">
                <input id="name" value={form.name} onChange={set('name')} placeholder="As on your college ID" autoComplete="name" />
              </Field>
            )}
            <Field icon={Mail} label="Email address" error={errors.email} id="email">
              <input id="email" type="email" value={form.email} onChange={set('email')} placeholder="name@college.edu" autoComplete="username" autoFocus />
            </Field>
            <Field icon={Lock} label="Password" error={errors.password} id="password"
              extra={<button type="button" className="pw-toggle" onClick={() => setShow((v) => !v)} aria-label={show ? 'Hide password' : 'Show password'}>{show ? <EyeOff size={16} /> : <Eye size={16} />}</button>}>
              <input id="password" type={show ? 'text' : 'password'} value={form.password} onChange={set('password')} onKeyUp={onPwKey} onKeyDown={onPwKey}
                placeholder={mode === 'login' ? 'Enter your password' : 'At least 8 characters'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
            </Field>
            {caps && <div className="caps-warn"><ArrowUp size={13} /> Caps Lock is on</div>}
            {mode === 'register' && form.password && (
              <div className="pw-strength" data-s={score}>
                {[0, 1, 2, 3].map((i) => <span key={i} />)}
                <em>{['Too weak', 'Weak', 'Fair', 'Good', 'Strong'][score]}</em>
              </div>
            )}

            <div className="auth-row">
              <label className="check-label">
                <input type="checkbox" className="cb" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                Keep me signed in
              </label>
              {mode === 'login' && <span className="auth-help" title="Ask your system administrator to reset it from Users & Roles">Forgot password?</span>}
            </div>

            <button type="submit" className={`btn btn-primary auth-submit ${done ? 'ok' : ''}`} disabled={busy}>
              {done ? <><CheckCircle2 /> Signed in</> : busy ? <><span className="btn-spinner" /> {mode === 'login' ? 'Signing in…' : 'Creating account…'}</> : <>{mode === 'login' ? 'Sign in' : 'Create account'} <ArrowRight /></>}
            </button>
          </form>

          <p className="auth-foot">
            {mode === 'login'
              ? <>Student without an account? <button className="link-btn" onClick={() => switchMode('register')}>Sign up</button></>
              : <>Already have an account? <button className="link-btn" onClick={() => switchMode('login')}>Sign in</button></>}
          </p>
          <p className="auth-legal">© {new Date().getFullYear()} {BRAND.university} · Authorised users only. Activity is logged.</p>
        </div>
      </main>
    </div>
  )
}

function Field({ icon: Icon, label, error, extra, id, children }) {
  return (
    <div className={`auth-field ${error ? 'invalid' : ''}`}>
      <label htmlFor={id}>{label}</label>
      <div className="auth-input">
        <Icon size={16} className="auth-input-icon" />
        {children}
        {extra}
      </div>
      {error && <div className="field-error"><AlertCircle /> {error}</div>}
    </div>
  )
}
