import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import {
  Plus, Search, Pencil, Trash2, AlertTriangle, AlertCircle, Download, Eye, Printer, Columns3,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUpDown, ArrowUp, ArrowDown, Table2, Lock, X,
  MoreHorizontal, RotateCw, Check, FilterX,
} from 'lucide-react'
import { api, loadMany } from '../services/api.js'
import { PageHero, ViewSwitch, Modal, Drawer, SkeletonRows, Empty, Menu, MenuItem } from './ui.jsx'
import { useAuth } from '../auth/AuthContext.jsx'
import { useToast } from './Toaster.jsx'
import { useSettings } from '../settings/Settings.jsx'
import { isEmail } from '../utils/validate.js'

const UNDO_MS = 5000

/**
 * Generic list + create/edit/delete page used by every module.
 *
 * props
 *  title, subtitle, singular   page header text
 *  resource                    key used by the api layer ('students', 'events', ...)
 *  lookups                     other resources to load for dropdowns / display
 *  columns   [{ key, label, render?(row, lk), sortValue?(row, lk), csv?(row, lk), sortable?, hidden? }]
 *  fields    [{ name, label, type, required, full, options?, optionsFrom?(lk), min, max, minLength, maxLength, pattern, hint }]
 *  filters   [{ key, label, options? | optionsFrom?(lk), match?(row, value, lk) }]
 *  searchIn  (row, lk) => string
 *  validate  (form, { rows, lookups, editing }) => { [field]: message }
 *  detail    (row, lk, ctx) => ReactNode   side panel shown on row click
 *  detailActions (row, ctx) => ReactNode   extra buttons in the side panel footer
 *  hero      { icon, stats?(rows, lk) => [{label, value, icon}] }
 *  insights  (rows, lk) => ReactNode       analytics strip above the list
 *  views     [{ key, label, icon, render(ctx) }]  alternative layouts
 *  bulkActions [{ key, label, icon, run(selectedRows, ctx) }]  extra actions for selected rows
 *  rowActions  [{ key, label, icon, run(row, ctx), show?(row) }]  extra actions in a row's ⋯ menu
 *  editable  override the role-based permission check
 */
