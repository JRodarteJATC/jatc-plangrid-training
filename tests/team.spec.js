// Team projects: share & merge team files between two apprentices, team grading, and live sync
// (live sync runs against a fake Firebase served in place of the real library).
const { test, expect } = require("@playwright/test");
const fs = require("fs");

async function fresh(page, name) {
  await page.goto("/");
  await page.evaluate(() => new Promise((r) => { const q = indexedDB.deleteDatabase("plan-trainer"); q.onsuccess = q.onerror = q.onblocked = () => r(); }));
  await page.reload();
  await page.goto("/#/settings");
  await page.fill("#prof input[name=name]", name);
  await page.click("#prof button.btn-primary");
  await page.waitForTimeout(300);
}
const S = (page, fn, arg) => page.evaluate(fn, arg);
async function sendTeamFile(page) {
  await page.goto("/#/teamproject");
  const dl = page.waitForEvent("download");
  await page.click("[data-send]");
  return fs.readFileSync(await (await dl).path());
}
async function syncFiles(page, bufs) {
  await page.goto("/#/teamproject");
  const ch = page.waitForEvent("filechooser");
  await page.click("#joinBtn");
  await (await ch).setFiles(bufs.map((b, i) => ({ name: `team${i}.json`, mimeType: "application/json", buffer: b })));
  await page.waitForTimeout(400);
}
const addRfi = (page, subject) => S(page, (subject) => PT.store.add("rfis", { number: PT.store.nextNumber("rfis"), subject, question: "Question text long enough to be a real field question about the drawings.", assignedTo: "Juan Rodarte", status: "Open", sentDate: "2026-10-06", dueDate: "2026-10-09", sheetIds: [], createdBy: PT.store.get().user.name }), subject);

test("two apprentices build one team project by swapping team files", async ({ browser }) => {
  const A = await (await browser.newContext({ acceptDownloads: true })).newPage();
  const B = await (await browser.newContext({ acceptDownloads: true })).newPage();
  const errs = []; for (const p of [A, B]) p.on("pageerror", (e) => errs.push(e.message));
  await fresh(A, "Mateo Ramirez");
  await fresh(B, "Luis Herrera");

  // A starts the team project with Luis, using the sample drawings
  await A.goto("/#/teamproject");
  await A.click("#startBtn");
  await A.fill(".modal input[name=name]", "Team 1");
  await A.check(".modal input[name=m][value='Luis Herrera']");
  await A.click(".modal button[type=submit]");
  await expect(A.locator(".team-card")).toContainText("Mateo Ramirez");
  expect(await S(A, () => PT.store.list("sheets").length)).toBeGreaterThan(5);

  // B joins with A's file
  let fa = await sendTeamFile(A);
  await syncFiles(B, [fa]);
  expect(await S(B, () => PT.store.project().name)).toBe("Team 1");
  expect(await S(B, () => PT.store.list("sheets").length)).toBe(await S(A, () => PT.store.list("sheets").length));

  // both work at the same time – each makes RFI #1, B writes a daily report, A makes a task
  await addRfi(A, "A's RFI"); await addRfi(B, "B's RFI");
  await S(B, () => PT.store.add("reports", { type: "Daily Report", date: "2026-10-06", status: "Submitted", createdBy: "Luis Herrera", workPerformed: "Installed base sheet Area A.", crew: [] }));
  const taskId = await S(A, () => PT.store.add("issues", { type: "Task", number: PT.store.nextNumber("issues"), title: "Move conduit", status: "Open", createdBy: "Mateo Ramirez", photoIds: [], comments: [] }).id);

  // swap files both ways
  fa = await sendTeamFile(A); const fb = await sendTeamFile(B);
  await syncFiles(A, [fb]); await syncFiles(B, [fa]);
  for (const P of [A, B]) {
    const rf = await S(P, () => PT.store.list("rfis").map((r) => `${r.number}:${r.subject}`).sort());
    expect(rf).toEqual(["1:A's RFI", "2:B's RFI"].sort((a, b) => a.localeCompare(b)).sort());
    expect(await S(P, () => PT.store.list("reports").filter((r) => r.type === "Daily Report").length)).toBe(1);
    expect(await S(P, (id) => !!PT.store.find("issues", id), taskId)).toBe(true);
  }
  // an edit and a delete travel too
  await S(B, (id) => { PT.store.remove("issues", id); }, taskId);
  await S(B, () => { const r = PT.store.list("rfis").find((x) => x.subject === "A's RFI"); r.suggestion = "Edited by Luis"; PT.store.emit(); });
  await syncFiles(A, [await sendTeamFile(B)]);
  expect(await S(A, (id) => !!PT.store.find("issues", id), taskId)).toBe(false);
  expect(await S(A, () => PT.store.list("rfis").find((x) => x.subject === "A's RFI").suggestion)).toBe("Edited by Luis");

  // dashboard: one team score for both + who did what
  const bA = Buffer.from(await S(A, () => PT.store.exportJSON())), bB = Buffer.from(await S(B, () => PT.store.exportJSON()));
  await A.goto("/instructor.html");
  const ch = A.waitForEvent("filechooser"); await A.click("#pickBtn");
  await (await ch).setFiles([{ name: "a.json", mimeType: "application/json", buffer: bA }, { name: "b.json", mimeType: "application/json", buffer: bB }]);
  const cells = await A.locator("td[title^='3A PlanGrid']").allTextContents();
  expect(cells.length).toBe(2); expect(cells[0]).toBe(cells[1]);
  await A.click("[data-stu='luis herrera']");
  await expect(A.locator(".modal")).toContainText("TEAM PROJECT – Mateo Ramirez, Luis Herrera");
  expect(errs).toEqual([]);
});

