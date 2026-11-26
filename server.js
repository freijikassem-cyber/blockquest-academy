// BlockQuest Academy — server (accounts, question banks, play sessions, reports)
import express from "express";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { openDb } from "./db.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 4173;
const db = await openDb({ url: process.env.DATABASE_URL, password: process.env.DB_PASSWORD, dir: process.env.DATA_DIR || path.join(here, "data") });
console.log("database:", db.kind);
const get = db.get, all = db.all, run = db.run;

const PKEY_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function newPkey() {
  let c = "";
  for (let i = 0; i < 10; i++) c += PKEY_CHARS[crypto.randomInt(PKEY_CHARS.length)];
  return c;
}
// one progress code per student (same code for their blocks and Python records)
async function pkeyFor(s) {
  if (s.pkey) return s.pkey;
  const sib = await get("SELECT pkey FROM students WHERE bank_id=? AND lower(name)=lower(?) AND pkey IS NOT NULL", s.bank_id, s.name);
  const key = sib?.pkey || newPkey();
  await run("UPDATE students SET pkey=? WHERE bank_id=? AND lower(name)=lower(?)", key, s.bank_id, s.name);
  return key;
}
const app = express();
app.use(express.json({ limit: "4mb" }));

// ---------- helpers ----------
const hashPw = (pw, salt) => crypto.scryptSync(pw, salt, 64).toString("hex");
const newToken = () => crypto.randomBytes(32).toString("hex");
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
async function newCode() {
  for (;;) {
    let c = "";
    for (let i = 0; i < 6; i++) c += CODE_CHARS[crypto.randomInt(CODE_CHARS.length)];
    if (!await get("SELECT 1 FROM banks WHERE code=?", c)) return c;
  }
}
function cookie(req, name) {
  const m = (req.headers.cookie || "").match(new RegExp("(?:^|; )" + name + "=([^;]+)"));
  return m ? m[1] : null;
}
function setSession(res, token) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.setHeader("Set-Cookie", `bq_session=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${token ? 2592000 : 0}${secure}`);
}
async function auth(req, res, next) {
  const t = cookie(req, "bq_session");
  const row = t && await get("SELECT t.id, t.name, t.email FROM sessions s JOIN teachers t ON t.id=s.teacher_id WHERE s.token=?", t);
  if (!row) return res.status(401).json({ error: "Please sign in." });
  req.teacher = row;
  next();
}
async function ownBank(req, res) {
  const bank = await get("SELECT * FROM banks WHERE id=? AND teacher_id=?", Number(req.params.id), req.teacher.id);
  if (!bank) res.status(404).json({ error: "Question bank not found." });
  return bank;
}
function cleanQuestion(raw) {
  const text = String(raw?.text ?? "").trim().slice(0, 1000);
  const options = (Array.isArray(raw?.options) ? raw.options : []).map((o) => String(o ?? "").trim().slice(0, 300)).filter(Boolean).slice(0, 6);
  const answer = Number(raw?.answer);
  if (!text || options.length < 2 || !Number.isInteger(answer) || answer < 0 || answer >= options.length) return null;
  return { text, options, answer };
}
// tiny in-memory limiter for login / join
const hits = new Map();
function limited(key, max, windowMs) {
  const now = Date.now();
  const arr = (hits.get(key) || []).filter((t) => now - t < windowMs);
  arr.push(now);
  hits.set(key, arr);
  return arr.length > max;
}

