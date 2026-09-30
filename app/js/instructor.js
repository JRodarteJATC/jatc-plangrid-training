/* Instructor dashboard: load every apprentice backup at once and auto-grade
   quizzes, worksheets, lab work, the final, and training missions.
   Nothing is uploaded – files are read in this browser only.                */
(() => {
  const { esc, $, $$, h, toast, modal, download, toCSV, fmtDateTime, fmtDate, today } = PT.util;
  const G = PT.grading, Q = PT.quizzes;
  const A = PT.samples.answers;
  const MODS = PT.training.MODULES;
  const ALL = MODS.flatMap((m) => m.missions);
  const GB_KEY = "pt-gradebook-v2", KEY_KEY = "pt-grading-key";
  PT.store.viewOnly(); // grading reads apprentice files – never save them over this browser's own project

  let students = [];
  let classFilter = "";
  const shown = () => students.filter((s) => !classFilter || s.r.classYear === classFilter);
  const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || "null") ?? d; } catch { return d; } };
  const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { } };
  let gradebook = load(GB_KEY, {});
  let gkey = load(KEY_KEY, null);
  // Your answers to apprentice RFIs (kept in this browser until you send the answers file)
  const ANS_KEY = "pt-rfi-answers";
  let rfiAnswers = load(ANS_KEY, {});
  let myName = load("pt-instructor-name", "Juan Rodarte");
  const toMe = (x) => /rodarte|instructor/i.test(x.assignedTo || "") || (x.assignedTo && x.assignedTo === myName);

  const ASSESS = [
    ...["quiz1", "quiz2", "quiz3", "quiz4", "quiz5", "quiz6"].map((id, i) => ({ id, label: `Q${i + 1}`, title: Q.find(id).title, group: "Quizzes" })),
    ...[1, 2, 3, 4, 5, 6, 7].map((n) => ({ id: `lab${n}`, label: `L${n}`, title: `Lab ${n}`, group: "Labs" })),
    { id: "proj3a", label: "3A Proj", title: "3A PlanGrid Project", group: "Project" },
    { id: "att", label: "AT&T", title: "AT&T Reroof Blueprint Exercise", group: "Blueprint" },
    { id: "practice", label: "Practice", title: "Training Center Reroof – Practice Plan Exercise", group: "Blueprint" },
    { id: "final", label: "Final", title: "Final exam (written + practical)", group: "Final" },
  ];

  /* ---------- grading one apprentice ---------- */
  function analyze(state, file) {
    const prev = PT.store.swap(state);
    try {
      // Labs are graded on the sample training project, even if the apprentice left another project open
      // (e.g. the 3A project with real plans – that one is found and graded separately).
      const sample = (state.sheets || []).find((sh) => sh.number === "R-101" && (state.projects || []).some((p) => p.id === sh.projectId));
      if (sample) state.activeProjectId = sample.projectId;
      const L = (c) => PT.store.list(c);
      const me = state.user?.name || "(no name)";
      const sid = (n) => L("sheets").find((s) => s.number === n)?.id;
      const onSheet = (n, type) => L("markups").filter((m) => m.sheetId === sid(n) && m.type === type);
      const closest = (arr, t) => arr.filter((m) => m.value).sort((a, b) => Math.abs(a.value - t) - Math.abs(b.value - t))[0];

      const missions = {};
      for (const m of ALL) { let ok = false; try { ok = !!m.check(); } catch { } missions[m.id] = ok || !!state.training?.completed?.[m.id]; }
      const done = Object.values(missions).filter(Boolean).length;

      const par = closest(onSheet("R-101", "measure"), A.parapetLength);
      const area = closest(onSheet("R-101", "area"), A.roofAreaB);
      const r = {
        name: me, classYear: state.user?.classYear || "", file, done, pct: Math.round((done / ALL.length) * 100), missions,
        parapet: par?.value ?? null, parapetOk: par ? Math.abs(par.value - A.parapetLength) <= 2 : false,
        areaB: area?.value ?? null, areaOk: area ? Math.abs(area.value - A.roofAreaB) / A.roofAreaB <= 0.05 : false,
        pensOk: missions.count_pipes,
      };

      // Quiz answers are saved per project – use the latest submission from any project.
      const resp = {};
      for (const b of Object.values(state.quizzes || {})) for (const [id, r] of Object.entries(b || {})) {
        const t = (x) => x?.submittedAt || x?.savedAt || "";
        if (!resp[id] || (!!r.submittedAt > !!resp[id].submittedAt) || (!!r.submittedAt === !!resp[id].submittedAt && t(r) > t(resp[id]))) resp[id] = r;
      }
      const ks = (id) => gkey?.sets?.[id];
      const qs = (id, title) => ({ title, kind: "questions", ...G.scoreSet(Q.find(id), resp[id], ks(id), gkey?.legacy?.[id]) });
      const rb = (title, x) => ({ title, kind: "rubric", ...x, submitted: true, hasKey: true });
      const scale = (part, to) => ({ ...part, earned: part.possible ? Math.round((part.earned / part.possible) * to * 10) / 10 : 0, possible: to, title: part.title + ` (scaled to ${to})` });

      const parts = {
        quiz1: [qs("quiz1", "Quiz 1")], quiz2: [qs("quiz2", "Quiz 2")], quiz3: [qs("quiz3", "Quiz 3")],
        quiz4: [qs("quiz4", "Quiz 4")], quiz5: [qs("quiz5", "Quiz 5")], quiz6: [qs("quiz6", "Quiz 6")],
        lab1: [qs("lab1", "Lab 1 worksheet")],
        lab2: [rb("Lab 2 markups (auto rubric)", G.lab2())],
        lab3: [qs("lab3", "Lab 3 takeoff worksheet"), rb("Lab 3 measurements in the app", G.lab3app(r))],
        lab4: [rb("Lab 4 punch walk (auto rubric)", G.lab4())],
        lab5: [qs("lab5", "Lab 5 conflict worksheet"), rb("Lab 5 RFI + submittal (auto rubric)", G.lab5())],
        lab6: [rb("Lab 6 field day (auto rubric)", G.lab6()), scale(qs("lab6", "Lab 6 compare worksheet"), 4)],
        lab7: [rb("Lab 7 as-builts (auto rubric)", G.lab7())],
        att: [qs("att", "AT&T Reroof Blueprint Exercise")],
        practice: [qs("practice", "Practice Plan Exercise")],
        proj3a: [rb("3A PlanGrid Project (auto rubric)", G.project3a())],
        final: [qs("final", "Final – written"), rb("Final – practical (auto rubric)", G.finalPractical())],
      };
      r.grades = {};
      for (const a of ASSESS) {
        const ps = parts[a.id];
        const needKey = ps.some((p) => p.kind === "questions" && !p.hasKey);
        r.grades[a.id] = {
          parts: ps, needKey,
          earned: Math.round(ps.reduce((s, p) => s + p.earned, 0) * 10) / 10,
          possible: ps.reduce((s, p) => s + p.possible, 0),
          missing: ps.some((p) => p.kind === "questions" && !p.submitted),
          review: ps.some((p) => (p.items || []).some((i) => i.review)),
        };
      }
      r.issues = L("issues").filter((i) => i.createdBy === me);
      // RFIs from every project (the 3A project may be a separate project with real plans)
      r.rfis = (state.rfis || []).filter((x) => x.createdBy === me || !x.createdBy || (x.createdBy === "Apprentice" && /rodarte|instructor/i.test(x.assignedTo || ""))).map((x) => {
        const shs = (state.sheets || []).filter((sh) => (x.sheetIds || []).includes(sh.id));
        return { ...x, project: (state.projects || []).find((p) => p.id === x.projectId)?.name || "",
          sheets: shs.map((sh) => sh.number).join(", "),
          published: (state.markups || []).filter((m) => (x.sheetIds || []).includes(m.sheetId) && m.createdBy === me && m.layer === "published").length };
      });
      r.reports = L("reports").filter((x) => x.createdBy === me);
      r.activity = L("activity").slice(0, 50);
      r.lastAt = [...L("activity").map((a) => a.at), ...(state.events || []).map((e) => e.at)].sort().pop();
      return r;
    } finally { PT.store.swap(prev); }
  }

  const finalScore = (key, r, id) => {
    const ov = gradebook[key]?.ov?.[id];
    const g = r.grades[id];
    return { earned: ov !== undefined && ov !== "" ? +ov : g.earned, possible: g.possible, ov: ov !== undefined && ov !== "" };
  };
  function overall(key, r) {
    let e = 0, p = 0;
    for (const a of ASSESS) { const s = finalScore(key, r, a.id); if (r.grades[a.id].needKey && !s.ov) continue; e += s.earned; p += s.possible; }
    return p ? Math.round((e / p) * 1000) / 10 : 0;
  }

  /* ---------- files ---------- */
  async function addFiles(files) {
    let added = 0;
    for (const f of files) {
      try {
        const data = JSON.parse(await f.text());
        if (data && data.type === "plan-trainer-grading-key") { gkey = data; save(KEY_KEY, data); toast("Answer key loaded", "ok"); continue; }
        if (!data || !data.projects || !data.sheets) throw new Error("not a Plan Room Trainer backup");
        const key = (data.user?.name || f.name).trim().toLowerCase();
        const rec = { key, file: f.name, state: data };
        const i = students.findIndex((s) => s.key === key);
        if (i >= 0) students[i] = rec; else students.push(rec);
        added++;
      } catch (e) { toast(`${f.name}: ${e.message}`, "warn"); }
    }
    regrade();
    if (added) toast(`Loaded ${added} apprentice file(s)`, "ok");
  }
  // Team projects: combine every teammate's copy of the project, so the team is graded on all of its work
  // even if someone forgot to sync before exporting their backup.
  function combineTeams() {
    const byTeam = {};
    for (const s of students) for (const p of s.state.projects || []) if (p.team) (byTeam[p.id] ||= []).push(s.state);
    for (const [pid, states] of Object.entries(byTeam)) if (states.length > 1)
      for (const a of states) for (const b of states) if (a !== b) { try { PT.store.mergeTeam(a, PT.store.shareFor(pid, b), { noEmit: true }); } catch (e) { console.warn(e); } }
  }
  function regrade() {
    combineTeams();
    for (const s of students) s.r = analyze(s.state, s.file);
    students.sort((a, b) => a.r.name.localeCompare(b.r.name));
    render();
  }

  /* ---------- UI ---------- */
  function cell(key, r, id) {
    const g = r.grades[id], s = finalScore(key, r, id);
    if (g.needKey && !s.ov) return `<td class="muted" title="Load the answer key">key?</td>`;
    const pct = s.possible ? s.earned / s.possible : 0;
    const cls = pct >= 0.8 ? "ok" : pct >= 0.6 ? "" : "no";
    return `<td class="${cls}" title="${esc(ASSESS.find((a) => a.id === id).title)}">${s.earned}/${s.possible}${s.ov ? "*" : ""}${g.missing ? ' <span class="muted small">(missing)</span>' : ""}${g.review ? " 👁" : ""}</td>`;
  }

  function render() {
    const main = $("#main");
    main.innerHTML = `
      <div class="page-head"><h1>Instructor Dashboard</h1>
        <div class="actions">
          ${students.length ? `<select id="clsF" title="Filter by class (Exhibit C week)"><option value="">All classes</option>${[...new Set(students.map((x) => x.r.classYear))].sort().map((c) => `<option ${c === classFilter ? "selected" : ""}>${esc(c)}</option>`).join("")}</select>` : ""}
          <span class="badge ${gkey ? "st-Closed" : "st-Open"}">${gkey ? "✔ Answer key loaded" : "Answer key not loaded"}</span>
          ${gkey ? '<button class="btn" id="forgetKey" title="Remove the answer key from this browser (do this on shared computers)">Forget key</button>' : ""}
          ${students.length || inbox().length || PT.rfiLive?.enabled() ? `<button class="btn ${inbox().filter((x) => !answered(x)).length ? "btn-primary" : ""}" id="inboxBtn">📨 RFI inbox (${inbox().filter((x) => !answered(x)).length} to answer)</button>` : ""}
          <button class="btn" id="csvBtn" ${students.length ? "" : "disabled"}>⤓ Export gradebook CSV</button>
          <button class="btn" id="clrBtn" ${students.length ? "" : "disabled"}>Clear files</button>
        </div></div>
      <div class="drop" id="drop">
        <p><b>Drag & drop files here</b> – every apprentice's backup <code>.json</code>, plus <code>grading-key.json</code> from the private instructor repo. <b>Grade on your own computer only</b> – the key stays in this browser until you click <i>Forget key</i>.</p>
        <button class="btn btn-primary" id="pickBtn">Choose files…</button>
        <p class="muted small">Read in this browser only – nothing is uploaded. Overrides and notes you type are saved in this browser; export the CSV for a permanent copy.</p>
      </div>
      ${students.length ? table() : howTo()}`;
    $("#pickBtn").onclick = () => { const inp = h(`<input type="file" accept=".json,application/json" multiple hidden>`); document.body.appendChild(inp); inp.onchange = () => { addFiles([...inp.files]); inp.remove(); }; inp.click(); };
    const drop = $("#drop");
    drop.ondragover = (e) => { e.preventDefault(); drop.classList.add("over"); };
    drop.ondragleave = () => drop.classList.remove("over");
    drop.ondrop = (e) => { e.preventDefault(); drop.classList.remove("over"); addFiles([...e.dataTransfer.files]); };
    $("#csvBtn").onclick = exportCSV;
    if ($("#inboxBtn")) $("#inboxBtn").onclick = () => openInbox();
    if ($("#forgetKey")) $("#forgetKey").onclick = () => { gkey = null; try { localStorage.removeItem(KEY_KEY); } catch { } regrade(); toast("Answer key removed from this browser", "ok"); };
    if ($("#clsF")) $("#clsF").onchange = (e) => { classFilter = e.target.value; render(); };
    $("#clrBtn").onclick = () => { students = []; render(); };
    $$("[data-stu]").forEach((a) => (a.onclick = (e) => { e.preventDefault(); detail(students.find((s) => s.key === a.dataset.stu)); }));
    $$("input[data-note]").forEach((inp) => (inp.onchange = () => { (gradebook[inp.dataset.note] ||= {}).notes = inp.value; save(GB_KEY, gradebook); }));
  }

  const howTo = () => `<div class="card"><h2>How grading works</h2><ol>
      <li>Apprentices do the labs in the app and answer <b>Quizzes & Worksheets</b> in the app, then click <b>Settings → Export backup</b>.</li>
      <li>They send you the <code>.json</code> file (email, shared Drive/OneDrive folder, LMS upload, or USB).</li>
      <li>Drop all the files here together with <code>grading-key.json</code> (from the private <code>jatc-plangrid-instructor-keys</code> repo).</li>
      <li>Everything is scored automatically: 6 quizzes, 7 labs (worksheets + app work), the written and practical final, and 32 training missions.</li>
      <li>👁 marks short written answers graded by keywords – click the name to check them. Type an override for any score if you disagree.</li>
      <li><b>Export gradebook CSV</b> for your records or LMS.</li></ol></div>`;

  function table() {
    const avg = (f) => Math.round(shown().reduce((s, x) => s + f(x), 0) / shown().length);
    return `<div class="stats">
        <div class="stat"><b>${shown().length}</b><span>Apprentices</span></div>
        <div class="stat"><b>${avg((s) => overall(s.key, s.r))}%</b><span>Class average (overall)</span></div>
        <div class="stat"><b>${avg((s) => s.r.pct)}%</b><span>Avg missions complete</span></div>
        <div class="stat ${shown().some((s) => ASSESS.some((a) => s.r.grades[a.id].review)) ? "stat-warn" : ""}"><b>${shown().filter((s) => ASSESS.some((a) => s.r.grades[a.id].review)).length}</b><span>With written answers to glance at 👁</span></div>
      </div>
      <div class="tbl-wrap"><table class="tbl grade-tbl">
      <thead><tr><th class="sticky-name">Apprentice</th><th>Overall</th><th>Missions</th>
        ${ASSESS.map((a) => `<th title="${esc(a.title)}">${a.label}</th>`).join("")}<th>Notes</th><th>Last activity</th></tr></thead>
      <tbody>${shown().map(({ key, r }) => {
        const o = overall(key, r);
        return `<tr>
          <td class="sticky-name"><a href="#" data-stu="${esc(key)}"><b>${esc(r.name)}</b></a><br><span class="muted small">${esc(r.classYear)}</span></td>
          <td class="${o >= 80 ? "ok" : o >= 60 ? "" : "no"}"><b>${o}%</b></td>
          <td><span class="bar"><i style="width:${r.pct}%"></i></span> ${r.done}/${ALL.length}</td>
          ${ASSESS.map((a) => cell(key, r, a.id)).join("")}
          <td><input class="note" data-note="${esc(key)}" value="${esc(gradebook[key]?.notes || "")}"></td>
          <td class="small">${fmtDateTime(r.lastAt)}</td></tr>`;
      }).join("")}</tbody></table></div>
      <p class="muted small">Scores are points earned/possible. Green ≥ 80%, red &lt; 60%. <b>(missing)</b> = quiz/worksheet not submitted (counts as 0). <b>*</b> = your override. 👁 = contains keyword-graded written answers. Overall = total points across all assessments.</p>`;
  }

  function detail(stu) {
    const r = stu.r, key = stu.key;
    const sect = (a) => {
      const g = r.grades[a.id], s = finalScore(key, r, a.id);
      return `<details class="card" ${g.review ? "open" : ""}><summary><b>${esc(a.title)}</b> – ${s.earned}/${s.possible}${s.ov ? " (override)" : ""} ${g.needKey ? '<span class="badge st-Open">answer key needed</span>' : ""} ${g.missing ? '<span class="badge st-Open">not submitted</span>' : ""}</summary>
        ${g.parts.map((p) => `<h4>${esc(p.title)} – ${p.earned}/${p.possible}${p.submittedAt ? ` <span class="muted small">submitted ${fmtDateTime(p.submittedAt)}${p.attempts > 1 ? `, attempt ${p.attempts}` : ""}</span>` : ""}</h4>
          ${p.kind === "questions" && !p.submitted ? '<p class="muted">Not submitted.</p>' : `<table class="tbl"><tbody>${(p.items || []).map((i) => Array.isArray(i)
            ? `<tr><td>${i[1] >= i[2] ? "✔" : i[1] > 0 ? "◐" : "✘"}</td><td>${esc(i[0])}</td><td>${i[1]}/${i[2]}</td></tr>`
            : `<tr><td>${i.status === "ok" ? "✔" : i.status === "partial" ? "◐" : i.status === "nokey" ? "?" : "✘"}${i.review ? " 👁" : ""}</td><td>${esc(i.q)}<br><span class="small">Answer: <b>${esc(i.answer)}</b>${i.key ? ` · Key: ${esc(i.key)}` : ""}</span></td><td>${i.earned}/${i.pts}</td></tr>`).join("")}</tbody></table>`}`).join("")}
        <label class="inline">Override score <input type="number" step="0.5" data-ov="${a.id}" value="${esc(gradebook[key]?.ov?.[a.id] ?? "")}" style="width:6em"> / ${g.possible} <span class="muted small">(leave blank to use auto score)</span></label>
      </details>`;
    };
    const body = `<div class="detail">
      <p class="muted">File: ${esc(stu.file)} • Last activity ${fmtDateTime(r.lastAt)} • Overall <b>${overall(key, r)}%</b> • Missions ${r.done}/${ALL.length}</p>
      ${ASSESS.map(sect).join("")}
      <details class="card" ${r.rfis.some((x) => toMe(x) && !answered(x)) ? "open" : ""}><summary><b>RFIs written (${r.rfis.length})</b> ${r.rfis.filter((x) => toMe(x) && !answered(x)).length ? `<span class="badge st-Open">${r.rfis.filter((x) => toMe(x) && !answered(x)).length} to answer</span>` : ""}</summary>${r.rfis.map((x) => rfiCard(r.name, x)).join("") || "<p class='muted'>None.</p>"}
        ${r.rfis.length ? `<p class="small muted">Type your answers, then use <b>📨 RFI inbox → Download answers file</b> and send that file to the class.</p>` : ""}</details>
      <details class="card"><summary><b>Issues & punch (${r.issues.length})</b></summary>${r.issues.map((i) => `<p>#${i.number} <b>${esc(i.title)}</b> – ${esc(i.type)}, ${esc(i.status)}, ${esc(i.assignee || "unassigned")}, due ${esc(i.dueDate || "—")}, ${(i.photoIds || []).length} photo(s)</p>`).join("") || "<p class='muted'>None.</p>"}</details>
      <details class="card"><summary><b>Reports & forms (${r.reports.length})</b></summary>${r.reports.map((x) => `<p><b>${esc(x.type)} – ${esc(x.date)}</b> (${esc(x.status)})</p><pre>${esc(x.workPerformed || x.topic || x.task || "")}${x.delays ? "\nDelays: " + esc(x.delays) : ""}${x.attendees ? "\nAttendees: " + esc(x.attendees.split("\n").join(", ")) : ""}</pre>`).join("") || "<p class='muted'>None.</p>"}</details>
      <details class="card"><summary><b>Training missions ${r.done}/${ALL.length}</b></summary>${MODS.map((m) => `<p><b>${esc(m.title)}</b><br>${m.missions.map((x) => `${r.missions[x.id] ? "✔" : "○"} ${esc(x.title)}`).join("<br>")}</p>`).join("")}</details>
      <details class="card"><summary><b>Recent activity</b></summary><ul class="activity">${r.activity.map((a) => `<li><span class="muted">${fmtDateTime(a.at)}</span> ${esc(a.text)}</li>`).join("")}</ul></details>
    </div>`;
    const { el } = modal({ title: r.name, body, wide: true, cancelLabel: "Close", extraButtons: `<button type="button" class="btn" id="openApp">Open full project in app</button>` });
    wireAnswers(el);
    el.addEventListener("click", (e) => { if (e.target === el || e.target.closest("[data-close]")) setTimeout(render); });
    $$("input[data-ov]", el).forEach((inp) => (inp.onchange = () => {
      const g = (gradebook[key] ||= {}); g.ov = g.ov || {};
      if (inp.value === "") delete g.ov[inp.dataset.ov]; else g.ov[inp.dataset.ov] = inp.value;
      save(GB_KEY, gradebook); render(); toast("Override saved", "ok");
    }));
    $("#openApp", el).onclick = () => PT.util.confirmBox("This replaces the project stored in THIS browser with the apprentice's work (export your own first if needed). Continue?", async () => {
      PT.store.viewOnly(false); await PT.store.init(); PT.store.importJSON(JSON.stringify(stu.state)); setTimeout(() => (location.href = "index.html#/"), 800);
    }, "Open in app");
  }

  /* ---------- RFI inbox: read apprentice RFIs, answer them, send the answers back ---------- */
  // RFIs from the loaded backup files + RFIs that arrived live (Firebase). The newest copy of each RFI wins.
  let hiddenRfis = load("pt-rfi-hidden", {}); // RFIs you deleted that came from backup files (can't be removed from the file itself)
  const inbox = () => {
    const byId = {};
    const put = (x) => { x = { ...x, id: x.copiedFrom || x.id }; const o = byId[x.id]; if (!o || String(x.updatedAt || x.createdAt || "") > String(o.updatedAt || o.createdAt || "")) byId[x.id] = x; };
    for (const { r } of shown()) for (const x of r.rfis) if (x.status !== "Draft") put({ ...x, who: r.name });
    if (PT.rfiLive) for (const x of PT.rfiLive.rfis()) if (x.status !== "Draft" && (!classFilter || x.classYear === classFilter)) put({ ...x, who: x.from || x.createdBy || "Apprentice", live: true });
    return Object.values(byId).filter((x) => !hiddenRfis[x.id]);
  };
  const sentLive = (x) => PT.rfiLive?.sentAnswer(x.id);
  // an answer typed by the apprentice themselves doesn't count – only the instructor's
  const realAnswer = (x) => !!x.answer && (/rodarte|instructor/i.test(x.answeredBy || "") || x.answeredBy === myName);
  const answered = (x) => !!(rfiAnswers[x.id]?.answer || realAnswer(x) || sentLive(x));
  function rfiCard(who, x) {
    const mine = rfiAnswers[x.id];
    const late = x.dueDate && x.dueDate < today() && !answered(x);
    return `<div class="card rfi-card ${toMe(x) ? "" : "muted-card"}">
      <div class="row gap" style="justify-content:space-between;flex-wrap:wrap"><label class="check" style="margin:0"><input type="checkbox" data-sel="${esc(x.id)}"> <b>${esc(who)} – RFI-${String(x.number).padStart(3, "0")}: ${esc(x.subject)}</b></label>
        <span>${x.live ? '<span class="badge">● live</span> ' : ""}${realAnswer(x) ? '<span class="badge st-Closed">Answered in their app</span>' : sentLive(x) && sentLive(x).answer === mine?.answer ? '<span class="badge st-Closed">Answer sent</span>' : mine?.answer ? '<span class="badge st-InReview">Answer ready to send</span>' : `<span class="badge ${late ? "st-Open" : ""}">${esc(x.status)}${late ? " – OVERDUE" : ""}</span>`}</span></div>
      <p class="small muted">To: <b>${esc(x.assignedTo || "—")}</b> · Sent ${fmtDate(x.sentDate || x.createdAt)} · Due ${fmtDate(x.dueDate) || "—"} · Sheets: ${esc(x.sheets || "—")} (${x.published} published markup${x.published === 1 ? "" : "s"}) · Cost impact: ${esc(x.costImpact)} · Schedule impact: ${esc(x.scheduleImpact)}${x.project ? ` · Project: ${esc(x.project)}` : ""}</p>
      <p><b>Question:</b><br>${esc(x.question).replace(/\n/g, "<br>")}</p>
      ${x.suggestion ? `<p><b>Suggested solution:</b><br>${esc(x.suggestion).replace(/\n/g, "<br>")}</p>` : ""}
      ${x.answer ? `<p><b>Answer (${esc(x.answeredBy || "")}):</b><br>${esc(x.answer)}</p>` : ""}
      <label>Your answer <textarea rows="3" data-ans="${esc(x.id)}" placeholder="Official response – e.g. Approved as suggested. Provide a change order request for the added nailer.">${esc(mine?.answer || "")}</textarea></label>
      ${mine?.at ? `<p class="small muted">Saved ${fmtDateTime(mine.at)}</p>` : ""}
    </div>`;
  }
  function wireAnswers(el) {
    $$("textarea[data-ans]", el).forEach((ta) => (ta.oninput = () => {
      const v = ta.value.trim();
      if (v) rfiAnswers[ta.dataset.ans] = { answer: v, at: new Date().toISOString(), by: myName }; else delete rfiAnswers[ta.dataset.ans];
      save(ANS_KEY, rfiAnswers);
    }));
  }
  let inboxRedraw = null, liveTimer = null;
  function onLive(kind) {
    if (kind === "status") { const st = document.getElementById("liveSt"); if (st) st.textContent = PT.rfiLive.status(); return; }
    clearTimeout(liveTimer); liveTimer = setTimeout(() => { if (inboxRedraw) inboxRedraw(); else if (!document.querySelector(".modal-backdrop")) render(); }, 300);
  }
  function openInbox() {
    let filter = "me";
    const draw = (el) => {
      const list = inbox().filter((x) => filter === "all" || toMe(x)).sort((a, b) => answered(a) - answered(b) || String(a.dueDate || "9").localeCompare(String(b.dueDate || "9")));
      $("#inboxList", el).innerHTML = list.map((x) => rfiCard(x.who, x)).join("") || `<p class="muted">No RFIs ${filter === "me" ? "sent to you" : ""} in the loaded files.</p>`;
      wireAnswers(el);
      const sel = () => $$("input[data-sel]:checked", el).map((c) => c.dataset.sel);
      const upd = () => { const n = sel().length; $("#delSel", el).disabled = !n; $("#delSel", el).textContent = n ? `🗑 Delete selected (${n})` : "🗑 Delete selected"; };
      $$("input[data-sel]", el).forEach((c) => (c.onchange = upd));
      $("#selAll", el).checked = false; upd();
    };
    const { el } = modal({
      title: "RFI inbox", wide: true, cancelLabel: "Close",
      extraButtons: `${PT.rfiLive?.enabled() ? '<button type="button" class="btn btn-primary" id="sendAns">📤 Send answers now</button>' : ""}<button type="button" class="btn ${PT.rfiLive?.enabled() ? "" : "btn-primary"}" id="dlAns">⤓ Download answers file</button>`,
      body: `${PT.rfiLive?.enabled() ? `<p class="small"><b>Live inbox: <span id="liveSt">${esc(PT.rfiLive.status())}</span></b> – RFIs apprentices send to you appear here by themselves (they need an internet connection). Type your answers, then <b>📤 Send answers now</b> – they show up in the apprentices' apps by themselves.</p>` : ""}
        <p class="small muted">RFIs from backup files you dropped in show here too. No internet in class? <b>Download answers file</b> and send that one file to the whole class; each apprentice opens
        <b>RFIs → Import instructor answers</b> and only <i>their</i> RFIs are updated to <b>Answered</b>.</p>
        <div class="row gap"><label class="inline">Answered by <input id="myName" value="${esc(myName)}" style="width:12em"></label>
        <label class="inline"><select id="inFilter"><option value="me">Sent to me</option><option value="all">All sent RFIs</option></select></label></div>
        <div class="row gap" style="margin:8px 0"><label class="check" style="margin:0"><input type="checkbox" id="selAll"> Select all shown</label>
          <button type="button" class="btn btn-sm btn-danger" id="delSel" disabled>🗑 Delete selected</button>
          <span class="muted small">Removes them from your inbox (test RFIs, duplicates, old classes). It doesn't change the apprentices' own apps.</span></div>
        <div id="inboxList"></div>`,
    });
    $("#myName", el).onchange = (e) => { myName = e.target.value.trim() || "Juan Rodarte"; save("pt-instructor-name", myName); };
    $("#inFilter", el).onchange = (e) => { filter = e.target.value; draw(el); };
    $("#dlAns", el).onclick = () => downloadAnswers();
    $("#selAll", el).onchange = (e) => { $$("input[data-sel]", el).forEach((c) => (c.checked = e.target.checked)); $$("input[data-sel]", el)[0]?.onchange?.(); };
    $("#delSel", el).onclick = () => {
      const ids = $$("input[data-sel]:checked", el).map((c) => c.dataset.sel);
      if (!ids.length) return;
      const bar = $("#delSel", el).closest(".row");
      bar.insertAdjacentHTML("afterend", `<div class="card" id="delConfirm" style="border-color:#c0392b"><b>Delete ${ids.length} RFI${ids.length === 1 ? "" : "s"} from your inbox?</b> This can't be undone.
        <div class="row gap" style="margin-top:6px"><button type="button" class="btn btn-danger" id="delYes">Yes, delete</button><button type="button" class="btn" id="delNo">Cancel</button></div></div>`);
      $("#delNo", el).onclick = () => $("#delConfirm", el).remove();
      $("#delYes", el).onclick = async () => {
        const liveIds = new Set((PT.rfiLive?.rfis() || []).map((x) => x.id));
        const cloud = ids.filter((id) => liveIds.has(id));
        for (const id of ids) { hiddenRfis[id] = new Date().toISOString(); delete rfiAnswers[id]; }
        save("pt-rfi-hidden", hiddenRfis); save(ANS_KEY, rfiAnswers);
        try { if (cloud.length) await PT.rfiLive.deleteRfis(cloud); toast(`Deleted ${ids.length} RFI${ids.length === 1 ? "" : "s"}`, "ok"); }
        catch (e) { toast("Hidden here, but couldn't remove them from the cloud (" + e.message + ")", "warn"); }
        $("#delConfirm", el)?.remove(); draw(el);
      };
    };
    $("#sendAns", el) && ($("#sendAns", el).onclick = async () => {
      const answers = Object.entries(rfiAnswers).filter(([id, a]) => a.answer && sentLive({ id })?.answer !== a.answer).map(([id, a]) => ({ id, answer: a.answer, answeredBy: a.by || myName, answeredAt: a.at }));
      if (!answers.length) return toast(Object.keys(rfiAnswers).length ? "All your answers were already sent" : "Type at least one answer first", "warn");
      try { await PT.rfiLive.sendAnswers(answers); toast(`Sent ${answers.length} answer${answers.length === 1 ? "" : "s"} – they appear in the apprentices' apps`, "ok"); draw(el); }
      catch (e) { toast("Could not send (" + e.message + ") – use Download answers file instead", "warn"); }
    });
    inboxRedraw = () => { if (!document.body.contains(el)) { inboxRedraw = null; return; } const st = $("#liveSt", el); if (st) st.textContent = PT.rfiLive.status(); if (!el.contains(document.activeElement) || document.activeElement.tagName !== "TEXTAREA") draw(el); };
    draw(el);
    el.addEventListener("click", (e) => { if (e.target === el || e.target.closest("[data-close]")) setTimeout(render); });
  }
  function downloadAnswers() {
    const answers = Object.entries(rfiAnswers).map(([id, a]) => ({ id, answer: a.answer, answeredBy: a.by || myName, answeredAt: a.at }));
    if (!answers.length) return toast("Type at least one answer first", "warn");
    download(`rfi-answers-${today()}.json`, JSON.stringify({ type: "plan-trainer-rfi-answers", version: 1, from: myName, createdAt: new Date().toISOString(), answers }, null, 1), "application/json");
    toast(`Answers file downloaded (${answers.length} answer${answers.length === 1 ? "" : "s"}) – send it to the class`, "ok");
  }

  function exportCSV() {
    const rows = shown().map(({ key, r }) => {
      const row = { Apprentice: r.name, Class: r.classYear, OverallPct: overall(key, r), Missions: `${r.done}/${ALL.length}` };
      for (const a of ASSESS) { const s = finalScore(key, r, a.id); row[a.title.replace(/[^\w ]+/g, "").trim()] = r.grades[a.id].needKey && !s.ov ? "" : `${s.earned}/${s.possible}${s.ov ? "*" : ""}`; }
      row.Notes = gradebook[key]?.notes || ""; row.LastActivity = r.lastAt || ""; row.File = r.file || "";
      return row;
    });
    download(`gradebook-${today()}.csv`, toCSV(rows), "text/csv");
  }

  document.addEventListener("DOMContentLoaded", () => { render(); PT.rfiLive && PT.rfiLive.startInstructor(onLive); });
})();
