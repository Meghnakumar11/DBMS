# K.R. Mangalam University · Campus Events Portal
https://web-production-53633ce2.up.railway.app/

A web application to manage college events and maintain records of students, event
categories, venues, organizers, registrations, attendance and feedback.

**Phase 1: Frontend.** React + Vite (can still run on mock data with `VITE_USE_MOCK=true`).
**Phase 2 (done): Backend + database.** Node.js + Express REST API over MongoDB (Mongoose).

---

## Running the app

**Requirements:** Node.js 20.19+ (LTS recommended). No database install needed.

```bash
npm install        # first time only
npm run dev        # API on :5050 + UI on http://localhost:5180
```

Or double-click **START-WINDOWS.bat** / **START-MAC.command**. They install on first run and open the browser.
Step-by-step instructions for someone receiving the project are in **HOW-TO-RUN.txt**.

`npm run dev` starts both servers. On first run the API starts a **bundled MongoDB 8** server
(a real `mongod` that the `mongodb-memory-server` package downloads once, about 140 MB; data is kept
on disk in `server/.mongodata`), creates the collections and indexes from `server/models.js` and
seeds the sample data and starter accounts.

To use your own MongoDB instead (a local install or MongoDB Atlas), set `MONGODB_URI` in `.env`
(e.g. `mongodb://localhost:27017/campus_events`). See `.env.example`.

| Command            | What it does                                         |
|--------------------|------------------------------------------------------|
| `npm run dev`      | API + UI with hot reload                             |
| `npm run server`   | API only                                             |
| `npm run db:reset` | Wipe all collections and re-seed the sample data     |
| `npm run build && npm start` | Production: Express serves the built UI on :5050 |

### Sharing the project as a zip

Leave these out of the zip (they are machine-specific or private and are recreated automatically):
`node_modules/`, `dist/`, `server/.mongodata/` (the database), `server/.jwt-secret`, `.env`.

### Backend layout

```
server/
├── index.js       # Express app, generic CRUD router, error → JSON mapping
├── db.js          # Mongoose connection; bundled MongoDB when MONGODB_URI is empty
├── models.js      # Mongoose schemas: collections, validators, unique indexes, id counters
├── resources.js   # per-collection field rules, references and server-side business rules
├── auth.js        # login, JWT, roles, user management, audit log
└── seed.js        # loads src/data/mockData.js into the database
```

Validation errors come back as `400 { error, fields: { field: message } }` and are shown inline
under the form fields. Deleting a category / venue / organizer that events still use returns `409`.
Deleting a student or event cascades to its registrations, attendance and feedback.

MongoDB notes: documents use a numeric `_id` (1, 2, 3 … from a `counters` collection) that the API
returns as `id`, so the JSON is identical to `mockData.js`. MongoDB has no foreign keys, so the
reference checks, "in use" blocks and cascading deletes are done in the API (`resources.js`, `index.js`).

## Login, roles & security

Every API route except `/api/auth/*` and `/api/health` requires a signed JWT (`Authorization: Bearer …`).

| Role      | Can do                                                          |
|-----------|-----------------------------------------------------------------|
| Admin     | Everything, including Users & Roles and the Audit log           |
| Organizer | Manage events, registrations, attendance, feedback             |
| Student   | Student portal: register / cancel own seats, rate attended events |

Starter accounts are seeded on first run (`admin@college.edu`, `meera.nair@college.edu`, `aarav.s@college.edu`).
**Change their passwords after the first sign-in** (My profile → Change password), or set `ADMIN_PASSWORD`
in `.env` before the very first start.

Security measures

* Passwords hashed with bcrypt; policy: 8+ characters with letters and numbers
* 5 failed sign-ins per email + IP → 15-minute lock (HTTP 429); failures are written to the audit log
* "Keep me signed in" → 7-day token, otherwise a 12-hour per-tab session
* Changing a password, changing a role or deactivating an account revokes existing sessions;
  "Sign out of all devices" on the profile page does the same on demand
* Self sign-up only for emails already on the student register
* Admins can deactivate / reactivate accounts (individually or in bulk)
* Security headers (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, …), restricted CORS, no `X-Powered-By`
* Full audit trail (sign-ins, failures, every create / update / delete) with filters and CSV export

### Module highlights

* **Events**: cover cards, month calendar, table; countdowns; students register from a card
* **Registrations**: drag-and-drop Kanban (Confirmed / Waitlisted / Cancelled), promote from waitlist
* **Attendance**: live check-in desk with one-tap Present/Absent and "mark remaining present"
* **Feedback**: rating breakdown, most-loved event, review cards
* **Students**: department/year analytics, ID cards, full participation timeline per student
* **Venues / Organizers / Categories**: seat-map cards, profile cards, gradient tiles with share rings
* **Everywhere**: ⌘K command palette, keyboard shortcuts (`?`), bulk select / export / delete with 5-second Undo,
  show/hide columns, rows-per-page, print view, unsaved-changes guard, collapsible sidebar
* **Settings**: light / dark / system theme, accent colour, density, reduced motion, default page size

## Branding

