import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Compass, Ticket, CheckCircle2, Star, CalendarDays, MapPin, Clock, XCircle, Sparkles, ArrowRight,
  PartyPopper, AlertTriangle, Hourglass, MessageSquareHeart, RotateCcw,
} from 'lucide-react'
import { api, loadMany } from '../services/api.js'
import { useAuth } from '../auth/AuthContext.jsx'
import { PageHero, Loading, Badge, Stars, CategoryIcon, Modal, Toasts, RatingInput, Empty } from '../components/ui.jsx'
import { byId, formatDate, categoryTheme, gradient, daysUntil, greeting, firstName } from '../utils/helpers.js'

export default function Portal() {
  const { user } = useAuth()
  const [d, setD] = useState(null)
  const [toasts, setToasts] = useState([])
  const [busy, setBusy] = useState(null)
  const [rating, setRating] = useState(null) // event being rated
  const [confirmCancel, setConfirmCancel] = useState(null)

  const toast = (message, type = 'success') => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, message, type }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600)
  }
  const load = useCallback(() => loadMany(['events', 'registrations', 'attendance', 'feedback', 'categories', 'venues', 'students']).then(setD), [])
  useEffect(() => { load() }, [load])

  if (!d) return <Loading />
  const sid = user.studentId
  const me = byId(d.students, sid)
  const myRegs = d.registrations.filter((r) => r.studentId === sid)
  const regFor = (eid) => myRegs.find((r) => r.eventId === eid)
  const active = myRegs.filter((r) => r.status !== 'Cancelled')
  const attended = d.attendance.filter((a) => a.studentId === sid && a.status === 'Present')
  const myFb = d.feedback.filter((f) => f.studentId === sid)
  const toRate = attended.filter((a) => !myFb.some((f) => f.eventId === a.eventId)).map((a) => byId(d.events, a.eventId)).filter(Boolean)
  const discover = d.events.filter((e) => (e.status === 'Upcoming' || e.status === 'Ongoing')).sort((a, b) => a.date.localeCompare(b.date))
  const mine = active.map((r) => ({ r, e: byId(d.events, r.eventId) })).filter((x) => x.e).sort((a, b) => a.e.date.localeCompare(b.e.date))
  const nextUp = mine.find((x) => x.e.status === 'Upcoming' || x.e.status === 'Ongoing')

  async function register(e) {
    setBusy(e.id)
    try {
      const existing = regFor(e.id)
      const r = existing ? await api.update('registrations', existing.id, { status: 'Confirmed' }) : await api.create('registrations', { eventId: e.id })
      toast(r.status === 'Waitlisted' ? `${e.title} is full, so you're on the waitlist` : `🎉 You're registered for ${e.title}!`)
      await load()
    } catch (err) { toast(err.fields ? Object.values(err.fields)[0] : err.message, 'error') }
    setBusy(null)
  }
  async function cancel(r) {
    setBusy(r.eventId)
    try {
      await api.update('registrations', r.id, { status: 'Cancelled' })
      toast('Registration cancelled', 'info')
      await load()
    } catch (err) { toast(err.message, 'error') }
    setBusy(null)
    setConfirmCancel(null)
  }

  return (
    <>
      <PageHero
        icon={Compass} tone="indigo"
        title={`${greeting()}, ${firstName(user.name)} 👋`}
        subtitle={me ? `${me.department} · Year ${me.year} · ${me.rollNo}` : 'Welcome to your student portal'}
        stats={[
          { label: 'Registered', value: active.length, icon: Ticket },
          { label: 'Attended', value: attended.length, icon: CheckCircle2 },
          { label: 'Reviews given', value: myFb.length, icon: Star },
          { label: 'Next event', value: nextUp ? (daysUntil(nextUp.e.date) <= 0 ? 'Today' : `${daysUntil(nextUp.e.date)}d`) : '—', icon: Hourglass },
        ]}
      />

      {!sid && (
        <div className="notice"><AlertTriangle size={18} /> Your account isn’t linked to a student record yet, so registration is disabled. Ask an admin to link it on the Users page.</div>
      )}

      {toRate.length > 0 && (
        <section className="rate-banner">
          <MessageSquareHeart size={22} />
          <div><b>How was it?</b> You attended {toRate.length} event{toRate.length > 1 ? 's' : ''} you haven’t rated yet.</div>
          <div className="rate-banner-list">
            {toRate.map((e) => <button key={e.id} className="btn btn-white btn-sm" onClick={() => setRating(e)}><Star /> Rate {e.title}</button>)}
          </div>
        </section>
      )}

      <div className="section-head">
        <h2><Sparkles size={18} /> Discover events</h2>
        <Link to="/events" className="btn btn-ghost btn-sm">Browse all <ArrowRight /></Link>
      </div>
      {discover.length === 0 && <div className="card"><Empty text="No upcoming events right now. Check back soon!" /></div>}
      <div className="discover">
        {discover.map((e, i) => {
          const t = categoryTheme(byId(d.categories, e.categoryId)?.name)
          const reg = regFor(e.id)
          const isIn = reg && reg.status !== 'Cancelled'
          const seats = d.registrations.filter((r) => r.eventId === e.id && r.status === 'Confirmed').length
          const left = Math.max(0, e.maxParticipants - seats)
          const dd = daysUntil(e.date)
          return (
            <article key={e.id} className={`disc-card ${isIn ? 'joined' : ''}`} style={{ '--i': i }}>
              <div className="disc-cover" style={{ '--c1': t.color }}>
                <CategoryIcon name={t.icon} size={64} className="disc-icon" />
                <span className="disc-when">{e.status === 'Ongoing' ? 'Live now' : dd === 0 ? 'Today' : dd === 1 ? 'Tomorrow' : `In ${dd} days`}</span>
                {isIn && <span className="disc-joined"><CheckCircle2 size={14} /> {reg.status === 'Waitlisted' ? 'Waitlisted' : 'Going'}</span>}
              </div>
              <div className="disc-body">
                <h3>{e.title}</h3>
                <p>{e.description}</p>
                <div className="ev-meta"><CalendarDays size={13} /> {formatDate(e.date)} <Clock size={13} /> {e.startTime}</div>
                <div className="ev-meta"><MapPin size={13} /> {byId(d.venues, e.venueId)?.name}</div>
                <div className="disc-foot">
                  <span className={left <= 5 ? 'hot' : 'td-muted'}>{left === 0 ? 'Full, waitlist open' : `${left} seats left`}</span>
                  {isIn ? (
                    <button className="btn btn-ghost btn-sm" disabled={busy === e.id} onClick={() => setConfirmCancel(reg)}><XCircle /> Cancel</button>
                  ) : (
                    <button className="btn btn-primary btn-sm" disabled={!sid || busy === e.id} onClick={() => register(e)}>
                      {busy === e.id ? <span className="btn-spinner" /> : reg ? <RotateCcw /> : <Ticket />} {reg ? 'Re-join' : 'Register'}
                    </button>
                  )}
                </div>
              </div>
            </article>
          )
        })}
      </div>

      <div className="grid-2 portal-grid">
        <div className="card">
          <div className="card-header"><h3>My schedule</h3><span className="td-muted">{mine.length} event{mine.length === 1 ? '' : 's'}</span></div>
          {mine.length === 0 ? <Empty text="You haven't registered for anything yet" /> : (
            <ol className="schedule">
              {mine.map(({ r, e }, i) => {
                const t = categoryTheme(byId(d.categories, e.categoryId)?.name)
                const dt = new Date(e.date + 'T00:00:00')
                return (
                  <li key={r.id} style={{ '--i': i, '--c1': t.from }} className={e.status === 'Completed' ? 'past' : ''}>
                    <div className="date-chip" style={{ '--c1': t.color }}><b>{dt.getDate()}</b><span>{dt.toLocaleString('en', { month: 'short' })}</span></div>
                    <div className="list-grow">
                      <div className="list-title">{e.title}</div>
                      <div className="list-sub">{e.startTime}–{e.endTime} · {byId(d.venues, e.venueId)?.name}</div>
                    </div>
                    <Badge>{e.status === 'Completed' ? 'Completed' : r.status}</Badge>
                  </li>
                )
              })}
            </ol>
          )}
        </div>
        <div className="card">
          <div className="card-header"><h3>My reviews</h3><span className="td-muted">{myFb.length}</span></div>
          {myFb.length === 0 ? <Empty text="Reviews you write will appear here" /> : (
            <div className="list">
              {myFb.map((f, i) => (
                <div className="list-item" key={f.id} style={{ '--i': i, alignItems: 'flex-start' }}>
                  <div className="list-grow">
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="list-title">{byId(d.events, f.eventId)?.title}</span><Stars value={f.rating} /></div>
                    <div style={{ color: 'var(--text-2)', marginTop: 4 }}>“{f.comments}”</div>
                    <div className="list-sub">{formatDate(f.submittedOn)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {rating && <RateModal event={rating} onClose={() => setRating(null)} onDone={async () => { setRating(null); toast('Thanks for your feedback! 💜'); await load() }} />}
      {confirmCancel && (
        <Modal title="Cancel registration?" width={420} onClose={() => setConfirmCancel(null)}
          footer={<><button className="btn btn-ghost" onClick={() => setConfirmCancel(null)}>Keep my seat</button><button className="btn btn-danger" onClick={() => cancel(confirmCancel)}><XCircle /> Cancel registration</button></>}>
          <p style={{ margin: 0, color: 'var(--text-2)', lineHeight: 1.6 }}>Your seat for <b>{byId(d.events, confirmCancel.eventId)?.title}</b> will be released. You can re-join later if seats are still available.</p>
        </Modal>
      )}
      <Toasts items={toasts} />
    </>
  )
}

function RateModal({ event, onClose, onDone }) {
  const [rating, setRating] = useState(5)
  const [comments, setComments] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit() {
    if (comments.trim().length < 10) { setErr('Please write at least 10 characters'); return }
    setBusy(true)
    try { await api.create('feedback', { eventId: event.id, rating, comments: comments.trim() }); onDone() }
    catch (e) { setErr(e.fields ? Object.values(e.fields)[0] : e.message); setBusy(false) }
  }
  const labels = ['', 'Disappointed', 'Not great', 'It was okay', 'Liked it', 'Loved it!']
  return (
    <Modal title={`Rate ${event.title}`} width={480} onClose={onClose}
      footer={<><button className="btn btn-ghost" onClick={onClose}>Later</button><button className="btn btn-primary" disabled={busy} onClick={submit}>{busy ? <span className="btn-spinner" /> : <PartyPopper />} Submit review</button></>}>
      <div className="rate-modal">
        <RatingInput value={rating} onChange={setRating} />
        <div className="rate-label" key={rating}>{labels[rating]}</div>
        <div className={`field ${err ? 'invalid' : ''}`}>
          <label htmlFor="cm">Tell us more</label>
          <textarea id="cm" value={comments} maxLength={300} onChange={(e) => { setComments(e.target.value); setErr('') }} placeholder="What did you enjoy? What could be better?" />
          {err ? <div className="field-error">{err}</div> : <div className="field-hint">{comments.length}/300</div>}
        </div>
      </div>
    </Modal>
  )
}
