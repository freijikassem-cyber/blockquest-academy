// Read-only progress report for a student and their parent. Opened with the 10-character progress code,
// which travels in the URL fragment (#CODE) so it is never sent to the server in a page address.
(function () {
  const $ = (id) => document.getElementById(id);
  const T = (k, v) => I18N.t(k, v);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const stars = (n) => "★".repeat(n) + "<i>" + "★".repeat(3 - n) + "</i>";
  let data = null, key = "";
  const isStudent = () => { try { return !!localStorage.getItem("bq_token"); } catch { return false; } };

  function render() {
    if (!data) return;
    const pct = data.answered ? Math.round((data.correct / data.answered) * 100) : null;
    let done = 0, total = 0, starSum = 0, gems = 0;
    const sections = ["blocks", "python"].map((track) => {
      const list = window.LEVELS[track], tr = data.tracks[track];
      total += list.length;
      if (!tr) return `<div class="card" style="margin-top:14px"><h3>${esc(T(track === "blocks" ? "pTrackBlocks" : "pTrackPython"))}</h3><p class="muted" style="margin:0">${esc(T("pNotStarted"))}</p></div>`;
      gems = Math.max(gems, 0) + tr.gems;
      const n = list.filter((l) => tr.levels[l.id]?.stars).length;
      done += n;
      const cells = list.map((l, i) => {
        const p = tr.levels[l.id] || { stars: 0, runs: 0, fails: 0 };
        starSum += p.stars;
        const stuck = !p.stars && p.fails >= 5;
        return `<div class="plevel ${p.stars ? "done" : stuck ? "stuck" : ""}" ${stuck ? `title="${esc(T("pNeedsHelp"))}"` : ""}>
          <b>${i + 1}. ${esc(I18N.lv(l, "title"))}</b>
          <div class="stars">${p.stars ? stars(p.stars) : `<span class="muted">${esc(p.runs ? "…" : T("pNever"))}</span>`}</div>
          <div class="muted">${p.runs ? esc(T("pTry", { n: p.runs })) : ""}${stuck ? " ⚠️" : ""}</div></div>`;
      }).join("");
      return `<div class="card" style="margin-top:14px"><h3>${esc(T(track === "blocks" ? "pTrackBlocks" : "pTrackPython"))} · <span dir="ltr">${n} / ${list.length}</span></h3>
        <div class="pbar"><b style="width:${Math.round((n / list.length) * 100)}%"></b></div><div class="plevels">${cells}</div></div>`;
    }).join("");
    const link = location.origin + "/progress#" + key;
    $("report").innerHTML = `
      <div class="card">
        <h1 style="margin-bottom:6px">${esc(T("pFor", { name: data.name }))}</h1>
        <div class="muted">${esc(T("pClass", { c: data.bankTitle }))}${data.teacher ? " · " + esc(T("pTeacher", { t: data.teacher })) : ""}${data.lastSeen ? " · " + esc(T("pLast", { d: "" })) + `<span dir="ltr">${esc(data.lastSeen.slice(0, 10))}</span>`  : ""}</div>
        <div class="stats">
          <div class="stat"><b>${done} / ${total}</b>${esc(T("pLevels"))}</div>
          <div class="stat"><b>${starSum} ★</b>${esc(T("pStars"))}</div>
          <div class="stat"><b>${pct === null ? "–" : pct + "%"}</b>${esc(T("pQuiz"))}${data.answered ? ` (${data.correct}/${data.answered})` : ""}</div>
          <div class="stat"><b>💎 ${gems}</b>${esc(T("pGems"))}</div>
        </div>
        ${isStudent() ? "" : `<div class="muted">${esc(T("pParentNote"))}</div>`}
      </div>
      ${sections}
      <div class="card" style="margin-top:14px"><h3>${esc(T("pShare"))}</h3><p>${esc(T("pShareText"))}</p>
        <div class="row"><span class="chip mono" style="letter-spacing:3px;direction:ltr">${esc(key)}</span><button id="copy" class="btn small">${esc(T("pCopy"))}</button><span id="copied" class="ok"></span></div></div>`;
    $("copy").addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(link); $("copied").textContent = T("pCopied"); } catch { prompt("", link); }
    });
  }

  async function load(k) {
    key = String(k || "").trim().toUpperCase();
    $("err").textContent = "";
    if (!key) { $("ask").classList.remove("hidden"); $("report").classList.add("hidden"); return; }
    const res = await fetch("/api/progress?key=" + encodeURIComponent(key));
    if (!res.ok) {
      data = null;
      $("ask").classList.remove("hidden"); $("report").classList.add("hidden");
      $("key").value = key; $("err").textContent = T("pBad");
      return;
    }
    data = await res.json();
    $("ask").classList.add("hidden"); $("report").classList.remove("hidden");
    if (location.hash.slice(1) !== key) history.replaceState(null, "", "#" + key);
    render();
  }
  $("open").addEventListener("click", () => load($("key").value));
  $("key").addEventListener("keydown", (e) => { if (e.key === "Enter") load($("key").value); });
  window.addEventListener("hashchange", () => load(location.hash.slice(1)));
  I18N.onChange(render);
  load(location.hash.slice(1));
})();
