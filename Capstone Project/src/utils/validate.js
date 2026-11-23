// Small reusable validation helpers used by the pages' validate() functions.

export const isEmail = (v = '') => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v).trim())

export const isPhone = (v = '') => /^[0-9]{10}$/.test(String(v).replace(/[\s-]/g, ''))

export const isUnique = (rows, key, value, excludeId) =>
  !rows.some(
    (r) => r.id !== excludeId && String(r[key] ?? '').trim().toLowerCase() === String(value ?? '').trim().toLowerCase(),
  )

export const isPairUnique = (rows, pair, excludeId) =>
  !rows.some((r) => r.id !== excludeId && Object.entries(pair).every(([k, v]) => Number(r[k]) === Number(v)))

export const timeAfter = (end, start) => Boolean(end && start) && end > start
