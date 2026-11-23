import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, CheckCircle2, XCircle, Info, Inbox, Cpu, Music, Trophy, Mic, HeartHandshake, Sparkles } from 'lucide-react'
import { initials, colorFor, statusTone } from '../utils/helpers.js'
import { useCountUp } from '../utils/motion.js'
import logoLarge from '../assets/krmu-logo.png'
import logoSmall from '../assets/krmu-logo-sm.png'

export function Badge({ children, tone }) {
  const t = tone || statusTone(children)
  return <span className={`badge badge-${t}`}>{children}</span>
}

export function StatCard({ icon: Icon, label, value, hint, index = 0, trend }) {
  const shown = useCountUp(value)
  return (
    <div className="card stat" style={{ '--i': index }}>
      <div className="stat-top">
        <span className="stat-label">{label}</span>
        <div className="stat-icon"><Icon /></div>
      </div>
      <div className="stat-value">{shown}</div>
      {(hint || trend) && <div className="stat-trend">{trend}{hint}</div>}
    </div>
  )
}

export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {children && <div className="page-actions">{children}</div>}
    </div>
  )
}

/** Page title block with optional icon, actions and a row of summary metrics. */
export function PageHero({ icon: Icon, title, subtitle, stats = [], children, eyebrow }) {
  return (
    <section className="hero">
      <div className="hero-pattern" aria-hidden="true" />
      <img className="hero-logo" src={logoLarge} alt="" aria-hidden="true" />
      <div className="hero-eyebrow">{eyebrow || 'K.R. Mangalam University · Campus Events'}</div>
      <div className="hero-main">
        {Icon && <div className="hero-icon"><Icon size={20} /></div>}
        <div className="hero-text">
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {children && <div className="hero-actions">{children}</div>}
      </div>
      {stats.length > 0 && (
        <div className="hero-stats">
          {stats.map((st, i) => <HeroStat key={st.label} {...st} index={i} />)}
        </div>
      )}
    </section>
  )
}
function HeroStat({ label, value, icon: Icon, index }) {
  const shown = useCountUp(value)
  return (
    <div className="hero-stat" style={{ '--i': index }}>
      <span className="hero-stat-label">{Icon && <Icon size={14} />}{label}</span>
      <b>{typeof value === 'number' || /^\d+(\.\d+)?$/.test(String(value)) ? shown : value}</b>
    </div>
  )
}

function useEscape(onClose) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
}

/** Closes when clicking outside `ref` or pressing Escape. */
export function useDismiss(open, onClose, ref) {
  useEffect(() => {
    if (!open) return
    const down = (e) => { if (!ref.current?.contains(e.target)) onClose() }
    const key = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('mousedown', down)
    window.addEventListener('keydown', key)
    return () => { document.removeEventListener('mousedown', down); window.removeEventListener('keydown', key) }
  }, [open, onClose, ref])
}

/** Small dropdown menu. Children are <MenuItem>s (or any nodes). */
export function Menu({ label, children, buttonClass = 'btn btn-ghost', align = 'right', title }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useDismiss(open, () => setOpen(false), ref)
  return (
    <div className="menu-anchor" ref={ref} onClick={(e) => e.stopPropagation()}>
      <button type="button" className={`${buttonClass} ${open ? 'on' : ''}`} onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open} title={title}>{label}</button>
      {open && (
        <div className={`menu menu-${align}`} role="menu" onClick={(e) => { if (!e.target.closest('[data-keep]')) setOpen(false) }}>
          {children}
        </div>
      )}
    </div>
  )
}
export function MenuItem({ icon: Icon, children, onClick, danger, disabled, keepOpen }) {
  return (
    <button type="button" role="menuitem" className={`menu-item ${danger ? 'danger' : ''}`} onClick={onClick} disabled={disabled} data-keep={keepOpen ? '' : undefined}>
      <span className="menu-icon">{Icon && <Icon size={15} />}</span>
      {children}
    </button>
  )
}

/**
 * Overlays are rendered into <body> through a portal. Page content is animated,
 * and an animated ancestor becomes the containing block for position:fixed –
 * which would push dialogs off-centre. The portal keeps them viewport-centred.
 */
let scrollLocks = 0
function useScrollLock() {
  useEffect(() => {
    if (scrollLocks++ === 0) {
      const gap = window.innerWidth - document.documentElement.clientWidth
      document.body.style.overflow = 'hidden'
      if (gap > 0) document.body.style.paddingRight = `${gap}px`
    }
    return () => {
      if (--scrollLocks === 0) { document.body.style.overflow = ''; document.body.style.paddingRight = '' }
    }
  }, [])
}
export function Portal({ children }) {
  return createPortal(children, document.body)
}

export function Modal({ title, onClose, children, footer, width, shake }) {
  useEscape(onClose)
  useScrollLock()
  const panel = useRef(null)
  // move focus into the dialog for keyboard users
  useEffect(() => {
    const el = panel.current?.querySelector('input, select, textarea, [autofocus]')
    ;(el || panel.current)?.focus({ preventScroll: true })
  }, [])
  return (
    <Portal>
      <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
        <div ref={panel} tabIndex={-1} className={`modal ${shake ? 'shake' : ''}`} style={width ? { maxWidth: width } : undefined} role="dialog" aria-modal="true" aria-label={title}>
          <div className="modal-header">
            <h2>{title}</h2>
            <button className="btn-icon" onClick={onClose} aria-label="Close"><X /></button>
          </div>
          <div className="modal-body">{children}</div>
          {footer && <div className="modal-footer">{footer}</div>}
        </div>
      </div>
    </Portal>
  )
}

