import { MessageSquareText, Quote, Star, ThumbsUp, Smile, Trophy, Pencil, Trash2 } from 'lucide-react'
import EntityPage from '../components/EntityPage.jsx'
import { Person, Stars, Empty, Avatar } from '../components/ui.jsx'
import { byId, formatDate, todayISO, categoryTheme } from '../utils/helpers.js'
import { isPairUnique } from '../utils/validate.js'

const MOOD = { 5: 'Loved it', 4: 'Liked it', 3: 'It was okay', 2: 'Not great', 1: 'Disappointed' }

function Insights(rows, lk) {
  const n = rows.length
  const avg = n ? rows.reduce((s, f) => s + f.rating, 0) / n : 0
  const dist = [5, 4, 3, 2, 1].map((r) => ({ r, c: rows.filter((f) => f.rating === r).length }))
  const maxC = Math.max(1, ...dist.map((d) => d.c))
  const perEvent = (lk.events || []).map((e) => {
    const fb = rows.filter((f) => f.eventId === e.id)
    return { e, n: fb.length, avg: fb.length ? fb.reduce((s, f) => s + f.rating, 0) / fb.length : 0 }
  }).filter((x) => x.n).sort((a, b) => b.avg - a.avg || b.n - a.n)
  const best = perEvent[0]
  return (
    <div className="insight-grid fb-insights">
      <div className="card insight score-card">
        <div className="score-big">{avg.toFixed(1)}</div>
        <Stars value={Math.round(avg)} />
        <span className="td-muted">{n} review{n === 1 ? '' : 's'}</span>
      </div>
      <div className="card insight">
        <div className="insight-title">Rating breakdown</div>
        {dist.map((d, i) => (
          <div className="dist-row" key={d.r} style={{ '--i': i }}>
            <span>{d.r} ★</span>
            <div className="bar-track"><div className={`bar-fill r${d.r}`} style={{ width: `${(d.c / maxC) * 100}%`, '--i': i }} /></div>
            <b>{d.c}</b>
          </div>
        ))}
      </div>
      <div className="card insight best-card">
        <div className="insight-title"><Trophy size={14} /> Most loved event</div>
        {best ? (
          <>
            <h3>{best.e.title}</h3>
            <div className="best-score"><Stars value={Math.round(best.avg)} /> <b>{best.avg.toFixed(1)}</b> <span>from {best.n} review{best.n === 1 ? '' : 's'}</span></div>
            <div className="best-list">
              {perEvent.slice(1, 4).map((x) => <div key={x.e.id}><span>{x.e.title}</span><b>{x.avg.toFixed(1)}</b></div>)}
            </div>
          </>
        ) : <span className="td-muted">No reviews yet</span>}
      </div>
    </div>
  )
}

function Reviews({ rows, lk, editable, edit, remove }) {
  if (!rows.length) return <Empty text="No reviews match" />
  return (
    <div className="review-grid">
      {rows.map((f, i) => {
        const s = byId(lk.students, f.studentId)
        const e = byId(lk.events, f.eventId)
        const t = categoryTheme(byId(lk.categories, e?.categoryId)?.name)
        return (
          <article key={f.id} className={`review r${f.rating}`} style={{ '--i': i, '--c1': t.from, '--c2': t.to }}>
            <Quote className="review-quote" size={34} />
            <div className="review-top">
              <Stars value={f.rating} />
              <span className="mood">{MOOD[f.rating]}</span>
            </div>
            <p>{f.comments}</p>
            <div className="review-event">{e?.title}</div>
            <div className="review-foot">
              <Avatar name={s?.name || '?'} size={30} />
              <div><b>{s?.name}</b><span>{s?.department} · {formatDate(f.submittedOn)}</span></div>
              {editable && (
                <div className="review-actions">
                  <button className="btn-icon" onClick={() => edit(f)} title="Edit"><Pencil /></button>
                  <button className="btn-icon danger" onClick={() => remove(f)} title="Delete"><Trash2 /></button>
                </div>
              )}
            </div>
          </article>
        )
      })}
    </div>
  )
}

