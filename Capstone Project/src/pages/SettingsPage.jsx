import { Settings, Sun, Moon, Monitor, Palette, Rows3, Rows4, Sparkles, Gauge, PanelLeft, RotateCcw, Check, Keyboard, Trash2 } from 'lucide-react'
import { PageHero } from '../components/ui.jsx'
import { useSettings } from '../settings/Settings.jsx'
import { useToast } from '../components/Toaster.jsx'

const ACCENTS = [
  { key: 'royal', label: 'KRMU Royal', color: '#24408e' },
  { key: 'maroon', label: 'Maroon', color: '#8c1d40' },
  { key: 'indigo', label: 'Indigo', color: '#4f46e5' },
  { key: 'blue', label: 'Blue', color: '#2563eb' },
  { key: 'teal', label: 'Teal', color: '#0f766e' },
  { key: 'slate', label: 'Graphite', color: '#334155' },
]

function Choice({ options, value, onChange }) {
  return (
    <div className="choice">
      {options.map((o) => (
        <button key={o.value} type="button" className={value === o.value ? 'active' : ''} onClick={() => onChange(o.value)}>
          {o.icon && <o.icon size={16} />}<span>{o.label}</span>{value === o.value && <Check size={14} className="choice-check" />}
        </button>
      ))}
    </div>
  )
}

function Row({ icon: Icon, title, desc, children }) {
  return (
    <div className="setting-row">
      <div className="setting-info">
        <div className="setting-icon"><Icon size={17} /></div>
        <div><b>{title}</b><span>{desc}</span></div>
      </div>
      <div className="setting-control">{children}</div>
    </div>
  )
}

export default function SettingsPage() {
  const { prefs, set, reset } = useSettings()
  const toast = useToast()
  const update = (patch, msg = 'Preference saved') => { set(patch); toast(msg) }

  function clearLocal() {
    try {
      Object.keys(localStorage).filter((k) => k.startsWith('cms-') && k !== 'cms-token' && k !== 'cms-settings').forEach((k) => localStorage.removeItem(k))
    } catch { /* ignore */ }
    toast('Saved views, columns and filters were reset', 'info')
  }

  return (
    <>
      <PageHero icon={Settings} title="Settings" subtitle="Personalise how CampusEvents looks and behaves on this device." />
      <div className="settings-grid">
        <section className="card settings-card">
          <h3>Appearance</h3>
          <Row icon={Sun} title="Theme" desc="Follow your operating system or pick a fixed theme.">
            <Choice value={prefs.theme} onChange={(v) => update({ theme: v })} options={[
              { value: 'light', label: 'Light', icon: Sun }, { value: 'dark', label: 'Dark', icon: Moon }, { value: 'system', label: 'System', icon: Monitor },
            ]} />
          </Row>
          <Row icon={Palette} title="Accent colour" desc="Used for buttons, links and highlights.">
            <div className="swatches">
              {ACCENTS.map((a) => (
                <button key={a.key} className={`swatch ${prefs.accent === a.key ? 'active' : ''}`} style={{ '--sw': a.color }} onClick={() => update({ accent: a.key })} title={a.label} aria-label={a.label}>
                  {prefs.accent === a.key && <Check size={14} />}
                </button>
              ))}
            </div>
          </Row>
          <Row icon={Rows3} title="Density" desc="Compact shows more rows on screen.">
            <Choice value={prefs.density} onChange={(v) => update({ density: v })} options={[
              { value: 'comfortable', label: 'Comfortable', icon: Rows3 }, { value: 'compact', label: 'Compact', icon: Rows4 },
            ]} />
          </Row>
          <Row icon={PanelLeft} title="Sidebar" desc="Collapse to icons only. Shortcut: ⌘ \\">
            <Choice value={prefs.sidebar} onChange={(v) => update({ sidebar: v })} options={[
              { value: 'expanded', label: 'Expanded' }, { value: 'collapsed', label: 'Collapsed' },
            ]} />
          </Row>
        </section>

        <section className="card settings-card">
          <h3>Behaviour</h3>
          <Row icon={Sparkles} title="Animations" desc="Reduce motion if you prefer a calmer interface.">
            <Choice value={prefs.motion} onChange={(v) => update({ motion: v })} options={[
              { value: 'full', label: 'Standard', icon: Sparkles }, { value: 'reduced', label: 'Reduced', icon: Gauge },
            ]} />
          </Row>
          <Row icon={Rows4} title="Default rows per page" desc="Applies to lists you haven’t customised yet.">
            <select className="filter-select" value={prefs.pageSize} onChange={(e) => update({ pageSize: Number(e.target.value) })}>
              {[5, 10, 25, 50, 100].map((n) => <option key={n} value={n}>{n} rows</option>)}
            </select>
          </Row>
          <Row icon={Keyboard} title="Keyboard shortcuts" desc="Press ? anywhere to see every shortcut.">
            <span className="td-muted"><kbd>?</kbd> · <kbd>⌘</kbd><kbd>K</kbd> · <kbd>/</kbd> · <kbd>N</kbd></span>
          </Row>
          <Row icon={Trash2} title="Saved list layouts" desc="Forget chosen views, hidden columns and page sizes.">
            <button className="btn btn-ghost btn-sm" onClick={clearLocal}>Reset layouts</button>
          </Row>
          <div className="settings-foot">
            <button className="btn btn-ghost" onClick={() => { reset(); toast('All preferences restored to defaults', 'info') }}><RotateCcw /> Restore defaults</button>
          </div>
        </section>
      </div>
    </>
  )
}
