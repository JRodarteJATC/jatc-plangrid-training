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
      // the class roster, so apprentices can assign tasks to classmates
      for (const a of PT.roster.APPRENTICES) if (!have.some((t) => t.name === a.name)) s.team.push({ ...a, id: uid("usr"), projectId: p.id });
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
  const list = (coll) => state[coll].filter((r) => r.projectId === pid());
  const find = (coll, id) => state[coll].find((r) => r.id === id);

  function emit() { persist(); listeners.forEach((fn) => { try { fn(state); } catch (e) { console.error(e); } }); }
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
    if (i >= 0) state[coll].splice(i, 1);
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
    for (const a of obj.answers || []) {
      const r = state.rfis.find((x) => x.id === a.id);
      if (!r || !a.answer || r.answer === a.answer) continue;
      const prev = r.status;
      Object.assign(r, { answer: a.answer, answeredBy: a.answeredBy || obj.from || "Instructor", answeredAt: a.answeredAt || nowIso(), status: ["Draft", "Open"].includes(prev) ? "Answered" : prev, updatedAt: nowIso() });
      (r.history = r.history || []).push({ at: a.answeredAt || nowIso(), text: `${r.answeredBy}: answered${prev !== r.status ? ` (${prev} → ${r.status})` : ""}` });
      state.activity.unshift({ id: uid("act"), projectId: r.projectId, at: nowIso(), by: r.answeredBy, text: `Answered RFI-${r.number}: ${r.subject}` });
      state.events.push({ at: nowIso(), projectId: r.projectId, type: "rfi_answer_received", id: r.id });
      n++;
    }
    emit();
    return n;
  }

  /* Instructor dashboard: temporarily read another apprentice's backup without saving it. */
  function swap(s) { const prev = state; state = s; return prev; }
  // The Instructor Dashboard calls viewOnly() so nothing it does is ever written over this browser's saved project.
  function viewOnly(on = true) { readOnly = on; }

  return { applyRfiAnswers, viewOnly, swap, init, get, pid, project, list, find, add, update, remove, nextNumber, onChange, emit, log, event, newProject, resetAll, exportJSON, importJSON, today };
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
