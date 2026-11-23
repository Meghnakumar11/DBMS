# CampusEvents – College Management System
## Project Report: Phase 1 (Frontend) and Phase 2 Plan (Backend)

---

## 1. Project overview

**Purpose.** A web application for a college to manage its events end to end: publishing events,
keeping master records (students, categories, venues, organizers) and tracking participation
(registrations, attendance, feedback).

**Delivery plan.**

| Phase | Scope | Status |
|-------|-------|--------|
| 1 | Frontend web application with mock data | **Completed** |
| 2 | REST API backend + relational database | Planned |
| 3 (optional) | Authentication, reports, deployment | Future |

Phase 1 is built so that Phase 2 can be connected **without rewriting any screen**. This is the
central design decision and is explained in Section 5.

---

## 2. Technology stack

| Layer | Technology | Reason |
|-------|-----------|--------|
| UI library | React 19 | Component model, large ecosystem, industry standard |
| Build tool | Vite 8 | Fast dev server with hot reload, simple config |
| Routing | React Router 7 | Client-side navigation between modules |
| Icons | lucide-react | Lightweight SVG icons |
| Styling | Plain CSS with design tokens | No framework lock-in, easy to explain and theme |
| Language | JavaScript (ES modules) | Keeps the project approachable |

Dependencies are deliberately few so that every file in the project can be explained.

---

## 3. Application architecture

```
┌────────────────────────────────────────────────────────────────┐
│ Browser                                                        │
│                                                                │
│  Pages (Dashboard, Students, Events, …)                        │
│        │  columns / fields / validation rules (configuration)  │
│        ▼                                                       │
│  EntityPage.jsx  – generic list + form + delete engine         │
│        │  api.getAll / create / update / remove                │
│        ▼                                                       │
│  services/api.js – DATA ACCESS LAYER                           │
│        │                                                       │
│        ├── USE_MOCK = true  ──▶ in-memory copy of mockData.js  │  ◀ Phase 1
│        └── USE_MOCK = false ──▶ fetch() to REST API            │  ◀ Phase 2
└────────────────────────────────────────────────────────────────┘
                                   │ HTTP / JSON
                                   ▼
                     Node.js + Express  ──SQL──▶  MySQL / PostgreSQL
```

### Folder structure

```
src/
├── data/mockData.js         Stand-in for the database tables (Phase 1 only)
├── services/api.js          Data access layer: mock now, REST later
├── components/
│   ├── Layout.jsx           Sidebar, top bar, mobile drawer, dark-mode toggle
│   ├── EntityPage.jsx       Generic CRUD engine (search, filter, sort, paginate, validate, export)
│   └── ui.jsx               Reusable pieces: Badge, StatCard, Modal, Drawer, Toasts, Stars, …
├── pages/                   One file per module – only configuration, no data logic
├── utils/
│   ├── helpers.js           Date formatting, colours, status → badge tone
│   └── validate.js          Reusable validation helpers (email, phone, uniqueness)
├── App.jsx                  Route table
└── index.css                Design tokens (light + dark) and all styles
```

### Design patterns used

* **Service / Repository layer** – pages never touch data directly; everything goes through
  `api.js`. Swapping the data source is a configuration change.
* **Configuration over code** – each module is a declarative description (columns, fields,
  filters, rules) passed to one shared `EntityPage` component. Adding a tenth module is ~40 lines.
* **Separation of concerns** – presentation (`ui.jsx`), behaviour (`EntityPage.jsx`),
  data (`api.js`) and rules (`validate.js` + per-page `validate()`) live in separate files.

---

## 4. What was built in Phase 1

### 4.1 Modules

| Module | Fields stored | Relationships |
|--------|---------------|---------------|
| Students | roll no, name, email, department, year, phone | – |
| Event Categories | name, description | – |
| Venues | name, building, capacity | – |
| Organizers | name, department, email, phone | – |
| Events | title, description, date, start/end time, max participants, status | → category, venue, organizer |
| Registrations | registered on, status (Confirmed / Waitlisted / Cancelled) | → student, event |
| Attendance | status (Present / Absent), check-in time | → student, event |
| Feedback | rating 1–5, comments, submitted on | → student, event |
| Dashboard | derived statistics | reads all of the above |

### 4.2 Features available on every module

