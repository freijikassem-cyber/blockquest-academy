// Explanation language (English / Arabic). Code, block names and Python stay in English in both.
(function () {
  const S = {
    en: {
      langBtn: "العربية", levelsBtn: "Levels", leave: "Leave", myProgress: "My progress",
      joinTitle: "Join your class", joinSub: "Type the class code from your teacher, then pick your adventure.",
      classCode: "Class code", yourName: "Your name", chooseTrack: "Choose your track", start: "Start playing",
      tBlocksTag: "BEGINNERS · GRADES 4–7", tBlocksName: "Explorer", tBlocksText: "Snap coding blocks together to guide Bolt.",
      tPyTag: "PYTHON · UP TO GRADE 9", tPyName: "Coder", tPyText: "Learn real Python step by step, from the first line to functions.",
      mapBlocks: "Explorer missions", mapPython: "Coder missions", toPython: "Switch to Python", toBlocks: "Switch to Blocks",
      done: "{a} of {b} levels done", level: "Level {n}", run: "▶ Run", reset: "↺ Reset", hint: "Hint", fast: "Fast", watch: "🎬 Intro",
      workBlocks: "Workspace — drag blocks under “when run”", workPython: "Python editor", startOver: "Start over",
      counterBlocks: "{n} blocks · ★★★ at {p} or fewer", counterLines: "{n} lines · ★★★ at {p} or fewer",
      goal: "Goal", gCollect: "collect {n} {item}", gFlag: "reach the flag", and: " and ",
      wood: "wood", stone: "stone", gem: "gems",
      clearConfirm: "Clear your code for this level?", noBlocks: "Snap some blocks under “when run” first.",
      loopForever: "That loop never ends! Make sure Bolt moves toward the flag inside it.",
      battery: "Bolt did more than 300 actions and ran out of battery. Is there a loop that never ends?",
      complete: "Mission complete! 🎉",
      // mistake hints
      hWater: "Splash! Bolt walked into water at step {n}. Bolt can't swim.", hLava: "Ouch! Bolt walked into lava at step {n}.",
      hWaterFix: "Place a plank on the water BEFORE you move.", hLavaFix: "Place a stone on the lava BEFORE you move.", hAvoid: "Turn before you reach it and go around.",
      hBump: "Bolt bumped into {what} {n} time(s) and could not walk through.", hBumpMine: "Mine it first, then move.", hBumpTurn: "Turn before you reach it.",
      hBumpEdge: "Bolt walked into the edge of the world. That is too many steps in that direction.",
      hMineNothing: "Bolt tried to mine, but nothing was in front. Mine only works when the tree, rock or ore is on the very next tile.",
      hShort: "Bolt stopped {n} tile(s) away from the flag. Add more steps, or check your turns.",
      hPast: "Bolt is facing the wrong way to reach the flag. Check which way you turn: left or right?",
      hMissing: "Bolt still needs {what}.", hMore: "{n} more {item}",
      hTry: "Change your code and press Run again.", hLevelHint: "💡 Hint: {hint}", hWatch: "Still stuck? Press 🎬 Intro to watch the explanation again.",
      eName: "Python does not know the word “{w}” on line {n}. Check the spelling. Bolt's commands all start with hero. and use small letters.",
      eAttr: "Bolt has no command called “{w}” (line {n}). Look at the list of Bolt's commands and check the spelling.",
      eSyntax: "Python can't read line {n}. Look for a missing bracket ( ), a missing colon : at the end of for / if / while / def, or a missing quotation mark.",
      eIndent: "The spaces at the start of line {n} are wrong. Lines inside a loop, an if or a function need 4 spaces. Lines outside need none.",
      eType: "A command on line {n} got the wrong kind of value. Check what you put inside the brackets.",
      eTime: "Your program ran too long. Is there a while loop that never becomes False?",
      eOther: "Python stopped on line {n}: {m}",
      // quiz + win
      quizTitle: "Treasure question {a} of {b} · +10 💎", cont: "Continue", correct: "Correct! +10 💎", wrongAns: "Not quite — the answer is {l}.",
      winTitle: "Level {n} complete!", usedBlocks: "You used {n} blocks.", usedLines: "You used {n} lines.", perfect: "Perfect solution!",
      for3: "Solve it with {p} or fewer for 3 stars.", allDone: "You finished every mission on this track. Amazing work!",
      again: "Try again", next: "Next level ▶", allLevels: "All levels",
      refTitle: "Bolt's commands", ref1: "Walk 1 tile. hero.move(3) walks 3.", ref2: "Turn on the spot.", ref3: "Mine the tree, rock or ore ahead.",
      ref4: "Bridge water or lava ahead. Also \"stone\".", ref5: "What is in front: \"empty\", \"tree\", \"rock\", \"ore\", \"water\", \"lava\" or \"edge\".",
      ref6: "True if it is safe to walk forward.", ref7: "True when Bolt stands on the flag.", ref8: "How many \"gem\", \"wood\" or \"stone\" Bolt has.",
      // intro
      skip: "Skip ▶▶", play: "Start coding ▶", replay: "↺ Replay", newIdea: "New idea", yourGoal: "Your goal", soundOn: "🔊", soundOff: "🔇",
      // progress page
      pTitle: "Progress report", pFor: "Progress of {name}", pClass: "Class: {c}", pTeacher: "Teacher: {t}", pLast: "Last played: {d}",
      pLevels: "Levels done", pStars: "Stars", pQuiz: "Quiz score", pGems: "Gems", pTries: "Runs", pNever: "not started", pTry: "{n} runs",
      pShare: "For parents", pShareText: "Give this code or link to your parent. They can see your progress but cannot change anything.",
      pCopy: "Copy link", pCopied: "Copied!", pEnter: "Enter the progress code", pOpen: "Show progress", pBad: "That progress code doesn't work. Check it and try again.",
      pBack: "Back to the game", pParentNote: "You are viewing a read-only report.", pNotStarted: "This track has not been started yet.",
      pCodeLabel: "Progress code", pNeedsHelp: "Needs help: many runs without finishing", pTrackBlocks: "Explorer (blocks)", pTrackPython: "Coder (Python)",
    },
    ar: {
      langBtn: "English", levelsBtn: "المستويات", leave: "خروج", myProgress: "تقدّمي",
      joinTitle: "انضم إلى صفك", joinSub: "اكتب رمز الصف الذي أعطاك إياه معلمك ثم اختر مغامرتك.",
      classCode: "رمز الصف", yourName: "اسمك", chooseTrack: "اختر مسارك", start: "ابدأ اللعب",
      tBlocksTag: "للمبتدئين · الصفوف ٤–٧", tBlocksName: "المستكشف", tBlocksText: "ركّب قطع البرمجة لتقود بولت.",
      tPyTag: "بايثون · حتى الصف التاسع", tPyName: "المبرمج", tPyText: "تعلّم بايثون الحقيقية خطوة خطوة، من أول سطر حتى الدوال.",
      mapBlocks: "مهمات المستكشف", mapPython: "مهمات المبرمج", toPython: "انتقل إلى بايثون", toBlocks: "انتقل إلى القطع",
      done: "أنجزت {a} من {b} مستوى", level: "المستوى {n}", run: "▶ تشغيل", reset: "↺ إعادة", hint: "تلميح", fast: "سريع", watch: "🎬 الشرح",
      workBlocks: "مساحة العمل — اسحب القطع تحت “when run”", workPython: "محرر بايثون", startOver: "ابدأ من جديد",
      counterBlocks: "{n} قطعة · ★★★ عند {p} أو أقل", counterLines: "{n} سطر · ★★★ عند {p} أو أقل",
      goal: "الهدف", gCollect: "اجمع {n} من {item}", gFlag: "صِل إلى العلم", and: " و",
      wood: "الخشب", stone: "الحجارة", gem: "الجواهر",
      clearConfirm: "هل تريد مسح الكود في هذا المستوى؟", noBlocks: "ضع بعض القطع تحت “when run” أولاً.",
      loopForever: "هذه الحلقة لا تنتهي أبداً! تأكد أن بولت يتحرك نحو العلم داخلها.",
      battery: "نفّذ بولت أكثر من ٣٠٠ حركة وفرغت بطاريته. هل توجد حلقة لا تنتهي؟",
      complete: "أُنجزت المهمة! 🎉",
      hWater: "سقط بولت في الماء عند الخطوة {n}. بولت لا يستطيع السباحة.", hLava: "سقط بولت في الحمم عند الخطوة {n}.",
      hWaterFix: "ضع لوحاً (plank) على الماء قبل أن تتحرك.", hLavaFix: "ضع حجراً (stone) على الحمم قبل أن تتحرك.", hAvoid: "استدر قبل أن تصل إليه ودُر من حوله.",
      hBump: "اصطدم بولت بـ{what} {n} مرة ولم يستطع المرور.", hBumpMine: "استخدم mine أولاً ثم تحرك.", hBumpTurn: "استدر قبل أن تصل إليه.",
      hBumpEdge: "وصل بولت إلى حافة العالم. عدد الخطوات في هذا الاتجاه أكثر من اللازم.",
      hMineNothing: "حاول بولت أن يستخدم mine ولم يكن أمامه شيء. الأمر يعمل فقط عندما تكون الشجرة أو الصخرة أو الخام في المربع التالي مباشرة.",
      hShort: "توقف بولت على بُعد {n} مربع من العلم. أضف خطوات أو راجع الاستدارات.",
      hPast: "بولت ينظر في الاتجاه الخاطئ. راجع اتجاه الاستدارة: يسار أم يمين؟",
      hMissing: "ما زال بولت يحتاج: {what}.", hMore: "{n} من {item}",
      hTry: "عدّل الكود واضغط تشغيل مرة أخرى.", hLevelHint: "💡 تلميح: {hint}", hWatch: "ما زلت عالقاً؟ اضغط 🎬 الشرح لتشاهد الشرح مرة أخرى.",
      eName: "بايثون لا تعرف الكلمة “{w}” في السطر {n}. راجع الإملاء. كل أوامر بولت تبدأ بـ hero. وبأحرف صغيرة.",
      eAttr: "لا يوجد عند بولت أمر اسمه “{w}” (السطر {n}). انظر إلى قائمة أوامر بولت وراجع الإملاء.",
      eSyntax: "بايثون لا تستطيع قراءة السطر {n}. ابحث عن قوس ناقص ( ) أو نقطتين : ناقصتين في نهاية for أو if أو while أو def أو علامة تنصيص ناقصة.",
      eIndent: "المسافات في بداية السطر {n} غير صحيحة. الأسطر داخل الحلقة أو الشرط أو الدالة تحتاج ٤ مسافات، والأسطر خارجها لا تحتاج مسافات.",
      eType: "أحد الأوامر في السطر {n} حصل على قيمة من نوع خاطئ. راجع ما كتبته بين القوسين.",
      eTime: "استمر برنامجك وقتاً طويلاً جداً. هل توجد حلقة while لا يصبح شرطها False أبداً؟",
      eOther: "توقفت بايثون عند السطر {n}: {m}",
      quizTitle: "سؤال الكنز {a} من {b} · +10 💎", cont: "متابعة", correct: "إجابة صحيحة! +10 💎", wrongAns: "ليست صحيحة — الإجابة هي {l}.",
      winTitle: "أنهيت المستوى {n}!", usedBlocks: "استخدمت {n} قطعة.", usedLines: "استخدمت {n} سطراً.", perfect: "حل ممتاز!",
      for3: "حُلَّه بـ {p} أو أقل لتحصل على ٣ نجوم.", allDone: "أنهيت كل مهمات هذا المسار. عمل رائع!",
      again: "حاول مرة أخرى", next: "المستوى التالي ◀", allLevels: "كل المستويات",
      refTitle: "أوامر بولت", ref1: "يمشي مربعاً واحداً. hero.move(3) يمشي ٣ مربعات.", ref2: "يستدير في مكانه يساراً أو يميناً.", ref3: "يقطع الشجرة أو يكسر الصخرة أو يستخرج الخام الذي أمامه.",
      ref4: "يبني جسراً فوق الماء أو الحمم التي أمامه. يمكن أيضاً \"stone\".", ref5: "ماذا يوجد أمامي: \"empty\" أو \"tree\" أو \"rock\" أو \"ore\" أو \"water\" أو \"lava\" أو \"edge\".",
      ref6: "True إذا كان المشي للأمام آمناً.", ref7: "True عندما يقف بولت على العلم.", ref8: "كم معي من \"gem\" أو \"wood\" أو \"stone\".",
      skip: "تخطَّ ◀◀", play: "ابدأ البرمجة ◀", replay: "↺ أعد الشرح", newIdea: "فكرة جديدة", yourGoal: "هدفك", soundOn: "🔊", soundOff: "🔇",
      pTitle: "تقرير التقدّم", pFor: "تقدّم {name}", pClass: "الصف: {c}", pTeacher: "المعلم: {t}", pLast: "آخر لعب: {d}",
      pLevels: "المستويات المنجزة", pStars: "النجوم", pQuiz: "نتيجة الأسئلة", pGems: "الجواهر", pTries: "المحاولات", pNever: "لم يبدأ", pTry: "{n} محاولة",
      pShare: "لأولياء الأمور", pShareText: "أعطِ هذا الرمز أو الرابط لوليّ أمرك. يستطيع أن يرى تقدّمك لكنه لا يستطيع تغيير أي شيء.",
      pCopy: "انسخ الرابط", pCopied: "تم النسخ!", pEnter: "أدخل رمز التقدّم", pOpen: "اعرض التقدّم", pBad: "رمز التقدّم غير صحيح. راجعه وحاول مرة أخرى.",
      pBack: "العودة إلى اللعبة", pParentNote: "أنت تشاهد تقريراً للقراءة فقط.", pNotStarted: "لم يبدأ هذا المسار بعد.",
      pCodeLabel: "رمز التقدّم", pNeedsHelp: "يحتاج مساعدة: محاولات كثيرة دون إنهاء", pTrackBlocks: "المستكشف (القطع)", pTrackPython: "المبرمج (بايثون)",
    },
  };
  // ---- stages, picture passwords, certificates, AI Lab, My Projects
  Object.assign(S.en, {
    tBlocksTag: "BLOCKS · GRADES 1–6", tPyTag: "PYTHON · GRADES 7–9",
    stage: "Stage {n} · Grades {g}", stageAI: "AI Lab · All grades", cert: "🎓 Certificate",
    lockedByTeacher: "Your teacher will open this level soon.",
    picChoose: "Choose your secret picture", picChooseSub: "Remember it! You will tap the same picture every time you join.",
    picEnter: "Tap your secret picture", picBack: "← Back",
    pic_dog: "dog", pic_cat: "cat", pic_lion: "lion", pic_frog: "frog", pic_monkey: "monkey", pic_panda: "panda",
    pic_fox: "fox", pic_turtle: "turtle", pic_octopus: "octopus", pic_unicorn: "unicorn", pic_bee: "bee", pic_dolphin: "dolphin",
    aiSub: "Teach Bolt to recognise things by showing it examples, just like real artificial intelligence.",
    projTitle: "My Projects", projSub: "Build your own world, then program Bolt in it. Share the link with friends and family.",
    projNew: "+ New project", projEmpty: "No projects yet. Make your first world!", projOpen: "Open", projDelete: "Delete",
    projDeleteConfirm: "Delete this project? This can't be undone.", projName: "Project name", projDefault: "My world",
    projSave: "💾 Save", projSaved: "Saved!", projShare: "🔗 Share link", projCopied: "Link copied! Anyone with the link can watch your project.",
    projPaint: "Build your world", projBolt: "Bolt", projBoltTip: "Tap a square to put Bolt there. Tap Bolt again to turn him.",
    projIntro: "Pick a tile, then tap the map to build your world. Program Bolt and press Run!",
    projFinished: "Program finished! 🎉", projView: "A project by {a}. Press Run to watch it!", projNotFound: "This project link doesn't work.",
    projSaveFirst: "Save your project first.", projBack: "← My Projects",
    t_grass: "grass", t_sand: "sand", t_water: "water", t_lava: "lava", t_tree: "tree", t_rock: "rock", t_ore: "crystal ore", t_gem: "gem", t_flag: "flag",
    certTitle: "Certificate of Achievement", certThis: "This certificate is proudly given to", certDid: "for completing {stage} of BlockQuest Academy",
    certStars: "with {n} of {m} stars", certClass: "Class", certTeacher: "Teacher", certDate: "Date", certPrint: "🖨 Print or save as PDF",
    certNotYet: "This stage is not finished yet. Keep going!", certBack: "← Back",
    pTrackAI: "AI Lab", pStage: "Stage {n} · Grades {g}",
  });
  Object.assign(S.ar, {
    tBlocksTag: "القطع · الصفوف ١–٦", tPyTag: "بايثون · الصفوف ٧–٩",
    stage: "المرحلة {n} · الصفوف {g}", stageAI: "مختبر الذكاء الاصطناعي · لكل الصفوف", cert: "🎓 الشهادة",
    lockedByTeacher: "سيفتح معلمك هذا المستوى قريباً.",
    picChoose: "اختر صورتك السرية", picChooseSub: "تذكّرها! ستضغط على الصورة نفسها في كل مرة تدخل فيها.",
    picEnter: "اضغط على صورتك السرية", picBack: "→ رجوع",
    pic_dog: "كلب", pic_cat: "قطة", pic_lion: "أسد", pic_frog: "ضفدع", pic_monkey: "قرد", pic_panda: "باندا",
    pic_fox: "ثعلب", pic_turtle: "سلحفاة", pic_octopus: "أخطبوط", pic_unicorn: "حصان وحيد القرن", pic_bee: "نحلة", pic_dolphin: "دلفين",
    aiSub: "علِّم بولت أن يتعرف على الأشياء بعرض أمثلة عليه، تماماً مثل الذكاء الاصطناعي الحقيقي.",
    projTitle: "مشاريعي", projSub: "ابنِ عالمك الخاص، ثم برمج بولت فيه. شارك الرابط مع أصدقائك وعائلتك.",
    projNew: "+ مشروع جديد", projEmpty: "لا توجد مشاريع بعد. اصنع عالمك الأول!", projOpen: "فتح", projDelete: "حذف",
    projDeleteConfirm: "هل تريد حذف هذا المشروع؟ لا يمكن التراجع.", projName: "اسم المشروع", projDefault: "عالمي",
    projSave: "💾 حفظ", projSaved: "تم الحفظ!", projShare: "🔗 رابط المشاركة", projCopied: "تم نسخ الرابط! يستطيع أي شخص معه الرابط مشاهدة مشروعك.",
    projPaint: "ابنِ عالمك", projBolt: "بولت", projBoltTip: "اضغط على مربع لتضع بولت فيه. اضغط على بولت مرة أخرى لتديره.",
    projIntro: "اختر قطعة أرض، ثم اضغط على الخريطة لتبني عالمك. برمج بولت واضغط تشغيل!",
    projFinished: "انتهى البرنامج! 🎉", projView: "مشروع من صنع {a}. اضغط تشغيل لتشاهده!", projNotFound: "رابط المشروع هذا لا يعمل.",
    projSaveFirst: "احفظ مشروعك أولاً.", projBack: "→ مشاريعي",
    t_grass: "عشب", t_sand: "رمل", t_water: "ماء", t_lava: "حمم", t_tree: "شجرة", t_rock: "صخرة", t_ore: "خام بلّور", t_gem: "جوهرة", t_flag: "علم",
    certTitle: "شهادة إنجاز", certThis: "تُمنح هذه الشهادة بكل فخر إلى", certDid: "لإتمام {stage} في أكاديمية بلوك كويست",
    certStars: "بـ {n} من {m} نجمة", certClass: "الصف", certTeacher: "المعلم", certDate: "التاريخ", certPrint: "🖨 طباعة أو حفظ PDF",
    certNotYet: "هذه المرحلة لم تكتمل بعد. واصل التقدّم!", certBack: "→ رجوع",
    pTrackAI: "مختبر الذكاء الاصطناعي", pStage: "المرحلة {n} · الصفوف {g}",
  });
  const get = () => { try { return localStorage.getItem("bq_lang") === "ar" ? "ar" : "en"; } catch { return "en"; } };
  let lang = get();
  const listeners = [];
  function t(key, vars) {
    let s = S[lang][key] ?? S.en[key] ?? key;
    if (vars) for (const k in vars) s = s.split("{" + k + "}").join(vars[k]);
    return s;
  }
  function apply() {
    document.documentElement.lang = lang;
    document.body.classList.toggle("ar", lang === "ar");
    document.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll("[data-lang-btn]").forEach((el) => { el.textContent = t("langBtn"); });
  }
  function set(l) { lang = l === "ar" ? "ar" : "en"; try { localStorage.setItem("bq_lang", lang); } catch {} apply(); listeners.forEach((f) => f(lang)); }
  // level text in the current language
  function lv(level, field) {
    const ar = lang === "ar" && window.LESSONS?.[level.id]?.ar;
    return (ar && ar[field]) || level[field];
  }
  window.I18N = { t, lv, get lang() { return lang; }, set, toggle: () => set(lang === "ar" ? "en" : "ar"), onChange: (f) => listeners.push(f), apply };
  document.addEventListener("DOMContentLoaded", () => {
    apply();
    document.querySelectorAll("[data-lang-btn]").forEach((b) => b.addEventListener("click", () => window.I18N.toggle()));
  });
})();