// ---------- teacher accounts ----------
app.post("/api/register", async (req, res) => {
  const name = String(req.body.name || "").trim().slice(0, 80);
  const email = String(req.body.email || "").trim().toLowerCase().slice(0, 200);
  const password = String(req.body.password || "");
  if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return res.status(400).json({ error: "Enter your name and a valid email." });
  if (password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters." });
  if (await get("SELECT 1 FROM teachers WHERE email=?", email)) return res.status(409).json({ error: "That email is already registered. Sign in instead." });
  const salt = crypto.randomBytes(16).toString("hex");
  const r = await get("INSERT INTO teachers(name,email,pass_hash,salt) VALUES(?,?,?,?) RETURNING id", name, email, hashPw(password, salt), salt);
  const token = newToken();
  await run("INSERT INTO sessions(token,teacher_id) VALUES(?,?)", token, r.id);
  setSession(res, token);
  res.json({ name, email });
});
app.post("/api/login", async (req, res) => {
  if (limited("login:" + req.ip, 10, 60000)) return res.status(429).json({ error: "Too many attempts. Wait a minute." });
  const email = String(req.body.email || "").trim().toLowerCase();
  const t = await get("SELECT * FROM teachers WHERE email=?", email);
  const ok = t && crypto.timingSafeEqual(Buffer.from(hashPw(String(req.body.password || ""), t.salt), "hex"), Buffer.from(t.pass_hash, "hex"));
  if (!ok) return res.status(401).json({ error: "Wrong email or password." });
  const token = newToken();
  await run("INSERT INTO sessions(token,teacher_id) VALUES(?,?)", token, t.id);
  setSession(res, token);
  res.json({ name: t.name, email: t.email });
});
app.post("/api/logout", async (req, res) => {
  const t = cookie(req, "bq_session");
  if (t) await run("DELETE FROM sessions WHERE token=?", t);
  setSession(res, "");
  res.json({ ok: true });
});
app.get("/api/me", auth, async (req, res) => res.json(req.teacher));

// ---------- question banks ----------
app.get("/api/banks", auth, async (req, res) => {
  res.json(await all(`SELECT b.*, (SELECT COUNT(*) FROM questions WHERE bank_id=b.id) AS question_count,
    (SELECT COUNT(DISTINCT name) FROM students WHERE bank_id=b.id) AS student_count
    FROM banks b WHERE teacher_id=? ORDER BY b.id DESC`, req.teacher.id));
});
app.post("/api/banks", auth, async (req, res) => {
  const title = String(req.body.title || "").trim().slice(0, 120);
  if (!title) return res.status(400).json({ error: "Give the bank a title." });
  const r = await get("INSERT INTO banks(teacher_id,title,grade,code) VALUES(?,?,?,?) RETURNING id", req.teacher.id, title, String(req.body.grade || "").slice(0, 30), await newCode());
  res.json(await get("SELECT * FROM banks WHERE id=?", r.id));
});
app.put("/api/banks/:id", auth, async (req, res) => {
  const bank = await ownBank(req, res); if (!bank) return;
  const title = String(req.body.title ?? bank.title).trim().slice(0, 120) || bank.title;
  const grade = String(req.body.grade ?? bank.grade).slice(0, 30);
  const shared = req.body.shared === undefined ? bank.shared : req.body.shared ? 1 : 0;
  await run("UPDATE banks SET title=?, grade=?, shared=? WHERE id=?", title, grade, shared, bank.id);
  res.json(await get("SELECT * FROM banks WHERE id=?", bank.id));
});
app.delete("/api/banks/:id", auth, async (req, res) => {
  const bank = await ownBank(req, res); if (!bank) return;
  await run("DELETE FROM banks WHERE id=?", bank.id);
  res.json({ ok: true });
});
app.get("/api/banks/:id/questions", auth, async (req, res) => {
  const bank = await ownBank(req, res); if (!bank) return;
  res.json((await all("SELECT id,text,options,answer FROM questions WHERE bank_id=? ORDER BY id", bank.id)).map((r) => ({ ...r, options: JSON.parse(r.options) })));
});
app.post("/api/banks/:id/questions", auth, async (req, res) => {
  const bank = await ownBank(req, res); if (!bank) return;
  const list = Array.isArray(req.body.questions) ? req.body.questions : [req.body];
  let added = 0, skipped = 0;
  for (const raw of list.slice(0, 500)) {
    const c = cleanQuestion(raw);
    if (!c) { skipped++; continue; }
    await run("INSERT INTO questions(bank_id,text,options,answer) VALUES(?,?,?,?)", bank.id, c.text, JSON.stringify(c.options), c.answer);
    added++;
  }
  res.json({ added, skipped });
});
app.put("/api/questions/:qid", auth, async (req, res) => {
  const row = await get("SELECT q.id FROM questions q JOIN banks b ON b.id=q.bank_id WHERE q.id=? AND b.teacher_id=?", Number(req.params.qid), req.teacher.id);
  if (!row) return res.status(404).json({ error: "Question not found." });
  const c = cleanQuestion(req.body);
  if (!c) return res.status(400).json({ error: "A question needs text, at least 2 options and a correct answer." });
  await run("UPDATE questions SET text=?, options=?, answer=? WHERE id=?", c.text, JSON.stringify(c.options), c.answer, row.id);
  res.json({ ok: true });
});
app.delete("/api/questions/:qid", auth, async (req, res) => {
  const row = await get("SELECT q.id FROM questions q JOIN banks b ON b.id=q.bank_id WHERE q.id=? AND b.teacher_id=?", Number(req.params.qid), req.teacher.id);
  if (!row) return res.status(404).json({ error: "Question not found." });
  await run("DELETE FROM questions WHERE id=?", row.id);
  res.json({ ok: true });
});

// ---------- questions from teaching material ----------
// 1) If the text already contains written questions (Q + A-D options + "Answer: B"), read them directly.
function parseWrittenQuestions(text) {
  const out = [];
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  let cur = null;
  const push = () => {
    if (cur && cur.options.length >= 2) {
      if (cur.answer < 0 || cur.answer >= cur.options.length) cur.needsAnswer = true, (cur.answer = 0);
      out.push(cur);
    }
    cur = null;
  };
  for (const line of lines) {
    const opt = line.match(/^\(?([A-Fa-f])[).:\-]\s+(.+)$/);
    const ans = line.match(/^(?:answer|correct(?: answer)?|ans|key)\s*[:=\-]\s*\(?([A-Fa-f])\b/i);
    const qm = line.match(/^(?:Q(?:uestion)?\s*\d*\s*[:.)\-]|\d+\s*[.)])\s*(.+)$/i);
    if (ans && cur) { cur.answer = ans[1].toUpperCase().charCodeAt(0) - 65; continue; }
    if (opt && cur) {
      let o = opt[2];
      if (/\*\s*$|\(correct\)\s*$/i.test(o)) { cur.answer = cur.options.length; o = o.replace(/\*\s*$|\(correct\)\s*$/i, "").trim(); }
      cur.options.push(o);
      continue;
    }
    if (qm) { push(); cur = { text: qm[1], options: [], answer: -1 }; continue; }
    if (cur && !cur.options.length) cur.text += " " + line;
  }
  push();
  return out;
}

