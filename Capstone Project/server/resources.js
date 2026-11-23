// ------------------------------------------------------------
// RESOURCE DEFINITIONS
//
// Each resource names its MongoDB collection (Mongoose model),
// declares field rules, and adds business rules (check) that
// need the database. The same rules the UI enforces are
// re-checked here: never trust the client alone.
//
// MongoDB has no foreign keys, so relationships live here too:
//   ref      → the referenced document must exist
//   inUse    → block the delete while other documents point here
//   cascade  → delete dependent documents together with this one
//   unlink   → clear a reference instead of deleting (SET NULL)
// ------------------------------------------------------------
import { CI, Category, Venue, Organizer, Student, Event, Registration, Attendance, Feedback, User } from './models.js'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const PHONE_OK = (v) => /^[0-9]{10}$/.test(String(v).replace(/[\s-]/g, ''))
const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// field helpers --------------------------------------------------------
const str = (o = {}) => ({ type: 'string', ...o })
const int = (o = {}) => ({ type: 'int', ...o })
const date = (o = {}) => ({ type: 'date', ...o })
const time = (o = {}) => ({ type: 'time', ...o })
const ref = (model, label, o = {}) => ({ type: 'int', ref: { model, label }, required: true, ...o })

/** Is `value` already used in `field` by another document? (case-insensitive) */
async function taken(Model, field, value, id) {
  return Boolean(await Model.exists({ [field]: value, _id: { $ne: id || 0 } }).collation(CI))
}
/** Does another document already link this student and event? */
async function paired(Model, f, id) {
  return Boolean(await Model.exists({ studentId: f.studentId, eventId: f.eventId, _id: { $ne: id || 0 } }))
}

const PARTICIPATION = [Registration, Attendance, Feedback]