export default function Feedback() {
  return (
    <EntityPage
      title="Feedback"
      singular="Feedback"
      subtitle="Ratings and comments collected from students after events."
      resource="feedback"
      lookups={['students', 'events', 'attendance', 'categories']}
      hero={{
        icon: MessageSquareText, tone: 'orange',
        stats: (rows) => {
          const avg = rows.length ? (rows.reduce((s, f) => s + f.rating, 0) / rows.length).toFixed(1) : '—'
          return [
            { label: 'Average rating', value: avg, icon: Star },
            { label: 'Reviews', value: rows.length, icon: MessageSquareText },
            { label: '5-star reviews', value: rows.filter((f) => f.rating === 5).length, icon: Smile },
            { label: 'Satisfied (4★+)', value: `${rows.length ? Math.round((rows.filter((f) => f.rating >= 4).length / rows.length) * 100) : 0}%`, icon: ThumbsUp },
          ]
        },
      }}
      insights={Insights}
      views={[{ key: 'reviews', label: 'Reviews', icon: Quote, render: (ctx) => <Reviews {...ctx} /> }]}
      searchIn={(f, lk) => `${byId(lk.students, f.studentId)?.name} ${byId(lk.events, f.eventId)?.title} ${f.comments}`}
      defaults={{ rating: 5, submittedOn: todayISO() }}
      filters={[
        { key: 'rating', label: 'Rating', options: [5, 4, 3, 2, 1].map((n) => ({ value: n, label: `${n} star${n > 1 ? 's' : ''}` })) },
        { key: 'eventId', label: 'Event', optionsFrom: (lk) => lk.events?.map((e) => ({ value: e.id, label: e.title })) },
      ]}
      columns={[
        { key: 'eventId', label: 'Event', render: (f, lk) => <span className="td-strong">{byId(lk.events, f.eventId)?.title || '—'}</span>, sortValue: (f, lk) => byId(lk.events, f.eventId)?.title, csv: (f, lk) => byId(lk.events, f.eventId)?.title },
        { key: 'studentId', label: 'Student', render: (f, lk) => { const s = byId(lk.students, f.studentId); return <Person name={s?.name || 'Unknown'} sub={s?.department} /> }, sortValue: (f, lk) => byId(lk.students, f.studentId)?.name, csv: (f, lk) => byId(lk.students, f.studentId)?.name },
        { key: 'rating', label: 'Rating', render: (f) => <Stars value={f.rating} /> },
        { key: 'comments', label: 'Comments', render: (f) => <span style={{ color: 'var(--text-2)' }}>{f.comments}</span>, sortable: false },
        { key: 'submittedOn', label: 'Submitted', render: (f) => <span className="td-muted">{formatDate(f.submittedOn)}</span> },
      ]}
      fields={[
        { name: 'eventId', label: 'Event', type: 'select-id', required: true, optionsFrom: (lk) => lk.events?.filter((e) => e.status === 'Completed' || e.status === 'Ongoing').map((e) => ({ value: e.id, label: e.title })), hint: 'Feedback can be given only for ongoing or completed events' },
        { name: 'studentId', label: 'Student', type: 'select-id', required: true, optionsFrom: (lk) => lk.students?.map((s) => ({ value: s.id, label: `${s.name} (${s.rollNo})` })) },
        { name: 'rating', label: 'Rating (1–5)', type: 'select-id', required: true, options: [5, 4, 3, 2, 1].map((n) => ({ value: n, label: `${'★'.repeat(n)}${'☆'.repeat(5 - n)}  ${n}` })) },
        { name: 'submittedOn', label: 'Submitted on', type: 'date', required: true },
        { name: 'comments', label: 'Comments', type: 'textarea', full: true, required: true, minLength: 10, maxLength: 300, hint: '10 to 300 characters' },
      ]}
      validate={(f, { rows, lookups, editing }) => {
        const errs = {}
        if (f.studentId && f.eventId) {
          if (!isPairUnique(rows, { studentId: f.studentId, eventId: f.eventId }, editing?.id)) errs.studentId = 'This student has already submitted feedback for this event'
          const attended = (lookups.attendance || []).some((a) => a.studentId === f.studentId && a.eventId === f.eventId && a.status === 'Present')
          if (!attended && !errs.studentId) errs.studentId = 'Only students marked Present can give feedback for this event'
        }
        const ev = byId(lookups.events, f.eventId)
        if (ev && f.submittedOn && f.submittedOn < ev.date) errs.submittedOn = 'Feedback cannot be submitted before the event date'
        if (f.submittedOn && f.submittedOn > todayISO()) errs.submittedOn = 'Date cannot be in the future'
        return errs
      }}
    />
  )
}
