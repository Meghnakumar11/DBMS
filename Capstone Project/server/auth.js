// ------------------------------------------------------------
// AUTHENTICATION & AUTHORISATION
//
//  POST /api/auth/login      { email, password }        → { token, user }
//  POST /api/auth/register   { name, email, password }  → { token, user }  (student sign-up)
//  GET  /api/auth/me                                    → user
//  PUT  /api/auth/profile    { name }                   → user
//  PUT  /api/auth/password   { current, next }          → 204
//
//  Users management (admin only): GET/POST/PUT/DELETE /api/users
//
// Roles
//  admin      – everything
//  organizer  – manage events, registrations, attendance, feedback
//  student    – read; register / cancel own registrations; feedback for own attended events
// ------------------------------------------------------------
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import express from 'express'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { CI, User, Student, Organizer, Activity, nextId } from './models.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Secret: env var, or a random one persisted locally so tokens survive restarts.
function loadSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET
  const file = path.join(__dirname, '.jwt-secret')
  if (!fs.existsSync(file)) fs.writeFileSync(file, crypto.randomBytes(48).toString('hex'), { mode: 0o600 })
  return fs.readFileSync(file, 'utf8').trim()
}
const SECRET = loadSecret()
const TTL_REMEMBER = '7d'
const TTL_SESSION = '12h'
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10)

export class HttpError extends Error {
  constructor(status, message, fields) { super(message); this.status = status; this.fields = fields }
}
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/** Public shape of a user document (never includes the password hash). */
const toUser = (u) => (u ? {
  id: u._id,
  name: u.name,
  email: u.email,
  role: u.role,
  studentId: u.studentId ?? null,
  organizerId: u.organizerId ?? null,
  active: u.active !== false,
  lastLogin: u.lastLogin ?? null,
  createdAt: u.createdAt,
} : null)

/** A positive whole number, or null (ids arrive as text in URLs and tokens). */
const validId = (v) => { const n = Number(v); return Number.isInteger(n) && n > 0 ? n : null }

export const PERMISSIONS = {
  admin: { write: '*' },
  organizer: { write: ['events', 'registrations', 'attendance', 'feedback'] },
  student: { write: ['registrations', 'feedback'] },
}
export const canWrite = (role, resource) => {
  const w = PERMISSIONS[role]?.write
  return w === '*' || (Array.isArray(w) && w.includes(resource))
}

const sign = async (u, remember = true) => {
  const row = await User.findById(u.id).select('tokenVersion').lean()
  return jwt.sign({ sub: u.id, ver: row.tokenVersion || 0 }, SECRET, { expiresIn: remember === false ? TTL_SESSION : TTL_REMEMBER })
}

// ---- brute-force protection: 5 failed sign-ins per email+IP → 15 minute lock ----
const MAX_ATTEMPTS = 5
const LOCK_MS = 15 * 60 * 1000
const attempts = new Map() // key → { count, first, lockedUntil }
function attemptKey(req, email) { return `${req.ip}|${email}` }
function checkLock(key) {
  const a = attempts.get(key)
  if (a?.lockedUntil && a.lockedUntil > Date.now()) {
    const mins = Math.ceil((a.lockedUntil - Date.now()) / 60000)
    throw new HttpError(429, `Too many failed attempts. Try again in ${mins} minute${mins > 1 ? 's' : ''}.`)
  }
}
function recordFailure(key) {
  const now = Date.now()
  const a = attempts.get(key)
  const fresh = !a || now - a.first > LOCK_MS
  const next = fresh ? { count: 1, first: now } : { ...a, count: a.count + 1 }
  if (next.count >= MAX_ATTEMPTS) next.lockedUntil = now + LOCK_MS
  attempts.set(key, next)
  return MAX_ATTEMPTS - next.count
}

async function getUser(id) {
  return toUser(await User.findById(id).lean())
}