export const resources = {
  categories: {
    model: Category,
    fields: {
      name: str({ required: true, minLength: 2, maxLength: 40, pattern: /^[A-Za-z &/-]+$/, patternMessage: 'Letters, spaces, & / - only' }),
      description: str({ maxLength: 160 }),
    },
    unique: [{ keys: ['name'], field: 'name', message: 'This category already exists' }],
    async check(f, id) {
      const e = {}
      if (await taken(Category, 'name', f.name, id)) e.name = 'This category already exists'
      return e
    },
    inUse: { model: Event, field: 'categoryId', what: 'event' },
  },

  venues: {
    model: Venue,
    fields: {
      name: str({ required: true, minLength: 3, maxLength: 60 }),
      building: str({ required: true, minLength: 2, maxLength: 60 }),
      capacity: int({ required: true, min: 10, max: 10000 }),
    },
    unique: [{ keys: ['name'], field: 'name', message: 'A venue with this name already exists' }],
    async check(f, id) {
      const e = {}
      if (await taken(Venue, 'name', f.name, id)) e.name = 'A venue with this name already exists'
      if (id) {
        const big = await Event.findOne({ venueId: id, maxParticipants: { $gt: f.capacity } }).lean()
        if (big) e.capacity = `"${big.title}" here expects ${big.maxParticipants} people`
      }
      return e
    },
    inUse: { model: Event, field: 'venueId', what: 'event' },
  },

  organizers: {
    model: Organizer,
    fields: {
      name: str({ required: true, minLength: 3, maxLength: 60 }),
      department: str({ required: true, minLength: 2, maxLength: 60 }),
      email: str({ required: true, email: true, maxLength: 120 }),
      phone: str({ maxLength: 20 }),
    },
    unique: [{ keys: ['email'], field: 'email', message: 'This email is already in use' }],
    async check(f, id) {
      const e = {}
      if (await taken(Organizer, 'email', f.email, id)) e.email = 'This email is already in use'
      if (f.phone && !PHONE_OK(f.phone)) e.phone = 'Enter a valid 10-digit phone number'
      return e
    },
    inUse: { model: Event, field: 'organizerId', what: 'event' },
    unlink: [{ model: User, field: 'organizerId' }],
  },

  students: {
    model: Student,
    fields: {
      rollNo: str({ required: true, pattern: /^[A-Z]{2}\d{5}$/i, patternMessage: 'Format: 2 letters + 5 digits (e.g. CS21001)', upper: true }),
      name: str({ required: true, minLength: 3, maxLength: 60, pattern: /^[A-Za-z .'-]+$/, patternMessage: "Only letters, spaces and . ' - allowed" }),
      email: str({ required: true, email: true, maxLength: 120 }),
      department: str({ required: true, maxLength: 60 }),
      year: int({ required: true, min: 1, max: 4 }),
      phone: str({ maxLength: 20 }),
    },
    unique: [
      { keys: ['rollNo'], field: 'rollNo', message: 'A student with this roll number already exists' },
      { keys: ['email'], field: 'email', message: 'This email is already registered' },
    ],
    async check(f, id) {
      const e = {}
      if (await taken(Student, 'rollNo', f.rollNo, id)) e.rollNo = 'A student with this roll number already exists'
      if (await taken(Student, 'email', f.email, id)) e.email = 'This email is already registered'
      if (f.phone && !PHONE_OK(f.phone)) e.phone = 'Enter a valid 10-digit phone number'
      return e
    },
    cascade: PARTICIPATION.map((model) => ({ model, field: 'studentId' })),
    unlink: [{ model: User, field: 'studentId' }],
  },

  events: {
    model: Event,
    fields: {
      title: str({ required: true, minLength: 3, maxLength: 80 }),
      categoryId: ref(Category, 'Category'),
      venueId: ref(Venue, 'Venue'),
      organizerId: ref(Organizer, 'Organizer'),
      date: date({ required: true }),
      startTime: time({ required: true }),
      endTime: time({ required: true }),
      maxParticipants: int({ required: true, min: 1, max: 5000 }),
      status: str({ required: true, enum: ['Upcoming', 'Ongoing', 'Completed', 'Cancelled'] }),
      description: str({ maxLength: 300 }),
    },
    unique: [{ keys: ['title'], field: 'title', message: 'An event with this title already exists' }],
    async check(f, id) {
      const e = {}
      if (await taken(Event, 'title', f.title, id)) e.title = 'An event with this title already exists'
      if (f.endTime <= f.startTime) e.endTime = 'End time must be after start time'
      const venue = await Venue.findById(f.venueId).lean()
      if (venue && f.maxParticipants > venue.capacity) e.maxParticipants = `${venue.name} holds only ${venue.capacity} people`
      if (f.status === 'Upcoming' && f.date < today()) e.date = 'An upcoming event cannot be in the past'
      if (f.status === 'Completed' && f.date > today()) e.status = 'A future event cannot be marked Completed'
      if (f.status !== 'Cancelled' && !e.endTime) {
        // two bookings overlap when each one starts before the other ends ("HH:MM" strings compare correctly)
        const clash = await Event.findOne({
          _id: { $ne: id || 0 },
          venueId: f.venueId,
          date: f.date,
          status: { $ne: 'Cancelled' },
          startTime: { $lt: f.endTime },
          endTime: { $gt: f.startTime },
        }).lean()
        if (clash) e.venueId = `Venue is booked by "${clash.title}" (${clash.startTime}–${clash.endTime})`
      }
      return e
    },
    cascade: PARTICIPATION.map((model) => ({ model, field: 'eventId' })),
  },

  registrations: {
    model: Registration,
    fields: {
      studentId: ref(Student, 'Student'),
      eventId: ref(Event, 'Event'),
      registeredOn: date({ required: true }),
      status: str({ required: true, enum: ['Confirmed', 'Waitlisted', 'Cancelled'] }),
    },
    unique: [{ keys: ['studentId', 'eventId'], field: 'eventId', message: 'This student is already registered for this event' }],
    async check(f, id) {
      const e = {}
      if (await paired(Registration, f, id)) e.eventId = 'This student is already registered for this event'
      const ev = await Event.findById(f.eventId).lean()
      if (ev) {
        if (ev.status === 'Cancelled') e.eventId = 'Cannot register for a cancelled event'
        if (ev.status === 'Completed' && !id) e.eventId = 'Cannot register for an event that is already completed'
        if (f.registeredOn > ev.date) e.registeredOn = 'Registration date cannot be after the event date'
        if (f.status === 'Confirmed') {
          const n = await Registration.countDocuments({ eventId: ev._id, status: 'Confirmed', _id: { $ne: id || 0 } })
          if (n >= ev.maxParticipants) e.status = `Event is full (${ev.maxParticipants}). Choose Waitlisted instead`
        }
      }
      if (f.registeredOn > today()) e.registeredOn = 'Registration date cannot be in the future'
      return e
    },
  },

  attendance: {
    model: Attendance,
    fields: {
      studentId: ref(Student, 'Student'),
      eventId: ref(Event, 'Event'),
      status: str({ required: true, enum: ['Present', 'Absent'] }),
      checkInTime: time({ nullable: true }),
    },
    unique: [{ keys: ['studentId', 'eventId'], field: 'studentId', message: 'Attendance is already recorded for this student and event' }],
    async check(f, id) {
      const e = {}
      if (await paired(Attendance, f, id)) e.studentId = 'Attendance is already recorded for this student and event'
      else if (!(await Registration.exists({ studentId: f.studentId, eventId: f.eventId, status: 'Confirmed' })))
        e.studentId = 'This student has no confirmed registration for the selected event'
      const ev = await Event.findById(f.eventId).lean()
      if (ev && (ev.status === 'Upcoming' || ev.status === 'Cancelled')) e.eventId = 'Only ongoing or completed events can have attendance'
      if (f.status === 'Present' && !f.checkInTime) e.checkInTime = 'Check-in time is required when the student is present'
      if (f.status === 'Absent' && f.checkInTime) e.checkInTime = 'An absent student cannot have a check-in time'
      if (ev && f.checkInTime && (f.checkInTime < ev.startTime || f.checkInTime > ev.endTime)) e.checkInTime = `Check-in must be between ${ev.startTime} and ${ev.endTime}`
      return e
    },
  },

  feedback: {
    model: Feedback,
    fields: {
      studentId: ref(Student, 'Student'),
      eventId: ref(Event, 'Event'),
      rating: int({ required: true, min: 1, max: 5 }),
      comments: str({ required: true, minLength: 10, maxLength: 300 }),
      submittedOn: date({ required: true }),
    },
    unique: [{ keys: ['studentId', 'eventId'], field: 'studentId', message: 'This student has already submitted feedback for this event' }],
    async check(f, id) {
      const e = {}
      if (await paired(Feedback, f, id)) e.studentId = 'This student has already submitted feedback for this event'
      else if (!(await Attendance.exists({ studentId: f.studentId, eventId: f.eventId, status: 'Present' })))
        e.studentId = 'Only students marked Present can give feedback for this event'
      const ev = await Event.findById(f.eventId).lean()
      if (ev && ev.status !== 'Completed' && ev.status !== 'Ongoing') e.eventId = 'Feedback can be given only for ongoing or completed events'
      if (ev && f.submittedOn < ev.date) e.submittedOn = 'Feedback cannot be submitted before the event date'
      if (f.submittedOn > today()) e.submittedOn = 'Date cannot be in the future'
      return e
    },
  },
}

// ---------- generic field validation ----------------------------------
const LABEL = (k) => k.replace(/Id$/, '').replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase())

/** Cleans the body into typed values and returns { data, errors }. */
export async function clean(def, body) {
  const data = {}
  const errors = {}
  for (const [key, f] of Object.entries(def.fields)) {
    let v = body[key]
    if (typeof v === 'string') v = v.trim()
    const empty = v === undefined || v === null || v === ''
    if (empty) {
      if (f.required) errors[key] = `${f.ref?.label || LABEL(key)} is required`
      else data[key] = f.nullable || f.type !== 'string' ? null : ''
      continue
    }
    if (f.type === 'int') {
      const n = Number(v)
      if (!Number.isInteger(n)) { errors[key] = 'Must be a whole number'; continue }
      if (f.min != null && n < f.min) { errors[key] = `Must be at least ${f.min}`; continue }
      if (f.max != null && n > f.max) { errors[key] = `Must be at most ${f.max}`; continue }
      v = n
    } else if (f.type === 'date') {
      if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(Date.parse(v))) { errors[key] = 'Enter a valid date'; continue }
    } else if (f.type === 'time') {
      if (typeof v !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(v)) { errors[key] = 'Enter a valid time (HH:MM)'; continue }
      v = v.slice(0, 5)
    } else {
      v = String(v)
      if (f.upper) v = v.toUpperCase()
      if (f.email && !EMAIL.test(v)) { errors[key] = 'Enter a valid email address'; continue }
      if (f.enum && !f.enum.includes(v)) { errors[key] = `Must be one of: ${f.enum.join(', ')}`; continue }
      if (f.pattern && !f.pattern.test(v)) { errors[key] = f.patternMessage || 'Invalid format'; continue }
      if (f.minLength && v.length < f.minLength) { errors[key] = `Must be at least ${f.minLength} characters`; continue }
      if (f.maxLength && v.length > f.maxLength) { errors[key] = `Must be at most ${f.maxLength} characters`; continue }
    }
    if (f.ref && !(await f.ref.model.exists({ _id: v }))) { errors[key] = `${f.ref.label} does not exist`; continue }
    data[key] = v
  }
  if (!Object.keys(errors).length && def.check) Object.assign(errors, await def.check(data, body.__id))
  return { data, errors }
}

/** Turns a MongoDB document into the JSON row the frontend expects ({ id, ...fields }). */
export function toRow(def, doc) {
  if (!doc) return null
  const row = { id: doc._id }
  for (const [key, f] of Object.entries(def.fields)) {
    row[key] = doc[key] ?? (f.type === 'string' || f.type === 'time' ? '' : null)
  }
  return row
}