| Feature | Description |
|---------|-------------|
| Search | Free-text search across the meaningful columns, including related names (e.g. searching a student name on the Registrations page) |
| Filters | Dropdown filters per module (status, category, venue, department, year, rating, event) with a Clear button |
| Sorting | Click any column header to sort ascending / descending / off; related columns sort by the related name |
| Pagination | 8 rows per page with page numbers and previous / next |
| Add | Modal form; the new record is inserted at the **top** of the list and briefly highlighted |
| Edit | Same form pre-filled |
| Delete | Confirmation dialog warning about related records |
| Export | Download the currently filtered list as a CSV file |
| Record count | "x of y records" updates live with search and filters |
| Empty state | Friendly message with an "Add the first …" shortcut |
| Loading state | Skeleton rows while data loads |
| Notifications | Toast at the **top centre** of the screen; success, error and info variants |

### 4.3 Module-specific features

* **Dashboard** – four KPI cards (students, events, registrations with attendance rate, average
  rating), upcoming events with venue and seat fill, events-per-category bar chart, recent
  registrations, latest feedback.
* **Events** – registered-vs-capacity progress bar in the table; clicking a row opens a **detail
  panel** with date, time, venue, organizer, capacity fill, mini statistics (registered,
  attendance %, average rating), the list of registered students and all feedback received.
* **Registrations** – cancelled events are not offered in the dropdown.
* **Attendance** – only ongoing or completed events are offered.
* **Feedback** – only ongoing or completed events are offered.

### 4.4 Validation rules (client-side)

Validation runs on submit, then live on every keystroke. Errors appear under the field with a
red border, a summary banner at the top of the form, a shake animation and focus on the first
invalid field.

**Generic rules (declared on the field)**

| Rule | Applied to |
|------|-----------|
| Required | all mandatory fields |
| Email format | student email, organizer email |
| Min / max length | names, titles, descriptions, comments |
| Numeric range | capacity (10–10 000), max participants (1–5 000) |
| Pattern | roll number `CS21001` (2 letters + 5 digits), names (letters only), category name |
| 10-digit phone | student phone, organizer phone |

**Cross-field and uniqueness rules (declared per module)**

| Module | Rule |
|--------|------|
| Students | Roll number unique; email unique |
| Categories | Name unique |
| Venues | Name unique |
| Organizers | Email unique |
| Events | Title unique; end time after start time; max participants ≤ venue capacity; venue cannot be double-booked on the same date with overlapping times; Upcoming event cannot be in the past; future event cannot be Completed |
| Registrations | One registration per student per event; cannot register for a Completed event; registration date not after event date and not in the future; if confirmed seats are full, status must be Waitlisted |
| Attendance | One record per student per event; student must have a Confirmed registration; check-in time required when Present; no check-in time when Absent; check-in within event hours |
| Feedback | One feedback per student per event; only students marked Present; comment 10–300 characters; not before the event date; not in the future |

### 4.5 User interface

* Dark navy sidebar with grouped navigation, light content area, card-based layout, Inter font.
* **Light / dark theme** toggle in the top bar, remembered in the browser.
* Status badges with colour coding (Upcoming, Ongoing, Completed, Cancelled, Confirmed,
  Waitlisted, Present, Absent).
* Avatars with initials and a stable colour per person.
* "Mock data" / "Live API" badge in the top bar shows which data source is active.
* **Responsive**: below 1000 px the sidebar becomes a slide-in drawer; below 720 px tables turn
  into stacked cards with labels, forms become single-column, buttons stretch full width.
* Keyboard: Escape closes any modal or drawer.

---

## 5. How the backend connects (the key design point)

All pages call exactly five functions:

```js
api.getAll(resource)            // GET    /api/<resource>
api.getById(resource, id)       // GET    /api/<resource>/:id
api.create(resource, data)      // POST   /api/<resource>
api.update(resource, id, data)  // PUT    /api/<resource>/:id
api.remove(resource, id)        // DELETE /api/<resource>/:id
```

`resource` ∈ { students, events, categories, venues, organizers, registrations, attendance, feedback }

`api.js` contains **both** implementations today. A `.env` file selects one:

```
VITE_USE_MOCK=false
VITE_API_URL=http://localhost:5000/api
```

Because the JSON field names returned by the API will match the keys already used in
`mockData.js` (`categoryId`, `registeredOn`, `checkInTime`, …), **no page, component or
validation rule changes** when the backend goes live. Only the data source changes.

---

## 6. Phase 2 – Backend plan

### 6.1 When to start

Start the backend **after the frontend is accepted**, because the frontend has already fixed
two contracts that the backend must honour:

