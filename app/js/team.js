/* Team projects: 2–4 apprentices build one 3A project together.
   1) Share & merge – swap "team files" (AirDrop / e-mail / USB / shared drive). Works offline, no accounts.
   2) Live sync     – optional; changes appear on teammates' devices in seconds through the JATC's
                      Firebase (Firestore) project. Turned on by filling in js/cloud-config.js.        */
PT.team = (() => {
  const { esc, $, $$, h, toast, modal, fmtDateTime, today, download } = PT.util;
  const store = PT.store;
  const SECTIONS = [["daily", "Daily reports (5 days)"], ["docs", "Material documents"], ["timesheets", "Time sheets"], ["tasks", "Tasks (3)"], ["rfis", "RFIs (3)"]];
  const MAX = 4;
  const teamProjects = () => store.get().projects.filter((p) => p.team);
  const me = () => store.get().user.name;
  const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30);
  const code = () => Array.from(crypto.getRandomValues(new Uint8Array(9)), (b) => "abcdefghjkmnpqrstuvwxyz23456789"[b % 31]).join("");

  /* ---------------- share & merge ---------------- */
  async function sendFile(pid) {
    const sh = store.shareFor(pid), p = sh.project;
    const name = `team-${slug(p.name)}-${slug(me())}-${today()}.json`;
    const blob = new Blob([JSON.stringify(sh)], { type: "application/json" });
    p.team.lastShared = new Date().toISOString(); store.emit();
    try {
      const file = new File([blob], name, { type: "application/json" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: `Team file – ${p.name}` }); return; }
    } catch (e) { if (e && e.name === "AbortError") return; }
    download(name, JSON.stringify(sh), "application/json");
    toast("Team file saved – send it to your teammates (AirDrop, e-mail, shared drive…)", "ok");
  }
  function mergeTexts(texts) {
    let tot = { added: 0, updated: 0, removed: 0 }, pid = null, n = 0;
    for (const t of texts) {
      const obj = JSON.parse(t);
      const st = store.mergeTeam(store.get(), obj, { noEmit: true });
      for (const k in tot) tot[k] += st[k];
      pid = obj.project.id; n++;
      const p = store.get().projects.find((x) => x.id === pid);
      if (p.team && !p.team.members.includes(me())) { p.team.members.push(me()); p.updatedAt = new Date().toISOString(); } // joined with this file
      p.team.lastMerged = new Date().toISOString();
      store.log(`Synced team project ${p.name} with ${obj.from || "a teammate"}'s file`);
    }
    if (pid) store.get().activeProjectId = pid;
    store.emit();
    toast(`Synced ${n} team file${n === 1 ? "" : "s"}: ${tot.added} new, ${tot.updated} updated, ${tot.removed} removed`, "ok");
    return tot;
  }
  function pickFiles() {
    const inp = h(`<input type="file" accept=".json,application/json" multiple hidden>`); document.body.appendChild(inp);
    inp.onchange = async () => {
      const files = [...inp.files]; inp.remove(); if (!files.length) return;
      try { mergeTexts(await Promise.all(files.map((f) => f.text()))); PT.app.renderChrome(); PT.app.route(); } catch (e) { toast(e.message, "warn"); }
    };
    inp.click();
  }

  function startForm() {
    const roster = PT.roster.APPRENTICES.filter((a) => a.name !== me());
    modal({
      title: "Start a team project", wide: true, submitLabel: "Start team project",
      body: `<p>Pick your teammates (2–${MAX} people counting you). You'll get a <b>team file</b> to send them – they open it with <b>Join / sync</b>.</p>
        <label>Team name <input name="name" required data-label="Team name" placeholder="e.g. Team 2 – Sierra Summit" value="3A PlanGrid Project – Team"></label>
        <b>Teammates</b><div class="watch-grid">${roster.map((a) => `<label class="check"><input type="checkbox" name="m" value="${esc(a.name)}"> #${a.no} ${esc(a.name)}</label>`).join("")}</div>
        <label style="margin-top:10px">Other teammate (not on the list) <input name="other" placeholder="Full name"></label>
        <label>Drawings <select name="src"><option value="samples">Start with the sample drawings (Bldg B) – recommended</option><option value="blank">Blank – we'll upload our own plans</option></select></label>
        <p class="muted small">Uploaded plans make the team file bigger. If you use your own plans, have <b>one</b> person upload them and send the team file right away.</p>`,
      onSubmit: (f) => {
        if (me() === "Apprentice") { toast("Set your name first: Settings → Your profile", "warn"); return false; }
        const members = [...[].concat(f.m || []), ...(f.other ? [f.other.trim()] : [])];
        if (members.length < 1) { toast("Pick at least one teammate", "warn"); return false; }
        if (members.length + 1 > MAX) { toast(`A team is 2–${MAX} people`, "warn"); return false; }
        const p = store.newTeamProject({ name: f.name.trim(), members, withSamples: f.src === "samples" });
        p.team.code = code(); p.updatedAt = new Date().toISOString(); store.emit();
        toast("Team project started – now send your team file to your teammates", "ok");
        PT.app.renderChrome(); location.hash = "#/teamproject"; PT.app.route();
      },
    });
  }

  /* ---------------- page ---------------- */
  function page(root) {
    const tps = teamProjects(), active = store.project();
    root.innerHTML = `<div class="page-head"><h1>Team Project</h1><div class="actions">
        <button class="btn" id="joinBtn">⤒ Join / sync with team files</button><button class="btn btn-primary" id="startBtn">+ Start a team project</button></div></div>
      <div class="card"><p><b>Work on the 3A PlanGrid Project as a team of 2–${MAX}.</b> One person starts the team project and sends the <b>team file</b>.
      Everyone opens it with <b>Join / sync</b>, then works on their own section. Whenever you want to combine work, everyone taps
      <b>⤓ Send my team file</b> and <b>⤒ Sync</b> with the files from the others – in any order, as often as you like. ${live.available() ? "Or turn on <b>Live sync</b> so changes appear on your teammates' devices by themselves." : ""}</p>
      <p class="muted small">Before you turn in your backup, sync one last time so your copy has everyone's work. Your instructor grades the team together and sees who did what.</p></div>
      ${tps.length ? tps.map((p) => card(p, p.id === active?.id)).join("") : `<div class="card"><p class="muted">You're not on a team project yet. Start one, or open the team file a teammate sent you with <b>Join / sync</b>.</p></div>`}`;
    $("#startBtn", root).onclick = startForm;
    $("#joinBtn", root).onclick = pickFiles;
    $$("[data-open]", root).forEach((b) => (b.onclick = () => { store.get().activeProjectId = b.dataset.open; store.emit(); PT.app.renderChrome(); location.hash = "#/"; }));
    $$("[data-send]", root).forEach((b) => (b.onclick = () => sendFile(b.dataset.send)));
    $$("[data-sync]", root).forEach((b) => (b.onclick = pickFiles));
    $$("[data-live]", root).forEach((b) => (b.onclick = () => live.toggle(b.dataset.live).then(() => page(root))));
    $$("select[data-sec]", root).forEach((s) => (s.onchange = () => {
      const p = store.get().projects.find((x) => x.id === s.dataset.p);
      p.team.sections = { ...(p.team.sections || {}), [s.dataset.sec]: s.value }; p.updatedAt = new Date().toISOString(); store.emit(); toast("Saved", "ok");
    }));
  }
  function card(p, isActive) {
    const t = p.team, st = store.get();
    const cnt = (c, f = () => true) => (st[c] || []).filter((r) => r.projectId === p.id && f(r));
    const by = (n) => ({
      daily: cnt("reports", (r) => r.type === "Daily Report" && r.createdBy === n).length, ts: cnt("reports", (r) => r.type === "Time Sheet" && r.createdBy === n).length,
      tasks: cnt("issues", (r) => r.type === "Task" && r.createdBy === n).length, rfis: cnt("rfis", (r) => r.createdBy === n).length,
      docs: cnt("docs", (d) => d.uploadedBy === n).length, mk: cnt("markups", (m) => m.createdBy === n).length,
    });
    const isLive = live.isOn(p.id);
    return `<section class="card team-card ${isActive ? "on" : ""}">
      <div class="row gap" style="justify-content:space-between;flex-wrap:wrap"><h2 style="margin:0">👥 ${esc(p.name)}</h2>
        <span>${isActive ? '<span class="badge st-Closed">Open now</span>' : `<button class="btn btn-sm" data-open="${p.id}">Open this project</button>`}
        ${isLive ? `<span class="badge st-Closed">● Live sync ${esc(live.status(p.id))}</span>` : ""}</span></div>
      <table class="tbl"><thead><tr><th>Member</th><th>Daily reports</th><th>Time sheets</th><th>Docs</th><th>Tasks</th><th>RFIs</th><th>Markups</th></tr></thead><tbody>
      ${t.members.map((n) => { const c = by(n); return `<tr><td><b>${esc(n)}</b>${n === me() ? " (you)" : ""}</td><td>${c.daily}</td><td>${c.ts}</td><td>${c.docs}</td><td>${c.tasks}</td><td>${c.rfis}</td><td>${c.mk}</td></tr>`; }).join("")}
      </tbody></table>
      <h3>Who does what</h3>
      <div class="form-grid">${SECTIONS.map(([k, l]) => `<label>${esc(l)} <select data-sec="${k}" data-p="${p.id}"><option value="">— anyone —</option>${t.members.map((n) => `<option ${t.sections?.[k] === n ? "selected" : ""}>${esc(n)}</option>`).join("")}</select></label>`).join("")}</div>
      <div class="row gap" style="flex-wrap:wrap;margin-top:12px">
        <button class="btn btn-primary" data-send="${p.id}">⤓ Send my team file</button>
        <button class="btn" data-sync="${p.id}">⤒ Sync with teammates' files</button>
        ${live.available() ? `<button class="btn" data-live="${p.id}">${isLive ? "⏸ Turn off live sync" : "⚡ Turn on live sync"}</button>` : ""}
      </div>
      <p class="muted small">${t.lastShared ? `You sent your team file ${fmtDateTime(t.lastShared)}. ` : ""}${t.lastMerged ? `Last synced with a teammate's file ${fmtDateTime(t.lastMerged)}.` : "Not synced with a teammate's file yet."}</p>
    </section>`;
  }

  /* ---------------- live sync (Firebase Firestore, optional) ---------------- */
  const live = (() => {
    const cfg = () => PT.cloudConfig;
    const V = "10.12.2", CDN = `https://www.gstatic.com/firebasejs/${V}/`;
    const on = () => (store.get().settings.liveSync ||= {});
    const device = (() => { try { let d = localStorage.getItem("pt-device"); if (!d) { d = code(); localStorage.setItem("pt-device", d); } return d; } catch { return code(); } })();
    const conns = {}; // pid -> { col, unsub, status }
    let fb = null, timer = null, warnedBig = false;
    const loadScript = (src) => new Promise((res, rej) => { const s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = () => rej(new Error("Live sync library could not load – check the internet connection")); document.head.appendChild(s); });
    async function firebase() {
      if (fb) return fb;
      if (!window.firebase) for (const f of ["firebase-app-compat.js", "firebase-auth-compat.js", "firebase-firestore-compat.js"]) await loadScript(CDN + f);
      const app = window.firebase.apps?.length ? window.firebase.app() : window.firebase.initializeApp(cfg());
      await app.auth().signInAnonymously();
      fb = { db: app.firestore() };
      return fb;
    }
    const docId = (k) => k.replace("/", "__");
    function docFor(k) {
      const [coll, id] = k.split("/"), st = store.get();
      if (coll === "tombstones") { const t = st.tombstones?.[id]; return t && { coll, id, pid: t.projectId, data: JSON.stringify(t) }; }
      if (coll === "projects") { const p = st.projects.find((x) => x.id === id); return p && { coll, id, pid: p.id, data: JSON.stringify(p) }; }
      const r = (st[coll] || []).find((x) => x.id === id); return r && { coll, id, pid: r.projectId, data: JSON.stringify(r) };
    }
    async function pushKeys(pid, keys) {
      const c = conns[pid]; if (!c) return;
      const docs = keys.map(docFor).filter((d) => d && d.pid === pid);
      for (let i = 0; i < docs.length; i += 300) {
        const batch = fb.db.batch();
        for (const d of docs.slice(i, i + 300)) {
          if (d.coll === "sheets" && d.data.includes('"Practice set"')) continue; // every teammate loads the practice plans with one tap
          if (d.data.length > 950000) { if (!warnedBig) { toast("A plan sheet is too big for live sync – send it with the team file instead", "warn"); warnedBig = true; } continue; }
          batch.set(c.col.doc(docId(d.coll + "/" + d.id)), { coll: d.coll, id: d.id, data: d.data, by: device, at: new Date().toISOString() });
        }
        await batch.commit();
      }
      c.status = "· saved " + new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    }
    function applyDocs(pid, docs) {
      const p = store.get().projects.find((x) => x.id === pid); if (!p) return;
      const share = { type: "plan-trainer-team", project: p, records: {}, tombstones: {}, activity: [] };
      for (const d of docs) {
        const obj = JSON.parse(d.data);
        if (d.coll === "projects") share.project = obj;
        else if (d.coll === "tombstones") share.tombstones[d.id] = obj;
        else (share.records[d.coll] ||= []).push(obj);
      }
      const s = store.mergeTeam(store.get(), share);
      if (s.added + s.updated + s.removed) conns[pid].status = "· updated " + new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    }
    async function connect(pid) {
      const p = store.get().projects.find((x) => x.id === pid); if (!p?.team) return;
      if (!p.team.code) { p.team.code = code(); p.updatedAt = new Date().toISOString(); store.emit(); }
      await firebase();
      const col = fb.db.collection("teams").doc(p.team.code).collection("records");
      conns[pid] = { col, status: "· connecting" };
      let first = true;
      conns[pid].unsub = col.onSnapshot((snap) => {
        const docs = snap.docChanges().filter((ch) => ch.type !== "removed").map((ch) => ch.doc.data()).filter((d) => d.by !== device || first);
        if (docs.length) applyDocs(pid, docs);
        if (first) { first = false; conns[pid].status = "· on"; pushAll(pid); if (location.hash.startsWith("#/teamproject") && !document.querySelector(".modal-backdrop")) PT.app.route(); }
      }, (e) => { conns[pid].status = "· error: " + e.message; });
      if (!timer) timer = setInterval(flush, 1500);
    }
    function pushAll(pid) {
      const sh = store.shareFor(pid);
      const keys = ["projects/" + pid, ...Object.entries(sh.records).flatMap(([c, rs]) => rs.map((r) => c + "/" + r.id)), ...Object.keys(sh.tombstones).map((id) => "tombstones/" + id)];
      return pushKeys(pid, keys);
    }
    function flush() {
      const keys = store.takeChanges(); if (!keys.length) return;
      for (const pid of Object.keys(conns)) pushKeys(pid, keys).catch((e) => (conns[pid].status = "· error: " + e.message));
    }
    return {
      available: () => !!cfg(),
      isOn: (pid) => !!on()[pid],
      status: (pid) => conns[pid]?.status || "",
      async toggle(pid) {
        if (on()[pid]) { conns[pid]?.unsub?.(); delete conns[pid]; delete on()[pid]; store.emit(); toast("Live sync off for this project"); return; }
        try { on()[pid] = true; store.emit(); await connect(pid); toast("Live sync on – your teammates' changes will appear by themselves", "ok"); }
        catch (e) { delete on()[pid]; store.emit(); toast(e.message, "warn"); }
      },
      async resume() { if (!cfg()) return; for (const pid of Object.keys(on())) connect(pid).catch((e) => toast("Live sync: " + e.message, "warn")); },
    };
  })();

  return { page, startForm, sendFile, pickFiles, mergeTexts, live };
})();
