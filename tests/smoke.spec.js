// End-to-end smoke test: walks through the core training missions the way an apprentice would.
const { test, expect } = require("@playwright/test");

const X = (f) => 150 + f * 12.5, Y = (f) => 230 + f * 12.5; // sheet units for sample plans

async function sheetId(page, number) {
  return page.evaluate((n) => PT.store.list("sheets").find((s) => s.number === n).id, number);
}
async function toScreen(page, x, y) {
  return page.evaluate(([x, y]) => {
    const V = PT.viewer.current(), r = document.querySelector("#canvasWrap").getBoundingClientRect();
    return [r.left + V.tx + x * V.z, r.top + V.ty + y * V.z];
  }, [x, y]);
}
async function clickSheet(page, x, y) { const [sx, sy] = await toScreen(page, x, y); await page.mouse.click(sx, sy); }
async function dragSheet(page, a, b) {
  const [sx, sy] = await toScreen(page, ...a), [ex, ey] = await toScreen(page, ...b);
  await page.mouse.move(sx, sy); await page.mouse.down(); await page.mouse.move(ex, ey, { steps: 8 }); await page.mouse.up();
}
const done = (page) => page.evaluate(() => Object.keys(PT.store.get().training.completed));

test.beforeEach(async ({ page }) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.errors = errors;
  await page.goto("/");
  await page.evaluate(() => new Promise((r) => { const q = indexedDB.deleteDatabase("plan-trainer"); q.onsuccess = q.onerror = q.onblocked = () => r(); }));
  await page.reload();
  await expect(page.locator("#nav a")).toHaveCount(15);
});

test("all sample sheets render", async ({ page }) => {
  for (const n of ["R-001", "R-101", "R-102", "R-501", "R-601", "W-101", "W-501"]) {
    await page.goto(`/#/sheet/${await sheetId(page, n)}`);
    await expect.poll(() => page.evaluate(() => document.querySelector("#sheetImg").naturalWidth)).toBeGreaterThan(0);
  }
  expect(page.errors).toEqual([]);
});

test("measure, area and count missions", async ({ page }) => {
  await page.goto(`/#/sheet/${await sheetId(page, "R-101")}`);
  await page.waitForTimeout(400);
  await page.click("[data-tool=measure]");
  await dragSheet(page, [X(0), Y(0)], [X(100), Y(0)]);
  await page.click("[data-tool=area]");
  for (const [a, b] of [[60, 0], [100, 0], [100, 64], [60, 64]]) await clickSheet(page, X(a), Y(b));
  await page.keyboard.press("Enter");

  await page.click("[data-tool=count]");
  for (const p of await page.evaluate(() => PT.samples.answers.penetrationPts(1))) await clickSheet(page, p.x, p.y);
  await page.keyboard.press("Enter");
  await page.fill(".modal input[name=label]", "Pipe penetrations");
  await page.click(".modal button[type=submit]");

  await expect.poll(() => done(page)).toEqual(expect.arrayContaining(["measure_parapet", "area_b", "count_pipes", "mk_any"]));
  expect(page.errors).toEqual([]);
});

test("issue, RFI, daily report and compare", async ({ page }) => {
  await page.goto("/#/settings");
  await page.fill("#prof input[name=name]", "Test Apprentice");
  await page.click("#prof button");

  await page.goto(`/#/sheet/${await sheetId(page, "R-101")}`);
  await page.waitForTimeout(400);
  await page.click("[data-tool=issue]");
  await clickSheet(page, X(50), Y(10));
  await page.fill(".modal input[name=title]", "Blister in membrane near RTU-2");
  await page.selectOption(".modal select[name=assignee]", "Maria Lopez");
  await page.fill(".modal input[name=dueDate]", "2026-12-01");
  await page.click(".modal button[type=submit]");

  await page.click("#cmpBtn");
  await page.click(".modal button[type=submit]");
  await expect(page.locator("#cmpLegend")).toBeVisible();

  await page.goto("/#/rfis");
  await page.click("#newBtn");
  await page.fill(".modal input[name=subject]", "RTU-4 cricket not on tapered plan");
  await page.fill(".modal textarea[name=question]", "R-101 Rev 1 note 6 requires a cricket at RTU-4; R-102 not revised.");
  await page.selectOption(".modal select[name=assignedTo]", "Priya Shah");
  await page.selectOption(".modal select[name=sheetIds]", [await sheetId(page, "R-101")]);
  await page.click("#sendNow");

  await page.goto("/#/reports");
  await page.click("[data-new='Daily Report']");
  await page.fill(".modal input[name=c_trade]", "Apprentice");
  await page.fill(".modal input[name=c_count]", "2");
  await page.fill(".modal textarea[name=workPerformed]", "Installed insulation Area A");
  await page.click("#submitRpt");

  await expect.poll(() => done(page)).toEqual(expect.arrayContaining(["profile", "issue_pin", "compare", "rfi_send", "daily"]));
  expect(page.errors).toEqual([]);
});