export async function logActivity(user, action, resource, recordId, label = '') {
  try {
    await Activity.create({
      _id: await nextId(Activity),
      userId: user?.id || null,
      userName: String(user?.name || 'System').slice(0, 60),
      action,
      resource,
      recordId: recordId || null,
      label: String(label).slice(0, 160),
    })
  } catch (e) {
    console.error('  [activity]', e.message)
  }
}

/** Express middleware: requires a valid Bearer token, attaches req.user. */
export const requireAuth = wrap(async (req, _res, next) => {
  const h = req.headers.authorization || ''
  const token = h.startsWith('Bearer ') ? h.slice(7) : null
  if (!token) throw new HttpError(401, 'Please sign in to continue')
  let payload
  try { payload = jwt.verify(token, SECRET) } catch { throw new HttpError(401, 'Your session has expired. Please sign in again') }
  const row = validId(payload.sub) ? await User.findById(payload.sub).lean() : null
  if (!row) throw new HttpError(401, 'Account no longer exists')
  if (row.active === false) throw new HttpError(401, 'This account has been deactivated')
  if ((payload.ver ?? 0) !== (row.tokenVersion || 0)) throw new HttpError(401, 'You were signed out. Please sign in again')
  req.user = toUser(row)
  next()
})

export const requireRole = (...roles) => (req, _res, next) =>
  roles.includes(req.user?.role) ? next() : next(new HttpError(403, 'You do not have permission to do that'))

function validatePassword(p) {
  const s = String(p || '')
  if (s.length < 8) return 'Password must be at least 8 characters'
  if (s.length > 72) return 'Password must be at most 72 characters'
  if (!/[A-Za-z]/.test(s) || !/\d/.test(s)) return 'Password must contain letters and numbers'
  return null
}

// ---------------- /api/auth ----------------
export const authRouter = express.Router()

authRouter.post('/login', wrap(async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase()
  const password = String(req.body?.password || '')
  const fields = {}
  if (!EMAIL.test(email)) fields.email = 'Enter a valid email address'
  if (!password) fields.password = 'Password is required'
  if (Object.keys(fields).length) throw new HttpError(400, 'Please fix the highlighted fields', fields)

  const key = attemptKey(req, email)
  checkLock(key)
  const found = await User.findOne({ email }).collation(CI).lean()
  // always run a compare so response time doesn't reveal whether the email exists
  const ok = await bcrypt.compare(password, found?.passwordHash || DUMMY_HASH)
  if (!found || !ok) {
    const left = recordFailure(key)
    if (found) await logActivity({ id: found._id, name: found.name }, 'failed', 'users', found._id, 'Failed sign-in attempt')
    if (left <= 0) checkLock(key)
    throw new HttpError(401, left <= 2 ? `Incorrect email or password. ${left} attempt${left === 1 ? '' : 's'} left before a 15-minute lock.` : 'Incorrect email or password', { password: 'Incorrect email or password' })
  }
  if (found.active === false) throw new HttpError(403, 'This account has been deactivated. Contact your administrator.')
  attempts.delete(key)

  await User.updateOne({ _id: found._id }, { lastLogin: new Date() })
  const user = await getUser(found._id)
  await logActivity(user, 'login', 'users', user.id, user.name)
  // tell the client when the stored password no longer meets the policy, so it can prompt a change
  res.json({ token: await sign(user, req.body?.remember), user, passwordWeak: Boolean(validatePassword(password)) })
}))

