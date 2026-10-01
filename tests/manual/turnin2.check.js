const { test } = require("@playwright/test");
test.use({ ignoreHTTPSErrors: true, launchOptions: { executablePath: process.env.CHROMIUM_PATH, proxy: { server: process.env.HTTPS_PROXY, bypass: "<-loopback>,localhost,127.0.0.1" } } });
test("dbg", async ({ browser }) => {
  test.setTimeout(120000);
  const c = await browser.newContext({ ignoreHTTPSErrors: true, proxy: { server: process.env.HTTPS_PROXY, bypass: "<-loopback>,localhost,127.0.0.1" } }); await c.addInitScript(() => localStorage.setItem("pt-allow-real-cloud", "1"));
  const T = await c.newPage(); T.on("console", (m) => console.log("C:", m.text().slice(0, 200)));
  await T.goto("/instructor.html"); await T.waitForTimeout(1500);
  console.log(JSON.stringify(await T.evaluate(async () => { try { const subs = await PT.rfiLive.turnIns(); const r = []; for (const s of subs) { try { const st = await PT.rfiLive.fetchTurnIn(s); r.push([s.name, s.chunks, s.size, st.user?.name]); } catch (e) { r.push([s.name, "ERR " + e.message]); } } return r; } catch (e) { return "ERR " + e.message; } })));
});