test("remove a teammate, leave a team, and add someone back – survives syncing old files", async ({ browser }) => {
  const mk = async () => (await browser.newContext({ acceptDownloads: true })).newPage();
  const A = await mk(), B = await mk(), C = await mk();
  const errs = []; for (const p of [A, B, C]) p.on("pageerror", (e) => errs.push(e.message));
  await fresh(A, "Mateo Ramirez"); await fresh(B, "Luis Herrera"); await fresh(C, "Adrian Castillo");
  await A.goto("/#/teamproject"); await A.click("#startBtn");
  await A.fill(".modal input[name=name]", "Team 2");
  await A.check(".modal input[name=m][value='Luis Herrera']"); await A.check(".modal input[name=m][value='Adrian Castillo']");
  await A.click(".modal button[type=submit]");
  const fa = await sendTeamFile(A);
  await syncFiles(B, [fa]); await syncFiles(C, [fa]);
  const members = (P) => S(P, () => PT.store.get().projects.find((p) => p.name === "Team 2").team.members.slice().sort());

  // A removes Luis in the app
  await A.goto("/#/teamproject");
  await A.click("[data-rm='Luis Herrera']"); await A.click(".modal button.btn-primary, .modal .btn-danger");
  expect(await members(A)).toEqual(["Adrian Castillo", "Mateo Ramirez"]);
  // Luis still has the old list; syncing his (older) file back must not re-add him
  const fb = await sendTeamFile(B);
  await syncFiles(A, [fb]);
  expect(await members(A)).toEqual(["Adrian Castillo", "Mateo Ramirez"]);
  // Luis gets A's file: he sees he was removed, and is not re-added
  await syncFiles(B, [await sendTeamFile(A)]);
  expect(await members(B)).toEqual(["Adrian Castillo", "Mateo Ramirez"]);
  await expect(B.locator(".team-card")).toContainText("no longer on this team");

  // Diego leaves on his own; A gets it from Diego's file
  await syncFiles(C, [await sendTeamFile(A)]);
  await C.goto("/#/teamproject"); await C.click("[data-leave]"); await C.click(".modal button.btn-primary, .modal .btn-danger");
  await syncFiles(A, [await sendTeamFile(C)]);
  expect(await members(A)).toEqual(["Mateo Ramirez"]);
  await expect(A.locator(".team-card")).toContainText("left the team");

  // A adds Luis back
  await A.goto("/#/teamproject"); await A.click("[data-add]");
  await A.selectOption(".modal select[name=n]", "Luis Herrera"); await A.click(".modal button[type=submit]");
  await syncFiles(B, [await sendTeamFile(A)]);
  expect(await members(B)).toEqual(["Luis Herrera", "Mateo Ramirez"]);
  expect(errs).toEqual([]);
});

