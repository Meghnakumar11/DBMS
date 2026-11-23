import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, CalendarDays, ClipboardList, Star, ArrowRight, MapPin, LayoutDashboard, Plus, ScanLine, Columns3, Activity, TrendingUp, Plus as PlusIc, Pencil, Trash2, LogIn, Printer } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { loadMany, authApi } from '../services/api.js'
import { useAuth } from '../auth/AuthContext.jsx'
import { describeActivity } from '../utils/activity.jsx'
import { PageHero, StatCard, Badge, Loading, Person, Stars } from '../components/ui.jsx'
import { byId, formatDate, greeting, timeAgo, todayISO, firstName } from '../utils/helpers.js'
import { useCountUp } from '../utils/motion.js'

export default function Dashboard() {
  const [d, setD] = useState(null)
  const [feed, setFeed] = useState([])
  const { user, can } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    loadMany(['students', 'events', 'categories', 'venues', 'registrations', 'attendance', 'feedback']).then(setD)
    authApi.activity(8).then(setFeed).catch(() => {})
  }, [])

  if (!d) return <Loading />

  const upcoming = d.events
    .filter((e) => e.status === 'Upcoming' || e.status === 'Ongoing')
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5)

  const recentRegs = [...d.registrations].sort((a, b) => b.registeredOn.localeCompare(a.registeredOn)).slice(0, 5)

  const avgRating = d.feedback.length
    ? (d.feedback.reduce((s, f) => s + f.rating, 0) / d.feedback.length).toFixed(1)
    : '—'

  const present = d.attendance.filter((a) => a.status === 'Present').length
  const attendanceRate = d.attendance.length ? Math.round((present / d.attendance.length) * 100) : 0

  const byCategory = d.categories
    .map((c) => ({ ...c, count: d.events.filter((e) => e.categoryId === c.id).length }))
    .sort((a, b) => b.count - a.count)
  const maxCount = Math.max(1, ...byCategory.map((c) => c.count))

  const recentFeedback = [...d.feedback].sort((a, b) => b.submittedOn.localeCompare(a.submittedOn)).slice(0, 3)

  return (
    <>
      <PageHero
        icon={LayoutDashboard} tone="indigo"
        title={`${greeting()}, ${firstName(user.name)} 👋`}
        subtitle={`Here's what's happening on campus. ${upcoming.length} event${upcoming.length === 1 ? '' : 's'} coming up, ${d.registrations.filter((r) => r.registeredOn === todayISO()).length} new registration(s) today.`}
      >
        <button className="btn btn-ghost" onClick={() => window.print()}><Printer /> Print report</button>
        {can('events') && <button className="btn btn-primary" onClick={() => navigate('/events')}><Plus /> New event</button>}
      </PageHero>

      <div className="quick-actions">
        {[
          { icon: ScanLine, title: 'Check-in desk', text: 'Mark attendance live', to: '/attendance' },
          { icon: Columns3, title: 'Registration board', text: 'Confirm or waitlist', to: '/registrations' },
          { icon: CalendarDays, title: 'Event calendar', text: 'See the month ahead', to: '/events' },
          { icon: Star, title: 'Feedback', text: 'Read latest reviews', to: '/feedback' },
        ].map((q, i) => (
          <button key={q.title} className="quick-action" style={{ '--i': i }} onClick={() => navigate(q.to)}>
            <span className="qa-icon"><q.icon size={17} /></span>
            <span><b>{q.title}</b><span>{q.text}</span></span>
          </button>
        ))}
      </div>

      <div className="stat-grid">
        <StatCard index={0} icon={Users} label="Registered students" value={d.students.length} hint="Across all departments" />
        <StatCard index={1} icon={CalendarDays} label="Total events" value={d.events.length}
          hint={`${upcoming.length} upcoming or ongoing`} color="var(--violet)" soft="var(--violet-soft)" />
        <StatCard index={2} icon={ClipboardList} label="Registrations" value={d.registrations.length}
          hint={`${attendanceRate}% attendance rate`} color="var(--info)" soft="var(--info-soft)" />
        <StatCard index={3} icon={Star} label="Average rating" value={avgRating}
          hint={`${d.feedback.length} feedback responses`} color="var(--warning)" soft="var(--warning-soft)" />
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <h3>Upcoming events</h3>
            <Link to="/events" className="btn btn-ghost btn-sm">View all <ArrowRight /></Link>
          </div>
          <div className="list">
            {upcoming.length === 0 && <div className="empty">No upcoming events</div>}
            {upcoming.map((e, i) => {
              const dt = new Date(e.date + 'T00:00:00')
              const venue = byId(d.venues, e.venueId)
              const regs = d.registrations.filter((r) => r.eventId === e.id && r.status !== 'Cancelled').length
              return (
                <div className="list-item" key={e.id} style={{ '--i': i }}>
                  <div className="date-chip">
                    <b>{dt.getDate()}</b>
                    <span>{dt.toLocaleString('en', { month: 'short' })}</span>
                  </div>
                  <div className="list-grow">
                    <div className="list-title">{e.title}</div>
                    <div className="list-sub">
                      <MapPin size={11} style={{ verticalAlign: -1 }} /> {venue?.name} · {e.startTime}–{e.endTime} · {regs}/{e.maxParticipants} registered
                    </div>
                  </div>
                  <Badge>{e.status}</Badge>
                </div>
              )
            })}
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3>Attendance &amp; events by category</h3></div>
          <div className="card-body">
            <AttendanceRing rate={attendanceRate} present={present} total={d.attendance.length} />
            {byCategory.map((c, i) => (
              <div className="bar-row" key={c.id} style={{ '--i': i }}>
                <span>{c.name}</span>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${(c.count / maxCount) * 100}%` }} />
                </div>
                <span className="bar-count">{c.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header"><h3><TrendingUp size={16} style={{ verticalAlign: -3 }} /> Registrations, last 8 weeks</h3><span className="td-muted">{d.registrations.length} total</span></div>
          <div className="card-body"><TrendChart regs={d.registrations} /></div>
        </div>
        <div className="card">
          <div className="card-header"><h3><Activity size={16} style={{ verticalAlign: -3 }} /> Live activity</h3><span className="badge badge-success live-badge"><span className="live-dot" /> live</span></div>
          <div className="feed-list dash-feed">
            {feed.length === 0 && <div className="empty">No activity yet</div>}
            {feed.map((a, i) => {
              const Icon = { created: PlusIc, updated: Pencil, deleted: Trash2, login: LogIn }[a.action] || Activity
              return (
                <div key={a.id} className={`feed-item act-${a.action}`} style={{ '--i': i }}>
                  <div className="feed-icon"><Icon size={13} /></div>
                  <div className="feed-text"><div>{describeActivity(a)}</div><span>{timeAgo(a.createdAt)}</span></div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <h3>Recent registrations</h3>
            <Link to="/registrations" className="btn btn-ghost btn-sm">View all <ArrowRight /></Link>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Student</th><th>Event</th><th>Date</th><th>Status</th></tr>
              </thead>
              <tbody>
                {recentRegs.map((r, i) => {
                  const s = byId(d.students, r.studentId)
                  const e = byId(d.events, r.eventId)
                  return (
                    <tr key={r.id} className="row-anim" style={{ '--i': i + 4 }}>
                      <td><Person name={s?.name} sub={s?.rollNo} /></td>
                      <td className="td-strong">{e?.title}</td>
                      <td className="td-muted">{formatDate(r.registeredOn)}</td>
                      <td><Badge>{r.status}</Badge></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Latest feedback</h3>
            <Link to="/feedback" className="btn btn-ghost btn-sm">View all <ArrowRight /></Link>
          </div>
          <div className="list">
            {recentFeedback.map((f, i) => {
              const s = byId(d.students, f.studentId)
              const e = byId(d.events, f.eventId)
              return (
                <div className="list-item" key={f.id} style={{ alignItems: 'flex-start', '--i': i + 4 }}>
                  <div className="list-grow">
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <span className="list-title">{e?.title}</span>
                      <Stars value={f.rating} />
                    </div>
                    <div style={{ color: 'var(--text-2)', margin: '4px 0', lineHeight: 1.5 }}>“{f.comments}”</div>
                    <div className="list-sub">{s?.name} · {formatDate(f.submittedOn)}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}

function AttendanceRing({ rate, present, total }) {
  const r = 40
  const len = 2 * Math.PI * r
  return (
    <div className="ring-wrap">
      <div className="ring-box">
        <svg className="ring" viewBox="0 0 100 100" style={{ '--ring-len': len }}>
          <circle className="track" cx="50" cy="50" r={r} />
          <circle className="val" cx="50" cy="50" r={r} strokeDasharray={len} strokeDashoffset={len * (1 - rate / 100)} />
        </svg>
        <div className="ring-num"><Counter value={rate} />%</div>
      </div>
      <div className="ring-legend">
        <div><b>Attendance rate</b></div>
        <div><b>{present}</b> present of <b>{total}</b> marked</div>
        <div className="td-muted">Across all completed &amp; ongoing events</div>
      </div>
    </div>
  )
}

function Counter({ value }) {
  return useCountUp(value)
}

/** Weekly registrations as an animated area chart (pure SVG). */
function TrendChart({ regs }) {
  const W = 560, H = 190, P = 26
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const end = new Date(); end.setHours(0, 0, 0, 0); end.setDate(end.getDate() - (7 - i) * 7)
    const start = new Date(end); start.setDate(start.getDate() - 6)
    const iso = (x) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
    const n = regs.filter((r) => r.registeredOn >= iso(start) && r.registeredOn <= iso(end)).length
    return { n, label: end.toLocaleDateString('en', { day: 'numeric', month: 'short' }) }
  })
  // shift so the final bucket ends today
  const max = Math.max(1, ...weeks.map((w) => w.n))
  const x = (i) => P + (i * (W - P * 2)) / (weeks.length - 1)
  const y = (n) => H - P - (n / max) * (H - P * 2)
  const line = weeks.map((w, i) => `${i ? 'L' : 'M'}${x(i)},${y(w.n)}`).join(' ')
  const area = `${line} L${x(weeks.length - 1)},${H - P} L${x(0)},${H - P} Z`
  return (
    <svg className="trend" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Weekly registrations">
      <defs>
        <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--primary)" stopOpacity=".16" /><stop offset="100%" stopColor="var(--primary)" stopOpacity="0" /></linearGradient>
      </defs>
      {[0, 0.5, 1].map((t) => <line key={t} x1={P} x2={W - P} y1={y(max * t)} y2={y(max * t)} className="trend-grid" />)}
      <path d={area} fill="url(#trendFill)" className="trend-area" />
      <path d={line} fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="trend-line" pathLength="1" />
      {weeks.map((w, i) => (
        <g key={i} className="trend-pt" style={{ '--i': i }}>
          <circle cx={x(i)} cy={y(w.n)} r="5" />
          <text x={x(i)} y={y(w.n) - 11} textAnchor="middle" className="trend-val">{w.n}</text>
          <text x={x(i)} y={H - 6} textAnchor="middle" className="trend-lbl">{w.label}</text>
        </g>
      ))}
    </svg>
  )
}
