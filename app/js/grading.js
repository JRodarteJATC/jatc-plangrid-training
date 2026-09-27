/* Automatic grading used by the Instructor Dashboard.
   - Quizzes / worksheets / written final: scored against grading-key.json
     (kept in the PRIVATE instructor repo, loaded into the dashboard).
   - Lab app work (markups, punch list, RFI, reports, as-builts) and the final
     practical: scored by rubrics below, straight from the apprentice's project.
   All functions expect PT.store to be swapped to the apprentice's state.          */
PT.grading = (() => {
  const A = PT.samples.answers;
  const X = (f) => 150 + f * 12.5, Y = (f) => 230 + f * 12.5;
  const r1 = (n) => Math.round(n * 10) / 10;

  /* ---------- key-based questions ---------- */
  function scoreQuestion(q, ans, k, pts) {
    if (!k) return { earned: 0, pts, status: "nokey" };
    const blank = ans === undefined || ans === null || ans === "" || (Array.isArray(ans) && !ans.length);
    if (blank) return { earned: 0, pts, status: "blank" };
    if (q.type === "mc") return { earned: +ans === k.a ? pts : 0, pts, status: +ans === k.a ? "ok" : "wrong" };
    if (q.type === "multi") {
      const good = new Set(k.a), sel = new Set(ans.map(Number));
      const hit = [...sel].filter((x) => good.has(x)).length, bad = [...sel].filter((x) => !good.has(x)).length;
      const frac = Math.max(0, (hit - bad) / good.size);
      return { earned: r1(frac * pts), pts, status: frac === 1 ? "ok" : frac > 0 ? "partial" : "wrong" };
    }
    if (q.type === "num") {
      const v = parseFloat(ans); const tol = k.pct ? Math.abs(k.v) * k.pct / 100 : (k.tol ?? 0);
      const ok = !isNaN(v) && Math.abs(v - k.v) <= tol + 1e-9;
      return { earned: ok ? pts : 0, pts, status: ok ? "ok" : "wrong" };
    }
    // text: keyword groups
    const txt = String(ans).toLowerCase();
    const groups = k.kw || [];
    const matched = groups.filter((g) => g.some((w) => txt.includes(w.toLowerCase()))).length;
    let frac = groups.length ? matched / groups.length : 0;
    if (k.minLen && txt.length < k.minLen) frac = Math.min(frac, 0.5);
    return { earned: r1(frac * pts), pts, status: frac === 1 ? "ok" : frac > 0 ? "partial" : "wrong", review: true };
  }

  function keyText(q, k) {
    if (!k) return "";
    if (q.type === "mc") return q.options[k.a];
    if (q.type === "multi") return k.a.map((i) => q.options[i]).join("; ");
    if (q.type === "num") return `${k.v}${k.pct ? ` (±${k.pct}%)` : k.tol ? ` (±${k.tol})` : ""} ${q.unit || ""}`;
    return "keywords: " + (k.kw || []).map((g) => g.join("/")).join(" + ");
  }
  const ansText = (q, a) => a === undefined ? "—" : q.type === "mc" ? q.options[a] : q.type === "multi" ? a.map((i) => q.options[i]).join("; ") : String(a);

  function scoreSet(set, response, keySet, legacy) {
    const pts = set.points || 1;
    const items = set.questions.map((q) => {
      let a = response?.answers?.[q.id];
      // Submissions made before the answer choices were reshuffled (no v:2) use the old option
      // order – translate them with the map kept in the private key.
      const lm = response && response.v !== 2 && legacy?.[q.id];
      if (lm && a !== undefined) a = Array.isArray(a) ? a.map((i) => lm[i]) : lm[a];
      const s = scoreQuestion(q, a, keySet?.[q.id], pts);
      return { ...s, id: q.id, q: q.q, answer: ansText(q, a), key: keyText(q, keySet?.[q.id]) };
    });
    return {
      submitted: !!response?.submittedAt, submittedAt: response?.submittedAt, attempts: response?.attempts || 0,
      earned: r1(items.reduce((s, i) => s + i.earned, 0)), possible: items.length * pts, items, hasKey: !!keySet,
    };
  }

  /* ---------- rubric helpers ---------- */
  const L = (c) => PT.store.list(c);
  const me = () => PT.store.get().user?.name;
  const sid = (n) => L("sheets").find((s) => s.number === n)?.id;
  const mk = (n, f = () => true) => L("markups").filter((m) => m.sheetId === sid(n) && m.createdBy === me() && f(m));
  const ev = (type, f = () => true) => (PT.store.get().events || []).filter((e) => e.type === type && e.projectId === PT.store.pid() && f(e));
  const near = (m, x, y, d) => (m.points || []).some((p) => Math.hypot(p[0] - x, p[1] - y) <= d);
  const mine = (c) => L(c).filter((x) => x.createdBy === me());
  const rub = (items) => ({ earned: r1(items.reduce((s, i) => s + i[1], 0)), possible: items.reduce((s, i) => s + i[2], 0), items });
  const pts = (cond, p) => (cond ? p : 0);
  const frac = (f, p) => r1(Math.max(0, Math.min(1, f)) * p);

  function lab2() {
    const clouds = mk("R-101", (m) => m.type === "cloud"), texts = mk("R-101", (m) => m.type === "text");
    return rub([
      ["Cloud on R-101", pts(clouds.length, 2), 2],
      ["Text note on R-101", pts(texts.length, 1), 1],
      ["Cloud/text published", pts([...clouds, ...texts].some((m) => m.layer === "published"), 2), 2],
      ["As-built markup on R-101", pts(mk("R-101", (m) => m.layer === "asbuilt").length, 2), 2],
      ["As-built text note", pts(mk("R-101", (m) => m.layer === "asbuilt" && m.type === "text").length, 1), 1],
      ["FIELD VERIFY stamp near RTU-4", pts(mk("R-101", (m) => m.type === "stamp" && m.text === "FIELD VERIFY" && near(m, X(70), Y(52.5), 260)).length, 2), 2],
      ["Highlighter on R-101 (dried-in area)", pts(mk("R-101", (m) => m.type === "highlighter").length, 2), 2],
      ["PROBED OK stamp", pts(mk("R-101", (m) => m.type === "stamp" && m.text === "PROBED OK").length, 1), 1],
      ["Hyperlink R-101 → R-102", pts(mk("R-101", (m) => m.type === "link" && m.target === sid("R-102")).length, 2), 2],
      ["Ellipse on W-101", pts(mk("W-101", (m) => m.type === "ellipse").length, 1), 1],
      ["Text on W-101", pts(mk("W-101", (m) => m.type === "text").length, 1), 1],
      ["Personal note kept personal", pts(L("markups").some((m) => m.createdBy === me() && m.layer === "personal" && m.type === "text"), 1), 1],
      ["Exported 2+ sheet PNGs", frac(ev("export", (e) => e.what === "sheet_png").length / 2, 2), 2],
    ]);
  }

  const LOC = ["rd-", "od-", "drain", "curb", "rtu", "area", "parapet", "penetration", "boot", "skylight", "sk-1", "hatch", "rh-1", "seam", "corner", "wall", "pad", "coping", "north", "south", "east", "west"];
  function lab4() {
    const p = mine("issues").filter((i) => i.type === "Punch");
    const n = Math.max(p.length, 1);
    const specific = p.filter((i) => (i.title || "").length >= 20 && LOC.some((w) => ((i.title || "") + " " + (i.location || "")).toLowerCase().includes(w))).length;
    const closedC = p.filter((i) => i.status === "Closed" && (i.comments || []).length).length;
    return rub([
      ["Created 6 punch items", frac(p.length / 6, 4), 4],
      ["Pinned on a sheet", frac(p.filter((i) => i.x != null).length / n, 3), 3],
      ["Titles specific (location + problem)", frac(specific / n, 3), 3],
      ["Assignee + due date + priority", frac(p.filter((i) => i.assignee && i.dueDate && i.priority).length / n, 4), 4],
      ["Photos attached", frac(p.filter((i) => (i.photoIds || []).length).length / 3, 2), 2],
      ["3 closed with a verification comment", frac(closedC / 3, 3), 3],
      ["Exported punch list CSV", pts(ev("export", (e) => e.what === "issues_csv").length, 1), 1],
    ]);
  }

  function rfiRubric(r) {
    if (!r) return rub([["RFI written & sent", 0, 10]]);
    const q = (r.question || "") + " " + (r.subject || "");
    const refs = [/R-10[12]/i, /R-501|4\/R-501/i, /ASI/i, /R-601|07\s?\d\d\s?\d\d/i, /\d+(\.\d+)?\s*("|in\b|inch)/i].filter((re) => re.test(q)).length;
    return rub([
      ["Subject one line (10–90 chars)", pts((r.subject || "").length >= 10 && (r.subject || "").length <= 90, 1), 1],
      ["Subject is specific (RTU/curb/cricket/flashing…)", pts(/rtu|curb|cricket|flash|taper|drain|parapet|penetration/i.test(r.subject || ""), 1), 1],
      ["Question cites sheets/detail/ASI/dimensions", frac(refs / 4, 2), 2],
      ["Suggested solution given", pts((r.suggestion || "").length >= 15, 1), 1],
      ["Solution is specific/buildable", pts(/\d|curb|cricket|nailer|relocat|raise|taper/i.test(r.suggestion || ""), 1), 1],
      ["Cost impact stated", pts(r.costImpact && r.costImpact !== "Unknown", 1), 1],
      ["Schedule impact stated", pts(r.scheduleImpact && r.scheduleImpact !== "Unknown", 1), 1],
      ["Sent & assigned to reviewer", pts(r.status !== "Draft" && r.assignedTo, 1), 1],
      ["References sheets in the log", pts((r.sheetIds || []).length, 1), 1],
    ]);
  }
  const bestRFI = () => mine("rfis").map((r) => ({ r, s: rfiRubric(r).earned })).sort((a, b) => b.s - a.s)[0]?.r;

  function lab5() {
    const rf = rfiRubric(bestRFI());
    return rub([
      ...rf.items.map(([l, e, p]) => ["RFI – " + l, e, p]),
      ["Submittal logged (07 72 00 curb)", pts(L("submittals").some((s) => /07\s?72/.test(s.specSection || "") || /curb/i.test(s.title || "")) && ev("submittal_created").length, 2), 2],
      ["SEE RFI stamp on R-101", pts(mk("R-101", (m) => m.type === "stamp" && m.text === "SEE RFI").length, 1), 1],
    ]);
  }

  function lab6() {
    const rep = mine("reports").filter((r) => r.status === "Submitted");
    const tb = rep.filter((r) => r.type === "Toolbox Talk").sort((a, b) => (b.attendees || "").split("\n").filter((x) => x.trim()).length - (a.attendees || "").split("\n").filter((x) => x.trim()).length)[0];
    const att = tb ? (tb.attendees || "").split("\n").filter((x) => x.trim()).length : 0;
    const jha = rep.find((r) => r.type === "Pre-Task Plan (JHA)");
    const jhaRows = jha ? (jha.jha || []).filter((j) => j.step && j.hazard && j.control).length : 0;
    const dr = rep.filter((r) => r.type === "Daily Report").sort((a, b) => (b.workPerformed || "").length - (a.workPerformed || "").length)[0];
    const photos = L("photos").filter((p) => p.by === me() && p.x != null);
    return rub([
      ["Toolbox talk submitted, 4+ attendees", frac(att / 4, 3), 3],
      ["JHA submitted with 3+ complete steps", frac(jhaRows / 3, 3), 3],
      ["2+ photos pinned with captions", frac(photos.filter((p) => (p.caption || "").length >= 10).length / 2, 3), 3],
      ["Inspection request submitted", pts(rep.some((r) => r.type === "Inspection Request"), 2), 2],
      ["Daily report – manpower", pts(dr && (dr.crew || []).some((c) => +c.count > 0), 1), 1],
      ["Daily report – weather", pts(dr && dr.weather, 1), 1],
      ["Daily report – specific work (30+ chars)", pts(dr && (dr.workPerformed || "").length >= 30, 1), 1],
      ["Daily report – delays recorded", pts(dr && (dr.delays || "").trim().length > 3, 1), 1],
      ["Daily report – safety recorded", pts(dr && (dr.safety || "").trim().length > 3, 1), 1],
    ]);
  }

  function lab7() {
    const ab = mk("R-101", (m) => m.layer === "asbuilt");
    const abAll = L("markups").filter((m) => m.createdBy === me() && m.layer === "asbuilt");
    return rub([
      ["4+ as-built markups on R-101", frac(ab.length / 4, 5), 5],
      ["Dimensioned on as-built layer (measure)", pts(abAll.some((m) => m.type === "measure"), 3), 3],
      ["As-built note references an RFI", pts(abAll.some((m) => m.type === "text" && /rfi/i.test(m.text || "")), 3), 3],
      ["AS-BUILT stamp on R-101", pts(mk("R-101", (m) => m.type === "stamp" && m.text === "AS-BUILT").length, 1), 1],
      ["AS-BUILT stamp on W-101", pts(mk("W-101", (m) => m.type === "stamp" && m.text === "AS-BUILT").length, 1), 1],
      ["Exported sheets", frac(ev("export", (e) => e.what === "sheet_png").length / 2, 2), 2],
    ]);
  }

  function lab3app(r) {
    return rub([
      ["Measured north parapet ≈100'", pts(r.parapetOk, 1), 1],
      ["Measured Roof Area B ≈2,560 SF", pts(r.areaOk, 1), 1],
      ["Counted all pipe penetrations", pts(r.pensOk, 1), 1],
    ]);
  }

  function finalPractical() {
    const areaA = mk("R-101", (m) => m.type === "area" && m.value && Math.abs(m.value - 3840) / 3840 <= 0.03).length;
    const pts8 = A.penetrationPts(1);
    const cnt = mk("R-101", (m) => m.type === "count" && m.points.length === pts8.length && pts8.every((q) => m.points.some((p) => Math.hypot(p[0] - q.x, p[1] - q.y) < 20))).length;
    const cl = mk("R-101", (m) => m.type === "cloud"), tx = mk("R-101", (m) => m.type === "text");
    const iss = mine("issues").filter((i) => i.type !== "Punch");
    const bestIss = iss.map((i) => ({ i, s: (i.x != null) + !!(i.photoIds || []).length + !!i.assignee + !!i.dueDate })).sort((a, b) => b.s - a.s)[0]?.i;
    const p = mine("issues").filter((i) => i.type === "Punch");
    const dr = mine("reports").filter((r) => r.type === "Daily Report" && r.status === "Submitted");
    const rf = rfiRubric(bestRFI());
    return rub([
      ["Area of Roof Area A (±3%)", pts(areaA, 5), 5],
      ["Pipe penetration count", pts(cnt, 5), 5],
      ["Cloud + text + published on R-101", pts(cl.length, 2) + pts(tx.length, 1) + pts([...cl, ...tx].some((m) => m.layer === "published"), 2), 5],
      ["Issue pinned", pts(bestIss && bestIss.x != null, 2), 2],
      ["Issue has photo", pts(bestIss && (bestIss.photoIds || []).length, 2), 2],
      ["Issue assigned", pts(bestIss && bestIss.assignee, 2), 2],
      ["Issue due date", pts(bestIss && bestIss.dueDate, 2), 2],
      ["2 punch items", frac(p.length / 2, 4), 4],
      ["Punch closed with comment", pts(p.some((i) => i.status === "Closed" && (i.comments || []).length), 2), 2],
      ["RFI (rubric /10)", rf.earned, 10],
      ["Compared revisions", pts(ev("compare").length, 5), 5],
      ["Daily report – manpower", pts(dr.some((r) => (r.crew || []).some((c) => +c.count > 0)), 3), 3],
      ["Daily report – weather", pts(dr.some((r) => r.weather), 3), 3],
    ]);
  }

  return { scoreSet, lab2, lab4, lab5, lab6, lab7, lab3app, finalPractical, rfiRubric };
})();