1. the REST endpoints and HTTP verbs listed in Section 5;
2. the JSON shape of every record (see `src/data/mockData.js`).

This means the backend can be built and tested on its own (with Postman or curl) and plugged in
at the end with a single flag change.

### 6.2 Backend stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 22 |
| Framework | Express 5 |
| Database | MySQL 8 (or PostgreSQL 16) |
| DB access | `mysql2` (or `pg`), optionally an ORM such as Prisma or Sequelize |
| Validation | `express-validator` or `zod` – same rules as the frontend |
| Config | `dotenv` for DB credentials and port |
| CORS | `cors` package so the Vite dev server (port 5173) can call port 5000 |

### 6.3 Database schema

```sql
CREATE TABLE categories (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  name         VARCHAR(40)  NOT NULL UNIQUE,
  description  VARCHAR(160)
);

CREATE TABLE venues (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  name      VARCHAR(60) NOT NULL UNIQUE,
  building  VARCHAR(60) NOT NULL,
  capacity  INT NOT NULL CHECK (capacity BETWEEN 10 AND 10000)
);

CREATE TABLE organizers (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(60)  NOT NULL,
  department  VARCHAR(60)  NOT NULL,
  email       VARCHAR(120) NOT NULL UNIQUE,
  phone       VARCHAR(15)
);

CREATE TABLE students (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  roll_no     VARCHAR(10)  NOT NULL UNIQUE,
  name        VARCHAR(60)  NOT NULL,
  email       VARCHAR(120) NOT NULL UNIQUE,
  department  VARCHAR(60)  NOT NULL,
  year        TINYINT      NOT NULL CHECK (year BETWEEN 1 AND 4),
  phone       VARCHAR(15)
);

CREATE TABLE events (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  title             VARCHAR(80)  NOT NULL UNIQUE,
  description       VARCHAR(300),
  category_id       INT NOT NULL,
  venue_id          INT NOT NULL,
  organizer_id      INT NOT NULL,
  event_date        DATE NOT NULL,
  start_time        TIME NOT NULL,
  end_time          TIME NOT NULL,
  max_participants  INT  NOT NULL,
  status            ENUM('Upcoming','Ongoing','Completed','Cancelled') NOT NULL DEFAULT 'Upcoming',
  FOREIGN KEY (category_id)  REFERENCES categories(id),
  FOREIGN KEY (venue_id)     REFERENCES venues(id),
  FOREIGN KEY (organizer_id) REFERENCES organizers(id),
  CHECK (end_time > start_time)
);

CREATE TABLE registrations (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  student_id     INT  NOT NULL,
  event_id       INT  NOT NULL,
  registered_on  DATE NOT NULL,
  status         ENUM('Confirmed','Waitlisted','Cancelled') NOT NULL DEFAULT 'Confirmed',
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (event_id)   REFERENCES events(id)   ON DELETE CASCADE,
  UNIQUE (student_id, event_id)
);

CREATE TABLE attendance (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  student_id     INT NOT NULL,
  event_id       INT NOT NULL,
  status         ENUM('Present','Absent') NOT NULL,
  check_in_time  TIME,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (event_id)   REFERENCES events(id)   ON DELETE CASCADE,
  UNIQUE (student_id, event_id)
);

CREATE TABLE feedback (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  student_id    INT NOT NULL,
  event_id      INT NOT NULL,
  rating        TINYINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comments      VARCHAR(300) NOT NULL,
  submitted_on  DATE NOT NULL,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (event_id)   REFERENCES events(id)   ON DELETE CASCADE,
  UNIQUE (student_id, event_id)
);
```

Database columns use `snake_case`; the API converts them to the `camelCase` keys the frontend
expects (`event_date` → `date`, `registered_on` → `registeredOn`, and so on).

### 6.4 Entity–relationship summary

```
Category 1 ───< Event >─── 1 Venue
                 │
                 1
             Organizer

Student >───< Event   (three link tables: Registration, Attendance, Feedback,
                       each with UNIQUE(student_id, event_id))
```

### 6.5 Backend folder structure

