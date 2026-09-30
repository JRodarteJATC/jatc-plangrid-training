/* App state + persistence (IndexedDB, falls back to memory).
   All records are plain objects so the whole project can be exported as JSON. */
PT.store = (() => {
  const { uid, nowIso, today } = PT.util;
  const DB_NAME = "plan-trainer", STORE = "kv", KEY = "state", VERSION = 4;
  let state = null;
  const listeners = new Set();

  /* ---------- IndexedDB ---------- */
  function idb() {
    return new Promise((res, rej) => {
      if (!("indexedDB" in window)) return rej(new Error("no idb"));
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error);
    });
  }
  async function load() {
    try {
      const db = await idb();
      return await new Promise((res) => {
        const r = db.transaction(STORE).objectStore(STORE).get(KEY);
        r.onsuccess = () => res(r.result || null);
        r.onerror = () => res(null);
      });
    } catch { return null; }
  }
  let saveTimer = null;
  let readOnly = false; // set while the Instructor Dashboard is looking at an apprentice's file
  function persist() {
    if (readOnly || !state) return; // never save someone else's file (or nothing) over this browser's own work
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      try {
        const db = await idb();
        db.transaction(STORE, "readwrite").objectStore(STORE).put(state, KEY);
      } catch (e) { console.warn("Save failed (data kept in memory only)", e); }
    }, 250);
  }

  /* The course instructor is on every project's team so apprentices can assign / send to him. */
  const INSTRUCTOR = PT.roster.INSTRUCTOR;
  function ensureInstructor(s) {
    for (const p of s.projects || []) {
      const have = (s.team || []).filter((t) => t.projectId === p.id);
      const ins = have.find((t) => t.name === INSTRUCTOR.name);
      if (!ins) s.team.push({ ...INSTRUCTOR, id: uid("usr"), projectId: p.id });
      else { if (!ins.email) ins.email = INSTRUCTOR.email; if (!ins.phone) ins.phone = INSTRUCTOR.phone; }
      // the instructor is a member of every team project (not counted in the team's grade)
      if (p.team) {
        p.team.members ||= [];
        if (!p.team.members.includes(INSTRUCTOR.name) && p.team.memberLog?.[INSTRUCTOR.name]?.in !== false) p.team.members.push(INSTRUCTOR.name);
      }
      // the class roster, so apprentices can assign tasks to classmates
      for (const a of PT.roster.APPRENTICES) {
        const t = have.find((t) => t.name === a.name);
        if (!t) s.team.push({ ...a, id: uid("usr"), projectId: p.id });
        else if (t.no == null) t.no = a.no; // roster number added later
      }
    }
  }

  /* ---------- seed data ---------- */
  function seedProject() {
    const pid = uid("prj");
    const p = { id: pid, name: "Central Valley Training Center – Bldg B", number: "JATC-2026-01", address: "1234 Example Ave, Fresno CA", createdAt: nowIso() };
    const team = [
      { id: uid("usr"), projectId: pid, name: "Maria Lopez", role: "Foreman", company: "Valley Roofing Co. (Roofers Local)", email: "mlopez@example.com", phone: "559-555-0101" },
      { id: uid("usr"), projectId: pid, name: "Dave Chen", role: "Project Manager", company: "ABC Builders (GC)", email: "dchen@example.com", phone: "559-555-0102" },
      { id: uid("usr"), projectId: pid, name: "Priya Shah", role: "Architect", company: "Sample Architects Inc.", email: "pshah@example.com", phone: "559-555-0103" },
      { id: uid("usr"), projectId: pid, name: "Tom Reyes", role: "Superintendent", company: "ABC Builders (GC)", email: "treyes@example.com", phone: "559-555-0104" },
      { id: uid("usr"), projectId: pid, name: "Ken Ito", role: "Manufacturer's Rep", company: "Sample Membrane Mfg. (Tech Services)", email: "kito@example.com", phone: "559-555-0105" },
      { ...INSTRUCTOR, id: uid("usr"), projectId: pid },
    ];
    // group sample sheets by number -> versions
    const sheets = [];
    for (const s of PT.samples.sheets) {
      let sh = sheets.find((x) => x.number === s.number);
      const ver = { id: uid("ver"), rev: s.rev || "0", date: s.date || "2026-08-15", set: s.set || "Bid Set", src: { kind: "sample", key: s.key }, w: PT.samples.W, h: PT.samples.H, scalePxPerFt: s.scalePxPerFt, links: s.links };
      if (!sh) { sh = { id: uid("sht"), projectId: pid, number: s.number, title: s.title, discipline: s.discipline, tags: [], versions: [], current: 0, createdAt: nowIso() }; sheets.push(sh); }
      sh.versions.push(ver); sh.current = sh.versions.length - 1;
    }
    const r101 = sheets.find((s) => s.number === "R-101");
    const w101 = sheets.find((s) => s.number === "W-101");
    const X = (f) => 150 + f * 12.5, Y = (f) => 230 + f * 12.5;
    const issues = [
      { id: uid("iss"), projectId: pid, number: 1, type: "Quality", title: "Ponding water next to RD-2 after rain", description: "About 1/2\" of water still standing 48 hrs after rain, 3' NE of RD-2. Check tapered sump and cricket.", status: "Open", priority: "High", assignee: "Maria Lopez", dueDate: "2026-10-02", location: "Roof Area A at RD-2", sheetId: r101.id, x: X(43), y: Y(29), photoIds: [], comments: [], createdBy: "Tom Reyes", createdAt: nowIso(), closedAt: null },
      { id: uid("iss"), projectId: pid, number: 2, type: "Punch", title: "Seam probe failed – RTU-1 curb NE corner", description: "Probe found 2\" unwelded lap at outside corner. Re-weld and add prefab corner.", status: "Open", priority: "Medium", assignee: "Maria Lopez", dueDate: "2026-10-09", location: "RTU-1 curb", sheetId: r101.id, x: X(26), y: Y(7.5), photoIds: [], comments: [], createdBy: "Ken Ito", createdAt: nowIso(), closedAt: null },
      { id: uid("iss"), projectId: pid, number: 3, type: "Issue", title: "Honeycomb in foundation wall – north side", description: "Rock pockets at cold joint near pipe sleeve. GC to patch before primer.", status: "In Review", priority: "High", assignee: "Tom Reyes", dueDate: "2026-09-30", location: "Basement north wall", sheetId: w101.id, x: 300 + 26 * 12.5, y: 300 - 6, photoIds: [], comments: [], createdBy: "Maria Lopez", createdAt: nowIso(), closedAt: null },
    ];
    const rfis = [
      { id: uid("rfi"), projectId: pid, number: 1, subject: "North parapet too low for 8\" base flashing", question: "Detail 1/R-501 requires 8\" min base flashing. At the north parapet the tapered insulation is 9.5\" thick (R-102), leaving only 7\" from finished roof to underside of coping. Please advise.", suggestion: "Add a 2x6 treated wood nailer on top of the parapet and raise the coping.", status: "Answered", assignedTo: "Priya Shah", dueDate: "2026-09-10", costImpact: "Yes", scheduleImpact: "No", sheetIds: [r101.id], answer: "Approved. Add (1) 2x6 treated nailer, fasten per FM 1-90. Submit change request for nailer + coping extension.", answeredBy: "Priya Shah", createdBy: "Maria Lopez", createdAt: nowIso(), history: [] },
    ];
    const submittals = [
      { id: uid("sub"), projectId: pid, number: "07 54 23-01", specSection: "07 54 23", title: "TPO Roofing System – Product Data & Warranty Letter", type: "Product Data", status: "Approved", dueDate: "2026-08-30", ballInCourt: "Maria Lopez", notes: "" },
      { id: uid("sub"), projectId: pid, number: "07 22 00-01", specSection: "07 22 00", title: "Tapered Insulation Layout", type: "Shop Drawings", status: "Revise & Resubmit", dueDate: "2026-09-20", ballInCourt: "Maria Lopez", notes: "Architect: show crickets at ALL curbs (1/2\":12\") and 1.5\" min at drains. Include RTU-4 per ASI-01." },
      { id: uid("sub"), projectId: pid, number: "07 62 00-01", specSection: "07 62 00", title: "Sheet Metal Coping & Counterflashing", type: "Shop Drawings", status: "Submitted", dueDate: "2026-10-05", ballInCourt: "Priya Shah", notes: "" },
      { id: uid("sub"), projectId: pid, number: "07 13 26-01", specSection: "07 13 26", title: "Self-Adhering Sheet Waterproofing", type: "Product Data", status: "Approved as Noted", dueDate: "2026-08-25", ballInCourt: "Maria Lopez", notes: "Use low-temperature primer when surface temp is below 40°F." },
    ];
    const docs = [
      { id: uid("doc"), projectId: pid, folder: "Specifications", name: "07 54 23 – TPO Roofing.txt", kind: "text", content: SPEC_075423, uploadedAt: nowIso(), seed: true },
      { id: uid("doc"), projectId: pid, folder: "Specifications", name: "07 13 26 – Self-Adhering Sheet Waterproofing.txt", kind: "text", content: SPEC_071326, uploadedAt: nowIso(), seed: true },
      { id: uid("doc"), projectId: pid, folder: "ASIs & Bulletins", name: "ASI-01 – RTU-4 Added.txt", kind: "text", content: ASI01, uploadedAt: nowIso(), seed: true },
      { id: uid("doc"), projectId: pid, folder: "Safety", name: "Toolbox Talk – Fall Protection on Low-Slope Roofs.txt", kind: "text", content: TBT_FALL, uploadedAt: nowIso(), seed: true },
    ];
    const reports = [
      { id: uid("rpt"), projectId: pid, type: "Daily Report", date: "2026-09-14", weather: "Sunny", tempHigh: "96", tempLow: "64", crew: [{ trade: "Roofer – JW", company: "Valley Roofing Co.", count: "3", hours: "8" }, { trade: "Apprentice", company: "Valley Roofing Co.", count: "2", hours: "8" }], workPerformed: "Roof Area A: installed vapor retarder and 2 layers flat polyiso, grid lines 0–30'. Set tapered panels around RD-1. Night seal installed at 30'.", delays: "Started 1 hr late – dew on deck.", safety: "Toolbox talk: warning lines & heat illness. Water/shade break every hour. No incidents.", equipment: "Hoist (1), hot-air welder (2), 60-ft boom (1)", visitors: "Ken Ito (Mfr rep) – deck & VR inspection", status: "Submitted", createdBy: "Maria Lopez", createdAt: nowIso() },
    ];
    return { project: p, team, sheets, issues, rfis, submittals, docs, reports };
  }

  function freshState() {
    const s = seedProject();
    const st = {
      version: VERSION,
      user: { name: "Apprentice", role: "Apprentice", classYear: PT.util.DEFAULT_CLASS },
      activeProjectId: s.project.id,
      projects: [s.project],
      team: s.team, sheets: s.sheets, issues: s.issues, rfis: s.rfis, submittals: s.submittals, docs: s.docs, reports: s.reports,
      markups: [], photos: [], activity: [], events: [],
      training: { completed: {} },
      settings: { defaultColor: "#e5322d" },
    };
    ensureInstructor(st);
    return st;
  }

  /* ---------- public API ---------- */
  async function init() {
    const saved = await load();
    state = saved && saved.version === VERSION ? saved : freshState();
    if (/^\d(st|nd|rd|th) Year$/.test(state.user?.classYear || "")) state.user.classYear = PT.util.DEFAULT_CLASS;
    ensureInstructor(state);
    persist();
    return state;
  }
  const get = () => state;
  const pid = () => state.activeProjectId;
  const project = () => state.projects.find((p) => p.id === pid());
  // In a team project, work by people who left or were removed is kept (for history) but not shown.
  const AUTHOR = (c, r) => (c === "photos" ? r.by : c === "docs" ? r.uploadedBy : r.createdBy);
  const WORK_COLLS = ["issues", "rfis", "reports", "markups", "photos", "docs"];
  function goneFrom(p) {
    const log = p?.team?.memberLog; if (!log) return null;
    const out = new Set(Object.entries(log).filter(([n, e]) => !e.in && !(p.team.members || []).includes(n)).map(([n]) => n));
    return out.size ? out : null;
  }
  const isInstructor = () => !!state?.user?.instructor;
  const isInstr = (n) => PT.roster.isInstructorName(n);
  const list = (coll) => {
    const id = pid(), arr = state[coll].filter((r) => r.projectId === id);
    if (!WORK_COLLS.includes(coll)) return arr;
    const gone = goneFrom(state.projects.find((p) => p.id === id));
    return gone ? arr.filter((r) => !gone.has(AUTHOR(coll, r))) : arr;
  };
  const find = (coll, id) => state[coll].find((r) => r.id === id);

  function emit() { if (!readOnly) trackChanges(); persist(); listeners.forEach((fn) => { try { fn(state); } catch (e) { console.error(e); } }); }
  const onChange = (fn) => (listeners.add(fn), () => listeners.delete(fn));

  function log(text) {
    state.activity.unshift({ id: uid("act"), projectId: pid(), at: nowIso(), by: state.user.name, text });
    if (state.activity.length > 500) state.activity.length = 500;
  }
  function event(type, data = {}) {
    state.events.push({ at: nowIso(), projectId: pid(), ...data, type });
    if (state.events.length > 2000) state.events.splice(0, 500);
    emit();
  }

  function add(coll, rec, logText) {
    rec.id = rec.id || uid(coll.slice(0, 3));
    rec.projectId = rec.projectId || pid();
    rec.createdAt = rec.createdAt || nowIso();
    state[coll].push(rec);
    if (logText) log(logText);
    emit();
    return rec;
  }
  function update(coll, id, patch, logText) {
    const r = find(coll, id);
    if (!r) return null;
    Object.assign(r, patch, { updatedAt: nowIso() });
    if (logText) log(logText);
    emit();
    return r;
  }
  function remove(coll, id, logText) {
    const i = state[coll].findIndex((r) => r.id === id);
    if (i >= 0) {
      const [r] = state[coll].splice(i, 1);
      // remember deletions so a teammate's copy doesn't bring the record back when you sync
      (state.tombstones ||= {})[id] = { at: nowIso(), coll, projectId: r.projectId };
    }
    if (logText) log(logText);
    emit();
  }
  const nextNumber = (coll) => list(coll).reduce((m, r) => Math.max(m, +r.number || 0), 0) + 1;

  function newProject(name, number, address) {
    const p = { id: uid("prj"), name, number, address, createdAt: nowIso() };
    state.projects.push(p);
    state.activeProjectId = p.id;
    state.team.push({ id: uid("usr"), projectId: p.id, name: state.user.name, role: state.user.role, company: "", email: "", phone: "" });
    ensureInstructor(state);
    log(`Created project ${name}`);
    emit();
    return p;
  }

  function resetAll() { state = freshState(); emit(); }
  function exportJSON() { return JSON.stringify(state); }
  function importJSON(text) {
    const s = JSON.parse(text);
    if (!s || !s.projects || !s.sheets) throw new Error("Not a Plan Trainer backup file");
    s.version = VERSION;
    ensureInstructor(s);
    state = s; emit();
  }

  /* Answers file from the instructor (RFI inbox in the Instructor Dashboard). One file for the whole
     class: only RFIs that exist in this browser are updated. Returns how many were applied.       */
  function applyRfiAnswers(obj) {
    if (!obj || obj.type !== "plan-trainer-rfi-answers") throw new Error("Not an RFI answers file");
    let n = 0;
    // one answer per RFI: an RFI copied between projects can match two answers (its own id and the original id) –
    // always use the newest one, and never go back to an older answer (that caused endless "answers received" messages)
    const best = new Map();
    for (const a of obj.answers || []) {
      if (!a?.answer) continue;
      for (const r of state.rfis.filter((x) => (x.id === a.id || (x.copiedFrom && x.copiedFrom === a.id)) && (!obj.onlyBy || x.createdBy === obj.onlyBy))) {
        const cur = best.get(r);
        if (!cur || String(a.answeredAt || "") > String(cur.answeredAt || "")) best.set(r, a);
      }
    }
    for (const [r, a] of best) {
      if (r.answer === a.answer) continue;
      if (r.answeredAt && a.answeredAt && String(r.answeredAt) > String(a.answeredAt) && r.answeredBy && r.answeredBy !== r.createdBy) continue;
      const prev = r.status;
      Object.assign(r, { answer: a.answer, answeredBy: a.answeredBy || obj.from || "Instructor", answeredAt: a.answeredAt || nowIso(), status: ["Draft", "Open"].includes(prev) ? "Answered" : prev, updatedAt: nowIso() });
      (r.history = r.history || []).push({ at: a.answeredAt || nowIso(), text: `${r.answeredBy}: answered${prev !== r.status ? ` (${prev} → ${r.status})` : ""}` });
      state.activity.unshift({ id: uid("act"), projectId: r.projectId, at: nowIso(), by: r.answeredBy, text: `Answered RFI-${r.number}: ${r.subject}` });
      state.events.push({ at: nowIso(), projectId: r.projectId, type: "rfi_answer_received", id: r.id });
      n++;
    }
    if (n) emit();
    return n;
  }


  /* ================= TEAM PROJECTS (share & merge, live sync) =================
     A team project is a normal project with project.team = { members: [...], sections: {...} }.
     Every record carries createdAt/updatedAt; deletions leave a tombstone. Merging keeps the newest copy
     of each record, so teammates can swap "team files" in any order, any number of times.            */
  const TEAM_COLLS = ["sheets", "markups", "issues", "rfis", "submittals", "docs", "reports", "photos", "team"];
  const stamp = (r) => r.updatedAt || r.createdAt || "";
  const sig = (r) => JSON.stringify(r, (k, v) => (k === "updatedAt" || k === "updatedBy" ? undefined : k === "dataUrl" && typeof v === "string" ? v.length + v.slice(-40) : v));
  let sigs = new Map(), sigsReady = false;
  const changed = new Set(); // "coll/id" changed locally since the live-sync layer last looked
  function teamProjectIds(st = state) { return new Set((st.projects || []).filter((p) => p.team).map((p) => p.id)); }
  function trackChanges() {
    if (!state) return;
    const ids = teamProjectIds(); if (!ids.size) return;
    const now = nowIso(), who = state.user?.name || "";
    for (const c of TEAM_COLLS) for (const r of state[c] || []) {
      if (!ids.has(r.projectId)) continue;
      const k = c + "/" + r.id, h = sig(r), old = sigs.get(k);
      if (old === h) continue;
      sigs.set(k, h);
      if (sigsReady && old !== undefined) { r.updatedAt = now; r.updatedBy = who; }
      if (sigsReady) changed.add(k);
    }
    if (changed.size > 5000) changed.clear(); // nobody is live-syncing
    for (const p of state.projects) if (ids.has(p.id)) { const k = "projects/" + p.id, h = sig(p); if (sigs.get(k) !== h) { if (sigsReady && sigs.has(k) && p.updatedAt !== "0") p.updatedAt = now; sigs.set(k, h); if (sigsReady) changed.add(k); } }
    for (const [id, t] of Object.entries(state.tombstones || {})) if (ids.has(t.projectId) && !sigs.has("x/" + id)) { sigs.set("x/" + id, 1); if (sigsReady) changed.add("tombstones/" + id); }
    sigsReady = true;
  }
  const takeChanges = () => { const out = [...changed]; changed.clear(); return out; };

  function shareFor(projectId, st = state) {
    const pick = (c) => (st[c] || []).filter((r) => r.projectId === projectId);
    return {
      type: "plan-trainer-team", version: 1, from: st.user?.name || "", exportedAt: nowIso(),
      project: st.projects.find((p) => p.id === projectId),
      records: Object.fromEntries(TEAM_COLLS.map((c) => [c, pick(c)])),
      activity: pick("activity").slice(0, 300),
      tombstones: Object.fromEntries(Object.entries(st.tombstones || {}).filter(([, t]) => t.projectId === projectId)),
    };
  }

  // Merge a teammate's team file (or a live-sync batch) into a state. Pure w.r.t. the given state object.
  function mergeTeam(st, share, { noEmit } = {}) {
    if (!share || share.type !== "plan-trainer-team" || !share.project) throw new Error("Not a team project file");
    const pid = share.project.id, stats = { added: 0, updated: 0, removed: 0 };
    st.tombstones ||= {};
    let p = st.projects.find((x) => x.id === pid);
    if (!p) { st.projects.push(JSON.parse(JSON.stringify(share.project))); stats.added++; }
    else {
      const before = p.team ? JSON.parse(JSON.stringify(p.team)) : null;
      if (stamp(share.project) > stamp(p)) Object.assign(p, JSON.parse(JSON.stringify(share.project)));
      // membership: the latest add/remove for each person wins, whichever file it came from
      if (before && p.team && share.project.team) Object.assign(p.team, mergeMembers(before, share.project.team));
    }
    for (const [id, t] of Object.entries(share.tombstones || {})) {
      const cur = st.tombstones[id];
      if (!cur || cur.at < t.at) st.tombstones[id] = { ...t };
      const arr = st[t.coll]; if (!arr) continue;
      const i = arr.findIndex((r) => r.id === id);
      if (i >= 0 && stamp(arr[i]) <= t.at) { arr.splice(i, 1); stats.removed++; }
    }
    for (const c of TEAM_COLLS) {
      st[c] ||= [];
      for (const inc of share.records?.[c] || []) {
        const tomb = st.tombstones[inc.id];
        if (tomb && tomb.at >= stamp(inc)) continue;
        const loc = st[c].find((r) => r.id === inc.id);
        if (!loc) {
          if (c === "team" && st.team.some((t) => t.projectId === pid && t.name === inc.name)) continue; // same person added on two devices
          st[c].push(JSON.parse(JSON.stringify(inc))); stats.added++;
        } else if (c === "sheets") {
          for (const v of inc.versions || []) if (!loc.versions.some((x) => x.id === v.id)) { loc.versions.push(JSON.parse(JSON.stringify(v))); stats.updated++; }
          if (stamp(inc) > stamp(loc)) { const vs = loc.versions; Object.assign(loc, JSON.parse(JSON.stringify({ ...inc, versions: undefined })), { versions: vs }); loc.current = Math.min(loc.current ?? 0, vs.length - 1); stats.updated++; }
        } else if (stamp(inc) > stamp(loc)) {
          for (const k of Object.keys(loc)) delete loc[k];
          Object.assign(loc, JSON.parse(JSON.stringify(inc))); stats.updated++;
        }
      }
    }
    // activity: union
    st.activity ||= [];
    const have = new Set(st.activity.map((a) => a.id));
    for (const a of share.activity || []) if (!have.has(a.id)) st.activity.push(a);
    st.activity.sort((a, b) => String(b.at).localeCompare(String(a.at)));
    // two teammates may both have made "RFI-001": the later one gets the next free number (same result on every device)
    for (const c of ["issues", "rfis"]) {
      const list = st[c].filter((r) => r.projectId === pid).sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)) || String(a.id).localeCompare(String(b.id)));
      const used = new Set();
      for (const r of list) {
        if (used.has(+r.number)) { r.number = Math.max(...list.map((x) => +x.number || 0)) + 1; stats.updated++; }
        used.add(+r.number);
      }
    }
    ensureInstructor(st);
    if (st === state) { sigsReady = false; trackChanges(); if (!noEmit) emit(); }
    return stats;
  }

  /* Team membership. memberLog[name] = { in: true|false, at, by } – the latest entry for a person wins,
     so a removal (or a re-add) survives syncing with teammates who still have the old member list. */
  function mergeMembers(a, b) {
    const log = { ...(a.memberLog || {}) };
    for (const [n, e] of Object.entries(b.memberLog || {})) if (!log[n] || String(log[n].at) < String(e.at)) log[n] = e;
    const names = [...new Set([...(a.members || []), ...(b.members || []), ...Object.keys(log)])];
    const members = names.filter((n) => (log[n] ? log[n].in : true));
    const sections = { ...(a.sections || {}), ...(b.sections || {}) };
    for (const k of Object.keys(sections)) if (sections[k] && !members.includes(sections[k])) sections[k] = "";
    return { members, memberLog: log, sections };
  }
  function setTeamMember(projectId, name, isIn) {
    const p = state.projects.find((x) => x.id === projectId); if (!p?.team || !name) return;
    const now = nowIso();
    p.team.memberLog = { ...(p.team.memberLog || {}), [name]: { in: !!isIn, at: now, by: state.user?.name || "" } };
    const set = new Set(p.team.members || []); isIn ? set.add(name) : set.delete(name);
    p.team.members = [...set];
    for (const k of Object.keys(p.team.sections || {})) if (p.team.sections[k] === name && !isIn) p.team.sections[k] = "";
    p.updatedAt = now;
    log(isIn ? `Added ${name} to team ${p.name}` : name === state.user?.name ? `Left team ${p.name}` : `Removed ${name} from team ${p.name}`);
    emit();
  }

  /* Moving a person's work in and out of a team project.
     Copies get new ids (and new RFI / issue numbers); pins, sheet references and markups follow the sheet NUMBER. */
  function copyWork(fromPid, toPid, who, move = false, skip = null) {
    const sheetMap = {};
    const toSheets = state.sheets.filter((s) => s.projectId === toPid);
    for (const s of state.sheets.filter((s) => s.projectId === fromPid)) {
      const t = toSheets.find((x) => x.number === s.number);
      if (t) sheetMap[s.id] = { id: t.id, ver: t.versions[t.current]?.id };
    }
    const ISS = ["issues", "rfis", "reports"];
    const src = (c) => state[c].filter((r) => r.projectId === fromPid && AUTHOR(c, r) === who && !r.seed && !(skip && skip(r)));
    const picked = { issues: src("issues"), rfis: src("rfis"), reports: src("reports"), docs: src("docs"), markups: src("markups").filter((m) => m.layer === "published") };
    const photoIds = new Set(ISS.flatMap((c) => picked[c].flatMap((r) => r.photoIds || [])));
    picked.photos = state.photos.filter((ph) => ph.projectId === fromPid && (photoIds.has(ph.id) || (AUTHOR("photos", ph) === who && ph.issueId && picked.issues.some((i) => i.id === ph.issueId))));
    const idMap = {};
    for (const [c, rs] of Object.entries(picked)) for (const r of rs) idMap[r.id] = uid(c.slice(0, 3));
    const nextNum = (c) => state[c].filter((r) => r.projectId === toPid).reduce((m, r) => Math.max(m, +r.number || 0), 0) + 1;
    const now = nowIso(), counts = {};
    for (const c of ["photos", "docs", "issues", "rfis", "reports", "markups"]) for (const r of picked[c]) {
      const x = JSON.parse(JSON.stringify(r));
      x.id = idMap[r.id]; x.projectId = toPid; x.copiedFrom = r.copiedFrom || r.id; x.updatedAt = now; // copiedFrom = the very first id (same RFI in the instructor's inbox)
      if (x.sheetId) {
        const m = sheetMap[x.sheetId];
        if (m) { x.sheetId = m.id; if (x.versionId) x.versionId = m.ver; }
        else if (c === "markups") continue;
        else { x.sheetId = null; x.x = null; x.y = null; }
      }
      if (Array.isArray(x.sheetIds)) x.sheetIds = x.sheetIds.map((id) => sheetMap[id]?.id).filter(Boolean);
      if (Array.isArray(x.photoIds)) x.photoIds = x.photoIds.map((id) => idMap[id]).filter(Boolean);
      if (x.issueId) x.issueId = idMap[x.issueId] || null;
      if (c === "issues" || c === "rfis") x.number = nextNum(c);
      state[c].push(x); counts[c] = (counts[c] || 0) + 1;
    }
    if (move) for (const [c, rs] of Object.entries(picked)) { const ids = new Set(rs.map((r) => r.id)); state[c] = state[c].filter((r) => !ids.has(r.id)); }
    return counts;
  }
  const describe = (k) => {
    const parts = [["issues", "issue/task/punch item"], ["rfis", "RFI"], ["reports", "report"], ["docs", "document"], ["photos", "photo"]]
      .filter(([c]) => k[c]).map(([c, w]) => `${k[c]} ${w}${k[c] > 1 ? "s" : ""}`);
    return parts.join(", ");
  };
  // When you join (or start) a team: copy your work from your own project into the team, once.
  function importMyWork(teamPid) {
    const who = state.user?.name; const team = state.projects.find((p) => p.id === teamPid);
    state.teamLocal ||= { imported: {}, movedOut: {} };
    if (!team?.team || !who || state.teamLocal.imported[teamPid] || isInstructor()) return null;
    state.teamLocal.imported[teamPid] = nowIso();
    const score = (p) => ["issues", "rfis", "reports"].reduce((n, c) => n + state[c].filter((r) => r.projectId === p.id && AUTHOR(c, r) === who && !r.seed).length, 0);
    const from = state.projects.filter((p) => !p.team && p.id !== teamPid).map((p) => ({ p, n: score(p) })).sort((a, b) => b.n - a.n)[0];
    if (!from || !from.n) { emit(); return null; }
    (state.teamLocal.from ||= {})[teamPid] = from.p.id;
    const counts = copyWork(from.p.id, teamPid, who);
    log(`Brought my work from ${from.p.name} into team ${team.name}`);
    emit();
    return { from: from.p.name, what: describe(counts) };
  }
  // When you leave (or are removed from) a team: the work you did IN the team goes back to the project you came from
  // (what you had before joining is still there). If the team used other plans, it goes to "<team> – my work".
  // Either way it is hidden from the team.
  function takeMyWork(teamPid) {
    const who = state.user?.name; const team = state.projects.find((p) => p.id === teamPid);
    state.teamLocal ||= { imported: {}, movedOut: {} };
    if (!team?.team || !who || state.teamLocal.movedOut[teamPid] || isInstructor()) return null;
    state.teamLocal.movedOut[teamPid] = nowIso();
    const home = state.projects.find((p) => p.id === state.teamLocal.from?.[teamPid] && !p.team)
      || state.projects.filter((p) => !p.team && p.id !== teamPid).sort((a, b) => ["issues", "rfis", "reports"].reduce((n, c) => n + state[c].filter((r) => r.projectId === b.id && AUTHOR(c, r) === who).length, 0) - ["issues", "rfis", "reports"].reduce((n, c) => n + state[c].filter((r) => r.projectId === a.id && AUTHOR(c, r) === who).length, 0))[0];
    // things that were copied in from the home project are still there – don't bring them back twice
    const homeRoots = new Set(home ? ["issues", "rfis", "reports", "docs", "photos", "markups"].flatMap((c) => state[c].filter((r) => r.projectId === home.id).map((r) => r.copiedFrom || r.id)) : []);
    const skip = (r) => homeRoots.has(r.copiedFrom || r.id);
    const moving = ["issues", "rfis", "reports", "docs"].flatMap((c) => state[c].filter((r) => r.projectId === teamPid && AUTHOR(c, r) === who && !skip(r)));
    if (!moving.length) { if (home && state.activeProjectId === teamPid) state.activeProjectId = home.id; emit(); return home ? { to: home.name, what: "" } : null; }
    const teamSheetNums = new Set(state.sheets.filter((s) => s.projectId === teamPid).map((s) => s.number));
    const homeNums = new Set(home ? state.sheets.filter((s) => s.projectId === home.id).map((s) => s.number) : []);
    const used = new Set(moving.flatMap((r) => [r.sheetId, ...(r.sheetIds || [])]).filter(Boolean).map((id) => state.sheets.find((s) => s.id === id)?.number).filter(Boolean));
    let target = home && [...used].every((n) => homeNums.has(n)) ? home : null;
    if (!target) {
      target = { id: uid("prj"), name: `${team.name} – my work`, number: team.number || "", address: team.address || "", createdAt: nowIso(), leftTeam: teamPid };
      state.projects.push(target);
      for (const s of state.sheets.filter((s) => s.projectId === teamPid && teamSheetNums.has(s.number))) state.sheets.push({ ...JSON.parse(JSON.stringify(s)), id: uid("sht"), projectId: target.id });
      for (const tm of state.team.filter((x) => x.projectId === teamPid)) state.team.push({ ...tm, id: uid("usr"), projectId: target.id });
    }
    const counts = copyWork(teamPid, target.id, who, true, skip);
    if (state.activeProjectId === teamPid) state.activeProjectId = target.id;
    log(`Moved my team work from ${team.name} into ${target.name}`);
    sigsReady = false; trackChanges(); emit();
    return { to: target.name, what: describe(counts) };
  }
  // Called after any sync / membership change on this device.
  function teamCheck(teamPid) {
    const p = state.projects.find((x) => x.id === teamPid); const who = state.user?.name;
    if (!p?.team || !who) return null;
    state.teamLocal ||= { imported: {}, movedOut: {} };
    if ((p.team.members || []).includes(who)) {
      if (state.teamLocal.movedOut[teamPid]) delete state.teamLocal.movedOut[teamPid]; // added back
      const r = importMyWork(teamPid); return r && { joined: true, ...r };
    }
    if (p.team.memberLog?.[who] && !p.team.memberLog[who].in) { const r = takeMyWork(teamPid); return r && { left: true, ...r }; }
    return null;
  }

  function newTeamProject({ name, members, withSamples }) {
    let p;
    if (withSamples) {
      const s = seedProject();
      p = s.project; p.name = name; p.number = "TEAM";
      state.projects.push(p);
      for (const c of ["team", "sheets", "submittals", "docs"]) state[c].push(...s[c]);
    } else {
      p = { id: uid("prj"), name, number: "TEAM", address: "", createdAt: nowIso() };
      state.projects.push(p);
    }
    p.team = { members: [...new Set([state.user.name, ...members])], sections: {}, createdBy: state.user.name, createdAt: nowIso() };
    p.updatedAt = nowIso();
    state.activeProjectId = p.id;
    ensureInstructor(state);
    log(`Started team project ${name} (${p.team.members.join(", ")})`);
    emit();
    return p;
  }

  /* Instructor dashboard: temporarily read another apprentice's backup without saving it. */
  function swap(s) { const prev = state; state = s; return prev; }
  // The Instructor Dashboard calls viewOnly() so nothing it does is ever written over this browser's saved project.
  function viewOnly(on = true) { readOnly = on; }

  return { isInstructor, TEAM_COLLS, shareFor, mergeTeam, setTeamMember, teamCheck, importMyWork, takeMyWork, newTeamProject, takeChanges, teamProjectIds, applyRfiAnswers, viewOnly, swap, init, get, pid, project, list, find, add, update, remove, nextNumber, onChange, emit, log, event, newProject, resetAll, exportJSON, importJSON, today };
})();


