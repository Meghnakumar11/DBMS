// ------------------------------------------------------------
// CampusEvents · MongoDB schema (Mongoose models)
// One collection per module. Schema validators and unique indexes
// are the last line of defence behind the API validation in
// server/resources.js.
//
// * Documents use a numeric _id (1, 2, 3 …) handed out by the
//   `counters` collection, so the API keeps the same ids the
//   frontend and src/data/mockData.js already use.
// * Field names are the camelCase keys of the JSON API.
// * Dates are stored as "YYYY-MM-DD" and times as "HH:MM" strings
//   (they sort correctly and match the frontend 1:1).
// * MongoDB has no foreign keys: references are checked in
//   server/resources.js and deletes cascade in server/index.js.
// ------------------------------------------------------------
import mongoose from 'mongoose'

const { Schema, model } = mongoose

/** Case-insensitive collation: "Technical" and "technical" count as the same value. */
export const CI = { locale: 'en', strength: 2 }

const OPTS = { versionKey: false, timestamps: { createdAt: 'createdAt', updatedAt: false } }
const ID = { type: Number, required: true }
const DATE = { type: String, match: [/^\d{4}-\d{2}-\d{2}$/, 'Enter a valid date'] }
const TIME = { type: String, match: [/^([01]\d|2[0-3]):[0-5]\d$/, 'Enter a valid time (HH:MM)'] }
const refId = { type: Number, required: true }

// ---------- master data ----------
const categorySchema = new Schema({
  _id: ID,
  name: { type: String, required: true, maxlength: 40 },
  description: { type: String, default: '', maxlength: 160 },
}, OPTS)
categorySchema.index({ name: 1 }, { unique: true, collation: CI })

const venueSchema = new Schema({
  _id: ID,
  name: { type: String, required: true, maxlength: 60 },
  building: { type: String, required: true, maxlength: 60 },
  capacity: { type: Number, required: true, min: 10, max: 10000 },
}, OPTS)
venueSchema.index({ name: 1 }, { unique: true, collation: CI })

const organizerSchema = new Schema({
  _id: ID,
  name: { type: String, required: true, maxlength: 60 },
  department: { type: String, required: true, maxlength: 60 },
  email: { type: String, required: true, maxlength: 120 },
  phone: { type: String, default: '', maxlength: 20 },
}, OPTS)
organizerSchema.index({ email: 1 }, { unique: true, collation: CI })

const studentSchema = new Schema({
  _id: ID,
  rollNo: { type: String, required: true, maxlength: 7 },
  name: { type: String, required: true, maxlength: 60 },
  email: { type: String, required: true, maxlength: 120 },
  department: { type: String, required: true, maxlength: 60 },
  year: { type: Number, required: true, min: 1, max: 4 },
  phone: { type: String, default: '', maxlength: 20 },
}, OPTS)
studentSchema.index({ rollNo: 1 }, { unique: true, collation: CI })
studentSchema.index({ email: 1 }, { unique: true, collation: CI })

// ---------- events ----------
const eventSchema = new Schema({
  _id: ID,
  title: { type: String, required: true, maxlength: 80 },
  categoryId: refId,
  venueId: refId,
  organizerId: refId,
  date: { ...DATE, required: true },
  startTime: { ...TIME, required: true },
  endTime: { ...TIME, required: true },
  maxParticipants: { type: Number, required: true, min: 1, max: 5000 },
  status: { type: String, required: true, enum: ['Upcoming', 'Ongoing', 'Completed', 'Cancelled'] },
  description: { type: String, default: '', maxlength: 300 },
}, OPTS)
eventSchema.index({ title: 1 }, { unique: true, collation: CI })
eventSchema.index({ venueId: 1, date: 1 })
eventSchema.index({ categoryId: 1 })
eventSchema.index({ organizerId: 1 })
eventSchema.pre('validate', function () {
  if (this.startTime && this.endTime && this.endTime <= this.startTime) this.invalidate('endTime', 'End time must be after start time')
})

