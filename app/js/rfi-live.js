/* Live RFI inbox.
   When an apprentice sends an RFI to the instructor (Assigned to: Juan Rodarte / Instructor, status not Draft),
   it is copied to the JATC Firebase project, so it shows up in the Instructor Dashboard's RFI inbox by itself –
   no backup file needed. Answers the instructor sends come back to the apprentice's app by themselves.
   Uses the same Firebase project and security rules as team live sync (teams/{code}/records/{doc}).
   The answers-file / backup-file way keeps working when there is no internet.                     */
PT.rfiLive = (() => {
  const CDN = "https://www.gstatic.com/firebasejs/10.12.2/";
  const INBOX = "jatc-instructor-rfi-inbox";
  // Automated tests run the app on localhost – they must never write to the class's real inbox.
  const testing = () => { try { return /^(localhost|127\.0\.0\.1)$/.test(location.hostname) && PT.cloudConfig?.projectId === "jatc-plan-room" && !localStorage.getItem("pt-allow-real-cloud"); } catch { return false; } };
  const cfg = () => (PT.cloudConfig && PT.cloudConfig.apiKey && !testing() ? PT.cloudConfig : null);
  const toInstructor = (r) => /rodarte|instructor/i.test(r.assignedTo || "") && r.status && r.status !== "Draft";
  const loadScript = (src) => new Promise((res, rej) => { const s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = () => rej(new Error("Could not reach the internet")); document.head.appendChild(s); });
  let colP = null;
  function col() {
    if (!colP) colP = (async () => {
      if (!window.firebase) for (const f of ["firebase-app-compat.js", "firebase-auth-compat.js", "firebase-firestore-compat.js"]) await loadScript(CDN + f);
      const app = window.firebase.apps?.length ? window.firebase.app() : window.firebase.initializeApp(cfg());
      await app.auth().signInAnonymously();
      const db = app.firestore();
      // school / shop networks often hold streaming connections open without delivering – let Firestore switch to long polling
      try { db.settings({ experimentalForceLongPolling: true, merge: true }); } catch { }
      // plain HTTPS read of the whole inbox – works even where the live connection is held up by the network
      const rest = async (onlyAnswers) => {
        const tok = await app.auth().currentUser.getIdToken();
        const base = `https://firestore.googleapis.com/v1/projects/${cfg().projectId}/databases/(default)/documents/teams/${INBOX}/records`;
        const out = []; let page = "";
        do {
          const res = await fetch(`${base}?pageSize=300${page ? "&pageToken=" + encodeURIComponent(page) : ""}`, { headers: { Authorization: "Bearer " + tok }, cache: "no-store" });
          if (!res.ok) throw new Error("inbox " + res.status);
          const j = await res.json();
          for (const d of j.documents || []) {
            const f = d.fields || {}, v = (k) => f[k]?.stringValue;
            if (onlyAnswers && v("coll") !== "answer") continue;
            const rec = { coll: v("coll"), id: v("id"), data: v("data"), by: v("by"), at: v("at") };
            out.push({ data: () => rec });
          }
          page = j.nextPageToken || "";
        } while (page);
        return { docs: out };
      };
      return { db, rest, col: db.collection("teams").doc(INBOX).collection("records") };
    })().catch((e) => { colP = null; throw e; });
    return colP;
  }
  const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { } };

  /* ---------- apprentice app ---------- */
  function startApprentice() {
    if (!cfg()) return;
    const store = PT.store;
    let timer = null, listening = false, busy = false;
    const tick = async () => {
      if (busy) return; busy = true;
      try {
        const st = store.get(), me = st.user?.name || "";
        if (!me || me === "Apprentice") return;
        const all = (st.rfis || []).filter((r) => toInstructor(r) && (!r.createdBy || r.createdBy === me || r.createdBy === "Apprentice"));
        if (!all.length) return;
        // the same RFI can exist in two projects (copied into / out of a team) – send one: the newest copy
        const byRoot = {};
        for (const r of all) { const k = r.copiedFrom || r.id, o = byRoot[k]; if (!o || String(r.updatedAt || r.createdAt || "") > String(o.updatedAt || o.createdAt || "")) byRoot[k] = r; }
        const mine = Object.values(byRoot);
        const sent = read("pt-rfi-live-sent", {});
        const out = [];
        for (const r of mine) {
          const sheets = (st.sheets || []).filter((s) => (r.sheetIds || []).includes(s.id));
          const rec = {
            ...r, id: r.copiedFrom || r.id, localId: r.id, from: me, classYear: st.user?.classYear || "", project: (st.projects || []).find((p) => p.id === r.projectId)?.name || "",
            sheets: sheets.map((s) => s.number).join(", "),
            published: (st.markups || []).filter((m) => (r.sheetIds || []).includes(m.sheetId) && m.layer === "published").length,
          };
          const data = JSON.stringify(rec);
          if (sent[r.id] !== data.length + ":" + (r.updatedAt || "") + ":" + r.status + ":" + (r.answer || "").length) out.push({ r, data });
        }
        if (out.length) {
          const { db, col: c } = await col();
          const b = db.batch();
          for (const { r, data } of out) b.set(c.doc("rfi__" + (r.copiedFrom || r.id)), { coll: "rfi", id: r.copiedFrom || r.id, data, by: me, at: new Date().toISOString() });
          await b.commit();
          for (const { r, data } of out) sent[r.id] = data.length + ":" + (r.updatedAt || "") + ":" + r.status + ":" + (r.answer || "").length;
          write("pt-rfi-live-sent", sent);
          const fresh = out.filter(({ r }) => !r.liveSentAt);
          if (fresh.length) {
            for (const { r } of fresh) r.liveSentAt = new Date().toISOString();
            store.emit();
            PT.util.toast(`RFI sent to your instructor's inbox (${fresh.map(({ r }) => "RFI-" + String(r.number).padStart(3, "0")).join(", ")})`, "ok");
          }
        }
        const { col: c, rest } = await col();
        const takeAnswers = (docs) => {
          // only this apprentice's own RFIs – teammates get theirs on their own devices (avoids devices fighting over answers)
          const meNow = store.get().user?.name;
          const ids = new Set((store.get().rfis || []).filter((r) => r.createdBy === meNow).flatMap((r) => [r.id, r.copiedFrom].filter(Boolean)));
          const answers = docs.map((doc) => { try { return JSON.parse(doc.data().data); } catch { return null; } }).filter((a) => a && ids.has(a.id));
          if (!answers.length) return;
          const n = store.applyRfiAnswers({ type: "plan-trainer-rfi-answers", from: "Instructor", answers, onlyBy: meNow });
          if (n) PT.util.toast(`${n} RFI answer${n === 1 ? "" : "s"} from your instructor – see RFIs`, "ok");
        };
        if (!listening) {
          listening = true;
          c.where("coll", "==", "answer").onSnapshot((snap) => takeAnswers(snap.docChanges().map((ch) => ch.doc)), (e) => { listening = false; console.warn("RFI answers", e); });
        }
        // backup check for answers (every tick, i.e. at least every 20 s) in case live updates are delayed
        const open = mine.filter((r) => !r.answer);
        if (open.length) await rest(true).then((snap) => takeAnswers(snap.docs)).catch(() => {});
      } catch (e) { console.warn("RFI live inbox:", e.message); } finally { busy = false; }
    };
    // send quickly (students often close the tab right after Save & Send), and keep retrying until it goes through
    store.onChange(() => { clearTimeout(timer); timer = setTimeout(tick, 300); });
    setTimeout(() => { const n = store.get().user?.name; if (n && n !== "Apprentice") col().catch(() => {}); tick(); }, 300);
    setInterval(tick, 20000);
  }

  /* ---------- Instructor Dashboard ---------- */
  const live = {}, liveAns = {};
  let status = cfg() ? "connecting…" : "off";
  function startInstructor(onUpdate) {
    if (!cfg()) return;
    let lastSig = "";
    const take = (docs) => {
      for (const doc of docs) {
        const d = doc.data(); let obj; try { obj = JSON.parse(d.data); } catch { continue; }
        if (d.coll === "rfi") live[d.id] = obj; else if (d.coll === "answer") liveAns[d.id] = obj;
      }
      const sig = Object.values(live).map((x) => x.id + (x.updatedAt || "") + x.status).join("|") + Object.keys(liveAns).length;
      status = "live · checked " + new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" });
      if (sig !== lastSig) { lastSig = sig; onUpdate && onUpdate(); } else onUpdate && onUpdate("status");
    };
    col().then(({ col: c, rest }) => {
      c.onSnapshot((snap) => take(snap.docChanges().map((ch) => ch.doc)), (e) => console.warn("RFI inbox live:", e.message));
      // also check every 10 s over plain HTTPS (and when the page comes back into view) in case the network delays live updates
      const poll = () => rest().then((snap) => take(snap.docs)).catch((e) => { status = "offline (" + e.message + ")"; onUpdate && onUpdate("status"); });
      setInterval(poll, 10000); poll();
      document.addEventListener("visibilitychange", () => { if (!document.hidden) poll(); });
    }).catch((e) => { status = "offline (" + e.message + ")"; onUpdate && onUpdate(); });
  }
  async function sendAnswers(answers) {
    const { db, col: c } = await col();
    for (let i = 0; i < answers.length; i += 300) {
      const b = db.batch();
      for (const a of answers.slice(i, i + 300)) b.set(c.doc("answer__" + a.id), { coll: "answer", id: a.id, data: JSON.stringify(a), by: a.answeredBy || "Instructor", at: new Date().toISOString() });
      await b.commit();
    }
    for (const a of answers) liveAns[a.id] = a;
  }
  return { startApprentice, startInstructor, sendAnswers, enabled: () => !!cfg(), status: () => status, rfis: () => Object.values(live), sentAnswer: (id) => liveAns[id] };
})();
