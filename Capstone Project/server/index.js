// ------------------------------------------------------------
// CampusEvents REST API · Express + MongoDB (Mongoose)
//
//   POST   /api/auth/login | /register      public
//   GET    /api/health                      public
//   ---- everything below requires  Authorization: Bearer <token> ----
//   GET    /api/<resource>        list (newest first)
//   GET    /api/<resource>/:id    single row
//   POST   /api/<resource>        create   → 201 row | 400 { error, fields } | 403
//   PUT    /api/<resource>/:id    update   → 200 row | 400 | 403 | 404
//   DELETE /api/<resource>/:id    delete   → 204     | 403 | 404 | 409 (in use)
//   GET    /api/activity          audit trail (who changed what)
//   /api/users                    user management (admin)
// ------------------------------------------------------------
import './env.js'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import cors from 'cors'
import { connect, disconnect, health, explainStartupError } from './db.js'
import { Activity, Student, Event, Registration, nextId, prepareCollections } from './models.js'
import { resources, clean, toRow } from './resources.js'
import { seed } from './seed.js'
import { authRouter, usersRouter, requireAuth, canWrite, logActivity, seedUsers, HttpError } from './auth.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.env.PORT || 5050)

const app = express()
app.disable('x-powered-by')
// Railway puts two proxies in front of the app; trust exactly those so req.ip is the visitor (used by the login lockout)
app.set('trust proxy', process.env.RAILWAY_ENVIRONMENT ? 2 : 'loopback')
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5180', 'http://localhost:5050'] }))
// basic security headers
app.use((_req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  })
  next()
})
app.use(express.json({ limit: '100kb' }))

// tiny request logger
app.use((req, res, next) => {
  const t = Date.now()
  res.on('finish', () => {
    if (req.path.startsWith('/api')) console.log(`  ${req.method.padEnd(6)} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - t}ms)${req.user ? ` - ${req.user.email}` : ''}`)
  })
  next()
})

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

// ---- public ----
app.get('/api/health', wrap(async (_req, res) => {
  res.json({ ok: true, ...(await health()), time: new Date().toISOString() })
}))
app.use('/api/auth', authRouter)

// ---- protected ----
app.use('/api/users', usersRouter)

app.get('/api/activity', requireAuth, wrap(async (req, res) => {
  const limit = Math.min(500, Number(req.query.limit) || 30)
  // the full audit trail (incl. sign-ins and failures) is for admins; others see the content feed
  const all = req.query.all === '1' && req.user.role === 'admin'
  const rows = await Activity.find(all ? {} : { action: { $nin: ['login', 'logout', 'failed'] } })
    .sort({ createdAt: -1, _id: -1 })
    .limit(Math.max(1, Math.floor(limit)))
    .lean()
  res.json(rows.map((a) => ({
    id: a._id, userId: a.userId ?? null, userName: a.userName, action: a.action,
    resource: a.resource, recordId: a.recordId ?? null, label: a.label, createdAt: a.createdAt,
  })))
}))

const router = express.Router({ mergeParams: true })
router.use(requireAuth)

function getDef(req) {
  const def = resources[req.params.resource]
  if (!def) throw new HttpError(404, `Unknown resource "${req.params.resource}"`)
  return def
}
function getId(req) {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id < 1) throw new HttpError(400, 'Invalid id')
  return id
}
async function findRow(def, id) {
  return toRow(def, await def.model.findById(id).lean())
}
const labelOf = (row) => row?.title || row?.name || (row ? `#${row.id}` : '')
async function describe(resource, row) {
  if (!row) return ''
  if (row.studentId && row.eventId) {
    const [student, event] = await Promise.all([
      Student.findById(row.studentId).select('name').lean(),
      Event.findById(row.eventId).select('title').lean(),
    ])
    return `${student?.name ?? null} → ${event?.title ?? null}`
  }
  return labelOf(row)
}

/** Role check + student ownership rules for write requests. */
async function authorize(req, def, existing) {
  const { user } = req
  const resource = req.params.resource
  if (!canWrite(user.role, resource)) throw new HttpError(403, `Your role (${user.role}) cannot modify ${resource}`)
  if (user.role !== 'student') return
  if (!user.studentId) throw new HttpError(403, 'Your account is not linked to a student record yet')
  if (req.method === 'DELETE') throw new HttpError(403, 'Students cannot delete records')
  if (existing && existing.studentId !== user.studentId) throw new HttpError(403, 'You can only change your own records')
  req.body.studentId = user.studentId
  const d = new Date()
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  if (resource === 'registrations') {
    // students may only cancel, or re-join a registration they cancelled
    if (req.method === 'PUT' && req.body.status === 'Cancelled') { req.body = { ...existing, status: 'Cancelled' }; return }
    if (req.method === 'PUT') req.body = { ...existing }
    req.body.studentId = user.studentId
    req.body.registeredOn = today
    // auto-waitlist when the event is full
    const eventId = Number(req.body.eventId)
    const event = Number.isInteger(eventId) ? await Event.findById(eventId).select('maxParticipants').lean() : null
    const seats = event ? await Registration.countDocuments({ eventId, status: 'Confirmed', _id: { $ne: existing?.id || 0 } }) : 0
    req.body.status = event && seats >= event.maxParticipants ? 'Waitlisted' : 'Confirmed'
  }
  if (resource === 'feedback') {
    if (req.method === 'PUT') throw new HttpError(403, 'Feedback cannot be edited once submitted')
    req.body.submittedOn = today
  }
}

