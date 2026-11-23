// Small, dependency-free motion helpers used across the UI.
import { useEffect, useRef, useState } from 'react'

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && (document.documentElement.dataset.motion === 'reduced' || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)

/** Animates a number from 0 to `target` (keeps decimals of the target). */
export function useCountUp(target, duration = 900) {
  const num = Number(target)
  const isNum = target !== '' && target !== null && Number.isFinite(num)
  const decimals = isNum ? (String(target).split('.')[1]?.length || 0) : 0
  const [val, setVal] = useState(isNum ? 0 : target)
  const raf = useRef(0)

  useEffect(() => {
    if (!isNum) { setVal(target); return }
    if (prefersReducedMotion()) { setVal(num.toFixed(decimals)); return }
    const start = performance.now()
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - p, 4)
      setVal((num * eased).toFixed(decimals))
      if (p < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [target, num, isNum, decimals, duration])

  return val
}

/**
 * Global pointer effects, installed once from main.jsx:
 *  • ripple on every .btn / .page-btn / .icon-btn click
 */
export function installPointerEffects() {
  if (typeof document === 'undefined' || window.__motionInstalled) return
  window.__motionInstalled = true

  document.addEventListener('pointerdown', (e) => {
    if (prefersReducedMotion()) return
    const el = e.target.closest?.('.btn, .page-btn')
    if (!el || el.disabled) return
    const r = el.getBoundingClientRect()
    const size = Math.max(r.width, r.height) * 2
    const dot = document.createElement('span')
    dot.className = 'ripple'
    dot.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px`
    el.appendChild(dot)
    dot.addEventListener('animationend', () => dot.remove())
  })


}

/** Switches theme with a circular reveal from the clicked button (View Transitions API). */
export function animateThemeChange(event, apply) {
  if (!document.startViewTransition || prefersReducedMotion()) { apply(); return }
  const x = event?.clientX ?? window.innerWidth - 40
  const y = event?.clientY ?? 32
  const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y))
  const t = document.startViewTransition(() => apply())
  t.ready.then(() => {
    document.documentElement.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
      { duration: 550, easing: 'cubic-bezier(.4,0,.2,1)', pseudoElement: '::view-transition-new(root)' },
    )
  }).catch(() => {})
}