test("joining brings your earlier work into the team; leaving takes it out and hides it", async ({ browser }) => {
  const mk = async () => (await browser.newContext({ acceptDownloads: true })).newPage();
  const A = await mk(), B = await mk();
  const errs = []; for (const p of [A, B]) p.on("pageerror", (e) => errs.push(e.message));
  await fresh(A, "Mateo Ramirez"); await fresh(B, "Luis Herrera");
  // Luis worked in the sample project before joining: a pinned task with a photo, an RFI on R-101, a punch item, a daily report
  await S(B, () => {
    const me = "Luis Herrera", r101 = PT.store.list("sheets").find((s) => s.number === "R-101").id;
    const ph = PT.store.add("photos", { dataUrl: "data:image/png;base64,iVBORw0KGgo=", caption: "curb", by: me });
    PT.store.add("issues", { type: "Task", number: PT.store.nextNumber("issues"), title: "Luis task", status: "Open", createdBy: me, sheetId: r101, x: 100, y: 100, photoIds: [ph.id], comments: [] });
    PT.store.add("issues", { type: "Punch", number: PT.store.nextNumber("issues"), title: "Luis punch", status: "Open", createdBy: me, photoIds: [], comments: [] });
    PT.store.add("rfis", { number: PT.store.nextNumber("rfis"), subject: "Luis RFI", question: "q", status: "Open", createdBy: me, sheetIds: [r101] });
    PT.store.add("reports", { type: "Daily Report", date: "2026-10-05", status: "Submitted", createdBy: me, workPerformed: "Luis daily", crew: [] });
  });
  const before = await S(B, () => PT.store.list("issues").length);
  await A.goto("/#/teamproject"); await A.click("#startBtn"); await A.fill(".modal input[name=name]", "Team 3");
  await A.check(".modal input[name=m][value='Luis Herrera']"); await A.click(".modal button[type=submit]");
  await S(A, () => PT.store.add("rfis", { number: PT.store.nextNumber("rfis"), subject: "Mateo RFI", question: "q", status: "Open", createdBy: "Mateo Ramirez", sheetIds: [] }));
  await syncFiles(B, [await sendTeamFile(A)]);
  // B now sees his earlier work in the team project, pinned on the team's R-101, with the photo
  const got = await S(B, () => {
    const L = PT.store.list, r101 = L("sheets").find((s) => s.number === "R-101").id, task = L("issues").find((i) => i.title === "Luis task");
    return { proj: PT.store.project().name, titles: L("issues").filter((i) => /Luis/.test(i.title)).map((i) => i.title).sort(), rfis: L("rfis").map((r) => r.subject).sort(),
      daily: L("reports").some((r) => r.workPerformed === "Luis daily"), pinned: task.sheetId === r101, photo: task.photoIds.length === 1 && !!PT.store.find("photos", task.photoIds[0]),
      rfiSheet: L("rfis").find((r) => r.subject === "Luis RFI").sheetIds[0] === r101 };
  });
  expect(got).toEqual({ proj: "Team 3", titles: ["Luis punch", "Luis task"], rfis: ["Luis RFI", "Mateo RFI"], daily: true, pinned: true, photo: true, rfiSheet: true });
  // his original sample project still has it (labs are graded there)
  expect(await S(B, () => { const p = PT.store.get().projects.find((x) => !x.team); return PT.store.get().issues.filter((i) => i.projectId === p.id && /Luis/.test(i.title)).length; })).toBe(2);
  for (const h of ["#/issues", "#/rfis", "#/punch", "#/reports"]) { await B.goto("/" + h); await expect(B.locator("#main")).toContainText("Luis"); }
  // A gets Luis's work
  await syncFiles(A, [await sendTeamFile(B)]);
  expect(await S(A, () => PT.store.list("rfis").map((r) => r.subject).sort())).toEqual(["Luis RFI", "Mateo RFI"]);
  // Luis makes one more RFI inside the team, then leaves: he goes back to his own project, which still has everything
  // he had before joining (no duplicates) plus the RFI he made in the team; after A syncs it is hidden from the team
  await S(B, () => PT.store.add("rfis", { number: PT.store.nextNumber("rfis"), subject: "Luis team RFI", question: "q", status: "Open", createdBy: "Luis Herrera", sheetIds: [] }));
  await B.goto("/#/teamproject"); await B.click("[data-leave]"); await B.click(".modal button.btn-primary");
  const mine = await S(B, () => ({ proj: PT.store.project().name, rfis: PT.store.list("rfis").filter((r) => /Luis/.test(r.subject)).map((r) => r.subject).sort(),
    issues: PT.store.list("issues").filter((i) => /Luis/.test(i.title)).map((i) => i.title).sort(), daily: PT.store.list("reports").filter((r) => r.workPerformed === "Luis daily").length,
    teamHasTeamRfi: PT.store.get().rfis.some((r) => r.subject === "Luis team RFI" && PT.store.get().projects.find((p) => p.id === r.projectId)?.team) }));
  expect(mine).toEqual({ proj: "Central Valley Training Center – Bldg B", rfis: ["Luis RFI", "Luis team RFI"], issues: ["Luis punch", "Luis task"], daily: 1, teamHasTeamRfi: false });
  // the header project switcher lists his projects
  await expect(B.locator("#projSel option")).toHaveCount(2);
  await syncFiles(A, [await sendTeamFile(B)]);
  expect(await S(A, () => PT.store.list("rfis").map((r) => r.subject))).toEqual(["Mateo RFI"]);
  expect(await S(A, () => PT.store.list("issues").some((i) => /Luis/.test(i.title)))).toBe(false);
  for (const h of ["#/issues", "#/rfis", "#/punch", "#/reports"]) { await A.goto("/" + h); await A.waitForTimeout(200); const tx = await A.locator("#main").textContent(); for (const w of ["Luis task", "Luis punch", "Luis RFI", "Luis daily"]) expect(tx).not.toContain(w); }
  // dashboard: Luis is graded on his own project, Mateo's team score doesn't include Luis's work
  const bA = Buffer.from(await S(A, () => PT.store.exportJSON())), bB = Buffer.from(await S(B, () => PT.store.exportJSON()));
  await A.goto("/instructor.html"); const ch = A.waitForEvent("filechooser"); await A.click("#pickBtn");
  await (await ch).setFiles([{ name: "a.json", mimeType: "application/json", buffer: bA }, { name: "b.json", mimeType: "application/json", buffer: bB }]);
  await A.click("[data-stu='luis herrera']");
  await expect(A.locator(".modal")).toContainText("Luis team RFI");
  expect(errs).toEqual([]);
});

