// Manual check against the REAL Firebase project. Run: npx playwright test --config tests/manual/pw.config.js live-firebase.check.js
// Starts a test team, joins it by invite, syncs RFIs live, reopens the app (only-changes download). Clean up afterwards.
const { test, expect } = require("@playwright/test");
test.use({ ignoreHTTPSErrors: true, launchOptions: { executablePath: process.env.CHROMIUM_PATH, proxy: { server: process.env.HTTPS_PROXY, bypass: "<-loopback>,localhost,127.0.0.1" } } });
const S = (p, fn, a) => p.evaluate(fn, a);
test("real firebase live sync", async ({ browser }) => {
  test.setTimeout(150000);
  const mk = async (name) => { const c = await browser.newContext({ acceptDownloads: true, ignoreHTTPSErrors: true, proxy: { server: process.env.HTTPS_PROXY, bypass: "<-loopback>,localhost,127.0.0.1" } }); await c.addInitScript(() => localStorage.setItem("pt-allow-real-cloud", "1")); const p = await c.newPage();
    p.on("pageerror", (e) => console.log(name, "PAGEERR", e.message)); p.on("console", (m) => m.type() === "error" && !/404/.test(m.text()) && console.log(name, "CONSOLE", m.text().slice(0, 200)));
    await p.goto("/#/settings"); await p.fill("#prof input[name=name]", name); await p.click("#prof button.btn-primary"); await p.waitForTimeout(300); return p; };
  const A = await mk("Mateo Ramirez"), B = await mk("Luis Herrera");
  await A.goto("/#/teamproject"); await A.click("#startBtn"); await A.fill(".modal input[name=company]", "ZZ Claude test team – delete me");
  await A.check(".modal input[name=m][value='Luis Herrera']"); await A.click(".modal button[type=submit]");
  await expect(A.locator(".team-card")).toContainText("Live sync", { timeout: 30000 });
  console.log("TEAM", await S(A, () => PT.store.project().id + " " + PT.store.project().team.code));
  await A.waitForTimeout(3000); await B.goto("/#/teamproject"); await expect(B.locator("#invites .row", { hasText: "ZZ Claude test team" })).toBeVisible({ timeout: 60000 });
  await B.locator("#invites .row", { hasText: "ZZ Claude test team" }).locator("[data-joininv]").click();
  await S(A, () => PT.store.add("rfis", { number: PT.store.nextNumber("rfis"), subject: "Real RFI 1", question: "q", status: "Open", createdBy: "Mateo Ramirez", sheetIds: [] }));
  await expect.poll(() => S(B, () => PT.store.get().rfis.some((r) => r.subject === "Real RFI 1")), { timeout: 40000 }).toBe(true);
  console.log("LIVE 1 OK; B seen", await S(B, () => JSON.stringify(PT.store.get().teamLocal.sync)));
  await B.reload(); await B.waitForTimeout(3000);
  await S(A, () => PT.store.add("rfis", { number: PT.store.nextNumber("rfis"), subject: "Real RFI 2", question: "q", status: "Open", createdBy: "Mateo Ramirez", sheetIds: [] }));
  await expect.poll(() => S(B, () => PT.store.get().rfis.some((r) => r.subject === "Real RFI 2")), { timeout: 40000 }).toBe(true);
  console.log("AFTER REOPEN OK");
});
