const { test, expect } = require("@playwright/test");
test.use({ ignoreHTTPSErrors: true, launchOptions: { executablePath: process.env.CHROMIUM_PATH, proxy: { server: process.env.HTTPS_PROXY, bypass: "<-loopback>,localhost,127.0.0.1" } } });
test("real turn-in", async ({ browser }) => {
  test.setTimeout(180000);
  const mk = async () => { const c = await browser.newContext({ ignoreHTTPSErrors: true, proxy: { server: process.env.HTTPS_PROXY, bypass: "<-loopback>,localhost,127.0.0.1" } }); await c.addInitScript(() => localStorage.setItem("pt-allow-real-cloud", "1")); return c.newPage(); };
  const A = await mk();
  await A.goto("/#/settings"); await A.fill("#prof input[name=name]", "ZZ Turnin Test"); await A.click("#prof button.btn-primary");
  await A.goto("/#/sheets"); await A.click("#ppBtn"); await A.waitForFunction(() => PT.store.list("sheets").length === 11, null, { timeout: 120000 });
  // a big photo so the upload needs several pieces
  await A.evaluate(() => { const c = document.createElement("canvas"); c.width = 1600; c.height = 1200; const g = c.getContext("2d"); for (let i = 0; i < 4000; i++) { g.fillStyle = `hsl(${i % 360},70%,50%)`; g.fillRect(Math.random() * 1600, Math.random() * 1200, 30, 30); } for (let k = 0; k < 3; k++) PT.store.add("photos", { dataUrl: c.toDataURL("image/jpeg", 0.95), caption: "big " + k, by: "ZZ Turnin Test" }); });
  console.log("STATE MB", (await A.evaluate(() => PT.store.exportJSON().length)) / 1e6);
  await A.goto("/#/settings"); const t0 = Date.now(); await A.click("#turnInBtn");
  await expect(A.locator("#turnInSt")).toContainText("Last turned in", { timeout: 120000 });
  console.log("TURNED IN in", (Date.now() - t0) / 1000, "s");
  const T = await mk(); await T.goto("/instructor.html"); const t1 = Date.now(); await T.click("#cloudBtn");
  await expect(T.locator("#main")).toContainText("ZZ Turnin Test", { timeout: 120000 });
  console.log("LOADED in", (Date.now() - t1) / 1000, "s");
});
