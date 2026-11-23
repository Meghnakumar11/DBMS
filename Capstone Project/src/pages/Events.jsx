import { useMemo, useState } from 'react'
import {
  CalendarDays, Clock, MapPin, UserCog, Tag, LayoutGrid, CalendarRange, ChevronLeft, ChevronRight,
  Pencil, Trash2, CheckCircle2, Ticket, Hourglass, Flame, Sparkles, CalendarPlus, Copy, Ban,
} from 'lucide-react'
import EntityPage from '../components/EntityPage.jsx'
import { Badge, Person, Stars, CategoryIcon, Empty } from '../components/ui.jsx'
import { byId, formatDate, todayISO, categoryTheme, gradient, daysUntil, initials, colorFor } from '../utils/helpers.js'
import { isUnique, timeAfter } from '../utils/validate.js'
import { api } from '../services/api.js'
import { useAuth } from '../auth/AuthContext.jsx'

const STATUSES = ['Upcoming', 'Ongoing', 'Completed', 'Cancelled']

/** Downloads an .ics file so the event can be added to Google / Outlook / Apple Calendar. */
export function downloadIcs(e, venue) {
  const dt = (d, t) => `${d.replace(/-/g, '')}T${t.replace(':', '')}00`
  const esc = (s = '') => String(s).replace(/[,;\\]/g, (m) => `\\${m}`).replace(/\n/g, '\\n')
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//CampusEvents//EN', 'BEGIN:VEVENT',
    `UID:event-${e.id}@campusevents`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`,
    `DTSTART:${dt(e.date, e.startTime)}`, `DTEND:${dt(e.date, e.endTime)}`,
    `SUMMARY:${esc(e.title)}`, `DESCRIPTION:${esc(e.description)}`, `LOCATION:${esc(venue?.name || '')}`,
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }))
  a.download = `${e.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.ics`
  a.click()
}

const activeRegs = (lk, eventId) => (lk.registrations || []).filter((r) => r.eventId === eventId && r.status !== 'Cancelled')

function countdown(e) {
  if (e.status === 'Cancelled') return { text: 'Cancelled', tone: 'danger' }
  if (e.status === 'Completed') return { text: 'Ended', tone: 'muted' }
  if (e.status === 'Ongoing') return { text: 'Happening now', tone: 'live' }
  const d = daysUntil(e.date)
  if (d === 0) return { text: 'Today', tone: 'live' }
  if (d === 1) return { text: 'Tomorrow', tone: 'soon' }
  if (d > 1) return { text: `In ${d} days`, tone: d <= 7 ? 'soon' : 'later' }
  return { text: 'Date passed', tone: 'muted' }
}

function EventDetail(e, lk) {
  const category = byId(lk.categories, e.categoryId)
  const venue = byId(lk.venues, e.venueId)
  const organizer = byId(lk.organizers, e.organizerId)
  const regs = activeRegs(lk, e.id)
  const att = (lk.attendance || []).filter((a) => a.eventId === e.id)
  const present = att.filter((a) => a.status === 'Present').length
  const fb = (lk.feedback || []).filter((f) => f.eventId === e.id)
  const avg = fb.length ? (fb.reduce((s, f) => s + f.rating, 0) / fb.length).toFixed(1) : '—'
  const fill = Math.min(100, Math.round((regs.length / Math.max(1, e.maxParticipants)) * 100))
  const theme = categoryTheme(category?.name)

  return (
    <>
      <div className="detail-cover" style={{ '--c1': theme.color }}>
        <CategoryIcon name={theme.icon} size={84} className="detail-cover-icon" />
        <div className="detail-cover-badges"><Badge>{e.status}</Badge><span className="glass-chip">{category?.name}</span></div>
      </div>
      {e.description && <p style={{ color: 'var(--text-2)', lineHeight: 1.6, margin: '0 0 18px' }}>{e.description}</p>}

      <dl className="kv">
        <dt><CalendarDays size={13} /> Date</dt><dd>{formatDate(e.date)} <span className="td-muted">· {countdown(e).text}</span></dd>
        <dt><Clock size={13} /> Time</dt><dd>{e.startTime} – {e.endTime}</dd>
        <dt><MapPin size={13} /> Venue</dt><dd>{venue?.name} <span className="td-muted">· {venue?.building}</span></dd>
        <dt><UserCog size={13} /> Organizer</dt><dd>{organizer?.name} <span className="td-muted">· {organizer?.department}</span></dd>
        <dt><Tag size={13} /> Capacity</dt>
        <dd>{regs.length} / {e.maxParticipants} registered ({fill}%)<div className="capacity"><div style={{ width: `${fill}%` }} /></div></dd>
      </dl>

      <div className="mini-stats">
        <div className="mini-stat"><b>{regs.length}</b><span>Registered</span></div>
        <div className="mini-stat"><b>{att.length ? `${Math.round((present / att.length) * 100)}%` : '—'}</b><span>Attendance</span></div>
        <div className="mini-stat"><b>{avg}</b><span>Avg rating</span></div>
      </div>

      <div className="section-title">Registered students ({regs.length})</div>
      {regs.length === 0 && <div className="td-muted">No registrations yet.</div>}
      <div className="list" style={{ margin: '0 -8px' }}>
        {regs.map((r, i) => {
          const s = byId(lk.students, r.studentId)
          return (
            <div className="list-item" key={r.id} style={{ padding: '9px 8px', '--i': i }}>
              <div className="list-grow"><Person name={s?.name || 'Unknown'} sub={`${s?.rollNo || ''} · ${s?.department || ''}`} /></div>
              <Badge>{r.status}</Badge>
            </div>
          )
        })}
      </div>

      {fb.length > 0 && (
        <>
          <div className="section-title">Feedback ({fb.length})</div>
          {fb.map((f) => (
            <div key={f.id} className="quote">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="td-strong">{byId(lk.students, f.studentId)?.name}</span>
                <Stars value={f.rating} />
              </div>
              <div>“{f.comments}”</div>
            </div>
          ))}
        </>
      )}
    </>
  )
}

/* ---------- Register button for students ---------- */
function RegisterButton({ event, lk, reload, toast }) {
  const { user } = useAuth()
  const [busy, setBusy] = useState(false)
  if (user.role !== 'student') return null
  const mine = (lk.registrations || []).find((r) => r.eventId === event.id && r.studentId === user.studentId)
  if (mine && mine.status !== 'Cancelled')
    return <span className={`reg-state ${mine.status === 'Waitlisted' ? 'wait' : ''}`}><CheckCircle2 size={14} /> {mine.status === 'Waitlisted' ? 'Waitlisted' : "You're in"}</span>
  if (event.status !== 'Upcoming' && event.status !== 'Ongoing') return null
  if (!user.studentId) return <span className="td-muted" title="Ask an admin to link your account to a student record">Not linked</span>
  async function go(e) {
    e.stopPropagation()
    setBusy(true)
    try {
      const r = await (mine ? api.update('registrations', mine.id, { status: 'Confirmed' }) : api.create('registrations', { eventId: event.id }))
      toast(r.status === 'Waitlisted' ? `Event is full, so you're on the waitlist for ${event.title}` : `🎉 Registered for ${event.title}!`)
      reload()
    } catch (err) {
      toast(err.fields ? Object.values(err.fields)[0] : err.message, 'error')
    } finally { setBusy(false) }
  }
  return <button className="btn btn-primary btn-sm" onClick={go} disabled={busy}>{busy ? <span className="btn-spinner" /> : <Ticket />} Register</button>
}

