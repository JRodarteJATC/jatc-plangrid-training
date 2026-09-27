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
