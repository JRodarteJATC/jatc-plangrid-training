// Manual check against the REAL Firebase project. Run: npx playwright test --config tests/manual/pw.config.js
// (creates a test team, syncs one RFI between two browsers). Delete the test team afterwards in Firestore.
const { test, expect } = require("@playwright/test");
const fs = require("fs");
test.use({ ignoreHTTPSErrors: true, launchOptions: { executablePath: process.env.CHROMIUM_PATH, proxy: { server: process.env.HTTPS_PROXY, bypass: "<-loopback>,localhost,127.0.0.1" } } });
async function fresh(page, name) {
  await page.goto("/");
  await page.evaluate(() => new Promise((r) => { const q = indexedDB.deleteDatabase("plan-trainer"); q.onsuccess = q.onerror = q.onblocked = () => r(); }));
  await page.reload(); await page.goto("/#/settings");
  await page.fill("#prof input[name=name]", name); await page.click("#prof button.btn-primary"); await page.waitForTimeout(300);
}
const S = (p, fn, a) => p.evaluate(fn, a);
test("real firebase live sync", async ({ browser }) => {
  test.setTimeout(120000);
  const mk = async () => { const c = await browser.newContext({ acceptDownloads: true, ignoreHTTPSErrors: true, proxy: { server: process.env.HTTPS_PROXY, bypass: "<-loopback>,localhost,127.0.0.1" } }); await c.addInitScript(() => localStorage.setItem("pt-allow-real-cloud", "1")); return c.newPage(); };
  const A = await mk(), B = await mk();
  for (const p of [A, B]) { p.on("pageerror", (e) => console.log("PAGEERR", e.message)); p.on("console", (m) => m.type() === "error" && console.log("CONSOLE", m.text().slice(0, 300))); }
  await fresh(A, "Mateo Ramirez"); await fresh(B, "Luis Herrera");
  await A.goto("/#/teamproject"); await A.click("#startBtn");
  await A.fill(".modal input[name=name]", "ZZ Claude connection test – delete me");
  await A.check(".modal input[name=m][value='Luis Herrera']"); await A.click(".modal button[type=submit]");
  await A.goto("/#/teamproject"); const dl = A.waitForEvent("download"); await A.click("[data-send]");
  const buf = fs.readFileSync(await (await dl).path());
  await B.goto("/#/teamproject"); const ch = B.waitForEvent("filechooser"); await B.click("#joinBtn");
  await (await ch).setFiles({ name: "t.json", mimeType: "application/json", buffer: buf }); await B.waitForTimeout(500);
  for (const P of [A, B]) { await P.goto("/#/teamproject"); await P.click("[data-live]"); }
  await A.waitForTimeout(6000);
  console.log("STATUS A", await A.locator(".team-card").innerText().then((t) => t.split("\n")[0] + " | " + (t.match(/Live sync[^\n]*/) || [""])[0]));
  console.log("STATUS B", await B.locator(".team-card").innerText().then((t) => (t.match(/Live sync[^\n]*/) || [""])[0]));
  await S(A, () => PT.store.add("rfis", { number: PT.store.nextNumber("rfis"), subject: "Real cloud RFI", question: "q", assignedTo: "Juan Rodarte", status: "Open", createdBy: "Mateo Ramirez" }));
  await expect.poll(() => S(B, () => PT.store.list("rfis").map((r) => r.subject)), { timeout: 30000 }).toContain("Real cloud RFI");
  console.log("LIVE SYNC OK; team code", await S(A, () => PT.store.project().team.code));
});