/* ---------- Card grid view ---------- */
function CardsView({ rows, lk, editable, edit, remove, open, reload, toast, duplicate }) {
  if (!rows.length) return <Empty text="No events match your filters" />
  return (
    <div className="ev-grid">
      {rows.map((e, i) => {
        const cat = byId(lk.categories, e.categoryId)
        const venue = byId(lk.venues, e.venueId)
        const org = byId(lk.organizers, e.organizerId)
        const theme = categoryTheme(cat?.name)
        const regs = activeRegs(lk, e.id)
        const pct = Math.min(100, Math.round((regs.length / Math.max(1, e.maxParticipants)) * 100))
        const dt = new Date(e.date + 'T00:00:00')
        const cd = countdown(e)
        return (
          <article key={e.id} className={`ev-card status-${e.status.toLowerCase()}`} style={{ '--i': i, '--c1': theme.from, '--c2': theme.to }} onClick={() => open(e)}>
            <div className="ev-cover" style={{ '--c1': theme.color }}>
              <CategoryIcon name={theme.icon} size={92} className="ev-cover-icon" />
              <div className="ev-date"><b>{dt.getDate()}</b><span>{dt.toLocaleString('en', { month: 'short' })}</span></div>
              <span className={`ev-countdown cd-${cd.tone}`}>{cd.tone === 'live' && <span className="live-dot" />}{cd.text}</span>
              <span className="ev-cat-chip"><CategoryIcon name={theme.icon} size={12} /> {cat?.name}</span>
            </div>
            <div className="ev-body">
              <div className="ev-title-row"><h3>{e.title}</h3><Badge>{e.status}</Badge></div>
              <p className="ev-desc">{e.description || 'No description'}</p>
              <div className="ev-meta"><MapPin size={13} /> {venue?.name}<span>·</span><Clock size={13} /> {e.startTime}–{e.endTime}</div>
              <div className="ev-meta"><UserCog size={13} /> {org?.name}</div>
              <div className="ev-cap">
                <div className="ev-cap-row"><span><b>{regs.length}</b> / {e.maxParticipants} seats</span><span className={pct >= 90 ? 'hot' : ''}>{pct >= 90 && <Flame size={12} />}{pct}%</span></div>
                <div className="capacity"><div style={{ width: `${pct}%`, background: theme.color }} /></div>
              </div>
            </div>
            <div className="ev-foot" onClick={(ev) => ev.stopPropagation()}>
              <div className="avatar-stack">
                {regs.slice(0, 4).map((r) => {
                  const s = byId(lk.students, r.studentId)
                  return <span key={r.id} style={{ '--av': colorFor(s?.name) }} title={s?.name}>{initials(s?.name)}</span>
                })}
                {regs.length > 4 && <span className="more">+{regs.length - 4}</span>}
                {regs.length === 0 && <em className="td-muted">Be the first to join</em>}
              </div>
              <div className="ev-actions">
                <RegisterButton event={e} lk={lk} reload={reload} toast={toast} />
                <button className="btn-icon" title="Add to calendar" onClick={() => downloadIcs(e, venue)}><CalendarPlus /></button>
                {editable && <button className="btn-icon" title="Duplicate" onClick={() => duplicate({ ...e, title: `${e.title} (copy)`, status: 'Upcoming' })}><Copy /></button>}
                {editable && <button className="btn-icon" title="Edit" onClick={() => edit(e)}><Pencil /></button>}
                {editable && <button className="btn-icon danger" title="Delete" onClick={() => remove(e)}><Trash2 /></button>}
              </div>
            </div>
          </article>
        )
      })}
    </div>
  )
}

