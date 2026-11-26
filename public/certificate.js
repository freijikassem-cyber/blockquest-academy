// Printable certificate for a finished stage (or the AI Lab). Opened as /certificate#PROGRESSCODE/STAGE
(function () {
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const T = (k, v) => I18N.t(k, v);
  const [key, which] = location.hash.slice(1).split("/");
  let data = null;
  const L = (o) => (o && typeof o === "object" ? o[I18N.lang] || o.en : o);
  function render() {
    const box = document.getElementById("cert");
    if (!data) return;
    const c = window.COURSES.find((x) => String(x.n) === which);
    // a course certificate needs every level, unit project, unit quiz and the final project
    const ids = which === "ai" ? window.AI_LEVELS.map((a) => a.id)
      : c ? [...c.units.flatMap((u) => [...u.levels, u.project, u.quiz]), c.final] : [];
    const best = {}, when = {};
    for (const tr of Object.values(data.tracks)) for (const [id, l] of Object.entries(tr.levels)) { best[id] = Math.max(best[id] || 0, l.stars || 0); if (l.at && l.stars) when[id] = l.at; }
    if (!ids.length || ids.some((id) => !best[id])) { box.innerHTML = `<div class="card"><h2>${esc(T("certNotYet"))}</h2></div>`; return; }
    const stars = ids.reduce((n, id) => n + best[id], 0);
    const stageName = which === "ai" ? T("stageAI") : `${L(c.name)} (${T("gradesTag", { g: c.grades }).toLowerCase()})`;
    const date = (c ? when[c.final] : Object.values(when).sort().pop() || "").slice(0, 10);
    const no = `BQ-${key}-${which}`.toUpperCase();
    const url = `${location.origin}/certificate#${key}/${which}`;
    box.innerHTML = `<div class="cert">
      <div class="bolt">🤖🏆</div>
      <h1>${esc(T("certTitle"))}</h1>
      <div>${esc(T("certThis"))}</div>
      <div class="who" dir="auto">${esc(data.name)}</div>
      <p style="font-size:18px">${esc(T("certDid", { stage: stageName }))}</p>
      <div class="stars">${"★".repeat(Math.max(1, Math.round((stars / (ids.length * 3)) * 5)))}</div>
      <div dir="auto">${esc(T("certStars", { n: stars, m: ids.length * 3 }))}</div>
      <div class="meta">
        <div>${esc(T("certClass"))}<b dir="auto">${esc(data.bankTitle)}</b>${data.teacher ? `<span class="muted-dark">${esc(T("certTeacher"))}: ${esc(data.teacher)}</span>` : ""}</div>
        <div>${esc(T("certDate"))}<b dir="ltr">${esc(date)}</b></div>
        <div class="sign"><img src="/signature.png" alt="" onerror="this.remove()"><span class="sig-script">Kassem Freiji</span><span class="sig-line"></span><b>Kassem Freiji</b><span class="muted-dark">${esc(T("certSigned"))} · BlockQuest Academy</span></div>
      </div>
      <p style="margin-top:22px;font-size:12px;color:#6b7290" dir="ltr">${esc(T("certNo"))} ${esc(no)} · ${esc(T("certVerify"))} ${esc(url)}</p></div>`;
    // if a real signature image exists, it replaces the script-font signature
    const img = box.querySelector(".sign img");
    if (img) img.addEventListener("load", () => box.querySelector(".sig-script")?.remove());
  }
  document.getElementById("print").addEventListener("click", () => window.print());
  I18N.onChange(render);
  fetch("/api/progress?key=" + encodeURIComponent(key || "")).then((r) => (r.ok ? r.json() : null)).then((d) => {
    data = d;
    if (!d) document.getElementById("cert").innerHTML = `<div class="card"><h2>${esc(T("pBad"))}</h2></div>`;
    render();
  });
})();
