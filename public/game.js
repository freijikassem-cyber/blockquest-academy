// BlockQuest play page: join → level map → code → run → win (gems per star)
(function () {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch {} },
    del(k) { try { localStorage.removeItem(k); } catch {} },
  };
  async function api(path, body) {
    const res = await fetch(path, body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : undefined);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Something went wrong. Try again.");
    return data;
  }

  const PICS = { dog: "🐶", cat: "🐱", lion: "🦁", frog: "🐸", monkey: "🐵", panda: "🐼", fox: "🦊", turtle: "🐢", octopus: "🐙", unicorn: "🦄", bee: "🐝", dolphin: "🐬" };
  const ALL_TOOLS = ["forward", "turn", "mine", "place", "repeat", "until", "if"];
  let project = null;     // My Projects: { id, share, title, world, code, track, view, author } while building or watching one
  const trackNow = () => (project ? project.track : me.track);
  let me = null;          // play session from the server
  let levels = [];        // levels for my track
  let level = null, levelIndex = 0;
  let renderer = null, workspace = null, running = false, hintShown = false, fails = 0, screen = "join";
  const T = (k, v) => I18N.t(k, v);
  const LV = (f, l = level) => I18N.lv(l, f);
  const OBJ = { en: { tree: "a tree", rock: "a rock", ore: "crystal ore" }, ar: { tree: "شجرة", rock: "صخرة", ore: "خام البلّور" } };
  function goalText(l = level) {
    const need = l.goal.collect || {}, parts = Object.keys(need).map((k) => T("gCollect", { n: need[k], item: T(k) }));
    if (l.grid.some((r) => r.includes("F"))) parts.push(T("gFlag"));
    const s = parts.join(T("and"));
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  // ---------- screens ----------
  function show(scr) {
    screen = scr;
    for (const s of ["join", "map", "game"]) $(s).classList.toggle("hidden", s !== screen);
    const inside = screen !== "join" && !!me;
    for (const id of ["gems", "who", "leaveBtn", "progBtn"]) $(id).classList.toggle("hidden", !inside);
    $("mapBtn").classList.toggle("hidden", screen !== "game" || !me);
    document.body.classList.toggle("sandbox", screen === "game" && !!project);
    document.body.classList.toggle("viewing", !!project?.view);
    if (me) { $("gems").textContent = "💎 " + me.gems; $("who").textContent = me.name; }
    $("crumb").textContent = screen === "game" && level ? (project ? project.title : `${T("level", { n: levelIndex + 1 })} · ${LV("title")}`) : "";
  }

  // ---------- join ----------
  // each grade band is its own course page (/grades-1-3, /grades-4-6, /grades-7-9)
  const L = (o) => (o && typeof o === "object" ? o[I18N.lang] || o.en : o);
  const pathCourse = window.COURSES.find((c) => location.pathname.replace(/\/$/, "") === c.path);
  let course = pathCourse || window.COURSES.find((c) => String(c.n) === store.get("bq_course")) || window.COURSES[1];
  function renderCourseChoices() {
    $("courseChoices").innerHTML = window.COURSES.map((c) => `<div class="card choice ${c === course ? "selected" : ""}" data-course="${c.n}" tabindex="0">
      <div class="tag">${esc(T("gradesTag", { g: c.grades }))} · ${c.track === "python" ? "PYTHON" : esc(T("blocksTag"))}</div>
      <h2 style="margin-top:8px">${esc(L(c.name))}</h2><p class="muted" style="margin:0">${esc(T(c.track === "python" ? "tPyText" : "tBlocksText"))}</p></div>`).join("");
    $("courseChoices").querySelectorAll(".choice").forEach((el) => {
      const pick = () => { course = window.COURSES.find((c) => String(c.n) === el.dataset.course); renderCourseChoices(); };
      el.addEventListener("click", pick);
      el.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") pick(); });
    });
  }
  async function join(code, name, trk, pic) {
    const r = await api("/api/play/join", { code, name, track: trk, pic });
    if (r.needPic) return askPic(r.needPic, code, name, trk);
    me = r;
    if (course.track !== me.track) course = window.COURSES.find((c) => c.track === me.track);
    store.set("bq_token", me.token); store.set("bq_code", code); store.set("bq_name", name); if (pic) store.set("bq_pic", pic);
    $("jpic").classList.add("hidden"); $("jform").classList.remove("hidden");
    enter();
  }
  // secret picture: young students tap a picture instead of typing a password
  function askPic(mode, code, name, trk) {
    show("join");
    $("jform").classList.add("hidden"); $("jpic").classList.remove("hidden");
    $("picTitle").textContent = T(mode === "choose" ? "picChoose" : "picEnter");
    $("picSub").textContent = mode === "choose" ? T("picChooseSub") : name;
    $("perr").textContent = "";
    $("pics").innerHTML = Object.entries(PICS).map(([k, e]) => `<button class="pic" data-k="${k}" aria-label="${esc(T("pic_" + k))}">${e}</button>`).join("");
    $("pics").querySelectorAll(".pic").forEach((b) => b.addEventListener("click", async () => {
      $("perr").textContent = "";
      try { await join(code, name, trk, b.dataset.k); } catch (e) { $("perr").textContent = e.message; }
    }));
  }
  $("picBack").addEventListener("click", () => { $("jpic").classList.add("hidden"); $("jform").classList.remove("hidden"); });
  $("jgo").addEventListener("click", async () => {
    $("jerr").textContent = "";
    try { await join($("jcode").value.trim().toUpperCase(), $("jname").value.trim(), course.track); }
    catch (e) { $("jerr").textContent = e.message; }
  });
  $("jname").addEventListener("keydown", (e) => { if (e.key === "Enter") $("jgo").click(); });
  $("leaveBtn").addEventListener("click", () => { store.del("bq_token"); store.del("bq_pic"); me = null; project = null; stopRun(); showJoin(); });
  $("progBtn").addEventListener("click", () => { location.href = "/progress#" + me.pkey; });
  $("watch").addEventListener("click", () => playIntro());
  I18N.onChange(() => {
    if (!me) return;
    if (screen === "join") renderCourseChoices();
    if (screen === "map") showMap();
    else if (screen === "game") { show("game"); intro(); setWorkTitle(); updateCounter(); }
  });
  $("mapBtn").addEventListener("click", () => { stopRun(); project = null; showMap(); });
  // move to another course page; Python courses use the student's Python record, block courses their blocks record
  async function goCourse(c) {
    course = c; store.set("bq_course", String(c.n));
    history.replaceState(null, "", c.path);
    if (me && c.track !== me.track) {
      try { await join(store.get("bq_code"), me.name, c.track, store.get("bq_pic") || undefined); } catch (e) { alert(e.message); }
    } else if (me) enter();
  }
  function showJoin() {
    const p = new URLSearchParams(location.search);
    $("jcode").value = p.get("code") || store.get("bq_code") || "";
    $("jname").value = store.get("bq_name") || "";
    renderCourseChoices();
    show("join");
  }
  const byId = (id) => [...window.LEVELS.blocks, ...window.LEVELS.python].find((l) => l.id === id);
  // everything in a course, in order: per unit the levels, the unit project and the unit quiz; then the final project
  function courseItems(c) {
    const out = [];
    c.units.forEach((u, ui) => {
      u.levels.forEach((id) => out.push({ kind: "level", id, unit: ui }));
      out.push({ kind: "project", id: u.project, unit: ui }, { kind: "quiz", id: u.quiz, unit: ui });
    });
    out.push({ kind: "final", id: c.final, unit: -1 });
    return out;
  }
  let items = [];
  function enter() {
    if (course.track !== me.track) course = (pathCourse?.track === me.track && pathCourse) || window.COURSES.find((c) => String(c.n) === store.get("bq_course") && c.track === me.track) || window.COURSES.find((c) => c.track === me.track);
    store.set("bq_course", String(course.n));
    if (location.pathname !== course.path) history.replaceState(null, "", course.path);
    items = courseItems(course);
    levels = items.filter((it) => it.kind !== "quiz").map((it) => byId(it.id));
    showMap();
  }
  const isDone = (id) => (me.progress[id] || 0) > 0;
  const courseDone = () => items.every((it) => isDone(it.id));

  // ---------- course page ----------
  function starsHtml(n) { return "★".repeat(n) + "<i>" + "★".repeat(3 - n) + "</i>"; }
  function showMap() {
    project = null;
    $("mapTitle").textContent = `${L(course.name)} · ${T("gradesTag", { g: course.grades })}`;
    const doneCount = items.filter((it) => isDone(it.id)).length;
    $("mapDone").textContent = T("courseDone", { a: doneCount, b: items.length });
    $("mapBar").style.width = Math.round((doneCount / items.length) * 100) + "%";
    $("mapSub").textContent = `${me.bankTitle}${me.teacher ? " · " + me.teacher : ""}`;
    $("courseNav").innerHTML = window.COURSES.map((c) => `<button class="btn ${c === course ? "" : "ghost"} small" data-go="${c.n}">${esc(T("gradesTag", { g: c.grades }))}</button>`).join("");
    $("courseNav").querySelectorAll("[data-go]").forEach((b) => b.addEventListener("click", () => goCourse(window.COURSES.find((c) => String(c.n) === b.dataset.go))));
    const locked = new Set(me.locked || []);
    let open = true;
    const card = (it) => {
      const stars = me.progress[it.id] || 0, held = locked.has(it.id) && !stars, enabled = open && !held;
      if (!stars) open = false;
      const lock = held ? "🔐" : "🔒";
      if (it.kind === "quiz") return `<button class="level quiz" data-quiz="${it.id}" data-unit="${it.unit}" ${enabled ? "" : "disabled"}><div class="num">📝</div><b>${esc(T("unitQuiz"))}</b><div class="stars">${enabled ? starsHtml(stars) : lock}</div></button>`;
      const l = byId(it.id), i = levels.indexOf(l);
      const icon = it.kind === "project" ? "🛠️" : it.kind === "final" ? "🏁" : i + 1;
      return `<button class="level ${it.kind}" data-i="${i}" ${enabled ? "" : "disabled"} ${held ? `title="${esc(T("lockedByTeacher"))}"` : ""}><div class="num">${icon}</div><b>${esc(LV("title", l))}</b><div class="stars">${enabled ? starsHtml(stars) : lock}</div></button>`;
    };
    let html = course.units.map((u, ui) => {
      const unitItems = items.filter((it) => it.unit === ui), d = unitItems.filter((it) => isDone(it.id)).length;
      return `<div class="unit"><div class="stage-head"><h2>${esc(T("unit", { n: ui + 1 }))} · ${esc(L(u.title))}</h2><span class="chip" dir="ltr">${d} / ${unitItems.length}</span></div>
        <div class="levels">${unitItems.map(card).join("")}</div></div>`;
    }).join("");
    const fin = items[items.length - 1];
    html += `<div class="unit final-unit"><div class="stage-head"><h2>🏁 ${esc(T("finalProject"))}</h2></div><div class="levels">${card(fin)}
      ${courseDone() ? `<a class="level cert-card" href="/certificate#${me.pkey}/${course.n}"><div class="num">🎓</div><b>${esc(T("certReady"))}</b><div class="muted">${esc(T("signedBy"))}</div></a>`
        : `<div class="level cert-card off"><div class="num">🎓</div><b>${esc(T("certReady"))}</b><div class="muted">${esc(T("certLocked"))}</div></div>`}</div></div>`;
    // AI Lab
    const ai = window.AI_LEVELS || [], aiDone = ai.filter((a) => me.progress[a.id]).length;
    let aiOpen = true;
    html += `<div class="stage-head"><h2>🤖 ${esc(T("stageAI"))}</h2><span class="chip" dir="ltr">${aiDone} / ${ai.length}</span><span class="spacer"></span>${ai.length && aiDone === ai.length ? `<a class="btn small" href="/certificate#${me.pkey}/ai">${esc(T("cert"))}</a>` : ""}</div>
      <p class="muted" style="margin:-6px 0 10px">${esc(T("aiSub"))}</p><div class="levels">${ai.map((a, i) => {
        const stars = me.progress[a.id] || 0, held = locked.has(a.id) && !stars, enabled = aiOpen && !held;
        if (!stars) aiOpen = false;
        return `<button class="level ai" data-ai="${i}" ${enabled ? "" : "disabled"}><div class="num">AI ${i + 1}</div><b>${esc(BQ.AI.title(a))}</b><div class="stars">${enabled ? starsHtml(stars) : held ? "🔐" : "🔒"}</div></button>`;
      }).join("")}</div>`;
    // My Projects
    html += `<div class="stage-head"><h2>🛠️ ${esc(T("projTitle"))}</h2><span class="spacer"></span><button class="btn small teal" id="projNew">${esc(T("projNew"))}</button></div>
      <p class="muted" style="margin:-6px 0 10px">${esc(T("projSub"))}</p><div id="projList" class="levels"></div>`;
    $("levels").innerHTML = html;
    $("levels").querySelectorAll(".level[data-i]").forEach((b) => b.addEventListener("click", () => openLevel(Number(b.dataset.i))));
    $("levels").querySelectorAll(".level[data-quiz]").forEach((b) => b.addEventListener("click", () => openQuiz(b.dataset.quiz, Number(b.dataset.unit))));
    $("levels").querySelectorAll(".level[data-ai]").forEach((b) => b.addEventListener("click", () => openAI(Number(b.dataset.ai))));
    $("projNew").addEventListener("click", () => openProject(null));
    loadProjects();
    show("map");
  }

  // ---------- unit quiz ----------
  function openQuiz(id, unit) {
    const qs = window.QUIZZES[id] || [], need = Math.ceil(qs.length * 0.75);
    let n = 0, right = 0;
    const ask = () => {
      const q = qs[n];
      modal(`<h3>${esc(T("quizHead", { u: unit + 1, a: n + 1, b: qs.length }))}</h3><p style="font-size:18px;font-weight:800">${esc(L(q.q))}</p>
        ${q.code ? `<pre class="codebox quiz-code" dir="ltr">${esc(q.code)}</pre>` : ""}
        <div id="opts">${q.o.map((o, i) => `<button class="opt" data-i="${i}" dir="auto">${String.fromCharCode(65 + i)}. ${esc(L(o))}</button>`).join("")}</div>
        <div id="qres" style="min-height:26px;font-weight:800;margin:8px 0"></div><button id="qnext" class="btn hidden">${esc(T(n === qs.length - 1 ? "quizDone" : "quizNext"))}</button>`);
      const buttons = [...document.querySelectorAll("#opts .opt")];
      buttons.forEach((b) => b.addEventListener("click", () => {
        buttons.forEach((x) => (x.disabled = true));
        const ok = Number(b.dataset.i) === q.a;
        if (ok) right++;
        buttons[q.a].classList.add("right"); if (!ok) b.classList.add("wrong");
        $("qres").innerHTML = ok ? `<span class="ok">${esc(T("correctShort"))}</span>` : `<span class="error">${esc(T("wrongAns", { l: String.fromCharCode(65 + q.a) }))}</span>`;
        $("qnext").classList.remove("hidden"); $("qnext").focus();
      }));
      $("qnext").addEventListener("click", () => { n++; n < qs.length ? ask() : finish(); });
    };
    const finish = async () => {
      const passed = right >= need, stars = right === qs.length ? 3 : 2;
      api("/api/play/attempt", { token: me.token, levelId: id, ok: passed, code: `quiz: ${right} / ${qs.length}` }).catch(() => {});
      if (passed) {
        try { const r = await api("/api/play/progress", { token: me.token, levelId: id, stars }); me.gems = r.gems; } catch {}
        me.progress[id] = Math.max(me.progress[id] || 0, stars);
      }
      modal(`<h2 style="text-align:center;color:var(--yellow)">${esc(T(passed ? "quizPassTitle" : "quizFailTitle"))}</h2>
        ${passed ? `<div class="bigstars">${starsHtml(stars)}</div>` : ""}
        <p style="text-align:center">${esc(T(passed ? "quizPass" : "quizFail", { s: right, t: qs.length, p: need }))}</p>
        <div class="row" style="justify-content:center">${passed ? `<button id="qmap" class="btn">${esc(T("toCourse"))}</button>` : `<button id="qmap" class="btn ghost">${esc(T("toCourse"))}</button><button id="qagain" class="btn">${esc(T("quizRetry"))}</button>`}</div>`);
      $("qmap").addEventListener("click", () => { closeModal(); showMap(); });
      $("qagain")?.addEventListener("click", () => { n = 0; right = 0; ask(); });
    };
    ask();
  }
  function openAI(i) {
    BQ.AI.open(window.AI_LEVELS[i], i, async (stars) => {
      const a = window.AI_LEVELS[i];
      try { const r = await api("/api/play/progress", { token: me.token, levelId: a.id, stars }); me.gems = r.gems; $("gems").textContent = "💎 " + me.gems; } catch {}
      me.progress[a.id] = Math.max(me.progress[a.id] || 0, stars);
    }, () => showMap());
  }
  async function loadProjects() {
    let list = [];
    try { list = await api("/api/play/projects?token=" + me.token); } catch {}
    if (screen !== "map" || !$("projList")) return;
    $("projList").innerHTML = list.length ? list.map((p) => `<div class="level proj"><b>${esc(p.title)}</b><div class="muted" dir="ltr">${esc((p.updated || "").slice(0, 10))}</div>
        <div class="row" style="gap:6px;margin-top:8px"><button class="btn small" data-open="${p.id}">${esc(T("projOpen"))}</button><button class="btn ghost small" data-del="${p.id}">${esc(T("projDelete"))}</button></div></div>`).join("")
      : `<p class="muted">${esc(T("projEmpty"))}</p>`;
    $("projList").querySelectorAll("[data-open]").forEach((b) => b.addEventListener("click", async () => {
      const p = list.find((x) => x.id === Number(b.dataset.open));
      try { const full = await api("/api/projects/" + p.share); openProject({ ...full, id: p.id, share: p.share }); } catch (e) { alert(e.message); }
    }));
    $("projList").querySelectorAll("[data-del]").forEach((b) => b.addEventListener("click", async () => {
      if (!confirm(T("projDeleteConfirm"))) return;
      try { await fetch(`/api/play/projects/${b.dataset.del}?token=${me.token}`, { method: "DELETE" }); } catch {}
      loadProjects();
    }));
  }

  // ---------- level ----------
  const BLOCK_FOR = { forward: "hero_forward", turn: "hero_turn", mine: "hero_mine", place: "hero_place", repeat: "hero_repeat", until: "hero_until", if: "hero_if" };
  const saveKey = () => (project ? `bq_proj_${project.id || "new"}` : `bq_code_${me.token.slice(0, 12)}_${level.id}`);
  function say(html, mood) { const b = $("bubble"); b.className = "bubble" + (mood ? " " + mood : ""); b.innerHTML = html; }
  const goalLine = () => `<div class="goal">🎯 ${esc(T("goal"))}: ${esc(goalText())}</div>`;
  function intro() {
    if (project) return say(esc(project.view ? T("projView", { a: project.author || "" }) : T("projIntro")));
    say(`${esc(LV("story"))}${goalLine()}`);
  }
  function setWorkTitle() { $("workTitle").textContent = T(trackNow() === "blocks" ? "workBlocks" : "workPython"); }
  function playIntro() { stopRun(); return BQ.Intro.play(level, levelIndex, me.track, goalText()); }

  function openLevel(i) {
    stopRun();
    if (i >= 0) { project = null; levelIndex = i; level = levels[i]; }
    hintShown = false; fails = 0;
    show("game");
    renderer ??= new BQ.Renderer($("canvas"));
    renderer.onInv = drawInv;
    renderer.load(level);
    intro();
    $("out").textContent = "";
    const blocks = trackNow() === "blocks";
    $("blockly").classList.toggle("hidden", !blocks);
    $("python").classList.toggle("hidden", blocks);
    setWorkTitle();
    if (blocks) setupBlocks(); else setupPython();
    updateCounter();
    if (project) { paintPalette(); return; }
    if (!me.progress[level.id]) playIntro();
  }

  // ---------- My Projects: build a world, program Bolt, share it ----------
  const TILES = [[".", "🟩", "grass"], [",", "🟨", "sand"], ["~", "🟦", "water"], ["^", "🟥", "lava"], ["T", "🌳", "tree"], ["R", "🪨", "rock"], ["O", "💎", "ore"], ["*", "💠", "gem"], ["F", "🚩", "flag"]];
  let brush = "T";
  function openProject(p) {
    const blank = { grid: ["........", "........", "........", "........", "........", "........", "........", "........"], start: [1, 3, "E"] };
    const track = p?.track || me.track;
    project = { id: p?.id || null, share: p?.share || null, title: p?.title || T("projDefault"), world: p?.world || blank, code: p?.code ?? null, track, view: !!p?.view, author: p?.author };
    level = { id: "proj", stage: 0, title: project.title, par: 0, story: "", hint: "", grid: [...project.world.grid], start: [...project.world.start], goal: {}, tools: ALL_TOOLS,
      starter: "# Program Bolt in your world\nhero.move()\n" };
    levelIndex = 0;
    openLevel(-1);
  }
  function paintPalette() {
    $("palette").innerHTML = project.view ? "" : `<div class="row" style="gap:6px;margin-bottom:6px"><input id="ptitle" maxlength="60" value="${esc(project.title)}" aria-label="${esc(T("projName"))}" style="flex:1;min-width:140px">
        <button id="psave" class="btn small">${esc(T("projSave"))}</button><button id="pshare" class="btn ghost small">${esc(T("projShare"))}</button></div>
      <div class="tiles"><span class="muted">${esc(T("projPaint"))}:</span>${TILES.map(([c, e, n]) => `<button class="tile ${brush === c ? "on" : ""}" data-c="${esc(c)}" title="${esc(T("t_" + n))}">${e}</button>`).join("")}
        <button class="tile ${brush === "bolt" ? "on" : ""}" data-c="bolt" title="${esc(T("projBoltTip"))}">🤖</button></div>`;
    if (project.view) return;
    $("palette").querySelectorAll(".tile").forEach((b) => b.addEventListener("click", () => { brush = b.dataset.c; paintPalette(); }));
    $("psave").addEventListener("click", saveProject);
    $("pshare").addEventListener("click", async () => {
      if (!project.share) await saveProject();
      if (!project.share) return;
      const link = location.origin + "/play?project=" + project.share;
      try { await navigator.clipboard.writeText(link); say(esc(T("projCopied")) + `<div class="goal" dir="ltr">${esc(link)}</div>`, "good"); } catch { prompt("", link); }
    });
  }
  async function saveProject() {
    project.title = ($("ptitle")?.value || "").trim() || T("projDefault");
    const code = trackNow() === "blocks" ? JSON.stringify(Blockly.serialization.workspaces.save(workspace)) : $("code").value;
    try {
      const r = await api("/api/play/projects", { token: me.token, id: project.id || undefined, title: project.title, world: { grid: level.grid, start: level.start }, code });
      const firstSave = !project.id;
      project.id = r.id; project.share = r.share; project.code = code;
      if (firstSave) store.del("bq_proj_new");
      show("game"); say(esc(T("projSaved")), "good");
    } catch (e) { say(esc(e.message), "bad"); }
  }
  // tap the map to paint the chosen tile (or place / turn Bolt)
  $("canvas").addEventListener("click", (e) => {
    if (!project || project.view || running) return;
    const r = $("canvas").getBoundingClientRect();
    const x = Math.floor(((e.clientX - r.left) / r.width) * 8), y = Math.floor(((e.clientY - r.top) / r.height) * 8);
    if (x < 0 || y < 0 || x > 7 || y > 7) return;
    const g = level.grid.map((row) => row.split(""));
    if (brush === "bolt") {
      if (level.start[0] === x && level.start[1] === y) level.start[2] = "NESW"[("NESW".indexOf(level.start[2]) + 1) % 4];
      else { level.start = [x, y, level.start[2]]; if (g[y][x] !== "." && g[y][x] !== ",") g[y][x] = "."; }
    } else {
      if (level.start[0] === x && level.start[1] === y && !".,".includes(brush)) return;
      if (brush === "F") g.forEach((row) => row.forEach((c, i) => { if (c === "F") row[i] = "."; }));
      g[y][x] = brush;
    }
    level.grid = g.map((row) => row.join(""));
    renderer.load(level);
  });
  function drawInv(inv) {
    const need = level.goal.collect || {};
    const icon = { wood: "🪵", stone: "🪨", gem: "💠" };
    $("inv").innerHTML = Object.keys(icon).filter((k) => need[k] || inv[k]).map((k) => `<span class="chip">${icon[k]} ${inv[k]}${need[k] ? " / " + need[k] : ""}</span>`).join("");
  }

  // ---------- blocks ----------
  let blocksDefined = false;
  function defineBlocks() {
    if (blocksDefined) return; blocksDefined = true;
    const stmt = { previousStatement: null, nextStatement: null };
    Blockly.defineBlocksWithJsonArray([
      { type: "when_run", message0: "when run ▶", nextStatement: null, colour: 45 },
      { type: "hero_forward", message0: "move forward", ...stmt, colour: 205 },
      { type: "hero_turn", message0: "turn %1", args0: [{ type: "field_dropdown", name: "DIR", options: [["left ↺", "left"], ["right ↻", "right"]] }], ...stmt, colour: 205 },
      { type: "hero_mine", message0: "mine ⛏", ...stmt, colour: 20 },
      { type: "hero_place", message0: "place %1", args0: [{ type: "field_dropdown", name: "WHAT", options: [["plank", "plank"], ["stone", "stone"]] }], ...stmt, colour: 20 },
      { type: "hero_repeat", message0: "repeat %1 times", args0: [{ type: "field_number", name: "TIMES", value: 3, min: 1, max: 50, precision: 1 }], message1: "do %1", args1: [{ type: "input_statement", name: "DO" }], ...stmt, colour: 130 },
      { type: "hero_until", message0: "repeat until flag 🚩", message1: "do %1", args1: [{ type: "input_statement", name: "DO" }], ...stmt, colour: 130 },
      { type: "hero_if", message0: "if %1 ahead", args0: [{ type: "field_dropdown", name: "WHAT", options: [["rock", "rock"], ["tree", "tree"], ["water", "water"], ["lava", "lava"], ["crystal ore", "ore"]] }], message1: "do %1", args1: [{ type: "input_statement", name: "DO" }], ...stmt, colour: 285 },
    ]);
    const g = javascript.javascriptGenerator, f = g.forBlock;
    const hl = (b) => `hl(${JSON.stringify(b.id)});\n`;
    f.when_run = () => "";
    f.hero_forward = (b) => hl(b) + "hero.act('forward');\n";
    f.hero_turn = (b) => hl(b) + `hero.act('${b.getFieldValue("DIR")}');\n`;
    f.hero_mine = (b) => hl(b) + "hero.act('mine');\n";
    f.hero_place = (b) => hl(b) + `hero.act('place','${b.getFieldValue("WHAT")}');\n`;
    f.hero_repeat = (b, gen) => `for (let i = 0; i < ${Number(b.getFieldValue("TIMES")) || 0}; i++) {\n${gen.statementToCode(b, "DO")}}\n`;
    f.hero_until = (b, gen) => `while (!hero.atGoal()) {\ntick();\n${gen.statementToCode(b, "DO")}}\n`;
    f.hero_if = (b, gen) => hl(b) + `if (hero.sense() === '${b.getFieldValue("WHAT")}') {\n${gen.statementToCode(b, "DO")}}\n`;
  }
  const startBlock = () => workspace.getBlocksByType("when_run")[0];
  function setupBlocks() {
    defineBlocks();
    if (workspace) workspace.dispose();
    const view = !!project?.view;
    workspace = Blockly.inject("blockly", {
      ...(view ? { readOnly: true } : { toolbox: { kind: "flyoutToolbox", contents: level.tools.map((t) => ({ kind: "block", type: BLOCK_FOR[t] })) } }),
      renderer: "zelos", trashcan: !view, scrollbars: true,
      zoom: { controls: true, wheel: false, startScale: 0.85, maxScale: 1.4, minScale: 0.5 },
    });
    let saved = null;
    const local = project && !project.view ? store.get(saveKey()) : null;
    try { saved = JSON.parse(local ?? (project ? project.code : store.get(saveKey()))); } catch {}
    try { if (saved) Blockly.serialization.workspaces.load(saved, workspace); } catch { workspace.clear(); }
    if (!startBlock()) { workspace.clear(); const b = workspace.newBlock("when_run"); b.initSvg(); b.render(); b.moveBy(30, 30); }
    startBlock().setDeletable(false);
    if (project?.view) { Blockly.svgResize(workspace); return; }
    Blockly.svgResize(workspace);
    workspace.addChangeListener((e) => {
      if (e.isUiEvent) return;
      if (!project?.view) store.set(saveKey(), JSON.stringify(Blockly.serialization.workspaces.save(workspace)));
      updateCounter();
    });
  }
  const blockCount = () => startBlock().getDescendants(false).length - 1;
  // the blocks as readable text, so the teacher can see what the student built
  function blocksText() {
    const label = (b) => ({ when_run: "when run", hero_forward: "move forward", hero_mine: "mine", hero_until: "repeat until flag" }[b.type]
      || (b.type === "hero_turn" ? "turn " + b.getFieldValue("DIR") : b.type === "hero_place" ? "place " + b.getFieldValue("WHAT")
        : b.type === "hero_repeat" ? `repeat ${b.getFieldValue("TIMES")} times` : b.type === "hero_if" ? `if ${b.getFieldValue("WHAT")} ahead` : b.type));
    const out = [];
    const walk = (b, d) => { for (; b; b = b.getNextBlock()) { out.push("  ".repeat(d) + label(b)); const inner = b.getInputTargetBlock("DO"); if (inner) walk(inner, d + 1); } };
    walk(startBlock(), 0);
    return out.join("\n");
  }

  // ---------- python ----------
  const PRELUDE = [
    "class _Hero:",
    "    def move(self, steps=1):",
    "        for _i in range(int(steps)): _act('forward')",
    "    def turn_left(self): _act('left')",
    "    def turn_right(self): _act('right')",
    "    def mine(self): _act('mine')",
    "    def place(self, block='plank'): _act('place', block)",
    "    def ahead(self): return _sense()",
    "    def path_clear(self): return _sense() == 'empty'",
    "    def at_goal(self): return _goal()",
    "    def count(self, item): return _count(item)",
    "hero = _Hero()",
    "",
  ];
  function setupPython() {
    const ta = $("code");
    const local = project && !project.view ? store.get(saveKey()) : null; // unsaved edits on this device win
    ta.value = local ?? (project ? project.code : store.get(saveKey())) ?? level.starter;
    ta.readOnly = !!project?.view;
    syncGutter();
  }
  function syncGutter() {
    const n = $("code").value.split("\n").length;
    $("gutter").textContent = Array.from({ length: n }, (_, i) => i + 1).join("\n");
    $("gutter").style.marginTop = -$("code").scrollTop + "px";
  }
  $("code").addEventListener("input", () => { if (!project?.view) store.set(saveKey(), $("code").value); syncGutter(); updateCounter(); });
  $("code").addEventListener("scroll", syncGutter);
  $("code").addEventListener("keydown", (e) => {
    const ta = e.target, s = ta.selectionStart, v = ta.value;
    const insert = (text) => { e.preventDefault(); ta.setRangeText(text, s, ta.selectionEnd, "end"); ta.dispatchEvent(new Event("input")); };
    if (e.key === "Tab") insert("    ");
    else if (e.key === "Enter") {
      const line = v.slice(v.lastIndexOf("\n", s - 1) + 1, s);
      insert("\n" + line.match(/^ */)[0] + (line.trimEnd().endsWith(":") ? "    " : ""));
    } else if (e.key === "Backspace" && s === ta.selectionEnd) {
      const line = v.slice(v.lastIndexOf("\n", s - 1) + 1, s);
      if (line.length && !line.trim() && line.length % 4 === 0) { e.preventDefault(); ta.setRangeText("", s - 4, s, "end"); ta.dispatchEvent(new Event("input")); }
    }
  });
  const lineCount = () => $("code").value.split("\n").filter((l) => l.trim() && !l.trim().startsWith("#")).length;

  function updateCounter() {
    if (!level) return;
    if (project) { $("counter").textContent = ""; return; }
    const n = me.track === "blocks" ? blockCount() : lineCount();
    $("counter").textContent = T(me.track === "blocks" ? "counterBlocks" : "counterLines", { n, p: level.par });
  }
  $("clear").addEventListener("click", () => {
    if (!confirm(T("clearConfirm"))) return;
    store.del(saveKey());
    stopRun();
    if (trackNow() === "blocks") setupBlocks(); else setupPython();
    updateCounter();
  });

  // ---------- running ----------
  function stopRun() {
    running = false;
    if (renderer && level) { renderer.load(level); }
    if (workspace && !workspace.isDisposed?.()) workspace.highlightBlock(null);
    $("run").disabled = false;
  }
  $("reset").addEventListener("click", () => { stopRun(); intro(); $("out").textContent = ""; });
  $("fast").addEventListener("change", (e) => { if (renderer) renderer.speed = e.target.checked ? 2.5 : 1; });
  $("hint").addEventListener("click", () => { hintShown = true; say(`💡 ${esc(LV("hint"))}${goalLine()}`); });

  function runBlocks(world) {
    const g = javascript.javascriptGenerator;
    g.init(workspace);
    const code = g.finish(g.blockToCode(startBlock()));
    let ticks = 0;
    const hero = { act: (k, a) => world.act(k, a), sense: () => world.sense(), atGoal: () => world.atGoal() };
    const tick = () => { if (++ticks > 2000) throw new BQ.GameError(T("loopForever")); };
    new Function("hero", "hl", "tick", code)(hero, (id) => { world.block = id; }, tick);
  }
  async function runPython(world) {
    const none = Sk.builtin.none.none$;
    Sk.builtins._act = new Sk.builtin.func((k, a) => { world.act(Sk.ffi.remapToJs(k), a === undefined ? undefined : Sk.ffi.remapToJs(a)); return none; });
    Sk.builtins._sense = new Sk.builtin.func(() => new Sk.builtin.str(world.sense()));
    Sk.builtins._goal = new Sk.builtin.func(() => (world.atGoal() ? Sk.builtin.bool.true$ : Sk.builtin.bool.false$));
    Sk.builtins._count = new Sk.builtin.func((k) => new Sk.builtin.int_(world.inv[Sk.ffi.remapToJs(k)] || 0));
    Sk.configure({
      output: (s) => { $("out").textContent += s; },
      read: (f) => { if (Sk.builtinFiles?.files[f] === undefined) throw "File not found: '" + f + "'"; return Sk.builtinFiles.files[f]; },
      execLimit: 3000, __future__: Sk.python3,
    });
    await Sk.misceval.asyncToPromise(() => Sk.importMainWithBody("<stdin>", false, PRELUDE.join("\n") + $("code").value + "\n", true));
  }
  // kid-friendly explanation of a Python error, in the current language
  function friendlyPython(msg) {
    const n = (msg.match(/on line (\d+)/) || [0, "?"])[1];
    let m;
    if (/TimeLimitError|ran too long/.test(msg)) return T("eTime");
    if ((m = msg.match(/NameError: name '([^']+)'/))) return T("eName", { w: m[1], n });
    if ((m = msg.match(/AttributeError:.*?has no attribute '([^']+)'/))) return T("eAttr", { w: m[1], n });
    if (/IndentationError|TabError|unindent|indent/i.test(msg)) return T("eIndent", { n });
    if (/SyntaxError|ParseError|bad input|bad token/i.test(msg)) return T("eSyntax", { n });
    if (/TypeError/.test(msg)) return T("eType", { n });
    return T("eOther", { n, m: msg.replace(/ on line \d+.*/, "") });
  }
  // explain what went wrong in this run, from the recorded events
  function diagnose(world, result, problem) {
    const ev = world.events, parts = [];
    const canPlace = trackNow() === "python" || level.tools.includes("place");
    const canMine = trackNow() === "python" || level.tools.includes("mine");
    if (problem) parts.push(problem);
    else if (world.dead) {
      const fail = ev.find((e) => e.t === "fail");
      parts.push(T(fail.why === "lava" ? "hLava" : "hWater", { n: ev.indexOf(fail) + 1 }));
      parts.push(canPlace ? T(fail.why === "lava" ? "hLavaFix" : "hWaterFix") : T("hAvoid"));
    } else {
      const bumps = ev.filter((e) => e.t === "bump"), first = bumps[0];
      if (first && first.what === "edge") parts.push(T("hBumpEdge"));
      else if (first && OBJ.en[first.what]) parts.push(T("hBump", { what: OBJ[I18N.lang][first.what], n: bumps.length }) + " " + T(canMine ? "hBumpMine" : "hBumpTurn"));
      if (ev.some((e) => e.t === "mine" && !e.got)) parts.push(T("hMineNothing"));
      if (world.flag && !world.atGoal()) {
        const d = Math.abs(world.flag[0] - world.hero.x) + Math.abs(world.flag[1] - world.hero.y);
        if (!first) parts.push(T("hShort", { n: d }));
      }
      const need = level.goal.collect || {}, miss = Object.keys(need).filter((k) => world.inv[k] < need[k]).map((k) => T("hMore", { n: need[k] - world.inv[k], item: T(k) }));
      if (miss.length) parts.push(T("hMissing", { what: miss.join(T("and")) }));
    }
    if (!problem) parts.push(T("hTry"));
    let html = "⚠️ " + parts.map(esc).join("<br>");
    if (fails >= 2) html += `<div class="goal">${esc(T("hLevelHint", { hint: LV("hint") }))}</div>`;
    if (fails >= 4) html += `<div class="muted" style="margin-top:6px">${esc(T("hWatch"))}</div>`;
    return html;
  }
  function pythonError(err) {
    let msg = String(err?.toString?.() ?? err);
    msg = msg.replace(/on line (\d+)/g, (_, n) => "on line " + Math.max(Number(n) - (PRELUDE.length - 1), 1));
    if (/TimeLimitError/.test(msg)) msg = "Your program ran too long. Is there a loop that never ends?";
    return msg.replace(/^ExternalError: (Error: )?/, "");
  }

  $("run").addEventListener("click", async () => {
    if (running) return;
    stopRun(); running = true; $("run").disabled = true; $("out").textContent = "";
    intro();
    const world = new BQ.World(level);
    let problem = null;
    try {
      if (trackNow() === "blocks") {
        if (blockCount() === 0) throw new BQ.GameError(T("noBlocks"));
        runBlocks(world);
      } else await runPython(world);
    } catch (err) {
      const native = err?.nativeError || err;
      if (native instanceof BQ.Stop) { /* hero fell — the events show it */ }
      else if (native instanceof BQ.GameError) problem = /300 actions/.test(native.message) ? T("battery") : native.message;
      else if (trackNow() === "python") { const raw = pythonError(err); $("out").textContent += raw; problem = friendlyPython(raw); }
      else problem = "Something is wrong with these blocks: " + (err?.message || err);
    }
    const token = renderer.token;
    const finished = await renderer.play(world.events, (ev) => { if (workspace && trackNow() === "blocks") workspace.highlightBlock(ev.block); });
    if (!finished || token !== renderer.token || !running) return;
    if (workspace) workspace.highlightBlock(null);
    const result = world.result();
    const ok = !problem && !world.dead && result.done;
    if (project) {
      say(ok ? esc(T("projFinished")) : diagnose(world, result, problem), ok ? "good" : "bad");
      running = false; $("run").disabled = false;
      return;
    }
    const code = me.track === "blocks" ? blocksText() : $("code").value;
    api("/api/play/attempt", { token: me.token, levelId: level.id, ok, code }).catch(() => {});
    if (ok) return win();
    fails++;
    say(diagnose(world, result, problem), "bad");
    running = false; $("run").disabled = false;
  });

  // ---------- win ----------
  async function win() {
    const used = me.track === "blocks" ? blockCount() : lineCount();
    const stars = used <= level.par ? 3 : used <= level.par + (me.track === "blocks" ? 2 : 3) ? 2 : 1;
    say(esc(T("complete")), "good");
    await renderer.celebrate();
    try { const r = await api("/api/play/progress", { token: me.token, levelId: level.id, stars }); me.gems = r.gems; $("gems").textContent = "💎 " + me.gems; } catch {}
    me.progress[level.id] = Math.max(me.progress[level.id] || 0, stars);
    winModal(stars, used);
    running = false; $("run").disabled = false;
  }
  function modal(html) { $("modalCard").innerHTML = html; $("modal").classList.remove("hidden"); }
  function closeModal() { $("modal").classList.add("hidden"); }

  function winModal(stars, used) {
    const k = items.findIndex((it) => it.id === level.id), next = items[k + 1];
    const isFinal = level.kind === "final";
    const nextBtn = isFinal ? (courseDone() ? `<a id="tocert" class="btn" href="/certificate#${me.pkey}/${course.n}">${esc(T("getCert"))}</a>` : `<button id="tomap" class="btn">${esc(T("toCourse"))}</button>`)
      : next?.kind === "quiz" ? `<button id="toquiz" class="btn">${esc(T("nextQuiz"))}</button>`
      : next ? `<button id="next" class="btn">${esc(T("next"))}</button>` : `<button id="tomap" class="btn">${esc(T("toCourse"))}</button>`;
    modal(`<h2 style="text-align:center;color:var(--yellow)">${esc(isFinal ? T("finalDone") : level.kind === "project" ? T("projectDone") : T("winTitle", { n: levelIndex + 1 }))}</h2><div class="bigstars">${starsHtml(stars)}</div>
      <p style="text-align:center"><b>${esc(T(me.track === "blocks" ? "usedBlocks" : "usedLines", { n: used }))}</b> ${esc(stars < 3 ? T("for3", { p: level.par }) : T("perfect"))}</p>
      <div class="row" style="justify-content:center"><button id="again" class="btn ghost">${esc(T("again"))}</button>${nextBtn}</div>`);
    $("again").addEventListener("click", () => { closeModal(); stopRun(); intro(); });
    $("next")?.addEventListener("click", () => { closeModal(); openLevel(levels.indexOf(byId(next.id))); });
    $("toquiz")?.addEventListener("click", () => { closeModal(); stopRun(); showMap(); openQuiz(next.id, next.unit); });
    $("tomap")?.addEventListener("click", () => { closeModal(); stopRun(); showMap(); });
  }

  window.addEventListener("resize", () => { if (workspace && me?.track === "blocks") Blockly.svgResize(workspace); });

  // ---------- boot ----------
  (async () => {
    const token = store.get("bq_token");
    const share = new URLSearchParams(location.search).get("project");
    if (share) {
      try { const p = await api("/api/projects/" + encodeURIComponent(share)); return openProject({ ...p, view: true }); }
      catch { showJoin(); return say(esc(T("projNotFound")), "bad"); }
    }
    const urlCode = new URLSearchParams(location.search).get("code");
    if (token && (!urlCode || urlCode.toUpperCase() === store.get("bq_code"))) {
      try { me = await api("/api/play/state?token=" + token); } catch { store.del("bq_token"); me = null; }
      // opening a course page of the other track (e.g. /grades-7-9 while on blocks) switches the student's record
      if (me) return pathCourse && pathCourse.track !== me.track ? goCourse(pathCourse) : enter();
    }
    showJoin();
  })();
})();