// ---------- live sync against a fake Firebase (shared between both browser contexts through Node) ----------
const FAKE_FIREBASE = `
(() => {
  const listeners = [];
  const col = (path, filt) => ({
    doc: (id) => ({ _path: path + "/" + id, collection: (c) => col(path + "/" + id + "/" + c) }),
    where: (f, op, val) => col(path, (v) => v[f] === val),
    get: async () => ({ docs: Object.values(await window.__relayGet(path)).filter((v) => !filt || filt(v)).map((v) => ({ data: () => v })) }),
    onSnapshot(cb) {
      let seen = {};
      const tick = async () => {
        const all = Object.fromEntries(Object.entries(await window.__relayGet(path)).filter(([, v]) => !filt || filt(v)));
        const ch = Object.entries(all).filter(([k, v]) => seen[k] !== v.at + v.by).map(([k, v]) => { seen[k] = v.at + v.by; return { type: "modified", doc: { data: () => v } }; });
        if (ch.length || !cb._first) { cb._first = true; cb({ docChanges: () => ch }); }
      };
      const iv = setInterval(tick, 300); tick();
      return () => clearInterval(iv);
    },
  });
  const db = { settings() {}, collection: (c) => col(c), batch() { const ops = []; return { set: (ref, obj) => ops.push([ref._path, obj]), commit: () => window.__relaySet(ops) }; } };
  const app = { auth: () => ({ signInAnonymously: async () => ({}) }), firestore: () => db };
  window.firebase = { apps: [], initializeApp: () => { window.firebase.apps.push(app); return app; }, app: () => app };
})();`;

