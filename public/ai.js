// AI Lab: students teach Bolt to tell things apart by giving it labelled examples, then test it.
// Bolt "learns" with nearest-neighbour matching: a new thing gets the label of the most similar example.
// Each item has a few simple features (numbers between 0 and 1), e.g. [colour, shape].
(function () {
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const L = (o) => (o && typeof o === "object" ? o[window.I18N.lang] || o.en : o);
  const it = (e, k, f, tint) => ({ e, k, f, tint });

  // colour scale used in features: red 0, orange .25, yellow .45, green .75, brown .9
  window.AI_LEVELS = [
    {
      id: "a1", mode: "label", need: 1,
      title: { en: "Fruit Sorter", ar: "مُصنِّف الفواكه" },
      story: { en: "Bolt has never seen fruit! Teach him: press the basket under a fruit to show which kind it is. Then press Test to see if Bolt learned.",
        ar: "بولت لم يرَ الفواكه من قبل! علِّمه: اضغط على السلة تحت كل فاكهة لتريه نوعها. ثم اضغط اختبار لترى هل تعلَّم." },
      tip: { en: "Bolt needs at least one example of each fruit before he can tell them apart.", ar: "يحتاج بولت إلى مثال واحد على الأقل من كل فاكهة قبل أن يميّز بينهما." },
      classes: [{ k: "apple", e: "🍎", n: { en: "Apple", ar: "تفاحة" } }, { k: "banana", e: "🍌", n: { en: "Banana", ar: "موزة" } }],
      pool: [it("🍎", "apple", [0, 0]), it("🍌", "banana", [0.45, 1]), it("🍎", "apple", [0.05, 0.1]), it("🍌", "banana", [0.5, 0.95])],
      test: [it("🍌", "banana", [0.48, 0.9]), it("🍎", "apple", [0.02, 0.05]), it("🍎", "apple", [0.08, 0]), it("🍌", "banana", [0.42, 1])],
    },
    {
      id: "a2", mode: "label", need: 0.85,
      title: { en: "More Examples", ar: "أمثلة أكثر" },
      story: { en: "Cats and dogs come in many shapes and colours. One example is not enough! Teach Bolt with different kinds so he can recognise new animals.",
        ar: "القطط والكلاب لها أشكال وألوان كثيرة. مثال واحد لا يكفي! علِّم بولت أنواعاً مختلفة ليتعرف على حيوانات جديدة." },
      tip: { en: "Bolt is confused by animals that look different from your examples. Teach him more kinds: big, small, light and dark.",
        ar: "يرتبك بولت أمام الحيوانات التي تختلف عن أمثلتك. علِّمه أنواعاً أكثر: كبيرة وصغيرة، فاتحة وداكنة." },
      // features: [pointy ears, size, darkness]
      classes: [{ k: "cat", e: "🐱", n: { en: "Cat", ar: "قطة" } }, { k: "dog", e: "🐶", n: { en: "Dog", ar: "كلب" } }],
      pool: [it("🐱", "cat", [0.9, 0.2, 0.2]), it("🐶", "dog", [0.3, 0.5, 0.3]), it("🐈", "cat", [0.85, 0.35, 0.5]), it("🐕", "dog", [0.8, 0.2, 0.45], "saturate(0.6)"),
        it("🐈‍⬛", "cat", [0.9, 0.3, 1]), it("🐩", "dog", [0.1, 0.4, 0.1]), it("🦮", "dog", [0.5, 0.95, 0.5]), it("🐈", "cat", [0.75, 0.6, 0.6], "grayscale(1) brightness(1.3)")],
      test: [it("🐈‍⬛", "cat", [0.9, 0.35, 0.95]), it("🐕", "dog", [0.82, 0.22, 0.5], "saturate(0.6)"), it("🐩", "dog", [0.15, 0.45, 0.1]), it("🐱", "cat", [0.88, 0.2, 0.25]),
        it("🦮", "dog", [0.45, 0.9, 0.55]), it("🐈", "cat", [0.75, 0.55, 0.65], "grayscale(1) brightness(1.3)"), it("🐶", "dog", [0.3, 0.55, 0.3])],
    },
    {
      id: "a3", mode: "label", need: 1,
      title: { en: "Fair Data", ar: "بيانات عادلة" },
      story: { en: "Someone already trained Bolt, but only with RED apples. Press Test and see what happens with green apples. Then fix it!",
        ar: "درَّب أحدهم بولت من قبل، لكن على تفاح أحمر فقط. اضغط اختبار وانظر ماذا يحدث مع التفاح الأخضر. ثم أصلح الأمر!" },
      tip: { en: "Bolt thinks green apples are lemons because he never saw a green apple. Data must include ALL kinds of apples. Add green apples to the apple basket.",
        ar: "يظن بولت أن التفاح الأخضر ليمون لأنه لم يرَ تفاحاً أخضر أبداً. يجب أن تشمل البيانات كل أنواع التفاح. أضف تفاحاً أخضر إلى سلة التفاح." },
      // features: [colour, roundness]
      classes: [{ k: "apple", e: "🍎", n: { en: "Apple", ar: "تفاحة" } }, { k: "lemon", e: "🍋", n: { en: "Lemon", ar: "ليمونة" } }],
      preset: [it("🍎", "apple", [0, 1]), it("🍎", "apple", [0.05, 0.95]), it("🍎", "apple", [0.02, 1]), it("🍋", "lemon", [0.5, 0.7]), it("🍋", "lemon", [0.45, 0.75])],
      pool: [it("🍏", "apple", [0.75, 1]), it("🍋", "lemon", [0.48, 0.7]), it("🍏", "apple", [0.7, 0.95]), it("🍎", "apple", [0.03, 0.98])],
      test: [it("🍎", "apple", [0.04, 1]), it("🍏", "apple", [0.78, 0.98]), it("🍋", "lemon", [0.47, 0.72]), it("🍏", "apple", [0.72, 1]), it("🍋", "lemon", [0.52, 0.68])],
    },
    {
      id: "a4", mode: "label", need: 1,
      title: { en: "Safe or Danger?", ar: "آمن أم خطر؟" },
      story: { en: "Bolt wants to explore new lands. Teach him which ground is safe to walk on and which is dangerous, so he can decide by himself.",
        ar: "يريد بولت أن يستكشف أراضي جديدة. علِّمه أي أرض آمنة للمشي وأيها خطرة، ليقرر بنفسه." },
      tip: { en: "Hot things and deep water are dangerous for Bolt. Make sure he has seen examples of both.",
        ar: "الأشياء الساخنة والماء العميق خطرة على بولت. تأكد أنه رأى أمثلة على كليهما." },
      // features: [hot, wet, soft]
      classes: [{ k: "safe", e: "✅", n: { en: "Safe", ar: "آمن" } }, { k: "danger", e: "⚠️", n: { en: "Danger", ar: "خطر" } }],
      pool: [it("🌿", "safe", [0.2, 0.2, 0.3]), it("🌊", "danger", [0.1, 1, 0.9]), it("🔥", "danger", [1, 0, 0.5]), it("🏖️", "safe", [0.4, 0.1, 0.5]),
        it("🪨", "safe", [0.25, 0, 0]), it("💧", "danger", [0.1, 0.95, 1])],
      test: [it("🌋", "danger", [0.95, 0.05, 0.4]), it("🌾", "safe", [0.3, 0.15, 0.35]), it("🏝️", "safe", [0.45, 0.2, 0.45]), it("🌊", "danger", [0.05, 0.98, 0.95]), it("⛰️", "safe", [0.2, 0.05, 0.05])],
    },
    {
      id: "a5", mode: "fix", need: 1,
      title: { en: "Fix the Mistakes", ar: "أصلِح الأخطاء" },
      story: { en: "Oops! Someone put some fruit in the WRONG basket. Bolt learned the mistakes too. Tap a wrong example to move it to the right basket, then test again.",
        ar: "أوه! وضع أحدهم بعض الفواكه في السلة الخطأ. وبولت تعلَّم الأخطاء أيضاً. اضغط على المثال الخطأ لتنقله إلى السلة الصحيحة، ثم اختبر من جديد." },
      tip: { en: "Look carefully at each basket. Is every example really in its own basket? Wrong data teaches wrong answers.",
        ar: "انظر بعناية إلى كل سلة. هل كل مثال في سلته الصحيحة فعلاً؟ البيانات الخاطئة تعلِّم أجوبة خاطئة." },
      classes: [{ k: "grape", e: "🍇", n: { en: "Grapes", ar: "عنب" } }, { k: "orange", e: "🍊", n: { en: "Orange", ar: "برتقالة" } }],
      // features: [colour (purple 0 / orange 1), bunch]
      preset: [it("🍇", "grape", [0.05, 1]), it("🍊", "grape", [0.95, 0.05]), it("🍇", "grape", [0, 0.95]), it("🍊", "orange", [1, 0]), it("🍇", "orange", [0.1, 0.9]), it("🍊", "orange", [0.9, 0.1])],
      pool: [],
      test: [it("🍇", "grape", [0.08, 0.98]), it("🍊", "orange", [0.97, 0.02]), it("🍇", "grape", [0.02, 0.9]), it("🍊", "orange", [0.92, 0.08])],
    },
  ];

  const UI = {
    en: { test: "🤖 Test Bolt", close: "✕", teach: "Bolt's examples", pool: "Show Bolt these", tests: "New things Bolt has never seen", empty: "No examples yet",
      noData: "Teach Bolt at least one example of each kind first!", score: "Bolt got {a} of {b} right ({p}%).", pass: "Great teaching! Bolt learned it. 🎉", finish: "Finish ▶",
      again: "Not quite yet.", tapFix: "Tap an example to move it to the other basket.", thinking: "Bolt is thinking…", reset: "Start over", lesson: "What you learned" },
    ar: { test: "🤖 اختبر بولت", close: "✕", teach: "أمثلة بولت", pool: "اعرض على بولت", tests: "أشياء جديدة لم يرها بولت من قبل", empty: "لا توجد أمثلة بعد",
      noData: "علِّم بولت مثالاً واحداً على الأقل من كل نوع أولاً!", score: "أجاب بولت إجابة صحيحة عن {a} من {b} ({p}%).", pass: "تعليم رائع! تعلَّم بولت. 🎉", finish: "إنهاء ◀",
      again: "ليس بعد.", tapFix: "اضغط على مثال لتنقله إلى السلة الأخرى.", thinking: "بولت يفكر…", reset: "ابدأ من جديد", lesson: "ماذا تعلمت" },
  };
  const LESSON = {
    a1: { en: "AI learns from examples. Each example has a label (the right answer).", ar: "الذكاء الاصطناعي يتعلم من الأمثلة. لكل مثال تسمية (الجواب الصحيح)." },
    a2: { en: "More, and more different, examples help AI recognise things it has never seen.", ar: "الأمثلة الأكثر والأكثر تنوعاً تساعد الذكاء الاصطناعي على التعرف على أشياء لم يرها من قبل." },
    a3: { en: "If the data leaves some kinds out, the AI is unfair to them. This is called bias.", ar: "إذا أهملت البيانات بعض الأنواع، يصبح الذكاء الاصطناعي غير عادل معها. هذا يسمى التحيّز." },
    a4: { en: "A trained AI can make its own decisions about new things, but only as well as it was taught.", ar: "الذكاء الاصطناعي المدرَّب يتخذ قراراته بنفسه في أشياء جديدة، لكن بقدر جودة تعليمه فقط." },
    a5: { en: "Wrong labels teach wrong answers. People must check the data an AI learns from.", ar: "التسميات الخاطئة تعلِّم أجوبة خاطئة. يجب على الناس التحقق من البيانات التي يتعلم منها الذكاء الاصطناعي." },
  };
  const u = (k, v) => { let s = UI[window.I18N.lang]?.[k] || UI.en[k]; if (v) for (const x in v) s = s.split("{" + x + "}").join(v[x]); return s; };

  function predict(train, f) {
    let best = null, bd = Infinity;
    for (const ex of train) { const d = ex.f.reduce((s, v, i) => s + (v - f[i]) ** 2, 0); if (d < bd) { bd = d; best = ex; } }
    return best?.label;
  }
  const card = (x, extra = "") => `<span class="ai-card" ${extra}><span style="${x.tint ? `filter:${x.tint}` : ""}">${x.e}</span></span>`;

  function open(lv, index, onWin, onClose) {
    const state = { train: (lv.preset || []).map((x) => ({ ...x, label: x.k })), pool: lv.pool.map((x, i) => ({ ...x, i })), tested: null, passed: false };
    const el = document.createElement("div");
    el.className = "ai-lab";
    document.body.appendChild(el);
    const close = () => { el.remove(); onClose(); };
    function render() {
      const ex = (c) => state.train.map((x, i) => ({ x, i })).filter((o) => o.x.label === c.k);
      el.innerHTML = `<div class="ai-box card">
        <div class="row"><span class="i-badge">AI ${index + 1}</span><h2 style="margin:0">${esc(L(lv.title))}</h2><span class="spacer"></span><button class="btn ghost small" data-a="close">${u("close")}</button></div>
        <p>${esc(L(lv.story))}</p>
        <h3>${esc(u("teach"))}${lv.mode === "fix" ? ` · <span class="muted">${esc(u("tapFix"))}</span>` : ""}</h3>
        <div class="ai-baskets">${lv.classes.map((c) => `<div class="ai-basket"><div class="ai-bh">${c.e} ${esc(L(c.n))}</div><div class="ai-items">${ex(c).map((o) => card(o.x, `data-t="${o.i}" role="button" tabindex="0"`)).join("") || `<span class="muted">${esc(u("empty"))}</span>`}</div></div>`).join("")}</div>
        ${state.pool.length ? `<h3>${esc(u("pool"))}</h3><div class="ai-pool">${state.pool.map((x, j) => `<div class="ai-pick">${card(x)}<div>${lv.classes.map((c) => `<button class="btn ghost small" data-p="${j}" data-c="${c.k}" aria-label="${esc(L(c.n))}">${c.e}</button>`).join("")}</div></div>`).join("")}</div>` : ""}
        <div class="row" style="margin-top:14px"><button class="btn teal" data-a="test">${esc(u("test"))}</button><button class="btn ghost small" data-a="reset">${esc(u("reset"))}</button></div>
        <h3 style="margin-top:14px">${esc(u("tests"))}</h3>
        <div class="ai-tests">${lv.test.map((x, i) => { const r = state.tested?.[i]; const cls = r ? lv.classes.find((c) => c.k === r) : null;
          return `<div class="ai-test ${r ? (r === x.k ? "ok" : "bad") : ""}">${card(x)}<div class="ai-guess">${r ? `${cls?.e || "?"} ${r === x.k ? "✓" : "✗"}` : "?"}</div></div>`; }).join("")}</div>
        <div class="bubble" id="aiMsg" style="margin-top:12px"></div>
      </div>`;
      el.querySelector('[data-a="close"]').onclick = close;
      el.querySelector('[data-a="reset"]').onclick = () => { state.train = (lv.preset || []).map((x) => ({ ...x, label: x.k })); state.pool = lv.pool.map((x, i) => ({ ...x, i })); state.tested = null; render(); };
      el.querySelectorAll("[data-p]").forEach((b) => b.onclick = () => {
        const x = state.pool.splice(Number(b.dataset.p), 1)[0];
        state.train.push({ ...x, label: b.dataset.c }); state.tested = null; render();
      });
      el.querySelectorAll("[data-t]").forEach((b) => b.onclick = () => {
        const x = state.train[Number(b.dataset.t)];
        if (lv.mode === "fix") { const other = lv.classes.find((c) => c.k !== x.label); x.label = other.k; }
        else { state.train.splice(Number(b.dataset.t), 1); if (lv.pool.some((p) => p.e === x.e && p.f === x.f)) state.pool.push(x); }
        state.tested = null; render();
      });
      el.querySelector('[data-a="test"]').onclick = runTest;
    }
    function msg(html, mood) { const m = el.querySelector("#aiMsg"); m.className = "bubble " + (mood || ""); m.innerHTML = html; }
    async function runTest() {
      if (!lv.classes.every((c) => state.train.some((x) => x.label === c.k))) return msg(esc(u("noData")), "bad");
      state.tested = []; render(); msg(esc(u("thinking")));
      for (let i = 0; i < lv.test.length; i++) { await new Promise((r) => setTimeout(r, 280)); state.tested[i] = predict(state.train, lv.test[i].f); render(); msg(esc(u("thinking"))); }
      const right = lv.test.filter((x, i) => state.tested[i] === x.k).length, acc = right / lv.test.length;
      const score = esc(u("score", { a: right, b: lv.test.length, p: Math.round(acc * 100) }));
      if (acc >= lv.need) {
        const stars = acc === 1 ? 3 : 2;
        await onWin(stars);
        msg(`${score}<br><b>${esc(u("pass"))}</b><div class="goal">💡 ${esc(u("lesson"))}: ${esc(L(LESSON[lv.id]))}</div><div style="margin-top:8px"><button class="btn" data-a="finish">${esc(u("finish"))}</button></div>`, "good");
        el.querySelector('[data-a="finish"]').onclick = close;
      } else msg(`${score} ${esc(u("again"))}<div class="goal">💡 ${esc(L(lv.tip))}</div>`, "bad");
    }
    render();
    el.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); if ((e.key === "Enter" || e.key === " ") && e.target.dataset?.t !== undefined) e.target.click(); });
  }

  window.BQ = window.BQ || {};
  window.BQ.AI = { open, title: (lv) => L(lv.title), lesson: (id) => L(LESSON[id]) };
})();