authRouter.post('/register', wrap(async (req, res) => {
  const name = String(req.body?.name || '').trim()
  const email = String(req.body?.email || '').trim().toLowerCase()
  const password = String(req.body?.password || '')
  const fields = {}
  if (name.length < 3) fields.name = 'Name must be at least 3 characters'
  else if (name.length > 60) fields.name = 'Name must be at most 60 characters'
  if (!EMAIL.test(email)) fields.email = 'Enter a valid email address'
  const pw = validatePassword(password)
  if (pw) fields.password = pw
  if (!fields.email && await User.exists({ email }).collation(CI)) fields.email = 'An account with this email already exists'
  if (Object.keys(fields).length) throw new HttpError(400, 'Please fix the highlighted fields', fields)

  // self sign-up is only for students already on record
  const student = await Student.findOne({ email }).collation(CI).select('_id').lean()
  if (!student) throw new HttpError(400, 'Please fix the highlighted fields', { email: 'This email is not on the student register. Contact the event cell.' })
  const id = await nextId(User)
  await User.create({ _id: id, name, email, passwordHash: await bcrypt.hash(password, 10), role: 'student', studentId: student._id, lastLogin: new Date() })
  const user = await getUser(id)
  await logActivity(user, 'created', 'users', user.id, `${user.name} signed up`)
  res.status(201).json({ token: await sign(user, req.body?.remember), user })
}))

authRouter.post('/logout', requireAuth, wrap(async (req, res) => {
  await logActivity(req.user, 'logout', 'users', req.user.id, req.user.name)
  res.status(204).end()
}))

/** Invalidate every token issued so far (all devices). */
authRouter.post('/logout-all', requireAuth, wrap(async (req, res) => {
  await User.updateOne({ _id: req.user.id }, { $inc: { tokenVersion: 1 } })
  await logActivity(req.user, 'logout', 'users', req.user.id, 'Signed out of all devices')
  res.status(204).end()
}))

authRouter.get('/me', requireAuth, (req, res) => res.json(req.user))

authRouter.put('/profile', requireAuth, wrap(async (req, res) => {
  const name = String(req.body?.name || '').trim()
  if (name.length < 3 || name.length > 60) throw new HttpError(400, 'Please fix the highlighted fields', { name: 'Name must be 3–60 characters' })
  await User.updateOne({ _id: req.user.id }, { $set: { name } })
  res.json(await getUser(req.user.id))
}))

authRouter.put('/password', requireAuth, wrap(async (req, res) => {
  const { current = '', next = '' } = req.body || {}
  const row = await User.findById(req.user.id).select('passwordHash').lean()
  if (!(await bcrypt.compare(String(current), row.passwordHash)))
    throw new HttpError(400, 'Please fix the highlighted fields', { current: 'Current password is incorrect' })
  const pw = validatePassword(next)
  if (pw) throw new HttpError(400, 'Please fix the highlighted fields', { next: pw })
  if (String(next) === String(current)) throw new HttpError(400, 'Please fix the highlighted fields', { next: 'New password must differ from the current one' })
  // changing the password signs out every other session
  await User.updateOne({ _id: req.user.id }, { $set: { passwordHash: await bcrypt.hash(String(next), 10) }, $inc: { tokenVersion: 1 } })
  await logActivity(req.user, 'updated', 'users', req.user.id, 'Changed password')
  const user = await getUser(req.user.id)
  res.json({ token: await sign(user, true) })
}))

// ---------------- /api/users (admin) ----------------
export const usersRouter = express.Router()
usersRouter.use(requireAuth, requireRole('admin'))

async function cleanUser(body, id) {
  const data = {
    name: String(body.name || '').trim(),
    email: String(body.email || '').trim().toLowerCase(),
    role: body.role,
    studentId: body.studentId ? Number(body.studentId) : null,
    organizerId: body.organizerId ? Number(body.organizerId) : null,
    password: body.password ? String(body.password) : '',
    active: body.active === undefined ? true : body.active === true || body.active === 'true',
  }
  const f = {}
  if (data.name.length < 3 || data.name.length > 60) f.name = 'Name must be 3–60 characters'
  if (!EMAIL.test(data.email)) f.email = 'Enter a valid email address'
  else if (await User.exists({ email: data.email, _id: { $ne: id || 0 } }).collation(CI)) f.email = 'An account with this email already exists'
  if (!['admin', 'organizer', 'student'].includes(data.role)) f.role = 'Choose a role'
  if (!id || data.password) { const pw = validatePassword(data.password); if (pw) f.password = pw }
  if (data.role !== 'student') data.studentId = null
  if (data.role !== 'organizer') data.organizerId = null
  // MongoDB has no foreign keys, so make sure the linked records really exist
  if (data.studentId !== null && !(validId(data.studentId) && await Student.exists({ _id: data.studentId }))) f.studentId = 'Student does not exist'
  if (data.organizerId !== null && !(validId(data.organizerId) && await Organizer.exists({ _id: data.organizerId }))) f.organizerId = 'Organizer does not exist'
  return { data, f }
}

