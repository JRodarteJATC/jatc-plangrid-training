/* Instructor dashboard: load every apprentice backup at once and auto-grade
   quizzes, worksheets, lab work, the final, and training missions.
   Nothing is uploaded – files are read in this browser only.                */
(() => {
  const { esc, $, $$, h, toast, modal, download, toCSV, fmtDateTime, today } = PT.util;
  const G = PT.grading, Q = PT.quizzes;
  const A = PT.samples.answers;
  const MODS = PT.training.MODULES;
  const ALL = MODS.flatMap((m) => m.missions);
  const GB_KEY = "pt-gradebook-v2", KEY_KEY = "pt-grading-key";

  let students = [];
  let classFilter = "";
  const shown = () => students.filter((s) => !classFilter || s.r.classYear === classFilter);
  const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || "null") ?? d; } catch { return d; } };
  const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { } };
  let gradebook = load(GB_KEY, {});
  let gkey = load(KEY_KEY, null);

  const ASSESS = [
    ...["quiz1", "quiz2", "quiz3", "quiz4", "quiz5", "quiz6"].map((id, i) => ({ id, label: `Q${i + 1}`, title: Q.find(id).title, group: "Quizzes" })),
    ...[1, 2, 3, 4, 5, 6, 7].map((n) => ({ id: `lab${n}`, label: `L${n}`, title: `Lab ${n}`, group: "Labs" })),
    { id: "att", label: "AT&T", title: "AT&T Reroof Blueprint Exercise", group: "Blueprint" },
    { id: "final", label: "Final", title: "Final exam (written + practical)", group: "Final" },
  ];

  /* ---------- grading one apprentice ---------- */
  function analyze(state, file) {
    const prev = PT.store.swap(state);
    try {
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

      const resp = (state.quizzes || {})[state.activeProjectId] || {};
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
      r.rfis = L("rfis").filter((x) => x.createdBy === me);
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
  function regrade() {
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
      <details class="card"><summary><b>RFIs written (${r.rfis.length})</b></summary>${r.rfis.map((x) => `<p><b>RFI-${String(x.number).padStart(3, "0")}: ${esc(x.subject)}</b> <span class="badge">${esc(x.status)}</span></p><pre>Q: ${esc(x.question)}\n\nSuggested: ${esc(x.suggestion || "—")}\nCost: ${esc(x.costImpact)} • Schedule: ${esc(x.scheduleImpact)}${x.answer ? "\n\nAnswer: " + esc(x.answer) : ""}</pre>`).join("") || "<p class='muted'>None.</p>"}</details>
      <details class="card"><summary><b>Issues & punch (${r.issues.length})</b></summary>${r.issues.map((i) => `<p>#${i.number} <b>${esc(i.title)}</b> – ${esc(i.type)}, ${esc(i.status)}, ${esc(i.assignee || "unassigned")}, due ${esc(i.dueDate || "—")}, ${(i.photoIds || []).length} photo(s)</p>`).join("") || "<p class='muted'>None.</p>"}</details>
      <details class="card"><summary><b>Reports & forms (${r.reports.length})</b></summary>${r.reports.map((x) => `<p><b>${esc(x.type)} – ${esc(x.date)}</b> (${esc(x.status)})</p><pre>${esc(x.workPerformed || x.topic || x.task || "")}${x.delays ? "\nDelays: " + esc(x.delays) : ""}${x.attendees ? "\nAttendees: " + esc(x.attendees.split("\n").join(", ")) : ""}</pre>`).join("") || "<p class='muted'>None.</p>"}</details>
      <details class="card"><summary><b>Training missions ${r.done}/${ALL.length}</b></summary>${MODS.map((m) => `<p><b>${esc(m.title)}</b><br>${m.missions.map((x) => `${r.missions[x.id] ? "✔" : "○"} ${esc(x.title)}`).join("<br>")}</p>`).join("")}</details>
      <details class="card"><summary><b>Recent activity</b></summary><ul class="activity">${r.activity.map((a) => `<li><span class="muted">${fmtDateTime(a.at)}</span> ${esc(a.text)}</li>`).join("")}</ul></details>
    </div>`;
    const { el } = modal({ title: r.name, body, wide: true, cancelLabel: "Close", extraButtons: `<button type="button" class="btn" id="openApp">Open full project in app</button>` });
    $$("input[data-ov]", el).forEach((inp) => (inp.onchange = () => {
      const g = (gradebook[key] ||= {}); g.ov = g.ov || {};
      if (inp.value === "") delete g.ov[inp.dataset.ov]; else g.ov[inp.dataset.ov] = inp.value;
      save(GB_KEY, gradebook); render(); toast("Override saved", "ok");
    }));
    $("#openApp", el).onclick = () => PT.util.confirmBox("This replaces the project stored in THIS browser with the apprentice's work (export your own first if needed). Continue?", async () => {
      await PT.store.init(); PT.store.importJSON(JSON.stringify(stu.state)); setTimeout(() => (location.href = "index.html#/"), 800);
    }, "Open in app");
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

  document.addEventListener("DOMContentLoaded", render);
})();
