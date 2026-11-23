export const formatDate = (iso) => {
  if (!iso) return '—'
  const d = new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''))
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export const initials = (name = '') =>
  name
    .replace(/^(Dr\.|Prof\.|Mr\.|Ms\.|Mrs\.)\s*/i, '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')

// Muted, professional avatar tones (white text stays readable on all of them)
const palette = ['#475569', '#4f46e5', '#0f766e', '#a16207', '#6d28d9', '#0369a1', '#9f1239', '#15803d']
export const colorFor = (str = '') => {
  let h = 0
  for (const c of String(str)) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return palette[h % palette.length]
}

export const byId = (rows = [], id) => rows.find((r) => r.id === Number(id))

export const statusTone = (status) =>
  ({
    Upcoming: 'info',
    Ongoing: 'violet',
    Completed: 'success',
    Cancelled: 'danger',
    Confirmed: 'success',
    Waitlisted: 'warning',
    Present: 'success',
    Absent: 'danger',
  })[status] || 'neutral'

export const todayISO = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ---- visual themes ----
// One restrained accent per category, used for small markers (icon, dot, thin bar) only.
const CATEGORY_THEMES = {
  technical: { color: '#2563eb', icon: 'cpu' },
  cultural: { color: '#a16207', icon: 'music' },
  sports: { color: '#15803d', icon: 'trophy' },
  seminar: { color: '#6d28d9', icon: 'mic' },
  social: { color: '#be123c', icon: 'heart' },
}
const FALLBACK = ['#0369a1', '#475569', '#0f766e', '#7c2d12']
export function categoryTheme(name = '') {
  const t = CATEGORY_THEMES[String(name).toLowerCase()]
  if (t) return { ...t, from: t.color, to: t.color }
  let h = 0
  for (const c of String(name)) h = (h * 31 + c.charCodeAt(0)) >>> 0
  const color = FALLBACK[h % FALLBACK.length]
  return { color, from: color, to: color, icon: 'sparkles' }
}
/** Soft tinted background for a theme colour. */
export const tint = (t, pct = 10) => `color-mix(in srgb, ${t.color || t.from} ${pct}%, var(--surface))`
/** @deprecated kept for compatibility – now returns a soft tint, not a loud gradient */
export const gradient = (t) => tint(t)

export function timeAgo(iso) {
  if (!iso) return ''
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 45) return 'just now'
  const m = Math.round(s / 60); if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60); if (h < 24) return `${h}h ago`
  const d = Math.round(h / 24); if (d < 30) return `${d}d ago`
  return formatDate(String(iso).slice(0, 10))
}

export function greeting() {
  const h = new Date().getHours()
  return h < 5 ? 'Good night' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

export const daysUntil = (iso) => Math.round((new Date(iso + 'T00:00:00') - new Date(todayISO() + 'T00:00:00')) / 86400000)

/** "Dr. Meera Nair" → "Meera" */
export const firstName = (name = '') => name.replace(/^(Dr\.|Prof\.|Mr\.|Ms\.|Mrs\.)\s*/i, '').split(' ')[0]
