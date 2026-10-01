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
  function afterTeamChange(pid) {
    const r = store.teamCheck(pid); if (!r) return r;
    if (r.deleted) {
      live.drop(pid);
      if (!store.isInstructor()) toast(`The instructor deleted the team “${r.team}”.${r.to ? ` Your work from the team is in “${r.to}”${r.what ? ` (${r.what})` : ""}.` : ""}`, "warn");
      PT.app.renderChrome && PT.app.renderChrome();
      if (location.hash.startsWith("#/teamproject") && !document.querySelector(".modal-backdrop")) PT.app.route();
      return r;
    }
    if (r.joined && r.what) toast(`Copied your work into the team from “${r.from}”: ${r.what}. “${r.from}” still has it – switch projects with the menu at the top.`, "ok");
    if (r.left && live.isOn(pid)) setTimeout(() => { if (live.isOn(pid)) live.toggle(pid).catch(() => {}); }, 8000); // stop live-syncing a team you're no longer on (after your leave has gone out)
    if (r.left) toast(`You're off the team – you're back in “${r.to}”${r.what ? ` with the work you did in the team (${r.what})` : ""}. Everything you had before joining is still there.`, "ok");
    PT.app.renderChrome && PT.app.renderChrome();
    return r;
  }
  function mergeTexts(texts) {
    let tot = { added: 0, updated: 0, removed: 0 }, pid = null, n = 0;
    for (const t of texts) {
      const obj = JSON.parse(t);
      const st = store.mergeTeam(store.get(), obj, { noEmit: true });
      if (st.deletedTeam) { toast(`“${obj.project.name}” was deleted by the instructor – that team file can't be used any more.`, "warn"); continue; }
      for (const k in tot) tot[k] += st[k];
      pid = obj.project.id; n++;
      const p = store.get().projects.find((x) => x.id === pid);
      if (p.team && !p.team.members.includes(me())) {
        const e = p.team.memberLog?.[me()];
        if (e && !e.in) toast(e.by === me() ? `You left ${p.name}. Ask a teammate to add you back if you want to rejoin.` : `${e.by || "A teammate"} removed you from ${p.name}. Ask them to add you back if that was a mistake.`, "warn");
        else store.setTeamMember(pid, me(), true); // joined with this file
      }
      p.team.lastMerged = new Date().toISOString();
      store.log(`Synced team project ${p.name} with ${obj.from || "a teammate"}'s file`);
    }
    if (pid) store.get().activeProjectId = pid;
    store.emit();
    if (pid) afterTeamChange(pid);
    const jp = pid && store.get().projects.find((x) => x.id === pid);
    if (jp?.team?.members.includes(me()) && live.available() && !live.isOn(pid)) live.toggle(pid).catch(() => {});
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
      body: `<p>Pick your teammates (2–${MAX} people counting you). ${live.available() ? "They get an <b>invite</b> in their app (Team Project page) – no file needed." : "You'll get a <b>team file</b> to send them – they open it with <b>Join / sync</b>."}</p>
        <label>Your team's company name <b style="color:#c0392b">*</b> <input name="company" list="tmCo" required data-label="Company name" placeholder="Pick or type your roofing company"></label>
        <datalist id="tmCo">${PT.roster.COMPANIES.map((c) => `<option value="${esc(c)}">`).join("")}</datalist>
        <p class="muted small">Every team works as a roofing company. The company name is your team's name (one company per team).</p>
        <b>Teammates</b><div class="watch-grid">${roster.map((a) => `<label class="check"><input type="checkbox" name="m" value="${esc(a.name)}"> #${a.no} ${esc(a.name)}</label>`).join("")}</div>
        <label style="margin-top:10px">Other teammate (not on the list) <input name="other" placeholder="Full name"></label>
        <label>Drawings <select name="src"><option value="samples">Start with the sample drawings (Bldg B) – recommended</option><option value="blank">Blank – we'll upload our own plans</option></select></label>
        <p class="muted small">Uploaded plans make the team file bigger. If you use your own plans, have <b>one</b> person upload them and send the team file right away.</p>`,
      onSubmit: (f) => {
        if (me() === "Apprentice") { toast("Set your name first: Settings → Your profile", "warn"); return false; }
        const company = (f.company || "").trim();
        if (company.length < 3) { toast("Choose your team's company name", "warn"); return false; }
        const taken = store.get().projects.some((p) => p.team && p.name.toLowerCase() === company.toLowerCase());
        if (taken) { toast("You already have a team with that company name – pick another", "warn"); return false; }
        f.name = company;
        const members = [...[].concat(f.m || []), ...(f.other ? [f.other.trim()] : [])];
        if (members.length < 1) { toast("Pick at least one teammate", "warn"); return false; }
        if (members.length + 1 > MAX) { toast(`A team is 2–${MAX} people`, "warn"); return false; }
        const p = store.newTeamProject({ name: f.name.trim(), members, withSamples: f.src === "samples" });
        p.team.code = code(); p.team.company = company; p.updatedAt = new Date().toISOString(); store.emit();
        afterTeamChange(p.id);
        if (live.available()) live.toggle(p.id).catch(() => {}); // live sync on by default – teammates and the instructor see the work
        toast(live.available() ? "Team started – your teammates get an invite on their Team Project page" : "Team project started – now send your team file to your teammates", "ok");
        PT.app.renderChrome(); location.hash = "#/teamproject"; PT.app.route();
      },
    });
  }

  /* ---------------- join by invite (online) ---------------- */
  async function joinOnline(d) {
    const s = store.get();
    let p = s.projects.find((x) => x.id === d.id);
    if (!p) { p = { id: d.id, name: d.name, number: "TEAM", address: "", createdAt: d.at, updatedAt: "0", team: { members: d.members || [], sections: {}, code: d.code, company: d.company || d.name, createdBy: d.createdBy } }; s.projects.push(p); }
    (s.teamLocal ||= { imported: {}, movedOut: {} }).pendingJoin = { ...(s.teamLocal.pendingJoin || {}), [d.id]: true };
    s.activeProjectId = d.id; store.emit();
    if (!live.isOn(d.id)) await live.toggle(d.id);
    toast(`Joining ${d.name} – the team's work loads in a few seconds`, "ok");
    PT.app.renderChrome(); location.hash = "#/teamproject"; PT.app.route();
  }
  // after the team's data arrives: make sure I'm a member (joined by code) and bring my earlier work in
  function finishJoin(pid) {
    const s = store.get(), pend = s.teamLocal?.pendingJoin; if (!pend?.[pid]) return;
    const p = s.projects.find((x) => x.id === pid); if (!p || p.updatedAt === "0") return;
    delete pend[pid];
    if (!p.team.members.includes(me()) && !store.isInstructor()) store.setTeamMember(pid, me(), true);
    live.register(pid).catch(() => {});
  }
  /* Instructor only: delete a team. Each member's work goes back to their own project (like Leave), then the team is
     removed from every device, the class team list and the cloud. */
  function askDelete(d) {
    if (!d || !store.isInstructor()) return;
    const kids = (d.members || []).filter((n) => !PT.roster.isInstructorName(n));
    PT.util.confirmBox(`Delete the team “${d.name}”${kids.length ? ` (${kids.join(", ")})` : ""}? Each member's tasks, RFIs, punch items and daily reports go back to their own project – nothing they did is lost for grading. The team project is removed from every device${live.available() ? ", from All class teams and from the cloud" : ""}. This can't be undone.`, async () => {
      try {
        toast(`Deleting “${d.name}”…`);
        await live.deleteTeam(d);
        toast(`Team “${d.name}” deleted – members get their work back the next time their app is online`, "ok");
      } catch (e) { toast("Couldn't delete the team: " + e.message, "warn"); }
      PT.app.renderChrome && PT.app.renderChrome();
      if (location.hash.startsWith("#/teamproject")) PT.app.route();
    }, "Delete team");
  }
  function codeForm() {
    modal({ title: "Join with a team code", body: `<p>Ask the teammate who started the team for the <b>team code</b> (on their Team Project page).</p><label>Team code <input name="code" required autocapitalize="none" autocomplete="off" data-label="Team code" placeholder="e.g. k7m2x9qpd"></label>`,
      submitLabel: "Join", onSubmit: async (f) => {
        const c = (f.code || "").trim().toLowerCase();
        const d = (await live.directory()).find((x) => String(x.code).toLowerCase() === c);
        if (!d) { toast("No team with that code – check it and make sure the team's creator is online", "warn"); return false; }
        await joinOnline(d);
      } });
  }

  /* ---------------- page ---------------- */
  let inviteTimer = null;
  function page(root) {
    const tps = teamProjects(), active = store.project();
    root.innerHTML = `<div class="page-head"><h1>Team Project</h1><div class="actions">
        ${live.available() ? `<button class="btn" id="codeBtn">🔑 Join with a team code</button>` : ""}<button class="btn" id="joinBtn" title="Offline way: open a team file a teammate sent you">⤒ Join / sync with team files</button><button class="btn btn-primary" id="startBtn">+ Start a team project</button></div></div>
      ${live.available() && !store.isInstructor() ? `<div id="invites"></div>` : ""}
      <div class="card"><p><b>Work on the 3A PlanGrid Project as a team of 2–${MAX}.</b> One person starts the team project and sends the <b>team file</b>.
      Everyone opens it with <b>Join / sync</b>, then works on their own section. Whenever you want to combine work, everyone taps
      <b>⤓ Send my team file</b> and <b>⤒ Sync</b> with the files from the others – in any order, as often as you like. ${live.available() ? "Or turn on <b>Live sync</b> so changes appear on your teammates' devices by themselves." : ""}</p>
      <p class="muted small">Before you turn in your backup, sync one last time so your copy has everyone's work. Your instructor grades the team together and sees who did what.</p></div>
      ${store.isInstructor() && live.available() ? `<section class="card" id="allTeams"><h2>👨‍🏫 All class teams</h2><p class="muted small">Every team project with live sync shows here. Tap <b>Follow</b> to open it on this device – you're a member of every team and see their work live.</p><div id="dirList" class="muted">Loading…</div></section>` : ""}
      ${tps.length ? tps.map((p) => card(p, p.id === active?.id)).join("") : `<div class="card"><p class="muted">You're not on a team project yet. Start one, or open the team file a teammate sent you with <b>Join / sync</b>.</p></div>`}`;
    $("#codeBtn", root) && ($("#codeBtn", root).onclick = codeForm);
    const loadInvites = () => live.directory().then((list) => {
      const el = $("#invites", root); if (!el || !document.body.contains(el)) return;
      const mine = list.filter((d) => (d.members || []).includes(me()) && !(store.get().projects.find((p) => p.id === d.id && live.isOn(d.id)))
        && store.get().projects.find((p) => p.id === d.id)?.team?.memberLog?.[me()]?.in !== false);
      el.innerHTML = mine.length ? `<section class="card" style="border-color:#2e9e44"><h2>📨 Team invites for you</h2>${mine.map((d) => `<div class="row gap" style="justify-content:space-between;flex-wrap:wrap;margin:6px 0">
        <span><b>${esc(d.name)}</b> <span class="muted small">started by ${esc(d.createdBy || "a teammate")} · ${esc((d.members || []).filter((n) => !PT.roster.isInstructorName(n)).join(", "))}</span></span>
        <button class="btn btn-primary btn-sm" data-joininv="${esc(d.id)}">Join team</button></div>`).join("")}</section>` : "";
      $$("[data-joininv]", el).forEach((b) => (b.onclick = () => joinOnline(mine.find((d) => d.id === b.dataset.joininv))));
    }).catch(() => {});
    if ($("#invites", root)) {
      loadInvites();
      // keep looking for new invites while this page is open (a few reads a minute)
      clearInterval(inviteTimer);
      inviteTimer = setInterval(() => { if (!location.hash.startsWith("#/teamproject") || !document.body.contains($("#invites", root) || document.createElement("i"))) { clearInterval(inviteTimer); return; } if (!document.hidden) loadInvites(); }, 45000);
    }
    // make sure each of my live teams is listed in the class directory (re-done when the members change)
    for (const p of teamProjects()) if (live.isOn(p.id) && (p.team.members || []).includes(me())) {
      const sig = (p.team.members || []).join("|") + "|" + p.name;
      const sy = ((store.get().teamLocal ||= { imported: {}, movedOut: {} }).sync ||= {});
      if ((sy[p.id] || {}).reg !== sig) live.register(p.id).then(() => { sy[p.id] = { ...(sy[p.id] || {}), reg: sig }; }).catch(() => {});
    }
    if ($("#dirList", root)) live.directory().then((list) => {
      const el = $("#dirList", root); if (!el) return;
      list.sort((a, b) => String(b.at).localeCompare(String(a.at)));
      el.classList.remove("muted");
      el.innerHTML = list.length ? `<table class="tbl"><thead><tr><th>Team</th><th>Members</th><th>Updated</th><th></th></tr></thead><tbody>${list.map((d) => {
        const have = store.get().projects.find((p) => p.id === d.id);
        return `<tr><td><b>${esc(d.name)}</b></td><td>${esc((d.members || []).filter((n) => !PT.roster.isInstructorName(n)).join(", "))}</td><td class="small">${fmtDateTime(d.at)}</td>
          <td style="white-space:nowrap">${have && live.isOn(d.id) ? `<button class="btn btn-sm" data-open="${d.id}">Open</button>` : `<button class="btn btn-sm btn-primary" data-follow="${esc(d.id)}">Follow</button>`} <button class="btn btn-sm btn-danger" data-deldir="${esc(d.id)}" title="Delete this team">🗑 Delete</button></td></tr>`; }).join("")}</tbody></table>`
        : `<p class="muted">No teams yet. Teams appear here when apprentices start a team project (with internet).</p>`;
      $$("[data-open]", el).forEach((b) => (b.onclick = () => { store.get().activeProjectId = b.dataset.open; store.emit(); PT.app.renderChrome(); location.hash = "#/"; }));
      $$("[data-deldir]", el).forEach((b) => (b.onclick = () => askDelete(list.find((x) => x.id === b.dataset.deldir))));
      $$("[data-follow]", el).forEach((b) => (b.onclick = async () => {
        const d = list.find((x) => x.id === b.dataset.follow); const s = store.get();
        if (!s.projects.find((p) => p.id === d.id)) s.projects.push({ id: d.id, name: d.name, number: "TEAM", address: "", createdAt: d.at, updatedAt: "0", team: { members: d.members || [], sections: {}, code: d.code, createdBy: d.createdBy } });
        store.emit();
        if (!live.isOn(d.id)) await live.toggle(d.id);
        toast(`Following ${d.name} – their work loads in a few seconds`, "ok"); page(root);
      }));
    }).catch((e) => { const el = $("#dirList", root); if (el) el.textContent = "Couldn't load the team list (" + e.message + ")"; });
    $("#startBtn", root).onclick = startForm;
    $("#joinBtn", root).onclick = pickFiles;
    $$("[data-open]", root).forEach((b) => (b.onclick = () => { store.get().activeProjectId = b.dataset.open; store.emit(); PT.app.renderChrome(); location.hash = "#/"; }));
    $$("[data-send]", root).forEach((b) => (b.onclick = () => sendFile(b.dataset.send)));
    $$("[data-sync]", root).forEach((b) => (b.onclick = pickFiles));
    $$("[data-live]", root).forEach((b) => (b.onclick = () => live.toggle(b.dataset.live).then(() => page(root))));
    const proj = (id) => store.get().projects.find((x) => x.id === id);
    $$("[data-rm]", root).forEach((b) => (b.onclick = () => PT.util.confirmBox(`Remove ${b.dataset.rm} from ${proj(b.dataset.p).name}? Their work is hidden from the team and no longer counts for it (it moves to their own project on their device). Send your team file (or keep live sync on) so everyone gets the change.`, () => { store.setTeamMember(b.dataset.p, b.dataset.rm, false); live.register(b.dataset.p).catch(() => {}); toast(`${b.dataset.rm} removed – send your team file so teammates get the change`, "ok"); page(root); }, "Remove")));
    $$("[data-leave]", root).forEach((b) => (b.onclick = () => PT.util.confirmBox(`Leave ${proj(b.dataset.leave).name}? Your tasks, RFIs, punch items and daily reports move to a project of your own and are graded on their own – they no longer show or count for the team. Then send your team file once so your teammates see that you left.`, () => { const pid = b.dataset.leave; store.setTeamMember(pid, me(), false); if (!afterTeamChange(pid)?.what) toast("You left the team", "ok"); toast("Send your team file once so your teammates see that you left", "ok"); page(root); }, "Leave team")));
    $$("[data-delteam]", root).forEach((b) => (b.onclick = () => { const p = proj(b.dataset.delteam); askDelete({ id: p.id, name: p.name, code: p.team.code, members: p.team.members, at: p.createdAt, createdBy: p.team.createdBy }); }));
    $$("[data-add]", root).forEach((b) => (b.onclick = () => {
      const p = proj(b.dataset.add), roster = (PT.roster?.APPRENTICES || []).map((a) => a.name).filter((n) => !p.team.members.includes(n));
      modal({ title: `Add a teammate to ${p.name}`, body: `<label>Teammate <select name="n"><option value="">— pick —</option>${roster.map((n) => `<option>${esc(n)}</option>`).join("")}</select></label><label>…or type a name <input name="other" placeholder="First Last"></label>`,
        submitLabel: "Add", onSubmit: (f) => { const n = (f.other || "").trim() || f.n; if (!n) { toast("Pick a name", "warn"); return false; } store.setTeamMember(p.id, n, true); live.register(p.id).catch(() => {}); toast(`${n} added – send them your team file`, "ok"); page(root); } });
    }));
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
    const inTeam = t.members.includes(me()) || store.isInstructor(), myOut = store.isInstructor() ? null : t.memberLog?.[me()];
    const students = t.members.filter((n) => !PT.roster.isInstructorName(n));
    const gone = Object.entries(t.memberLog || {}).filter(([n, e]) => !e.in && !t.members.includes(n));
    return `<section class="card team-card ${isActive ? "on" : ""}">
      <div class="row gap" style="justify-content:space-between;flex-wrap:wrap"><h2 style="margin:0">👥 ${esc(p.name)}${t.code && live.available() ? ` <span class="badge" title="Teammates who weren't invited can join with this code">Team code: ${esc(t.code)}</span>` : ""}</h2>
        <span>${isActive ? '<span class="badge st-Closed">Open now</span>' : `<button class="btn btn-sm" data-open="${p.id}">Open this project</button>`}
        ${isLive ? `<span class="badge st-Closed">● Live sync ${esc(live.status(p.id))}</span>` : ""}</span></div>
      <table class="tbl"><thead><tr><th>Member</th><th>Daily reports</th><th>Time sheets</th><th>Docs</th><th>Tasks</th><th>RFIs</th><th>Markups</th><th></th></tr></thead><tbody>
      ${t.members.map((n) => { const c = by(n), ins = PT.roster.isInstructorName(n); return `<tr><td><b>${esc(n)}</b>${n === me() ? " (you)" : ""}${ins ? ' <span class="badge">Instructor</span>' : ""}</td><td>${c.daily}</td><td>${c.ts}</td><td>${c.docs}</td><td>${c.tasks}</td><td>${c.rfis}</td><td>${c.mk}</td>
        <td>${!inTeam || (ins && !store.isInstructor()) ? "" : n === me() ? (ins ? "" : `<button class="btn btn-sm" data-leave="${p.id}">Leave team</button>`) : `<button class="btn btn-sm" data-rm="${esc(n)}" data-p="${p.id}">Remove</button>`}</td></tr>`; }).join("")}
      ${gone.map(([n, e]) => `<tr class="muted"><td><s>${esc(n)}</s></td><td colspan="7" class="small">${e.by === n ? "left the team" : "removed by " + esc(e.by || "a teammate")} ${fmtDateTime(e.at)}</td></tr>`).join("")}
      </tbody></table>
      ${!inTeam ? `<p class="badge st-Open" style="display:block;white-space:normal">You are no longer on this team${myOut?.by && myOut.by !== me() ? ` (removed by ${esc(myOut.by)})` : ""}. Your own work is in your project “${esc(p.name)} – my work” and is graded on its own. ${myOut?.by === me() ? "Send your team file once (or keep live sync on) so your teammates see that you left." : "Ask a teammate to add you back if this was a mistake."}</p>` :
        students.length < MAX ? `<p><button class="btn btn-sm" data-add="${p.id}">+ Add a teammate</button></p>` : ""}
      <h3>Who does what</h3>
      <div class="form-grid">${SECTIONS.map(([k, l]) => `<label>${esc(l)} <select data-sec="${k}" data-p="${p.id}"><option value="">— anyone —</option>${students.map((n) => `<option ${t.sections?.[k] === n ? "selected" : ""}>${esc(n)}</option>`).join("")}</select></label>`).join("")}</div>
      <div class="row gap" style="flex-wrap:wrap;margin-top:12px">
        <button class="btn btn-primary" data-send="${p.id}">⤓ Send my team file</button>
        <button class="btn" data-sync="${p.id}">⤒ Sync with teammates' files</button>
        ${live.available() ? `<button class="btn" data-live="${p.id}">${isLive ? "⏸ Turn off live sync" : "⚡ Turn on live sync"}</button>` : ""}
        ${store.isInstructor() ? `<button class="btn btn-danger" data-delteam="${p.id}">🗑 Delete team</button>` : ""}
      </div>
      <p class="muted small">${t.lastShared ? `You sent your team file ${fmtDateTime(t.lastShared)}. ` : ""}${t.lastMerged ? `Last synced with a teammate's file ${fmtDateTime(t.lastMerged)}.` : "Not synced with a teammate's file yet."}</p>
    </section>`;
  }

  /* ---------------- live sync (Firebase Firestore, optional) ---------------- */
  const live = (() => {
    // automated tests run on localhost – they must never write to the class's real Firebase
    const testing = () => { try { return /^(localhost|127\.0\.0\.1)$/.test(location.hostname) && PT.cloudConfig?.projectId === "jatc-plan-room" && !localStorage.getItem("pt-allow-real-cloud"); } catch { return false; } };
    const cfg = () => (testing() ? null : PT.cloudConfig);
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
    // Saving Firebase reads: remember (on this device) the newest server time we've seen for each team and the last time
    // we pushed – so opening the app only downloads what changed since last time, and only uploads what changed here.
    // kept with the project data itself (a Reset or a fresh device starts over with a full download)
    const syncAll = () => ((store.get().teamLocal ||= { imported: {}, movedOut: {} }).sync ||= {});
    const syncInfo = (pid) => syncAll()[pid] || {};
    const setSync = (pid, patch) => { syncAll()[pid] = { ...syncInfo(pid), ...patch }; };
    const ms = (st) => (st == null ? null : typeof st === "number" ? st : st.toMillis ? st.toMillis() : null);
    const serverTime = () => window.firebase.firestore.FieldValue.serverTimestamp();
    function docFor(k) {
      const [coll, id] = k.split("/"), st = store.get();
      if (coll === "tombstones") { const t = st.tombstones?.[id]; return t && { coll, id, pid: t.projectId, data: JSON.stringify(t) }; }
      if (coll === "projects") { const p = st.projects.find((x) => x.id === id); return p && p.updatedAt !== "0" && { coll, id, pid: p.id, data: JSON.stringify(p) }; } // "0" = instructor's placeholder until the real one arrives
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
          batch.set(c.col.doc(docId(d.coll + "/" + d.id)), { coll: d.coll, id: d.id, data: d.data, by: device, at: new Date().toISOString(), st: serverTime() });
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
      finishJoin(pid);
      afterTeamChange(pid);
      if (conns[pid] && s.added + s.updated + s.removed) conns[pid].status = "· updated " + new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    }
    async function connect(pid) {
      const p = store.get().projects.find((x) => x.id === pid); if (!p?.team) return;
      if (!p.team.code) { p.team.code = code(); p.updatedAt = new Date().toISOString(); store.emit(); }
      await firebase();
      register(pid).catch((e) => console.warn("team directory:", e.message));
      const col = fb.db.collection("teams").doc(p.team.code).collection("records");
      conns[pid] = { col, status: "· connecting" };
      let first = true;
      // already have this team on this device? only ask for what changed since (minus 5 min of overlap)
      const seen = syncInfo(pid).seen;
      const q = seen ? col.where("st", ">", window.firebase.firestore.Timestamp.fromMillis(seen - 300000)) : col;
      conns[pid].unsub = q.onSnapshot((snap) => {
        const raw = snap.docChanges().filter((ch) => ch.type !== "removed").map((ch) => ch.doc.data());
        let top = syncInfo(pid).seen || 0; for (const d of raw) { const m = ms(d.st); if (m && m > top) top = m; }
        if (top) setSync(pid, { seen: top });
        const docs = raw.filter((d) => d.by !== device || first);
        if (docs.length) applyDocs(pid, docs);
        if (!conns[pid] || !store.get().projects.some((x) => x.id === pid)) return; // team was deleted
        if (first) { first = false; conns[pid].status = "· on"; if (!store.isInstructor()) pushAll(pid, syncInfo(pid).pushed); if (location.hash.startsWith("#/teamproject") && !document.querySelector(".modal-backdrop")) PT.app.route(); }
      }, (e) => { conns[pid].status = "· error: " + e.message; });
      if (!timer) timer = setInterval(flush, 1500);
    }
    // upload this device's copy – everything the first time, afterwards only what changed since the last upload
    async function pushAll(pid, since = "") {
      const sh = store.shareFor(pid), startedAt = new Date().toISOString();
      const newer = (r) => !since || String(r.updatedAt || r.createdAt || "") > since;
      const keys = [...(newer(sh.project || {}) ? ["projects/" + pid] : []), ...Object.entries(sh.records).flatMap(([c, rs]) => rs.filter(newer).map((r) => c + "/" + r.id)),
        ...Object.entries(sh.tombstones).filter(([, tb]) => !since || String(tb.at) > since).map(([id]) => "tombstones/" + id)];
      await pushKeys(pid, keys);
      setSync(pid, { pushed: startedAt });
    }
    function flush() {
      const keys = store.takeChanges(); if (!keys.length) return;
      for (const pid of Object.keys(conns)) pushKeys(pid, keys).catch((e) => (conns[pid].status = "· error: " + e.message));
    }
    // Class team directory: every team project with live sync is listed here so the instructor can follow all of them.
    const DIR = "jatc-team-directory";
    async function register(pid) {
      const p = store.get().projects.find((x) => x.id === pid); if (!p?.team?.code) return;
      await firebase();
      const info = { id: p.id, name: p.name, company: p.team.company || p.name, code: p.team.code, members: p.team.members, createdBy: p.team.createdBy || "", at: new Date().toISOString() };
      await fb.db.collection("teams").doc(DIR).collection("records").doc("team__" + p.id).set({ coll: "team", id: p.id, data: JSON.stringify(info), by: me(), at: info.at });
    }
    async function directory() {
      await firebase();
      const snap = await fb.db.collection("teams").doc(DIR).collection("records").get();
      const rows = snap.docs.map((d) => { try { return { coll: d.data().coll, ...JSON.parse(d.data().data) }; } catch { return null; } }).filter(Boolean);
      const gone = new Set(rows.filter((r) => r.coll === "deletedTeam").map((r) => r.id));
      return rows.filter((r) => r.coll !== "deletedTeam" && !gone.has(r.id));
    }
    function drop(pid) { conns[pid]?.unsub?.(); delete conns[pid]; delete on()[pid]; }
    async function deleteTeam(d) {
      const local = store.get().projects.find((x) => x.id === d.id);
      const code = d.code || local?.team?.code;
      drop(d.id);
      if (cfg() && code) {
        await firebase();
        const col = fb.db.collection("teams").doc(code).collection("records"), pdoc = "projects__" + d.id;
        const all = (await col.get()).docs;
        const cloudP = all.find((x) => x.id === pdoc);
        let proj = local && local.updatedAt !== "0" ? JSON.parse(JSON.stringify(local)) : null;
        if (!proj && cloudP) try { proj = JSON.parse(cloudP.data().data); } catch { }
        if (!proj) proj = { id: d.id, name: d.name, number: "TEAM", address: "", createdAt: d.at || new Date().toISOString(), team: { members: d.members || [], sections: {}, code, createdBy: d.createdBy || "" } };
        const at = new Date().toISOString();
        proj.team.deleted = { at, by: me() }; proj.updatedAt = at;
        // 1) the "deleted" note goes up first so members' devices hear about it, 2) the team's records are erased,
        // 3) the team leaves the class list
        await col.doc(pdoc).set({ coll: "projects", id: d.id, data: JSON.stringify(proj), by: device, at, st: serverTime() });
        const rest = all.filter((x) => x.id !== pdoc);
        for (let i = 0; i < rest.length; i += 400) { const b = fb.db.batch(); for (const x of rest.slice(i, i + 400)) b.delete(col.doc(x.id)); await b.commit(); }
        const dir = fb.db.collection("teams").doc(DIR).collection("records"), db = fb.db.batch();
        db.delete(dir.doc("team__" + d.id));
        db.set(dir.doc("deleted__" + d.id), { coll: "deletedTeam", id: d.id, data: JSON.stringify({ id: d.id, deleted: at }), by: me(), at }); // so a member's device that re-lists the team can't bring it back
        await db.commit();
      }
      store.dropTeam(d.id);
    }
    return {
      register, directory, drop, deleteTeam,
      available: () => !!cfg(),
      isOn: (pid) => !!on()[pid],
      status: (pid) => conns[pid]?.status || "",
      async toggle(pid) {
        if (on()[pid]) { conns[pid]?.unsub?.(); delete conns[pid]; delete on()[pid]; store.emit(); toast("Live sync off for this project"); return; }
        try { on()[pid] = true; store.emit(); await connect(pid); toast("Live sync on – your teammates' changes will appear by themselves", "ok"); }
        catch (e) { delete on()[pid]; store.emit(); toast(e.message, "warn"); }
      },
      async resume() {
        if (!cfg()) return;
        for (const pid of Object.keys(on())) {
          const p = store.get().projects.find((x) => x.id === pid);
          if (p?.team && !p.team.members.includes(me()) && p.team.memberLog?.[me()]?.in === false) { delete on()[pid]; continue; } // not on that team any more
          connect(pid).catch((e) => toast("Live sync: " + e.message, "warn"));
        }
      },
    };
  })();

  return { page, startForm, sendFile, pickFiles, mergeTexts, live };
})();
