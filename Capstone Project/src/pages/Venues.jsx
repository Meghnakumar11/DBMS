import { MapPin, LayoutGrid, Pencil, Trash2, Building2, Users, CalendarDays, Armchair } from 'lucide-react'
import EntityPage from '../components/EntityPage.jsx'
import { Empty, Badge } from '../components/ui.jsx'
import { isUnique } from '../utils/validate.js'
import { formatDate, todayISO } from '../utils/helpers.js'



function size(cap) {
  if (cap >= 800) return { label: 'Grand', seats: 5 }
  if (cap >= 300) return { label: 'Large', seats: 4 }
  if (cap >= 100) return { label: 'Medium', seats: 3 }
  if (cap >= 50) return { label: 'Small', seats: 2 }
  return { label: 'Intimate', seats: 1 }
}

function VenueCards({ rows, lk, editable, edit, remove }) {
  if (!rows.length) return <Empty text="No venues match" />
  const maxCap = Math.max(...rows.map((v) => v.capacity))
  return (
    <div className="venue-grid">
      {rows.map((v, i) => {
        const evs = (lk.events || []).filter((e) => e.venueId === v.id)
        const next = evs.filter((e) => e.date >= todayISO() && e.status !== 'Cancelled').sort((a, b) => a.date.localeCompare(b.date))[0]
        const peak = evs.length ? Math.max(...evs.map((e) => e.maxParticipants)) : 0
        const util = Math.round((peak / v.capacity) * 100)
        const sz = size(v.capacity)
        const c1 = 'var(--primary)', c2 = 'var(--primary)'
        return (
          <article key={v.id} className="venue-card" style={{ '--i': i, '--c1': c1, '--c2': c2 }}>
            <div className="venue-visual">
              <div className="venue-stage" />
              <div className="venue-seats">
                {Array.from({ length: 5 }).map((_, r) => (
                  <div key={r} className="seat-row" style={{ '--r': r }}>
                    {Array.from({ length: 6 + r * 2 }).map((_, k) => <span key={k} className={r < sz.seats ? 'on' : ''} />)}
                  </div>
                ))}
              </div>
              <span className="venue-size">{sz.label}</span>
            </div>
            <div className="venue-body">
              <div className="venue-title">
                <div><h3>{v.name}</h3><span><Building2 size={12} /> {v.building}</span></div>
                <div className="venue-cap"><b>{v.capacity.toLocaleString()}</b><span>seats</span></div>
              </div>
              <div className="meter">
                <div className="meter-label"><span>Capacity vs largest venue</span><span>{Math.round((v.capacity / maxCap) * 100)}%</span></div>
                <div className="capacity"><div style={{ width: `${(v.capacity / maxCap) * 100}%`, background: `linear-gradient(90deg, ${c1}, ${c2})` }} /></div>
              </div>
              <div className="meter">
                <div className="meter-label"><span>Peak booking utilisation</span><span>{util}%</span></div>
                <div className="capacity"><div style={{ width: `${util}%`, background: `linear-gradient(90deg, ${c2}, ${c1})` }} /></div>
              </div>
              <div className="venue-foot">
                <Badge tone="info">{evs.length} event{evs.length === 1 ? '' : 's'} hosted</Badge>
                {next ? <span className="venue-next"><CalendarDays size={12} /> {next.title} · {formatDate(next.date)}</span> : <span className="td-muted">No upcoming bookings</span>}
              </div>
            </div>
            {editable && (
              <div className="card-hover-actions">
                <button className="btn-icon" onClick={() => edit(v)} title="Edit"><Pencil /></button>
                <button className="btn-icon danger" onClick={() => remove(v)} title="Delete"><Trash2 /></button>
              </div>
            )}
          </article>
        )
      })}
    </div>
  )
}

export default function Venues() {
  return (
    <EntityPage
      title="Venues"
      subtitle="Halls, grounds and labs where events are hosted."
      resource="venues"
      lookups={['events']}
      hero={{
        icon: MapPin, tone: 'teal',
        stats: (rows, lk) => [
          { label: 'Venues', value: rows.length, icon: MapPin },
          { label: 'Total seats', value: rows.reduce((s, v) => s + v.capacity, 0), icon: Armchair },
          { label: 'Buildings', value: new Set(rows.map((v) => v.building)).size, icon: Building2 },
          { label: 'Bookings', value: (lk.events || []).filter((e) => e.status !== 'Cancelled').length, icon: Users },
        ],
      }}
      views={[{ key: 'cards', label: 'Cards', icon: LayoutGrid, render: (ctx) => <VenueCards {...ctx} /> }]}
      columns={[
        {
          key: 'name', label: 'Venue',
          render: (v) => (
            <div className="person">
              <div className="person-avatar" style={{ background: 'var(--info-soft)', color: 'var(--info)' }}><MapPin size={15} /></div>
              <div><div className="person-name">{v.name}</div><div className="person-sub">{v.building}</div></div>
            </div>
          ),
          csv: (v) => `${v.name} (${v.building})`,
        },
        { key: 'building', label: 'Building' },
        { key: 'capacity', label: 'Capacity', render: (v) => <span className="td-strong">{Number(v.capacity).toLocaleString()}</span> },
        {
          key: 'count', label: 'Events hosted',
          render: (v, lk) => lk.events?.filter((e) => e.venueId === v.id).length ?? 0,
          sortValue: (v, lk) => lk.events?.filter((e) => e.venueId === v.id).length ?? 0,
          csv: (v, lk) => lk.events?.filter((e) => e.venueId === v.id).length ?? 0,
        },
      ]}
      fields={[
        { name: 'name', label: 'Venue name', required: true, minLength: 3, maxLength: 60 },
        { name: 'building', label: 'Building / location', required: true, minLength: 2, maxLength: 60 },
        { name: 'capacity', label: 'Seating capacity', type: 'number', min: 10, max: 10000, required: true, hint: 'Between 10 and 10,000', full: true },
      ]}
      validate={(f, { rows, editing }) => {
        const errs = {}
        if (f.name && !isUnique(rows, 'name', f.name, editing?.id)) errs.name = 'A venue with this name already exists'
        return errs
      }}
    />
  )
}
