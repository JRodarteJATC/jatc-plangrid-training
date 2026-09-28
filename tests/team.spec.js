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

// ---------- live sync against a fake Firebase (shared between both browser contexts through Node) ----------
const FAKE_FIREBASE = `
(() => {
  const listeners = [];
  const col = (path) => ({
    doc: (id) => ({ _path: path + "/" + id, collection: (c) => col(path + "/" + id + "/" + c) }),
    onSnapshot(cb) {
      let seen = {};
      const tick = async () => {
        const all = await window.__relayGet(path);
        const ch = Object.entries(all).filter(([k, v]) => seen[k] !== v.at + v.by).map(([k, v]) => { seen[k] = v.at + v.by; return { type: "modified", doc: { data: () => v } }; });
        if (ch.length || !cb._first) { cb._first = true; cb({ docChanges: () => ch }); }
      };
      const iv = setInterval(tick, 300); tick();
      return () => clearInterval(iv);
    },
  });
  const db = { collection: (c) => col(c), batch() { const ops = []; return { set: (ref, obj) => ops.push([ref._path, obj]), commit: () => window.__relaySet(ops) }; } };
  const app = { auth: () => ({ signInAnonymously: async () => ({}) }), firestore: () => db };
  window.firebase = { apps: [], initializeApp: () => { window.firebase.apps.push(app); return app; }, app: () => app };
})();`;

test("live sync: a teammate's change shows up by itself", async ({ browser }) => {
  const cloud = {};
  const mk = async () => {
    const ctx = await browser.newContext({ acceptDownloads: true });
    await ctx.exposeFunction("__relayGet", (path) => Object.fromEntries(Object.entries(cloud).filter(([k]) => k.startsWith(path + "/")).map(([k, v]) => [k, v])));
    await ctx.exposeFunction("__relaySet", (ops) => { for (const [k, v] of ops) cloud[k] = v; });
    await ctx.route("**/js/cloud-config.js", (r) => r.fulfill({ contentType: "text/javascript", body: "PT.cloudConfig = { projectId: 'fake' };" }));
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