// ---------- participation (one document per student + event) ----------
const registrationSchema = new Schema({
  _id: ID,
  studentId: refId,
  eventId: refId,
  registeredOn: { ...DATE, required: true },
  status: { type: String, required: true, enum: ['Confirmed', 'Waitlisted', 'Cancelled'] },
}, OPTS)
registrationSchema.index({ studentId: 1, eventId: 1 }, { unique: true })
registrationSchema.index({ eventId: 1 })

const attendanceSchema = new Schema({
  _id: ID,
  studentId: refId,
  eventId: refId,
  status: { type: String, required: true, enum: ['Present', 'Absent'] },
  checkInTime: { ...TIME, default: null },
}, { ...OPTS, collection: 'attendance' })
attendanceSchema.index({ studentId: 1, eventId: 1 }, { unique: true })
attendanceSchema.index({ eventId: 1 })
attendanceSchema.pre('validate', function () {
  if ((this.status === 'Present') !== Boolean(this.checkInTime)) this.invalidate('checkInTime', 'Check-in time is required when (and only when) the student is present')
})

const feedbackSchema = new Schema({
  _id: ID,
  studentId: refId,
  eventId: refId,
  rating: { type: Number, required: true, min: 1, max: 5 },
  comments: { type: String, required: true, minlength: 10, maxlength: 300 },
  submittedOn: { ...DATE, required: true },
}, { ...OPTS, collection: 'feedback' })
feedbackSchema.index({ studentId: 1, eventId: 1 }, { unique: true })
feedbackSchema.index({ eventId: 1 })

// ---------- authentication & audit ----------
const userSchema = new Schema({
  _id: ID,
  name: { type: String, required: true, maxlength: 60 },
  email: { type: String, required: true, maxlength: 120 },
  passwordHash: { type: String, required: true },
  role: { type: String, required: true, enum: ['admin', 'organizer', 'student'] },
  studentId: { type: Number, default: null },
  organizerId: { type: Number, default: null },
  active: { type: Boolean, default: true },
  tokenVersion: { type: Number, default: 0 },
  lastLogin: { type: Date, default: null },
}, OPTS)
userSchema.index({ email: 1 }, { unique: true, collation: CI })

const activitySchema = new Schema({
  _id: ID,
  userId: { type: Number, default: null },
  userName: { type: String, default: 'System', maxlength: 60 },
  action: { type: String, required: true, enum: ['created', 'updated', 'deleted', 'login', 'logout', 'failed'] },
  resource: { type: String, required: true, maxlength: 20 },
  recordId: { type: Number, default: null },
  label: { type: String, default: '', maxlength: 160 },
}, { ...OPTS, collection: 'activity' })
activitySchema.index({ createdAt: -1 })

const counterSchema = new Schema({ _id: String, seq: { type: Number, default: 0 } }, { versionKey: false })

export const Category = model('Category', categorySchema)
export const Venue = model('Venue', venueSchema)
export const Organizer = model('Organizer', organizerSchema)
export const Student = model('Student', studentSchema)
export const Event = model('Event', eventSchema)
export const Registration = model('Registration', registrationSchema)
export const Attendance = model('Attendance', attendanceSchema)
export const Feedback = model('Feedback', feedbackSchema)
export const User = model('User', userSchema)
export const Activity = model('Activity', activitySchema)
export const Counter = model('Counter', counterSchema)

/** Every collection that holds numbered documents. */
export const MODELS = [Category, Venue, Organizer, Student, Event, Registration, Attendance, Feedback, User, Activity]

/** Next numeric id for a model (atomic, so two requests never get the same id). */
export async function nextId(Model) {
  const c = await Counter.findOneAndUpdate(
    { _id: Model.collection.name },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: 'after' },
  ).lean()
  return c.seq
}

/** Creates the collections + indexes and makes sure every counter is past the highest id in use. */
export async function prepareCollections() {
  for (const Model of MODELS) {
    await Model.createCollection()
    await Model.createIndexes()
  }
  await syncCounters()
}

export async function syncCounters() {
  for (const Model of MODELS) {
    const top = await Model.findOne().sort({ _id: -1 }).select('_id').lean()
    await Counter.updateOne({ _id: Model.collection.name }, { $max: { seq: top?._id || 0 } }, { upsert: true })
  }
}
