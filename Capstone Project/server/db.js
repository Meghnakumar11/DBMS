// ------------------------------------------------------------
// DATABASE CONNECTION
//
// * If MONGODB_URI is set (e.g. mongodb://localhost:27017/campus_events or a
//   MongoDB Atlas mongodb+srv://… address) we connect to that MongoDB server.
// * Otherwise we run a bundled MongoDB server (a real `mongod` that the
//   `mongodb-memory-server` package downloads for this OS on the first start).
//   Data lives in server/.mongodata, so it survives restarts and the project
//   runs with zero manual database setup.
//
// The bundled server is stopped together with the app. On failure the real
// MongoDB error is printed together with a likely fix.
// ------------------------------------------------------------
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import mongoose from 'mongoose'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const DB_NAME = process.env.MONGODB_DB || 'campus_events'
const DATA_DIR = path.join(__dirname, '.mongodata')
const IS_WIN = process.platform === 'win32'

let bundled = null // MongoMemoryServer instance when we started the bundled server
let version = ''

const log = (msg) => console.log(`  ${msg}`)

class DbStartError extends Error {
  constructor(message, details) { super(message); this.details = details }
}

/** Turn a mongod start-up error into a plain-English explanation. */
function diagnose(err) {
  const text = `${err?.message || ''}\n${err?.stack || ''}`.toLowerCase()
  const hints = []
  if (/dbpathinuse|mongod\.lock|another mongod instance|already running|lock file/.test(text)) {
    hints.push('Another copy of the app is already using the database. Close the other terminal window and try again.')
  }
  if (/address already in use|eaddrinuse/.test(text)) {
    hints.push('The MongoDB port is already used by another program.')
    hints.push('Fix: close the other program, or set EMBEDDED_MONGO_PORT=27019 in a .env file.')
  }
  if (/download|enotfound|eai_again|etimedout|econnreset|socket hang up|status code|md5/.test(text)) {
    hints.push('MongoDB could not be downloaded. Check the internet connection (only needed on the very first start) and try again.')
  }
  if (IS_WIN && /vcruntime|msvcp|\.dll|3221225781|3221225595/.test(text)) {
    hints.push('A Windows system library is missing. Install the "Microsoft Visual C++ Redistributable (x64)" from')
    hints.push('    https://aka.ms/vs/17/release/vc_redist.x64.exe   then run the app again.')
  }
  if (/eacces|eperm|permission denied|access is denied/.test(text)) hints.push('Permission denied. Move the project to a normal folder (e.g. Desktop or Documents) and allow node/mongod in your antivirus.')
  if (/enospc|no space left|disk full/.test(text)) hints.push('The disk is full.')
  if (/unsupported|unknown (platform|linux|architecture)|no (mongodb )?(build|binary)/.test(text)) {
    hints.push('There is no bundled MongoDB for this computer. Install MongoDB yourself (or use MongoDB Atlas) and set MONGODB_URI in a .env file (see .env.example).')
  }
  if (!hints.length) hints.push('Try again. If it still fails and you do not need the stored data, delete the folder  server/.mongodata  and start again, or send the lines above to the developer.')
  return hints
}

async function startBundled() {
  let MongoMemoryServer
  try {
    ({ MongoMemoryServer } = await import('mongodb-memory-server'))
  } catch {
    throw new DbStartError('The bundled MongoDB package (mongodb-memory-server) is not installed.', [
      'Fix: delete the node_modules folder and run  npm install  again.',
    ])
  }
  const firstRun = !fs.existsSync(path.join(DATA_DIR, 'WiredTiger'))
  fs.mkdirSync(DATA_DIR, { recursive: true })
  log(firstRun
    ? '[db] Setting up MongoDB (first run only: it may download the database program, which can take a few minutes)...'
    : '[db] Starting MongoDB...')
  try {
    bundled = await MongoMemoryServer.create({
      instance: {
        dbPath: DATA_DIR,
        storageEngine: 'wiredTiger',
        dbName: DB_NAME,
        ip: '127.0.0.1',
        // preferred port; if it is busy a free one is picked automatically
        port: Number(process.env.EMBEDDED_MONGO_PORT || 27018),
        launchTimeout: 60000,
      },
    })
  } catch (err) {
    const lines = String(err?.message || err).trim().split(/\r?\n/).slice(-12)
    throw new DbStartError('MongoDB could not start.', [...lines.map((l) => `| ${l}`), '', ...diagnose(err)])
  }
  return bundled.getUri(DB_NAME)
}

export async function connect() {
  const url = process.env.MONGODB_URI || (await startBundled())
  mongoose.set('strictQuery', true)
  // indexes are created explicitly at boot (models.js → prepareCollections)
  await mongoose.connect(url, { autoIndex: false, serverSelectionTimeoutMS: 8000, ...(process.env.MONGODB_URI ? {} : { dbName: DB_NAME }) })
  mongoose.connection.on('error', (e) => console.error('  [mongodb]', e.message))
  version = (await mongoose.connection.db.admin().serverInfo()).version
  const safe = url.replace(/:\/\/([^:/@]+):[^@]+@/, '://$1:****@')
  log(`[db] MongoDB ${version} connected: ${safe}${bundled ? ' (bundled)' : ''}`)
  return mongoose.connection
}

/** Used by GET /api/health: throws when the database is unreachable. */
export async function health() {
  await mongoose.connection.db.command({ ping: 1 })
  return { database: mongoose.connection.name, mongodb: `MongoDB ${version}` }
}

let closing = false
export async function disconnect() {
  if (closing) return
  closing = true
  await mongoose.disconnect().catch(() => {})
  // doCleanup: false keeps server/.mongodata (the data) on disk
  await bundled?.stop({ doCleanup: false }).catch(() => {})
}

/** Pretty error output used by server/index.js when startup fails. */
export function explainStartupError(err) {
  const lines = ['', '  ============================================================', '  The server could not start.', '']
  lines.push(`  ${err?.message || String(err)}`)
  if (err?.details?.length) { lines.push(''); err.details.forEach((d) => lines.push(`  ${d}`)) }
  else if (err?.code === 'EADDRINUSE') lines.push('', `  Port ${err.port} is already in use. Close the other running copy of the app, or set PORT=5051 in .env.`)
  else if (process.env.MONGODB_URI && /ServerSelection|ECONNREFUSED|ENOTFOUND|Authentication|bad auth|MongoParseError/i.test(`${err?.name} ${err?.message}`)) {
    lines.push('', '  Could not reach the MongoDB server in MONGODB_URI. Is it running, and are the address, user and password correct?')
  }
  else if (err?.stack) lines.push('', ...String(err.stack).split('\n').slice(1, 6).map((l) => `  ${l.trim()}`))
  lines.push('  ============================================================', '')
  return lines.join('\n')
}
