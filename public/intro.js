// Animated, narrated intro shown before each level.
// Three scenes, one per narration line: (1) title + close-up of Bolt, (2) the map and the goal, (3) the new idea.
// Narration audio is looked up at /vo/<lang>/<levelId>_<n>.m4a. If a file is missing or sound is off, the
// captions still play on a timer, so the intro always works.
(function () {
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const BLOCK_COLORS = [[/^when run/, "#b8963a"], [/^(move|turn)/, "#4a8fc7"], [/^(mine|place)/, "#c7623a"], [/^repeat/, "#4aa35a"], [/^if/, "#9a55c4"]];
  const muted = () => { try { return localStorage.getItem("bq_mute") === "1"; } catch { return false; } };
  let active = null;

  function demoHtml(level, track) {
    const demo = window.LESSONS?.[level.id]?.demo;
    if (!demo) return "";
    if (track === "blocks") {
      return demo.map((line, i) => {
        const indent = line.match(/^ */)[0].length / 2, text = line.trim();
        const color = (BLOCK_COLORS.find(([re]) => re.test(text)) || [0, "#4a8fc7"])[1];
        return `<div class="i-block" style="margin-left:${indent * 22}px;background:${color};animation-delay:${0.35 + i * 0.28}s">${esc(text)}</div>`;
      }).join("");
    }
    return `<pre class="i-py">${demo.split("\n").map((l, i) => `<span style="animation-delay:${0.35 + i * 0.3}s">${esc(l) || " "}</span>`).join("\n")}</pre>`;
  }

  function markers(level) {
    const out = [], need = level.goal.collect || {};
    const add = (x, y, cls) => out.push(`<i class="i-mark ${cls}" style="left:${x * 12.5}%;top:${y * 12.5}%"></i>`);
    level.grid.forEach((row, y) => [...row].forEach((ch, x) => {
      if (ch === "F") add(x, y, "goal");
      else if (need.gem && (ch === "*" || ch === "O")) add(x, y, "item");
    }));
    add(level.start[0], level.start[1], "me");
    return out.join("");
  }

  function play(level, index, track, goalText) {
    close();
    const T = window.I18N.t, lang = window.I18N.lang;
    const lesson = window.LESSONS?.[level.id];
    const lines = (lang === "ar" ? lesson?.ar?.vo : lesson?.en) || [window.I18N.lv(level, "story")];
    const el = document.createElement("div");
    el.className = "intro";
    el.innerHTML = `
      <div class="intro-box">
        <div class="intro-stage s0" style="--hx:${level.start[0] * 12.5 + 6.25}%;--hy:${level.start[1] * 12.5 + 6.25}%">
          <div class="i-sky"></div>
          <div class="i-head"><span class="i-badge">${esc(T("level", { n: index + 1 }))}</span><h2>${esc(window.I18N.lv(level, "title"))}</h2></div>
          <div class="i-world"><div class="i-zoom"><canvas width="480" height="480"></canvas>${markers(level)}</div></div>
          <div class="i-card i-goal"><h3>🎯 ${esc(T("yourGoal"))}</h3><p>${esc(goalText)}</p></div>
          <div class="i-card i-idea"><h3>💡 ${esc(T("newIdea"))}</h3><div class="i-demo">${demoHtml(level, track)}</div></div>
        </div>
        <div class="intro-cap" aria-live="polite"></div>
        <div class="intro-bar">
          <span class="i-dots">${lines.map(() => "<i></i>").join("")}</span><span class="spacer"></span>
          <button class="btn ghost small" data-a="sound"></button>
          <button class="btn ghost small" data-a="replay">${esc(T("replay"))}</button>
          <button class="btn small" data-a="go">${esc(T("skip"))}</button>
        </div>
      </div>`;
    document.body.appendChild(el);
    const stage = el.querySelector(".intro-stage"), cap = el.querySelector(".intro-cap"), dots = [...el.querySelectorAll(".i-dots i")];
    const renderer = new BQ.Renderer(el.querySelector("canvas"));
    renderer.load(level);
    const state = { el, renderer, audio: null, timer: null, run: 0, resolve: null };
    active = state;
    const soundBtn = el.querySelector('[data-a="sound"]');
    const paintSound = () => { soundBtn.textContent = T(muted() ? "soundOff" : "soundOn"); };
    paintSound();

    function stopSound() { clearTimeout(state.timer); if (state.audio) { state.audio.onended = state.audio.onerror = null; state.audio.pause(); state.audio = null; } }
    function scene(i, run) {
      if (run !== state.run || active !== state) return;
      if (i >= lines.length) { el.querySelector('[data-a="go"]').textContent = T("play"); el.querySelector('[data-a="go"]').classList.add("pulse"); return; }
      stage.className = "intro-stage s" + Math.min(i, 2);
      dots.forEach((d, n) => d.classList.toggle("on", n <= i));
      cap.textContent = lines[i];
      cap.classList.remove("in"); void cap.offsetWidth; cap.classList.add("in");
      const next = () => { stopSound(); state.timer = setTimeout(() => scene(i + 1, run), 450); };
      const byTimer = () => { stopSound(); state.timer = setTimeout(() => scene(i + 1, run), Math.max(2600, lines[i].length * 70)); };
      stopSound();
      if (muted()) return byTimer();
      const a = new Audio(`/vo/${lang}/${level.id}_${i + 1}.m4a`);
      state.audio = a;
      a.onended = next; a.onerror = byTimer;
      a.play().catch(() => { if (state.audio === a) byTimer(); });
    }
    function start() { state.run++; el.querySelector('[data-a="go"]').textContent = T("skip"); el.querySelector('[data-a="go"]').classList.remove("pulse"); scene(0, state.run); }
    el.addEventListener("click", (e) => {
      const a = e.target.closest("[data-a]")?.dataset.a;
      if (a === "go") close();
      else if (a === "replay") start();
      else if (a === "sound") { try { localStorage.setItem("bq_mute", muted() ? "0" : "1"); } catch {} paintSound(); start(); }
    });
    state.onKey = (e) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", state.onKey);
    start();
    return new Promise((resolve) => { state.resolve = resolve; });
  }

  function close() {
    const s = active;
    if (!s) return;
    active = null;
    clearTimeout(s.timer);
    if (s.audio) { s.audio.onended = s.audio.onerror = null; s.audio.pause(); }
    cancelAnimationFrame(s.renderer.raf);
    document.removeEventListener("keydown", s.onKey);
    s.el.remove();
    s.resolve && s.resolve();
  }

  window.BQ.Intro = { play, close };
})();