/* ---------- sample document text (fictional, abbreviated for training) ---------- */
const SPEC_075423 = `SECTION 07 54 23 – THERMOPLASTIC POLYOLEFIN (TPO) ROOFING
(Training sample – abbreviated)

PART 1 – GENERAL
1.1 SUMMARY
 A. Fully adhered 60-mil TPO membrane over tapered polyiso insulation and cover board.
1.2 SUBMITTALS
 A. Product data, tapered insulation layout, sheet metal shop drawings.
 B. Manufacturer's letter confirming project qualifies for 20-year NDL warranty.
1.3 QUALITY ASSURANCE
 A. Installer: approved by manufacturer, 5 years experience.
 B. Pre-installation conference at site before roofing starts.
1.4 FIELD CONDITIONS
 A. Do not install when rain or snow is expected. Substrate must be dry.
 B. Bonding adhesive: follow manufacturer's minimum temperature limits.

PART 2 – PRODUCTS
2.1 MEMBRANE
 A. TPO, 60 mil, reinforced, white, ASTM D6878.
2.2 INSULATION
 A. Polyiso, ASTM C1289. Tapered 1/4":12", 1.5" minimum at low points.
 B. Cover board: 1/2" high-density polyiso.
2.3 ACCESSORIES
 A. Premolded pipe boots, prefab inside/outside corners, walkway pads,
    termination bar, water block, cut-edge sealant.

PART 3 – EXECUTION
3.1 INSTALLATION
 A. Install only as much roofing as can be made watertight the same day.
 B. Stagger insulation joints 12" min between layers.
 C. Laps: shingle toward drains. Heat-weld all seams, 1-1/2" min weld width.
 D. Base flashing: min 8" above finished roof surface, terminated with
    termination bar and counterflashing/coping.
 E. Night seals / temporary tie-ins at end of each day; remove before resuming.
3.2 FIELD QUALITY CONTROL
 A. Probe all welded seams daily with a seam probe. Repair voids same day.
 B. Take test cuts as required by manufacturer; patch cut areas.
 C. Manufacturer's final inspection required for warranty.
END OF SECTION`;

