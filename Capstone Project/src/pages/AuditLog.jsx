import { useEffect, useMemo, useState } from 'react'
import { History, Search, Download, Plus, Pencil, Trash2, LogIn, LogOut, ShieldAlert, RotateCw, X } from 'lucide-react'
import { authApi } from '../services/api.js'
import { PageHero, SkeletonRows, Empty, Avatar } from '../components/ui.jsx'
import { useToast } from '../components/Toaster.jsx'

const ACTIONS = {
  created: { label: 'Created', icon: Plus, tone: 'success' },
  updated: { label: 'Updated', icon: Pencil, tone: 'info' },
  deleted: { label: 'Deleted', icon: Trash2, tone: 'danger' },
  login: { label: 'Signed in', icon: LogIn, tone: 'neutral' },
  logout: { label: 'Signed out', icon: LogOut, tone: 'neutral' },
  failed: { label: 'Failed sign-in', icon: ShieldAlert, tone: 'warning' },
}
const RANGES = [
  { key: 'all', label: 'All time' }, { key: '1', label: 'Last 24 hours' }, { key: '7', label: 'Last 7 days' }, { key: '30', label: 'Last 30 days' },
]

export default function AuditLog() {
  const toast = useToast()
  const [rows, setRows] = useState(null)
  const [q, setQ] = useState('')
  const [action, setAction] = useState('')
  const [resource, setResource] = useState('')
  const [range, setRange] = useState('all')

  const load = () => { setRows(null); authApi.activity(500, '&all=1').then(setRows).catch((e) => { toast(e.message, 'error'); setRows([]) }) }
  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const resources = useMemo(() => [...new Set((rows || []).map((r) => r.resource))].sort(), [rows])
  const filtered = useMemo(() => {
    const since = range === 'all' ? 0 : Date.now() - Number(range) * 86400000
    const needle = q.trim().toLowerCase()
    return (rows || []).filter((r) =>
      (!action || r.action === action) && (!resource || r.resource === resource)
      && (!since || new Date(r.createdAt).getTime() >= since)
      && (!needle || `${r.userName} ${r.label} ${r.resource}`.toLowerCase().includes(needle)))
  }, [rows, q, action, resource, range])

  const counts = useMemo(() => {
    const c = { total: rows?.length || 0, failed: 0, changes: 0, users: new Set() }
    ;(rows || []).forEach((r) => { if (r.action === 'failed') c.failed++; if (['created', 'updated', 'deleted'].includes(r.action)) c.changes++; c.users.add(r.userName) })
    return c
  }, [rows])

  function exportCsv() {
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const head = ['Time', 'User', 'Action', 'Module', 'Record', 'Details'].map(esc).join(',')
    const body = filtered.map((r) => [new Date(r.createdAt).toISOString(), r.userName, r.action, r.resource, r.recordId, r.label].map(esc).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([`﻿${head}\n${body}`], { type: 'text/csv;charset=utf-8' }))
    a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    toast(`Exported ${filtered.length} entries`, 'info')
  }

  // group rows by day for a readable timeline
  const groups = useMemo(() => {
    const out = []
    filtered.forEach((r) => {
      const day = new Date(r.createdAt).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      const last = out[out.length - 1]
      if (last?.day === day) last.items.push(r); else out.push({ day, items: [r] })
    })
    return out
  }, [filtered])

  const any = q || action || resource || range !== 'all'

  return (
    <>
      <PageHero icon={History} title="Audit log" subtitle="A tamper-evident record of every sign-in and change made in the system."
        stats={rows ? [
          { label: 'Entries', value: counts.total }, { label: 'Data changes', value: counts.changes },
          { label: 'Failed sign-ins', value: counts.failed }, { label: 'People', value: counts.users.size },
        ] : []}>
        <button className="btn btn-ghost" onClick={load}><RotateCw /> Refresh</button>
        <button className="btn btn-primary" onClick={exportCsv} disabled={!filtered.length}><Download /> Export CSV</button>
      </PageHero>

      <div className="card list-card">
        <div className="toolbar">
          <div className="toolbar-left">
            <div className="search">
              <Search />
              <input placeholder="Search people or records…" value={q} onChange={(e) => setQ(e.target.value)} />
              {q && <button className="search-clear" onClick={() => setQ('')} aria-label="Clear"><X size={14} /></button>}
            </div>
            <select className={`filter-select ${action ? 'active' : ''}`} value={action} onChange={(e) => setAction(e.target.value)}>
              <option value="">Action: All</option>
              {Object.entries(ACTIONS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <select className={`filter-select ${resource ? 'active' : ''}`} value={resource} onChange={(e) => setResource(e.target.value)}>
              <option value="">Module: All</option>
              {resources.map((r) => <option key={r} value={r}>{r[0].toUpperCase() + r.slice(1)}</option>)}
            </select>
            <select className={`filter-select ${range !== 'all' ? 'active' : ''}`} value={range} onChange={(e) => setRange(e.target.value)}>
              {RANGES.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
            </select>
            {any && <button className="link-btn" onClick={() => { setQ(''); setAction(''); setResource(''); setRange('all') }}>Clear filters</button>}
          </div>
          <div className="toolbar-meta">{filtered.length} of {rows?.length ?? 0}</div>
        </div>

        {!rows ? <SkeletonRows cols={4} /> : filtered.length === 0 ? <Empty text="No entries match these filters" icon={History} /> : (
          <div className="audit">
            {groups.map((g) => (
              <section key={g.day}>
                <div className="audit-day">{g.day}</div>
                {g.items.map((r, i) => {
                  const a = ACTIONS[r.action] || ACTIONS.updated
                  return (
                    <div key={r.id} className="audit-row" style={{ '--i': Math.min(i, 15) }}>
                      <time>{new Date(r.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</time>
                      <span className={`audit-icon tone-${a.tone}`}><a.icon size={13} /></span>
                      <Avatar name={r.userName} size={26} />
                      <div className="audit-text">
                        <b>{r.userName}</b> <span className={`badge badge-${a.tone}`}>{a.label}</span>
                        <span className="audit-module">{r.resource}</span>
                        <div className="td-muted">{r.label}{r.recordId ? ` · #${r.recordId}` : ''}</div>
                      </div>
                    </div>
                  )
                })}
              </section>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
