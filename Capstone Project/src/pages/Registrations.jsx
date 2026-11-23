import { useState } from 'react'
import { ClipboardList, Columns3, CheckCircle2, Hourglass, XCircle, GripVertical, ArrowUpCircle, CalendarDays, TrendingUp } from 'lucide-react'
import EntityPage from '../components/EntityPage.jsx'
import { Person, Badge } from '../components/ui.jsx'
import { byId, formatDate, todayISO, categoryTheme } from '../utils/helpers.js'
import { isPairUnique } from '../utils/validate.js'

const STATUSES = ['Confirmed', 'Waitlisted', 'Cancelled']
const COLS = [
  { status: 'Confirmed', icon: CheckCircle2, tone: 'success', hint: 'Seat guaranteed' },
  { status: 'Waitlisted', icon: Hourglass, tone: 'warning', hint: 'Waiting for a seat' },
  { status: 'Cancelled', icon: XCircle, tone: 'danger', hint: 'Withdrawn' },
]

function Board({ rows, lk, editable, update, edit }) {
  const [drag, setDrag] = useState(null)
  const [over, setOver] = useState(null)
  const [moving, setMoving] = useState(null)

  async function move(row, status) {
    if (!row || row.status === status) return
    setMoving(row.id)
    await update(row, { status }, `Moved ${byId(lk.students, row.studentId)?.name} to ${status}`)
    setMoving(null)
  }

  return (
    <div className="board">
      {COLS.map((col) => {
        const items = rows.filter((r) => r.status === col.status)
        return (
          <section
            key={col.status}
            className={`board-col tone-${col.tone} ${over === col.status ? 'over' : ''}`}
            onDragOver={(e) => { if (editable) { e.preventDefault(); setOver(col.status) } }}
            onDragLeave={() => setOver((o) => (o === col.status ? null : o))}
            onDrop={(e) => { e.preventDefault(); setOver(null); move(drag, col.status); setDrag(null) }}
          >
            <header>
              <col.icon size={16} />
              <b>{col.status}</b>
              <span className="board-count">{items.length}</span>
              <em>{col.hint}</em>
            </header>
            <div className="board-list">
              {items.length === 0 && <div className="board-empty">{editable ? 'Drop a card here' : 'Nothing here'}</div>}
              {items.map((r, i) => {
                const s = byId(lk.students, r.studentId)
                const e = byId(lk.events, r.eventId)
                const t = categoryTheme(byId(lk.categories, e?.categoryId)?.name)
                return (
                  <article
                    key={r.id}
                    className={`board-card ${drag?.id === r.id ? 'dragging' : ''} ${moving === r.id ? 'moving' : ''}`}
                    style={{ '--i': i, '--c1': t.from }}
                    draggable={editable}
                    onDragStart={(ev) => { setDrag(r); ev.dataTransfer.effectAllowed = 'move' }}
                    onDragEnd={() => { setDrag(null); setOver(null) }}
                    onDoubleClick={() => editable && edit(r)}
                  >
                    {editable && <GripVertical size={14} className="grip" />}
                    <Person name={s?.name || 'Unknown'} sub={s?.rollNo} />
                    <div className="board-event"><CalendarDays size={12} /> {e?.title}</div>
                    <div className="board-meta">
                      <span>Registered {formatDate(r.registeredOn)}</span>
                      {editable && col.status === 'Waitlisted' && (
                        <button className="link-btn" onClick={() => move(r, 'Confirmed')}><ArrowUpCircle size={13} /> Promote</button>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}

function Insights(rows, lk) {
  const events = (lk.events || []).filter((e) => e.status !== 'Cancelled')
  const fills = events
    .map((e) => ({ e, n: rows.filter((r) => r.eventId === e.id && r.status === 'Confirmed').length }))
    .sort((a, b) => b.n / b.e.maxParticipants - a.n / a.e.maxParticipants)
    .slice(0, 4)
  return (
    <div className="insight-grid">
      {fills.map(({ e, n }, i) => {
        const pct = Math.min(100, Math.round((n / e.maxParticipants) * 100))
        const t = categoryTheme(byId(lk.categories, e.categoryId)?.name)
        return (
          <div className="card insight fill-card" key={e.id} style={{ '--i': i, '--c1': t.from, '--c2': t.to }}>
            <div className="insight-title">{e.title}</div>
            <div className="fill-num"><b>{n}</b> / {e.maxParticipants} <span>{pct}% full</span></div>
            <div className="capacity"><div style={{ width: `${Math.max(pct, 2)}%`, background: `linear-gradient(90deg, ${t.from}, ${t.to})` }} /></div>
          </div>
        )
      })}
    </div>
  )
}

export default function Registrations() {
  return (
    <EntityPage
      title="Registrations"
      subtitle="Which students have signed up for which events. Drag cards on the board to change status."
      resource="registrations"
      lookups={['students', 'events', 'categories']}
      hero={{
        icon: ClipboardList, tone: 'emerald',
        stats: (rows) => {
          const c = (s) => rows.filter((r) => r.status === s).length
          return [
            { label: 'Confirmed', value: c('Confirmed'), icon: CheckCircle2 },
            { label: 'Waitlisted', value: c('Waitlisted'), icon: Hourglass },
            { label: 'Cancelled', value: c('Cancelled'), icon: XCircle },
            { label: 'Retention', value: `${rows.length ? Math.round(((rows.length - c('Cancelled')) / rows.length) * 100) : 0}%`, icon: TrendingUp },
          ]
        },
      }}
      insights={Insights}
      bulkActions={COLS.map((c) => ({
        key: c.status, label: `Mark ${c.status.toLowerCase()}`, icon: c.icon,
        run: async (list, ctx) => {
          for (const r of list.filter((x) => x.status !== c.status)) await ctx.update(r, { status: c.status }, false)
          ctx.toast(`${list.length} registration${list.length === 1 ? '' : 's'} marked ${c.status.toLowerCase()}`)
        },
      }))}
      views={[{ key: 'board', label: 'Board', icon: Columns3, render: (ctx) => <Board {...ctx} /> }]}
      searchIn={(r, lk) => `${byId(lk.students, r.studentId)?.name} ${byId(lk.students, r.studentId)?.rollNo} ${byId(lk.events, r.eventId)?.title} ${r.status}`}
      defaults={{ status: 'Confirmed', registeredOn: todayISO() }}
      filters={[
        { key: 'eventId', label: 'Event', optionsFrom: (lk) => lk.events?.map((e) => ({ value: e.id, label: e.title })) },
        { key: 'status', label: 'Status', options: STATUSES.map((s) => ({ value: s, label: s })) },
      ]}
      columns={[
        { key: 'studentId', label: 'Student', render: (r, lk) => { const s = byId(lk.students, r.studentId); return <Person name={s?.name || 'Unknown'} sub={s?.rollNo} /> }, sortValue: (r, lk) => byId(lk.students, r.studentId)?.name, csv: (r, lk) => byId(lk.students, r.studentId)?.name },
        { key: 'eventId', label: 'Event', render: (r, lk) => { const e = byId(lk.events, r.eventId); return (<div><div className="td-strong">{e?.title || '—'}</div><div className="td-muted">{formatDate(e?.date)}</div></div>) }, sortValue: (r, lk) => byId(lk.events, r.eventId)?.title, csv: (r, lk) => byId(lk.events, r.eventId)?.title },
        { key: 'registeredOn', label: 'Registered on', render: (r) => formatDate(r.registeredOn) },
        { key: 'status', label: 'Status', render: (r) => <Badge>{r.status}</Badge> },
      ]}
      fields={[
        { name: 'studentId', label: 'Student', type: 'select-id', required: true, full: true, optionsFrom: (lk) => lk.students?.map((s) => ({ value: s.id, label: `${s.name} (${s.rollNo})` })) },
        { name: 'eventId', label: 'Event', type: 'select-id', required: true, full: true, optionsFrom: (lk) => lk.events?.filter((e) => e.status !== 'Cancelled').map((e) => ({ value: e.id, label: `${e.title} — ${formatDate(e.date)} · ${e.status}` })) },
        { name: 'registeredOn', label: 'Registration date', type: 'date', required: true },
        { name: 'status', label: 'Status', type: 'select', required: true, options: STATUSES.map((s) => ({ value: s, label: s })) },
      ]}
      validate={(f, { rows, lookups, editing }) => {
        const errs = {}
        if (f.studentId && f.eventId && !isPairUnique(rows, { studentId: f.studentId, eventId: f.eventId }, editing?.id)) errs.eventId = 'This student is already registered for this event'
        const ev = byId(lookups.events, f.eventId)
        if (ev) {
          if (ev.status === 'Completed' && !editing) errs.eventId = 'Cannot register for an event that is already completed'
          if (f.registeredOn && f.registeredOn > ev.date) errs.registeredOn = 'Registration date cannot be after the event date'
          const confirmed = rows.filter((r) => r.eventId === ev.id && r.status === 'Confirmed' && r.id !== editing?.id).length
          if (f.status === 'Confirmed' && confirmed >= ev.maxParticipants) errs.status = `Event is full (${ev.maxParticipants}). Choose Waitlisted instead`
        }
        if (f.registeredOn && f.registeredOn > todayISO()) errs.registeredOn = 'Registration date cannot be in the future'
        return errs
      }}
    />
  )
}
