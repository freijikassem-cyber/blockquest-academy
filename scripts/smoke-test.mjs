// End-to-end API check: node scripts/smoke-test.mjs http://localhost:4173
// Creates a throwaway teacher, bank and student, and walks the whole teacher + student + parent flow.
const base = process.argv[2] || "http://localhost:4173";
let cookie = "";
async function call(method, url, body) {
  const res = await fetch(base + url, { method, headers: { "content-type": "application/json", cookie }, body: body && JSON.stringify(body) });
  const set = res.headers.get("set-cookie"); if (set) cookie = set.split(";")[0];
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`${method} ${url} -> ${res.status} ${JSON.stringify(data)}`);
  return data;
}
const ok = (cond, msg) => { if (!cond) throw new Error("FAILED: " + msg); console.log("  ✓", msg); };
const id = Date.now().toString(36);

await call("POST", "/api/register", { name: "Smoke Teacher", email: `smoke-${id}@example.test`, password: "smoke-test-" + id });
ok((await call("GET", "/api/me")).name === "Smoke Teacher", "register + session");
const bank = await call("POST", "/api/banks", { title: "Smoke bank", grade: "G5" });
ok(/^[A-Z0-9]{6}$/.test(bank.code), "bank created with code " + bank.code);
const add = await call("POST", `/api/banks/${bank.id}/questions`, { questions: [{ text: "2+2?", options: ["3", "4"], answer: 1 }, { text: "Sky?", options: ["Blue", "Green"], answer: 0 }, { text: "bad" }] });
ok(add.added === 2 && add.skipped === 1, "questions added/skipped");
const qs = await call("GET", `/api/banks/${bank.id}/questions`);
ok(qs.length === 2 && Array.isArray(qs[0].options), "questions listed");
await call("PUT", `/api/questions/${qs[1].id}`, { text: "Sky colour?", options: ["Blue", "Green", "Red"], answer: 0 });
const banks = await call("GET", "/api/banks");
ok(banks[0].question_count === 2 && typeof banks[0].question_count === "number", "bank list counts are numbers");

const first = await call("POST", "/api/play/join", { code: bank.code, name: "Sam Smoke", track: "blocks" });
ok(first.needPic === "choose", "new student is asked to choose a secret picture");
const st = await call("POST", "/api/play/join", { code: bank.code, name: "Sam Smoke", track: "blocks", pic: "fox" });
ok(st.token && /^[A-Z0-9]{10}$/.test(st.pkey), "student joined, progress code " + st.pkey);
ok((await call("POST", "/api/play/join", { code: bank.code, name: "Sam Smoke", track: "blocks" })).needPic === "enter", "returning student is asked for the picture");
let wrong = false; try { await call("POST", "/api/play/join", { code: bank.code, name: "Sam Smoke", track: "blocks", pic: "cat" }); } catch { wrong = true; }
ok(wrong, "wrong picture is refused");
const again = await call("POST", "/api/play/join", { code: bank.code.toLowerCase(), name: "sam smoke", track: "blocks", pic: "fox" });
ok(again.token === st.token, "rejoin with other case finds same student");
const py = await call("POST", "/api/play/join", { code: bank.code, name: "Sam Smoke", track: "python", pic: "fox" });
ok(py.pkey === st.pkey && py.token !== st.token, "python track shares the progress code");
const q1 = (await call("GET", `/api/play/question?token=${st.token}`)).question;
ok(q1 && q1.options.length >= 2, "got a question");
const right = qs.find((q) => q.id === q1.id).answer;
const ans = await call("POST", "/api/play/answer", { token: st.token, questionId: q1.id, chosen: right });
ok(ans.correct && ans.gems === 10, "correct answer gives gems");
await call("POST", "/api/play/answer", { token: st.token, questionId: q1.id, chosen: right === 0 ? 1 : 0 });
await call("POST", "/api/play/attempt", { token: st.token, levelId: "b1", ok: false });
await call("POST", "/api/play/attempt", { token: st.token, levelId: "b1", ok: true, code: "when run\n  move forward" });
await call("POST", "/api/play/progress", { token: st.token, levelId: "b1", stars: 2 });
await call("POST", "/api/play/progress", { token: st.token, levelId: "b1", stars: 1 });
const state = await call("GET", `/api/play/state?token=${st.token}`);
ok(state.progress.b1 === 2 && state.gems === 30, "progress keeps best stars; 10 gems per new star");

const rep = await call("GET", `/api/banks/${bank.id}/report`);
const row = rep.students.find((s) => s.track === "blocks");
ok(row.levels_done === 1 && row.stars === 2 && row.answered === 2 && row.correct === 1 && row.pkey === st.pkey, "teacher report numbers");
await call("PUT", `/api/banks/${bank.id}`, { locked: ["b5", "p3", "bad id!"] });
ok(JSON.stringify((await call("GET", `/api/play/state?token=${st.token}`)).locked) === '["b5","p3"]', "teacher level locks reach the student");
const detail = await call("GET", `/api/students/${row.id}`);
ok(detail.levels.b1.code.includes("move forward") && detail.pic === "fox", "teacher sees the student's code and picture");
await call("POST", `/api/students/${row.id}/reset-picture`);
ok((await call("POST", "/api/play/join", { code: bank.code, name: "Sam Smoke", track: "blocks" })).needPic === "choose", "teacher can reset a forgotten picture");
const world = { grid: ["........", "...T....", "........", "....F...", "........", "........", "........", "........"], start: [1, 3, "E"] };
const proj = await call("POST", "/api/play/projects", { token: st.token, title: "My world", world, code: "hero.move(3)" });
await call("POST", "/api/play/projects", { token: st.token, id: proj.id, title: "My best world", world, code: "hero.move(4)" });
const shared = await call("GET", `/api/projects/${proj.share}`);
ok(shared.title === "My best world" && shared.code === "hero.move(4)" && shared.author === "Sam", "project saves, updates and opens from its share link");
ok((await call("GET", `/api/play/projects?token=${st.token}`)).length === 1, "project list");
await call("POST", "/api/play/progress", { token: st.token, levelId: "a1", stars: 3 });
const par = await call("GET", `/api/progress?key=${st.pkey}`);
ok(par.name === "Sam Smoke" && par.tracks.blocks.levels.b1.runs === 2 && par.tracks.blocks.levels.b1.fails === 1 && par.answered === 2 && /^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d$/.test(par.lastSeen), "parent progress page data");
ok(par.tracks.python && par.teacher === "Smoke Teacher", "both tracks and teacher name");

await call("DELETE", `/api/students/${row.id}`);
await call("DELETE", `/api/banks/${bank.id}`);
ok(!(await call("GET", "/api/banks")).some((b) => b.id === bank.id), "bank deleted");
await call("POST", "/api/logout");
console.log("ALL PASSED against", base);
