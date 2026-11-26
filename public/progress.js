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
    const levelCell = (l, i, p) => {
      starSum += p.stars;
      const stuck = !p.stars && p.fails >= 5;
      return `<div class="plevel ${p.stars ? "done" : stuck ? "stuck" : ""}" ${stuck ? `title="${esc(T("pNeedsHelp"))}"` : ""}>
          <b>${i + 1}. ${esc(l.ai ? BQ.AI.title(l) : I18N.lv(l, "title"))}</b>
          <div class="stars">${p.stars ? stars(p.stars) : `<span class="muted">${esc(p.runs ? "…" : T("pNever"))}</span>`}</div>
          <div class="muted">${p.runs ? esc(T("pTry", { n: p.runs })) : ""}${stuck ? " ⚠️" : ""}</div></div>`;
    };
    const section = (title, list, get, certId, started) => {
      total += list.length;
      if (!started) return `<div class="card" style="margin-top:14px"><h3>${esc(title)}</h3><p class="muted" style="margin:0">${esc(T("pNotStarted"))}</p></div>`;
      const n = list.filter((l) => get(l).stars).length;
      done += n;
      return `<div class="card" style="margin-top:14px"><div class="row"><h3 style="margin:0">${esc(title)} · <span dir="ltr">${n} / ${list.length}</span></h3><span class="spacer"></span>${n === list.length ? `<a class="btn small" href="/certificate#${key}/${certId}">${esc(T("cert"))}</a>` : ""}</div>
        <div class="pbar"><b style="width:${Math.round((n / list.length) * 100)}%"></b></div><div class="plevels">${list.map((l, i) => levelCell(l, i, get(l))).join("")}</div></div>`;
    };
    const blank = { stars: 0, runs: 0, fails: 0 };
    const L = (o) => (o && typeof o === "object" ? o[I18N.lang] || o.en : o);
    const byId = (id) => [...window.LEVELS.blocks, ...window.LEVELS.python].find((l) => l.id === id);
    const counted = new Set();
    let sections = window.COURSES.map((c) => {
      const tr = data.tracks[c.track];
      if (tr && !counted.has(c.track)) { gems += tr.gems; counted.add(c.track); }
      const list = [...c.units.flatMap((u, ui) => [...u.levels.map(byId), byId(u.project), { id: u.quiz, title: `${T("unitQuiz")} ${ui + 1}` }]), byId(c.final)];
      return section(`${L(c.name)} · ${T("gradesTag", { g: c.grades }).toLowerCase()}`, list, (l) => tr?.levels[l.id] || blank, c.n, !!tr && list.some((l) => tr.levels[l.id]));
    }).join("");
    // AI Lab results can be saved on either track record: take the best
    const aiBest = (l) => Object.values(data.tracks).map((tr) => tr.levels[l.id]).filter(Boolean).sort((a, b) => (b.stars || 0) - (a.stars || 0))[0] || blank;
    const aiList = (window.AI_LEVELS || []).map((a) => ({ ...a, ai: true }));
    sections += section("🤖 " + T("pTrackAI"), aiList, aiBest, "ai", aiList.some((l) => aiBest(l).stars || aiBest(l).runs));
    const link = location.origin + "/progress#" + key;
    $("report").innerHTML = `
      <div class="card">
        <h1 style="margin-bottom:6px">${esc(T("pFor", { name: data.name }))}</h1>
        <div class="muted">${esc(T("pClass", { c: data.bankTitle }))}${data.teacher ? " · " + esc(T("pTeacher", { t: data.teacher })) : ""}${data.lastSeen ? " · " + esc(T("pLast", { d: "" })) + `<span dir="ltr">${esc(data.lastSeen.slice(0, 10))}</span>`  : ""}</div>
        <div class="stats">
          <div class="stat"><b>${done} / ${total}</b>${esc(T("pLevels"))}</div>
          <div class="stat"><b>${starSum} ★</b>${esc(T("pStars"))}</div>
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
