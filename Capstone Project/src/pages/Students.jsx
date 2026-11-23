import { Users, IdCard, GraduationCap, Building2, ClipboardList, CheckCircle2, MessageSquareText, Mail, Phone, Pencil, Trash2, Award } from 'lucide-react'
import EntityPage from '../components/EntityPage.jsx'
import { Person, Badge, Empty, Stars } from '../components/ui.jsx'
import { isUnique, isPhone } from '../utils/validate.js'
import { byId, colorFor, initials, formatDate } from '../utils/helpers.js'

const DEPARTMENTS = ['Computer Science', 'Electronics', 'Mechanical', 'Civil', 'Electrical', 'Information Science']
const DEPT_COLOR = { 'Computer Science': '#4f46e5', Electronics: '#0369a1', Mechanical: '#a16207', Civil: '#15803d', Electrical: '#9f1239', 'Information Science': '#6d28d9' }

function history(s, lk) {
  const regs = (lk.registrations || []).filter((r) => r.studentId === s.id)
  const att = (lk.attendance || []).filter((a) => a.studentId === s.id)
  const fb = (lk.feedback || []).filter((f) => f.studentId === s.id)
  return { regs, att, fb, present: att.filter((a) => a.status === 'Present').length }
}

function Insights(rows) {
  const total = Math.max(1, rows.length)
  const byDept = DEPARTMENTS.map((d) => ({ d, n: rows.filter((s) => s.department === d).length })).filter((x) => x.n)
  const byYear = [1, 2, 3, 4].map((y) => ({ y, n: rows.filter((s) => s.year === y).length }))
  const maxY = Math.max(1, ...byYear.map((x) => x.n))
  return (
    <div className="insight-grid two">
      <div className="card insight">
        <div className="insight-title">Students by department</div>
        <div className="stack-bar">
          {byDept.map((x, i) => <span key={x.d} style={{ width: `${(x.n / total) * 100}%`, background: DEPT_COLOR[x.d], '--i': i }} title={`${x.d}: ${x.n}`} />)}
        </div>
        <div className="dept-rows">
          {byDept.map((x, i) => (
            <div className="bar-row" key={x.d} style={{ '--i': i }}>
              <span className="dept"><i style={{ background: DEPT_COLOR[x.d] }} />{x.d}</span>
              <div className="bar-track"><div className="bar-fill" style={{ width: `${(x.n / total) * 100}%`, background: DEPT_COLOR[x.d], '--i': i }} /></div>
              <span className="bar-count">{Math.round((x.n / total) * 100)}%</span>
            </div>
          ))}
        </div>
      </div>
      <div className="card insight">
        <div className="insight-title">Year of study</div>
        <div className="columns">
          {byYear.map((x, i) => (
            <div key={x.y} className="column">
              <div className="column-bar"><span style={{ height: `${(x.n / maxY) * 100}%`, '--i': i }}><b>{x.n}</b></span></div>
              <em>Year {x.y}</em>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function IdCards({ rows, lk, editable, edit, remove, open }) {
  if (!rows.length) return <Empty text="No students match" />
  return (
    <div className="id-grid">
      {rows.map((s, i) => {
        const h = history(s, lk)
        const c = DEPT_COLOR[s.department] || colorFor(s.department)
        return (
          <article key={s.id} className="id-card" style={{ '--i': i, '--c': c }} onClick={() => open(s)}>
            <div className="id-strip"><GraduationCap size={14} /> CampusEvents · Student ID</div>
            <div className="id-main">
              <div className="id-photo" style={{ '--av': colorFor(s.name) }}>{initials(s.name)}</div>
              <div className="id-info">
                <h3>{s.name}</h3>
                <code>{s.rollNo}</code>
                <span>{s.department} · Year {s.year}</span>
              </div>
            </div>
            <div className="id-stats">
              <div><ClipboardList size={13} /><b>{h.regs.length}</b> regs</div>
              <div><CheckCircle2 size={13} /><b>{h.present}</b> attended</div>
              <div><MessageSquareText size={13} /><b>{h.fb.length}</b> reviews</div>
            </div>
            <div className="id-foot" onClick={(e) => e.stopPropagation()}>
              <a href={`mailto:${s.email}`} className="btn-icon" title={s.email}><Mail /></a>
              {s.phone && <a href={`tel:${s.phone.replace(/\s/g, '')}`} className="btn-icon" title={s.phone}><Phone /></a>}
              <span className="id-barcode" aria-hidden="true">{Array.from({ length: 22 }).map((_, k) => <i key={k} style={{ width: ((s.id * 7 + k * 13) % 3) + 1 }} />)}</span>
              {editable && <button className="btn-icon" onClick={() => edit(s)} title="Edit"><Pencil /></button>}
              {editable && <button className="btn-icon danger" onClick={() => remove(s)} title="Delete"><Trash2 /></button>}
            </div>
          </article>
        )
      })}
    </div>
  )
}

function StudentDetail(s, lk) {
  const h = history(s, lk)
  const timeline = [
    ...h.regs.map((r) => ({ date: r.registeredOn, kind: 'reg', r })),
    ...h.att.map((a) => ({ date: byId(lk.events, a.eventId)?.date, kind: 'att', a })),
    ...h.fb.map((f) => ({ date: f.submittedOn, kind: 'fb', f })),
  ].sort((a, b) => String(b.date).localeCompare(String(a.date)))
  const rate = h.att.length ? Math.round((h.present / h.att.length) * 100) : null
  return (
    <>
      <div className="profile-head" style={{ '--c': DEPT_COLOR[s.department] || '#6366f1' }}>
        <div className="id-photo big" style={{ '--av': colorFor(s.name) }}>{initials(s.name)}</div>
        <div>
          <code>{s.rollNo}</code>
          <div className="td-muted">{s.department} · Year {s.year}</div>
          <div className="profile-links"><a href={`mailto:${s.email}`}><Mail size={13} /> {s.email}</a>{s.phone && <a href={`tel:${s.phone}`}><Phone size={13} /> {s.phone}</a>}</div>
        </div>
      </div>
      <div className="mini-stats">
        <div className="mini-stat"><b>{h.regs.filter((r) => r.status !== 'Cancelled').length}</b><span>Registrations</span></div>
        <div className="mini-stat"><b>{rate === null ? '—' : `${rate}%`}</b><span>Attendance</span></div>
        <div className="mini-stat"><b>{h.fb.length}</b><span>Reviews</span></div>
      </div>
      {h.present >= 2 && <div className="achievement"><Award size={16} /> Active participant: attended {h.present} events</div>}
      <div className="section-title">Activity timeline</div>
      {timeline.length === 0 && <div className="td-muted">No participation yet.</div>}
      <ol className="timeline">
        {timeline.map((t, i) => {
          if (t.kind === 'reg') {
            const e = byId(lk.events, t.r.eventId)
            return <li key={`r${t.r.id}`} className="tl-reg" style={{ '--i': i }}><b>Registered</b> for {e?.title} <Badge>{t.r.status}</Badge><span>{formatDate(t.date)}</span></li>
          }
          if (t.kind === 'att') {
            const e = byId(lk.events, t.a.eventId)
            return <li key={`a${t.a.id}`} className={t.a.status === 'Present' ? 'tl-ok' : 'tl-miss'} style={{ '--i': i }}><b>{t.a.status === 'Present' ? 'Checked in' : 'Missed'}</b> {e?.title}{t.a.checkInTime && ` at ${t.a.checkInTime}`}<span>{formatDate(t.date)}</span></li>
          }
          const e = byId(lk.events, t.f.eventId)
          return <li key={`f${t.f.id}`} className="tl-fb" style={{ '--i': i }}><b>Reviewed</b> {e?.title} <Stars value={t.f.rating} /><q>{t.f.comments}</q><span>{formatDate(t.date)}</span></li>
        })}
      </ol>
    </>
  )
}

export default function Students() {
  return (
    <EntityPage
      title="Students"
      subtitle="Student records that can register for and attend events. Click a student for their full history."
      resource="students"
      lookups={['registrations', 'attendance', 'feedback', 'events']}
      hero={{
        icon: Users, tone: 'blue',
        stats: (rows, lk) => {
          const active = new Set((lk.registrations || []).filter((r) => r.status !== 'Cancelled').map((r) => r.studentId))
          return [
            { label: 'Students', value: rows.length, icon: Users },
            { label: 'Departments', value: new Set(rows.map((s) => s.department)).size, icon: Building2 },
            { label: 'Active in events', value: active.size, icon: ClipboardList },
            { label: 'Final-year', value: rows.filter((s) => s.year === 4).length, icon: GraduationCap },
          ]
        },
      }}
      insights={(rows) => Insights(rows)}
      bulkActions={[{ key: 'mail', label: 'Email selected', icon: Mail, run: (list) => { window.location.href = `mailto:?bcc=${list.map((s) => s.email).join(',')}` } }]}
      rowActions={[{ key: 'mail', label: 'Send email', icon: Mail, run: (s) => { window.location.href = `mailto:${s.email}` } }]}
      views={[{ key: 'cards', label: 'ID cards', icon: IdCard, render: (ctx) => <IdCards {...ctx} /> }]}
      detail={StudentDetail}
      detailTitle={(s) => s.name}
      searchIn={(s) => `${s.name} ${s.rollNo} ${s.email} ${s.department}`}
      defaults={{ year: 1 }}
      filters={[
        { key: 'department', label: 'Department', options: DEPARTMENTS.map((d) => ({ value: d, label: d })) },
        { key: 'year', label: 'Year', options: [1, 2, 3, 4].map((y) => ({ value: y, label: `Year ${y}` })) },
      ]}
      columns={[
        { key: 'name', label: 'Student', render: (s) => <Person name={s.name} sub={s.email} />, csv: (s) => `${s.name} <${s.email}>` },
        { key: 'rollNo', label: 'Roll No', render: (s) => <code className="roll">{s.rollNo}</code> },
        { key: 'department', label: 'Department', render: (s) => <span className="dept"><i style={{ background: DEPT_COLOR[s.department] }} />{s.department}</span> },
        { key: 'year', label: 'Year', render: (s) => <Badge tone="neutral">Year {s.year}</Badge> },
        { key: 'events', label: 'Events', render: (s, lk) => history(s, lk).regs.filter((r) => r.status !== 'Cancelled').length, sortValue: (s, lk) => history(s, lk).regs.length, csv: (s, lk) => history(s, lk).regs.length },
        { key: 'phone', label: 'Phone', render: (s) => <span className="td-muted">{s.phone || '—'}</span>, sortable: false },
      ]}
      fields={[
        { name: 'name', label: 'Full name', required: true, minLength: 3, maxLength: 60, placeholder: 'e.g. Aarav Sharma', pattern: /^[A-Za-z .'-]+$/, patternMessage: 'Only letters, spaces and . \' - allowed' },
        { name: 'rollNo', label: 'Roll number', required: true, placeholder: 'CS21001', pattern: /^[A-Z]{2}\d{5}$/i, patternMessage: 'Format: 2 letters + 5 digits (e.g. CS21001)', hint: 'Department code + year + serial' },
        { name: 'email', label: 'Email', type: 'email', required: true, placeholder: 'name@college.edu' },
        { name: 'phone', label: 'Phone', placeholder: '10-digit mobile number' },
        { name: 'department', label: 'Department', type: 'select', required: true, options: DEPARTMENTS.map((d) => ({ value: d, label: d })) },
        { name: 'year', label: 'Year of study', type: 'select-id', required: true, options: [1, 2, 3, 4].map((y) => ({ value: y, label: `Year ${y}` })) },
      ]}
      validate={(f, { rows, editing }) => {
        const errs = {}
        if (f.rollNo && !isUnique(rows, 'rollNo', f.rollNo, editing?.id)) errs.rollNo = 'A student with this roll number already exists'
        if (f.email && !isUnique(rows, 'email', f.email, editing?.id)) errs.email = 'This email is already registered'
        if (f.phone && !isPhone(f.phone)) errs.phone = 'Enter a valid 10-digit phone number'
        return errs
      }}
    />
  )
}
