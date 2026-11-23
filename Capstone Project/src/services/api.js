// ------------------------------------------------------------
// API SERVICE LAYER
//
// Every page talks to the data ONLY through this file.
//   VITE_USE_MOCK=true   → in-memory copy of src/data/mockData.js (no server)
//   VITE_USE_MOCK=false  → Express + MongoDB REST API at VITE_API_URL (default /api)
//
// REST endpoints (one per table), all require "Authorization: Bearer <token>":
//   GET/POST /api/<resource>      GET/PUT/DELETE /api/<resource>/:id
//   resource = students | events | categories | venues | organizers |
//              registrations | attendance | feedback | users
// Auth: POST /api/auth/login · POST /api/auth/register · GET /api/auth/me
// ------------------------------------------------------------

import * as seed from '../data/mockData.js'

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'
const BASE_URL = import.meta.env.VITE_API_URL || '/api'
const TOKEN_KEY = 'cms-token'

// ---------- session token ----------
// Persistent (localStorage) when "Keep me signed in" is ticked, otherwise per-tab (sessionStorage).
export const session = {
  get token() {
    try { return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY) } catch { return null }
  },
  set(t, remember = true) {
    try {
      this.clear()
      ;(remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, t)
    } catch { /* ignore */ }
  },
  clear() { try { localStorage.removeItem(TOKEN_KEY); sessionStorage.removeItem(TOKEN_KEY) } catch { /* ignore */ } },
}

// ---------- Mock implementation (frontend-only demo) ----------
const store = {
  students: [...seed.students], events: [...seed.events], categories: [...seed.categories],
  venues: [...seed.venues], organizers: [...seed.organizers], registrations: [...seed.registrations],
  attendance: [...seed.attendance], feedback: [...seed.feedback],
  users: [
    { id: 1, name: 'Admin', email: 'admin@college.edu', role: 'admin', password: 'admin123' },
    { id: 2, name: 'Dr. Meera Nair', email: 'meera.nair@college.edu', role: 'organizer', organizerId: 1, password: 'organizer123' },
    { id: 3, name: 'Aarav Sharma', email: 'aarav.s@college.edu', role: 'student', studentId: 1, password: 'student123' },
  ],
}
const wait = (ms = 250) => new Promise((r) => setTimeout(r, ms))
const nextId = (rows) => (rows.length ? Math.max(...rows.map((r) => r.id)) + 1 : 1)
const strip = ({ password: _p, ...u }) => u
let mockUser = null

const mockApi = {
  async getAll(resource) { await wait(); return [...store[resource]].sort((a, b) => b.id - a.id).map((r) => (resource === 'users' ? strip(r) : r)) },
  async getById(resource, id) { await wait(); return store[resource].find((r) => r.id === Number(id)) || null },
  async create(resource, data) { await wait(); const row = { ...data, id: nextId(store[resource]) }; store[resource].push(row); return row },
  async update(resource, id, data) {
    await wait()
    const idx = store[resource].findIndex((r) => r.id === Number(id))
    if (idx === -1) throw new Error(`${resource} #${id} not found`)
    store[resource][idx] = { ...store[resource][idx], ...data, id: Number(id) }
    return store[resource][idx]
  },
  async remove(resource, id) { await wait(); store[resource] = store[resource].filter((r) => r.id !== Number(id)); return true },
}
const mockAuth = {
  async login(email, password) {
    await wait(400)
    const u = store.users.find((x) => x.email === email.trim().toLowerCase() && x.password === password)
    if (!u) { const e = new Error('Incorrect email or password'); e.fields = { password: e.message }; throw e }
    mockUser = strip(u)
    return { token: `mock-${u.id}`, user: mockUser }
  },
  async register(name, email, password) {
    await wait(400)
    const u = { id: nextId(store.users), name, email: email.toLowerCase(), password, role: 'student' }
    store.users.push(u); mockUser = strip(u)
    return { token: `mock-${u.id}`, user: mockUser }
  },
  async me() { const id = Number(String(session.token).replace('mock-', '')); const u = store.users.find((x) => x.id === id); if (!u) throw new Error('expired'); return strip(u) },
  async updateProfile(name) { const u = await this.me(); Object.assign(store.users.find((x) => x.id === u.id), { name }); return { ...u, name } },
  async changePassword() { return null },
  async activity() { return [] },
  async logout() { return null },
  async logoutAll() { return null },
}

// ---------- Real implementation ----------
async function request(path, options = {}) {
  const token = session.token
  let res
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
    })
  } catch {
    throw new Error('Cannot reach the server. Is the backend running (npm run dev)?')
  }
  if (res.status === 204) return null
  const body = await res.json().catch(() => null)
  if (!res.ok) {
    if (res.status === 401 && !path.startsWith('/auth/login')) window.dispatchEvent(new Event('auth:expired'))
    const err = new Error(body?.error || `Request failed (${res.status})`)
    err.status = res.status
    err.fields = body?.fields
    throw err
  }
  return body
}
const json = (method, data) => ({ method, body: JSON.stringify(data) })

const restApi = {
  getAll: (resource) => request(`/${resource}`),
  getById: (resource, id) => request(`/${resource}/${id}`),
  create: (resource, data) => request(`/${resource}`, json('POST', data)),
  update: (resource, id, data) => request(`/${resource}/${id}`, json('PUT', data)),
  remove: (resource, id) => request(`/${resource}/${id}`, { method: 'DELETE' }),
}
const restAuth = {
  login: (email, password, remember) => request('/auth/login', json('POST', { email, password, remember })),
  register: (name, email, password, remember) => request('/auth/register', json('POST', { name, email, password, remember })),
  logout: () => request('/auth/logout', { method: 'POST' }).catch(() => null),
  logoutAll: () => request('/auth/logout-all', { method: 'POST' }),
  me: () => request('/auth/me'),
  updateProfile: (name) => request('/auth/profile', json('PUT', { name })),
  changePassword: (current, next) => request('/auth/password', json('PUT', { current, next })),
  activity: (limit = 30, params = '') => request(`/activity?limit=${limit}${params}`),
}

// ---------- Public API used by the pages ----------
export const api = USE_MOCK ? mockApi : restApi
export const authApi = USE_MOCK ? mockAuth : restAuth
export const isMock = USE_MOCK

/** Load several resources at once, e.g. loadMany(['events','venues']) */
export async function loadMany(resources) {
  const results = await Promise.all(resources.map((r) => api.getAll(r)))
  return Object.fromEntries(resources.map((r, i) => [r, results[i]]))
}
