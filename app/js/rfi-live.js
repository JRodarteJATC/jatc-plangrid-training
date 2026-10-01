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
      // generic HTTPS helpers (any teams/{code}/records collection)
      const restList = async (code, fields) => {
        const tok = await app.auth().currentUser.getIdToken();
        const base = `https://firestore.googleapis.com/v1/projects/${cfg().projectId}/databases/(default)/documents/teams/${code}/records`;
        const mask = (fields || []).map((f) => "&mask.fieldPaths=" + f).join("");
        const out = []; let page = "";
        do {
          const res = await fetch(`${base}?pageSize=300${mask}${page ? "&pageToken=" + encodeURIComponent(page) : ""}`, { headers: { Authorization: "Bearer " + tok }, cache: "no-store" });
          if (!res.ok) throw new Error("cloud " + res.status);
          const j = await res.json();
          for (const d of j.documents || []) out.push({ name: d.name.split("/").pop(), ...Object.fromEntries(Object.entries(d.fields || {}).map(([k, v]) => [k, v.stringValue ?? (v.integerValue != null ? +v.integerValue : v.booleanValue)])) });
          page = j.nextPageToken || "";
        } while (page);
        return out;
      };
      const restGet = async (code, name) => {
        const tok = await app.auth().currentUser.getIdToken();
        const res = await fetch(`https://firestore.googleapis.com/v1/projects/${cfg().projectId}/databases/(default)/documents/teams/${code}/records/${name}`, { headers: { Authorization: "Bearer " + tok }, cache: "no-store" });
        if (!res.ok) throw new Error("cloud " + res.status);
        const f = (await res.json()).fields || {};
        return Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v.stringValue ?? (v.integerValue != null ? +v.integerValue : v.booleanValue)]));
      };
      // one-field query over HTTPS (Firebase's free plan counts every document read – so ask only for what changed)
      const restQuery = async (code, field, op, value) => {
        const tok = await app.auth().currentUser.getIdToken();
        const url = `https://firestore.googleapis.com/v1/projects/${cfg().projectId}/databases/(default)/documents/teams/${code}:runQuery`;
        const body = { structuredQuery: { from: [{ collectionId: "records" }], where: { fieldFilter: { field: { fieldPath: field }, op: op === ">" ? "GREATER_THAN" : "EQUAL", value: { stringValue: String(value) } } } } };
        const res = await fetch(url, { method: "POST", headers: { Authorization: "Bearer " + tok, "Content-Type": "application/json" }, body: JSON.stringify(body), cache: "no-store" });
        if (!res.ok) throw new Error("cloud " + res.status);
        return (await res.json()).filter((x) => x.document).map((x) => {
          const rec = Object.fromEntries(Object.entries(x.document.fields || {}).map(([k, v]) => [k, v.stringValue ?? (v.integerValue != null ? +v.integerValue : v.booleanValue)]));
          return { name: x.document.name.split("/").pop(), ...rec, data: () => rec };
        });
      };
      return { db, rest, restList, restGet, restQuery, col: db.collection("teams").doc(INBOX).collection("records") };
    })().catch((e) => { colP = null; throw e; });
    return colP;
  }
  const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { } };

  /* ---------- apprentice app ---------- */
  function startApprentice() {
    if (!cfg()) return;
    const store = PT.store;
    let timer = null, listening = false, busy = false, lastAnsCheck = 0, ansSince = new Date(Date.now() - 10 * 60000).toISOString(); // older answers come with the live listener
    const tick = async () => {
      if (busy) return; busy = true;
      try {
        const st = store.get(), me = st.user?.name || "";
        if (!me || me === "Apprentice" || st.user?.instructor) return; // the instructor doesn't send RFIs to themselves
        // RFIs the apprentice deleted come out of the instructor's inbox too
        const pushed = read("pt-rfi-live-roots", {});
        const roots = new Set((st.rfis || []).map((r) => r.copiedFrom || r.id));
        const gone = Object.keys(pushed).filter((k) => !roots.has(k));
        if (gone.length) {
          const { db, col: c } = await col(); const b = db.batch();
          for (const k of gone) b.delete(c.doc("rfi__" + k));
          await b.commit();
          for (const k of gone) delete pushed[k];
          write("pt-rfi-live-roots", pushed);
        }
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
          for (const { r, data } of out) b.set(c.doc("rfi__" + (r.copiedFrom || r.id)), { coll: "rfi", id: r.copiedFrom || r.id, data, by: me, at: new Date().toISOString(), st: window.firebase.firestore.FieldValue.serverTimestamp() });
          await b.commit();
          for (const { r, data } of out) { sent[r.id] = data.length + ":" + (r.updatedAt || "") + ":" + r.status + ":" + (r.answer || "").length; pushed[r.copiedFrom || r.id] = 1; }
          write("pt-rfi-live-sent", sent); write("pt-rfi-live-roots", pushed);
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
          // first time on this device: all answers; afterwards only what's new since last time (Firebase counts every read)
          const seenAns = +(read("pt-rfi-ans-seen", 0)) || 0;
          const q = seenAns ? c.where("st", ">", window.firebase.firestore.Timestamp.fromMillis(seenAns - 300000)) : c.where("coll", "==", "answer");
          q.onSnapshot((snap) => {
            const docs = snap.docChanges().map((ch) => ch.doc);
            let top = +(read("pt-rfi-ans-seen", 0)) || 0;
            for (const doc of docs) { const st = doc.data().st, m = st == null ? null : typeof st === "number" ? st : st.toMillis ? st.toMillis() : null; if (m && m > top) top = m; }
            if (top) write("pt-rfi-ans-seen", top);
            takeAnswers(docs.filter((doc) => doc.data().coll === "answer"));
          }, (e) => { listening = false; console.warn("RFI answers", e); });
        }
        // backup check for NEW answers (at most every 2 minutes, only while an RFI is waiting) in case live updates are delayed
        const open = mine.filter((r) => !r.answer);
        if (open.length && Date.now() - lastAnsCheck > 120000) {
          lastAnsCheck = Date.now();
          const { restQuery } = await col();
          await restQuery(INBOX, "at", ">", ansSince).then((docs) => { for (const d of docs) if (d.at > ansSince) ansSince = d.at; takeAnswers(docs.filter((d) => d.coll === "answer")); }).catch(() => {});
        }
      } catch (e) { console.warn("RFI live inbox:", e.message); } finally { busy = false; }
    };
    // send quickly (students often close the tab right after Save & Send), and keep retrying until it goes through
    store.onChange(() => { clearTimeout(timer); timer = setTimeout(tick, 300); });
    setTimeout(() => { const n = store.get().user?.name; if (n && n !== "Apprentice") col().catch(() => {}); tick(); }, 300);
    setInterval(tick, 20000);
  }

  /* ---------- Instructor Dashboard ---------- */
  const live = {}, liveAns = {}, deleted = {};
  let status = cfg() ? "connecting…" : "off";
  function startInstructor(onUpdate) {
    if (!cfg()) return;
    let lastSig = "";
    const take = (docs, full = false, removed = []) => {
      if (full) { const here = new Set(docs.map((doc) => doc.data().id + ":" + doc.data().coll)); for (const k of Object.keys(live)) if (!here.has(k + ":rfi")) delete live[k]; }
      for (const d of removed) if (d.coll === "rfi") delete live[d.id];
      for (const doc of docs) {
        const d = doc.data(); let obj; try { obj = JSON.parse(d.data); } catch { continue; }
        if (d.coll === "rfi") live[d.id] = { ...obj, _at: d.at }; else if (d.coll === "answer") liveAns[d.id] = obj; else if (d.coll === "deleted") deleted[d.id] = obj.at || d.at;
      }
      const sig = Object.values(live).map((x) => x.id + (x.updatedAt || "") + x.status).join("|") + Object.keys(liveAns).length;
      status = "live · checked " + new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" });
      if (sig !== lastSig) { lastSig = sig; onUpdate && onUpdate(); } else onUpdate && onUpdate("status");
    };
    col().then(({ col: c, rest, restQuery }) => {
      c.onSnapshot((snap) => { const ch = snap.docChanges(); take(ch.filter((x) => x.type !== "removed").map((x) => x.doc), false, ch.filter((x) => x.type === "removed").map((x) => x.doc.data())); }, (e) => console.warn("RFI inbox live:", e.message));
      // backup over plain HTTPS in case the network delays live updates: one full read at the start, then once a minute
      // ask only for what changed (Firebase's free plan counts every document read)
      let since = "";
      const mark = (docs) => { for (const doc of docs) { const a = doc.data().at; if (a > since) since = a; } };
      const fail = (e) => { status = "offline (" + e.message + ")"; onUpdate && onUpdate("status"); };
      rest().then((snap) => { mark(snap.docs); take(snap.docs, true); }).catch(fail);
      const poll = () => { if (!since) return; restQuery(INBOX, "at", ">", since).then((docs) => { mark(docs); take(docs); }).catch(fail); };
      setInterval(poll, 60000);
      document.addEventListener("visibilitychange", () => { if (!document.hidden) poll(); });
    }).catch((e) => { status = "offline (" + e.message + ")"; onUpdate && onUpdate(); });
  }
  // Instructor deletes RFIs from the inbox: removes them from the cloud and leaves a "deleted" note so a stale copy doesn't come back
  async function deleteRfis(ids) {
    const { db, col: c } = await col(); const now = new Date().toISOString();
    for (let i = 0; i < ids.length; i += 150) {
      const b = db.batch();
      for (const id of ids.slice(i, i + 150)) {
        b.delete(c.doc("rfi__" + id)); b.delete(c.doc("answer__" + id));
        b.set(c.doc("del__" + id), { coll: "deleted", id, data: JSON.stringify({ id, at: now }), by: "Instructor", at: now, st: window.firebase.firestore.FieldValue.serverTimestamp() });
      }
      await b.commit();
    }
    for (const id of ids) { delete live[id]; delete liveAns[id]; deleted[id] = now; }
  }
  const visible = () => Object.values(live).filter((x) => !deleted[x.id] || String(x._at || "") > String(deleted[x.id]));
  /* ---------- online turn-in (no .json file to e-mail) ---------- */
  const TURNIN = "jatc-turn-in";
  const slugOf = (n) => String(n || "apprentice").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "apprentice";
  // Apprentice: upload the backup (in ~900 KB pieces). The practice-plan sheet pictures are left out – they're the same for
  // everyone and the dashboard doesn't need them to grade.
  async function turnIn(state) {
    const s = JSON.parse(JSON.stringify(state));
    for (const sh of s.sheets || []) if ((sh.tags || []).includes("Practice set")) for (const v of sh.versions || []) if (v.src?.dataUrl) { v.src = { kind: "image", dataUrl: "", stripped: true }; }
    const json = JSON.stringify(s), CH = 900000, n = Math.max(1, Math.ceil(json.length / CH));
    const { db } = await col();
    const c = db.collection("teams").doc(TURNIN).collection("records"), slug = slugOf(s.user?.name), at = new Date().toISOString(), by = s.user?.name || "";
    for (let i = 0; i < n; i++) await c.doc(`sub__${slug}__${i}`).set({ coll: "chunk", id: slug, i, data: json.slice(i * CH, (i + 1) * CH), by, at });
    await c.doc(`sub__${slug}`).set({ coll: "submission", id: slug, meta: JSON.stringify({ name: by, classYear: s.user?.classYear || "", chunks: n, size: json.length, at }), by, at });
    return { at, size: json.length };
  }
  // Instructor: list who turned in (small), then download each one.
  async function turnIns() {
    const { restQuery } = await col();
    return (await restQuery(TURNIN, "coll", "==", "submission")).map((d) => { try { return { slug: d.id, ...JSON.parse(d.meta) }; } catch { return null; } }).filter(Boolean);
  }
  async function fetchTurnIn(sub) {
    const { restGet } = await col();
    const parts = [];
    for (let i = 0; i < sub.chunks; i++) { const d = await restGet(TURNIN, `sub__${sub.slug}__${i}`); if (d.at !== sub.at) throw new Error(sub.name + " is turning in again right now – try in a minute"); parts.push(d.data); }
    const json = parts.join("");
    if (json.length !== sub.size) throw new Error(sub.name + "'s upload isn't complete – try again in a minute");
    return JSON.parse(json);
  }
  async function sendAnswers(answers) {
    const { db, col: c } = await col();
    for (let i = 0; i < answers.length; i += 300) {
      const b = db.batch();
      for (const a of answers.slice(i, i + 300)) b.set(c.doc("answer__" + a.id), { coll: "answer", id: a.id, data: JSON.stringify(a), by: a.answeredBy || "Instructor", at: new Date().toISOString(), st: window.firebase.firestore.FieldValue.serverTimestamp() });
      await b.commit();
    }
    for (const a of answers) liveAns[a.id] = a;
  }
  return { turnIn, turnIns, fetchTurnIn, col, startApprentice, startInstructor, sendAnswers, deleteRfis, enabled: () => !!cfg(), status: () => status, rfis: visible, sentAnswer: (id) => liveAns[id] };
})();
