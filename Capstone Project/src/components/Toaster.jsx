/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { CheckCircle2, XCircle, Info, X } from 'lucide-react'

const ToastCtx = createContext(() => {})
const ICON = { success: CheckCircle2, error: XCircle, info: Info }

/**
 * App-wide notifications.
 *   const toast = useToast()
 *   toast('Saved')                                   // success
 *   toast('Could not save', 'error')
 *   toast('Deleted 3 students', 'info', { action: { label: 'Undo', run: fn }, duration: 5000 })
 */
export function ToastProvider({ children }) {
  const [items, setItems] = useState([])
  const timers = useRef({})

  const dismiss = useCallback((id) => {
    setItems((t) => t.map((x) => (x.id === id ? { ...x, leaving: true } : x)))
    setTimeout(() => setItems((t) => t.filter((x) => x.id !== id)), 220)
    clearTimeout(timers.current[id])
  }, [])

  const toast = useCallback((message, type = 'success', opts = {}) => {
    const id = `${Date.now()}-${Math.round(Math.random() * 1e6)}`
    const duration = opts.duration ?? (type === 'error' ? 4200 : 2800)
    setItems((t) => [...t.slice(-3), { id, message, type, action: opts.action, duration }])
    timers.current[id] = setTimeout(() => dismiss(id), duration)
    return id
  }, [dismiss])

  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div className="toast-wrap" aria-live="polite">
        {items.map((t) => {
          const Icon = ICON[t.type] || Info
          return (
            <div key={t.id} className={`toast toast-${t.type} ${t.leaving ? 'leaving' : ''}`} role="status" style={{ '--dur': `${t.duration}ms` }}>
              <Icon />
              <span className="toast-msg">{t.message}</span>
              {t.action && (
                <button className="toast-action" onClick={() => { t.action.run(); dismiss(t.id) }}>{t.action.label}</button>
              )}
              <button className="toast-close" onClick={() => dismiss(t.id)} aria-label="Dismiss"><X size={14} /></button>
            </div>
          )
        })}
      </div>
    </ToastCtx.Provider>
  )
}

export const useToast = () => useContext(ToastCtx)