/* ---------- Month calendar view ---------- */
function CalendarView({ rows, lk, open }) {
  const initial = useMemo(() => {
    const next = [...rows].filter((e) => e.date >= todayISO()).sort((a, b) => a.date.localeCompare(b.date))[0]
    const d = new Date((next?.date || todayISO()) + 'T00:00:00')
    return { y: d.getFullYear(), m: d.getMonth() }
  }, [rows])
  const [cur, setCur] = useState(initial)
  const [dir, setDir] = useState(0)
  const first = new Date(cur.y, cur.m, 1)
  const startPad = (first.getDay() + 6) % 7 // Monday first
  const days = new Date(cur.y, cur.m + 1, 0).getDate()
  const cells = Array.from({ length: Math.ceil((startPad + days) / 7) * 7 }, (_, i) => {
    const day = i - startPad + 1
    if (day < 1 || day > days) return null
    const iso = `${cur.y}-${String(cur.m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return { day, iso, events: rows.filter((e) => e.date === iso) }
  })
  const move = (n) => { setDir(n); setCur((c) => { const d = new Date(c.y, c.m + n, 1); return { y: d.getFullYear(), m: d.getMonth() } }) }
  const monthEvents = rows.filter((e) => e.date.startsWith(`${cur.y}-${String(cur.m + 1).padStart(2, '0')}`)).length

  return (
    <div className="cal">
      <div className="cal-head">
        <button className="icon-btn" onClick={() => move(-1)} aria-label="Previous month"><ChevronLeft size={18} /></button>
        <div className="cal-title" key={`${cur.y}-${cur.m}`}>
          <b>{first.toLocaleString('en', { month: 'long' })} {cur.y}</b>
          <span>{monthEvents} event{monthEvents === 1 ? '' : 's'}</span>
        </div>
        <button className="icon-btn" onClick={() => move(1)} aria-label="Next month"><ChevronRight size={18} /></button>
        <button className="btn btn-ghost btn-sm" onClick={() => { const d = new Date(); setCur({ y: d.getFullYear(), m: d.getMonth() }) }}>Today</button>
      </div>
      <div className="cal-grid cal-dow">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => <div key={d}>{d}</div>)}</div>
      <div className={`cal-grid cal-days slide-${dir}`} key={`${cur.y}-${cur.m}`}>
        {cells.map((c, i) => (
          <div key={i} className={`cal-cell ${!c ? 'pad' : ''} ${c?.iso === todayISO() ? 'today' : ''} ${c?.events.length ? 'has' : ''}`} style={{ '--i': i }}>
            {c && <span className="cal-num">{c.day}</span>}
            {c?.events.map((e) => {
              const t = categoryTheme(byId(lk.categories, e.categoryId)?.name)
              return (
                <button key={e.id} className={`cal-ev ${e.status === 'Cancelled' ? 'cancelled' : ''}`} style={{ '--c1': t.color }} onClick={() => open(e)} title={`${e.title} · ${e.startTime}`}>
                  <span>{e.startTime}</span> {e.title}
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Events() {
  return (
    <EntityPage
      title="Events"
      subtitle="Every event on campus. Browse as cards, plan on the calendar or manage in the table."
      resource="events"
      hero={{
        icon: CalendarDays, tone: 'violet',
        stats: (rows, lk) => [
          { label: 'Upcoming', value: rows.filter((e) => e.status === 'Upcoming').length, icon: Sparkles },
          { label: 'Happening now', value: rows.filter((e) => e.status === 'Ongoing').length, icon: Flame },
          { label: 'Completed', value: rows.filter((e) => e.status === 'Completed').length, icon: CheckCircle2 },
          { label: 'Seats booked', value: (lk.registrations || []).filter((r) => r.status !== 'Cancelled').length, icon: Ticket },
          { label: 'Next event', value: (() => { const n = rows.filter((e) => e.status === 'Upcoming').sort((a, b) => a.date.localeCompare(b.date))[0]; return n ? countdown(n).text : '—' })(), icon: Hourglass },
        ],
      }}
      views={[
        { key: 'cards', label: 'Cards', icon: LayoutGrid, render: (ctx) => <CardsView {...ctx} /> },
        { key: 'calendar', label: 'Calendar', icon: CalendarRange, render: (ctx) => <CalendarView {...ctx} /> },
      ]}
      lookups={['categories', 'venues', 'organizers', 'registrations', 'attendance', 'feedback', 'students']}
      searchIn={(e, lk) => `${e.title} ${e.description} ${byId(lk.categories, e.categoryId)?.name} ${byId(lk.venues, e.venueId)?.name} ${e.status}`}
      defaults={{ status: 'Upcoming', date: todayISO() }}
      detail={EventDetail}
      detailTitle={(e) => e.title}
      detailActions={(e, ctx) => <button className="btn btn-ghost" onClick={() => downloadIcs(e, byId(ctx.lk.venues, e.venueId))}><CalendarPlus /> Add to calendar</button>}
      rowActions={[
        { key: 'ics', label: 'Add to calendar (.ics)', icon: CalendarPlus, run: (e, ctx) => downloadIcs(e, byId(ctx.lk.venues, e.venueId)) },
        { key: 'dup', label: 'Duplicate event', icon: Copy, show: (_e, ctx) => ctx.editable, run: (e, ctx) => ctx.duplicate({ ...e, title: `${e.title} (copy)`, status: 'Upcoming' }) },
        { key: 'cancel', label: 'Mark as cancelled', icon: Ban, show: (e, ctx) => ctx.editable && e.status === 'Upcoming', run: (e, ctx) => ctx.update(e, { status: 'Cancelled' }, `${e.title} cancelled`) },
      ]}
      bulkActions={[
        { key: 'cancel', label: 'Cancel events', icon: Ban, run: async (list, ctx) => { for (const e of list.filter((x) => x.status === 'Upcoming')) await ctx.update(e, { status: 'Cancelled' }, false); ctx.toast('Selected upcoming events cancelled') } },
      ]}
      filters={[
        { key: 'status', label: 'Status', options: STATUSES.map((s) => ({ value: s, label: s })) },
        { key: 'categoryId', label: 'Category', optionsFrom: (lk) => lk.categories?.map((c) => ({ value: c.id, label: c.name })) },
        { key: 'venueId', label: 'Venue', optionsFrom: (lk) => lk.venues?.map((v) => ({ value: v.id, label: v.name })) },
      ]}
      columns={[
        {
          key: 'title', label: 'Event',
          render: (e, lk) => {
            const t = categoryTheme(byId(lk.categories, e.categoryId)?.name)
            return (
              <div className="person">
                <div className="cat-tile" style={{ '--c1': t.color }}><CategoryIcon name={t.icon} size={15} /></div>
                <div>
                  <div className="td-strong">{e.title}</div>
                  <div className="td-muted" style={{ maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.description}</div>
                </div>
              </div>
            )
          },
        },
        { key: 'categoryId', label: 'Category', render: (e, lk) => <Badge tone="violet">{byId(lk.categories, e.categoryId)?.name || '—'}</Badge>, sortValue: (e, lk) => byId(lk.categories, e.categoryId)?.name, csv: (e, lk) => byId(lk.categories, e.categoryId)?.name },
        { key: 'date', label: 'Date & time', render: (e) => (<div><div>{formatDate(e.date)}</div><div className="td-muted">{e.startTime} – {e.endTime}</div></div>), csv: (e) => `${e.date} ${e.startTime}-${e.endTime}` },
        { key: 'venueId', label: 'Venue', render: (e, lk) => byId(lk.venues, e.venueId)?.name || '—', sortValue: (e, lk) => byId(lk.venues, e.venueId)?.name, csv: (e, lk) => byId(lk.venues, e.venueId)?.name },
        { key: 'organizerId', label: 'Organizer', render: (e, lk) => byId(lk.organizers, e.organizerId)?.name || '—', sortValue: (e, lk) => byId(lk.organizers, e.organizerId)?.name, csv: (e, lk) => byId(lk.organizers, e.organizerId)?.name },
        {
          key: 'maxParticipants', label: 'Registered',
          render: (e, lk) => {
            const n = activeRegs(lk, e.id).length
            const pct = Math.min(100, Math.round((n / Math.max(1, e.maxParticipants)) * 100))
            return (<div style={{ minWidth: 90 }}><div style={{ fontSize: 13 }}><b>{n}</b><span className="td-muted"> / {e.maxParticipants}</span></div><div className="capacity"><div style={{ width: `${pct}%` }} /></div></div>)
          },
          csv: (e, lk) => `${activeRegs(lk, e.id).length}/${e.maxParticipants}`,
        },
        { key: 'status', label: 'Status', render: (e) => <Badge>{e.status}</Badge> },
      ]}
      fields={[
        { name: 'title', label: 'Event title', required: true, full: true, minLength: 3, maxLength: 80 },
        { name: 'categoryId', label: 'Category', type: 'select-id', required: true, optionsFrom: (lk) => lk.categories?.map((c) => ({ value: c.id, label: c.name })) },
        { name: 'status', label: 'Status', type: 'select', required: true, options: STATUSES.map((s) => ({ value: s, label: s })) },
        { name: 'venueId', label: 'Venue', type: 'select-id', required: true, optionsFrom: (lk) => lk.venues?.map((v) => ({ value: v.id, label: `${v.name} (cap. ${v.capacity})` })) },
        { name: 'organizerId', label: 'Organizer', type: 'select-id', required: true, optionsFrom: (lk) => lk.organizers?.map((o) => ({ value: o.id, label: o.name })) },
        { name: 'date', label: 'Date', type: 'date', required: true },
        { name: 'maxParticipants', label: 'Max participants', type: 'number', min: 1, max: 5000, required: true, hint: 'Cannot exceed the venue capacity' },
        { name: 'startTime', label: 'Start time', type: 'time', required: true },
        { name: 'endTime', label: 'End time', type: 'time', required: true },
        { name: 'description', label: 'Description', type: 'textarea', full: true, maxLength: 300, hint: 'Up to 300 characters' },
      ]}
      validate={(f, { rows, lookups, editing }) => {
        const errs = {}
        if (f.title && !isUnique(rows, 'title', f.title, editing?.id)) errs.title = 'An event with this title already exists'
        if (f.startTime && f.endTime && !timeAfter(f.endTime, f.startTime)) errs.endTime = 'End time must be after start time'
        const venue = byId(lookups.venues, f.venueId)
        if (venue && f.maxParticipants > venue.capacity) errs.maxParticipants = `${venue.name} holds only ${venue.capacity} people`
        if (f.date && f.status === 'Upcoming' && f.date < todayISO()) errs.date = 'An upcoming event cannot be in the past'
        if (f.date && f.status === 'Completed' && f.date > todayISO()) errs.status = 'A future event cannot be marked Completed'
        const clash = rows.find((r) => r.id !== editing?.id && r.venueId === f.venueId && r.date === f.date && r.status !== 'Cancelled' && f.startTime < r.endTime && f.endTime > r.startTime)
        if (clash && f.startTime && f.endTime) errs.venueId = `Venue is booked by "${clash.title}" (${clash.startTime}–${clash.endTime})`
        return errs
      }}
    />
  )
}
