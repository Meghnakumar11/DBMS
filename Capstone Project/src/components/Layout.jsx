import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate, Link } from 'react-router-dom'
import {
  LayoutDashboard, Users, CalendarDays, Tags, MapPin, UserCog, ClipboardList, CheckSquare,
  MessageSquareText, Bell, Database, Menu as MenuIcon, X, Sun, Moon, Search, LogOut,
  UserCircle, ShieldCheck, Compass, ChevronDown, Plus, Pencil, Trash2, Settings as SettingsIcon,
  PanelLeftClose, PanelLeftOpen, Keyboard, History, CheckCheck, KeyRound, ChevronRight,
} from 'lucide-react'
import { isMock, authApi } from '../services/api.js'
import { useAuth, ROLE_META } from '../auth/AuthContext.jsx'
import { useSettings } from '../settings/Settings.jsx'
import { Avatar, Modal, useDismiss, Crest } from './ui.jsx'
import { BRAND } from '../brand.js'
import { timeAgo, firstName } from '../utils/helpers.js'
import { describeActivity } from '../utils/activity.jsx'
import CommandPalette from './CommandPalette.jsx'

const TODAY = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
const STAFF = ['admin', 'organizer']

const NAV = [
  { section: 'Overview' },
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true, roles: STAFF, key: 'd' },
  { to: '/', label: 'My Portal', icon: Compass, end: true, roles: ['student'], key: 'd' },
  { section: 'Events' },
  { to: '/events', label: 'Events', icon: CalendarDays, key: 'e' },
  { to: '/categories', label: 'Categories', icon: Tags, key: 'c' },
  { to: '/venues', label: 'Venues', icon: MapPin, key: 'v' },
  { to: '/organizers', label: 'Organizers', icon: UserCog, key: 'o' },
  { section: 'Participation', roles: STAFF },
  { to: '/students', label: 'Students', icon: Users, roles: STAFF, key: 's' },
  { to: '/registrations', label: 'Registrations', icon: ClipboardList, roles: STAFF, key: 'r' },
  { to: '/attendance', label: 'Attendance', icon: CheckSquare, roles: STAFF, key: 'a' },
  { to: '/feedback', label: 'Feedback', icon: MessageSquareText, roles: STAFF, key: 'f' },
  { section: 'Administration', roles: ['admin'] },
  { to: '/users', label: 'Users & Roles', icon: ShieldCheck, roles: ['admin'], key: 'u' },
  { to: '/audit', label: 'Audit log', icon: History, roles: ['admin'], key: 'l' },
]
const EXTRA_TITLES = { '/profile': 'My profile', '/settings': 'Settings' }
const ACTION_ICON = { created: Plus, updated: Pencil, deleted: Trash2 }

function readSeen() { try { return localStorage.getItem('cms-seen') || '' } catch { return '' } }

