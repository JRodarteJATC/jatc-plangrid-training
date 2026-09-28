/* List/detail screens for every module: dashboard, sheets, issues, punch,
   RFIs, submittals, photos, reports, documents, team, activity, settings. */
PT.views = (() => {
  const U = PT.util, { esc, h, $, $$, toast, modal, options, fmtDate, fmtDateTime, today, download, toCSV } = U;
  const store = PT.store;

  const ISSUE_TYPES = ["Issue", "Task", "Punch", "Safety", "Quality", "Leak", "Observation", "Warranty", "Design Coordination"];
  const ISSUE_STATUS = ["Open", "In Review", "Closed", "Void"];
  const PRIORITY = ["Low", "Medium", "High", "Critical"];
  const RFI_STATUS = ["Draft", "Open", "Answered", "Closed"];
  const SUB_STATUS = ["Pending", "Submitted", "Approved", "Approved as Noted", "Revise & Resubmit", "Rejected"];
  const WEATHER = ["Sunny", "Partly Cloudy", "Overcast", "Rain", "Rain – no roofing", "Dew / frost on deck", "Fog", "High wind (>20 mph)", "Heat Advisory"];

  const people = () => store.list("team").map((t) => t.name);
  const money = (v) => (v === "" || v == null || isNaN(+v) ? "" : "$" + (+v).toLocaleString(undefined, { maximumFractionDigits: 2 }));
  const photoStrip = (ids) => (ids || []).map((id) => store.find("photos", id)).filter(Boolean).map((p) => `<img src="${p.dataUrl}" data-pv="${p.id}" title="${esc(p.caption || "")}">`).join("");
  const sheetsSorted = () => store.list("sheets").sort((a, b) => a.number.localeCompare(b.number));
  const overdue = (d, st) => d && d < today() && !["Closed", "Void", "Approved", "Answered"].includes(st);
  const statusBadge = (s) => `<span class="badge st-${String(s).replace(/[^A-Za-z]/g, "")}">${esc(s)}</span>`;
  const header = (title, actions = "") => `<div class="page-head"><h1>${esc(title)}</h1><div class="actions">${actions}</div></div>`;

  /* ============ DASHBOARD ============ */
  function dashboard(root) {
    const p = store.project(), iss = store.list("issues"), rfis = store.list("rfis"), subs = store.list("submittals");
    const openIss = iss.filter((i) => i.status === "Open" || i.status === "In Review");
    const me = store.get().user.name;
    const mine = iss.filter((i) => i.assignee === me && i.status !== "Closed");
    const od = iss.filter((i) => overdue(i.dueDate, i.status)).length + rfis.filter((r) => overdue(r.dueDate, r.status)).length;
    const pct = PT.training.progress();
    root.innerHTML = header(p.name, `<span class="muted">${esc(p.number || "")} • ${esc(p.address || "")}</span>`) + `
      <div class="stats">
        <a class="stat" href="#/sheets"><b>${store.list("sheets").length}</b><span>Sheets</span></a>
        <a class="stat" href="#/issues"><b>${openIss.filter((i) => i.type !== "Punch").length}</b><span>Open issues</span></a>
        <a class="stat" href="#/punch"><b>${openIss.filter((i) => i.type === "Punch").length}</b><span>Open punch items</span></a>
        <a class="stat" href="#/rfis"><b>${rfis.filter((r) => r.status === "Open").length}</b><span>Open RFIs</span></a>
        <a class="stat" href="#/submittals"><b>${subs.filter((s) => !s.status.startsWith("Approved")).length}</b><span>Submittals in progress</span></a>
        <a class="stat ${od ? "stat-warn" : ""}" href="#/issues"><b>${od}</b><span>Overdue items</span></a>
      </div>
      <div class="grid2">
        <section class="card">
          <h2>Training progress</h2>
          <div class="progress"><div style="width:${pct}%"></div></div>
          <p>${pct}% of missions complete. <a href="#/training">Continue training →</a></p>
          <h3>Assigned to me (${esc(me)})</h3>
          ${mine.length ? `<ul class="list">${mine.map((i) => `<li><a href="#" data-open-issue="${i.id}">#${i.number} ${esc(i.title)}</a> ${statusBadge(i.status)} <span class="muted">due ${fmtDate(i.dueDate)}</span></li>`).join("")}</ul>` : `<p class="muted">Nothing assigned to you. Tip: set your name in Settings, then assign yourself an issue.</p>`}
        </section>
        <section class="card">
          <h2>Recent activity</h2>
          <ul class="activity">${store.list("activity").slice(0, 12).map((a) => `<li><span class="muted">${fmtDateTime(a.at)}</span> <b>${esc(a.by)}</b> ${esc(a.text)}</li>`).join("") || "<li class='muted'>No activity yet.</li>"}</ul>
          <a href="#/activity">All activity →</a>
        </section>
      </div>`;
    $$("[data-open-issue]", root).forEach((a) => (a.onclick = (e) => { e.preventDefault(); issueForm(store.find("issues", a.dataset.openIssue)); }));
  }

  /* ============ SHEETS ============ */
  let sheetFilter = { q: "", disc: "", tag: "" };
  function sheets(root) {
    const all = sheetsSorted();
    const discs = [...new Set(all.map((s) => s.discipline).filter(Boolean))];
    const tags = [...new Set(all.flatMap((s) => s.tags || []))];
    root.innerHTML = header("Sheets", `<button class="btn btn-primary" id="upBtn">⤒ Upload sheets (PDF / image)</button>`) + `
      <div class="filters">
        <input type="search" id="fq" placeholder="Search sheet number or title…" value="${esc(sheetFilter.q)}">
        <select id="fd"><option value="">All disciplines</option>${options(discs, sheetFilter.disc)}</select>
        <select id="ft"><option value="">All tags</option>${options(tags, sheetFilter.tag)}</select>
      </div>
      <div class="sheet-grid" id="sg"></div>`;
    const draw = () => {
      const q = sheetFilter.q.toLowerCase();
      const list = all.filter((s) => (!q || (s.number + " " + s.title).toLowerCase().includes(q)) && (!sheetFilter.disc || s.discipline === sheetFilter.disc) && (!sheetFilter.tag || (s.tags || []).includes(sheetFilter.tag)));
      $("#sg", root).innerHTML = list.map((s) => {
        const v = s.versions[s.current];
        const src = v.src.kind === "sample" ? PT.samples.dataUrl(v.src.key) : v.src.dataUrl;
        const nIss = store.list("issues").filter((i) => i.sheetId === s.id && i.status !== "Closed").length;
        const nMk = store.list("markups").filter((m) => m.sheetId === s.id).length;
        return `<a class="sheet-card" href="#/sheet/${s.id}">
          <div class="thumb"><img loading="lazy" src="${src}" alt=""></div>
          <div class="meta"><b>${esc(s.number)}</b> <span>${esc(s.title)}</span></div>
          <div class="meta small muted">Rev ${esc(v.rev)} • ${esc(v.set || "")} ${s.versions.length > 1 ? `• ${s.versions.length} versions` : ""}</div>
          <div class="meta small">${nIss ? `<span class="badge st-Open">${nIss} open issues</span>` : ""} ${nMk ? `<span class="badge">${nMk} markups</span>` : ""} ${(s.tags || []).map((t) => `<span class="badge">${esc(t)}</span>`).join("")}</div>
        </a>`;
      }).join("") || `<p class="muted">No sheets match.</p>`;
    };
    draw();
    $("#fq", root).oninput = (e) => { sheetFilter.q = e.target.value; draw(); };
    $("#fd", root).onchange = (e) => { sheetFilter.disc = e.target.value; draw(); };
    $("#ft", root).onchange = (e) => { sheetFilter.tag = e.target.value; draw(); };
    $("#upBtn", root).onclick = () => uploadSheets();
  }

  let pdfjsPromise = null;
  function loadPdfJs() {
    if (!pdfjsPromise) pdfjsPromise = new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
      s.onload = () => { window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js"; res(window.pdfjsLib); };
      s.onerror = () => { pdfjsPromise = null; rej(new Error("PDF library could not load (are you offline?). Upload PNG/JPG images instead.")); };
      document.head.appendChild(s);
    });
    return pdfjsPromise;
  }
  async function fileToPages(file) {
    if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) {
      const pdfjs = await loadPdfJs();
      const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
      const pages = [];
      for (let n = 1; n <= pdf.numPages; n++) {
        const page = await pdf.getPage(n);
        const vp0 = page.getViewport({ scale: 1 });
        const scale = Math.min(3, 2400 / Math.max(vp0.width, vp0.height));
        const vp = page.getViewport({ scale });
        const c = document.createElement("canvas"); c.width = vp.width; c.height = vp.height;
        await page.render({ canvasContext: c.getContext("2d"), viewport: vp }).promise;
        // try to read the sheet number from text (PlanGrid does this with OCR)
        let guess = "";
        try { const tc = await page.getTextContent(); const m = tc.items.map((i) => i.str).join(" ").match(/\b([A-Z]{1,2}-?\d{1,3}(?:\.\d{1,2})?)\b/g); if (m) guess = m[m.length - 1]; } catch { }
        pages.push({ dataUrl: c.toDataURL("image/jpeg", 0.85), w: c.width, h: c.height, guess, name: `${file.name.replace(/\.pdf$/i, "")} p${n}` });
      }
      return pages;
    }
    const raw = await U.readFileAsDataURL(file);
    const r = await U.shrinkImage(raw, 2400, 0.9);
    const guess = (file.name.match(/([A-Z]{1,2}-?\d{1,3})/i) || [])[1] || "";
    return [{ dataUrl: r.dataUrl, w: r.width, h: r.height, guess: guess.toUpperCase(), name: file.name.replace(/\.[^.]+$/, "") }];
  }

  function uploadSheets(existing) {
    const inp = h(`<input type="file" accept="application/pdf,image/*" ${existing ? "" : "multiple"} hidden>`);
    document.body.appendChild(inp);
    inp.onchange = async () => {
      const files = [...inp.files]; inp.remove(); if (!files.length) return;
      toast("Processing sheets…");
      let pages = [];
      try { for (const f of files) pages.push(...(await fileToPages(f))); } catch (e) { toast(e.message, "warn"); return; }
      if (existing) {
        const pg = pages[0];
        modal({
          title: `New version of ${existing.number}`, body: `
            <div class="row gap"><label>Revision <input name="rev" value="${existing.versions.length}" required></label>
            <label>Version set / issue name <input name="set" placeholder="ASI-02, Bulletin 3, Conformed set" required data-label="Version set"></label>
            <label>Issue date <input type="date" name="date" value="${today()}"></label></div>
            <p class="muted">Markups, issues and photos carry forward to the new version automatically.</p>`,
          submitLabel: "Publish version",
          onSubmit: (f) => {
            existing.versions.push({ id: U.uid("ver"), rev: f.rev, set: f.set, date: f.date, src: { kind: "image", dataUrl: pg.dataUrl }, w: pg.w, h: pg.h, scalePxPerFt: null, links: [] });
            existing.current = existing.versions.length - 1;
            store.log(`Published ${existing.number} Rev ${f.rev} (${f.set})`); store.event("upload_version", { sheetId: existing.id }); store.emit();
            location.hash = `#/sheet/${existing.id}`;
          },
        });
        return;
      }
      modal({
        title: `Review ${pages.length} uploaded sheet(s)`, wide: true,
        body: `<p class="muted">Confirm each sheet number and title – just like PlanGrid's sheet review step. Sheets with an existing number become a new version.</p>
          <label>Version set name <input name="set" value="Uploaded ${today()}"></label>
          <table class="tbl"><thead><tr><th>Preview</th><th>Sheet #</th><th>Title</th><th>Discipline</th></tr></thead><tbody>
          ${pages.map((p, i) => `<tr><td><img src="${p.dataUrl}" class="mini"></td><td><input name="num" value="${esc(p.guess || "X-" + (i + 101))}" required data-label="Sheet number"></td><td><input name="title" value="${esc(p.name)}"></td>
            <td><select name="disc">${options(["Roofing", "Waterproofing", "Architectural", "Structural", "Mechanical", "Plumbing", "Civil", "Other"], "Roofing")}</select></td></tr>`).join("")}
          </tbody></table>`,
        submitLabel: "Publish sheets",
        onSubmit: (f) => {
          const arr = (v) => [].concat(v);
          const nums = arr(f.num), titles = arr(f.title), discs = arr(f.disc);
          pages.forEach((p, i) => {
            const num = nums[i].trim().toUpperCase();
            const ver = { id: U.uid("ver"), rev: "0", set: f.set, date: today(), src: { kind: "image", dataUrl: p.dataUrl }, w: p.w, h: p.h, scalePxPerFt: null, links: [] };
            const ex = store.list("sheets").find((s) => s.number === num);
            if (ex) { ver.rev = String(ex.versions.length); ex.versions.push(ver); ex.current = ex.versions.length - 1; }
            else store.add("sheets", { number: num, title: titles[i], discipline: discs[i], tags: [], versions: [ver], current: 0 });
          });
          store.log(`Uploaded ${pages.length} sheet(s)`); store.event("upload_sheet", { count: pages.length }); store.emit();
          toast("Sheets published", "ok");
        },
      });
    };
    inp.click();
  }

  /* ============ ISSUES & PUNCH ============ */
  let issueFilter = { q: "", status: "active", type: "", assignee: "" };
  function issues(root, punchOnly = false) {
    const title = punchOnly ? "Punch List" : "Issues & Tasks";
    root.innerHTML = header(title, `
      <button class="btn" id="csvBtn">⤓ Export CSV</button>
      <button class="btn" id="rptBtn">🖨 Print report</button>
      <button class="btn btn-primary" id="newBtn">+ New ${punchOnly ? "punch item" : "issue / task"}</button>`) + `
      <div class="filters">
        <input type="search" id="fq" placeholder="Search…" value="${esc(issueFilter.q)}">
        <select id="fs"><option value="active">Open + In Review</option><option value="">All statuses</option>${options(ISSUE_STATUS)}</select>
        ${punchOnly ? "" : `<select id="ft"><option value="">All types</option>${options(ISSUE_TYPES, issueFilter.type)}</select>`}
        <select id="fa"><option value="">Anyone</option>${options(people(), issueFilter.assignee)}</select>
      </div>
      <div id="tbl"></div>`;
    $("#fs", root).value = issueFilter.status;
    const rows = () => store.list("issues").filter((i) => {
      if (punchOnly && i.type !== "Punch") return false;
      if (!punchOnly && issueFilter.type && i.type !== issueFilter.type) return false;
      if (issueFilter.status === "active" && !["Open", "In Review"].includes(i.status)) return false;
      if (issueFilter.status && issueFilter.status !== "active" && i.status !== issueFilter.status) return false;
      if (issueFilter.assignee && i.assignee !== issueFilter.assignee) return false;
      const q = issueFilter.q.toLowerCase();
      return !q || `${i.number} ${i.title} ${i.description} ${i.location}`.toLowerCase().includes(q);
    }).sort((a, b) => b.number - a.number);
    const draw = () => {
      const r = rows();
      $("#tbl", root).innerHTML = r.length ? `<table class="tbl click"><thead><tr>${punchOnly ? "<th>✓</th>" : ""}<th>#</th><th>Title</th>${punchOnly ? "" : "<th>Type</th>"}<th>Status</th><th>Priority</th><th>Assignee</th><th>Due</th><th>Location</th><th>Sheet</th></tr></thead><tbody>
        ${r.map((i) => { const sh = i.sheetId && store.find("sheets", i.sheetId); return `<tr data-id="${i.id}">
          ${punchOnly ? `<td><input type="checkbox" class="done" data-done="${i.id}" ${i.status === "Closed" ? "checked" : ""} title="Mark complete"></td>` : ""}
          <td>${i.number}</td><td>${esc(i.title)} ${i.photoIds?.length ? "📷" : ""}</td>${punchOnly ? "" : `<td>${esc(i.type)}</td>`}<td>${statusBadge(i.status)}</td><td>${esc(i.priority || "")}</td><td>${esc(i.assignee || "")}</td>
          <td class="${overdue(i.dueDate, i.status) ? "warn-text" : ""}">${fmtDate(i.dueDate)}</td><td>${esc(i.location || "")}</td><td>${sh ? `<a href="#/sheet/${sh.id}/at/${Math.round(i.x)}/${Math.round(i.y)}">${esc(sh.number)}</a>` : "—"}</td></tr>`; }).join("")}
        </tbody></table>` : `<p class="muted">No ${punchOnly ? "punch items" : "issues"} match these filters.</p>`;
      $$("tr[data-id]", root).forEach((tr) => (tr.onclick = (e) => { if (e.target.closest("a,input")) return; issueForm(store.find("issues", tr.dataset.id)); }));
      $$("[data-done]", root).forEach((c) => (c.onchange = () => { const i = store.find("issues", c.dataset.done); setIssueStatus(i, c.checked ? "Closed" : "Open"); }));
    };
    draw();
    $("#fq", root).oninput = (e) => { issueFilter.q = e.target.value; draw(); };
    $("#fs", root).onchange = (e) => { issueFilter.status = e.target.value; draw(); };
    $("#ft", root) && ($("#ft", root).onchange = (e) => { issueFilter.type = e.target.value; draw(); });
    $("#fa", root).onchange = (e) => { issueFilter.assignee = e.target.value; draw(); };
    $("#newBtn", root).onclick = () => issueForm(null, { type: punchOnly ? "Punch" : "Issue" });
    $("#csvBtn", root).onclick = () => {
      const data = rows().map((i) => ({ Number: i.number, Type: i.type, Title: i.title, Description: i.description, Status: i.status, Priority: i.priority, Assignee: i.assignee, Due: i.dueDate, Location: i.location, Sheet: store.find("sheets", i.sheetId)?.number || "", Watchers: (i.watchers || []).join("; "), DelayDays: i.delayDays ?? "", CostIncrease: i.costImpact ?? "", CreatedBy: i.createdBy, Created: i.createdAt, Closed: i.closedAt || "" }));
      if (!data.length) return toast("Nothing to export", "warn");
      download(`${punchOnly ? "punch-list" : "issues"}-${today()}.csv`, toCSV(data), "text/csv"); store.event("export", { what: "issues_csv" }); toast("CSV downloaded", "ok");
    };
    $("#rptBtn", root).onclick = () => printReport(title, rows());
  }

  function setIssueStatus(i, status) {
    store.update("issues", i.id, { status, closedAt: status === "Closed" ? new Date().toISOString() : null }, `${i.type} #${i.number} → ${status}`);
    if (status === "Closed") store.event("issue_closed", { id: i.id, kind: i.type });
  }

  function issueForm(issue, preset = {}) {
    const isNew = !issue;
    const i = issue || { type: preset.type || "Issue", status: "Open", priority: "Medium", assignee: "", dueDate: "", title: "", description: "", location: "", sheetId: preset.sheetId || "", x: preset.x, y: preset.y, photoIds: [], comments: [], watchers: [], delayDays: "", costImpact: "" };
    const photos = (i.photoIds || []).map((id) => store.find("photos", id)).filter(Boolean);
    const { el } = modal({
      title: isNew ? `New ${i.type}` : `${i.type} #${i.number}`, wide: true, submitLabel: isNew ? "Create" : "Save",
      extraButtons: isNew ? "" : `<button type="button" class="btn btn-danger" id="delIss">Delete</button> ${i.sheetId ? `<a class="btn" href="#/sheet/${i.sheetId}/at/${Math.round(i.x || 0)}/${Math.round(i.y || 0)}" data-close>View on sheet</a>` : ""}`,
      body: `
        <div class="form-grid">
          <label class="span2">Title <input name="title" required data-label="Title" value="${esc(i.title)}" placeholder="Short description of the problem"></label>
          <label>Type <select name="type">${options(ISSUE_TYPES, i.type)}</select></label>
          <label>Status <select name="status">${options(ISSUE_STATUS, i.status)}</select></label>
          <label>Priority <select name="priority">${options(PRIORITY, i.priority)}</select></label>
          <label>Assigned to <select name="assignee"><option value="">— Unassigned —</option>${options(people(), i.assignee)}</select></label>
          <label>Due date <input type="date" name="dueDate" value="${esc(i.dueDate)}"></label>
          <label>Location / room <input name="location" value="${esc(i.location)}" placeholder="e.g. Roof Area B at RTU-3, north side"></label>
          <label>Sheet <select name="sheetId"><option value="">— none —</option>${sheetsSorted().map((s) => `<option value="${s.id}" ${s.id === i.sheetId ? "selected" : ""}>${esc(s.number)} – ${esc(s.title)}</option>`).join("")}</select></label>
          <label class="span2">Description <textarea name="description" rows="3">${esc(i.description)}</textarea></label>
          <div class="span2"><b>Watching</b> <span class="muted small">(people who follow this item and get its updates)</span><div class="row gap" style="flex-wrap:wrap">${people().map((n) => `<label class="check"><input type="checkbox" name="watchers" value="${esc(n)}" ${(i.watchers || []).includes(n) ? "checked" : ""}> ${esc(n)}</label>`).join("")}</div></div>
          <label>Delay (days) <input type="number" name="delayDays" min="0" step="0.5" value="${esc(i.delayDays ?? "")}" placeholder="0"></label>
          <label>Cost increase ($) <input type="number" name="costImpact" min="0" step="0.01" value="${esc(i.costImpact ?? "")}" placeholder="0.00"></label>
        </div>
        <h3>Photos</h3>
        <div class="photo-strip" id="pstrip">${photos.map((p) => `<img src="${p.dataUrl}" data-pv="${p.id}" title="${esc(p.caption || "")}">`).join("")}<button type="button" class="btn" id="addPh">+ Add photo</button></div>
        ${isNew ? "" : `<h3>Comments</h3>
        <ul class="comments">${(i.comments || []).map((c) => `<li><b>${esc(c.by)}</b> <span class="muted">${fmtDateTime(c.at)}</span><br>${esc(c.text)}</li>`).join("") || "<li class='muted'>No comments yet.</li>"}</ul>
        <label>Add comment <textarea name="comment" rows="2" placeholder="Visible to everyone on the issue"></textarea></label>
        <p class="muted small">Created by ${esc(i.createdBy)} • ${fmtDateTime(i.createdAt)}${i.closedAt ? ` • Closed ${fmtDateTime(i.closedAt)}` : ""}</p>`}`,
      onSubmit: (f) => {
        const pending = el._pendingPhotos || [];
        const data = { title: f.title, type: f.type, status: f.status, priority: f.priority, assignee: f.assignee, dueDate: f.dueDate, location: f.location, description: f.description, sheetId: f.sheetId || null, watchers: f.watchers ? [].concat(f.watchers) : [], delayDays: f.delayDays ?? "", costImpact: f.costImpact ?? "" };
        if (isNew) {
          const rec = store.add("issues", { ...data, number: store.nextNumber("issues"), x: i.x ?? null, y: i.y ?? null, photoIds: pending, comments: [], createdBy: store.get().user.name, closedAt: f.status === "Closed" ? new Date().toISOString() : null }, `Created ${f.type} #${store.nextNumber("issues")}: ${f.title}`);
          pending.forEach((pid) => { const p = store.find("photos", pid); if (p) { p.issueId = rec.id; p.sheetId = p.sheetId || rec.sheetId; } });
          store.event("issue_created", { id: rec.id, kind: rec.type, pinned: rec.x != null });
          toast(`${rec.type} #${rec.number} created`, "ok");
        } else {
          const wasClosed = i.status === "Closed";
          if (f.comment && f.comment.trim()) i.comments.push({ by: store.get().user.name, at: new Date().toISOString(), text: f.comment.trim() }), store.event("comment", { id: i.id });
          i.photoIds = [...(i.photoIds || []), ...pending];
          store.update("issues", i.id, { ...data, closedAt: data.status === "Closed" ? i.closedAt || new Date().toISOString() : null }, `Updated ${i.type} #${i.number}`);
          if (!wasClosed && data.status === "Closed") store.event("issue_closed", { id: i.id, kind: data.type });
        }
        if (PT.viewer.current()) PT.viewer.refresh();
      },
    });
    el._pendingPhotos = [];
    $("#addPh", el).onclick = () => addPhoto({ sheetId: i.sheetId, x: i.x, y: i.y, issueId: issue?.id }, (p) => {
      el._pendingPhotos.push(p.id);
      $("#pstrip", el).insertBefore(h(`<img src="${p.dataUrl}">`), $("#addPh", el));
    });
    $$("[data-pv]", el).forEach((im) => (im.onclick = () => photoViewer(im.dataset.pv)));
    const del = $("#delIss", el);
    if (del) del.onclick = () => U.confirmBox(`Delete ${i.type} #${i.number}?`, () => { store.remove("issues", i.id, `Deleted ${i.type} #${i.number}`); el.remove(); PT.viewer.refresh(); });
  }

  /* ============ RFIs ============ */
  function rfis(root) {
    root.innerHTML = header("RFIs – Requests for Information", `<button class="btn" id="csvBtn">⤓ Export CSV</button><button class="btn btn-primary" id="newBtn">+ New RFI</button>`) +
      `<p class="muted">Workflow: <b>Draft</b> → <b>Open</b> (sent, ball in court with the reviewer) → <b>Answered</b> → <b>Closed</b> (answer distributed to the field).</p><div id="tbl"></div>`;
    const list = store.list("rfis").sort((a, b) => b.number - a.number);
    $("#tbl", root).innerHTML = list.length ? `<table class="tbl click"><thead><tr><th>RFI #</th><th>Subject</th><th>Status</th><th>Ball in court</th><th>Sent</th><th>Due</th><th>Cost?</th><th>Schedule?</th><th>Sheets</th></tr></thead><tbody>
      ${list.map((r) => `<tr data-id="${r.id}"><td>RFI-${String(r.number).padStart(3, "0")}</td><td>${esc(r.subject)}</td><td>${statusBadge(r.status)}</td><td>${esc(r.status === "Answered" ? r.createdBy : r.assignedTo || "")}</td><td>${fmtDate(r.sentDate)}</td><td class="${overdue(r.dueDate, r.status) ? "warn-text" : ""}">${fmtDate(r.dueDate)}</td><td>${esc(r.costImpact)}</td><td>${esc(r.scheduleImpact)}</td><td>${(r.sheetIds || []).map((id) => store.find("sheets", id)?.number).filter(Boolean).join(", ")}</td></tr>`).join("")}
      </tbody></table>` : `<p class="muted">No RFIs yet.</p>`;
    $$("tr[data-id]", root).forEach((tr) => (tr.onclick = () => rfiForm(store.find("rfis", tr.dataset.id))));
    $("#newBtn", root).onclick = () => rfiForm(null);
    $("#csvBtn", root).onclick = () => { download(`rfis-${today()}.csv`, toCSV(list.map((r) => ({ Number: r.number, Subject: r.subject, Status: r.status, AssignedTo: r.assignedTo, Sent: r.sentDate || "", Due: r.dueDate, Question: r.question, Answer: r.answer || "" }))), "text/csv"); store.event("export", { what: "rfi_csv" }); };
  }

  function rfiForm(rfi) {
    const isNew = !rfi;
    const r = rfi || { subject: "", question: "", suggestion: "", status: "Draft", assignedTo: "", dueDate: "", costImpact: "Unknown", scheduleImpact: "Unknown", sheetIds: [], answer: "" };
    const canAnswer = !isNew && (r.status === "Open" || r.status === "Answered");
    const { el } = modal({
      title: isNew ? "New RFI" : `RFI-${String(r.number).padStart(3, "0")}: ${r.subject}`, wide: true, submitLabel: "Save",
      extraButtons: isNew ? `<button type="button" class="btn" id="sendNow">Save & Send (Open)</button>` :
        (r.status === "Draft" ? `<button type="button" class="btn" id="sendNow">Send RFI (Open)</button>` : "") +
        (r.status === "Answered" ? `<button type="button" class="btn" id="closeNow">Close RFI</button>` : "") +
        `<button type="button" class="btn" id="printRfi">🖨 Print</button><button type="button" class="btn btn-danger" id="delRfi">Delete</button>`,
      body: `
        <div class="form-grid">
          <label class="span2">Subject <input name="subject" required data-label="Subject" value="${esc(r.subject)}"></label>
          <label class="span2">Question <textarea name="question" rows="4" required data-label="Question" placeholder="State the conflict clearly. Reference sheet, detail, spec section and location.">${esc(r.question)}</textarea></label>
          <label class="span2">Suggested solution <textarea name="suggestion" rows="2">${esc(r.suggestion)}</textarea></label>
          <label>Assigned to (reviewer) <select name="assignedTo"><option value="">—</option>${options(people(), r.assignedTo)}</select></label>
          <label>Response due <input type="date" name="dueDate" value="${esc(r.dueDate)}"></label>
          ${!isNew && r.status !== "Draft" ? `<label>Sent date <input type="date" name="sentDate" value="${esc(r.sentDate || "")}"></label>` : `<p class="muted small span2">The <b>sent date</b> is filled in automatically when you send the RFI.</p>`}
          <label>Cost impact <select name="costImpact">${options(["Unknown", "Yes", "No"], r.costImpact)}</select></label>
          <label>Schedule impact <select name="scheduleImpact">${options(["Unknown", "Yes", "No"], r.scheduleImpact)}</select></label>
          <label class="span2">Referenced sheets <select name="sheetIds" multiple size="4">${sheetsSorted().map((s) => `<option value="${s.id}" ${(r.sheetIds || []).includes(s.id) ? "selected" : ""}>${esc(s.number)} – ${esc(s.title)}</option>`).join("")}</select></label>
          ${!isNew ? `<label>Status <select name="status">${options(RFI_STATUS, r.status)}</select></label>` : ""}
          ${canAnswer || r.answer ? `<label class="span2">Official answer <textarea name="answer" rows="3" placeholder="Reviewer's response">${esc(r.answer || "")}</textarea></label>` : ""}
        </div>
        ${!isNew ? `<h3>History</h3><ul class="comments">${(r.history || []).map((x) => `<li><span class="muted">${fmtDateTime(x.at)}</span> ${esc(x.text)}</li>`).join("") || "<li class='muted'>—</li>"}</ul>` : ""}`,
      onSubmit: (f, form) => saveRfi(r, f, isNew, form._action),
    });
    const act = (a) => { el.querySelector("form")._action = a; el.querySelector("form").requestSubmit(); };
    $("#sendNow", el) && ($("#sendNow", el).onclick = () => act("send"));
    $("#closeNow", el) && ($("#closeNow", el).onclick = () => act("close"));
    $("#printRfi", el) && ($("#printRfi", el).onclick = () => printRfi(r));
    $("#delRfi", el) && ($("#delRfi", el).onclick = () => U.confirmBox("Delete this RFI?", () => { store.remove("rfis", r.id, `Deleted RFI-${r.number}`); el.remove(); route(); }));
  }
  function saveRfi(r, f, isNew, action) {
    const data = { subject: f.subject, question: f.question, suggestion: f.suggestion, assignedTo: f.assignedTo, dueDate: f.dueDate, costImpact: f.costImpact, scheduleImpact: f.scheduleImpact, sheetIds: f.sheetIds ? [].concat(f.sheetIds) : [] };
    let status = f.status || r.status;
    if (action === "send") { if (!f.assignedTo) { toast("Assign a reviewer before sending", "warn"); return false; } status = "Open"; }
    if (f.sentDate !== undefined) data.sentDate = f.sentDate;
    if (status !== "Draft" && !(data.sentDate || r.sentDate)) data.sentDate = today();
    if (action === "close") status = "Closed";
    if (f.answer !== undefined) data.answer = f.answer;
    if (data.answer && status === "Open") status = "Answered";
    const hist = (txt) => ({ at: new Date().toISOString(), text: `${store.get().user.name}: ${txt}` });
    if (isNew) {
      const n = store.nextNumber("rfis");
      const rec = store.add("rfis", { ...data, number: n, status, createdBy: store.get().user.name, history: [hist(`created (${status})`)] }, `Created RFI-${n}: ${f.subject}`);
      store.event("rfi_created", { id: rec.id, status });
    } else {
      const prev = r.status;
      r.history = r.history || [];
      if (prev !== status) r.history.push(hist(`${prev} → ${status}`));
      if (data.answer && data.answer !== (r.answer || "")) { r.history.push(hist("answered")); data.answeredBy = store.get().user.name; }
      store.update("rfis", r.id, { ...data, status }, `RFI-${r.number} ${prev !== status ? prev + " → " + status : "updated"}`);
      store.event("rfi_status", { id: r.id, status });
    }
    route();
  }

  /* ============ SUBMITTALS ============ */
  function submittals(root) {
    const list = store.list("submittals").sort((a, b) => String(a.number).localeCompare(String(b.number)));
    root.innerHTML = header("Submittals", `<button class="btn btn-primary" id="newBtn">+ New submittal</button>`) +
      `<p class="muted">Track product data, shop drawings and samples through review. Spec section numbers use CSI MasterFormat (Division 07 = Thermal &amp; Moisture Protection – roofing, waterproofing, flashing).</p>
      <table class="tbl click"><thead><tr><th>Number</th><th>Spec</th><th>Title</th><th>Type</th><th>Status</th><th>Ball in court</th><th>Due</th></tr></thead><tbody>
      ${list.map((s) => `<tr data-id="${s.id}"><td>${esc(s.number)}</td><td>${esc(s.specSection)}</td><td>${esc(s.title)}</td><td>${esc(s.type)}</td><td>${statusBadge(s.status)}</td><td>${esc(s.ballInCourt || "")}</td><td class="${overdue(s.dueDate, s.status) ? "warn-text" : ""}">${fmtDate(s.dueDate)}</td></tr>`).join("") || "<tr><td colspan=7 class='muted'>None yet</td></tr>"}
      </tbody></table>`;
    $$("tr[data-id]", root).forEach((tr) => (tr.onclick = () => subForm(store.find("submittals", tr.dataset.id))));
    $("#newBtn", root).onclick = () => subForm(null);
  }
  function subForm(s) {
    const isNew = !s; s = s || { number: "", specSection: "07 ", title: "", type: "Product Data", status: "Pending", ballInCourt: "", dueDate: "", notes: "" };
    const { el } = modal({
      title: isNew ? "New submittal" : `Submittal ${s.number}`, wide: true,
      extraButtons: isNew ? "" : `<button type="button" class="btn btn-danger" id="delSub">Delete</button>`,
      body: `<div class="form-grid">
        <label>Spec section <input name="specSection" value="${esc(s.specSection)}" required data-label="Spec section" placeholder="07 54 23"></label>
        <label>Submittal number <input name="number" value="${esc(s.number)}" placeholder="07 54 23-01"></label>
        <label class="span2">Title <input name="title" value="${esc(s.title)}" required data-label="Title"></label>
        <label>Type <select name="type">${options(["Product Data", "Shop Drawings", "Samples", "O&M Manual", "Warranty", "Test Report", "Certificate"], s.type)}</select></label>
        <label>Status <select name="status">${options(SUB_STATUS, s.status)}</select></label>
        <label>Ball in court <select name="ballInCourt"><option value="">—</option>${options(people(), s.ballInCourt)}</select></label>
        <label>Due <input type="date" name="dueDate" value="${esc(s.dueDate)}"></label>
        <label class="span2">Reviewer notes <textarea name="notes" rows="3">${esc(s.notes)}</textarea></label></div>`,
      onSubmit: (f) => {
        if (!f.number) f.number = `${f.specSection.trim()}-${String(store.list("submittals").filter((x) => x.specSection === f.specSection).length + 1).padStart(2, "0")}`;
        if (isNew) { store.add("submittals", f, `Created submittal ${f.number}`); store.event("submittal_created"); }
        else store.update("submittals", s.id, f, `Submittal ${s.number}: ${f.status}`);
        route();
      },
    });
    $("#delSub", el) && ($("#delSub", el).onclick = () => U.confirmBox("Delete submittal?", () => { store.remove("submittals", s.id); el.remove(); route(); }));
  }

  /* ============ PHOTOS ============ */
  function photos(root) {
    const list = store.list("photos").sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    root.innerHTML = header("Photos", `<button class="btn btn-primary" id="addBtn">+ Add photos</button>`) +
      `<p class="muted">Tip: to pin a photo to a location, open a sheet and use the 📷 tool.</p>
      <div class="photo-grid">${list.map((p) => `<figure data-id="${p.id}"><img src="${p.dataUrl}" loading="lazy"><figcaption>${esc(p.caption || "Untitled")}<br><span class="muted small">${fmtDateTime(p.createdAt)} • ${esc(p.by || "")}${p.sheetId ? " • " + esc(store.find("sheets", p.sheetId)?.number || "") : ""}</span></figcaption></figure>`).join("") || "<p class='muted'>No photos yet.</p>"}</div>`;
    $$("figure[data-id]", root).forEach((f) => (f.onclick = () => photoViewer(f.dataset.id)));
    $("#addBtn", root).onclick = () => addPhoto({}, () => route());
  }

  function addPhoto(ctx = {}, cb) {
    const inp = h(`<input type="file" accept="image/*" capture="environment" multiple hidden>`);
    document.body.appendChild(inp);
    inp.onchange = async () => {
      const files = [...inp.files]; inp.remove(); if (!files.length) return;
      const shots = [];
      for (const f of files) shots.push((await U.shrinkImage(await U.readFileAsDataURL(f), 1400, 0.8)).dataUrl);
      modal({
        title: `Add ${shots.length} photo(s)`, body: `<div class="photo-strip">${shots.map((s) => `<img src="${s}">`).join("")}</div>
          <label>Caption <input name="caption" placeholder="What does this show? e.g. RD-2 clamping ring before strainer set"></label>
          <label>Tags <input name="tags" placeholder="flashing, seam, drain, before-cover, as-built"></label>`,
        submitLabel: "Save",
        onSubmit: (f) => {
          shots.forEach((d, k) => {
            const p = store.add("photos", { dataUrl: d, caption: f.caption, tags: f.tags.split(",").map((t) => t.trim()).filter(Boolean), sheetId: ctx.sheetId || null, x: ctx.x != null ? ctx.x + k * 30 : null, y: ctx.y ?? null, issueId: ctx.issueId || null, by: store.get().user.name }, "Added photo" + (f.caption ? ": " + f.caption : ""));
            if (ctx.issueId) { const i = store.find("issues", ctx.issueId); if (i && !cb) i.photoIds.push(p.id); }
            store.event("photo_added", { pinned: ctx.x != null, issue: !!ctx.issueId });
            cb && cb(p);
          });
          PT.viewer.refresh();
        },
      });
    };
    inp.click();
  }

  function photoViewer(id) {
    const p = store.find("photos", id); if (!p) return;
    const sh = p.sheetId && store.find("sheets", p.sheetId);
    const { el } = modal({
      title: p.caption || "Photo", wide: true,
      body: `<img class="photo-big" src="${p.dataUrl}"><p class="muted">${fmtDateTime(p.createdAt)} • ${esc(p.by || "")} ${(p.tags || []).map((t) => `<span class="badge">${esc(t)}</span>`).join(" ")}</p>
        <label>Caption <input name="caption" value="${esc(p.caption || "")}"></label>
        ${sh ? `<p><a href="#/sheet/${sh.id}/at/${Math.round(p.x)}/${Math.round(p.y)}" data-close>View on ${esc(sh.number)}</a></p>` : ""}`,
      extraButtons: `<button type="button" class="btn btn-danger" id="delPh">Delete</button><a class="btn" download="photo-${id}.jpg" href="${p.dataUrl}">⤓ Download</a>`,
      onSubmit: (f) => { store.update("photos", id, { caption: f.caption }); route(); },
    });
    $("#delPh", el).onclick = () => U.confirmBox("Delete photo?", () => { store.remove("photos", id, "Deleted photo"); store.list("issues").forEach((i) => (i.photoIds = (i.photoIds || []).filter((x) => x !== id))); el.remove(); route(); PT.viewer.refresh(); });
  }

  /* ============ DAILY REPORTS / FORMS ============ */
  const FORM_TYPES = ["Daily Report", "Time Sheet", "Toolbox Talk", "Pre-Task Plan (JHA)", "Inspection Request"];
  const CLASSIFICATIONS = ["Foreman", "Journeyman", "Apprentice – 1st period", "Apprentice – 2nd period", "Apprentice – 3rd period", "Apprentice – 4th period", "Apprentice – 5th period", "Apprentice – 6th period", "Kettle / Hoist Operator", "Pre-apprentice / Helper"];
  const hrsOf = (w) => { if (w.hours !== "" && w.hours != null && !isNaN(+w.hours)) return +w.hours; const t = (x) => { const m = /^(\d{1,2}):(\d{2})/.exec(x || ""); return m ? +m[1] + m[2] / 60 : null; }; const a = t(w.start), b = t(w.end); return a != null && b != null ? Math.max(0, Math.round((b - a - (+w.lunch || 0) / 60) * 100) / 100) : 0; };
  const tsHours = (r) => (r.workers || []).reduce((s, w) => s + hrsOf(w), 0);
  const reportSummary = (r) => r.type === "Time Sheet" ? `${(r.workers || []).length} worker(s) • ${tsHours(r)} hrs` : (r.workPerformed || r.topic || r.task || "").slice(0, 70);
  function reports(root) {
    const list = store.list("reports").sort((a, b) => b.date.localeCompare(a.date));
    root.innerHTML = header("Daily Reports, Time Sheets & Forms", FORM_TYPES.map((t, k) => `<button class="btn ${k ? "" : "btn-primary"}" data-new="${t}">+ ${t}</button>`).join("")) +
      `<table class="tbl click"><thead><tr><th>Date</th><th>Type</th><th>Summary</th><th>Crew</th><th>Status</th><th>By</th></tr></thead><tbody>
      ${list.map((r) => `<tr data-id="${r.id}"><td>${fmtDate(r.date)}</td><td>${esc(r.type)}</td><td>${esc(reportSummary(r))}${(r.photoIds || []).length ? ` 📷${r.photoIds.length}` : ""}</td><td>${r.type === "Time Sheet" ? (r.workers || []).length : (r.crew || []).reduce((s, c) => s + (+c.count || 0), 0)}</td><td>${statusBadge(r.status)}</td><td>${esc(r.createdBy)}</td></tr>`).join("") || "<tr><td colspan=6 class='muted'>No reports yet.</td></tr>"}
      </tbody></table>`;
    $$("[data-new]", root).forEach((b) => (b.onclick = () => reportForm(null, b.dataset.new)));
    $$("tr[data-id]", root).forEach((tr) => (tr.onclick = () => reportForm(store.find("reports", tr.dataset.id))));
  }

  function crewRows(crew) {
    return (crew.length ? crew : [{ trade: "", company: "", count: "", hours: "" }]).map((c) => `<tr><td><input name="c_trade" value="${esc(c.trade)}" placeholder="Roofer JW / Apprentice"></td><td><input name="c_company" value="${esc(c.company)}"></td><td><input name="c_count" type="number" min="0" value="${esc(c.count)}" style="width:5em"></td><td><input name="c_hours" type="number" min="0" step="0.5" value="${esc(c.hours)}" style="width:5em"></td></tr>`).join("");
  }

  function logRows(prefix, cols, rows) {
    return (rows.length ? rows : [{}]).map((row) => `<tr>${cols.map(([k, ph, w, t]) => `<td><input name="${prefix}_${k}" ${t ? `type="${t}"` : ""} value="${esc(row[k] ?? "")}" placeholder="${esc(ph)}" ${w ? `style="width:${w}"` : ""}></td>`).join("")}</tr>`).join("");
  }
  const MAT_COLS = [["material", "e.g. 60-mil TPO white, 10'×100' rolls"], ["qty", "12", "5em"], ["unit", "rolls", "6em"], ["supplier", "Supplier / delivery ticket #"], ["use", "Where used / notes"]];
  const EQ_COLS = [["name", "e.g. Hot-air robotic welder"], ["qty", "1", "4em"], ["hours", "8", "5em"], ["notes", "Owned / rented, condition, fuel…"]];
  const TS_COLS = [["name", "Worker name"], ["classification", "Journeyman / Apprentice – 2nd period"], ["start", "", "7em", "time"], ["end", "", "7em", "time"], ["lunch", "30", "4.5em"], ["hours", "auto", "5em"], ["costCode", "Cost code / task (e.g. 07 54 23 – TPO field)"]];
  const readLog = (f, prefix, cols) => {
    const arr = (v) => (v === undefined ? [] : [].concat(v));
    const got = cols.map(([k]) => arr(f[`${prefix}_${k}`]));
    cols.forEach(([k]) => delete f[`${prefix}_${k}`]);
    return got[0].map((_, n) => Object.fromEntries(cols.map(([k], c) => [k, got[c][n] ?? ""]))).filter((row) => Object.values(row).some((v) => String(v).trim()));
  };
  const logTable = (id, heads, rows, btn) => `<table class="tbl" id="${id}"><thead><tr>${heads.map((x) => `<th>${x}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table><button type="button" class="btn btn-sm" data-addrow="${id}">+ Row</button>`;

  function reportForm(r, type) {
    const isNew = !r; r = r || { type, date: today(), status: "Draft", crew: [], attendees: "" };
    type = r.type;
    let fields = "";
    if (type === "Daily Report") fields = `
      <div class="form-grid">
        <label>Weather <select name="weather">${options(WEATHER, r.weather)}</select></label>
        <div class="row gap"><label>High °F <input name="tempHigh" type="number" value="${esc(r.tempHigh || "")}"></label><label>Low °F <input name="tempLow" type="number" value="${esc(r.tempLow || "")}"></label></div>
      </div>
      <h3>Manpower</h3>
      <table class="tbl" id="crewTbl"><thead><tr><th>Trade / classification</th><th>Company</th><th>#</th><th>Hours</th></tr></thead><tbody>${crewRows(r.crew || [])}</tbody></table>
      <button type="button" class="btn btn-sm" id="addCrew">+ Row</button>
      <h3>Work log</h3>
      <label>Work performed <span class="muted small">(areas, grid lines, quantities installed, what was finished)</span><textarea name="workPerformed" rows="4" required data-label="Work performed">${esc(r.workPerformed || "")}</textarea></label>
      <h3>Material log</h3>
      ${logTable("matTbl", ["Material", "Qty", "Unit", "Supplier / ticket", "Where used / notes"], logRows("m", MAT_COLS, r.materials || []))}
      <h3>Equipment log</h3>
      ${logTable("eqTbl", ["Equipment", "Qty", "Hours used", "Notes"], logRows("e", EQ_COLS, r.equipmentLog?.length ? r.equipmentLog : r.equipment ? [{ name: r.equipment }] : []))}
      <label>Delays / problems <textarea name="delays" rows="2">${esc(r.delays || "")}</textarea></label>
      <label>Safety observations / incidents <textarea name="safety" rows="2">${esc(r.safety || "")}</textarea></label>
      <label>Visitors / inspections <input name="visitors" value="${esc(r.visitors || "")}"></label>
      <label>Notes <span class="muted small">(anything else about the work today – conditions, coordination, what's next)</span><textarea name="notes" rows="3">${esc(r.notes || "")}</textarea></label>
      <h3>Photos</h3>
      <div class="photo-strip" id="rpStrip">${photoStrip(r.photoIds)}<button type="button" class="btn" id="rpAddPh">+ Add photo</button></div>`;
    else if (type === "Time Sheet") fields = `
      <div class="form-grid"><label>Foreman / submitted by <input name="foreman" value="${esc(r.foreman || store.get().user.name)}"></label><label>Job / area <input name="jobArea" value="${esc(r.jobArea || "")}" placeholder="e.g. Roof Area A"></label></div>
      <p class="muted small">Enter start/end and lunch (minutes) – hours are figured for you – or type the hours.</p>
      ${logTable("tsTbl", ["Worker", "Classification", "Start", "End", "Lunch (min)", "Hours", "Cost code / task"], logRows("w", TS_COLS, r.workers || []))}
      <datalist id="clsList">${CLASSIFICATIONS.map((c) => `<option value="${esc(c)}">`).join("")}</datalist>
      <p><b>Total hours: <span id="tsTotal">${tsHours(r)}</span></b></p>
      <label>Notes <textarea name="notes" rows="2">${esc(r.notes || "")}</textarea></label>`;
    else if (type === "Toolbox Talk") fields = `
      <label>Topic <input name="topic" required data-label="Topic" value="${esc(r.topic || "")}" placeholder="Lockout / Tagout"></label>
      <label>Presented by <input name="presenter" value="${esc(r.presenter || store.get().user.name)}"></label>
      <label>Key points discussed <textarea name="points" rows="4">${esc(r.points || "")}</textarea></label>
      <label>Attendees (one per line) <textarea name="attendees" rows="4">${esc(r.attendees || "")}</textarea></label>`;
    else if (type === "Pre-Task Plan (JHA)") fields = `
      <label>Task <input name="task" required data-label="Task" value="${esc(r.task || "")}" placeholder="Heat-weld TPO flashing at RTU-1 curb"></label>
      <label>Location <input name="location" value="${esc(r.location || "")}"></label>
      <table class="tbl"><thead><tr><th>Step</th><th>Hazard</th><th>Control</th></tr></thead><tbody>
      ${[0, 1, 2, 3].map((k) => `<tr><td><input name="j_step" value="${esc(r.jha?.[k]?.step || "")}"></td><td><input name="j_hazard" value="${esc(r.jha?.[k]?.hazard || "")}"></td><td><input name="j_control" value="${esc(r.jha?.[k]?.control || "")}"></td></tr>`).join("")}</tbody></table>
      <label>PPE required <input name="ppe" value="${esc(r.ppe || "Hard hat, safety glasses, gloves, harness & lanyard outside warning line, heat-resistant gloves at welder")}"></label>
      <label>Crew sign-off (one per line) <textarea name="attendees" rows="3">${esc(r.attendees || "")}</textarea></label>`;
    else fields = `
      <label>Inspection type <select name="inspType">${options(["Deck inspection", "Insulation / tapered layout", "Mid-roof manufacturer inspection", "Below-grade WP before backfill", "Flood test (elevator pit)", "Final / warranty inspection"], r.inspType)}</select></label>
      <label>Area / scope <input name="task" value="${esc(r.task || "")}" required data-label="Area / scope"></label>
      <label>Requested date <input type="date" name="reqDate" value="${esc(r.reqDate || "")}"></label>
      <label>Result <select name="result">${options(["Pending", "Passed", "Partial", "Correction notice"], r.result)}</select></label>
      <label>Inspector notes <textarea name="notes" rows="3">${esc(r.notes || "")}</textarea></label>`;
    const { el } = modal({
      title: `${type} – ${fmtDate(r.date)}`, wide: true, submitLabel: "Save draft",
      extraButtons: `<button type="button" class="btn btn-primary" id="submitRpt">Submit</button>${isNew ? "" : `<button type="button" class="btn" id="printRpt">🖨 Print</button><button type="button" class="btn btn-danger" id="delRpt">Delete</button>`}`,
      body: `<label>Date <input type="date" name="date" value="${esc(r.date)}"></label>${fields}`,
      onSubmit: (f, form) => {
        const arr = (v) => (v === undefined ? [] : [].concat(v));
        const rec = { ...f, type };
        if (f.c_trade !== undefined) {
          const t = arr(f.c_trade), co = arr(f.c_company), n = arr(f.c_count), hr = arr(f.c_hours);
          rec.crew = t.map((x, k) => ({ trade: x, company: co[k], count: n[k], hours: hr[k] })).filter((c) => c.trade || c.count);
          ["c_trade", "c_company", "c_count", "c_hours"].forEach((k) => delete rec[k]);
        }
        if (type === "Daily Report") {
          rec.materials = readLog(rec, "m", MAT_COLS);
          rec.equipmentLog = readLog(rec, "e", EQ_COLS);
          rec.equipment = rec.equipmentLog.map((x) => `${x.name}${x.qty ? ` (${x.qty})` : ""}`).join(", ");
          rec.photoIds = [...(r.photoIds || []), ...(el._pendingPhotos || [])];
        }
        if (type === "Time Sheet") rec.workers = readLog(rec, "w", TS_COLS).map((w) => ({ ...w, hours: hrsOf(w) }));
        if (f.j_step !== undefined) {
          const s = arr(f.j_step), hz = arr(f.j_hazard), c = arr(f.j_control);
          rec.jha = s.map((x, k) => ({ step: x, hazard: hz[k], control: c[k] })).filter((j) => j.step || j.hazard);
          ["j_step", "j_hazard", "j_control"].forEach((k) => delete rec[k]);
        }
        rec.status = form._submit ? "Submitted" : (r.status || "Draft");
        if (isNew) store.add("reports", { ...rec, createdBy: store.get().user.name }, `Created ${type} for ${rec.date}`);
        else store.update("reports", r.id, rec, `Updated ${type} for ${rec.date}`);
        if (isNew && rec.photoIds) rec.photoIds.forEach((pid) => { const p = store.find("photos", pid); if (p) p.reportDate = rec.date; });
        if (rec.status === "Submitted") store.event("report_submitted", { kind: type, crew: (rec.crew || []).length, attendees: (rec.attendees || "").split("\n").filter((x) => x.trim()).length });
        route();
      },
    });
    el._pendingPhotos = [];
    const rp = $("#rpAddPh", el);
    if (rp) rp.onclick = () => addPhoto({}, (p) => { el._pendingPhotos.push(p.id); rp.before(h(`<img src="${p.dataUrl}">`)); });
    $$("[data-pv]", el).forEach((im) => (im.onclick = () => photoViewer(im.dataset.pv)));
    const COLS = { matTbl: ["m", MAT_COLS], eqTbl: ["e", EQ_COLS], tsTbl: ["w", TS_COLS] };
    const wireCls = () => $$("input[name=w_classification]", el).forEach((x) => x.setAttribute("list", "clsList"));
    wireCls();
    $$("[data-addrow]", el).forEach((b) => (b.onclick = () => { const [px, cols] = COLS[b.dataset.addrow]; $(`#${b.dataset.addrow} tbody`, el).insertAdjacentHTML("beforeend", logRows(px, cols, [{}])); wireCls(); }));
    const tsT = $("#tsTbl", el);
    if (tsT) tsT.oninput = () => {
      const rows = $$("tbody tr", tsT).map((tr) => Object.fromEntries(TS_COLS.map(([k]) => [k, $(`[name=w_${k}]`, tr).value])));
      $("#tsTotal", el).textContent = rows.reduce((s, w) => s + hrsOf(w), 0);
    };
    const addCrew = $("#addCrew", el);
    if (addCrew) addCrew.onclick = () => $("#crewTbl tbody", el).insertAdjacentHTML("beforeend", crewRows([{ trade: "", company: "", count: "", hours: "" }]));
    $("#submitRpt", el).onclick = () => { const form = el.querySelector("form"); form._submit = true; form.requestSubmit(); };
    $("#printRpt", el) && ($("#printRpt", el).onclick = () => printForm(r));
    $("#delRpt", el) && ($("#delRpt", el).onclick = () => U.confirmBox("Delete this report?", () => { store.remove("reports", r.id); el.remove(); route(); }));
  }

  /* ============ DOCUMENTS ============ */
  let docFolder = "";
  function documents(root) {
    const list = store.list("docs");
    const folders = [...new Set(list.map((d) => d.folder))].sort();
    const shown = list.filter((d) => !docFolder || d.folder === docFolder);
    root.innerHTML = header("Documents & Specs", `<button class="btn btn-primary" id="upBtn">⤒ Upload file</button>`) + `
      <div class="doc-layout">
        <nav class="folders"><a href="#" data-f="" class="${!docFolder ? "on" : ""}">📁 All files</a>${folders.map((f) => `<a href="#" data-f="${esc(f)}" class="${docFolder === f ? "on" : ""}">📁 ${esc(f)}</a>`).join("")}</nav>
        <div><input type="search" id="dq" placeholder="Search inside documents (e.g. mounting height)…">
        <ul class="doc-list" id="dl"></ul></div>
      </div>`;
    const draw = (q = "") => {
      q = q.toLowerCase();
      $("#dl", root).innerHTML = shown.filter((d) => !q || d.name.toLowerCase().includes(q) || (d.content || "").toLowerCase().includes(q)).map((d) => {
        let hit = "";
        if (q && d.content) { const i = d.content.toLowerCase().indexOf(q); if (i >= 0) hit = `<div class="small muted">…${esc(d.content.slice(Math.max(0, i - 40), i + 60))}…</div>`; }
        return `<li data-id="${d.id}"><span>${d.kind === "text" ? "📄" : d.kind === "pdf" ? "📕" : "🖼"}</span><div><b>${esc(d.name)}</b><div class="small muted">${esc(d.folder)} • ${fmtDate(d.uploadedAt)}</div>${hit}</div></li>`;
      }).join("") || "<li class='muted'>No documents.</li>";
      $$("li[data-id]", root).forEach((li) => (li.onclick = () => docViewer(store.find("docs", li.dataset.id), q)));
    };
    draw();
    $("#dq", root).oninput = (e) => draw(e.target.value);
    $$("[data-f]", root).forEach((a) => (a.onclick = (e) => { e.preventDefault(); docFolder = a.dataset.f; documents(root); }));
    $("#upBtn", root).onclick = () => {
      const inp = h(`<input type="file" hidden>`); document.body.appendChild(inp);
      inp.onchange = async () => {
        const f = inp.files[0]; inp.remove(); if (!f) return;
        if (f.size > 8e6) return toast("File too large for the practice app (8 MB max)", "warn");
        const isText = /^text\/|json|csv/.test(f.type) || /\.(txt|md|csv)$/i.test(f.name);
        const rec = { name: f.name, kind: isText ? "text" : f.type === "application/pdf" ? "pdf" : "file", uploadedAt: new Date().toISOString(), uploadedBy: store.get().user.name };
        if (isText) rec.content = await f.text(); else rec.dataUrl = await U.readFileAsDataURL(f);
        modal({ title: "Upload to folder", body: `<label>Folder <input name="folder" list="fl" value="${esc(docFolder || "General")}"><datalist id="fl">${[...new Set([...folders, "Materials", "Material Specs & Brochures", "Specifications", "Submittals"])].map((x) => `<option value="${esc(x)}">`).join("")}</datalist></label>`, onSubmit: (v) => { store.add("docs", { ...rec, folder: v.folder || "General" }, `Uploaded ${f.name}`); store.event("doc_uploaded", { folder: v.folder || "General" }); route(); } });
      };
      inp.click();
    };
  }
  function docViewer(d, q = "") {
    let body;
    if (d.kind === "text") {
      let txt = esc(d.content);
      if (q) txt = txt.replace(new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), (m) => `<mark>${m}</mark>`);
      body = `<pre class="doc-text">${txt}</pre>`;
    } else if (d.kind === "pdf") body = `<iframe class="doc-frame" src="${d.dataUrl}"></iframe>`;
    else if (/^data:image/.test(d.dataUrl)) body = `<img class="photo-big" src="${d.dataUrl}">`;
    else body = `<p>Preview not available. <a download="${esc(d.name)}" href="${d.dataUrl}">Download</a></p>`;
    const { el } = modal({ title: d.name, wide: true, body, cancelLabel: "Close", extraButtons: `<button type="button" class="btn btn-danger" id="delDoc">Delete</button>` });
    store.event("doc_open", { id: d.id });
    $("#delDoc", el).onclick = () => U.confirmBox("Delete document?", () => { store.remove("docs", d.id, `Deleted ${d.name}`); el.remove(); route(); });
  }

  /* ============ TEAM ============ */
  function team(root) {
    const list = store.list("team");
    root.innerHTML = header("Team", `<button class="btn btn-primary" id="addBtn">+ Invite member</button>`) +
      `<div class="team-grid">${list.map((t) => `<div class="card person" data-id="${t.id}"><div class="avatar">${U.initials(t.name)}</div><div><b>${esc(t.name)}</b><div>${esc(t.role)}</div><div class="muted small">${esc(t.company)}</div><div class="small">${esc(t.email)} ${esc(t.phone)}</div></div></div>`).join("")}</div>`;
    $$(".person", root).forEach((c) => (c.onclick = () => teamForm(store.find("team", c.dataset.id))));
    $("#addBtn", root).onclick = () => teamForm(null);
  }
  function teamForm(t) {
    const isNew = !t; t = t || { name: "", role: "Journeyman", company: "", email: "", phone: "" };
    const { el } = modal({
      title: isNew ? "Invite team member" : t.name,
      extraButtons: isNew ? "" : `<button type="button" class="btn btn-danger" id="delT">Remove</button>`,
      body: `<div class="form-grid"><label>Name <input name="name" required data-label="Name" value="${esc(t.name)}"></label>
        <label>Role <select name="role">${options(["Apprentice", "Journeyman", "Kettle / Hoist Operator", "Foreman", "General Foreman", "Superintendent", "Project Manager", "Project Engineer", "Architect", "Roof Consultant", "Manufacturer's Rep", "Inspector", "Instructor", "Owner Rep"], t.role)}</select></label>
        <label>Company <input name="company" value="${esc(t.company)}"></label><label>Email <input type="email" name="email" value="${esc(t.email)}"></label>
        <label>Phone <input name="phone" value="${esc(t.phone)}"></label></div>`,
      onSubmit: (f) => { if (isNew) { store.add("team", f, `Added ${f.name} to the team`); store.event("team_add"); } else store.update("team", t.id, f); route(); },
    });
    $("#delT", el) && ($("#delT", el).onclick = () => U.confirmBox(`Remove ${t.name}?`, () => { store.remove("team", t.id, `Removed ${t.name}`); el.remove(); route(); }));
  }

  /* ============ ACTIVITY ============ */
  function activity(root) {
    root.innerHTML = header("Activity log") + `<ul class="activity big">${store.list("activity").map((a) => `<li><span class="muted">${fmtDateTime(a.at)}</span> <b>${esc(a.by)}</b> ${esc(a.text)}</li>`).join("") || "<li class='muted'>Nothing yet.</li>"}</ul>`;
  }

  /* ============ SEARCH ============ */
  function search(root, q) {
    q = decodeURIComponent(q || "").toLowerCase();
    const hit = (s) => String(s || "").toLowerCase().includes(q);
    const sh = store.list("sheets").filter((s) => hit(s.number) || hit(s.title) || (s.tags || []).some(hit));
    const is = store.list("issues").filter((i) => hit(i.title) || hit(i.description) || hit(i.location) || hit("#" + i.number));
    const rf = store.list("rfis").filter((r) => hit(r.subject) || hit(r.question) || hit(r.answer));
    const dc = store.list("docs").filter((d) => hit(d.name) || hit(d.content));
    const ph = store.list("photos").filter((p) => hit(p.caption) || (p.tags || []).some(hit));
    root.innerHTML = header(`Search: “${q}”`) + `
      <h3>Sheets (${sh.length})</h3><ul class="list">${sh.map((s) => `<li><a href="#/sheet/${s.id}">${esc(s.number)} – ${esc(s.title)}</a></li>`).join("")}</ul>
      <h3>Issues & punch (${is.length})</h3><ul class="list">${is.map((i) => `<li><a href="#" data-i="${i.id}">#${i.number} ${esc(i.title)}</a> ${statusBadge(i.status)}</li>`).join("")}</ul>
      <h3>RFIs (${rf.length})</h3><ul class="list">${rf.map((r) => `<li><a href="#" data-r="${r.id}">RFI-${r.number} ${esc(r.subject)}</a></li>`).join("")}</ul>
      <h3>Documents (${dc.length})</h3><ul class="list">${dc.map((d) => `<li><a href="#" data-d="${d.id}">${esc(d.name)}</a></li>`).join("")}</ul>
      <h3>Photos (${ph.length})</h3><div class="photo-strip">${ph.map((p) => `<img src="${p.dataUrl}" data-p="${p.id}">`).join("")}</div>`;
    $$("[data-i]", root).forEach((a) => (a.onclick = (e) => { e.preventDefault(); issueForm(store.find("issues", a.dataset.i)); }));
    $$("[data-r]", root).forEach((a) => (a.onclick = (e) => { e.preventDefault(); rfiForm(store.find("rfis", a.dataset.r)); }));
    $$("[data-d]", root).forEach((a) => (a.onclick = (e) => { e.preventDefault(); docViewer(store.find("docs", a.dataset.d), q); }));
    $$("[data-p]", root).forEach((a) => (a.onclick = () => photoViewer(a.dataset.p)));
  }

  /* ============ SETTINGS ============ */
  function settings(root) {
    const s = store.get();
    root.innerHTML = header("Settings & Data") + `
      <div class="grid2">
        <section class="card"><h2>Your profile</h2>
          <form id="prof" class="form-grid">
            <label>Your name <input name="name" value="${esc(s.user.name)}"></label>
            <label>Class (curriculum week) <select name="classYear">${U.classOptions(s.user.classYear)}</select></label>
            <label>Role on project <select name="role">${options(["Apprentice", "Journeyman", "Foreman", "Instructor"], s.user.role)}</select></label>
            <div><button class="btn btn-primary">Save profile</button></div>
          </form>
          <p class="muted small">Your name appears on markups, issues, and reports. Changing it also adds you to the project team so you can be assigned work.</p>
        </section>
        <section class="card"><h2>Projects</h2>
          <ul class="list">${s.projects.map((p) => `<li>${p.id === s.activeProjectId ? "✅" : ""} <a href="#" data-p="${p.id}">${esc(p.name)}</a> <span class="muted">${esc(p.number || "")}</span></li>`).join("")}</ul>
          <button class="btn" id="newProj">+ New blank project</button>
        </section>
        <section class="card"><h2>Backup & hand-in</h2>
          <p>Export everything (sheets, markups, issues, photos, training progress) to one file. Apprentices can email this file to the instructor; the instructor imports it to review the work.</p>
          <div class="row gap"><button class="btn btn-primary" id="expBtn">⤓ Export backup (.json)</button><button class="btn" id="impBtn">⤒ Import backup</button></div>
        </section>
        <section class="card"><h2>Instructors</h2><p>Grade a whole class at once: load every apprentice's backup file, see auto-scored missions and takeoffs, read their RFIs and reports, and keep a gradebook.</p><a class="btn" href="instructor.html">Open Instructor Dashboard →</a></section>
        <section class="card"><h2>Reset</h2><p>Start over with the original sample project. <b>This erases all your work.</b></p><button class="btn btn-danger" id="resetBtn">Reset training data</button></section>
      </div>`;
    $("#prof", root).onsubmit = (e) => {
      e.preventDefault(); const f = Object.fromEntries(new FormData(e.target));
      s.user = { ...s.user, ...f };
      if (!store.list("team").some((t) => t.name === f.name)) store.add("team", { name: f.name, role: f.role, company: "Central Valley JATC", email: "", phone: "" });
      store.log(`Profile updated: ${f.name}`); store.event("profile"); toast("Profile saved", "ok"); PT.app.renderChrome();
    };
    $$("[data-p]", root).forEach((a) => (a.onclick = (e) => { e.preventDefault(); s.activeProjectId = a.dataset.p; store.emit(); location.hash = "#/"; }));
    $("#newProj", root).onclick = () => modal({ title: "New project", body: `<label>Name <input name="name" required data-label="Name"></label><label>Project # <input name="number"></label><label>Address <input name="address"></label>`, onSubmit: (f) => { store.newProject(f.name, f.number, f.address); location.hash = "#/sheets"; PT.app.renderChrome(); } });
    $("#expBtn", root).onclick = () => { download(`plan-trainer-${s.user.name.replace(/\W+/g, "_")}-${today()}.json`, store.exportJSON(), "application/json"); store.event("export", { what: "backup" }); };
    $("#impBtn", root).onclick = () => {
      const inp = h(`<input type="file" accept=".json,application/json" hidden>`); document.body.appendChild(inp);
      inp.onchange = async () => { const f = inp.files[0]; inp.remove(); if (!f) return; try { store.importJSON(await f.text()); toast("Backup imported", "ok"); location.hash = "#/"; PT.app.renderChrome(); } catch (e) { toast(e.message, "warn"); } };
      inp.click();
    };
    $("#resetBtn", root).onclick = () => U.confirmBox("Erase everything and restore the sample project?", () => { store.resetAll(); location.hash = "#/"; PT.app.renderChrome(); toast("Reset complete"); }, "Erase & reset");
  }

  /* ============ PRINT ============ */
  function printWindow(title, html) {
    const w = window.open("", "_blank");
    if (!w) return toast("Allow pop-ups to print", "warn");
    w.document.write(`<!doctype html><html><head><title>${esc(title)}</title><style>
      body{font-family:Arial,sans-serif;margin:24px;color:#111} h1{font-size:20px;margin:0} .sub{color:#555;margin-bottom:16px}
      table{border-collapse:collapse;width:100%;font-size:12px} th,td{border:1px solid #999;padding:5px;text-align:left;vertical-align:top} th{background:#eee}
      .box{border:1px solid #999;padding:8px;margin:8px 0;white-space:pre-wrap} img{max-width:160px;margin:4px}</style></head><body>
      <h1>${esc(title)}</h1><div class="sub">${esc(store.project().name)} • Printed ${new Date().toLocaleString()} by ${esc(store.get().user.name)}</div>${html}
      <script>setTimeout(()=>print(),300)<\/script></body></html>`);
    w.document.close();
    store.event("print", { title });
  }
  function printReport(title, rows) {
    printWindow(title + " Report", `<table><tr><th>#</th><th>Type</th><th>Title / description</th><th>Status</th><th>Assignee</th><th>Due</th><th>Location</th><th>Sheet</th><th>Photos</th></tr>
      ${rows.map((i) => `<tr><td>${i.number}</td><td>${esc(i.type)}</td><td><b>${esc(i.title)}</b><br>${esc(i.description || "")}${(i.watchers || []).length ? `<br><i>Watching: ${esc(i.watchers.join(", "))}</i>` : ""}${i.delayDays || i.costImpact ? `<br><i>Delay: ${esc(i.delayDays || 0)} day(s) • Cost increase: ${money(i.costImpact || 0)}</i>` : ""}</td><td>${esc(i.status)}</td><td>${esc(i.assignee || "")}</td><td>${fmtDate(i.dueDate)}</td><td>${esc(i.location || "")}</td><td>${esc(store.find("sheets", i.sheetId)?.number || "")}</td><td>${(i.photoIds || []).map((id) => store.find("photos", id)).filter(Boolean).map((p) => `<img src="${p.dataUrl}">`).join("")}</td></tr>`).join("")}</table>`);
  }
  function printRfi(r) {
    printWindow(`RFI-${String(r.number).padStart(3, "0")}`, `<table>
      <tr><th>Subject</th><td>${esc(r.subject)}</td><th>Status</th><td>${esc(r.status)}</td></tr>
      <tr><th>From</th><td>${esc(r.createdBy)}</td><th>To</th><td>${esc(r.assignedTo)}</td></tr>
      <tr><th>Sent</th><td>${fmtDate(r.sentDate || r.createdAt)}</td><th>Response due</th><td>${fmtDate(r.dueDate)}</td></tr>
      <tr><th>Cost impact</th><td>${esc(r.costImpact)}</td><th>Schedule impact</th><td>${esc(r.scheduleImpact)}</td></tr>
      <tr><th>Sheets</th><td colspan=3>${(r.sheetIds || []).map((id) => store.find("sheets", id)?.number).join(", ")}</td></tr></table>
      <h3>Question</h3><div class="box">${esc(r.question)}</div><h3>Suggested solution</h3><div class="box">${esc(r.suggestion || "—")}</div>
      <h3>Answer</h3><div class="box">${esc(r.answer || "(awaiting response)")}</div>`);
  }
  function printForm(r) {
    const skip = ["id", "projectId", "createdAt", "updatedAt", "crew", "jha", "type", "materials", "equipmentLog", "workers", "photoIds", "equipment"];
    let html = `<table>${Object.entries(r).filter(([k]) => !skip.includes(k)).map(([k, v]) => `<tr><th>${esc(k)}</th><td style="white-space:pre-wrap">${esc(v)}</td></tr>`).join("")}</table>`;
    if (r.crew?.length) html += `<h3>Manpower</h3><table><tr><th>Trade</th><th>Company</th><th>#</th><th>Hours</th></tr>${r.crew.map((c) => `<tr><td>${esc(c.trade)}</td><td>${esc(c.company)}</td><td>${esc(c.count)}</td><td>${esc(c.hours)}</td></tr>`).join("")}</table>`;
    if (r.materials?.length) html += `<h3>Material log</h3><table><tr><th>Material</th><th>Qty</th><th>Unit</th><th>Supplier / ticket</th><th>Where used / notes</th></tr>${r.materials.map((m) => `<tr><td>${esc(m.material)}</td><td>${esc(m.qty)}</td><td>${esc(m.unit)}</td><td>${esc(m.supplier)}</td><td>${esc(m.use)}</td></tr>`).join("")}</table>`;
    if (r.equipmentLog?.length) html += `<h3>Equipment log</h3><table><tr><th>Equipment</th><th>Qty</th><th>Hours</th><th>Notes</th></tr>${r.equipmentLog.map((m) => `<tr><td>${esc(m.name)}</td><td>${esc(m.qty)}</td><td>${esc(m.hours)}</td><td>${esc(m.notes)}</td></tr>`).join("")}</table>`;
    else if (r.equipment) html += `<h3>Equipment</h3><div class="box">${esc(r.equipment)}</div>`;
    if (r.workers?.length) html += `<h3>Time sheet</h3><table><tr><th>Worker</th><th>Classification</th><th>Start</th><th>End</th><th>Lunch</th><th>Hours</th><th>Cost code / task</th></tr>${r.workers.map((w) => `<tr><td>${esc(w.name)}</td><td>${esc(w.classification)}</td><td>${esc(w.start)}</td><td>${esc(w.end)}</td><td>${esc(w.lunch)}</td><td>${esc(w.hours)}</td><td>${esc(w.costCode)}</td></tr>`).join("")}<tr><th colspan=5>Total</th><th>${tsHours(r)}</th><td></td></tr></table>`;
    if (r.photoIds?.length) html += `<h3>Photos</h3>${r.photoIds.map((id) => store.find("photos", id)).filter(Boolean).map((p) => `<img src="${p.dataUrl}" title="${esc(p.caption || "")}">`).join("")}`;
    if (r.jha?.length) html += `<h3>Hazard analysis</h3><table><tr><th>Step</th><th>Hazard</th><th>Control</th></tr>${r.jha.map((j) => `<tr><td>${esc(j.step)}</td><td>${esc(j.hazard)}</td><td>${esc(j.control)}</td></tr>`).join("")}</table>`;
    printWindow(`${r.type} – ${fmtDate(r.date)}`, html);
  }

  const route = () => PT.app.route();

  return { dashboard, sheets, issues, punch: (root) => issues(root, true), rfis, submittals, photos, reports, documents, team, activity, settings, search, issueForm, rfiForm, addPhoto, photoViewer, uploadSheets };
})();