test("live sync: a teammate's change shows up by itself", async ({ browser }) => {
  const cloud = {};
  const mk = async () => {
    const ctx = await browser.newContext({ acceptDownloads: true });
    await ctx.exposeFunction("__relayGet", (path) => Object.fromEntries(Object.entries(cloud).filter(([k]) => k.startsWith(path + "/")).map(([k, v]) => [k, v])));
    await ctx.exposeFunction("__relaySet", (ops) => { for (const [k, v] of ops) cloud[k] = v; });
    await ctx.route("**/js/cloud-config.js*", (r) => r.fulfill({ contentType: "text/javascript", body: "PT.cloudConfig = { projectId: 'fake' };" }));
    await ctx.route("https://www.gstatic.com/firebasejs/**", (r) => r.fulfill({ contentType: "text/javascript", body: r.request().url().includes("app-compat") ? FAKE_FIREBASE : "" }));
    return ctx.newPage();
  };
  const A = await mk(), B = await mk();
  const errs = []; for (const p of [A, B]) p.on("pageerror", (e) => errs.push(e.message));
  await fresh(A, "Mateo Ramirez"); await fresh(B, "Luis Herrera");
  await A.goto("/#/teamproject"); await A.click("#startBtn");
  await A.fill(".modal input[name=name]", "Live Team");
  await A.check(".modal input[name=m][value='Luis Herrera']");
  await A.click(".modal button[type=submit]");
  await syncFiles(B, [await sendTeamFile(A)]);   // join once with the team file (carries the team code)
  for (const P of [A, B]) { await P.goto("/#/teamproject"); await P.click("[data-live]"); await expect(P.locator(".team-card")).toContainText("Live sync"); }

  await addRfi(A, "Live RFI from Mateo");
  await expect.poll(() => S(B, () => PT.store.list("rfis").map((r) => r.subject)), { timeout: 10000 }).toContain("Live RFI from Mateo");
  await S(B, () => PT.store.add("reports", { type: "Daily Report", date: "2026-10-07", status: "Submitted", createdBy: "Luis Herrera", workPerformed: "Live report", crew: [] }));
  await expect.poll(() => S(A, () => PT.store.list("reports").some((r) => r.workPerformed === "Live report")), { timeout: 10000 }).toBe(true);
  expect(errs).toEqual([]);
});

test("RFIs sent to the instructor arrive in the dashboard inbox live, and answers go back by themselves", async ({ browser }) => {
  const cloud = {};
  const mk = async () => {
    const ctx = await browser.newContext({ acceptDownloads: true });
    await ctx.exposeFunction("__relayGet", (path) => Object.fromEntries(Object.entries(cloud).filter(([k]) => k.startsWith(path + "/"))));
    await ctx.exposeFunction("__relaySet", (ops) => { for (const [k, v] of ops) cloud[k] = v; });
    await ctx.route("**/js/cloud-config.js*", (r) => r.fulfill({ contentType: "text/javascript", body: "PT.cloudConfig = { projectId: 'fake', apiKey: 'x' };" }));
    await ctx.route("https://www.gstatic.com/firebasejs/**", (r) => r.fulfill({ contentType: "text/javascript", body: r.request().url().includes("app-compat") ? FAKE_FIREBASE : "" }));
    return ctx.newPage();
  };
  const A = await mk(), T = await mk();
  const errs = []; for (const p of [A, T]) p.on("pageerror", (e) => errs.push(e.message));
  await fresh(A, "Luis Herrera");
  await S(A, () => PT.store.add("rfis", { number: PT.store.nextNumber("rfis"), subject: "Curb height at RTU-4", question: "Curb is 8 in. – can we raise it to 14 in.?", assignedTo: "Juan Rodarte", status: "Open", sentDate: "2026-10-06", dueDate: "2026-10-09", sheetIds: [], createdBy: "Luis Herrera" }));
  await S(A, () => PT.store.add("rfis", { number: PT.store.nextNumber("rfis"), subject: "Draft not sent", question: "q", assignedTo: "Juan Rodarte", status: "Draft", sheetIds: [], createdBy: "Luis Herrera" }));
  await expect.poll(() => Object.keys(cloud).filter((k) => k.includes("rfi__")).length, { timeout: 10000 }).toBe(1);
  // instructor opens the dashboard with NO files – the RFI is there
  await T.goto("/instructor.html");
  await expect(T.locator("#inboxBtn")).toContainText("1 to answer", { timeout: 10000 });
  await T.click("#inboxBtn");
  await expect(T.locator(".modal")).toContainText("Luis Herrera – RFI-002: Curb height at RTU-4");
  await expect(T.locator(".modal")).not.toContainText("Draft not sent");
  await T.fill(".modal textarea[data-ans]", "Yes – raise the curb to 14 in. per 4/A501.");
  await T.click("#sendAns");
  await expect(T.locator(".modal")).toContainText("Answer sent");
  // the apprentice gets the answer by itself
  await expect.poll(() => S(A, () => { const r = PT.store.list("rfis").find((x) => x.subject.startsWith("Curb")); return r.status + "|" + r.answer; }), { timeout: 10000 }).toBe("Answered|Yes – raise the curb to 14 in. per 4/A501.");
  expect(errs).toEqual([]);
});
