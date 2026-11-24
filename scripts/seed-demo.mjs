// Copy the local demo teacher + "ICT Demo Bank" questions to a running site (e.g. the live one):
//   node scripts/seed-demo.mjs https://your-site.onrender.com
// Uses the email/password in data/demo-account.txt (never printed) and prints the new class code.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const base = (process.argv[2] || "").replace(/\/$/, "");
if (!base) { console.log("usage: node scripts/seed-demo.mjs <site url>"); process.exit(1); }
const acct = fs.readFileSync(path.join(root, "data", "demo-account.txt"), "utf8");
const email = acct.match(/email:\s*(\S+)/)[1], password = acct.match(/password:\s*(\S+)/)[1];
const lite = new DatabaseSync(path.join(root, "data", "blockquest.db"), { readOnly: true });
const bank = lite.prepare("SELECT b.* FROM banks b JOIN teachers t ON t.id=b.teacher_id WHERE t.email=? ORDER BY b.id LIMIT 1").get(email);
const questions = lite.prepare("SELECT text, options, answer FROM questions WHERE bank_id=? ORDER BY id").all(bank.id).map((q) => ({ ...q, options: JSON.parse(q.options) }));
const teacherName = lite.prepare("SELECT name FROM teachers WHERE email=?").get(email).name;

let cookie = "";
async function call(method, url, body, allow = []) {
  for (let i = 0; ; i++) {
    const res = await fetch(base + url, { method, headers: { "content-type": "application/json", cookie }, body: body && JSON.stringify(body) });
    if (res.status === 404 && res.headers.get("x-render-routing") === "no-server" && i < 8) { console.log("waking the server…"); await new Promise((r) => setTimeout(r, 15000)); continue; }
    const set = res.headers.get("set-cookie"); if (set) cookie = set.split(";")[0];
    const data = await res.json().catch(() => null);
    if (!res.ok && !allow.includes(res.status)) throw new Error(`${method} ${url} -> ${res.status} ${JSON.stringify(data)}`);
    return { status: res.status, data };
  }
}
const reg = await call("POST", "/api/register", { name: teacherName, email, password }, [409]);
if (reg.status === 409) await call("POST", "/api/login", { email, password });
const existing = (await call("GET", "/api/banks")).data.find((b) => b.title === bank.title);
const target = existing || (await call("POST", "/api/banks", { title: bank.title, grade: bank.grade })).data;
if (!existing) await call("POST", `/api/banks/${target.id}/questions`, { questions });
console.log(`demo teacher ${email} ready; bank "${target.title}" class code ${target.code}; ${existing ? "already existed" : questions.length + " questions added"}`);
