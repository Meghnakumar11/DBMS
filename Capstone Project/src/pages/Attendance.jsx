import { useMemo, useState } from 'react'
import { CheckSquare, ScanLine, UserCheck, UserX, Clock, Percent, CheckCheck, CalendarDays, MapPin } from 'lucide-react'
import EntityPage from '../components/EntityPage.jsx'
import { Person, Badge, Empty } from '../components/ui.jsx'
import { byId, formatDate, categoryTheme, gradient } from '../utils/helpers.js'
import { isPairUnique } from '../utils/validate.js'

const nowHM = () => { const d = new Date(); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` }

/** Live check-in desk: pick an event, tap Present / Absent per registered student. */
function CheckIn({ all, lk, editable, create, update }) {
  const events = useMemo(
    () => (lk.events || []).filter((e) => e.status === 'Ongoing' || e.status === 'Completed').sort((a, b) => b.date.localeCompare(a.date)),
    [lk.events],
  )
  const [eventId, setEventId] = useState(() => (events.find((e) => e.status === 'Ongoing') || events[0])?.id)
  const [busy, setBusy] = useState(null)
  const ev = byId(events, eventId)
  if (!events.length) return <Empty text="No ongoing or completed events to take attendance for" />

  const regs = (lk.registrations || []).filter((r) => r.eventId === eventId && r.status === 'Confirmed')
  const recFor = (sid) => all.find((a) => a.eventId === eventId && a.studentId === sid)
  const marked = regs.filter((r) => recFor(r.studentId)).length
  const present = regs.filter((r) => recFor(r.studentId)?.status === 'Present').length
  const pct = regs.length ? Math.round((present / regs.length) * 100) : 0
  const t = categoryTheme(byId(lk.categories, ev?.categoryId)?.name)
  const R = 34, L = 2 * Math.PI * R

  function checkTime() {
    const n = nowHM()
    return n >= ev.startTime && n <= ev.endTime ? n : ev.startTime
  }
  async function mark(sid, status) {
    const rec = recFor(sid)
    if (rec?.status === status) return
    setBusy(sid)
    const name = byId(lk.students, sid)?.name
    const data = { studentId: sid, eventId, status, checkInTime: status === 'Present' ? checkTime() : '' }
    if (rec) await update(rec, data, `${name} marked ${status}`)
    else await create(data, `${name} marked ${status}`)
    setBusy(null)
  }
  async function markAll() {
    for (const r of regs) if (!recFor(r.studentId)) await mark(r.studentId, 'Present')
  }

  return (
    <div className="checkin">
      <div className="checkin-events">
        {events.map((e, i) => (
          <button key={e.id} className={`ci-event ${e.id === eventId ? 'active' : ''}`} style={{ '--i': i }} onClick={() => setEventId(e.id)}>
            <b>{e.title}</b>
            <span>{formatDate(e.date)} · {e.status}</span>
          </button>
        ))}
      </div>

      <div className="checkin-panel" key={eventId}>
        <div className="checkin-head" style={{ '--c1': t.color }}>
          <div>
            <h3>{ev.title}</h3>
            <div className="checkin-meta"><CalendarDays size={13} /> {formatDate(ev.date)} <Clock size={13} /> {ev.startTime}–{ev.endTime} <MapPin size={13} /> {byId(lk.venues, ev.venueId)?.name}</div>
          </div>
          <div className="checkin-ring">
            <svg viewBox="0 0 80 80" style={{ '--ring-len': L }}>
              <circle cx="40" cy="40" r={R} className="track" />
              <circle cx="40" cy="40" r={R} className="val" strokeDasharray={L} strokeDashoffset={L * (1 - pct / 100)} />
            </svg>
            <div><b>{pct}%</b><span>{present}/{regs.length}</span></div>
          </div>
        </div>
        <div className="checkin-toolbar">
          <span><b>{marked}</b> of {regs.length} marked</span>
          {editable && marked < regs.length && <button className="btn btn-primary btn-sm" onClick={markAll}><CheckCheck /> Mark remaining present</button>}
        </div>
        {regs.length === 0 && <Empty text="No confirmed registrations for this event" />}
        <div className="checkin-list">
          {regs.map((r, i) => {
            const s = byId(lk.students, r.studentId)
            const rec = recFor(r.studentId)
            return (
              <div key={r.id} className={`ci-row ${rec ? `is-${rec.status.toLowerCase()}` : ''} ${busy === r.studentId ? 'busy' : ''}`} style={{ '--i': i }}>
                <Person name={s?.name} sub={`${s?.rollNo} · ${s?.department}`} />
                <div className="ci-status">
                  {rec?.status === 'Present' && <span className="ci-time"><Clock size={12} /> {rec.checkInTime}</span>}
                  {editable ? (
                    <div className="toggle-2">
                      <button className={rec?.status === 'Present' ? 'on ok' : ''} onClick={() => mark(r.studentId, 'Present')}><UserCheck size={15} /> Present</button>
                      <button className={rec?.status === 'Absent' ? 'on bad' : ''} onClick={() => mark(r.studentId, 'Absent')}><UserX size={15} /> Absent</button>
                    </div>
                  ) : rec ? <Badge>{rec.status}</Badge> : <span className="td-muted">Not marked</span>}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default function Attendance() {
  return (
    <EntityPage
      title="Attendance"
      singular="Attendance record"
      subtitle="Run a live check-in desk, or review every attendance record."
      resource="attendance"
      lookups={['students', 'events', 'registrations', 'categories', 'venues']}
      hero={{
        icon: CheckSquare, tone: 'cyan',
        stats: (rows) => {
          const p = rows.filter((a) => a.status === 'Present')
          const times = p.map((a) => a.checkInTime).filter(Boolean).sort()
          return [
            { label: 'Present', value: p.length, icon: UserCheck },
            { label: 'Absent', value: rows.length - p.length, icon: UserX },
            { label: 'Turn-up rate', value: `${rows.length ? Math.round((p.length / rows.length) * 100) : 0}%`, icon: Percent },
            { label: 'Earliest check-in', value: times[0] || '—', icon: Clock },
          ]
        },
      }}
      views={[{ key: 'checkin', label: 'Check-in desk', icon: ScanLine, render: (ctx) => <CheckIn {...ctx} /> }]}
      searchIn={(a, lk) => `${byId(lk.students, a.studentId)?.name} ${byId(lk.students, a.studentId)?.rollNo} ${byId(lk.events, a.eventId)?.title} ${a.status}`}
      defaults={{ status: 'Present' }}
      filters={[
        { key: 'status', label: 'Status', options: [{ value: 'Present', label: 'Present' }, { value: 'Absent', label: 'Absent' }] },
        { key: 'eventId', label: 'Event', optionsFrom: (lk) => lk.events?.map((e) => ({ value: e.id, label: e.title })) },
      ]}
      columns={[
        { key: 'studentId', label: 'Student', render: (a, lk) => { const s = byId(lk.students, a.studentId); return <Person name={s?.name || 'Unknown'} sub={s?.rollNo} /> }, sortValue: (a, lk) => byId(lk.students, a.studentId)?.name, csv: (a, lk) => byId(lk.students, a.studentId)?.name },
        { key: 'eventId', label: 'Event', render: (a, lk) => { const e = byId(lk.events, a.eventId); return (<div><div className="td-strong">{e?.title || '—'}</div><div className="td-muted">{formatDate(e?.date)}</div></div>) }, sortValue: (a, lk) => byId(lk.events, a.eventId)?.title, csv: (a, lk) => byId(lk.events, a.eventId)?.title },
        { key: 'checkInTime', label: 'Check-in', render: (a) => a.checkInTime ? <span className="time-chip"><Clock size={12} /> {a.checkInTime}</span> : <span className="td-muted">—</span> },
        { key: 'status', label: 'Status', render: (a) => <Badge>{a.status}</Badge> },
      ]}
      fields={[
        { name: 'eventId', label: 'Event', type: 'select-id', required: true, full: true, optionsFrom: (lk) => lk.events?.filter((e) => e.status !== 'Upcoming' && e.status !== 'Cancelled').map((e) => ({ value: e.id, label: `${e.title} — ${formatDate(e.date)}` })), hint: 'Only ongoing or completed events can have attendance' },
        { name: 'studentId', label: 'Student', type: 'select-id', required: true, full: true, optionsFrom: (lk) => lk.students?.map((s) => ({ value: s.id, label: `${s.name} (${s.rollNo})` })), hint: 'Student must have a confirmed registration for the event' },
        { name: 'status', label: 'Status', type: 'select', required: true, options: [{ value: 'Present', label: 'Present' }, { value: 'Absent', label: 'Absent' }] },
        { name: 'checkInTime', label: 'Check-in time', type: 'time', hint: 'Required when marked Present' },
      ]}
      validate={(f, { rows, lookups, editing }) => {
        const errs = {}
        if (f.studentId && f.eventId) {
          if (!isPairUnique(rows, { studentId: f.studentId, eventId: f.eventId }, editing?.id)) errs.studentId = 'Attendance is already recorded for this student and event'
          const registered = (lookups.registrations || []).some((r) => r.studentId === f.studentId && r.eventId === f.eventId && r.status === 'Confirmed')
          if (!registered && !errs.studentId) errs.studentId = 'This student has no confirmed registration for the selected event'
        }
        if (f.status === 'Present' && !f.checkInTime) errs.checkInTime = 'Check-in time is required when the student is present'
        if (f.status === 'Absent' && f.checkInTime) errs.checkInTime = 'An absent student cannot have a check-in time'
        const ev = byId(lookups.events, f.eventId)
        if (ev && f.checkInTime && (f.checkInTime < ev.startTime || f.checkInTime > ev.endTime)) errs.checkInTime = `Check-in must be between ${ev.startTime} and ${ev.endTime}`
        return errs
      }}
    />
  )
}