test("instructor dashboard loads a backup file", async ({ page }) => {
  await page.goto("/#/settings");
  await page.fill("#prof input[name=name]", "Dash Tester");
  await page.click("#prof button");
  await page.waitForTimeout(300);
  const json = await page.evaluate(() => PT.store.exportJSON());
  await page.goto("/instructor.html");
  const chooser = page.waitForEvent("filechooser");
  await page.click("#pickBtn");
  await (await chooser).setFiles({ name: "dash.json", mimeType: "application/json", buffer: Buffer.from(json) });
  await expect(page.locator("[data-stu='dash tester']")).toBeVisible();
  await page.click("[data-stu='dash tester']");
  await expect(page.locator(".modal h2")).toHaveText("Dash Tester");
  expect(page.errors).toEqual([]);
});

test("quiz answered in app is auto-graded by the dashboard", async ({ page }) => {
  await page.goto("/#/settings");
  await page.fill("#prof input[name=name]", "Quiz Tester");
  await page.click("#prof button");
  await page.goto("/#/quiz/quiz2");
  for (let q = 1; q <= 7; q++) await page.check(`input[name='${q}'][value='0']`);
  await page.check("input[name='8'][value='0']");
  await page.click("button[type=submit]");
  await page.waitForTimeout(300);
  const json = await page.evaluate(() => PT.store.exportJSON());
  // test-only key: every quiz2 answer is option 0 (the real key lives in the private repo)
  const key = { type: "plan-trainer-grading-key", sets: { quiz2: Object.fromEntries([1, 2, 3, 4, 5, 6, 7].map((i) => [String(i), { a: 0 }]).concat([["8", { a: [0] }]])) } };
  await page.goto("/instructor.html");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  const chooser = page.waitForEvent("filechooser");
  await page.click("#pickBtn");
  await (await chooser).setFiles([
    { name: "key.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(key)) },
    { name: "student.json", mimeType: "application/json", buffer: Buffer.from(json) },
  ]);
  await expect(page.locator("td[title^='Quiz 2']")).toHaveText(/8\/8/);
  expect(page.errors).toEqual([]);
});

test("short-answer and number questions are saved under the right question", async ({ page }) => {
  await page.goto("/#/quiz/att");
  await page.fill("[name='1']", "Primer");
  await page.fill("[name='2']", "Spec writer");
  await page.fill("[name='4']", "8");
  await page.click("#qSave");
  const a = await page.evaluate(() => { const s = PT.store.get(); return s.quizzes[PT.store.pid()].att.answers; });
  expect(a).toMatchObject({ 1: "Primer", 2: "Spec writer", 4: 8 });
  expect(page.errors).toEqual([]);
});

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP8z8DAwMDAxMDAwMDAAAANHQEDasKb6QAAAABJRU5ErkJggg==", "base64");

test("3A project: daily report logs, time sheet, task watchers and RFI sent date", async ({ page }) => {
  await page.goto("/#/settings");
  await page.fill("#prof input[name=name]", "Proj Tester");
  await page.click("#prof button");

  // Daily report with material + equipment logs, notes and a photo
  await page.goto("/#/reports");
  await page.click("[data-new='Daily Report']");
  await page.fill(".modal input[name=c_trade]", "Apprentice");
  await page.fill(".modal input[name=c_count]", "2");
  await page.fill(".modal textarea[name=workPerformed]", "Installed base sheet and cap sheet Area A grid 1-4, 6 squares.");
  await page.fill(".modal input[name=m_material]", "SBS cap sheet");
  await page.fill(".modal input[name=m_qty]", "6");
  await page.click(".modal [data-addrow=matTbl]");
  await page.locator(".modal input[name=m_material]").nth(1).fill("Primer");
  await page.fill(".modal input[name=e_name]", "Hoist");
  await page.fill(".modal textarea[name=notes]", "GC moved the dumpster; lost 30 minutes of hoisting.");
  const ch = page.waitForEvent("filechooser");
  await page.click("#rpAddPh");
  await (await ch).setFiles({ name: "a.png", mimeType: "image/png", buffer: PNG });
  await page.fill(".modal input[name=caption]", "Cap sheet at RD-1");
  await page.locator(".modal button[type=submit]").last().click();
  await expect(page.locator("#rpStrip img")).toHaveCount(1);
  await page.click("#submitRpt");

  // Time sheet
  await page.click("[data-new='Time Sheet']");
  await page.fill(".modal input[name=w_name]", "Proj Tester");
  await page.fill(".modal input[name=w_classification]", "Apprentice – 2nd period");
  await page.fill(".modal input[name=w_start]", "06:00");
  await page.fill(".modal input[name=w_end]", "14:30");
  await page.fill(".modal input[name=w_lunch]", "30");
  await expect(page.locator("#tsTotal")).toHaveText("8");
  await page.click("#submitRpt");

  const reps = await page.evaluate(() => PT.store.list("reports").filter((r) => r.createdBy === "Proj Tester"));
  const dr = reps.find((r) => r.type === "Daily Report"), ts = reps.find((r) => r.type === "Time Sheet");
  expect(dr.materials.map((m) => m.material)).toEqual(["SBS cap sheet", "Primer"]);
  expect(dr.equipmentLog[0].name).toBe("Hoist");
  expect(dr.photoIds.length).toBe(1);
  expect(ts.workers[0].hours).toBe(8);

  // Task with instructor watching, delay and cost
  await page.goto("/#/issues");
  await page.click("#newBtn");
  await page.fill(".modal input[name=title]", "Relocate conduit at RTU-2 before flashing");
  await page.selectOption(".modal select[name=type]", "Task");
  await page.selectOption(".modal select[name=assignee]", "Maria Lopez");
  await page.check(".modal input[name=watchers][value='Juan Rodarte']");
  await page.fill(".modal input[name=delayDays]", "1");
  await page.fill(".modal input[name=costImpact]", "450");
  await page.click(".modal button[type=submit]");
  await expect.poll(() => page.evaluate(() => PT.store.list("issues").some((i) => i.type === "Task"))).toBe(true);
  const task = await page.evaluate(() => PT.store.list("issues").find((i) => i.type === "Task"));
  expect(task).toMatchObject({ watchers: ["Juan Rodarte"], delayDays: "1", costImpact: "450" });

  // RFI sent to the instructor gets a sent date
  await page.goto("/#/rfis");
  await page.click("#newBtn");
  await page.fill(".modal input[name=subject]", "Drain sump depth at RD-1");
  await page.fill(".modal textarea[name=question]", "Detail 3/R-501 shows a 1.5 inch sump but the tapered plan shows 1 inch. Which governs?");
  await page.selectOption(".modal select[name=assignedTo]", "Juan Rodarte");
  await page.fill(".modal input[name=dueDate]", "2026-12-01");
  await page.click("#sendNow");
  await expect.poll(() => page.evaluate(() => PT.store.list("rfis").some((r) => r.assignedTo === "Juan Rodarte"))).toBe(true);
  const rfi = await page.evaluate(() => PT.store.list("rfis").find((r) => r.assignedTo === "Juan Rodarte"));
  expect(rfi.sentDate).toBeTruthy();
  expect(rfi.status).toBe("Open");

  // Fill in the rest programmatically and check the dashboard rubric reaches 100
  await page.evaluate(() => {
    const S = PT.store, me = "Proj Tester", sh = S.list("sheets").find((s) => s.number === "R-101");
    const ph = S.list("photos")[0].id;
    for (let d = 2; d <= 5; d++) {
      const date = `2026-10-0${d}`;
      S.add("reports", { type: "Daily Report", date, status: "Submitted", createdBy: me, crew: [{ trade: "JW", count: "3" }], workPerformed: "Installed tapered insulation and cover board, Area B grid 5-8.", materials: [{ material: "Polyiso", qty: "20" }], equipmentLog: [{ name: "Hoist" }], notes: "Wind picked up after lunch; covered stock and tied down.", photoIds: d < 4 ? [ph] : [] });
      S.add("reports", { type: "Time Sheet", date, status: "Submitted", createdBy: me, workers: [{ name: me, classification: "Apprentice", hours: 8 }] });
    }
    const first = S.list("reports").find((r) => r.type === "Daily Report" && r.createdBy === me && !r.date.startsWith("2026-10-0"));
    const ts = S.list("reports").find((r) => r.type === "Time Sheet" && r.createdBy === me && r.date === first.date); ts.workers[0].classification = "Apprentice";
    S.add("docs", { name: "Cap sheet data.pdf", folder: "Materials", kind: "pdf", uploadedBy: me });
    S.add("docs", { name: "Primer SDS.pdf", folder: "Materials", kind: "pdf", uploadedBy: me });
    S.add("markups", { sheetId: sh.id, type: "cloud", layer: "published", createdBy: me, points: [[0, 0], [10, 10]] });
    for (const i of S.list("issues").filter((x) => x.createdBy === me)) Object.assign(i, { sheetId: sh.id, x: 300, y: 300, description: "Conduit sits where the new base flashing goes; electrician must relocate first.", photoIds: [ph] });
    for (let k = 0; k < 2; k++) S.add("issues", { type: "Task", number: 90 + k, title: "Task " + k, assignee: "Maria Lopez", watchers: ["Juan Rodarte"], description: "Detailed description of the task with location and what to do.", photoIds: [ph], sheetId: sh.id, x: 200, y: 200, delayDays: "0", costImpact: "0", createdBy: me, status: "Open" });
    for (const r of S.list("rfis").filter((x) => x.createdBy === me)) r.sheetIds = [sh.id];
    for (let k = 0; k < 2; k++) S.add("rfis", { number: 50 + k, subject: "RFI subject " + k, question: "A real field question that references the plans and a detail, with dimensions.", assignedTo: "Juan Rodarte", status: "Open", sentDate: "2026-10-02", dueDate: "2026-10-09", sheetIds: [sh.id], createdBy: me });
  });
  const json = await page.evaluate(() => PT.store.exportJSON());
  await page.goto("/instructor.html");
  const chooser = page.waitForEvent("filechooser");
  await page.click("#pickBtn");
  await (await chooser).setFiles({ name: "p.json", mimeType: "application/json", buffer: Buffer.from(json) });
  await expect(page.locator("td[title^='3A PlanGrid']")).toHaveText(/100\/100/);
  expect(page.errors).toEqual([]);
});

test("scale: calibrate from a detail's graphic scale bar, pick a scale, drag grips, touch magnifier", async ({ page }) => {
  // R-501 details are "AS NOTED": calibrate on detail 1's bar (0 to 1'-0" at 3" = 1'-0" = 150 units)
  await page.goto(`/#/sheet/${await sheetId(page, "R-501")}`);
  await page.waitForTimeout(400);
  await page.click("[data-tool=calibrate]");
  // detail 1 panel: x=50,y=50,w=720,h=520 -> bar starts at x+w-60-150 = 560, y+h-34 = 536
  await dragSheet(page, [560, 540], [710, 540]);
  await page.fill(".modal input[name=len]", "1'");
  await page.click(".modal button[type=submit]");
  await expect.poll(() => page.evaluate(() => PT.store.list("sheets").find((s) => s.number === "R-501").versions[0].scalePxPerFt)).toBeCloseTo(150, 0);
  // the green calibration line has grips; drag one end 150 units further -> 1 ft now = 300 units
  const cal = page.locator("[data-h='1'][data-cal] circle").last();
  await expect(cal).toBeVisible();
  const [ex, ey] = await toScreen(page, 710, 540), [fx, fy] = await toScreen(page, 860, 540);
  await page.mouse.move(ex, ey); await page.mouse.down(); await page.mouse.move(fx, fy, { steps: 6 }); await page.mouse.up();
  await expect.poll(() => page.evaluate(() => PT.store.list("sheets").find((s) => s.number === "R-501").versions[0].scalePxPerFt)).toBeCloseTo(300, 0);

  // Pick a scale from the list on R-102 (1/4" = 1'-0" -> 12.5 units/ft at 50 units per paper inch)
  await page.goto(`/#/sheet/${await sheetId(page, "R-102")}`);
  await page.waitForTimeout(400);
  await page.click("[data-tool=calibrate]");
  await page.click("#optScaleList");
  await page.selectOption(".modal select[name=preset]", { label: `1/8" = 1'-0"` });
  await page.click(".modal button[type=submit]");
  await expect.poll(() => page.evaluate(() => PT.store.list("sheets").find((s) => s.number === "R-102").versions[0].scalePxPerFt)).toBeCloseTo(6.25, 2);
  await page.click("#optScaleList");
  await page.selectOption(".modal select[name=preset]", { label: `1/4" = 1'-0"` });
  await page.click(".modal button[type=submit]");
  await expect.poll(() => page.evaluate(() => PT.store.list("sheets").find((s) => s.number === "R-102").versions[0].scalePxPerFt)).toBeCloseTo(12.5, 2);

  // Measure the 16' graphic scale bar on R-101 -> 16'-0", then drag the end grip to 8' -> 8'-0"
  await page.goto(`/#/sheet/${await sheetId(page, "R-101")}`);
  await page.waitForTimeout(400);
  await page.click("[data-tool=measure]");
  await dragSheet(page, [380, 1142], [580, 1142]); // drawingTitle(170,1120): bar at x+210 = 380, 16' * 12.5 = 200
  const val = () => page.evaluate(() => PT.store.list("markups").filter((m) => m.type === "measure").pop().value);
  await expect.poll(val).toBeCloseTo(16, 1);
  const [gx, gy] = await toScreen(page, 580, 1142), [hx, hy] = await toScreen(page, 480, 1142);
  await page.mouse.move(gx, gy); await page.mouse.down(); await page.mouse.move(hx, hy, { steps: 6 }); await page.mouse.up();
  await expect.poll(val).toBeCloseTo(8, 1);

  // Touch: the magnifier appears while the finger is down and hides when it lifts
  const [tx, ty] = await toScreen(page, 300, 600);
  await page.evaluate(([x, y]) => {
    const w = document.querySelector("#canvasWrap");
    const ev = (type, dx) => w.dispatchEvent(new PointerEvent(type, { pointerId: 7, pointerType: "touch", clientX: x + dx, clientY: y, bubbles: true, isPrimary: true, button: 0 }));
    ev("pointerdown", 0); ev("pointermove", 40);
    window.__loupe = !document.querySelector("#loupe").classList.contains("hidden");
    ev("pointerup", 40);
  }, [tx, ty]);
  expect(await page.evaluate(() => window.__loupe)).toBe(true);
  await expect(page.locator("#loupe")).toBeHidden();
  expect(page.errors).toEqual([]);
});

test("text tool: edit existing text, and a lost pointer-up never blocks the other tools", async ({ page }) => {
  await page.goto(`/#/sheet/${await sheetId(page, "R-101")}`);
  await page.waitForTimeout(400);
  await page.click("[data-tool=text]");
  await clickSheet(page, 400, 400);
  await page.fill(".modal textarea[name=text]", "FIELD NOTE");
  await page.click(".modal button[type=submit]");
  // clicking the text again with the Text tool edits it instead of adding another
  await clickSheet(page, 420, 392);
  await expect(page.locator(".modal h2")).toHaveText("Edit text");
  await page.fill(".modal textarea[name=text]", "FIELD NOTE 2");
  await page.click(".modal button[type=submit]");
  const texts = await page.evaluate(() => PT.store.list("markups").filter((m) => m.type === "text").map((m) => m.text));
  expect(texts).toEqual(["FIELD NOTE 2"]);
  // simulate a press whose "up" never arrives (what used to freeze the tools)
  await page.click("[data-tool=line]");
  const [sx, sy] = await toScreen(page, 300, 700);
  await page.evaluate(([x, y]) => document.querySelector("#canvasWrap").dispatchEvent(new PointerEvent("pointerdown", { pointerId: 42, pointerType: "touch", isPrimary: true, clientX: x, clientY: y, bubbles: true })), [sx, sy]);
  await dragSheet(page, [500, 500], [700, 500]);
  await expect.poll(() => page.evaluate(() => PT.store.list("markups").filter((m) => m.type === "line").length)).toBe(1);
  expect(page.errors).toEqual([]);
});
