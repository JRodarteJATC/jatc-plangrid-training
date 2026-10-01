const { test } = require("@playwright/test");
test.use({ ignoreHTTPSErrors: true, launchOptions: { executablePath: process.env.CHROMIUM_PATH, proxy: { server: process.env.HTTPS_PROXY, bypass: "<-loopback>,localhost,127.0.0.1" } } });
test("reg2", async ({ browser }) => {
  test.setTimeout(90000);
  const c = await browser.newContext({ ignoreHTTPSErrors: true, proxy: { server: process.env.HTTPS_PROXY, bypass: "<-loopback>,localhost,127.0.0.1" } }); await c.addInitScript(() => localStorage.setItem("pt-allow-real-cloud", "1")); const A = await c.newPage();
  A.on("console", (m) => console.log("C:", m.type(), m.text().slice(0, 250)));
  await A.goto("/#/settings"); await A.fill("#prof input[name=name]", "Mateo Ramirez"); await A.click("#prof button.btn-primary"); await A.waitForTimeout(300);
  await A.goto("/#/teamproject"); await A.click("#startBtn"); await A.fill(".modal input[name=company]", "ZZ reg2 – delete me");
  await A.check(".modal input[name=m][value='Luis Herrera']"); await A.click(".modal button[type=submit]");
  await A.waitForTimeout(8000);
  console.log("PID", await A.evaluate(() => PT.store.project().id + " live:" + PT.team.live.isOn(PT.store.project().id) + " " + PT.team.live.status(PT.store.project().id)));
});
