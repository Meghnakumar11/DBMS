// Seeds the database with the sample data from src/data/mockData.js
// the first time the server starts (or when run with --reset).
import { MODELS, Counter, Category, Activity, Organizer, Student, Event, Registration, Feedback, syncCounters } from './models.js'
import { resources } from './resources.js'
import * as sample from '../src/data/mockData.js'

// parents first, so every reference points at a document that already exists
const ORDER = ['categories', 'venues', 'organizers', 'students', 'events', 'registrations', 'attendance', 'feedback']

export async function seed({ reset = false } = {}) {
  if (reset) {
    for (const Model of [...MODELS, Counter]) await Model.deleteMany({})
    console.log('  [db] Database reset')
  }
  if (await Category.countDocuments() > 0) return seedActivity()

  try {
    for (const name of ORDER) {
      const def = resources[name]
      const docs = sample[name].map((row) => {
        const doc = { _id: row.id }
        for (const [key, f] of Object.entries(def.fields)) {
          const text = f.type === 'string'
          doc[key] = row[key] === '' && !text ? null : row[key] ?? (text ? '' : null)
        }
        return doc
      })
      await def.model.insertMany(docs)
    }
    await syncCounters() // the sample rows bring their own ids: continue numbering after them
    console.log('  [db] Loaded sample data')
  } catch (e) {
    // no multi-document transaction on a single MongoDB server: undo the partial load by hand
    for (const name of ORDER) await resources[name].model.deleteMany({}).catch(() => {})
    throw e
  }
  await seedActivity()
}

const MINUTE = 60 * 1000
const DAY = 24 * 60 * MINUTE
/** "2026-11-08" + "10:00" → Date in the server's local time zone. */
const at = (day, clock) => new Date(`${day}T${clock}:00`)

/** Builds a realistic activity history from the sample data (only when the log is empty). */
async function seedActivity() {
  if (await Activity.countDocuments() > 0) return
  const byId = (docs) => new Map(docs.map((d) => [d._id, d]))
  const [organizers, students, events] = (await Promise.all([Organizer.find().lean(), Student.find().lean(), Event.find().sort({ _id: 1 }).lean()]))
  const organizer = byId(organizers)
  const student = byId(students)
  const event = byId(events)
  const pair = (r) => `${student.get(r.studentId)?.name} → ${event.get(r.eventId)?.title}`

  const rows = []
  for (const e of events) {
    rows.push({ userName: organizer.get(e.organizerId)?.name, action: 'created', resource: 'events', recordId: e._id, label: e.title, createdAt: new Date(at(e.date, '10:00') - 30 * DAY) })
  }
  for (const r of await Registration.find().sort({ _id: 1 }).lean()) {
    if (!student.has(r.studentId) || !event.has(r.eventId)) continue
    rows.push({ userName: student.get(r.studentId).name, action: 'created', resource: 'registrations', recordId: r._id, label: pair(r), createdAt: new Date(at(r.registeredOn, '11:30').getTime() + r._id * MINUTE) })
  }
  for (const f of await Feedback.find().sort({ _id: 1 }).lean()) {
    if (!student.has(f.studentId) || !event.has(f.eventId)) continue
    rows.push({ userName: student.get(f.studentId).name, action: 'created', resource: 'feedback', recordId: f._id, label: pair(f), createdAt: at(f.submittedOn, '18:00') })
  }
  if (!rows.length) return
  await Activity.insertMany(rows.map((row, i) => ({ _id: i + 1, ...row })))
  await syncCounters()
}
