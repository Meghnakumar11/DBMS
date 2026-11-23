import { Tags, LayoutGrid, Pencil, Trash2, CalendarDays, Layers, Star } from 'lucide-react'
import EntityPage from '../components/EntityPage.jsx'
import { Badge, CategoryIcon, Empty } from '../components/ui.jsx'
import { isUnique } from '../utils/validate.js'
import { categoryTheme, gradient, formatDate } from '../utils/helpers.js'

function TilesView({ rows, lk, editable, edit, remove }) {
  if (!rows.length) return <Empty text="No categories match" />
  const total = Math.max(1, (lk.events || []).length)
  return (
    <div className="cat-grid">
      {rows.map((c, i) => {
        const t = categoryTheme(c.name)
        const evs = (lk.events || []).filter((e) => e.categoryId === c.id)
        const upcoming = evs.filter((e) => e.status === 'Upcoming' || e.status === 'Ongoing').sort((a, b) => a.date.localeCompare(b.date))
        const share = Math.round((evs.length / total) * 100)
        const fb = (lk.feedback || []).filter((f) => evs.some((e) => e.id === f.eventId))
        const avg = fb.length ? (fb.reduce((s, f) => s + f.rating, 0) / fb.length).toFixed(1) : '—'
        const R = 26, L = 2 * Math.PI * R
        return (
          <article key={c.id} className="cat-card" style={{ '--i': i, '--c1': t.from, '--c2': t.to }}>
            <div className="cat-card-top" style={{ '--c1': t.color }}>
              <CategoryIcon name={t.icon} size={110} className="cat-bg-icon" />
              <div className="cat-icon-wrap"><CategoryIcon name={t.icon} size={26} /></div>
              <svg className="share-ring" viewBox="0 0 64 64" style={{ '--ring-len': L }}>
                <circle cx="32" cy="32" r={R} className="track" />
                <circle cx="32" cy="32" r={R} className="val" strokeDasharray={L} strokeDashoffset={L * (1 - share / 100)} />
                <text x="32" y="37" textAnchor="middle">{share}%</text>
              </svg>
            </div>
            <div className="cat-card-body">
              <h3>{c.name}</h3>
              <p>{c.description || 'No description'}</p>
              <div className="cat-stats">
                <div><b>{evs.length}</b><span>Events</span></div>
                <div><b>{upcoming.length}</b><span>Upcoming</span></div>
                <div><b>{avg}</b><span>Rating</span></div>
              </div>
              {upcoming[0] ? (
                <div className="cat-next"><CalendarDays size={13} /> Next: <b>{upcoming[0].title}</b> · {formatDate(upcoming[0].date)}</div>
              ) : <div className="cat-next muted">No upcoming events</div>}
            </div>
            {editable && (
              <div className="card-hover-actions">
                <button className="btn-icon" onClick={() => edit(c)} title="Edit"><Pencil /></button>
                <button className="btn-icon danger" onClick={() => remove(c)} title="Delete"><Trash2 /></button>
              </div>
            )}
          </article>
        )
      })}
    </div>
  )
}

export default function Categories() {
  return (
    <EntityPage
      title="Event Categories"
      singular="Category"
      subtitle="Group events into types such as Technical, Cultural or Sports."
      resource="categories"
      lookups={['events', 'feedback']}
      hero={{
        icon: Tags, tone: 'pink',
        stats: (rows, lk) => {
          const counts = rows.map((c) => ({ c, n: (lk.events || []).filter((e) => e.categoryId === c.id).length })).sort((a, b) => b.n - a.n)
          return [
            { label: 'Categories', value: rows.length, icon: Layers },
            { label: 'Events tagged', value: (lk.events || []).length, icon: CalendarDays },
            { label: 'Most popular', value: counts[0]?.c.name || '—', icon: Star },
          ]
        },
      }}
      views={[{ key: 'tiles', label: 'Tiles', icon: LayoutGrid, render: (ctx) => <TilesView {...ctx} /> }]}
      columns={[
        { key: 'name', label: 'Category', render: (c) => { const t = categoryTheme(c.name); return <div className="person"><div className="cat-tile" style={{ '--c1': t.color }}><CategoryIcon name={t.icon} size={15} /></div><span className="td-strong">{c.name}</span></div> } },
        { key: 'description', label: 'Description', render: (c) => <span style={{ color: 'var(--text-2)' }}>{c.description || '—'}</span>, sortable: false },
        {
          key: 'count', label: 'Events',
          render: (c, lk) => <Badge tone="violet">{lk.events?.filter((e) => e.categoryId === c.id).length ?? 0} events</Badge>,
          sortValue: (c, lk) => lk.events?.filter((e) => e.categoryId === c.id).length ?? 0,
          csv: (c, lk) => lk.events?.filter((e) => e.categoryId === c.id).length ?? 0,
        },
      ]}
      fields={[
        { name: 'name', label: 'Category name', required: true, full: true, minLength: 2, maxLength: 40, pattern: /^[A-Za-z &/-]+$/, patternMessage: 'Letters, spaces, & / - only' },
        { name: 'description', label: 'Description', type: 'textarea', full: true, maxLength: 160 },
      ]}
      validate={(f, { rows, editing }) => {
        const errs = {}
        if (f.name && !isUnique(rows, 'name', f.name, editing?.id)) errs.name = 'This category already exists'
        return errs
      }}
    />
  )
}
