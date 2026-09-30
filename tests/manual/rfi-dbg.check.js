const { test } = require("@playwright/test");
test.use({ ignoreHTTPSErrors: true, launchOptions: { executablePath: process.env.CHROMIUM_PATH, proxy: { server: process.env.HTTPS_PROXY, bypass: "<-loopback>,localhost,127.0.0.1" } } });
test("dbg", async ({ browser }) => {
  test.setTimeout(90000);
  const c = await browser.newContext({ ignoreHTTPSErrors: true, proxy: { server: process.env.HTTPS_PROXY, bypass: "<-loopback>,localhost,127.0.0.1" } }); await c.addInitScript(() => localStorage.setItem("pt-allow-real-cloud", "1"));
  const T = await c.newPage(); T.on("console", (m) => console.log("CONSOLE", m.text().slice(0, 200))); T.on("pageerror", (e) => console.log("PAGEERR", e.message));
  await T.goto("/instructor.html");
  await T.waitForTimeout(6000); console.log("DBG", JSON.stringify(await T.evaluate(() => window.__dbg()))); await T.click("#inboxBtn"); console.log("BADGES", JSON.stringify(await T.locator(".rfi-card .badge").allTextContents())); await T.waitForTimeout(500); console.log("BTN", await T.locator("#inboxBtn").textContent()); console.log("CARDS-me", await T.locator(".rfi-card").count()); await T.selectOption("#inFilter", "all"); await T.waitForTimeout(300); console.log("CARDS-all", await T.locator(".rfi-card").count(), JSON.stringify(await T.locator(".rfi-card b").allTextContents()));
});