let anthropicClient = null;
async function generateWithClaude(text, count, grade) {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const { z } = await import("zod");
  const { zodOutputFormat } = await import("@anthropic-ai/sdk/helpers/zod");
  anthropicClient ??= new Anthropic();
  const Schema = z.object({
    questions: z.array(z.object({
      text: z.string(),
      options: z.array(z.string()),
      answer: z.number().int(),
    })),
  });
  const response = await anthropicClient.messages.parse({
    model: "claude-opus-5-5",
    max_tokens: 16000,
    system:
      "You write multiple-choice quiz questions for school students, based only on the teaching material the teacher provides. " +
      "Each question has exactly 4 options with one clearly correct answer; `answer` is the zero-based index of the correct option. " +
      "Vary which position holds the correct answer. Keep wording simple and age-appropriate, and write in the same language as the material.",
    messages: [{
      role: "user",
      content: `Write ${count} questions${grade ? ` for ${grade} students` : ""} from this material:\n\n<material>\n${text}\n</material>`,
    }],
    output_config: { format: zodOutputFormat(Schema) },
  });
  if (response.stop_reason === "refusal") throw new Error("The AI declined to write questions from this material.");
  return response.parsed_output?.questions ?? [];
}

const MAX_MATERIAL = 300000;
app.post("/api/generate", auth, async (req, res) => {
  const text = String(req.body.text || "").trim();
  const count = Math.min(Math.max(Number(req.body.count) || 10, 1), 40);
  if (text.length < 40) return res.status(400).json({ error: "I couldn't find enough text in that file." });
  if (text.length > MAX_MATERIAL) return res.status(413).json({ error: `That material is too long (${text.length.toLocaleString()} characters). Split it into smaller files of under ${MAX_MATERIAL.toLocaleString()} characters.` });
  const written = parseWrittenQuestions(text).map(cleanQuestion).filter(Boolean);
  if (written.length >= 2) return res.json({ source: "document", questions: written });
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    return res.status(503).json({
      error: "This file has no ready-made questions in it, and AI question writing is not switched on for this site yet (the site owner needs to add an Anthropic API key). You can still upload a file that already contains questions with A–D options and an 'Answer: B' line.",
    });
  }
  try {
    const qs = (await generateWithClaude(text, count, String(req.body.grade || ""))).map(cleanQuestion).filter(Boolean);
    res.json({ source: "ai", questions: qs });
  } catch (e) {
    console.error("generate failed:", e?.status, e?.message);
    res.status(502).json({ error: "The AI could not write questions right now: " + (e?.message || "unknown error") });
  }
});

