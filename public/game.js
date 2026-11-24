// BlockQuest play page: join → level map → code → run → quiz
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
    const inside = screen !== "join";
    for (const id of ["gems", "who", "leaveBtn", "progBtn"]) $(id).classList.toggle("hidden", !inside);
    $("mapBtn").classList.toggle("hidden", screen !== "game");
    if (me) { $("gems").textContent = "💎 " + me.gems; $("who").textContent = me.name; }
    $("crumb").textContent = screen === "game" && level ? `${T("level", { n: levelIndex + 1 })} · ${LV("title")}` : "";
  }

  // ---------- join ----------
  let track = "blocks";
  document.querySelectorAll(".choice").forEach((el) => {
    const pick = () => { track = el.dataset.track; document.querySelectorAll(".choice").forEach((c) => c.classList.toggle("selected", c === el)); };
    el.addEventListener("click", pick);
    el.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") pick(); });
  });
  async function join(code, name, trk) {
    me = await api("/api/play/join", { code, name, track: trk });
    store.set("bq_token", me.token); store.set("bq_code", code); store.set("bq_name", name);
    enter();
  }
  $("jgo").addEventListener("click", async () => {
    $("jerr").textContent = "";
    try { await join($("jcode").value.trim().toUpperCase(), $("jname").value.trim(), track); }
    catch (e) { $("jerr").textContent = e.message; }
  });
  $("jname").addEventListener("keydown", (e) => { if (e.key === "Enter") $("jgo").click(); });
  $("leaveBtn").addEventListener("click", () => { store.del("bq_token"); me = null; stopRun(); showJoin(); });
  $("progBtn").addEventListener("click", () => { location.href = "/progress#" + me.pkey; });
  $("watch").addEventListener("click", () => playIntro());
  I18N.onChange(() => {
    if (!me) return;
    if (screen === "map") showMap();
    else if (screen === "game") { show("game"); intro(); setWorkTitle(); updateCounter(); }
  });
  $("mapBtn").addEventListener("click", () => { stopRun(); showMap(); });
  $("switchBtn").addEventListener("click", async () => {
    try { await join(store.get("bq_code"), me.name, me.track === "blocks" ? "python" : "blocks"); } catch (e) { alert(e.message); }
  });
  function showJoin() {
    const p = new URLSearchParams(location.search);
    $("jcode").value = p.get("code") || store.get("bq_code") || "";
    $("jname").value = store.get("bq_name") || "";
    show("join");
  }
  function enter() { levels = window.LEVELS[me.track]; showMap(); }

  // ---------- level map ----------
  function starsHtml(n) { return "★".repeat(n) + "<i>" + "★".repeat(3 - n) + "</i>"; }
  function showMap() {
    $("mapTitle").textContent = T(me.track === "blocks" ? "mapBlocks" : "mapPython");
    const doneCount = levels.filter((l) => me.progress[l.id]).length;
    $("mapDone").textContent = T("done", { a: doneCount, b: levels.length });
    $("mapBar").style.width = Math.round((doneCount / levels.length) * 100) + "%";
    $("mapSub").textContent = `${me.bankTitle}${me.teacher ? " · " + me.teacher : ""}`;
    $("switchBtn").textContent = T(me.track === "blocks" ? "toPython" : "toBlocks");
    let open = true;
    $("levels").innerHTML = levels.map((l, i) => {
      const stars = me.progress[l.id] || 0, enabled = open;
      if (!stars) open = false;
      return `<button class="level" data-i="${i}" ${enabled ? "" : "disabled"}><div class="num">${i + 1}</div><b>${esc(LV("title", l))}</b><div class="stars">${enabled ? starsHtml(stars) : "🔒"}</div></button>`;
    }).join("");
    $("levels").querySelectorAll(".level").forEach((b) => b.addEventListener("click", () => openLevel(Number(b.dataset.i))));
    show("map");
  }

  // ---------- level ----------
  const BLOCK_FOR = { forward: "hero_forward", turn: "hero_turn", mine: "hero_mine", place: "hero_place", repeat: "hero_repeat", until: "hero_until", if: "hero_if" };
  const saveKey = () => `bq_code_${me.token.slice(0, 12)}_${level.id}`;
  function say(html, mood) { const b = $("bubble"); b.className = "bubble" + (mood ? " " + mood : ""); b.innerHTML = html; }
  const goalLine = () => `<div class="goal">🎯 ${esc(T("goal"))}: ${esc(goalText())}</div>`;
  function intro() { say(`${esc(LV("story"))}${goalLine()}`); }
  function setWorkTitle() { $("workTitle").textContent = T(me.track === "blocks" ? "workBlocks" : "workPython"); }
  function playIntro() { stopRun(); return BQ.Intro.play(level, levelIndex, me.track, goalText()); }

  function openLevel(i) {
    stopRun();
    levelIndex = i; level = levels[i]; hintShown = false; fails = 0;
    show("game");
    renderer ??= new BQ.Renderer($("canvas"));
    renderer.onInv = drawInv;
    renderer.load(level);
    intro();
    $("out").textContent = "";
    const blocks = me.track === "blocks";
    $("blockly").classList.toggle("hidden", !blocks);
    $("python").classList.toggle("hidden", blocks);
    setWorkTitle();
    if (blocks) setupBlocks(); else setupPython();
    updateCounter();
    if (!me.progress[level.id]) playIntro();
  }
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
    workspace = Blockly.inject("blockly", {
      toolbox: { kind: "flyoutToolbox", contents: level.tools.map((t) => ({ kind: "block", type: BLOCK_FOR[t] })) },
      renderer: "zelos", trashcan: true, scrollbars: true,
      zoom: { controls: true, wheel: false, startScale: 0.85, maxScale: 1.4, minScale: 0.5 },
    });
    let saved = null;
    try { saved = JSON.parse(store.get(saveKey())); } catch {}
    try { if (saved) Blockly.serialization.workspaces.load(saved, workspace); } catch { workspace.clear(); }
    if (!startBlock()) { workspace.clear(); const b = workspace.newBlock("when_run"); b.initSvg(); b.render(); b.moveBy(30, 30); }
    startBlock().setDeletable(false);
    Blockly.svgResize(workspace);
    workspace.addChangeListener((e) => {
      if (e.isUiEvent) return;
      store.set(saveKey(), JSON.stringify(Blockly.serialization.workspaces.save(workspace)));
      updateCounter();
    });
  }
  const blockCount = () => startBlock().getDescendants(false).length - 1;

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
    ta.value = store.get(saveKey()) ?? level.starter;
    syncGutter();
  }
  function syncGutter() {
    const n = $("code").value.split("\n").length;
    $("gutter").textContent = Array.from({ length: n }, (_, i) => i + 1).join("\n");
    $("gutter").style.marginTop = -$("code").scrollTop + "px";
  }
  $("code").addEventListener("input", () => { store.set(saveKey(), $("code").value); syncGutter(); updateCounter(); });
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
    const n = me.track === "blocks" ? blockCount() : lineCount();
    $("counter").textContent = T(me.track === "blocks" ? "counterBlocks" : "counterLines", { n, p: level.par });
  }
  $("clear").addEventListener("click", () => {
    if (!confirm(T("clearConfirm"))) return;
    store.del(saveKey());
    stopRun();
    if (me.track === "blocks") setupBlocks(); else setupPython();
    updateCounter();
  });

  // ---------- running ----------
  function stopRun() {
    running = false;
    if (renderer && level) { renderer.load(level); }
    if (workspace) workspace.highlightBlock(null);
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
    const canPlace = me.track === "python" || level.tools.includes("place");
    const canMine = me.track === "python" || level.tools.includes("mine");
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
      if (me.track === "blocks") {
        if (blockCount() === 0) throw new BQ.GameError(T("noBlocks"));
        runBlocks(world);
      } else await runPython(world);
    } catch (err) {
      const native = err?.nativeError || err;
      if (native instanceof BQ.Stop) { /* hero fell — the events show it */ }
      else if (native instanceof BQ.GameError) problem = /300 actions/.test(native.message) ? T("battery") : native.message;
      else if (me.track === "python") { const raw = pythonError(err); $("out").textContent += raw; problem = friendlyPython(raw); }
      else problem = "Something is wrong with these blocks: " + (err?.message || err);
    }
    const token = renderer.token;
    const finished = await renderer.play(world.events, (ev) => { if (workspace && me.track === "blocks") workspace.highlightBlock(ev.block); });
    if (!finished || token !== renderer.token || !running) return;
    if (workspace) workspace.highlightBlock(null);
    const result = world.result();
    const ok = !problem && !world.dead && result.done;
    api("/api/play/attempt", { token: me.token, levelId: level.id, ok }).catch(() => {});
    if (ok) return win();
    fails++;
    say(diagnose(world, result, problem), "bad");
    running = false; $("run").disabled = false;
  });

  // ---------- win + quiz ----------
  async function win() {
    const used = me.track === "blocks" ? blockCount() : lineCount();
    const stars = used <= level.par ? 3 : used <= level.par + (me.track === "blocks" ? 2 : 3) ? 2 : 1;
    say(esc(T("complete")), "good");
    await renderer.celebrate();
    try { await api("/api/play/progress", { token: me.token, levelId: level.id, stars }); } catch {}
    me.progress[level.id] = Math.max(me.progress[level.id] || 0, stars);
    await quiz(2);
    winModal(stars, used);
    running = false; $("run").disabled = false;
  }
  function modal(html) { $("modalCard").innerHTML = html; $("modal").classList.remove("hidden"); }
  function closeModal() { $("modal").classList.add("hidden"); }

  async function quiz(count) {
    const asked = [];
    for (let n = 0; n < count; n++) {
      let q;
      try { q = (await api(`/api/play/question?token=${me.token}&exclude=${asked.join(",")}`)).question; } catch { return; }
      if (!q || asked.includes(q.id)) return;
      asked.push(q.id);
      await new Promise((resolve) => {
        modal(`<h3>${esc(T("quizTitle", { a: n + 1, b: count }))}</h3><p style="font-size:19px;font-weight:800" dir="auto">${esc(q.text)}</p>
          <div id="opts">${q.options.map((o, i) => `<button class="opt" data-i="${i}" dir="auto">${String.fromCharCode(65 + i)}. ${esc(o)}</button>`).join("")}</div>
          <div id="qres" style="min-height:26px;font-weight:800;margin:8px 0"></div><button id="qnext" class="btn hidden">${esc(T("cont"))}</button>`);
        const buttons = [...document.querySelectorAll("#opts .opt")];
        buttons.forEach((b) => b.addEventListener("click", async () => {
          buttons.forEach((x) => (x.disabled = true));
          try {
            const r = await api("/api/play/answer", { token: me.token, questionId: q.id, chosen: Number(b.dataset.i) });
            buttons[r.answer]?.classList.add("right");
            if (!r.correct) b.classList.add("wrong");
            me.gems = r.gems; $("gems").textContent = "💎 " + me.gems;
            $("qres").innerHTML = r.correct ? `<span class="ok">${esc(T("correct"))}</span>` : `<span class="error">${esc(T("wrongAns", { l: String.fromCharCode(65 + r.answer) }))}</span>`;
          } catch (e) { $("qres").textContent = e.message; }
          $("qnext").classList.remove("hidden"); $("qnext").focus();
        }));
        $("qnext").addEventListener("click", resolve);
      });
    }
    closeModal();
  }
  function winModal(stars, used) {
    const last = levelIndex === levels.length - 1;
    modal(`<h2 style="text-align:center;color:var(--yellow)">${esc(T("winTitle", { n: levelIndex + 1 }))}</h2><div class="bigstars">${starsHtml(stars)}</div>
      <p style="text-align:center"><b>${esc(T(me.track === "blocks" ? "usedBlocks" : "usedLines", { n: used }))}</b> ${esc(stars < 3 ? T("for3", { p: level.par }) : T("perfect"))}</p>
      <p style="text-align:center" class="muted">${last ? esc(T("allDone")) : ""}</p>
      <div class="row" style="justify-content:center"><button id="again" class="btn ghost">${esc(T("again"))}</button>${last ? `<button id="tomap" class="btn">${esc(T("allLevels"))}</button>` : `<button id="next" class="btn">${esc(T("next"))}</button>`}</div>`);
    $("again").addEventListener("click", () => { closeModal(); stopRun(); intro(); });
    $("next")?.addEventListener("click", () => { closeModal(); openLevel(levelIndex + 1); });
    $("tomap")?.addEventListener("click", () => { closeModal(); stopRun(); showMap(); });
  }

  window.addEventListener("resize", () => { if (workspace && me?.track === "blocks") Blockly.svgResize(workspace); });

  // ---------- boot ----------
  (async () => {
    const token = store.get("bq_token");
    const urlCode = new URLSearchParams(location.search).get("code");
    if (token && (!urlCode || urlCode.toUpperCase() === store.get("bq_code"))) {
      try { me = await api("/api/play/state?token=" + token); return enter(); } catch { store.del("bq_token"); }
    }
    showJoin();
  })();
})();