```
server/
├── src/
│   ├── index.js              Express app, CORS, JSON parser, mounts routers, listens on 5000
│   ├── db.js                 Connection pool (reads .env)
│   ├── routes/
│   │   ├── students.js       5 endpoints
│   │   ├── events.js
│   │   ├── categories.js
│   │   ├── venues.js
│   │   ├── organizers.js
│   │   ├── registrations.js
│   │   ├── attendance.js
│   │   └── feedback.js
│   ├── controllers/          Request handling, calls services
│   ├── services/             Business rules (same validations as the frontend)
│   ├── validators/           Schema validation per resource
│   └── middleware/
│       ├── errorHandler.js   Converts errors to { message } JSON with correct status
│       └── auth.js           (Phase 3) JWT check
├── sql/
│   ├── schema.sql            Tables from 6.3
│   └── seed.sql              Same sample rows as mockData.js
├── .env                      DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, PORT
└── package.json
```

### 6.6 API contract

Every resource exposes the same five routes. Example for events:

| Method | URL | Body | Response |
|--------|-----|------|----------|
| GET | `/api/events` | – | `200` array of events |
| GET | `/api/events/:id` | – | `200` event, or `404` |
| POST | `/api/events` | event JSON (without id) | `201` created event with id |
| PUT | `/api/events/:id` | full event JSON | `200` updated event |
| DELETE | `/api/events/:id` | – | `204` no content |

Error responses are `{ "message": "…" }` with status `400` (validation), `404` (not found),
`409` (uniqueness conflict) or `500`. The frontend already displays `message` in an error toast.

Example response object (must match `mockData.js`):

```json
{
  "id": 1,
  "title": "HackNova 2026",
  "categoryId": 1,
  "venueId": 4,
  "organizerId": 1,
  "date": "2026-11-08",
  "startTime": "09:00",
  "endTime": "21:00",
  "maxParticipants": 60,
  "status": "Upcoming",
  "description": "12-hour hackathon on AI for social good."
}
```

### 6.7 Server-side validation

Client-side validation gives instant feedback but can be bypassed, so **every rule in Section
4.4 is repeated on the server**:

* field rules via a schema validator (required, format, length, range);
* uniqueness via `UNIQUE` constraints (database) plus a friendly `409` message;
* business rules in the service layer (capacity ≤ venue capacity, venue clash, registration
  only with confirmed seat, attendance only if registered, feedback only if present);
* referential integrity via foreign keys.

### 6.8 Step-by-step implementation order

| Step | Task | Result |
|------|------|--------|
| 1 | Install MySQL, run `schema.sql` and `seed.sql` | Database with sample data |
| 2 | `npm init`, install express, cors, dotenv, mysql2 | Empty server |
| 3 | Write `db.js` and `index.js`; `GET /api/health` returns `{ ok: true }` | Server runs |
| 4 | Implement `categories`, `venues`, `organizers` (no dependencies) | Master data APIs |
| 5 | Implement `students` and `events` | Core APIs |
| 6 | Implement `registrations`, `attendance`, `feedback` with business rules | Participation APIs |
| 7 | Test every endpoint with Postman | Verified contract |
| 8 | In the frontend, create `.env` with `VITE_USE_MOCK=false` | Badge switches to "Live API" |
| 9 | Walk through every page; add, edit, delete, refresh – data persists | Integration complete |

### 6.9 Extra endpoints worth adding later

These are not required by the current screens but make the dashboard cheaper for large data:

* `GET /api/stats/summary` – counts and averages for the dashboard cards
* `GET /api/events/:id/participants` – registrations joined with student details
* `GET /api/events?status=Upcoming&categoryId=1&page=1&limit=8` – server-side filter and pagination

### 6.10 Phase 3 (optional)

* **Authentication** – login with roles Admin / Organizer / Student using JWT; students see only
  their own registrations and can submit feedback.
* **Reports** – attendance percentage per event, average rating per organizer, department-wise
  participation; export as PDF.
* **Email notifications** on registration confirmation.
* **Deployment** – frontend on Vercel or Netlify, API on Render or Railway, database on a managed
  MySQL instance.

---

## 7. Running and demonstrating the project

```bash
npm install
npm run dev      # opens http://localhost:5173
```

Suggested demo order:

1. Dashboard – explain the four KPIs and the upcoming events list.
2. Events – sort by date, filter by category, open a row to show the detail panel.
3. Add an event with an end time before the start time → inline error; fix it → record appears at
   the top with a toast.
4. Registrations – try registering the same student twice → blocked.
5. Attendance – try marking a student who is not registered → blocked.
6. Toggle dark mode; resize the window to show the drawer and card layout.
7. Export Students to CSV.
8. Point at the "Mock data" badge and `api.js` to explain how the backend will plug in.