// ---------- report ----------
app.get("/api/banks/:id/report", auth, async (req, res) => {
  const bank = await ownBank(req, res); if (!bank) return;
  for (const st of await all("SELECT * FROM students WHERE bank_id=? AND pkey IS NULL", bank.id)) await pkeyFor(st);
  const students = await all(`SELECT s.id, s.name, s.track, s.gems, s.last_seen, s.pkey,
      (SELECT COUNT(*) FROM progress WHERE student_id=s.id) AS levels_done,
      (SELECT COALESCE(SUM(stars),0) FROM progress WHERE student_id=s.id) AS stars,
      (SELECT COUNT(*) FROM answers WHERE student_id=s.id) AS answered,
      (SELECT COALESCE(SUM(correct),0) FROM answers WHERE student_id=s.id) AS correct
    FROM students s WHERE s.bank_id=? ORDER BY lower(s.name), s.track`, bank.id);
  const questions = await all(`SELECT q.id, q.text,
      (SELECT COUNT(*) FROM answers WHERE question_id=q.id) AS answered,
      (SELECT COALESCE(SUM(correct),0) FROM answers WHERE question_id=q.id) AS correct
    FROM questions q WHERE q.bank_id=? ORDER BY q.id`, bank.id);
  res.json({ bank, students, questions });
});
app.delete("/api/students/:sid", auth, async (req, res) => {
  const row = await get("SELECT s.id FROM students s JOIN banks b ON b.id=s.bank_id WHERE s.id=? AND b.teacher_id=?", Number(req.params.sid), req.teacher.id);
  if (!row) return res.status(404).json({ error: "Student not found." });
  await run("DELETE FROM students WHERE id=?", row.id);
  res.json({ ok: true });
});

