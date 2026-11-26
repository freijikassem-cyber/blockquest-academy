// BlockQuest teacher dashboard
(function () {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const L = (i) => String.fromCharCode(65 + i);
  async function api(method, path, body) {
    const res = await fetch(path, { method, headers: body ? { "Content-Type": "application/json" } : {}, body: body ? JSON.stringify(body) : undefined });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 && path !== "/api/login") { showAuth(); throw new Error(data.error || "Please sign in."); }
    if (!res.ok) throw new Error(data.error || "Something went wrong.");
    return data;
  }
  let banks = [], bank = null, tab = "questions", editing = null;

  // ---------- auth ----------
  let mode = "login";
  function showAuth() { $("auth").classList.remove("hidden"); $("dash").classList.add("hidden"); $("tname").classList.add("hidden"); $("logout").classList.add("hidden"); }
  document.querySelectorAll("#auth .tab").forEach((t) => t.addEventListener("click", () => {
    mode = t.dataset.mode;
    document.querySelectorAll("#auth .tab").forEach((x) => x.classList.toggle("active", x === t));
    $("nameField").classList.toggle("hidden", mode !== "register");
    $("ago").textContent = mode === "register" ? "Create my account" : "Sign in";
    $("apass").autocomplete = mode === "register" ? "new-password" : "current-password";
    $("aerr").textContent = "";
  }));
  $("authForm").addEventListener("submit", async (e) => {
    e.preventDefault(); $("aerr").textContent = "";
    try {
      const me = await api("POST", "/api/" + mode, { name: $("aname").value, email: $("aemail").value, password: $("apass").value });
      $("apass").value = "";
      start(me);
    } catch (err) { $("aerr").textContent = err.message; }
  });
  $("logout").addEventListener("click", async () => { await api("POST", "/api/logout"); bank = null; showAuth(); });
  async function start(me) {
    $("auth").classList.add("hidden"); $("dash").classList.remove("hidden");
    $("tname").textContent = me.name; $("tname").classList.remove("hidden"); $("logout").classList.remove("hidden");
    await loadBanks();
    if (banks.length && !bank) openBank(banks[0].id);
  }

  // ---------- banks ----------
  async function loadBanks() {
    banks = await api("GET", "/api/banks");
    $("banks").innerHTML = banks.length ? banks.map((b) => `<button class="bank ${bank && bank.id === b.id ? "active" : ""}" data-id="${b.id}"><b>${esc(b.title)}</b><br><span class="muted">${esc(b.grade || "")} · ${b.student_count} students</span></button>`).join("") : '<p class="muted">No classes yet.</p>';
    $("banks").querySelectorAll(".bank").forEach((el) => el.addEventListener("click", () => openBank(Number(el.dataset.id))));
  }
  $("newBank").addEventListener("submit", async (e) => {
    e.preventDefault();
    try { const b = await api("POST", "/api/banks", { title: $("btitle").value, grade: $("bgrade").value }); $("btitle").value = ""; await loadBanks(); openBank(b.id); }
    catch (err) { alert(err.message); }
  });
  function openBank(id) { bank = banks.find((b) => b.id === id); tab = "report"; editing = null; loadBanks(); render(); }

  function render() {
    if (!bank) { $("detail").innerHTML = '<p class="muted">Create a class on the left, or pick one to open it.</p>'; return; }
    $("detail").innerHTML = `<div class="row" style="margin-bottom:14px"><h2 style="margin:0">${esc(bank.title)}</h2><span class="spacer"></span><span class="chip">Class code: ${esc(bank.code)}</span></div>
      <div class="tabs">${[["report", "Grade report"], ["lessons", "Lessons & locks"], ["share", "Share"], ["questions", "Questions"], ["import", "Import"]].map(([k, n]) => `<button class="tab ${tab === k ? "active" : ""}" data-tab="${k}">${n}</button>`).join("")}</div><div id="pane"></div>`;
    $("detail").querySelectorAll(".tab").forEach((t) => t.addEventListener("click", () => { tab = t.dataset.tab; editing = null; render(); }));
    ({ questions: paneQuestions, import: paneImport, share: paneShare, report: paneReport, lessons: paneLessons })[tab]();
  }

  // ---------- questions ----------
  async function paneQuestions() {
    const pane = $("pane");
    const qs = await api("GET", `/api/banks/${bank.id}/questions`);
    const e = editing ? qs.find((x) => x.id === editing) : null;
    const opts = e ? [...e.options, "", "", "", ""].slice(0, Math.max(4, e.options.length)) : ["", "", "", ""];
    pane.innerHTML = `<form id="qform" class="qitem">
        <h3>${e ? "Edit question" : "Add a question"}</h3>
        <div class="field"><label for="qtext">Question</label><textarea id="qtext" rows="2" required maxlength="1000">${esc(e?.text)}</textarea></div>
        <label>Options — select the correct one</label>
        ${opts.map((o, i) => `<div class="row" style="margin-bottom:8px;flex-wrap:nowrap"><input type="radio" name="correct" value="${i}" style="width:auto" ${(e ? e.answer : 0) === i ? "checked" : ""} aria-label="Option ${L(i)} is correct"><b>${L(i)}</b><input class="qopt" value="${esc(o)}" maxlength="300" placeholder="Option ${L(i)}${i > 1 ? " (optional)" : ""}"></div>`).join("")}
        <div class="error" id="qerr"></div>
        <div class="row"><button class="btn small">${e ? "Save changes" : "+ Add question"}</button>${e ? '<button type="button" id="qcancel" class="btn ghost small">Cancel</button>' : ""}</div>
      </form>
      <h3>${qs.length} question${qs.length === 1 ? "" : "s"} in this bank</h3>
      ${qs.map((x, n) => `<div class="qitem"><div class="row" style="flex-wrap:nowrap;align-items:flex-start"><b style="flex:1">${n + 1}. ${esc(x.text)}</b><button class="btn ghost small" data-edit="${x.id}">Edit</button><button class="btn pink small" data-del="${x.id}">Delete</button></div>
        <ol type="A">${x.options.map((o, i) => `<li class="${i === x.answer ? "correct" : ""}">${esc(o)}${i === x.answer ? " ✓" : ""}</li>`).join("")}</ol></div>`).join("") || '<p class="muted">No questions yet. Add one above, or use the Import tab.</p>'}`;
    $("qcancel")?.addEventListener("click", () => { editing = null; paneQuestions(); });
    $("qform").addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const raw = [...pane.querySelectorAll(".qopt")].map((i) => i.value.trim());
      const chosen = Number(pane.querySelector("input[name=correct]:checked")?.value ?? 0);
      if (!raw[chosen]) return ($("qerr").textContent = "The option you marked as correct is empty.");
      const options = raw.filter(Boolean), answer = options.indexOf(raw[chosen]);
      const body = { text: $("qtext").value, options, answer };
      try {
        if (e) await api("PUT", `/api/questions/${e.id}`, body);
        else { const r = await api("POST", `/api/banks/${bank.id}/questions`, body); if (!r.added) throw new Error("A question needs text and at least 2 options."); }
        editing = null; await loadBanks(); paneQuestions();
      } catch (err) { $("qerr").textContent = err.message; }
    });
    pane.querySelectorAll("[data-edit]").forEach((b) => b.addEventListener("click", () => { editing = Number(b.dataset.edit); paneQuestions().then(() => $("qform").scrollIntoView({ behavior: "smooth", block: "center" })); }));
    pane.querySelectorAll("[data-del]").forEach((b) => b.addEventListener("click", async () => { if (!confirm("Delete this question? Student answers to it are removed too.")) return; await api("DELETE", `/api/questions/${b.dataset.del}`); await loadBanks(); paneQuestions(); }));
  }

  // ---------- import ----------
  const loaded = {};
  const lib = (src) => (loaded[src] ??= new Promise((ok, bad) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = () => bad(new Error("Could not load a file reader.")); document.head.appendChild(s); }));
  function parseCSV(text) {
    const rows = []; let row = [], cell = "", q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
      else if (c === '"') q = true;
      else if (c === "," || c === ";" || c === "\t") { row.push(cell); cell = ""; }
      else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; }
      else cell += c;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    return rows;
  }
  // rows: [question, optA, optB, (optC), (optD), answer]  — answer = letter, number (1-based) or the option text
  function rowsToQuestions(rows) {
    const out = [];
    for (const r0 of rows) {
      const r = r0.map((c) => String(c ?? "").trim());
      if (r.length < 4 || !r[0] || /^(question|questions|q)$/i.test(r[0])) continue;
      let last = r.length - 1; while (last > 0 && !r[last]) last--;
      const ans = r[last], options = r.slice(1, last).filter(Boolean);
      let answer = -1;
      if (/^[A-Fa-f]$/.test(ans)) answer = ans.toUpperCase().charCodeAt(0) - 65;
      else if (/^[1-6]$/.test(ans)) answer = Number(ans) - 1;
      else answer = options.findIndex((o) => o.toLowerCase() === ans.toLowerCase());
      if (options.length >= 2 && answer >= 0 && answer < options.length) out.push({ text: r[0], options, answer });
    }
    return out;
  }
  async function readFile(file) {
    const ext = file.name.split(".").pop().toLowerCase();
    if (ext === "csv" || ext === "tsv") { const text = await file.text(); return { questions: rowsToQuestions(parseCSV(text)), text }; }
    if (ext === "txt" || ext === "md") return { questions: [], text: await file.text() };
    const buf = await file.arrayBuffer();
    if (ext === "xlsx" || ext === "xls") {
      await lib("/vendor/xlsx/xlsx.full.min.js");
      const wb = XLSX.read(buf, { type: "array" });
      let questions = [], text = "";
      for (const name of wb.SheetNames) { questions = questions.concat(rowsToQuestions(XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: "" }))); text += XLSX.utils.sheet_to_csv(wb.Sheets[name]) + "\n"; }
      return { questions, text };
    }
    if (ext === "docx") { await lib("/vendor/mammoth/mammoth.browser.min.js"); return { questions: [], text: (await mammoth.extractRawText({ arrayBuffer: buf })).value }; }
    if (ext === "pptx") {
      await lib("/vendor/jszip/jszip.min.js");
      const zip = await JSZip.loadAsync(buf);
      const slides = Object.keys(zip.files).filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n)).sort((a, b) => a.match(/\d+/)[0] - b.match(/\d+/)[0]);
      let text = "";
      for (const s of slides) {
        const xml = await zip.files[s].async("string");
        for (const p of xml.split("</a:p>")) { const line = [...p.matchAll(/<a:t[^>]*>([^<]*)<\/a:t>/g)].map((m) => m[1]).join(""); if (line.trim()) text += line + "\n"; }
        text += "\n";
      }
      const ta = document.createElement("textarea"); ta.innerHTML = text; // decode XML entities
      return { questions: [], text: ta.value };
    }
    if (ext === "pdf") {
      // pdf.js ships as an ES module; scripting stays off (the default) so a PDF can't run code
      const pdfjsLib = await import("/vendor/pdfjs/pdf.min.mjs");
      pdfjsLib.GlobalWorkerOptions.workerSrc = "/vendor/pdfjs/pdf.worker.min.mjs";
      const pdf = await pdfjsLib.getDocument({ data: buf, isEvalSupported: false, enableScripting: false }).promise;
      let text = "";
      for (let i = 1; i <= pdf.numPages; i++) { const c = await (await pdf.getPage(i)).getTextContent(); text += c.items.map((it) => it.str + (it.hasEOL ? "\n" : " ")).join("") + "\n\n"; }
      return { questions: [], text };
    }
    if (ext === "ppt" || ext === "doc") throw new Error("Old .ppt / .doc files can't be read. Save the file as .pptx / .docx (or PDF) and upload again.");
    throw new Error("That file type isn't supported. Use CSV, Excel, Word, PowerPoint, PDF or a text file.");
  }

  let candidates = [];
  function paneImport() {
    $("pane").innerHTML = `<div class="qitem"><h3>From a file</h3>
        <p>Upload a <b>CSV or Excel</b> question sheet, or teaching <b>material</b> (PowerPoint, Word, PDF, Excel). Questions are shown below for you to check before anything is saved.</p>
        <div class="drop" id="drop"><input type="file" id="file" accept=".csv,.tsv,.txt,.md,.xlsx,.xls,.docx,.pptx,.pdf" style="max-width:340px"><p class="muted" style="margin:10px 0 0">or drop a file here</p></div>
        <div class="row" style="margin-top:10px"><label for="count" style="margin:0">Questions to write from material:</label><input id="count" type="number" min="1" max="40" value="10" style="width:90px"></div>
        <p class="muted" style="margin-top:10px">Question sheet columns: <b>question, option A, option B, option C, option D, answer</b> (answer = A/B/C/D). <a href="#" id="tpl">Download a CSV template</a></p>
        <div id="istatus" style="font-weight:800;min-height:24px"></div></div><div id="review"></div>`;
    $("tpl").addEventListener("click", (e) => { e.preventDefault(); download("question-bank-template.csv", 'question,option A,option B,option C,option D,answer\n"What does CPU stand for?",Central Processing Unit,Computer Personal Unit,Central Print Unit,Control Process Utility,A\n"Which device is an input device?",Monitor,Keyboard,Speaker,Printer,B\n'); });
    const handle = async (file) => {
      if (!file) return;
      const st = $("istatus"); st.className = ""; st.textContent = `Reading ${file.name}…`; $("review").innerHTML = "";
      try {
        const { questions, text } = await readFile(file);
        if (questions.length) { candidates = questions; st.textContent = `Found ${questions.length} questions in the sheet.`; }
        else {
          st.textContent = "Looking for questions in the material… this can take a minute.";
          const r = await api("POST", "/api/generate", { text, count: Number($("count").value) || 10, grade: bank.grade });
          candidates = r.questions;
          st.textContent = r.source === "ai" ? `The AI wrote ${candidates.length} questions from your material. Check them before adding.` : `Found ${candidates.length} questions written in the document.`;
        }
        if (!candidates.length) throw new Error("No questions could be made from that file.");
        review();
      } catch (err) { st.className = "error"; st.textContent = err.message; }
    };
    $("file").addEventListener("change", (e) => handle(e.target.files[0]));
    const drop = $("drop");
    drop.addEventListener("dragover", (e) => { e.preventDefault(); drop.style.borderColor = "var(--yellow)"; });
    drop.addEventListener("dragleave", () => (drop.style.borderColor = ""));
    drop.addEventListener("drop", (e) => { e.preventDefault(); drop.style.borderColor = ""; handle(e.dataTransfer.files[0]); });
  }
  function review() {
    $("review").innerHTML = `<h3>Check the questions</h3>${candidates.map((x, n) => `<label class="qitem" style="display:block;font-weight:500"><div class="row" style="flex-wrap:nowrap;align-items:flex-start"><input type="checkbox" checked data-n="${n}" style="width:auto;margin-top:5px"><b style="flex:1">${esc(x.text)}</b></div>
      <ol type="A">${x.options.map((o, i) => `<li class="${i === x.answer ? "correct" : ""}">${esc(o)}${i === x.answer ? " ✓" : ""}</li>`).join("")}</ol></label>`).join("")}
      <button id="addSel" class="btn">Add selected to bank</button>`;
    $("addSel").addEventListener("click", async () => {
      const picked = [...$("review").querySelectorAll("input:checked")].map((c) => candidates[Number(c.dataset.n)]);
      if (!picked.length) return;
      try { const r = await api("POST", `/api/banks/${bank.id}/questions`, { questions: picked }); await loadBanks(); $("review").innerHTML = ""; $("istatus").className = "ok"; $("istatus").textContent = `Added ${r.added} questions to “${bank.title}”.`; candidates = []; }
      catch (err) { $("istatus").className = "error"; $("istatus").textContent = err.message; }
    });
  }

  // ---------- share ----------
  function paneShare() {
    const link = `${location.origin}/play?code=${bank.code}`;
    const gc = `https://classroom.google.com/share?url=${encodeURIComponent(link)}&title=${encodeURIComponent("BlockQuest Academy · " + bank.title)}&body=${encodeURIComponent("Class code: " + bank.code)}`;
    $("pane").innerHTML = `<p>Students open the play page and type this class code and their name. The first time, they choose a <b>secret picture</b> (no typing needed), and they tap the same picture every time they come back. If a student forgets it, reset it from their page in the Grade report.</p>
      <div class="code-big">${esc(bank.code)}</div>
      <div class="field" style="margin-top:14px"><label for="link">Direct link</label><div class="row" style="flex-wrap:nowrap"><input id="link" readonly value="${esc(link)}"><button id="copy" class="btn small">Copy</button></div></div>
      <div class="row"><a class="btn teal small" href="${esc(link)}" target="_blank" rel="noopener">Preview as a student</a>
      <a class="btn small" href="${esc(gc)}" target="_blank" rel="noopener">Share to Google Classroom</a>
      <label style="margin:0"><input type="checkbox" id="shared" style="width:auto" ${bank.shared ? "checked" : ""}> Students can join with this code</label></div>
      <hr style="border-color:var(--line);margin:22px 0"><div class="field"><label for="rename">Rename class</label><div class="row" style="flex-wrap:nowrap"><input id="rename" value="${esc(bank.title)}" maxlength="120"><button id="saveName" class="btn ghost small">Save</button></div></div>
      <button id="delBank" class="btn pink small">Delete this class</button>`;
    $("copy").addEventListener("click", async () => { try { await navigator.clipboard.writeText(link); } catch { $("link").select(); document.execCommand("copy"); } $("copy").textContent = "Copied!"; });
    const update = async (body) => { bank = await api("PUT", `/api/banks/${bank.id}`, body); await loadBanks(); };
    $("shared").addEventListener("change", (e) => update({ shared: e.target.checked }));
    $("saveName").addEventListener("click", async () => { await update({ title: $("rename").value }); render(); });
    $("delBank").addEventListener("click", async () => {
      if (!confirm(`Delete “${bank.title}” with all its questions and student results? This cannot be undone.`)) return;
      await api("DELETE", `/api/banks/${bank.id}`); bank = null; await loadBanks(); render();
    });
  }

  const PICS = { dog: "🐶", cat: "🐱", lion: "🦁", frog: "🐸", monkey: "🐵", panda: "🐼", fox: "🦊", turtle: "🐢", octopus: "🐙", unicorn: "🦄", bee: "🐝", dolphin: "🐬" };
  // ---------- report ----------
  function download(name, text) { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["﻿" + text], { type: "text/csv" })); a.download = name; a.click(); URL.revokeObjectURL(a.href); }
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
  async function paneReport() {
    const r = await api("GET", `/api/banks/${bank.id}/report`);
    const total = (t) => window.LEVELS[t].length;
    const quizTotal = (t) => window.COURSES.filter((c) => c.track === t).reduce((n, c) => n + c.units.length, 0);
    const trackName = (t) => (t === "python" ? "Python" : "Blocks");
    $("pane").innerHTML = `<div class="row" style="margin-bottom:12px"><span class="chip">${r.students.length} student entries</span><span class="spacer"></span><button id="refresh" class="btn ghost small">Refresh</button><button id="export" class="btn small">Export CSV</button></div>
      <div class="tablewrap"><table><thead><tr><th>Student</th><th title="Secret picture">🔑</th><th>Track</th><th>Levels</th><th>Quizzes</th><th>Stars</th><th>Gems</th><th>Last active</th><th>Parent code</th><th></th></tr></thead><tbody>
      ${r.students.map((s) => `<tr><td><a href="#" data-st="${s.id}"><b>${esc(s.name)}</b></a></td><td style="font-size:20px">${PICS[s.pic] || "–"}</td><td>${trackName(s.track)}</td><td><div class="row" style="flex-wrap:nowrap;gap:8px"><b>${s.levels_done} / ${total(s.track)}</b><div class="bar"><b style="width:${pct(s.levels_done, total(s.track))}%"></b></div></div></td><td>${s.quizzes_passed} / ${quizTotal(s.track)}</td><td>${s.stars} / ${total(s.track) * 3}</td><td>💎 ${s.gems}</td><td class="muted">${esc(s.last_seen)}</td><td><a href="/progress#${esc(s.pkey || "")}" target="_blank" style="font-family:ui-monospace,monospace">${esc(s.pkey || "")}</a></td><td><button class="btn ghost small" data-rm="${s.id}" title="Remove this student's results">✕</button></td></tr>`).join("") || '<tr><td colspan="10" class="muted">No students have joined yet. Share the class code from the Share tab.</td></tr>'}
      </tbody></table></div>
      <p class="muted" style="margin-top:8px">Click a student's name to see each level, their latest code and their projects.</p>
`;
    $("refresh").addEventListener("click", paneReport);
    $("pane").querySelectorAll("[data-st]").forEach((a) => a.addEventListener("click", (e) => { e.preventDefault(); studentModal(Number(a.dataset.st)); }));
    $("export").addEventListener("click", () => {
      const cell = (v) => `"${String(v).replace(/"/g, '""')}"`;
      const rows = [["Student", "Track", "Levels completed", "Levels total", "Unit quizzes passed", "Stars", "Gems", "Last active (UTC)", "Parent progress code"]]
        .concat(r.students.map((s) => [s.name, trackName(s.track), s.levels_done, total(s.track), s.quizzes_passed, s.stars, s.gems, s.last_seen, s.pkey || ""]));
      download(`${bank.title.replace(/[^\w\- ]+/g, "")} - grade report.csv`, rows.map((x) => x.map(cell).join(",")).join("\n"));
    });
    $("pane").querySelectorAll("[data-rm]").forEach((b) => b.addEventListener("click", async () => { if (!confirm("Remove this student's results from the report?")) return; await api("DELETE", `/api/students/${b.dataset.rm}`); paneReport(); }));
  }

  // ---------- one student: levels, latest code, projects ----------
  const byId = (id) => [...window.LEVELS.blocks, ...window.LEVELS.python].find((l) => l.id === id);
  // one group per unit (levels, unit project, unit quiz), one for each final project, and the AI Lab
  const allLevelLists = () => [
    ...window.COURSES.flatMap((c) => [
      ...c.units.map((u, ui) => ({ title: `Grades ${c.grades} · Unit ${ui + 1}: ${u.title.en}`, track: c.track,
        list: [...u.levels.map(byId), byId(u.project), { id: u.quiz, title: "Unit quiz", quiz: true }] })),
      { title: `Grades ${c.grades} · Final project (unlocks the signed certificate)`, track: c.track, list: [byId(c.final)] },
    ]),
    { title: "AI Lab", list: window.AI_LEVELS.map((a) => ({ ...a, title: BQ.AI.title(a) })), track: "ai" },
  ];
  const levelNo = (l, track) => (l.quiz ? "📝" : l.kind === "project" ? "🛠" : l.kind === "final" ? "🏁" : track === "ai" ? "AI " + (window.AI_LEVELS.findIndex((a) => a.id === l.id) + 1) : "•");
  async function studentModal(id) {
    let d;
    try { d = await api("GET", `/api/students/${id}`); } catch (e) { return alert(e.message); }
    const groups = allLevelLists().filter((g) => g.track === d.track || g.track === "ai");
    const box = document.createElement("div");
    box.className = "modal";
    box.innerHTML = `<div class="card" style="max-width:820px;width:100%;max-height:88vh;overflow:auto">
      <div class="row"><h2 style="margin:0">${esc(d.name)} <span style="font-size:24px">${PICS[d.pic] || ""}</span></h2><span class="chip">${d.track === "python" ? "Python" : "Blocks"}</span><span class="chip">💎 ${d.gems}</span><span class="spacer"></span><button class="btn ghost small" data-x>Close</button></div>
      <div class="row" style="margin:10px 0"><button class="btn ghost small" data-reset>Reset secret picture</button><a class="btn ghost small" href="/progress#${esc(d.pkey || "")}" target="_blank">Parent view</a><span id="msg" class="ok"></span></div>
      ${groups.map((g) => `<h3 style="margin-top:16px">${esc(g.title)}</h3><div class="tablewrap"><table><thead><tr><th>#</th><th>Level</th><th>Stars</th><th>Runs</th><th>Failed runs</th><th>Latest code</th></tr></thead><tbody>
        ${g.list.map((l) => { const p = d.levels[l.id]; return `<tr><td>${levelNo(l, g.track)}</td><td>${esc(l.title)}</td><td style="color:var(--yellow)">${p?.stars ? "★".repeat(p.stars) : "–"}</td><td>${p?.runs || "–"}</td><td>${p?.fails ? (p.fails >= 5 && !p.stars ? `<b class="error">${p.fails} ⚠️</b>` : p.fails) : "–"}</td>
          <td>${p?.code ? `<details><summary>Show</summary><pre class="codebox">${esc(p.code)}</pre></details>` : '<span class="muted">–</span>'}</td></tr>`; }).join("")}</tbody></table></div>`).join("")}
      <h3 style="margin-top:16px">Projects</h3>${d.projects.length ? `<ul>${d.projects.map((p) => `<li><a href="/play?project=${esc(p.share)}" target="_blank">${esc(p.title)}</a> <span class="muted">${esc((p.updated || "").slice(0, 10))}</span></li>`).join("")}</ul>` : '<p class="muted">No projects yet.</p>'}
    </div>`;
    document.body.appendChild(box);
    const close = () => box.remove();
    box.querySelector("[data-x]").addEventListener("click", close);
    box.addEventListener("click", (e) => { if (e.target === box) close(); });
    box.querySelector("[data-reset]").addEventListener("click", async () => {
      if (!confirm(`Reset ${d.name}'s secret picture? They will choose a new one next time they join.`)) return;
      await api("POST", `/api/students/${id}/reset-picture`); box.querySelector("#msg").textContent = "Done. They will choose a new picture next time.";
    });
  }

  // ---------- lessons & level locks ----------
  function quizLesson(l, locked) {
    const qs = window.QUIZZES[l.id] || [], txt = (o) => (typeof o === "object" ? o.en : o);
    return `<details class="lesson"><summary><label class="no-print" style="display:inline;margin:0" onclick="event.stopPropagation()"><input type="checkbox" data-lv="${l.id}" style="width:auto" ${locked.has(l.id) ? "" : "checked"}> Open</label>
      <b>📝 Unit quiz</b> <span class="chip">${qs.length} questions · pass ${Math.ceil(qs.length * 0.75)}</span></summary>
      <div class="lesson-body"><p>Students take the quiz after the unit project. Passing opens the next unit; they can retry as often as they need.</p><ol>${qs.map((q) => `<li><p>${esc(q.q.en)}</p>${q.code ? `<pre class="codebox">${esc(q.code)}</pre>` : ""}<p class="muted">Answer: <b>${esc(txt(q.o[q.a]))}</b></p></li>`).join("")}</ol></div></details>`;
  }
  function paneLessons() {
    const locked = new Set((() => { try { return JSON.parse(bank.locked || "[]"); } catch { return []; } })());
    const save = async () => { bank = await api("PUT", `/api/banks/${bank.id}`, { locked: [...locked] }); await loadBanks(); };
    const C = window.TEACH.concepts;
    $("pane").innerHTML = `<p>Each level comes with a short lesson plan. Untick <b>Open</b> to keep a level closed until you are ready to teach it (students who already finished it can still replay it).</p>
      <div class="row no-print" style="margin-bottom:10px"><button class="btn ghost small" id="printL">🖨 Print lesson plans</button></div>
      ${allLevelLists().map((g, gi) => `<div class="card" style="margin-top:12px;background:var(--panel2)"><div class="row"><h3 style="margin:0">${esc(g.title)}</h3><span class="spacer"></span>
        <button class="btn ghost small no-print" data-open="${gi}">Open all</button><button class="btn ghost small no-print" data-lock="${gi}">Lock all</button></div>
        ${g.list.map((l) => { if (l.quiz) return quizLesson(l, locked);
          const c = l.kind ? C.project : C[window.TEACH.levels[l.id]] || {}; return `<details class="lesson"><summary><label class="no-print" style="display:inline;margin:0" onclick="event.stopPropagation()"><input type="checkbox" data-lv="${l.id}" style="width:auto" ${locked.has(l.id) ? "" : "checked"}> Open</label>
          <b>${levelNo(l, g.track)}. ${esc(l.title)}</b> <span class="chip">${esc(c.name || "")}</span></summary>
          <div class="lesson-body"><p><b>Big idea:</b> ${esc(c.idea || "")}</p>
          ${l.story ? `<p><b>The level:</b> ${esc(l.story)}</p>` : ""}
          <p><b>Vocabulary:</b> ${esc((c.vocab || []).join(", "))}</p>
          <p><b>Warm-up (5 min):</b> ${esc(c.warmup || "")}</p>
          <p><b>Unplugged activity:</b> ${esc(c.unplugged || "")}</p>
          ${l.hint ? `<p><b>Tell a stuck student:</b> ${esc(l.hint)}</p>` : ""}
          <p><b>Check for understanding:</b> ${esc(c.check || "")}</p></div></details>`; }).join("")}</div>`).join("")}`;
    $("pane").querySelectorAll("[data-lv]").forEach((cb) => cb.addEventListener("change", async () => { cb.checked ? locked.delete(cb.dataset.lv) : locked.add(cb.dataset.lv); await save(); }));
    const groups = allLevelLists();
    $("pane").querySelectorAll("[data-open]").forEach((b) => b.addEventListener("click", async () => { groups[b.dataset.open].list.forEach((l) => locked.delete(l.id)); await save(); paneLessons(); }));
    $("pane").querySelectorAll("[data-lock]").forEach((b) => b.addEventListener("click", async () => { groups[b.dataset.lock].list.forEach((l) => locked.add(l.id)); await save(); paneLessons(); }));
    $("printL").addEventListener("click", () => { $("pane").querySelectorAll("details").forEach((d) => (d.open = true)); window.print(); });
  }

  // ---------- boot ----------
  api("GET", "/api/me").then(start).catch(showAuth);
})();
