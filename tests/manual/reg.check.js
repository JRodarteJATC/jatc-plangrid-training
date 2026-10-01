const { test } = require("@playwright/test");
test.use({ ignoreHTTPSErrors: true, launchOptions: { executablePath: process.env.CHROMIUM_PATH, proxy: { server: process.env.HTTPS_PROXY, bypass: "<-loopback>,localhost,127.0.0.1" } } });
test("reg", async ({ browser }) => {
  test.setTimeout(60000);
  const c = await browser.newContext({ ignoreHTTPSErrors: true, proxy: { server: process.env.HTTPS_PROXY, bypass: "<-loopback>,localhost,127.0.0.1" } }); await c.addInitScript(() => localStorage.setItem("pt-allow-real-cloud", "1")); const A = await c.newPage();
  await A.goto("/#/"); await A.waitForTimeout(1000);
  console.log("RES", await A.evaluate(async () => { const p = PT.store.get().projects.find((x) => x.id === "prj_xu7mgtnyax1"); const s = PT.store.get(); s.projects.push({ id: "prj_zztest", name: "ZZ reg test", team: { code: "zzregtest", members: ["x"] } }); try { await PT.team.live.register("prj_zztest"); return "ok"; } catch (e) { return "ERR " + e.message + " " + e.stack; } }));
});