export default function EntityPage({
  title, subtitle, singular, resource, lookups = [], columns, fields, filters = [],
  searchIn, validate, detail, detailTitle, detailActions, defaults = {},
  hero, insights, views = [], bulkActions = [], rowActions = [], editable: editableProp,
}) {
  const { can } = useAuth()
  const toast = useToast()
  const { prefs } = useSettings()
  const editable = editableProp ?? can(resource)
  const name = singular || title.replace(/s$/, '')

  // ---- persisted per-module UI state ----
  const store = (k, v) => { try { localStorage.setItem(`cms-${resource}-${k}`, JSON.stringify(v)) } catch { /* ignore */ } }
  const restore = (k, fallback) => { try { const v = localStorage.getItem(`cms-${resource}-${k}`); return v ? JSON.parse(v) : fallback } catch { return fallback } }

  const allViews = useMemo(() => [...views, { key: 'table', label: 'Table', icon: Table2 }], [views])
  const [view, setViewState] = useState(() => { const v = restore('view'); return allViews.some((x) => x.key === v) ? v : allViews[0].key })
  const setView = (v) => { setViewState(v); store('view', v) }
  const [hiddenCols, setHiddenCols] = useState(() => restore('hidden', columns.filter((c) => c.hidden).map((c) => c.key)))
  const toggleCol = (key) => setHiddenCols((h) => { const n = h.includes(key) ? h.filter((x) => x !== key) : [...h, key]; store('hidden', n); return n })
  const [pageSize, setPageSizeState] = useState(() => restore('pageSize', prefs.pageSize))
  const setPageSize = (n) => { setPageSizeState(n); store('pageSize', n); setPage(1) }

  const [rows, setRows] = useState([])
  const [lk, setLk] = useState({})
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [q, setQ] = useState(() => new URLSearchParams(window.location.search).get('q') || '')
  const [filterVals, setFilterVals] = useState({})
  const [sort, setSort] = useState(null)
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState(() => new Set())
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null) // array of rows
  const [viewing, setViewing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [newId, setNewId] = useState(null)
  const [serverErrors, setServerErrors] = useState(null)
  const searchRef = useRef(null)
  const pending = useRef(new Map()) // id -> { row, timer }

  const lookupKey = lookups.join(',')
  const load = useCallback(async (soft = false) => {
    soft ? setRefreshing(true) : setLoading(true)
    try {
      const list = lookupKey ? lookupKey.split(',') : []
      const [data, lookupData] = await Promise.all([api.getAll(resource), loadMany(list)])
      setRows(data.filter((r) => !pending.current.has(r.id)))
      setLk(lookupData)
    } catch (err) {
      toast(err.message || 'Failed to load data', 'error')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [resource, lookupKey, toast])

  useEffect(() => { load() }, [load])

  // commit any pending (undoable) deletes when leaving the page
  useEffect(() => () => {
    pending.current.forEach(({ row, timer }) => { clearTimeout(timer); api.remove(resource, row.id).catch(() => {}) })
    pending.current.clear()
  }, [resource])

  // ---- keyboard shortcuts: "/" search, "n" new ----
  useEffect(() => {
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const tag = document.activeElement?.tagName
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag) || document.querySelector('.modal-backdrop, .cp-backdrop, .drawer')) return
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus() }
      if (e.key === 'n' && editable) { e.preventDefault(); setEditing({ ...defaults }) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [editable, defaults])

  // ---- search → filter → sort ----
  const filtered = useMemo(() => {
    let out = rows
    if (q.trim()) {
      const needle = q.toLowerCase()
      out = out.filter((r) => String(searchIn ? searchIn(r, lk) : Object.values(r).join(' ')).toLowerCase().includes(needle))
    }
    filters.forEach((f) => {
      const v = filterVals[f.key]
      if (v === undefined || v === '') return
      out = out.filter((r) => (f.match ? f.match(r, v, lk) : String(r[f.key]) === String(v)))
    })
    const col = sort && columns.find((c) => c.key === sort.key)
    if (col) {
      const val = (r) => (col.sortValue ? col.sortValue(r, lk) : r[col.key])
      out = [...out].sort((a, b) => {
        const x = val(a), y = val(b)
        const cmp = typeof x === 'number' && typeof y === 'number' ? x - y : String(x ?? '').localeCompare(String(y ?? ''), undefined, { numeric: true })
        return sort.dir === 'asc' ? cmp : -cmp
      })
    } else {
      out = [...out].sort((a, b) => b.id - a.id)
    }
    return out
  }, [rows, q, filterVals, sort, columns, lk, searchIn, filters])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const paged = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)
  const visibleCols = columns.filter((c) => !hiddenCols.includes(c.key))
  const activeFilterCount = Object.values(filterVals).filter((v) => v !== '' && v !== undefined).length
  const resetPage = () => setPage(1)

  const selectedRows = rows.filter((r) => selected.has(r.id))
  const pageAllSelected = paged.length > 0 && paged.every((r) => selected.has(r.id))
  const togglePage = () => setSelected((s) => {
    const n = new Set(s)
    if (pageAllSelected) paged.forEach((r) => n.delete(r.id)); else paged.forEach((r) => n.add(r.id))
    return n
  })
  const toggleOne = (id) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const clearSelection = () => setSelected(new Set())

  function toggleSort(key) {
    setSort((s) => (!s || s.key !== key ? { key, dir: 'asc' } : s.dir === 'asc' ? { key, dir: 'desc' } : null))
  }

  // ---- CRUD ----
  async function handleSave(form) {
    setSaving(true)
    setServerErrors(null)
    try {
      if (editing?.id) {
        const updated = await api.update(resource, editing.id, form)
        setRows((rs) => rs.map((r) => (r.id === updated.id ? updated : r)))
        toast(`${name} updated`)
      } else {
        const created = await api.create(resource, form)
        setRows((rs) => [created, ...rs])
        setNewId(created.id)
        setSort(null)
        resetPage()
        toast(`${name} added`)
      }
      setEditing(null)
    } catch (err) {
      if (err.fields) setServerErrors({ ...err.fields, _at: Date.now() })
      toast(err.message || 'Could not save', 'error')
    } finally {
      setSaving(false)
    }
  }

  /** Optimistic delete with a 5-second Undo window. */
  function handleDelete(list) {
    setDeleting(null)
    setViewing(null)
    const ids = new Set(list.map((r) => r.id))
    setRows((rs) => rs.filter((r) => !ids.has(r.id)))
    setSelected((s) => { const n = new Set(s); ids.forEach((i) => n.delete(i)); return n })

    const commit = async () => {
      const failures = []
      for (const row of list) {
        const p = pending.current.get(row.id)
        if (!p) continue
        pending.current.delete(row.id)
        try { await api.remove(resource, row.id) } catch (err) { failures.push({ row, err }) }
      }
      if (failures.length) {
        setRows((rs) => [...failures.map((f) => f.row), ...rs])
        toast(failures[0].err.message || 'Could not delete', 'error')
      }
    }
    const timer = setTimeout(commit, UNDO_MS)
    list.forEach((row) => pending.current.set(row.id, { row, timer }))

    toast(list.length === 1 ? `${name} deleted` : `${list.length} records deleted`, 'info', {
      duration: UNDO_MS,
      action: {
        label: 'Undo',
        run: () => {
          clearTimeout(timer)
          list.forEach((r) => pending.current.delete(r.id))
          setRows((rs) => [...list, ...rs])
          toast('Restored')
        },
      },
    })
  }

  async function quickUpdate(row, patch, message) {
    try {
      const updated = await api.update(resource, row.id, { ...row, ...patch })
      setRows((rs) => rs.map((r) => (r.id === updated.id ? updated : r)))
      if (message !== false) toast(message || `${name} updated`)
      return updated
    } catch (err) {
      toast(err.fields ? Object.values(err.fields)[0] : err.message, 'error')
      return null
    }
  }
  async function quickCreate(data, message) {
    try {
      const created = await api.create(resource, data)
      setRows((rs) => [created, ...rs])
      if (message !== false) toast(message || `${name} added`)
      return created
    } catch (err) {
      toast(err.fields ? Object.values(err.fields)[0] : err.message, 'error')
      return null
    }
  }

  function exportCsv(list = filtered) {
    const cols = visibleCols
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const head = cols.map((c) => esc(c.label)).join(',')
    const body = list.map((r) => cols.map((c) => esc(c.csv ? c.csv(r, lk) : r[c.key])).join(',')).join('\n')
    const blob = new Blob([`﻿${head}\n${body}`], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${resource}-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
    toast(`Exported ${list.length} row${list.length === 1 ? '' : 's'} to CSV`, 'info')
  }

  const ctx = {
    rows: filtered, all: rows, lk, editable, selected, toggleOne,
    edit: (r) => setEditing(r), duplicate: (r) => { const { id: _id, ...rest } = r; setEditing({ ...rest }) },
    remove: (r) => setDeleting([r]), open: (r) => detail && setViewing(r),
    update: quickUpdate, create: quickCreate, toast, reload: () => load(true), exportCsv,
  }

  const sortIcon = (key) => (sort?.key !== key ? <ArrowUpDown size={13} className="sort-ic" /> : sort.dir === 'asc' ? <ArrowUp size={13} className="sort-ic" /> : <ArrowDown size={13} className="sort-ic" />)

  const headerActions = (
    <>
      <Menu label={<><MoreHorizontal /> More</>} buttonClass="btn btn-ghost">
        <MenuItem icon={Download} onClick={() => exportCsv()} disabled={!filtered.length}>Export {filtered.length} rows (CSV)</MenuItem>
        <MenuItem icon={Printer} onClick={() => window.print()}>Print this view</MenuItem>
        <MenuItem icon={RotateCw} onClick={() => load(true)}>Refresh data</MenuItem>
      </Menu>
      {editable ? (
        <button className="btn btn-primary" onClick={() => setEditing({ ...defaults })} title="Shortcut: N">
          <Plus /> Add {name.toLowerCase()}
        </button>
      ) : (
        <span className="readonly-pill" title="Your role can view but not change this module"><Lock size={13} /> View only</span>
      )}
    </>
  )

  return (
    <>
      <PageHero icon={hero?.icon} title={title} subtitle={subtitle} stats={loading ? [] : hero?.stats?.(rows, lk) || []}>{headerActions}</PageHero>

      {!loading && insights && <div className="insights">{insights(rows, lk)}</div>}

      <div className={`card list-card ${refreshing ? 'is-refreshing' : ''}`}>
        <div className="toolbar">
          <div className="toolbar-left">
            <div className="search">
              <Search />
              <input ref={searchRef} placeholder={`Search ${title.toLowerCase()}…`} value={q} onChange={(e) => { setQ(e.target.value); resetPage() }} />
              {q ? <button className="search-clear" onClick={() => { setQ(''); resetPage() }} aria-label="Clear search"><X size={14} /></button> : <kbd className="search-kbd">/</kbd>}
            </div>
            {filters.map((f) => {
              const opts = f.optionsFrom ? f.optionsFrom(lk) || [] : f.options
              const v = filterVals[f.key] ?? ''
              return (
                <select key={f.key} className={`filter-select ${v !== '' ? 'active' : ''}`} value={v}
                  onChange={(e) => { setFilterVals((s) => ({ ...s, [f.key]: e.target.value })); resetPage() }}>
                  <option value="">{f.label}: All</option>
                  {opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              )
            })}
            {(activeFilterCount > 0 || q) && (
              <button className="link-btn" onClick={() => { setFilterVals({}); setQ(''); resetPage() }}><FilterX size={13} /> Clear filters</button>
            )}
          </div>
          <div className="toolbar-right">
            <div className="toolbar-meta">{filtered.length} of {rows.length}</div>
            {view === 'table' && (
              <Menu label={<Columns3 size={15} />} buttonClass="icon-btn sm" title="Show / hide columns" align="right">
                <div className="menu-head">Visible columns</div>
                {columns.map((c) => (
                  <MenuItem key={c.key} keepOpen icon={hiddenCols.includes(c.key) ? null : Check} onClick={() => toggleCol(c.key)}>{c.label}</MenuItem>
                ))}
              </Menu>
            )}
            {allViews.length > 1 && <ViewSwitch views={allViews} value={view} onChange={setView} />}
          </div>
        </div>

        {selected.size > 0 && (
          <div className="bulk-bar">
            <span><b>{selected.size}</b> selected</span>
            <button className="btn btn-ghost btn-sm" onClick={() => exportCsv(selectedRows)}><Download /> Export</button>
            {editable && bulkActions.map((a) => (
              <button key={a.key} className="btn btn-ghost btn-sm" onClick={async () => { await a.run(selectedRows, ctx); clearSelection() }}><a.icon /> {a.label}</button>
            ))}
            {editable && <button className="btn btn-danger-soft btn-sm" onClick={() => setDeleting(selectedRows)}><Trash2 /> Delete</button>}
            <button className="link-btn" onClick={clearSelection}>Clear selection</button>
          </div>
        )}

        {loading ? (
          <SkeletonRows cols={Math.min(visibleCols.length, 5)} />
        ) : view !== 'table' ? (
          <div className="view-body" key={view}>{allViews.find((v) => v.key === view).render(ctx)}</div>
        ) : filtered.length === 0 ? (
          <Empty
            text={q || activeFilterCount ? 'No records match your search or filters' : `No ${title.toLowerCase()} yet`}
            action={editable && !q && !activeFilterCount && (
              <button className="btn btn-primary btn-sm" onClick={() => setEditing({ ...defaults })}><Plus /> Add the first {name.toLowerCase()}</button>
            )}
          />
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th className="check-col"><Checkbox checked={pageAllSelected} indeterminate={!pageAllSelected && paged.some((r) => selected.has(r.id))} onChange={togglePage} label="Select all on this page" /></th>
                    {visibleCols.map((c) => {
                      const sortable = c.sortable !== false
                      return (
                        <th key={c.key} className={`${sortable ? 'sortable' : ''} ${sort?.key === c.key ? 'sorted' : ''}`} onClick={() => sortable && toggleSort(c.key)}>
                          {c.label}{sortable && sortIcon(c.key)}
                        </th>
                      )
                    })}
                    <th className="actions"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((row, idx) => (
                    <tr key={`${row.id}-${safePage}`} style={{ '--i': idx }}
                      className={`row-anim ${detail ? 'clickable' : ''} ${row.id === newId ? 'new-row' : ''} ${selected.has(row.id) ? 'selected' : ''}`}
                      onClick={() => detail && setViewing(row)}>
                      <td className="check-col" onClick={(e) => e.stopPropagation()}><Checkbox checked={selected.has(row.id)} onChange={() => toggleOne(row.id)} label="Select row" /></td>
                      {visibleCols.map((c) => (
                        <td key={c.key} data-label={c.label}>{c.render ? c.render(row, lk) : row[c.key] ?? '—'}</td>
                      ))}
                      <td className="actions" onClick={(e) => e.stopPropagation()}>
                        {detail && <button className="btn-icon" title="View details" onClick={() => setViewing(row)}><Eye /></button>}
                        {editable && <button className="btn-icon" title="Edit" onClick={() => setEditing(row)}><Pencil /></button>}
                        {(editable || rowActions.length > 0) && (
                          <Menu label={<MoreHorizontal size={16} />} buttonClass="btn-icon" align="right" title="More actions">
                            {rowActions.filter((a) => !a.show || a.show(row, ctx)).map((a) => (
                              <MenuItem key={a.key} icon={a.icon} onClick={() => a.run(row, ctx)}>{a.label}</MenuItem>
                            ))}
                            {editable && <MenuItem icon={Trash2} danger onClick={() => setDeleting([row])}>Delete</MenuItem>}
                          </Menu>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pagination">
              <div className="page-size">
                Rows per page
                <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
                  {[5, 10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
                <span className="toolbar-meta">{(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, filtered.length)} of {filtered.length}</span>
              </div>
              {totalPages > 1 && (
                <div className="pages">
                  <button className="page-btn" disabled={safePage === 1} onClick={() => setPage(1)} aria-label="First page"><ChevronsLeft size={15} /></button>
                  <button className="page-btn" disabled={safePage === 1} onClick={() => setPage(safePage - 1)} aria-label="Previous page"><ChevronLeft size={15} /></button>
                  {pageList(safePage, totalPages).map((p, i) => p === '…'
                    ? <span key={`e${i}`} className="page-gap">…</span>
                    : <button key={p} className={`page-btn ${p === safePage ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>)}
                  <button className="page-btn" disabled={safePage === totalPages} onClick={() => setPage(safePage + 1)} aria-label="Next page"><ChevronRight size={15} /></button>
                  <button className="page-btn" disabled={safePage === totalPages} onClick={() => setPage(totalPages)} aria-label="Last page"><ChevronsRight size={15} /></button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {editing && (
        <EntityForm
          title={editing.id ? `Edit ${name.toLowerCase()}` : `New ${name.toLowerCase()}`}
          fields={fields}
          lookups={lk}
          rows={rows}
          initial={editing}
          saving={saving}
          validate={validate}
          serverErrors={serverErrors}
          onCancel={() => { setEditing(null); setServerErrors(null) }}
          onSave={handleSave}
        />
      )}

      {viewing && detail && (
        <Drawer
          title={detailTitle ? detailTitle(viewing) : `${name} details`}
          onClose={() => setViewing(null)}
          footer={(
            <>
              {detailActions?.(viewing, ctx)}
              {editable && <button className="btn btn-ghost" onClick={() => { setEditing(viewing); setViewing(null) }}><Pencil /> Edit</button>}
              {editable && <button className="btn btn-danger-soft" onClick={() => setDeleting([viewing])}><Trash2 /> Delete</button>}
            </>
          )}
        >
          {detail(viewing, lk, ctx)}
        </Drawer>
      )}

      {deleting && (
        <Modal
          title={deleting.length === 1 ? `Delete this ${name.toLowerCase()}?` : `Delete ${deleting.length} records?`}
          width={440}
          onClose={() => setDeleting(null)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setDeleting(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => handleDelete(deleting)} autoFocus><Trash2 /> Delete</button>
            </>
          }
        >
          <div className="confirm-body">
            <div className="confirm-icon"><AlertTriangle size={20} /></div>
            <p>
              {deleting.length === 1 ? 'This record' : `These ${deleting.length} records`} will be removed from the database.
              Linked registrations, attendance and feedback are removed with them. You’ll have 5 seconds to undo.
            </p>
          </div>
        </Modal>
      )}
    </>
  )
}

function pageList(cur, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const out = [1]
  if (cur > 3) out.push('…')
  for (let p = Math.max(2, cur - 1); p <= Math.min(total - 1, cur + 1); p++) out.push(p)
  if (cur < total - 2) out.push('…')
  out.push(total)
  return out
}

function Checkbox({ checked, indeterminate, onChange, label }) {
  const ref = useRef(null)
  useEffect(() => { if (ref.current) ref.current.indeterminate = Boolean(indeterminate) }, [indeterminate])
  return <input ref={ref} type="checkbox" className="cb" checked={checked} onChange={onChange} aria-label={label} />
}

/* ------------------------------------------------------------------ */
/*  Form with inline validation                                        */
/* ------------------------------------------------------------------ */

function normalise(form, fields) {
  const out = { ...form }
  fields.forEach((fl) => {
    if (fl.type === 'number' || fl.type === 'select-id') out[fl.name] = out[fl.name] === '' || out[fl.name] == null ? null : Number(out[fl.name])
    else if (typeof out[fl.name] === 'string') out[fl.name] = out[fl.name].trim()
  })
  return out
}

function runValidation(form, fields, validate, ctx) {
  const errs = {}
  fields.forEach((fl) => {
    const raw = form[fl.name]
    const v = typeof raw === 'string' ? raw.trim() : raw
    const empty = v === '' || v === null || v === undefined
    if (fl.required && empty) { errs[fl.name] = `${fl.label} is required`; return }
    if (empty) return
    if (fl.type === 'email' && !isEmail(v)) errs[fl.name] = 'Enter a valid email address'
    else if (fl.type === 'number') {
      const n = Number(v)
      if (Number.isNaN(n)) errs[fl.name] = 'Must be a number'
      else if (fl.min != null && n < fl.min) errs[fl.name] = `Must be at least ${fl.min}`
      else if (fl.max != null && n > fl.max) errs[fl.name] = `Must be at most ${fl.max}`
    } else if (fl.pattern && !fl.pattern.test(v)) errs[fl.name] = fl.patternMessage || 'Invalid format'
    else if (fl.minLength && String(v).length < fl.minLength) errs[fl.name] = `Must be at least ${fl.minLength} characters`
    else if (fl.maxLength && String(v).length > fl.maxLength) errs[fl.name] = `Must be at most ${fl.maxLength} characters`
  })
  if (validate) {
    const custom = validate(normalise(form, fields), ctx) || {}
    Object.entries(custom).forEach(([k, msg]) => { if (msg && !errs[k]) errs[k] = msg })
  }
  return errs
}

function EntityForm({ title, fields, lookups, rows, initial, onCancel, onSave, saving, validate, serverErrors }) {
  const [form, setForm] = useState(() => {
    const f = {}
    fields.forEach((fl) => { f[fl.name] = initial[fl.name] ?? '' })
    return f
  })
  const [start] = useState(() => JSON.stringify(form))
  const [errors, setErrors] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [shake, setShake] = useState(false)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const dirty = JSON.stringify(form) !== start

  useEffect(() => {
    if (!serverErrors) return
    const { _at, ...errs } = serverErrors
    setErrors(errs)
    setShake(true)
    const t = setTimeout(() => setShake(false), 400)
    document.getElementById(Object.keys(errs)[0])?.focus()
    return () => clearTimeout(t)
  }, [serverErrors])

  const ctx = { rows, lookups, editing: initial.id ? initial : null }

  const set = (k, v) => {
    const next = { ...form, [k]: v }
    setForm(next)
    if (submitted) setErrors(runValidation(next, fields, validate, ctx))
  }

  function submit(e) {
    e?.preventDefault()
    setSubmitted(true)
    const errs = runValidation(form, fields, validate, ctx)
    setErrors(errs)
    if (Object.keys(errs).length) {
      setShake(true)
      setTimeout(() => setShake(false), 400)
      document.getElementById(Object.keys(errs)[0])?.focus()
      return
    }
    onSave(normalise(form, fields))
  }

  const tryClose = () => (dirty ? setConfirmLeave(true) : onCancel())
  const errorCount = Object.keys(errors).length

  return (
    <Modal
      title={title}
      onClose={tryClose}
      shake={shake}
      footer={
        confirmLeave ? (
          <div className="leave-confirm">
            <span><AlertTriangle size={15} /> Discard unsaved changes?</span>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirmLeave(false)}>Keep editing</button>
            <button type="button" className="btn btn-danger btn-sm" onClick={onCancel}>Discard</button>
          </div>
        ) : (
          <>
            <span className="form-hint-keys"><kbd>Ctrl</kbd>+<kbd>Enter</kbd> to save</span>
            <button type="button" className="btn btn-ghost" onClick={tryClose}>Cancel</button>
            <button type="submit" form="entity-form" className="btn btn-primary" disabled={saving}>
              {saving ? <><span className="btn-spinner" /> Saving…</> : initial.id ? 'Save changes' : 'Create'}
            </button>
          </>
        )
      }
    >
      {errorCount > 0 && (
        <div className="form-alert">
          <AlertCircle />
          <span>Please fix {errorCount === 1 ? 'the highlighted field' : `the ${errorCount} highlighted fields`} before saving.</span>
        </div>
      )}
      <form id="entity-form" onSubmit={submit} className="form-grid" noValidate
        onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submit(e) }}>
        {fields.map((fl) => {
          const opts = fl.optionsFrom ? fl.optionsFrom(lookups) || [] : fl.options
          const err = errors[fl.name]
          const common = {
            id: fl.name,
            value: form[fl.name] ?? '',
            onChange: (e) => set(fl.name, e.target.value),
            'aria-invalid': Boolean(err),
          }
          return (
            <div key={fl.name} className={`field ${fl.full ? 'full' : ''} ${err ? 'invalid' : ''}`}>
              <label htmlFor={fl.name}>{fl.label}{fl.required && <span className="req">*</span>}</label>
              {fl.type === 'textarea' ? (
                <textarea {...common} placeholder={fl.placeholder} maxLength={fl.maxLength} />
              ) : fl.type === 'select' || fl.type === 'select-id' ? (
                <select {...common}>
                  <option value="">Select…</option>
                  {opts?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ) : (
                <input {...common} type={fl.type || 'text'} min={fl.min} max={fl.max} placeholder={fl.placeholder} maxLength={fl.maxLength} autoComplete={fl.type === 'password' ? 'new-password' : undefined} />
              )}
              {err ? (
                <div className="field-error"><AlertCircle /> {err}</div>
              ) : (fl.hint || (fl.type === 'textarea' && fl.maxLength)) ? (
                <div className="field-hint">
                  <span>{fl.hint}</span>
                  {fl.type === 'textarea' && fl.maxLength && <span className="char-count">{String(form[fl.name] ?? '').length}/{fl.maxLength}</span>}
                </div>
              ) : null}
            </div>
          )
        })}
      </form>
    </Modal>
  )
}