const SPEC_071326 = `SECTION 07 13 26 – SELF-ADHERING SHEET WATERPROOFING
(Training sample – abbreviated)

PART 1 – GENERAL
1.1 SUMMARY
 A. Below-grade foundation wall waterproofing, protection board and drainage composite.
 B. Pre-applied (blindside) HDPE membrane at elevator pit.
1.2 FIELD CONDITIONS
 A. Concrete cured minimum 7 days; surface dry, clean and free of voids,
    honeycomb and fins. Report defects to GC before starting.
 B. Do not apply below 40°F without low-temperature primer.

PART 2 – PRODUCTS
2.1 MEMBRANE: 60-mil rubberized asphalt on cross-laminated polyethylene film.
2.2 PROTECTION BOARD: 1/8" asphalt-core board.
2.3 DRAINAGE COMPOSITE: dimpled core with filter fabric.
2.4 WATERSTOP: hydrophilic, at all cold joints.

PART 3 – EXECUTION
3.1 SURFACE PREP: patch honeycomb, grind fins, prime same day as membrane.
3.2 INSTALLATION
 A. Apply 2-ply reinforcing strip at inside/outside corners and wall-footing joint.
 B. Laps: 2-1/2" side and end laps; roll laps firmly.
 C. Terminate at grade with termination bar and mastic.
 D. Install protection board and drainage composite same day.
3.3 FIELD QUALITY CONTROL
 A. Inspect, photograph and document before backfill.
 B. Elevator pit: 24-hour flood test before topping slab.
END OF SECTION`;

