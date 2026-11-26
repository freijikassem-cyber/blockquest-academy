// Printable certificate for a finished stage (or the AI Lab). Opened as /certificate#PROGRESSCODE/STAGE
(function () {
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const T = (k, v) => I18N.t(k, v);
  const [key, which] = location.hash.slice(1).split("/");
  let data = null;
  function render() {
    const box = document.getElementById("cert");
    if (!data) return;
    const st = window.STAGES.find((s) => String(s.n) === which);
    const levels = which === "ai" ? window.AI_LEVELS : st ? window.LEVELS[st.track].filter((l) => l.stage === st.n) : [];
    const best = {};
    for (const tr of Object.values(data.tracks)) for (const [id, l] of Object.entries(tr.levels)) best[id] = Math.max(best[id] || 0, l.stars || 0);
    const stars = levels.reduce((n, l) => n + (best[l.id] || 0), 0);
    if (!levels.length || levels.some((l) => !best[l.id])) { box.innerHTML = `<div class="card"><h2>${esc(T("certNotYet"))}</h2></div>`; return; }
    const stageName = which === "ai" ? T("stageAI") : T("stage", { n: st.n, g: st.grades });
    const dates = Object.values(data.tracks).flatMap((tr) => levels.map((l) => tr.levels[l.id]?.at)).filter(Boolean).sort();
    const date = (dates[dates.length - 1] || "").slice(0, 10);
    box.innerHTML = `<div class="cert">
      <div class="bolt">🤖🏆</div>
      <h1>${esc(T("certTitle"))}</h1>
      <div>${esc(T("certThis"))}</div>
      <div class="who" dir="auto">${esc(data.name)}</div>
      <p style="font-size:18px">${esc(T("certDid", { stage: stageName }))}</p>
      <div class="stars">${"★".repeat(Math.round((stars / (levels.length * 3)) * 5))}</div>
      <div dir="auto">${esc(T("certStars", { n: stars, m: levels.length * 3 }))}</div>
      <div class="meta"><div>${esc(T("certClass"))}<b dir="auto">${esc(data.bankTitle)}</b></div><div>${esc(T("certTeacher"))}<b dir="auto">${esc(data.teacher || "—")}</b></div><div>${esc(T("certDate"))}<b dir="ltr">${esc(date)}</b></div></div>
      <p style="margin-top:28px;font-size:12px;color:#6b7290">BlockQuest Academy · Created by Kassem Freiji</p></div>`;
  }
  document.getElementById("print").addEventListener("click", () => window.print());
  I18N.onChange(render);
  fetch("/api/progress?key=" + encodeURIComponent(key || "")).then((r) => (r.ok ? r.json() : null)).then((d) => {
    data = d;
    if (!d) document.getElementById("cert").innerHTML = `<div class="card"><h2>${esc(T("pBad"))}</h2></div>`;
    render();
  });
})();