router.get('/', wrap(async (req, res) => {
  const def = getDef(req)
  const docs = await def.model.find().sort({ _id: -1 }).lean()
  res.json(docs.map((d) => toRow(def, d)))
}))

router.get('/:id', wrap(async (req, res) => {
  const def = getDef(req)
  const row = await findRow(def, getId(req))
  if (!row) throw new HttpError(404, 'Record not found')
  res.json(row)
}))

router.post('/', wrap(async (req, res) => {
  const def = getDef(req)
  req.body = req.body || {}
  await authorize(req, def, null)
  const { data, errors } = await clean(def, req.body)
  if (Object.keys(errors).length) throw new HttpError(400, 'Please fix the highlighted fields', errors)
  const id = await nextId(def.model)
  await def.model.create({ _id: id, ...data })
  const row = await findRow(def, id)
  await logActivity(req.user, 'created', req.params.resource, row.id, await describe(req.params.resource, row))
  res.status(201).json(row)
}))

router.put('/:id', wrap(async (req, res) => {
  const def = getDef(req)
  const id = getId(req)
  const existing = await findRow(def, id)
  if (!existing) throw new HttpError(404, 'Record not found')
  req.body = req.body || {}
  await authorize(req, def, existing)
  const { data, errors } = await clean(def, { ...existing, ...req.body, __id: id })
  if (Object.keys(errors).length) throw new HttpError(400, 'Please fix the highlighted fields', errors)
  // load + save (instead of updateOne) so the schema validators in models.js run on the whole document
  const doc = await def.model.findById(id)
  if (!doc) throw new HttpError(404, 'Record not found')
  doc.set(data)
  await doc.save()
  const row = await findRow(def, id)
  await logActivity(req.user, 'updated', req.params.resource, id, await describe(req.params.resource, row))
  res.json(row)
}))

router.delete('/:id', wrap(async (req, res) => {
  const def = getDef(req)
  const id = getId(req)
  const existing = await findRow(def, id)
  if (!existing) throw new HttpError(404, 'Record not found')
  await authorize(req, def, existing)
  if (def.inUse) {
    const n = await def.inUse.model.countDocuments({ [def.inUse.field]: id })
    if (n > 0) throw new HttpError(409, `Cannot delete: ${n} ${def.inUse.what}${n > 1 ? 's' : ''} still use this record`)
  }
  const label = await describe(req.params.resource, existing)
  // MongoDB has no ON DELETE rules: remove dependent documents first, then the record itself
  for (const c of def.cascade || []) await c.model.deleteMany({ [c.field]: id })
  for (const u of def.unlink || []) await u.model.updateMany({ [u.field]: id }, { $set: { [u.field]: null } })
  await def.model.deleteOne({ _id: id })
  await logActivity(req.user, 'deleted', req.params.resource, id, label)
  res.status(204).end()
}))

app.use('/api/:resource', router)
app.use('/api', (_req, _res, next) => next(new HttpError(404, 'Endpoint not found')))

// ---- serve the built frontend in production (npm run build && npm start) ----
const dist = path.join(__dirname, '..', 'dist')
if (fs.existsSync(path.join(dist, 'index.html'))) {
  app.use(express.static(dist))
  app.get(/^\/(?!api).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')))
}

// ---- error handler: turn database errors into friendly JSON ----
app.use((err, req, res, _next) => {
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message, fields: err.fields })
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Malformed JSON body' })
  const def = resources[req.params?.resource]
  // duplicate key on a unique index (two requests racing past the "already exists" check)
  if (err.code === 11000) {
    const keys = Object.keys(err.keyPattern || {}).sort().join(',')
    const hit = def?.unique?.find((u) => [...u.keys].sort().join(',') === keys)
    const msg = hit?.message || 'Duplicate value'
    return res.status(409).json({ error: msg, fields: hit ? { [hit.field]: msg } : undefined })
  }
  // rejected by a schema validator in models.js
  if (err.name === 'ValidationError') {
    const fields = Object.fromEntries(Object.entries(err.errors || {}).map(([k, v]) => [k, v.message]))
    return res.status(400).json({ error: 'Value rejected by database rule', fields })
  }
  if (err.name === 'CastError') return res.status(400).json({ error: `Invalid value for ${err.path}` })
  console.error(err)
  res.status(500).json({ error: 'Internal server error' })
})

// ---- boot ----
async function main() {
  console.log('\n  K.R. Mangalam University - Campus Events API starting...')
  await connect()
  await prepareCollections()
  await seed({ reset: process.argv.includes('--reset') })
  await seedUsers()
  const server = app.listen(PORT)
  server.on('error', async (err) => { err.port = PORT; console.error(explainStartupError(err)); await disconnect().catch(() => {}); process.exit(1) })
  server.on('listening', () => console.log(`  [api] Ready at http://localhost:${PORT}/api  (open the app at http://localhost:5180)\n`))
  const stop = async () => {
    console.log('\n  Shutting down...')
    server.close()
    await disconnect()
    process.exit(0)
  }
  process.on('SIGINT', stop)
  process.on('SIGTERM', stop)
}

main().catch(async (err) => {
  console.error(explainStartupError(err))
  await disconnect().catch(() => {})
  process.exit(1)
})

export { app }