export function Drawer({ title, subtitle, onClose, children, footer }) {
  useEscape(onClose)
  useScrollLock()
  return (
    <Portal>
      <div className="drawer-backdrop" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-modal="true" aria-label={title}>
        <div className="drawer-header">
          <div>
            <h2>{title}</h2>
            {subtitle && <div className="td-muted" style={{ marginTop: 4 }}>{subtitle}</div>}
          </div>
          <button className="btn-icon" onClick={onClose} aria-label="Close"><X /></button>
        </div>
        <div className="drawer-body">{children}</div>
        {footer && <div className="drawer-footer">{footer}</div>}
      </aside>
    </Portal>
  )
}

export function Avatar({ name = '?', size = 32 }) {
  const c = colorFor(name)
  return (
    <div className="person-avatar" style={{ '--av': c, width: size, height: size, fontSize: Math.round(size * 0.38) }}>{initials(name)}</div>
  )
}

export function Person({ name, sub }) {
  return (
    <div className="person">
      <Avatar name={name || '?'} />
      <div style={{ minWidth: 0 }}>
        <div className="person-name">{name}</div>
        {sub && <div className="person-sub">{sub}</div>}
      </div>
    </div>
  )
}

export function Stars({ value = 0 }) {
  return (
    <span className="stars" title={`${value} / 5`}>
      {[1, 2, 3, 4, 5].map((n) => <span key={n} className={n <= value ? '' : 'off'}>★</span>)}
    </span>
  )
}

export function Loading({ label = 'Loading…' }) {
  return (
    <div className="loader">
      <div className="spinner" />
      {label}
    </div>
  )
}

export function SkeletonRows({ rows = 6, cols = 4 }) {
  return (
    <div className="skeleton-table">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton-row" style={{ gridTemplateColumns: `28px repeat(${cols}, 1fr)` }}>
          <div className="skeleton" style={{ width: 16 }} />
          {Array.from({ length: cols }).map((_, j) => <div key={j} className="skeleton" style={{ width: `${50 + ((i * 7 + j * 13) % 40)}%` }} />)}
        </div>
      ))}
    </div>
  )
}

export function Empty({ text = 'Nothing here yet', action, icon: Icon = Inbox }) {
  return (
    <div className="empty">
      <div className="empty-icon"><Icon /></div>
      <div>{text}</div>
      {action && <div style={{ marginTop: 14 }}>{action}</div>}
    </div>
  )
}

const TOAST_ICON = { success: CheckCircle2, error: XCircle, info: Info }
/** Local toast stack (pages that don't use the global toaster). */
export function Toasts({ items }) {
  if (!items?.length) return null
  return (
    <div className="toast-wrap">
      {items.map((t) => {
        const Icon = TOAST_ICON[t.type] || Info
        return <div key={t.id} className={`toast toast-${t.type}`} role="status"><Icon /><span className="toast-msg">{t.message}</span></div>
      })}
    </div>
  )
}

const CAT_ICONS = { cpu: Cpu, music: Music, trophy: Trophy, mic: Mic, heart: HeartHandshake, sparkles: Sparkles }
export function CategoryIcon({ name, size = 18, ...rest }) {
  const Icon = CAT_ICONS[name] || Sparkles
  return <Icon size={size} {...rest} />
}

export function ViewSwitch({ views, value, onChange }) {
  return (
    <div className="view-switch" role="tablist">
      {views.map((v) => (
        <button key={v.key} role="tab" aria-selected={value === v.key} className={value === v.key ? 'active' : ''} onClick={() => onChange(v.key)} title={v.label}>
          {v.icon && <v.icon size={15} />}<span>{v.label}</span>
        </button>
      ))}
    </div>
  )
}

export function RatingInput({ value, onChange }) {
  return (
    <div className="rating-input" role="radiogroup">
      {[1, 2, 3, 4, 5].map((n) => (
        <button type="button" key={n} className={n <= value ? 'on' : ''} onClick={() => onChange(n)} aria-label={`${n} star`}>★</button>
      ))}
    </div>
  )
}

/** Thin progress bar. */
export function Meter({ value, max = 100, tone }) {
  const pct = Math.max(0, Math.min(100, Math.round((value / Math.max(1, max)) * 100)))
  return <div className={`meter-bar ${tone ? `tone-${tone}` : ''}`}><span style={{ width: `${pct}%` }} /></div>
}

/** Official K.R. Mangalam University logo (src/assets). Small sizes use a lighter file. */
export function Crest({ size = 36, className = '' }) {
  return (
    <img
      className={`crest ${className}`}
      src={size > 64 ? logoLarge : logoSmall}
      width={size}
      height={size}
      alt="K.R. Mangalam University logo"
      draggable="false"
    />
  )
}
