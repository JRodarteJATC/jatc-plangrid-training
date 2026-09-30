// Manual check against the REAL Firebase project: an RFI reaches the live dashboard inbox and the answer comes back.
const { test, expect } = require("@playwright/test");
test.use({ ignoreHTTPSErrors: true, launchOptions: { executablePath: process.env.CHROMIUM_PATH, proxy: { server: process.env.HTTPS_PROXY, bypass: "<-loopback>,localhost,127.0.0.1" } } });
const S = (p, fn, a) => p.evaluate(fn, a);
test("real firebase RFI inbox", async ({ browser }) => {
  test.setTimeout(120000);
  const mk = async () => { const c = await browser.newContext({ ignoreHTTPSErrors: true, proxy: { server: process.env.HTTPS_PROXY, bypass: "<-loopback>,localhost,127.0.0.1" } }); await c.addInitScript(() => localStorage.setItem("pt-allow-real-cloud", "1")); return c.newPage(); };
  const A = await mk(), T = await mk();
  for (const p of [A, T]) { p.on("pageerror", (e) => console.log("PAGEERR", e.message)); p.on("console", (m) => /RFI|error/i.test(m.text()) && console.log("CONSOLE", m.text().slice(0, 300))); }
  await A.goto("/"); await A.evaluate(() => new Promise((r) => { const q = indexedDB.deleteDatabase("plan-trainer"); q.onsuccess = q.onerror = q.onblocked = () => r(); })); await A.reload();
  await A.goto("/#/settings"); await A.fill("#prof input[name=name]", "ZZ Claude Test"); await A.click("#prof button.btn-primary");
  const id = await S(A, () => PT.store.add("rfis", { number: PT.store.nextNumber("rfis"), subject: "ZZ connection test – ignore", question: "Test RFI from the setup check. Please ignore.", assignedTo: "Juan Rodarte", status: "Open", sheetIds: [], createdBy: "ZZ Claude Test" }).id);
  console.log("RFI_ID", id);
  await T.goto("/instructor.html");
  await expect(T.locator("#inboxBtn")).toBeVisible({ timeout: 30000 });
  await T.click("#inboxBtn");
  await T.selectOption("#inFilter", "all").catch(() => {});
  await expect(T.locator(".modal")).toContainText("ZZ connection test", { timeout: 30000 });
  console.log("INBOX OK", await T.locator("#liveSt").textContent());
  await T.locator(".rfi-card", { hasText: "ZZ connection test" }).locator("textarea[data-ans]").fill("Test answer – ignore.");
  await T.click("#sendAns");
  await expect.poll(() => S(A, (id) => PT.store.find("rfis", id).status, id), { timeout: 30000 }).toBe("Answered");
  console.log("ANSWER BACK OK");
});
