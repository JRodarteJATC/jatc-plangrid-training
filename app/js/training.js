/* Guided training missions. Each mission has an automatic check that reads
   the app state, so apprentices get instant feedback and instructors get a
   verifiable progress report.                                             */
PT.training = (() => {
  const { esc, $, $$, fmtDateTime, toast } = PT.util;
  const store = PT.store;

  const L = (c) => store.list(c);
  const ev = (type, fn = () => true) => store.get().events.some((e) => e.type === type && e.projectId === store.pid() && fn(e));
  const sheetNo = (n) => L("sheets").find((s) => s.number === n);
  const markupsOn = (n, fn = () => true) => { const s = sheetNo(n); return s ? L("markups").filter((m) => m.sheetId === s.id && fn(m)) : []; };
  const A = PT.samples.answers;

  const MODULES = [
    { id: "m1", title: "Module 1 – Getting Around", doc: "docs/modules/01-getting-started.md", missions: [
      { id: "profile", title: "Set your name", how: "Settings → Your profile. Enter your real name and pick your class (curriculum week), then Save.", check: () => store.get().user.name !== "Apprentice" },
      { id: "open_r101", title: "Open the Roof Plan (R-101)", how: "Sheets → click R-101.", check: () => ev("sheet_open", (e) => e.number === "R-101") },
      { id: "search", title: "Use search to find 'drain'", how: "Type drain in the search box at the top and press Enter.", check: () => ev("search", (e) => /drain/.test(e.q)) },
      { id: "hyperlink", title: "Follow a detail callout hyperlink", how: "On R-101 find the callout bubble '2 / R-501' next to RD-2. In Select mode click it.", check: () => ev("hyperlink_follow") },
      { id: "open_spec", title: "Open a spec section in Documents", how: "Documents → Specifications → open 07 54 23 TPO Roofing.", check: () => ev("doc_open") },
    ] },
    { id: "m2", title: "Module 2 – Markups", doc: "docs/modules/02-markups.md", missions: [
      { id: "mk_any", title: "Draw any markup", how: "Open a sheet, pick Pen (P), Rectangle (R), or Cloud (C) and draw.", check: () => L("markups").length > 0 },
      { id: "mk_cloud_text", title: "Cloud an area and add a text note", how: "Use the Cloud tool (C) and the Text tool (T) on the same sheet.", check: () => L("sheets").some((s) => { const m = L("markups").filter((x) => x.sheetId === s.id); return m.some((x) => x.type === "cloud") && m.some((x) => x.type === "text"); }) },
      { id: "mk_publish", title: "Publish a markup to the team", how: "Select your markup (Select tool, click it) → Publish. Or use 'Publish all' in the side panel.", check: () => L("markups").some((m) => m.layer === "published") },
      { id: "mk_asbuilt", title: "Make an as-built markup", how: "Pick any drawing tool, set Layer = As-Built, and show a field change (e.g. pipe boot moved 2').", check: () => L("markups").some((m) => m.layer === "asbuilt") },
      { id: "mk_stamp", title: "Apply a stamp", how: "Stamp tool (S) → choose FIELD VERIFY → click the sheet.", check: () => L("markups").some((m) => m.type === "stamp") },
      { id: "mk_link", title: "Create your own hyperlink", how: "Hyperlink tool (Y) → drag a box around a note → link it to another sheet.", check: () => L("markups").some((m) => m.type === "link") },
    ] },
    { id: "m3", title: "Module 3 – Measure & Count (Takeoff)", doc: "docs/modules/03-measure-and-count.md", missions: [
      { id: "measure_parapet", title: "Measure the north parapet on R-101", how: "R-101 → Measure (M) → drag along the north parapet from the west corner to the east corner. Answer should be ≈100'-0\".", check: () => markupsOn("R-101", (m) => m.type === "measure").some((m) => m.value && Math.abs(m.value - A.parapetLength) <= 2) },
      { id: "area_b", title: "Find the area of Roof Area B", how: "R-101 → Area (G) → click the 4 corners of Roof Area B (area divider to east parapet) → double-click. Target ≈ 2,560 SF = 25.6 squares (±5%).", check: () => markupsOn("R-101", (m) => m.type === "area").some((m) => m.value && Math.abs(m.value - A.roofAreaB) / A.roofAreaB <= 0.05) },
      { id: "count_pipes", title: "Count every pipe penetration on the roof", how: "R-101 (current revision) → Count (N) → click every pipe penetration symbol (small circle with a dot) → Enter.", check: () => markupsOn("R-101", (m) => m.type === "count").some((m) => { const pts = A.penetrationPts(1); return m.points.length === pts.length && pts.every((q) => m.points.some((p) => Math.hypot(p[0] - q.x, p[1] - q.y) < 20)); }) },
      { id: "polylen", title: "Measure a multi-segment run", how: "W-101 → Path tool (U) → click around the footing drain (dashed line outside the wall) → double-click. Record the length on your worksheet.", check: () => L("markups").some((m) => m.type === "polylen") },
      { id: "calibrate", title: "Calibrate a sheet scale", how: "Open any plan → Calibrate (K) → drag along a printed dimension (R-101 has 100'-0\") → type the length.", check: () => ev("calibrate") },
    ] },
    { id: "m4", title: "Module 4 – Issues & Punch Lists", doc: "docs/modules/04-issues-and-punch.md", missions: [
      { id: "issue_pin", title: "Pin an issue on a sheet and assign it", how: "Open R-101 → Issue tool (I) → click a location → fill in title, assignee and due date.", check: () => L("issues").some((i) => i.x != null && i.createdBy === store.get().user.name && i.assignee && i.dueDate) },
      { id: "issue_photo", title: "Attach a photo to an issue", how: "Open an issue → + Add photo. (Any picture works for practice.)", check: () => L("issues").some((i) => (i.photoIds || []).length) },
      { id: "issue_comment", title: "Comment on an issue", how: "Open issue #1 → type in 'Add comment' → Save.", check: () => ev("comment") },
      { id: "punch_new", title: "Create 3 punch list items", how: "Punch List → + New punch item (or use Issue tool with Type = Punch).", check: () => L("issues").filter((i) => i.type === "Punch" && i.createdBy === store.get().user.name).length >= 3 },
      { id: "punch_close", title: "Close out a punch item", how: "Punch List → tick the ✓ box, or open it and set Status = Closed.", check: () => ev("issue_closed", (e) => e.kind === "Punch") },
      { id: "export_csv", title: "Export the punch list to CSV", how: "Punch List → Export CSV.", check: () => ev("export", (e) => e.what === "issues_csv") },
    ] },
    { id: "m5", title: "Module 5 – RFIs & Submittals", doc: "docs/modules/05-rfis-and-submittals.md", missions: [
      { id: "rfi_send", title: "Write and send an RFI", how: "RFIs → + New RFI → reference a sheet, assign the architect → Save & Send.", check: () => L("rfis").some((r) => r.createdBy === store.get().user.name && r.status !== "Draft" && (r.sheetIds || []).length) },
      { id: "rfi_close", title: "Record an answer and close an RFI", how: "Open an RFI that is Open → type the Official answer → Save. Then Close RFI.", check: () => L("rfis").some((r) => r.status === "Closed") },
      { id: "sub_new", title: "Log a submittal", how: "Submittals → + New → e.g. 07 62 00 Sheet Metal Flashing – Shop Drawings.", check: () => ev("submittal_created") },
    ] },
    { id: "m6", title: "Module 6 – Photos, Reports & Revisions", doc: "docs/modules/06-photos-reports-revisions.md", missions: [
      { id: "photo_pin", title: "Pin a photo to a sheet location", how: "Open a sheet → Photo tool (O) → click the location → choose a photo.", check: () => ev("photo_added", (e) => e.pinned) },
      { id: "daily", title: "Submit a daily report with manpower", how: "Reports → + Daily Report → add at least one crew row → Submit.", check: () => ev("report_submitted", (e) => e.kind === "Daily Report" && e.crew > 0) },
      { id: "toolbox", title: "Submit a toolbox talk with attendees", how: "Reports → + Toolbox Talk → list attendees → Submit.", check: () => ev("report_submitted", (e) => e.kind === "Toolbox Talk" && e.attendees > 0) },
      { id: "compare", title: "Compare two revisions of R-101", how: "Open R-101 → ⇄ Compare → pick Rev 0. Find what ASI-01 added (blue).", check: () => ev("compare") },
      { id: "upload", title: "Upload your own sheet or new version", how: "Sheets → Upload (a phone photo of a drawing or any PDF works).", check: () => ev("upload_sheet") || ev("upload_version") },
      { id: "team_add", title: "Add a team member", how: "Team → + Invite member (e.g. your journeyman or the manufacturer's rep).", check: () => ev("team_add") },
      { id: "backup", title: "Export your backup for the instructor", how: "Settings → Export backup (.json). Turn this file in.", check: () => ev("export", (e) => e.what === "backup") },
    ] },
  ];
  const ALL = MODULES.flatMap((m) => m.missions);

  function evaluate() {
    const done = store.get().training.completed;
    let changed = false;
    for (const m of ALL) {
      let ok = false; try { ok = !!m.check(); } catch { }
      if (ok && !done[m.id]) { done[m.id] = new Date().toISOString(); changed = true; toast(`✔ Mission complete: ${m.title}`, "ok"); }
    }
    return changed;
  }
  const progress = () => Math.round((Object.keys(store.get().training.completed).filter((k) => ALL.some((m) => m.id === k)).length / ALL.length) * 100);

  function view(root) {
    evaluate();
    const done = store.get().training.completed;
    root.innerHTML = `
      <div class="page-head"><h1>Training Missions</h1><div class="actions"><button class="btn" id="certBtn">🖨 Progress report</button></div></div>
      <div class="card"><div class="progress"><div style="width:${progress()}%"></div></div>
      <p><b>${progress()}%</b> complete – ${Object.keys(done).length} of ${ALL.length} missions. Missions check themselves automatically as you work in the app.
      Read the matching lesson in the <code>docs/</code> folder of the repo before each module.</p></div>
      ${MODULES.map((mod) => {
        const n = mod.missions.filter((m) => done[m.id]).length;
        return `<section class="card mission-mod"><h2>${esc(mod.title)} <span class="badge">${n}/${mod.missions.length}</span></h2><p class="muted small">Lesson: ${esc(mod.doc)}</p>
        <ol class="missions">${mod.missions.map((m) => `<li class="${done[m.id] ? "done" : ""}"><span class="chk">${done[m.id] ? "✔" : "○"}</span><div><b>${esc(m.title)}</b><div class="small">${esc(m.how)}</div>${done[m.id] ? `<div class="small muted">Completed ${fmtDateTime(done[m.id])}</div>` : ""}</div></li>`).join("")}</ol></section>`;
      }).join("")}`;
    $("#certBtn", root).onclick = printProgress;
  }

  function printProgress() {
    const s = store.get(), done = s.training.completed;
    const w = window.open("", "_blank"); if (!w) return toast("Allow pop-ups to print", "warn");
    w.document.write(`<!doctype html><title>Training progress</title><style>body{font-family:Arial;margin:30px}td,th{border:1px solid #999;padding:6px;font-size:13px}table{border-collapse:collapse;width:100%}</style>
      <h1>Construction Plan Software – Training Record</h1>
      <p><b>Apprentice:</b> ${esc(s.user.name)} &nbsp; <b>Class:</b> ${esc(s.user.classYear)} (JATC Standards, Exhibit C) &nbsp; <b>Printed:</b> ${new Date().toLocaleString()}</p>
      <p><b>Overall:</b> ${progress()}% (${Object.keys(done).length}/${ALL.length})</p>
      <table><tr><th>Module</th><th>Mission</th><th>Completed</th></tr>
      ${MODULES.flatMap((mod) => mod.missions.map((m) => `<tr><td>${esc(mod.title)}</td><td>${esc(m.title)}</td><td>${done[m.id] ? new Date(done[m.id]).toLocaleString() : "—"}</td></tr>`)).join("")}</table>
      <p style="margin-top:40px">Instructor signature: ______________________ Date: __________</p><script>setTimeout(()=>print(),300)<\/script>`);
    w.document.close();
  }

  return { MODULES, evaluate, progress, view };
})();