Institution name, portal name and address live in `src/brand.js`; the navy & gold theme, crest and
typography (Fraunces + Plus Jakarta Sans) live in `src/brand.css`. Change those two files to rebrand.

## Features

| Module            | What it stores                                                    |
|-------------------|-------------------------------------------------------------------|
| Dashboard         | Totals, upcoming events, events per category, recent activity      |
| Students          | Roll no, name, email, department, year, phone                      |
| Events            | Title, category, venue, organizer, date, time, capacity, status    |
| Event Categories  | Technical, Cultural, Sports, Seminar, Social …                     |
| Venues            | Name, building, seating capacity                                   |
| Organizers        | Faculty / committee member, department, contact                    |
| Registrations     | Student ⇄ Event sign-up with status (Confirmed / Waitlisted / Cancelled) |
| Attendance        | Student ⇄ Event presence with check-in time                        |
| Feedback          | Student ⇄ Event rating (1–5) and comments                          |

Every module supports **search, filters, column sorting, pagination, CSV export, add, edit
and delete**. New records appear at the top of the list. Events open a detail panel showing
registrations, attendance rate, average rating and the registered students.

### Validation (client-side)

Forms validate inline and show the message under the field:

* required fields, email format, 10-digit phone, min/max length, numeric ranges
* roll-number format (`CS21001`), unique roll number / email / event title / category / venue
* event: end time after start time, capacity not above venue capacity, no venue double-booking,
  upcoming events cannot be in the past
* registration: one per student per event, no registering for completed events, event full ⇒ waitlist
* attendance: student must hold a confirmed registration, check-in time required when Present
* feedback: only students marked Present, one per student per event, 10–300 character comment

The same rules will be re-checked on the server in Phase 2 (never trust the client alone).

### UI

Responsive layout (sidebar becomes a drawer, tables become cards on phones), light/dark theme with a
circular reveal transition, page transitions, staggered row/card entrances, count-up stats, animated
attendance ring and bars, button ripples, cursor spotlight on cards, toasts with progress bars, and a
live MongoDB connection badge. All motion respects `prefers-reduced-motion` (see `src/motion.css`).

## Project structure

```
src/
├── data/mockData.js        # Stand-in for the database (Phase 1 only)
├── services/api.js         # THE data access layer – mock now, REST later
├── components/
│   ├── Layout.jsx          # Sidebar + top bar
│   ├── EntityPage.jsx      # Generic table + form + delete used by all modules
│   └── ui.jsx              # Badge, StatCard, Modal, Person, Stars, Toast …
├── pages/                  # One file per module, each is just configuration
├── utils/helpers.js        # Date formatting, colours, status → badge tone
├── App.jsx                 # Routes
└── index.css               # Design tokens + all styling
```

---

## How the backend will plug in

### 1. The frontend never touches data directly

All nine pages call **only** `src/services/api.js`, which exposes five functions:

```js
api.getAll(resource)          // GET    /api/<resource>
api.getById(resource, id)     // GET    /api/<resource>/:id
api.create(resource, data)    // POST   /api/<resource>
api.update(resource, id, d)   // PUT    /api/<resource>/:id
api.remove(resource, id)      // DELETE /api/<resource>/:id
```

`resource` is one of: `students`, `events`, `categories`, `venues`, `organizers`,
`registrations`, `attendance`, `feedback`.

Today these functions read/write an in-memory copy of `mockData.js` (with a small
delay to imitate network latency). The file already contains a second implementation
that uses `fetch()` against a REST API. Which one is used is decided by an
environment variable:

```
VITE_USE_MOCK=false
VITE_API_URL=/api
```

Flip that flag and **no page or component changes**. This is the Repository /
Service-layer pattern: UI is decoupled from the data source.

### 2. Backend stack (Phase 2)

```
Browser (React)  ──HTTP/JSON──▶  Node.js + Express REST API  ──Mongoose──▶  MongoDB
```

* **Express** exposes one generic router that implements the five endpoints above for every collection.
* **Database** has one collection per module. Documents reference each other by id, and the API
  checks those references (MongoDB has no foreign keys):
  * `events.categoryId → categories._id`
  * `events.venueId → venues._id`
  * `events.organizerId → organizers._id`
  * `registrations.studentId → students._id`, `registrations.eventId → events._id`
  * `attendance.studentId → students._id`, `attendance.eventId → events._id`
  * `feedback.studentId → students._id`, `feedback.eventId → events._id`
* JSON field names returned by the API match the keys already used in `mockData.js`
  (`categoryId`, `venueId`, `registeredOn`, …) so the frontend needs no mapping.
* The Vite dev server proxies `/api` to Express on port 5050; CORS is enabled as well.

### 3. Entity–Relationship summary

```
Category 1───* Event *───1 Venue
                 │
                 1
                 │
             Organizer

Student *───* Event   (via Registration, Attendance, Feedback)
```

### 4. Later improvements (optional)

* Login with roles (Admin / Organizer / Student) using JWT.
* Server-side search and pagination for large tables.
* Reports: attendance % per event, average rating per organizer.