// ---------- student play ----------
async function student(req, res) {
  const s = await get("SELECT * FROM students WHERE token=?", String(req.body?.token || req.query.token || ""));
  if (!s) { res.status(401).json({ error: "Join again with your class code." }); return null; }
  await run("UPDATE students SET last_seen=NOW_TS WHERE id=?", s.id);
  return s;
}
async function playState(s) {
  const bank = await get("SELECT title, grade FROM banks WHERE id=?", s.bank_id);
  const teacher = await get("SELECT t.name FROM teachers t JOIN banks b ON b.teacher_id=t.id WHERE b.id=?", s.bank_id);
  const progress = Object.fromEntries((await all("SELECT level_id, stars FROM progress WHERE student_id=?", s.id)).map((r) => [r.level_id, r.stars]));
  return { token: s.token, pkey: await pkeyFor(s), name: s.name, track: s.track, gems: s.gems, bankTitle: bank.title, teacher: teacher?.name || "", progress };
}
app.post("/api/play/join", async (req, res) => {
  if (limited("join:" + req.ip, 30, 60000)) return res.status(429).json({ error: "Too many tries. Wait a minute." });
  const code = String(req.body.code || "").trim().toUpperCase();
  const name = String(req.body.name || "").trim().replace(/\s+/g, " ").slice(0, 40);
  const track = req.body.track === "python" ? "python" : "blocks";
  const bank = await get("SELECT * FROM banks WHERE code=?", code);
  if (!bank || !bank.shared) return res.status(404).json({ error: "That class code doesn't work. Check it with your teacher." });
  if (name.length < 2) return res.status(400).json({ error: "Type your name." });
  let s = await get("SELECT * FROM students WHERE bank_id=? AND lower(name)=lower(?) AND track=?", bank.id, name, track);
  if (!s) {
    const r = await get("INSERT INTO students(bank_id,name,track,token) VALUES(?,?,?,?) RETURNING id", bank.id, name, track, newToken());
    s = await get("SELECT * FROM students WHERE id=?", r.id);
  }
  res.json(await playState(s));
});
app.get("/api/play/state", async (req, res) => { const s = await student(req, res); if (s) res.json(await playState(s)); });
app.get("/api/play/question", async (req, res) => {
  const s = await student(req, res); if (!s) return;
  const exclude = String(req.query.exclude || "").split(",").map(Number).filter(Boolean);
  // prefer questions this student has not answered correctly yet, least-seen first
  const rows = await all(`SELECT q.id, q.text, q.options,
      (SELECT COUNT(*) FROM answers a WHERE a.question_id=q.id AND a.student_id=?) AS seen,
      (SELECT COALESCE(MAX(correct),0) FROM answers a WHERE a.question_id=q.id AND a.student_id=?) AS got
    FROM questions q WHERE q.bank_id=? ORDER BY got, seen, RANDOM()`, s.id, s.id, s.bank_id);
  const pick = rows.find((r) => !exclude.includes(r.id)) || rows[0];
  if (!pick) return res.json({ question: null });
  res.json({ question: { id: pick.id, text: pick.text, options: JSON.parse(pick.options) } });
});
app.post("/api/play/answer", async (req, res) => {
  const s = await student(req, res); if (!s) return;
  const row = await get("SELECT * FROM questions WHERE id=? AND bank_id=?", Number(req.body.questionId), s.bank_id);
  if (!row) return res.status(404).json({ error: "Question not found." });
  const chosen = Number(req.body.chosen);
  const correct = chosen === row.answer ? 1 : 0;
  await run("INSERT INTO answers(student_id,question_id,chosen,correct) VALUES(?,?,?,?)", s.id, row.id, Number.isInteger(chosen) ? chosen : -1, correct);
  if (correct) await run("UPDATE students SET gems=gems+10 WHERE id=?", s.id);
  res.json({ correct: !!correct, answer: row.answer, gems: s.gems + (correct ? 10 : 0) });
});
app.post("/api/play/progress", async (req, res) => {
  const s = await student(req, res); if (!s) return;
  const levelId = String(req.body.levelId || "").slice(0, 20);
  const stars = Math.min(Math.max(Number(req.body.stars) || 1, 1), 3);
  if (!/^[bp]\d+$/.test(levelId)) return res.status(400).json({ error: "Bad level." });
  // 10 gems per new star (replaying a level only pays for stars beyond the best so far)
  const before = (await get("SELECT stars FROM progress WHERE student_id=? AND level_id=?", s.id, levelId))?.stars || 0;
  const earned = Math.max(0, stars - before) * 10;
  if (earned) await run("UPDATE students SET gems=gems+? WHERE id=?", earned, s.id);
  await run(`INSERT INTO progress(student_id,level_id,stars) VALUES(?,?,?)
     ON CONFLICT(student_id,level_id) DO UPDATE SET stars=GREATEST(progress.stars,excluded.stars), at=NOW_TS`, s.id, levelId, stars);
  res.json({ ok: true, earned, gems: s.gems + earned });
});

