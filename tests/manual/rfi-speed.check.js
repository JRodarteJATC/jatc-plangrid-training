const { test, expect } = require("@playwright/test");
test.use({ ignoreHTTPSErrors: true, launchOptions: { executablePath: process.env.CHROMIUM_PATH, proxy: { server: process.env.HTTPS_PROXY, bypass: "<-loopback>,localhost,127.0.0.1" } } });
test("rfi speed", async ({ browser }) => {
  test.setTimeout(120000);
  const mk = async () => { const c = await browser.newContext({ ignoreHTTPSErrors: true, proxy: { server: process.env.HTTPS_PROXY, bypass: "<-loopback>,localhost,127.0.0.1" } }); await c.addInitScript(() => localStorage.setItem("pt-allow-real-cloud", "1")); return c.newPage(); };
  const T = await mk(); await T.goto("/instructor.html"); await T.waitForTimeout(6000);
  const A = await mk();
  await A.goto("/#/settings"); await A.fill("#prof input[name=name]", "ZZ Speed Test"); await A.click("#prof button.btn-primary"); await A.waitForTimeout(1500);
  await A.goto("/#/rfis"); await A.click("#newBtn");
  await A.fill(".modal input[name=subject]", "ZZ speed test – ignore"); await A.fill(".modal textarea[name=question]", "Speed test, please ignore.");
  await A.selectOption(".modal select[name=assignedTo]", "Juan Rodarte");
  const before0 = await T.evaluate(() => PT.rfiLive.rfis().length);
  const t0 = Date.now(); await A.click("#sendNow");
  await A.waitForTimeout(1500); await A.close();   // student closes the tab right away
  T.on("console", (m) => console.log("T:", m.text().slice(0, 160)));
  const before = await T.evaluate(() => PT.rfiLive.rfis().length); console.log("BEFORE", before, await T.evaluate(() => PT.rfiLive.status()));
  const iv = setInterval(async () => { try { console.log("NOW", await T.evaluate(() => [PT.rfiLive.rfis().length, PT.rfiLive.status()])); } catch {} }, 5000);
  await expect.poll(() => T.evaluate(() => PT.rfiLive.rfis().length), { timeout: 60000, intervals: [250] }).toBeGreaterThan(before0);
  console.log("ARRIVED after", ((Date.now() - t0) / 1000).toFixed(1), "s");
});
