import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { Search, CalendarDays, Users, MapPin, UserCog, Tags, CornerDownLeft, ArrowRight } from 'lucide-react'
import { api } from '../services/api.js'
import { useAuth } from '../auth/AuthContext.jsx'
import { formatDate } from '../utils/helpers.js'

const SOURCES = [
  { resource: 'events', icon: CalendarDays, to: '/events', title: (r) => r.title, sub: (r) => `${formatDate(r.date)} · ${r.status}`, key: (r) => r.title },
  { resource: 'students', icon: Users, to: '/students', title: (r) => r.name, sub: (r) => `${r.rollNo} · ${r.department}`, key: (r) => r.name, staff: true },
  { resource: 'venues', icon: MapPin, to: '/venues', title: (r) => r.name, sub: (r) => `${r.building} · ${r.capacity} seats`, key: (r) => r.name },
  { resource: 'organizers', icon: UserCog, to: '/organizers', title: (r) => r.name, sub: (r) => r.department, key: (r) => r.name },
  { resource: 'categories', icon: Tags, to: '/categories', title: (r) => r.name, sub: (r) => r.description, key: (r) => r.name },
]

export default function CommandPalette({ onClose, nav, extra = [] }) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [q, setQ] = useState('')
  const [data, setData] = useState({})
  const [active, setActive] = useState(0)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
    const sources = SOURCES.filter((s) => !s.staff || user.role !== 'student')
    Promise.all(sources.map((s) => api.getAll(s.resource).catch(() => [])))
      .then((res) => setData(Object.fromEntries(sources.map((s, i) => [s.resource, res[i]]))))
  }, [user.role])

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const pages = nav
      .filter((n) => !needle || n.label.toLowerCase().includes(needle))
      .map((n) => ({ id: `nav-${n.label}`, group: 'Pages', icon: n.icon, title: n.label, sub: 'Go to page', go: () => navigate(n.to) }))
    const commands = extra
      .filter((c) => !needle || c.label.toLowerCase().includes(needle))
      .map((c) => ({ id: `cmd-${c.label}`, group: 'Commands', icon: c.icon, title: c.label, sub: c.to ? 'Open' : 'Run command', go: () => (c.run ? c.run() : navigate(c.to)) }))
    if (!needle) return [...pages, ...commands]
    const records = SOURCES.flatMap((s) =>
      (data[s.resource] || [])
        .filter((r) => `${s.title(r)} ${s.sub(r)}`.toLowerCase().includes(needle))
        .slice(0, 5)
        .map((r) => ({
          id: `${s.resource}-${r.id}`, group: s.resource[0].toUpperCase() + s.resource.slice(1), icon: s.icon,
          title: s.title(r), sub: s.sub(r), go: () => navigate(`${s.to}?q=${encodeURIComponent(s.key(r))}`),
        })),
    )
    return [...pages, ...commands, ...records]
  }, [q, data, nav, navigate])

  useEffect(() => { setActive(0) }, [q])
  useEffect(() => {
    listRef.current?.querySelector('.cp-item.active')?.scrollIntoView({ block: 'nearest' })
  }, [active])

  function onKey(e) {
    if (e.key === 'Escape') onClose()
    else if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(results.length - 1, a + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)) }
    else if (e.key === 'Enter' && results[active]) { results[active].go(); onClose() }
  }

  const groupStart = new Set(results.map((r, i) => (i === 0 || results[i - 1].group !== r.group ? i : -1)).filter((i) => i >= 0))
  return createPortal(
    <div className="cp-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="cp" onKeyDown={onKey}>
        <div className="cp-input">
          <Search size={18} />
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search events, students, venues, pages…" />
          <kbd>esc</kbd>
        </div>
        <div className="cp-list" ref={listRef}>
          {results.length === 0 && <div className="cp-empty">No results for “{q}”</div>}
          {results.map((r, i) => {
            const header = groupStart.has(i) ? <div className="cp-group" key={`g-${r.group}`}>{r.group}</div> : null
            return [
              header,
              <button
                key={r.id}
                className={`cp-item ${i === active ? 'active' : ''}`}
                style={{ '--i': Math.min(i, 12) }}
                onMouseEnter={() => setActive(i)}
                onClick={() => { r.go(); onClose() }}
              >
                <div className="cp-icon"><r.icon size={16} /></div>
                <div className="cp-text"><b>{r.title}</b><span>{r.sub}</span></div>
                {i === active ? <CornerDownLeft size={14} className="cp-enter" /> : <ArrowRight size={14} className="cp-arrow" />}
              </button>,
            ]
          })}
        </div>
        <div className="cp-foot"><span><kbd>↑</kbd><kbd>↓</kbd> navigate</span><span><kbd>↵</kbd> open</span><span><kbd>esc</kbd> close</span></div>
      </div>
    </div>,
    document.body,
  )
}