app.post("/api/play/attempt", async (req, res) => {
  const s = await student(req, res); if (!s) return;
  const levelId = String(req.body.levelId || "").slice(0, 20);
  if (!/^[bp]\d+$/.test(levelId)) return res.status(400).json({ error: "Bad level." });
  await run(`INSERT INTO attempts(student_id,level_id,runs,fails) VALUES(?,?,1,?)
     ON CONFLICT(student_id,level_id) DO UPDATE SET runs=attempts.runs+1, fails=attempts.fails+excluded.fails, at=NOW_TS`, s.id, levelId, req.body.ok ? 0 : 1);
  res.json({ ok: true });
});

// ---------- progress report for the student and their parent (read-only, opened with the progress code) ----------
app.get("/api/progress", async (req, res) => {
  if (limited("pkey:" + req.ip, 40, 60000)) return res.status(429).json({ error: "Too many tries. Wait a minute." });
  const key = String(req.query.key || "").trim().toUpperCase();
  const rows = /^[A-Z0-9]{10}$/.test(key) ? await all("SELECT * FROM students WHERE pkey=?", key) : [];
  if (!rows.length) return res.status(404).json({ error: "not found" });
  const bank = await get("SELECT title, grade, teacher_id FROM banks WHERE id=?", rows[0].bank_id);
  const teacher = await get("SELECT name FROM teachers WHERE id=?", bank.teacher_id);
  const tracks = {};
  let answered = 0, correct = 0, last = "";
  for (const s of rows) {
    const levels = {};
    for (const r of await all("SELECT level_id, stars, at FROM progress WHERE student_id=?", s.id)) levels[r.level_id] = { stars: r.stars, at: r.at, runs: 0, fails: 0 };
    for (const r of await all("SELECT level_id, runs, fails FROM attempts WHERE student_id=?", s.id)) levels[r.level_id] = { stars: 0, ...levels[r.level_id], runs: r.runs, fails: r.fails };
    const a = await get("SELECT COUNT(*) AS n, COALESCE(SUM(correct),0) AS c FROM answers WHERE student_id=?", s.id);
    answered += a.n; correct += a.c;
    if ((s.last_seen || "") > last) last = s.last_seen;
    tracks[s.track] = { gems: s.gems, levels };
  }
  res.json({ name: rows[0].name, bankTitle: bank.title, grade: bank.grade, teacher: teacher?.name || "", lastSeen: last, answered, correct, tracks });
});

// ---------- health check (also keeps the free database from pausing: a scheduled job calls it) ----------
app.get("/api/health", async (req, res) => {
  await get("SELECT 1 AS ok");
  res.json({ ok: true, db: db.kind });
});

// ---------- static ----------
const vendor = (route, dir) => app.use(route, express.static(path.join(here, "node_modules", dir), { maxAge: "7d" }));
vendor("/vendor/blockly", "blockly");
vendor("/vendor/skulpt", "skulpt/dist");
vendor("/vendor/pdfjs", "pdfjs-dist/build");
vendor("/vendor/mammoth", "mammoth");
vendor("/vendor/xlsx", "xlsx/dist");
vendor("/vendor/jszip", "jszip/dist");
app.use(express.static(path.join(here, "public"), { extensions: ["html"] }));

// database or other unexpected errors: log them and answer with JSON instead of an HTML page
app.use((err, req, res, next) => {
  console.error(req.method, req.path, err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: "Something went wrong on the server. Please try again." });
});

app.listen(PORT, () => console.log(`BlockQuest Academy running on http://localhost:${PORT}`));
