import { ShieldCheck, Crown, UserCog, GraduationCap, Clock, Link2, UserX, UserCheck } from 'lucide-react'
import EntityPage from '../components/EntityPage.jsx'
import { Person, Badge } from '../components/ui.jsx'
import { ROLE_META, useAuth } from '../auth/AuthContext.jsx'
import { byId, timeAgo, formatDate } from '../utils/helpers.js'

const ROLE_ICON = { admin: Crown, organizer: UserCog, student: GraduationCap }

function Insights(rows) {
  return (
    <div className="insight-grid">
      {Object.entries(ROLE_META).map(([key, m], i) => {
        const Icon = ROLE_ICON[key]
        return (
          <div key={key} className={`card insight role-card tone-${m.tone}`} style={{ '--i': i }}>
            <div className="role-icon"><Icon size={18} /></div>
            <div>
              <div className="role-count"><b>{rows.filter((u) => u.role === key).length}</b> {m.label}{rows.filter((u) => u.role === key).length === 1 ? '' : 's'}</div>
              <div className="td-muted">{m.desc}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function Users() {
  const { user } = useAuth()
  return (
    <EntityPage
      title="Users & Roles"
      singular="User"
      subtitle="Who can sign in, and what each person is allowed to do."
      resource="users"
      lookups={['students', 'organizers']}
      hero={{
        icon: ShieldCheck, tone: 'slate',
        stats: (rows) => [
          { label: 'Accounts', value: rows.length, icon: ShieldCheck },
          { label: 'Signed in today', value: rows.filter((u) => u.lastLogin && new Date(u.lastLogin).toDateString() === new Date().toDateString()).length, icon: Clock },
          { label: 'Linked to records', value: rows.filter((u) => u.studentId || u.organizerId).length, icon: Link2 },
        ],
      }}
      insights={(rows) => Insights(rows)}
      searchIn={(u) => `${u.name} ${u.email} ${u.role}`}
      defaults={{ role: 'student', active: 'true' }}
      rowActions={[
        { key: 'off', label: 'Deactivate account', icon: UserX, show: (u) => u.active && u.id !== user.id, run: (u, ctx) => ctx.update(u, { active: false, password: '' }, `${u.name} deactivated and signed out`) },
        { key: 'on', label: 'Reactivate account', icon: UserCheck, show: (u) => !u.active, run: (u, ctx) => ctx.update(u, { active: true, password: '' }, `${u.name} reactivated`) },
      ]}
      bulkActions={[
        { key: 'off', label: 'Deactivate', icon: UserX, run: async (list, ctx) => { for (const u of list.filter((x) => x.active && x.id !== user.id)) await ctx.update(u, { active: false, password: '' }, false); ctx.toast('Selected accounts deactivated') } },
        { key: 'on', label: 'Reactivate', icon: UserCheck, run: async (list, ctx) => { for (const u of list.filter((x) => !x.active)) await ctx.update(u, { active: true, password: '' }, false); ctx.toast('Selected accounts reactivated') } },
      ]}
      filters={[{ key: 'role', label: 'Role', options: Object.entries(ROLE_META).map(([v, m]) => ({ value: v, label: m.label })) }]}
      columns={[
        { key: 'name', label: 'User', render: (u) => <Person name={u.name} sub={u.email} /> },
        { key: 'role', label: 'Role', render: (u) => <Badge tone={ROLE_META[u.role]?.tone}>{ROLE_META[u.role]?.label}</Badge> },
        { key: 'active', label: 'Status', render: (u) => <Badge tone={u.active ? 'success' : 'neutral'}>{u.active ? 'Active' : 'Deactivated'}</Badge>, csv: (u) => (u.active ? 'Active' : 'Deactivated') },
        {
          key: 'link', label: 'Linked record', sortable: false,
          render: (u, lk) => u.studentId ? <span>🎓 {byId(lk.students, u.studentId)?.name}</span> : u.organizerId ? <span>🗂️ {byId(lk.organizers, u.organizerId)?.name}</span> : <span className="td-muted">—</span>,
          csv: (u, lk) => byId(lk.students, u.studentId)?.name || byId(lk.organizers, u.organizerId)?.name || '',
        },
        { key: 'lastLogin', label: 'Last sign-in', render: (u) => u.lastLogin ? <span title={new Date(u.lastLogin).toLocaleString()}>{timeAgo(u.lastLogin)}</span> : <span className="td-muted">Never</span> },
        { key: 'createdAt', label: 'Created', render: (u) => <span className="td-muted">{formatDate(String(u.createdAt).slice(0, 10))}</span> },
      ]}
      fields={[
        { name: 'name', label: 'Full name', required: true, minLength: 3, maxLength: 60 },
        { name: 'email', label: 'Email (login)', type: 'email', required: true },
        { name: 'role', label: 'Role', type: 'select', required: true, options: Object.entries(ROLE_META).map(([v, m]) => ({ value: v, label: m.label })) },
        { name: 'active', label: 'Account status', type: 'select', required: true, options: [{ value: 'true', label: 'Active' }, { value: 'false', label: 'Deactivated' }] },
        { name: 'password', label: 'Password', type: 'password', hint: '8+ characters with letters and numbers. Leave blank to keep the current password', placeholder: '••••••••' },
        { name: 'studentId', label: 'Linked student (for students)', type: 'select-id', optionsFrom: (lk) => lk.students?.map((s) => ({ value: s.id, label: `${s.name} (${s.rollNo})` })) },
        { name: 'organizerId', label: 'Linked organizer (for organizers)', type: 'select-id', optionsFrom: (lk) => lk.organizers?.map((o) => ({ value: o.id, label: o.name })) },
      ]}
      validate={(f, { rows, editing }) => {
        const errs = {}
        if (!editing && !f.password) errs.password = 'Password is required for a new user'
        if (f.password && (f.password.length < 8 || !/[A-Za-z]/.test(f.password) || !/\d/.test(f.password))) errs.password = 'Use 8+ characters with letters and numbers'
        if (editing?.id === user.id && String(f.active) === 'false') errs.active = 'You cannot deactivate your own account'
        if (f.email && rows.some((u) => u.id !== editing?.id && u.email.toLowerCase() === f.email.toLowerCase())) errs.email = 'An account with this email already exists'
        if (editing?.id === user.id && f.role !== 'admin') errs.role = 'You cannot remove your own admin role'
        if (f.role === 'student' && f.organizerId) errs.organizerId = 'Students link to a student record, not an organizer'
        if (f.role === 'organizer' && f.studentId) errs.studentId = 'Organizers link to an organizer record, not a student'
        return errs
      }}
    />
  )
}