export default function Layout() {
  const { pathname, search } = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { prefs, set, resolvedTheme } = useSettings()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [menu, setMenu] = useState(null) // 'user' | 'bell'
  const [palette, setPalette] = useState(false)
  const [shortcuts, setShortcuts] = useState(false)
  const [feed, setFeed] = useState([])
  const [seen, setSeen] = useState(readSeen)
  const [apiState, setApiState] = useState(isMock ? 'mock' : 'checking')
  const [progress, setProgress] = useState(0)
  const [weakPw, setWeakPw] = useState(() => { try { return sessionStorage.getItem('cms-weak-pw') === '1' } catch { return false } })
  const bellRef = useRef(null)
  const userRef = useRef(null)
  const gPressed = useRef(0)

  const collapsed = prefs.sidebar === 'collapsed'
  const nav = NAV.filter((n) => !n.roles || n.roles.includes(user.role))
  const links = nav.filter((n) => n.to)
  const current = links.find((n) => (n.end ? pathname === n.to : pathname.startsWith(n.to)))
  const title = current?.label || EXTRA_TITLES[pathname] || 'Dashboard'
  const section = (() => { let s = null; for (const n of nav) { if (n.section) s = n.section; if (n === current) return s } return null })()

  useDismiss(menu === 'bell', () => setMenu(null), bellRef)
  useDismiss(menu === 'user', () => setMenu(null), userRef)

  // close drawers + run the top progress bar on every navigation
  useEffect(() => {
    setMobileOpen(false)
    setMenu(null)
    setProgress(15)
    const a = setTimeout(() => setProgress(70), 60)
    const b = setTimeout(() => setProgress(100), 380)
    const c = setTimeout(() => setProgress(0), 650)
    return () => { clearTimeout(a); clearTimeout(b); clearTimeout(c) }
  }, [pathname])

  // backend health + activity feed
  useEffect(() => {
    if (isMock) return
    let alive = true
    const tick = () => {
      fetch(`${import.meta.env.VITE_API_URL || '/api'}/health`)
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((h) => alive && setApiState({ live: true, info: `${h.mongodb} · ${h.database}` }))
        .catch(() => alive && setApiState('down'))
      authApi.activity(25).then((rows) => alive && setFeed(rows)).catch(() => {})
    }
    tick()
    const t = setInterval(tick, 20000)
    return () => { alive = false; clearInterval(t) }
  }, [pathname])

  // global shortcuts: ⌘K palette, ? help, g + letter navigation
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette((p) => !p); return }
      if ((e.metaKey || e.ctrlKey) && e.key === '\\') { e.preventDefault(); set({ sidebar: collapsed ? 'expanded' : 'collapsed' }); return }
      const tag = document.activeElement?.tagName
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag) || e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === '?') { setShortcuts(true); return }
      if (e.key === 'g') { gPressed.current = Date.now(); return }
      if (Date.now() - gPressed.current < 900) {
        const target = links.find((l) => l.key === e.key.toLowerCase())
        if (target) { navigate(target.to); gPressed.current = 0 }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [links, navigate, collapsed, set])

  const mine = (a) => a.userId === user.id
  const unread = feed.filter((a) => a.createdAt > seen && !mine(a)).length
  const markAllRead = () => {
    const latest = feed[0]?.createdAt || new Date().toISOString()
    setSeen(latest)
    try { localStorage.setItem('cms-seen', latest) } catch { /* ignore */ }
  }
  const role = ROLE_META[user.role]
  const toggleTheme = () => set({ theme: resolvedTheme === 'dark' ? 'light' : 'dark' })
  const signOut = () => { logout(); navigate('/login') }

  return (
    <div className={`shell ${collapsed ? 'is-collapsed' : ''}`}>
      <div className="route-progress" style={{ width: `${progress}%`, opacity: progress ? 1 : 0 }} />
      {mobileOpen && <div className="sidebar-backdrop" onClick={() => setMobileOpen(false)} />}

      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="brand">
          <Crest size={34} />
          <div className="brand-text">
            <div className="brand-name">K.R. Mangalam</div>
            <div className="brand-sub">University · {BRAND.product}</div>
          </div>
          <button className="sidebar-close" onClick={() => setMobileOpen(false)} aria-label="Close menu"><X size={18} /></button>
        </div>

        <button className="sidebar-search" onClick={() => setPalette(true)} title="Search (⌘K)">
          <Search size={15} /> <span>Search</span> <kbd>⌘K</kbd>
        </button>

        <nav>
          {nav.map((item, i) =>
            item.section ? (
              <div key={item.section} className="nav-section" style={{ '--i': i }}>{item.section}</div>
            ) : (
              <NavLink key={item.label} to={item.to} end={item.end} className="nav-link" style={{ '--i': i }} title={collapsed ? item.label : undefined}>
                <item.icon />
                <span className="nav-label">{item.label}</span>
              </NavLink>
            ),
          )}
        </nav>

        <div className="sidebar-bottom">
          <NavLink to="/settings" className="nav-link" title={collapsed ? 'Settings' : undefined}><SettingsIcon /><span className="nav-label">Settings</span></NavLink>
          <button className="nav-link collapse-btn" onClick={() => set({ sidebar: collapsed ? 'expanded' : 'collapsed' })} title={collapsed ? 'Expand sidebar (⌘\\)' : 'Collapse sidebar (⌘\\)'}>
            {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}<span className="nav-label">Collapse</span>
          </button>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="topbar-left">
            <button className="icon-btn menu-btn" onClick={() => setMobileOpen(true)} aria-label="Open menu"><MenuIcon size={18} /></button>
            <div className="crumbs" key={pathname}>
              {section && <><span className="crumb-section">{section}</span><ChevronRight size={14} className="crumb-sep" /></>}
              <span className="topbar-title">{title}</span>
            </div>
            <span className="topbar-date">{TODAY}</span>
          </div>
          <div className="topbar-right">
            <button className="topbar-search" onClick={() => setPalette(true)}>
              <Search size={15} /> <span>Search…</span> <kbd>⌘K</kbd>
            </button>
            {apiState === 'mock' ? (
              <span className="status-pill warn" title="Serving data from src/data/mockData.js"><Database size={12} /> Mock data</span>
            ) : apiState === 'down' ? (
              <span className="status-pill bad" title="The API is not reachable"><span className="live-dot" /> Offline</span>
            ) : apiState === 'checking' ? (
              <span className="status-pill"><span className="live-dot" /> Connecting</span>
            ) : (
              <span className="status-pill ok" title={`Connected · ${apiState.info}`}><span className="live-dot" /> <span className="hide-sm">Connected</span></span>
            )}
            <button className="icon-btn" onClick={toggleTheme} aria-label="Toggle theme" title="Toggle light / dark">
              {resolvedTheme === 'dark' ? <Sun size={17} className="theme-icon" key="sun" /> : <Moon size={17} className="theme-icon" key="moon" />}
            </button>

            <div className="dropdown-anchor" ref={bellRef}>
              <button className={`icon-btn ${menu === 'bell' ? 'on' : ''}`} aria-label="Notifications" onClick={() => setMenu((m) => (m === 'bell' ? null : 'bell'))}>
                <Bell size={17} />
                {unread > 0 && <span className="count-dot">{unread > 9 ? '9+' : unread}</span>}
              </button>
              {menu === 'bell' && (
                <div className="dropdown dropdown-feed">
                  <div className="dropdown-head">
                    <b>Notifications</b>
                    {unread > 0 ? <button className="link-btn" onClick={markAllRead}><CheckCheck size={14} /> Mark all as read</button> : <span className="td-muted">All caught up</span>}
                  </div>
                  <div className="feed-list">
                    {feed.length === 0 && <div className="empty" style={{ padding: 28 }}>No activity yet</div>}
                    {feed.slice(0, 12).map((a, i) => {
                      const Icon = ACTION_ICON[a.action] || Bell
                      const isNew = a.createdAt > seen && !mine(a)
                      return (
                        <div key={a.id} className={`feed-item act-${a.action} ${isNew ? 'unread' : ''}`} style={{ '--i': i }}>
                          <div className="feed-icon"><Icon size={13} /></div>
                          <div className="feed-text"><div>{describeActivity(a)}</div><span>{timeAgo(a.createdAt)}</span></div>
                        </div>
                      )
                    })}
                  </div>
                  {user.role === 'admin' && <Link to="/audit" className="dropdown-foot">Open full audit log <ChevronRight size={14} /></Link>}
                </div>
              )}
            </div>

            <div className="dropdown-anchor" ref={userRef}>
              <button className={`user-btn ${menu === 'user' ? 'on' : ''}`} onClick={() => setMenu((m) => (m === 'user' ? null : 'user'))} aria-label="Account menu">
                <Avatar name={user.name} size={28} />
                <span className="user-btn-name">{firstName(user.name)}</span>
                <ChevronDown size={14} className="chev" />
              </button>
              {menu === 'user' && (
                <div className="dropdown dropdown-user">
                  <div className="dropdown-profile">
                    <Avatar name={user.name} size={40} />
                    <div style={{ minWidth: 0 }}>
                      <b>{user.name}</b>
                      <span>{user.email}</span>
                      <span className={`badge badge-${role.tone}`} style={{ marginTop: 6 }}>{role.label}</span>
                    </div>
                  </div>
                  <button className="dropdown-item" onClick={() => navigate('/profile')}><UserCircle size={16} /> My profile</button>
                  <button className="dropdown-item" onClick={() => navigate('/settings')}><SettingsIcon size={16} /> Settings</button>
                  {user.role === 'admin' && <button className="dropdown-item" onClick={() => navigate('/users')}><ShieldCheck size={16} /> Users &amp; roles</button>}
                  <button className="dropdown-item" onClick={() => { setMenu(null); setShortcuts(true) }}><Keyboard size={16} /> Keyboard shortcuts <kbd>?</kbd></button>
                  <div className="dropdown-sep" />
                  <button className="dropdown-item danger" onClick={signOut}><LogOut size={16} /> Sign out</button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="content">
          {weakPw && pathname !== '/profile' && (
            <div className="banner warn">
              <KeyRound size={16} />
              <span>Your password doesn’t meet the security policy (8+ characters, letters and numbers). Please update it.</span>
              <button className="btn btn-sm btn-primary" onClick={() => navigate('/profile')}>Change password</button>
              <button className="btn-icon" onClick={() => { setWeakPw(false); try { sessionStorage.removeItem('cms-weak-pw') } catch { /* ignore */ } }} aria-label="Dismiss"><X size={15} /></button>
            </div>
          )}
          {apiState === 'down' && (
            <div className="banner bad"><Database size={16} /> <span>Cannot reach the server. Start it with <code>npm run dev</code>, and data will reload automatically.</span></div>
          )}
          <div className="page-anim" key={pathname + search}>
            <Outlet context={{ clearWeakPw: () => setWeakPw(false) }} />
          </div>
          <footer className="app-footer">
            <span><Crest size={16} /> © {new Date().getFullYear()} {BRAND.university}</span>
            <span>{BRAND.portal} · {BRAND.location}</span>
            <span className="app-footer-keys">Press <kbd>?</kbd> for shortcuts</span>
          </footer>
        </main>
      </div>

      {palette && <CommandPalette onClose={() => setPalette(false)} nav={links} extra={[
        { label: 'Settings', to: '/settings', icon: SettingsIcon },
        { label: 'My profile', to: '/profile', icon: UserCircle },
        { label: 'Toggle dark mode', icon: Moon, run: toggleTheme },
        { label: 'Keyboard shortcuts', icon: Keyboard, run: () => setShortcuts(true) },
        { label: 'Sign out', icon: LogOut, run: signOut },
      ]} />}
      {shortcuts && <ShortcutsDialog links={links} onClose={() => setShortcuts(false)} />}
    </div>
  )
}

function ShortcutsDialog({ links, onClose }) {
  const groups = [
    { title: 'General', items: [['⌘ K', 'Open search & commands'], ['?', 'Show this help'], ['⌘ \\', 'Collapse / expand sidebar'], ['Esc', 'Close dialogs and menus']] },
    { title: 'Lists', items: [['/', 'Focus search'], ['N', 'Create a new record'], ['Ctrl Enter', 'Save the open form']] },
    { title: 'Go to', items: links.filter((l) => l.key).map((l) => [`G ${l.key.toUpperCase()}`, l.label]) },
  ]
  return (
    <Modal title="Keyboard shortcuts" width={620} onClose={onClose}>
      <div className="shortcut-grid">
        {groups.map((g) => (
          <div key={g.title}>
            <div className="section-title" style={{ marginTop: 0 }}>{g.title}</div>
            {g.items.map(([k, d]) => (
              <div className="shortcut" key={d}><span>{d}</span><span>{k.split(' ').map((x) => <kbd key={x}>{x}</kbd>)}</span></div>
            ))}
          </div>
        ))}
      </div>
    </Modal>
  )
}