usersRouter.get('/', wrap(async (_req, res) => {
  res.json((await User.find().sort({ _id: -1 }).lean()).map(toUser))
}))

usersRouter.post('/', wrap(async (req, res) => {
  const { data, f } = await cleanUser(req.body || {})
  if (Object.keys(f).length) throw new HttpError(400, 'Please fix the highlighted fields', f)
  const id = await nextId(User)
  await User.create({
    _id: id,
    name: data.name,
    email: data.email,
    passwordHash: await bcrypt.hash(data.password, 10),
    role: data.role,
    studentId: data.studentId,
    organizerId: data.organizerId,
  })
  await logActivity(req.user, 'created', 'users', id, data.name)
  res.status(201).json(await getUser(id))
}))

usersRouter.put('/:id', wrap(async (req, res) => {
  const id = validId(req.params.id)
  const existing = id && await getUser(id)
  if (!existing) throw new HttpError(404, 'User not found')
  const { data, f } = await cleanUser({ ...existing, ...req.body }, id)
  if (id === req.user.id && data.role !== 'admin') f.role = 'You cannot remove your own admin role'
  if (id === req.user.id && !data.active) f.active = 'You cannot deactivate your own account'
  if (Object.keys(f).length) throw new HttpError(400, 'Please fix the highlighted fields', f)
  // deactivating or changing role revokes existing sessions
  const revoke = existing.active !== data.active || existing.role !== data.role || Boolean(data.password)
  const set = { name: data.name, email: data.email, role: data.role, studentId: data.studentId, organizerId: data.organizerId, active: data.active }
  if (data.password) set.passwordHash = await bcrypt.hash(data.password, 10)
  await User.updateOne({ _id: id }, { $set: set, ...(revoke ? { $inc: { tokenVersion: 1 } } : {}) }, { runValidators: true })
  await logActivity(req.user, 'updated', 'users', id, data.name)
  res.json(await getUser(id))
}))

usersRouter.delete('/:id', wrap(async (req, res) => {
  const id = validId(req.params.id)
  if (id === req.user.id) throw new HttpError(409, 'You cannot delete your own account')
  const u = id && await getUser(id)
  if (!u) throw new HttpError(404, 'User not found')
  await User.deleteOne({ _id: id })
  await Activity.updateMany({ userId: id }, { $set: { userId: null } }) // keep the history, drop the link
  await logActivity(req.user, 'deleted', 'users', id, u.name)
  res.status(204).end()
}))

// ---------------- seed demo accounts ----------------
export async function seedUsers() {
  if (await User.countDocuments() > 0) return
  const demo = [
    { name: 'Admin', email: 'admin@college.edu', password: process.env.ADMIN_PASSWORD || 'admin123', role: 'admin' },
    { name: 'Dr. Meera Nair', email: 'meera.nair@college.edu', password: 'organizer123', role: 'organizer', organizerId: 1 },
    { name: 'Aarav Sharma', email: 'aarav.s@college.edu', password: 'student123', role: 'student', studentId: 1 },
  ]
  for (const u of demo) {
    await User.create({
      _id: await nextId(User),
      name: u.name,
      email: u.email,
      passwordHash: await bcrypt.hash(u.password, 10),
      role: u.role,
      studentId: u.studentId || null,
      organizerId: u.organizerId || null,
    })
  }
  console.log('  [auth] Created starter accounts (admin, organizer, student). Change their passwords after first sign-in.')
}