const ASI01 = `ARCHITECT'S SUPPLEMENTAL INSTRUCTION – ASI-01
Project: Central Valley Training Center – Bldg B
Date: 09/12/2026

Description:
 1. Add rooftop unit RTU-4 in Roof Area B per revised R-101 Rev 1.
    RTU-4 ships on a 14" high x 8' x 5' prefabricated curb (by mechanical),
    set on the steel deck.
 2. Provide cricket on the upslope side of the RTU-4 curb, 1/2":12".
 3. Extend walkway pads to RTU-4.
 4. Add (1) pipe penetration (condensate vent) near the east parapet.

Contractor shall proceed with the work. If the contractor believes this ASI
results in a change to contract sum or time, submit an RFI / change request
within 7 days.

Revised sheets: R-101 (Rev 1)`;

const TBT_FALL = `TOOLBOX TALK – FALL PROTECTION ON LOW-SLOPE ROOFS

Why it matters:
Falls are the leading cause of death in roofing. Most happen at roof edges,
skylights, roof hatches and holes.

Key points:
 1. Know the roof's fall protection plan before you go up (see R-101 for the
    roof hatch RH-1, skylight SK-1 and edges).
 2. Warning lines: set at least 6 ft back from unprotected edges (OSHA 1926.502(f)).
    Outside the warning line = guardrail, safety net or personal fall arrest.
 3. Skylights are holes. Cover or guard SK-1 before work starts.
 4. Keep the roof hatch closed or guarded when not in use.
 5. Inspect harness and lanyard before every use.
 6. Heat: water, rest, shade. Watch your partner for heat illness.

Discussion questions:
 - Where are the unprotected edges on this roof today?
 - Who is the competent person on this crew?

Sign-in: record attendance in the Toolbox Talk form in the Reports tab.`;
