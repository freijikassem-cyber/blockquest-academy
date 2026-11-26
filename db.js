// Database adapter. With DATABASE_URL set it uses Postgres (e.g. Supabase); otherwise a local SQLite file.
// Queries are written once with `?` placeholders and two small tokens that differ between the engines:
//   NOW_TS        current time as text "YYYY-MM-DD HH:MM:SS" (UTC)
//   GREATEST(a,b) larger of two values
// Every call is async: get() -> first row or undefined, all() -> rows, run() -> { rows }.
// Use "RETURNING id" on an INSERT to get the new id.
import path from "node:path";
import fs from "node:fs";

const SCHEMA = (pk) => `
CREATE TABLE IF NOT EXISTS teachers(
  id ${pk}, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
  pass_hash TEXT NOT NULL, salt TEXT NOT NULL, created TEXT DEFAULT NOW_TS);
CREATE TABLE IF NOT EXISTS sessions(
  token TEXT PRIMARY KEY, teacher_id INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  created TEXT DEFAULT NOW_TS);
CREATE TABLE IF NOT EXISTS banks(
  id ${pk}, teacher_id INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  title TEXT NOT NULL, grade TEXT DEFAULT '', code TEXT NOT NULL UNIQUE, shared INTEGER DEFAULT 1,
  created TEXT DEFAULT NOW_TS);
CREATE TABLE IF NOT EXISTS questions(
  id ${pk}, bank_id INTEGER NOT NULL REFERENCES banks(id) ON DELETE CASCADE,
  text TEXT NOT NULL, options TEXT NOT NULL, answer INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS students(
  id ${pk}, bank_id INTEGER NOT NULL REFERENCES banks(id) ON DELETE CASCADE,
  name TEXT NOT NULL, track TEXT NOT NULL, token TEXT NOT NULL UNIQUE, gems INTEGER DEFAULT 0,
  created TEXT DEFAULT NOW_TS, last_seen TEXT DEFAULT NOW_TS,
  UNIQUE(bank_id, name, track));
CREATE TABLE IF NOT EXISTS progress(
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  level_id TEXT NOT NULL, stars INTEGER NOT NULL, at TEXT DEFAULT NOW_TS,
  PRIMARY KEY(student_id, level_id));
CREATE TABLE IF NOT EXISTS answers(
  id ${pk}, student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  chosen INTEGER NOT NULL, correct INTEGER NOT NULL, at TEXT DEFAULT NOW_TS);
CREATE TABLE IF NOT EXISTS attempts(
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  level_id TEXT NOT NULL, runs INTEGER NOT NULL DEFAULT 0, fails INTEGER NOT NULL DEFAULT 0, at TEXT DEFAULT NOW_TS,
  PRIMARY KEY(student_id, level_id));
`;

async function postgres(url) {
  const { default: pg } = await import("pg");
  pg.types.setTypeParser(20, (v) => parseInt(v, 10)); // COUNT(*) -> number
  pg.types.setTypeParser(1700, (v) => parseFloat(v)); // SUM() -> number
  const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
  const pool = new pg.Pool({ connectionString: url, ssl: local ? false : { rejectUnauthorized: false }, max: 5 });
  const NOW = "to_char(now() at time zone 'utc', 'YYYY-MM-DD HH24:MI:SS')";
  const sql = (s) => { let i = 0; return s.replace(/NOW_TS/g, NOW).replace(/\?/g, () => "$" + ++i); };
  const run = async (s, ...p) => ({ rows: (await pool.query(sql(s), p)).rows });
  const db = {
    kind: "postgres",
    run,
    get: async (s, ...p) => (await run(s, ...p)).rows[0],
    all: async (s, ...p) => (await run(s, ...p)).rows,
  };
  // DEFAULT expressions are fixed at table creation, so NOW is substituted there too
  await pool.query(SCHEMA("SERIAL PRIMARY KEY").replace(/NOW_TS/g, `(${NOW})`));
  await pool.query("ALTER TABLE students ADD COLUMN IF NOT EXISTS pkey TEXT");
  return db;
}

async function sqlite(dir) {
  const { DatabaseSync } = await import("node:sqlite");
  fs.mkdirSync(dir, { recursive: true });
  const lite = new DatabaseSync(path.join(dir, "blockquest.db"));
  const NOW = "strftime('%Y-%m-%d %H:%M:%S','now')";
  const sql = (s) => s.replace(/NOW_TS/g, NOW).replace(/GREATEST\(/g, "MAX(");
  const all = async (s, ...p) => lite.prepare(sql(s)).all(...p);
  const db = { kind: "sqlite", all, run: async (s, ...p) => ({ rows: await all(s, ...p) }), get: async (s, ...p) => lite.prepare(sql(s)).get(...p) };
  lite.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
  lite.exec(SCHEMA("INTEGER PRIMARY KEY").replace(/NOW_TS/g, `(${NOW})`));
  if (!lite.prepare("PRAGMA table_info(students)").all().some((c) => c.name === "pkey")) lite.exec("ALTER TABLE students ADD COLUMN pkey TEXT");
  return db;
}

export async function openDb({ url, dir, password }) {
  // Supabase shows the connection string with a [YOUR-PASSWORD] placeholder. If DB_PASSWORD is set, it is put
  // in there already encoded, so a password with symbols can be pasted as-is.
  if (url && password) url = url.replace(/\[YOUR-PASSWORD\]/g, encodeURIComponent(password));
  if (url && url.includes("[YOUR-PASSWORD]")) throw new Error("DATABASE_URL still contains [YOUR-PASSWORD]: set DB_PASSWORD too.");
  return url ? postgres(url) : sqlite(dir);
}
