import { UserCog, Users, Mail, Phone, Pencil, Trash2, CalendarDays, Star, Building } from 'lucide-react'
import EntityPage from '../components/EntityPage.jsx'
import { Person, Empty, Stars } from '../components/ui.jsx'
import { isUnique, isPhone } from '../utils/validate.js'
import { colorFor, initials } from '../utils/helpers.js'

function stats(o, lk) {
  const evs = (lk.events || []).filter((e) => e.organizerId === o.id)
  const fb = (lk.feedback || []).filter((f) => evs.some((e) => e.id === f.eventId))
  const regs = (lk.registrations || []).filter((r) => r.status !== 'Cancelled' && evs.some((e) => e.id === r.eventId))
  const avg = fb.length ? fb.reduce((s, f) => s + f.rating, 0) / fb.length : 0
  return { evs, avg, regs: regs.length, reviews: fb.length }
}

function ProfileCards({ rows, lk, editable, edit, remove }) {
  if (!rows.length) return <Empty text="No organizers match" />
  return (
    <div className="org-grid">
      {rows.map((o, i) => {
        const st = stats(o, lk)
        const c = colorFor(o.name)
        return (
          <article key={o.id} className="org-card" style={{ '--i': i, '--c': c }}>
            <div className="org-banner" />
            <div className="org-avatar" style={{ background: c }}>{initials(o.name)}</div>
            <h3>{o.name}</h3>
            <div className="org-dept"><Building size={12} /> {o.department}</div>
            <div className="org-rating">{st.reviews ? <><Stars value={Math.round(st.avg)} /> <b>{st.avg.toFixed(1)}</b> <span>({st.reviews})</span></> : <span className="td-muted">No reviews yet</span>}</div>
            <div className="org-stats">
              <div><b>{st.evs.length}</b><span>Events</span></div>
              <div><b>{st.regs}</b><span>Attendees</span></div>
              <div><b>{st.evs.filter((e) => e.status === 'Upcoming').length}</b><span>Upcoming</span></div>
            </div>
            <div className="org-tags">
              {st.evs.slice(0, 3).map((e) => <span key={e.id}>{e.title}</span>)}
            </div>
            <div className="org-contact">
              <a className="btn btn-ghost btn-sm" href={`mailto:${o.email}`}><Mail /> Email</a>
              {o.phone && <a className="btn btn-ghost btn-sm" href={`tel:${o.phone.replace(/\s/g, '')}`}><Phone /> Call</a>}
            </div>
            {editable && (
              <div className="card-hover-actions">
                <button className="btn-icon" onClick={() => edit(o)} title="Edit"><Pencil /></button>
                <button className="btn-icon danger" onClick={() => remove(o)} title="Delete"><Trash2 /></button>
              </div>
            )}
          </article>
        )
      })}
    </div>
  )
}

export default function Organizers() {
  return (
    <EntityPage
      title="Organizers"
      subtitle="Faculty and committee members responsible for running events."
      resource="organizers"
      lookups={['events', 'feedback', 'registrations']}
      hero={{
        icon: UserCog, tone: 'amber',
        stats: (rows, lk) => {
          const ranked = rows.map((o) => ({ o, ...stats(o, lk) })).filter((x) => x.reviews).sort((a, b) => b.avg - a.avg)
          return [
            { label: 'Organizers', value: rows.length, icon: Users },
            { label: 'Departments', value: new Set(rows.map((o) => o.department)).size, icon: Building },
            { label: 'Events run', value: (lk.events || []).length, icon: CalendarDays },
            { label: 'Top rated', value: ranked[0]?.o.name.replace(/^(Dr\.|Prof\.|Mr\.|Ms\.)\s*/, '') || '—', icon: Star },
          ]
        },
      }}
      views={[{ key: 'profiles', label: 'Profiles', icon: Users, render: (ctx) => <ProfileCards {...ctx} /> }]}
      columns={[
        { key: 'name', label: 'Organizer', render: (o) => <Person name={o.name} sub={o.department} /> },
        { key: 'department', label: 'Department' },
        { key: 'email', label: 'Email', render: (o) => <a className="link" href={`mailto:${o.email}`} onClick={(e) => e.stopPropagation()}>{o.email}</a> },
        { key: 'phone', label: 'Phone', render: (o) => <span className="td-muted">{o.phone || '—'}</span>, sortable: false },
        {
          key: 'count', label: 'Events',
          render: (o, lk) => <span className="td-strong">{lk.events?.filter((e) => e.organizerId === o.id).length ?? 0}</span>,
          sortValue: (o, lk) => lk.events?.filter((e) => e.organizerId === o.id).length ?? 0,
          csv: (o, lk) => lk.events?.filter((e) => e.organizerId === o.id).length ?? 0,
        },
      ]}
      fields={[
        { name: 'name', label: 'Full name', required: true, minLength: 3, maxLength: 60, placeholder: 'Dr. / Prof. / Mr. / Ms. Name' },
        { name: 'department', label: 'Department / committee', required: true, minLength: 2, maxLength: 60 },
        { name: 'email', label: 'Email', type: 'email', required: true },
        { name: 'phone', label: 'Phone', placeholder: '10-digit mobile number' },
      ]}
      validate={(f, { rows, editing }) => {
        const errs = {}
        if (f.email && !isUnique(rows, 'email', f.email, editing?.id)) errs.email = 'This email is already in use'
        if (f.phone && !isPhone(f.phone)) errs.phone = 'Enter a valid 10-digit phone number'
        return errs
      }}
    />
  )
}
