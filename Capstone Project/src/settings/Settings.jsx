/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from 'react'

/** User interface preferences, stored per browser. */
export const DEFAULTS = {
  theme: 'system',      // light | dark | system
  accent: 'royal',      // royal | maroon | indigo | blue | teal | slate
  density: 'comfortable', // comfortable | compact
  motion: 'full',       // full | reduced
  pageSize: 10,         // default rows per page
  sidebar: 'expanded',  // expanded | collapsed
  v: 2,
}
const KEY = 'cms-settings'

function read() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '{}')
    // migrate the old standalone theme key
    const legacy = localStorage.getItem('cms-theme')
    const merged = { ...DEFAULTS, ...(legacy && !raw.theme ? { theme: legacy } : {}), ...raw }
    // v2: university branding – move old default accent to the new brand accent
    if (raw.v !== 2) { if (!raw.accent || raw.accent === 'indigo') merged.accent = 'royal'; merged.v = 2 }
    return merged
  } catch { return { ...DEFAULTS } }
}

const SettingsCtx = createContext(null)

export function SettingsProvider({ children }) {
  const [prefs, setPrefs] = useState(read)
  const [systemDark, setSystemDark] = useState(() => window.matchMedia?.('(prefers-color-scheme: dark)').matches)

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!mq) return
    const on = (e) => setSystemDark(e.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])

  const resolvedTheme = prefs.theme === 'system' ? (systemDark ? 'dark' : 'light') : prefs.theme

  useEffect(() => {
    const el = document.documentElement
    el.dataset.theme = resolvedTheme
    el.dataset.accent = prefs.accent
    el.dataset.density = prefs.density
    el.dataset.motion = prefs.motion
    try { localStorage.setItem(KEY, JSON.stringify(prefs)) } catch { /* ignore */ }
  }, [prefs, resolvedTheme])

  const value = useMemo(() => ({
    prefs,
    resolvedTheme,
    set: (patch) => setPrefs((p) => ({ ...p, ...patch })),
    reset: () => setPrefs({ ...DEFAULTS }),
  }), [prefs, resolvedTheme])

  return <SettingsCtx.Provider value={value}>{children}</SettingsCtx.Provider>
}

export const useSettings = () => useContext(SettingsCtx)
