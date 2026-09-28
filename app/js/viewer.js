/* Sheet viewer: pan/zoom, markup tools, measurements, pins, hyperlinks,
   version compare and export. Markups are stored in sheet units so they
   stay put at any zoom and carry forward to newer sheet versions.        */
PT.viewer = (() => {
  const { esc, h, $, $$, toast, modal, options, uid, nowIso, ftIn, parseFtIn, download } = PT.util;
  const store = PT.store;

  const TOOLS = [
    { id: "select", icon: "☝", name: "Select", label: "Select / Pan", key: "v", hint: "Click a markup to select, move or edit it. Drag empty space to pan. Scroll or pinch to zoom." },
    { id: "pen", icon: "✎", name: "Pen", label: "Pen", key: "p", hint: "Draw freehand – press and drag." },
    { id: "highlighter", icon: "▰", name: "Highlight", label: "Highlighter", key: "h", hint: "Drag over text or an area to highlight it (see-through)." },
    { id: "line", icon: "╱", name: "Line", label: "Line", key: "l", hint: "Drag from start to end." },
    { id: "arrow", icon: "➚", name: "Arrow", label: "Arrow", key: "a", hint: "Drag from your note toward the item you are pointing at." },
    { id: "rect", icon: "▭", name: "Box", label: "Rectangle", key: "r", hint: "Drag corner to corner to box in an area." },
    { id: "ellipse", icon: "◯", name: "Circle", label: "Ellipse", key: "e", hint: "Drag corner to corner to circle an item." },
    { id: "cloud", icon: "☁", name: "Cloud", label: "Revision cloud", key: "c", hint: "Drag around a change or a question – clouds mean “look here”." },
    { id: "text", icon: "T", name: "Text", label: "Text", key: "t", hint: "Click where the note goes, then type it." },
    { id: "stamp", icon: "⬒", name: "Stamp", label: "Stamp", key: "s", hint: "Pick a stamp (FIELD VERIFY, AS-BUILT, LEAK, SEE RFI…) above, then click the sheet." },
    { sep: true },
    { id: "measure", icon: "📏", name: "Measure", label: "Measure length", key: "m", hint: "Drag from point to point to measure a length. Calibrate the sheet first." },
    { id: "polylen", icon: "〰", name: "Path", label: "Measure path (multi-segment run)", key: "u", hint: "Click each corner of a run (edge metal, flashing), double-click to finish – adds up all segments." },
    { id: "area", icon: "⬠", name: "Area", label: "Measure area", key: "g", hint: "Click each corner of the roof area, double-click (or Enter) to finish – shows SF and squares." },
    { id: "count", icon: "#", name: "Count", label: "Count", key: "n", hint: "Click each item (drains, pipes, curbs), press Enter to finish and name the count." },
    { id: "calibrate", icon: "⇔", name: "Scale", label: "Calibrate scale", key: "k", hint: "Drag along a known dimension, then enter its real length. Do this before measuring." },
    { sep: true },
    { id: "issue", icon: "📍", name: "Issue", label: "Issue / Task / Punch pin", key: "i", hint: "Click the spot on the plan to pin an issue, task or punch item and fill in the details." },
    { id: "photo", icon: "📷", name: "Photo", label: "Photo pin", key: "o", hint: "Click the spot where the photo was taken, then choose or take a picture." },
    { id: "link", icon: "🔗", name: "Link", label: "Hyperlink to sheet", key: "y", hint: "Drag a box over a detail bubble, then pick the sheet it should open." },
  ];
  const EXTRA = [
    ["undoBtn", "↶", "Undo", "Undo (Ctrl+Z)"], ["redoBtn", "↷", "Redo", "Redo (Ctrl+Y)"],
    ["zoomIn", "＋", "Zoom in", "Zoom in (+)"], ["zoomOut", "－", "Zoom out", "Zoom out (−)"], ["zoomFit", "⤢", "Fit", "Fit whole sheet (0)"],
  ];
  // Drawing scales. Architectural: paper inches per foot. Engineering: feet per paper inch.
  const ARCH = [["1/32", 1 / 32], ["1/16", 1 / 16], ["3/32", 3 / 32], ["1/8", 1 / 8], ["3/16", 3 / 16], ["1/4", 1 / 4], ["3/8", 3 / 8], ["1/2", 1 / 2], ["3/4", 3 / 4], ["1", 1], ["1-1/2", 1.5], ["3", 3]];
  const ENG = [10, 20, 30, 40, 50, 60, 100];
  const SCALE_PRESETS = [...ARCH.map(([l, v]) => [`${l}" = 1'-0"`, v]), ...ENG.map((f) => [`1" = ${f}'-0"`, 1 / f])];
  const EDITABLE = ["line", "arrow", "measure", "polylen", "area", "count", "rect", "ellipse", "cloud", "link", "highlighter"];
  const MEASURES = ["measure", "polylen", "area"];
  const STAMPS = ["FIELD VERIFY", "AS-BUILT", "LEAK", "PROBED OK", "APPROVED", "REVISED", "VOID", "COMPLETE", "HOLD", "SEE RFI"];
  const COLORS = ["#e5322d", "#f28c28", "#e6c700", "#2e9e44", "#1f6fd1", "#7b3fc4", "#111111"];
  const LAYERS = [["personal", "Personal"], ["published", "Published"], ["asbuilt", "As-Built"]];

  let V = null; // current viewer state

  function sheetVersion(sheet, idx) { return sheet.versions[idx ?? sheet.current]; }
  function srcOf(ver) { return ver.src.kind === "sample" ? PT.samples.dataUrl(ver.src.key) : ver.src.dataUrl; }

  /* ================= open ================= */
  function open(root, sheetId, opts = {}) {
    const sheet = store.find("sheets", sheetId);
    if (!sheet) { root.innerHTML = `<div class="empty">Sheet not found.</div>`; return; }
    const verIdx = opts.version ?? sheet.current;
    V = {
      root, sheet, verIdx, ver: sheetVersion(sheet, verIdx),
      tool: "select", color: store.get().settings.defaultColor || COLORS[0], width: 3, fontSize: 22,
      layer: "personal", stamp: STAMPS[0],
      z: 1, tx: 0, ty: 0, draft: null, selected: null, undo: [], redo: [],
      show: { personal: true, published: true, asbuilt: true, issues: true, photos: true, links: true },
      compare: null, pointers: new Map(), sideTab: "markups",
    };
    store.event("sheet_open", { sheetId, number: sheet.number });

    const all = store.list("sheets").sort((a, b) => a.number.localeCompare(b.number));
    const i = all.findIndex((s) => s.id === sheet.id);
    const prev = all[i - 1], next = all[i + 1];

    root.innerHTML = `
      <div class="viewer">
        <div class="viewer-top">
          <a class="btn" href="#/sheets">← Sheets</a>
          <div class="sheet-name"><b>${esc(sheet.number)}</b> <span>${esc(sheet.title)}</span></div>
          <label class="inline">Version
            <select id="verSel">${sheet.versions.map((v, k) => `<option value="${k}" ${k === verIdx ? "selected" : ""}>Rev ${esc(v.rev)} – ${esc(v.set || "")} (${esc(v.date)})${k === sheet.current ? " • current" : ""}</option>`).join("")}</select>
          </label>
          <button class="btn" id="cmpBtn" ${sheet.versions.length < 2 ? "disabled title='Upload a new version to compare'" : ""}>⇄ Compare</button>
          <span class="spacer"></span>
          <a class="btn" ${prev ? `href="#/sheet/${prev.id}"` : "aria-disabled='true'"} title="Previous sheet">‹ ${prev ? esc(prev.number) : ""}</a>
          <a class="btn" ${next ? `href="#/sheet/${next.id}"` : "aria-disabled='true'"} title="Next sheet">${next ? esc(next.number) : ""} ›</a>
          <button class="btn" id="exportBtn" title="Export sheet with markups as PNG">⤓ PNG</button>
          <button class="btn" id="sideToggle" title="Show/hide side panel">☰</button>
        </div>
        <div class="viewer-body">
          <div class="toolbar" id="toolbar">
            ${TOOLS.map((t) => t.sep ? `<hr>` : `<button class="tool" data-tool="${t.id}" title="${esc(t.label)} (key ${t.key.toUpperCase()}) – ${esc(t.hint)}" aria-label="${esc(t.label)}"><span class="ti">${t.icon}</span><span class="tn">${esc(t.name)}</span></button>`).join("")}
            <hr>
            ${EXTRA.map(([id, icon, name, tip]) => `<button class="tool" id="${id}" title="${esc(tip)}" aria-label="${esc(name)}"><span class="ti">${icon}</span><span class="tn">${esc(name)}</span></button>`).join("")}
          </div>
          <div class="canvas-wrap" id="canvasWrap" tabindex="0">
            <div class="stage" id="stage">
              <img id="sheetImg" draggable="false" alt="${esc(sheet.number)}">
              <svg id="overlay" xmlns="http://www.w3.org/2000/svg"></svg>
            </div>
            <div class="tool-options" id="toolOptions"></div>
            <div class="tool-hint" id="toolHint"></div>
            <canvas class="loupe hidden" id="loupe" width="300" height="300"></canvas>
            <div class="compare-legend hidden" id="cmpLegend"></div>
            <div class="zoom-ind" id="zoomInd"></div>
          </div>
          <aside class="side-panel" id="sidePanel"></aside>
        </div>
      </div>`;

    const img = $("#sheetImg", root);
    img.onload = () => { fit(); renderOverlay(); };
    img.src = srcOf(V.ver);
    sizeStage();

    $("#verSel", root).onchange = (e) => { location.hash = `#/sheet/${sheet.id}/v/${e.target.value}`; };
    $("#cmpBtn", root).onclick = openCompare;
    $("#exportBtn", root).onclick = exportPNG;
    $("#sideToggle", root).onclick = () => $("#sidePanel", root).classList.toggle("collapsed");
    $$("#toolbar .tool[data-tool]", root).forEach((b) => (b.onclick = () => setTool(b.dataset.tool)));
    $("#undoBtn", root).onclick = undo;
    $("#redoBtn", root).onclick = redo;
    $("#zoomIn", root).onclick = () => zoomBy(1.25);
    $("#zoomOut", root).onclick = () => zoomBy(0.8);
    $("#zoomFit", root).onclick = fit;
    if (window.innerWidth < 900) $("#sidePanel", root).classList.add("collapsed");
    bindPointer();
    setTool("select");
    renderSide();
    if (opts.focus) setTimeout(() => focusOn(opts.focus.x, opts.focus.y), 60);
  }

  function sizeStage() {
    const st = $("#stage", V.root), svg = $("#overlay", V.root);
    st.style.width = V.ver.w + "px"; st.style.height = V.ver.h + "px";
    svg.setAttribute("viewBox", `0 0 ${V.ver.w} ${V.ver.h}`);
    svg.setAttribute("width", V.ver.w); svg.setAttribute("height", V.ver.h);
  }

  /* ================= pan / zoom ================= */
  function applyTransform() {
    $("#stage", V.root).style.transform = `translate(${V.tx}px, ${V.ty}px) scale(${V.z})`;
    $("#zoomInd", V.root).textContent = Math.round(V.z * 100) + "%";
  }
  function fit() {
    const wrap = $("#canvasWrap", V.root); if (!wrap) return;
    const r = wrap.getBoundingClientRect();
    V.z = Math.min(r.width / V.ver.w, r.height / V.ver.h) * 0.96 || 0.5;
    V.tx = (r.width - V.ver.w * V.z) / 2; V.ty = (r.height - V.ver.h * V.z) / 2;
    applyTransform();
  }
  function zoomAt(factor, cx, cy) {
    const nz = Math.min(8, Math.max(0.1, V.z * factor));
    const f = nz / V.z;
    V.tx = cx - (cx - V.tx) * f; V.ty = cy - (cy - V.ty) * f; V.z = nz;
    applyTransform();
  }
  function zoomBy(f) { const r = $("#canvasWrap", V.root).getBoundingClientRect(); zoomAt(f, r.width / 2, r.height / 2); }
  function focusOn(x, y, z = 1.2) {
    const r = $("#canvasWrap", V.root).getBoundingClientRect();
    V.z = z; V.tx = r.width / 2 - x * z; V.ty = r.height / 2 - y * z; applyTransform();
  }
  function toSheet(e) {
    const r = $("#canvasWrap", V.root).getBoundingClientRect();
    return { x: (e.clientX - r.left - V.tx) / V.z, y: (e.clientY - r.top - V.ty) / V.z };
  }

  /* ================= tools ================= */
  function setTool(id) {
    finishDraft();
    V.tool = id;
    $$("#toolbar .tool[data-tool]", V.root).forEach((b) => b.classList.toggle("active", b.dataset.tool === id));
    $("#canvasWrap", V.root).dataset.tool = id;
    renderToolOptions();
    const t = TOOLS.find((x) => x.id === id), th = $("#toolHint", V.root);
    if (th && t) th.innerHTML = `<b>${t.icon} ${esc(t.label)}</b> <kbd>${t.key.toUpperCase()}</kbd> – ${esc(t.hint)}`;
    if (["measure", "area", "polylen"].includes(id) && !V.ver.scalePxPerFt) toast("This sheet has no scale yet – use the Calibrate tool (⇔) first.", "warn");
  }

  function renderToolOptions() {
    const box = $("#toolOptions", V.root);
    const drawing = !["select", "issue", "photo", "calibrate"].includes(V.tool);
    if (!drawing) {
      box.innerHTML = V.tool === "calibrate" ? `<span>Drag along the <b>graphic scale bar</b> or a known dimension, then enter its length. <b>Drag the green ends</b> to fine-tune.</span>
        <span class="muted">Now: ${esc(scaleText(V.ver))}</span>
        <button class="btn btn-sm btn-primary" id="optScaleList">Pick drawing scale…</button>` : "";
      box.classList.toggle("hidden", V.tool !== "calibrate");
      const b = $("#optScaleList", box); if (b) b.onclick = () => calibrate(null);
      return;
    }
    box.classList.remove("hidden");
    box.innerHTML = `
      <div class="swatches">${COLORS.map((c) => `<button class="swatch ${c === V.color ? "on" : ""}" data-c="${c}" style="background:${c}" title="${c}"></button>`).join("")}</div>
      ${["text", "stamp", "count", "link"].includes(V.tool) ? "" : `<label>Width <input type="range" min="1" max="12" value="${V.width}" id="optW"></label>`}
      ${V.tool === "text" ? `<label>Size <input type="range" min="12" max="60" value="${V.fontSize}" id="optF"></label>` : ""}
      ${V.tool === "stamp" ? `<select id="optStamp">${options(STAMPS, V.stamp)}</select>` : ""}
      <label>Layer <select id="optLayer">${options(LAYERS, V.layer)}</select></label>
      ${["area", "count", "polylen"].includes(V.tool) ? `<button class="btn btn-sm btn-primary" id="optFinish">Finish (Enter)</button>` : ""}`;
    $$(".swatch", box).forEach((s) => (s.onclick = () => { V.color = s.dataset.c; store.get().settings.defaultColor = V.color; renderToolOptions(); }));
    const w = $("#optW", box); if (w) w.oninput = () => (V.width = +w.value);
    const f = $("#optF", box); if (f) f.oninput = () => (V.fontSize = +f.value);
    const st = $("#optStamp", box); if (st) st.onchange = () => (V.stamp = st.value);
    $("#optLayer", box).onchange = (e) => (V.layer = e.target.value);
    const fin = $("#optFinish", box); if (fin) fin.onclick = finishDraft;
  }

  /* ================= pointer handling ================= */
  function bindPointer() {
    const wrap = $("#canvasWrap", V.root);
    let panStart = null, pinch = null, drag = null;

    wrap.addEventListener("wheel", (e) => {
      e.preventDefault();
      const r = wrap.getBoundingClientRect();
      zoomAt(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.clientX - r.left, e.clientY - r.top);
    }, { passive: false });

    wrap.addEventListener("pointerdown", (e) => {
      if (e.target.closest(".tool-options")) return;
      wrap.focus();
      try { wrap.setPointerCapture(e.pointerId); } catch { }
      V.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      V.touch = e.pointerType !== "mouse";
      // Grab a handle (end point / corner) of the selected markup or the calibration line – works with any tool.
      const hd = V.pointers.size === 1 && e.target.closest("[data-h]");
      if (hd) {
        const p0 = toSheet(e), i = +hd.dataset.h;
        const m = hd.dataset.cal ? null : store.find("markups", V.selected);
        const pts = m ? m.points : V.ver.calib.points;
        V.dragCal = !m;
        drag = { m, i, cal: !m, off: [pts[i][0] - p0.x, pts[i][1] - p0.y], orig: JSON.stringify(m || V.ver.calib) };
        showLoupe(e, pts[i]);
        return;
      }
      if (V.pointers.size === 2) {
        const [a, b] = [...V.pointers.values()];
        pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) }; V.draft = V.draft && ["area", "count", "polylen"].includes(V.draft.type) ? V.draft : null; panStart = null; return;
      }
      const p = toSheet(e);
      const target = e.target.closest("[data-id],[data-link],[data-issue],[data-photo]");
      if (e.button === 1 || keys.space || V.tool === "select") {
        if (V.tool === "select" && target && e.button === 0) {
          if (target.dataset.link) return followLink(target.dataset.link);
          if (target.dataset.issue) return PT.views.issueForm(store.find("issues", target.dataset.issue));
          if (target.dataset.photo) return PT.views.photoViewer(target.dataset.photo);
          if (target.dataset.id) {
            const m = store.find("markups", target.dataset.id);
            if (m && m.type === "link" && !e.shiftKey) return followLink(m.target, m.url);
            select(target.dataset.id);
            panStart = { x: e.clientX, y: e.clientY, tx: V.tx, ty: V.ty, moveMarkup: m, orig: JSON.stringify(m), sp: p };
            return;
          }
        }
        if (V.tool === "select") select(null);
        panStart = { x: e.clientX, y: e.clientY, tx: V.tx, ty: V.ty };
        return;
      }
      if (V.touch && ["area", "polylen", "count"].includes(V.tool)) { V.touchPt = p; if (V.draft) V.draft.hover = p; showLoupe(e, [p.x, p.y]); renderOverlay(); return; }
      startDraw(p, e);
      if (V.touch && V.draft) showLoupe(e, [p.x, p.y]);
    });

    wrap.addEventListener("pointermove", (e) => {
      if (!V.pointers.has(e.pointerId)) { if (V.draft && ["area", "polylen"].includes(V.draft.type)) { V.draft.hover = toSheet(e); renderOverlay(); } return; }
      V.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (drag && V.pointers.size === 1) {
        const p = toSheet(e), q = [p.x + drag.off[0], p.y + drag.off[1]];
        if (drag.m) { drag.m.points[drag.i] = q; if (MEASURES.includes(drag.m.type)) drag.m.value = measureValue(drag.m, verOf(drag.m).scalePxPerFt); }
        else { V.ver.calib.points[drag.i] = q; applyCalib(V.ver); }
        renderOverlay(); showLoupe(e, q); return;
      }
      if (V.touchPt && V.pointers.size === 1) { const p = toSheet(e); V.touchPt = p; if (V.draft) V.draft.hover = p; renderOverlay(); showLoupe(e, [p.x, p.y]); return; }
      if (pinch && V.pointers.size === 2) {
        const [a, b] = [...V.pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y); const r = wrap.getBoundingClientRect();
        zoomAt(d / pinch.d, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top); pinch.d = d; return;
      }
      if (panStart) {
        if (panStart.moveMarkup) {
          const p = toSheet(e); moveMarkup(panStart.moveMarkup, p.x - panStart.sp.x, p.y - panStart.sp.y); panStart.sp = p; renderOverlay(); return;
        }
        V.tx = panStart.tx + e.clientX - panStart.x; V.ty = panStart.ty + e.clientY - panStart.y; applyTransform(); return;
      }
      if (V.draft) { moveDraw(toSheet(e)); if (V.touch) showLoupe(e, V.draft.points[V.draft.points.length - 1]); }
    });

    const end = (e) => {
      V.pointers.delete(e.pointerId);
      if (V.pointers.size < 2) pinch = null;
      hideLoupe();
      if (drag) {
        const d = drag; drag = null; V.dragCal = false;
        if (d.m && JSON.stringify(d.m) !== d.orig) { pushUndo({ kind: "modify", id: d.m.id, before: JSON.parse(d.orig) }); store.log(`Adjusted ${d.m.type} on ${V.sheet.number}`); store.emit(); }
        if (d.cal) { store.log(`Re-calibrated ${V.sheet.number}: ${ftIn(V.ver.calib.ft)}`); store.event("calibrate", { sheetId: V.sheet.id, ft: V.ver.calib.ft }); }
        renderSide(); return;
      }
      if (V.touchPt) { const p = V.touchPt; V.touchPt = null; if (V.draft) V.draft.hover = null; if (e.type === "pointerup") startDraw(p, e); else renderOverlay(); return; }
      if (panStart) {
        if (panStart.moveMarkup && JSON.stringify(panStart.moveMarkup) !== panStart.orig) {
          pushUndo({ kind: "modify", id: panStart.moveMarkup.id, before: JSON.parse(panStart.orig) }); store.emit();
        }
        panStart = null; return;
      }
      if (V.draft) endDraw(toSheet(e));
    };
    wrap.addEventListener("pointerup", end);
    wrap.addEventListener("pointercancel", end);
    wrap.addEventListener("dblclick", (e) => { if (V.draft && ["area", "polylen"].includes(V.draft.type)) { e.preventDefault(); finishDraft(); } });

  }


  /* Keyboard shortcuts – bound once on document, act on the open viewer. */
  const keys = { space: false };
  document.addEventListener("keydown", (e) => {
    if (!V || !document.contains(V.root) || !$("#canvasWrap", V.root)) return;
    if (document.querySelector(".modal-backdrop")) return;
    if (e.target.matches && e.target.matches("input,textarea,select")) return;
    if (e.key === " ") { keys.space = true; e.preventDefault(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") { e.preventDefault(); return e.shiftKey ? redo() : undo(); }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") { e.preventDefault(); return redo(); }
    if (e.key === "Escape") { V.draft = null; renderOverlay(); select(null); return; }
    if (e.key === "Enter") return finishDraft();
    if (e.key === "Delete" || e.key === "Backspace") { if (V.selected) { e.preventDefault(); deleteMarkup(V.selected); } return; }
    if (e.key === "+" || e.key === "=") return zoomBy(1.25);
    if (e.key === "-") return zoomBy(0.8);
    if (e.key === "0") return fit();
    const t = TOOLS.find((t) => t.key === e.key.toLowerCase());
    if (t && !e.ctrlKey && !e.metaKey && !e.altKey) setTool(t.id);
  });
  document.addEventListener("keyup", (e) => { if (e.key === " ") keys.space = false; });

  function moveMarkup(m, dx, dy) {
    const mv = (pt) => [pt[0] + dx, pt[1] + dy];
    if (m.points) m.points = m.points.map(mv);
  }

  /* ================= drawing ================= */
  function base(type) {
    return { id: uid("mk"), projectId: store.pid(), sheetId: V.sheet.id, versionId: V.ver.id, type, color: V.color, width: V.width, layer: V.layer, createdBy: store.get().user.name, createdAt: nowIso() };
  }

  function startDraw(p, e) {
    const t = V.tool, pt = [p.x, p.y];
    if (t === "text") return promptText(p);
    if (t === "stamp") return commit({ ...base("stamp"), points: [pt], text: V.stamp });
    if (t === "issue") return PT.views.issueForm(null, { sheetId: V.sheet.id, x: p.x, y: p.y });
    if (t === "photo") return PT.views.addPhoto({ sheetId: V.sheet.id, x: p.x, y: p.y });
    if (t === "count") {
      if (!V.draft || V.draft.type !== "count") V.draft = { ...base("count"), points: [], label: "" };
      V.draft.points.push(pt); renderOverlay(); return;
    }
    if (t === "area" || t === "polylen") {
      if (!V.draft || V.draft.type !== t) V.draft = { ...base(t), points: [pt] };
      else {
        const f = V.draft.points[0];
        if (t === "area" && V.draft.points.length >= 3 && Math.hypot(f[0] - p.x, f[1] - p.y) < 12 / V.z) return finishDraft();
        const l = V.draft.points[V.draft.points.length - 1];
        if (Math.hypot(l[0] - p.x, l[1] - p.y) > 4 / V.z) V.draft.points.push(pt); // ignore double-click repeats
      }
      renderOverlay(); return;
    }
    const type = t === "calibrate" ? "calibrate" : t;
    V.draft = { ...base(type), points: [pt, pt] };
    if (t === "highlighter") { V.draft.width = Math.max(V.width * 4, 14); V.draft.opacity = 0.35; }
  }

  function moveDraw(p) {
    const d = V.draft; if (!d || !d.points) return;
    if (["pen", "highlighter"].includes(d.type)) d.points.push([p.x, p.y]);
    else if (["area", "count", "polylen"].includes(d.type)) return;
    else d.points[1] = [p.x, p.y];
    renderOverlay();
  }

  function endDraw() {
    const d = V.draft; if (!d || ["area", "count", "polylen"].includes(d.type)) return;
    V.draft = null;
    const [a, b] = [d.points[0], d.points[d.points.length - 1]];
    const tiny = Math.hypot(a[0] - b[0], a[1] - b[1]) < 3;
    if (tiny && d.type !== "pen") { renderOverlay(); return; }
    if (d.type === "calibrate") return calibrate(d);
    if (d.type === "link") return chooseLink(d);
    if (d.type === "measure") { if (!V.ver.scalePxPerFt) { toast("Calibrate the sheet first.", "warn"); renderOverlay(); return; } }
    if (["pen", "highlighter"].includes(d.type)) d.points = simplify(d.points);
    commit(d);
  }

  function finishDraft() {
    const d = V?.draft; if (!d) return;
    V.draft = null;
    if (d.type === "area" && d.points.length >= 3) {
      if (!V.ver.scalePxPerFt) toast("Area saved without a value – calibrate the sheet to get square feet.", "warn");
      commit(d);
    } else if (d.type === "polylen" && d.points.length >= 2) commit(d);
    else if (d.type === "count" && d.points.length) {
      modal({ title: `Count: ${d.points.length} items`, body: `<label>What did you count? <input name="label" placeholder="e.g. Pipe penetrations – whole roof"></label>`, submitLabel: "Save count", onSubmit: (f) => { d.label = f.label; commit(d); } });
    } else renderOverlay();
  }

  function simplify(pts) {
    const out = [pts[0]];
    for (const p of pts) { const l = out[out.length - 1]; if (Math.hypot(p[0] - l[0], p[1] - l[1]) > 2) out.push(p); }
    return out;
  }

  function promptText(p) {
    modal({
      title: "Add text", body: `<label>Text <textarea name="text" rows="3" required data-label="Text"></textarea></label>`, submitLabel: "Add",
      onSubmit: (f) => commit({ ...base("text"), points: [[p.x, p.y]], text: f.text, fontSize: V.fontSize }),
    });
  }

  function chooseLink(d) {
    const sheets = store.list("sheets").filter((s) => s.id !== V.sheet.id).sort((a, b) => a.number.localeCompare(b.number));
    modal({
      title: "Create hyperlink", body: `
        <label>Link to sheet <select name="target"><option value="">— choose —</option>${sheets.map((s) => `<option value="${s.id}">${esc(s.number)} – ${esc(s.title)}</option>`).join("")}</select></label>
        <p class="muted">…or link to a web address (spec, product data, video):</p>
        <label>URL <input name="url" placeholder="https://"></label>`,
      submitLabel: "Create link",
      onSubmit: (f) => {
        if (!f.target && !f.url) { toast("Pick a sheet or enter a URL", "warn"); return false; }
        d.target = f.target || null; d.url = f.url || null; d.color = "#1f6fd1"; commit(d);
      },
    });
    renderOverlay();
  }

  /* ---------- scale / calibration ---------- */
  const ppiOf = (v) => v.ppi || (v.src?.kind === "sample" ? PT.samples.PPI : null); // sheet units per paper inch, if known
  function scaleText(v) {
    if (!v.scalePxPerFt) return "not set – calibrate first";
    const ppi = ppiOf(v);
    const hit = ppi && SCALE_PRESETS.find(([, ipf]) => Math.abs(ppi * ipf - v.scalePxPerFt) / v.scalePxPerFt < 0.01);
    return (v.scaleLabel || (hit ? hit[0] : "")) + ` (1 ft = ${v.scalePxPerFt.toFixed(2)} units)` + (v.calib ? ` · set from a ${ftIn(v.calib.ft)} line` : "");
  }
  const verOf = (m) => V.sheet.versions.find((v) => v.id === m.versionId) || V.ver;
  function recomputeValues() {
    for (const m of store.list("markups").filter((m) => m.sheetId === V.sheet.id && MEASURES.includes(m.type))) m.value = measureValue(m, verOf(m).scalePxPerFt);
  }
  function applyCalib(v) {
    const [a, b] = v.calib.points, px = Math.hypot(a[0] - b[0], a[1] - b[1]);
    if (px > 2) { v.scalePxPerFt = px / v.calib.ft; v.userCalibrated = true; v.scaleLabel = ""; recomputeValues(); }
  }
  function setScale(vers, pxPerFt, how, label = "") {
    vers.forEach((v) => { v.scalePxPerFt = pxPerFt; v.userCalibrated = true; v.scaleLabel = label; if (how.calib) v.calib = JSON.parse(JSON.stringify(how.calib)); else delete v.calib; });
    recomputeValues();
    store.log(`Calibrated ${V.sheet.number}: ${how.text}`);
    store.event("calibrate", { sheetId: V.sheet.id, ft: how.ft || 1 });
    toast(`Scale set: ${label || how.text}`, "ok");
    renderToolOptions(); renderOverlay(); renderSide();
  }

  // d = drawn line (from the Scale tool) or null (pick a scale from the list)
  function calibrate(d) {
    const px = d ? Math.hypot(d.points[0][0] - d.points[1][0], d.points[0][1] - d.points[1][1]) : 0;
    const ppi = ppiOf(V.ver);
    renderOverlay();
    modal({
      title: "Set the sheet scale",
      body: `${d ? `<p>You drew a line <b>${px.toFixed(0)}</b> units long. Type the real length it represents – read it from the <b>graphic scale bar</b> or a printed dimension (e.g. <code>16'</code>, <code>100'-0"</code>, <code>6"</code>).</p>
             <label>Known length <input name="len" placeholder="16'-0&quot;"></label>` : ""}
             ${ppi ? `<label>${d ? "…or pick" : "Pick"} the drawing scale printed on the sheet <select name="preset"><option value="">—</option>${SCALE_PRESETS.map(([l], k) => `<option value="${k}">${esc(l)}</option>`).join("")}</select></label>
             <p class="muted small">Picking from the list only works when the sheet is full size (not a half-size or reduced print). Always check it by measuring the graphic scale bar or a known dimension.</p>`
             : `<p class="muted small">This sheet was uploaded as an image, so its paper size is unknown – calibrate by drawing along the graphic scale bar or a known dimension.</p>`}
             <label class="check"><input type="checkbox" name="all" value="1"> Apply to all versions of this sheet</label>`,
      submitLabel: "Set scale",
      onSubmit: (f) => {
        const vers = f.all ? V.sheet.versions : [V.ver];
        if (f.len && f.len.trim()) {
          const ft = parseFtIn(f.len);
          if (!ft || ft <= 0) { toast("Could not read that length. Try 16' or 100'-0\"", "warn"); return false; }
          return setScale(vers, px / ft, { text: `${ftIn(ft)} = ${px.toFixed(0)} units`, ft, calib: { points: d.points.map((p) => [...p]), ft } });
        }
        if (f.preset !== undefined && f.preset !== "") {
          const [label, ipf] = SCALE_PRESETS[+f.preset];
          return setScale(vers, ppi * ipf, { text: label }, label);
        }
        toast(d ? "Type the known length or pick a scale" : "Pick a scale", "warn"); return false;
      },
    });
  }

  /* ---------- magnifier (loupe) so a finger doesn't hide the point ---------- */
  function showLoupe(e, pt) {
    if (!V.touch || !pt) return;
    const cv = $("#loupe", V.root), img = $("#sheetImg", V.root); if (!cv || !img?.naturalWidth) return;
    const wrap = $("#canvasWrap", V.root).getBoundingClientRect();
    const D = 150, mag = Math.max(V.z * 2.5, 0.9), R = D / 2 / mag; // sheet units visible from centre
    const kx = img.naturalWidth / V.ver.w, ky = img.naturalHeight / V.ver.h;
    const ctx = cv.getContext("2d"), k = cv.width / D;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.setTransform(k * mag, 0, 0, k * mag, k * (D / 2 - pt[0] * mag), k * (D / 2 - pt[1] * mag)); // sheet units -> loupe px
    try { ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, 0, 0, V.ver.w, V.ver.h); } catch { }
    // what is being drawn / adjusted
    const m = drawShape();
    if (m?.points?.length) {
      ctx.strokeStyle = m.color || "#1f6fd1"; ctx.lineWidth = 2 / mag; ctx.beginPath();
      m.points.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
      if (m.hover) ctx.lineTo(m.hover.x, m.hover.y);
      ctx.stroke();
    }
    ctx.setTransform(k, 0, 0, k, 0, 0);
    ctx.strokeStyle = "#e5322d"; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(D / 2, D / 2 - 18); ctx.lineTo(D / 2, D / 2 - 4); ctx.moveTo(D / 2, D / 2 + 4); ctx.lineTo(D / 2, D / 2 + 18);
    ctx.moveTo(D / 2 - 18, D / 2); ctx.lineTo(D / 2 - 4, D / 2); ctx.moveTo(D / 2 + 4, D / 2); ctx.lineTo(D / 2 + 18, D / 2); ctx.stroke();
    const val = liveValue(m);
    if (val) { ctx.font = "bold 13px Arial"; const w = ctx.measureText(val).width + 10; ctx.fillStyle = "rgba(22,50,79,.9)"; ctx.fillRect(D / 2 - w / 2, D - 26, w, 18); ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.fillText(val, D / 2, D - 12); }
    let x = e.clientX - wrap.left, y = e.clientY - wrap.top - 140;
    if (y < 10) y = e.clientY - wrap.top + 140;
    x = Math.max(D / 2 + 6, Math.min(wrap.width - D / 2 - 6, x));
    cv.style.left = x - D / 2 + "px"; cv.style.top = y - D / 2 + "px";
    cv.classList.remove("hidden");
  }
  function hideLoupe() { const cv = V && $("#loupe", V.root); if (cv) cv.classList.add("hidden"); }
  function drawShape() {
    if (V.draft) return V.draft;
    if (V.dragCal && V.ver.calib) return { type: "calibrate", points: V.ver.calib.points, color: "#2e9e44" };
    if (V.selected) return store.find("markups", V.selected);
    if (V.ver.calib) return { type: "calibrate", points: V.ver.calib.points, color: "#2e9e44" };
    return null;
  }
  function liveValue(m) {
    if (!m) return "";
    if (m.type === "calibrate" && V.ver.calib && !V.draft) return `${ftIn(V.ver.calib.ft)} line · 1 ft = ${V.ver.scalePxPerFt.toFixed(1)}`;
    if (!MEASURES.includes(m.type)) return "";
    const pts = m.hover ? [...m.points, [m.hover.x, m.hover.y]] : m.points;
    const v = measureValue({ ...m, points: pts }, V.ver.scalePxPerFt);
    return v == null ? "" : m.type === "area" ? `${v.toFixed(1)} SF` : ftIn(v);
  }

  function commit(m) {
    if (m.type === "measure" || m.type === "area" || m.type === "polylen") m.value = measureValue(m);
    store.add("markups", m);
    store.log(`Added ${m.type} markup on ${V.sheet.number} (${m.layer})`);
    pushUndo({ kind: "add", id: m.id });
    V.draft = null;
    if (MEASURES.includes(m.type) || (V.touch && ["line", "arrow"].includes(m.type))) V.selected = m.id; // show the grips so it can be adjusted
    renderOverlay(); renderSide();
    if (["pen", "highlighter", "line", "arrow", "rect", "ellipse", "cloud", "text", "stamp", "link"].includes(m.type) && m.layer === "personal") {
      if (!sessionStorageSafe("tipPersonal")) toast("Personal markups are only visible to you. Select it and click Publish to share with the team.");
    }
  }
  function sessionStorageSafe(k) { try { if (sessionStorage.getItem(k)) return true; sessionStorage.setItem(k, "1"); } catch { } return false; }

  /* ================= measurement math ================= */
  function measureValue(m, scale = V.ver.scalePxPerFt) {
    if (!scale) return null;
    const P = m.points;
    if (m.type === "measure") return Math.hypot(P[1][0] - P[0][0], P[1][1] - P[0][1]) / scale;
    if (m.type === "polylen") { let L = 0; for (let i = 1; i < P.length; i++) L += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); return L / scale; }
    if (m.type === "area") { let A = 0; for (let i = 0; i < P.length; i++) { const [x1, y1] = P[i], [x2, y2] = P[(i + 1) % P.length]; A += x1 * y2 - x2 * y1; } return Math.abs(A / 2) / (scale * scale); }
    return null;
  }

  /* ================= undo / redo ================= */
  function pushUndo(a) { V.undo.push(a); V.redo = []; }
  function undo() {
    const a = V.undo.pop(); if (!a) return toast("Nothing to undo");
    if (a.kind === "add") { const m = store.find("markups", a.id); if (m) { V.redo.push({ kind: "add", rec: { ...m } }); store.remove("markups", a.id); } }
    else if (a.kind === "delete") { store.add("markups", a.rec); V.redo.push({ kind: "delete", id: a.rec.id }); }
    else if (a.kind === "modify") { const m = store.find("markups", a.id); if (m) { V.redo.push({ kind: "modify", id: a.id, before: JSON.parse(JSON.stringify(m)) }); Object.assign(m, a.before); store.emit(); } }
    select(null); renderOverlay(); renderSide();
  }
  function redo() {
    const a = V.redo.pop(); if (!a) return toast("Nothing to redo");
    if (a.kind === "add") { store.add("markups", a.rec); V.undo.push({ kind: "add", id: a.rec.id }); }
    else if (a.kind === "delete") { const m = store.find("markups", a.id); if (m) { V.undo.push({ kind: "delete", rec: { ...m } }); store.remove("markups", a.id); } }
    else if (a.kind === "modify") { const m = store.find("markups", a.id); if (m) { V.undo.push({ kind: "modify", id: a.id, before: JSON.parse(JSON.stringify(m)) }); Object.assign(m, a.before); store.emit(); } }
    renderOverlay(); renderSide();
  }
  function deleteMarkup(id) {
    const m = store.find("markups", id); if (!m) return;
    pushUndo({ kind: "delete", rec: { ...m } });
    store.remove("markups", id, `Deleted ${m.type} markup on ${V.sheet.number}`);
    select(null); renderOverlay(); renderSide();
  }

  /* ================= rendering ================= */
  function markupsHere() {
    return store.list("markups").filter((m) => m.sheetId === V.sheet.id && V.show[m.layer] !== false);
  }

  function shapeSVG(m, draft = false) {
    const c = m.color, w = m.width || 3, P = m.points || [];
    const dash = m.layer === "asbuilt" ? `stroke-dasharray="${w * 3} ${w * 2}"` : "";
    const S = (d, extra = "") => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${dash} ${extra}/>`;
    const hit = (d) => draft ? "" : `<path d="${d}" fill="none" stroke="transparent" stroke-width="${Math.max(w + 12, 16)}"/>`;
    const poly = (pts) => "M" + pts.map((p) => p.join(" ")).join(" L");
    const bbox = () => { const [a, b] = P; return { x: Math.min(a[0], b[0]), y: Math.min(a[1], b[1]), w: Math.abs(a[0] - b[0]), h: Math.abs(a[1] - b[1]) }; };
    const label = (x, y, txt, color = c) => {
      const fs = 16, wpx = txt.length * fs * 0.6 + 12;
      return `<rect x="${x - wpx / 2}" y="${y - fs}" width="${wpx}" height="${fs + 8}" rx="4" fill="#fff" stroke="${color}" stroke-width="1.5"/><text x="${x}" y="${y + 2}" font-size="${fs}" font-weight="700" fill="${color}" text-anchor="middle" font-family="Arial">${esc(txt)}</text>`;
    };
    const scale = V.ver.scalePxPerFt;
    switch (m.type) {
      case "pen": case "highlighter": { const d = poly(P); return (m.type === "highlighter" ? `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" opacity="0.35"/>` : S(d)) + hit(d); }
      case "line": case "calibrate": { const d = poly(P); return S(d, m.type === "calibrate" ? `stroke-dasharray="8 6"` : "") + hit(d); }
      case "arrow": {
        const [a, b] = P; const ang = Math.atan2(b[1] - a[1], b[0] - a[0]); const L = 10 + w * 3;
        const p1 = [b[0] - L * Math.cos(ang - 0.4), b[1] - L * Math.sin(ang - 0.4)], p2 = [b[0] - L * Math.cos(ang + 0.4), b[1] - L * Math.sin(ang + 0.4)];
        const d = poly(P);
        return S(d) + `<path d="M${b.join(" ")} L${p1.join(" ")} L${p2.join(" ")} Z" fill="${c}"/>` + hit(d);
      }
      case "rect": case "link": {
        const r = bbox();
        const s = `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="${m.type === "link" ? "rgba(31,111,209,.08)" : "transparent"}" stroke="${c}" stroke-width="${w}" ${m.type === "link" ? `stroke-dasharray="6 4"` : dash}/>`;
        if (m.type === "link") {
          const tgt = m.target ? store.find("sheets", m.target) : null;
          return s + label(r.x + r.w / 2, r.y - 8, "🔗 " + (tgt ? tgt.number : (m.url || "link").replace(/^https?:\/\//, "").slice(0, 24)), c);
        }
        return s;
      }
      case "ellipse": { const r = bbox(); return `<ellipse cx="${r.x + r.w / 2}" cy="${r.y + r.h / 2}" rx="${r.w / 2}" ry="${r.h / 2}" fill="transparent" stroke="${c}" stroke-width="${w}" ${dash}/>`; }
      case "cloud": {
        const r = bbox(); const rad = Math.max(8, Math.min(24, Math.min(r.w, r.h) / 6));
        const nX = Math.max(1, Math.round(r.w / (rad * 2))), nY = Math.max(1, Math.round(r.h / (rad * 2)));
        const sx = r.w / nX, sy = r.h / nY; let d = `M${r.x} ${r.y}`;
        for (let i = 0; i < nX; i++) d += ` a${sx / 2} ${rad} 0 0 1 ${sx} 0`;
        for (let i = 0; i < nY; i++) d += ` a${rad} ${sy / 2} 0 0 1 0 ${sy}`;
        for (let i = 0; i < nX; i++) d += ` a${sx / 2} ${rad} 0 0 1 ${-sx} 0`;
        for (let i = 0; i < nY; i++) d += ` a${rad} ${sy / 2} 0 0 1 0 ${-sy}`;
        return S(d) + `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="transparent"/>`;
      }
      case "text": {
        const fs = m.fontSize || 22; const lines = String(m.text).split("\n");
        const wpx = Math.max(...lines.map((l) => l.length)) * fs * 0.58 + 10;
        return `<rect x="${P[0][0] - 5}" y="${P[0][1] - fs}" width="${wpx}" height="${lines.length * fs * 1.2 + 6}" fill="rgba(255,255,255,.85)" stroke="${c}" stroke-width="1"/>` +
          `<text x="${P[0][0]}" y="${P[0][1]}" font-size="${fs}" fill="${c}" font-family="Arial" font-weight="700">${lines.map((l, i) => `<tspan x="${P[0][0]}" dy="${i ? fs * 1.2 : 0}">${esc(l)}</tspan>`).join("")}</text>`;
      }
      case "stamp": {
        const fs = 28, wpx = m.text.length * fs * 0.68 + 24;
        return `<g transform="rotate(-8 ${P[0][0]} ${P[0][1]})"><rect x="${P[0][0]}" y="${P[0][1] - fs - 6}" width="${wpx}" height="${fs + 18}" rx="6" fill="rgba(255,255,255,.7)" stroke="${c}" stroke-width="4"/><text x="${P[0][0] + wpx / 2}" y="${P[0][1]}" font-size="${fs}" font-weight="900" text-anchor="middle" fill="${c}" font-family="Arial" letter-spacing="2">${esc(m.text)}</text></g>`;
      }
      case "measure": {
        const [a, b] = P; const d = poly(P); const v = measureValue(m, scale);
        const ang = Math.atan2(b[1] - a[1], b[0] - a[0]) + Math.PI / 2, tk = 10;
        const tick = (p) => `M${p[0] + tk * Math.cos(ang)} ${p[1] + tk * Math.sin(ang)} L${p[0] - tk * Math.cos(ang)} ${p[1] - tk * Math.sin(ang)}`;
        return S(d) + S(tick(a) + " " + tick(b)) + hit(d) + label((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - 10, v == null ? "no scale" : ftIn(v));
      }
      case "polylen": {
        const pts = draft && m.hover ? [...P, [m.hover.x, m.hover.y]] : P; const d = poly(pts);
        const v = measureValue({ ...m, points: pts }, scale); const last = pts[pts.length - 1];
        return S(d) + pts.map((p) => `<circle cx="${p[0]}" cy="${p[1]}" r="${w + 2}" fill="${c}"/>`).join("") + hit(d) + label(last[0], last[1] - 14, v == null ? "no scale" : "Run: " + ftIn(v));
      }
      case "area": {
        const pts = draft && m.hover ? [...P, [m.hover.x, m.hover.y]] : P;
        const d = poly(pts) + (draft ? "" : " Z"); const v = measureValue({ ...m, points: pts }, scale);
        const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length, cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
        return `<path d="${d}" fill="${c}" fill-opacity="0.15" stroke="${c}" stroke-width="${w}" ${dash}/>` + pts.map((p) => `<circle cx="${p[0]}" cy="${p[1]}" r="${w + 1}" fill="${c}"/>`).join("") +
          (pts.length >= 3 ? label(cx, cy, v == null ? "no scale" : `${v.toFixed(1)} SF`) : "");
      }
      case "count": {
        return P.map((p, i) => `<circle cx="${p[0]}" cy="${p[1]}" r="13" fill="${c}" fill-opacity="0.85" stroke="#fff" stroke-width="2"/><text x="${p[0]}" y="${p[1] + 5}" font-size="13" font-weight="700" text-anchor="middle" fill="#fff" font-family="Arial">${i + 1}</text>`).join("") +
          (P.length ? label(P[0][0], P[0][1] - 24, `${m.label ? m.label + ": " : "Count: "}${P.length}`) : "");
      }
    }
    return "";
  }

  function renderOverlay() {
    if (!V) return;
    const svg = $("#overlay", V.root); if (!svg) return;
    let s = "";
    // sample-sheet callout hyperlinks (auto-detected like PlanGrid)
    if (V.show.links) for (const l of V.ver.links || []) {
      const tgt = store.list("sheets").find((x) => x.number === l.target);
      if (tgt) s += `<circle data-link="${tgt.id}" class="autolink" cx="${l.x}" cy="${l.y}" r="${l.r + 4}"><title>Go to ${esc(l.target)}</title></circle>`;
    }
    for (const m of markupsHere()) {
      s += `<g data-id="${m.id}" class="mk ${m.id === V.selected ? "sel" : ""}">${shapeSVG(m)}${m.id === V.selected ? selBox(m) : ""}</g>`;
    }
    const sel = V.selected && store.find("markups", V.selected);
    if (sel && sel.sheetId === V.sheet.id && EDITABLE.includes(sel.type) && sel.points) {
      const pts = ["pen", "highlighter"].includes(sel.type) ? [] : sel.points;
      s += handles(pts, "");
    }
    if (V.ver.calib && V.tool === "calibrate") {
      const [a, b] = V.ver.calib.points;
      s += `<g class="calib"><path d="M${a[0]} ${a[1]} L${b[0]} ${b[1]}" stroke="#2e9e44" stroke-width="${3 / Math.max(V.z, .3)}" stroke-dasharray="10 6" fill="none"/>` +
        `<text x="${(a[0] + b[0]) / 2}" y="${(a[1] + b[1]) / 2 - 12 / V.z}" font-size="${14 / V.z}" font-weight="700" fill="#2e9e44" text-anchor="middle" font-family="Arial">SCALE ${esc(ftIn(V.ver.calib.ft))}</text></g>` + handles([a, b], ' data-cal="1"', "#2e9e44");
    }
    if (V.show.issues) for (const i of store.list("issues").filter((i) => i.sheetId === V.sheet.id && i.x != null)) {
      const col = { Open: "#e5322d", "In Review": "#f28c28", Closed: "#2e9e44", Void: "#888" }[i.status] || "#e5322d";
      const shape = i.type === "Punch" ? `<rect x="-15" y="-15" width="30" height="30" rx="4" fill="${col}" stroke="#fff" stroke-width="3"/>` : `<circle r="16" fill="${col}" stroke="#fff" stroke-width="3"/>`;
      s += `<g data-issue="${i.id}" class="pin" transform="translate(${i.x} ${i.y})">${shape}<text y="5" font-size="14" font-weight="700" text-anchor="middle" fill="#fff" font-family="Arial">${i.number}</text><title>#${i.number} ${esc(i.title)} (${i.status})</title></g>`;
    }
    if (V.show.photos) for (const p of store.list("photos").filter((p) => p.sheetId === V.sheet.id && p.x != null)) {
      s += `<g data-photo="${p.id}" class="pin" transform="translate(${p.x} ${p.y})"><rect x="-16" y="-12" width="32" height="24" rx="5" fill="#1f6fd1" stroke="#fff" stroke-width="3"/><circle r="6" fill="#fff"/><title>${esc(p.caption || "Photo")}</title></g>`;
    }
    if (V.draft) s += `<g class="draft">${shapeSVG(V.draft, true)}</g>`;
    svg.innerHTML = s;
  }
  // Big round grips: easy to grab with a finger; dragging one shows the magnifier.
  function handles(pts, extra, col = "#1f6fd1") {
    const r = 7 / V.z, R = 24 / V.z;
    return pts.map((p, i) => `<g data-h="${i}"${extra} class="grip"><circle cx="${p[0]}" cy="${p[1]}" r="${R}" fill="transparent"/><circle cx="${p[0]}" cy="${p[1]}" r="${r}" fill="#fff" stroke="${col}" stroke-width="${2.5 / V.z}"/></g>`).join("");
  }
  function selBox(m) {
    const P = m.points || []; if (!P.length) return "";
    let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
    for (const [x, y] of P) { x1 = Math.min(x1, x); y1 = Math.min(y1, y); x2 = Math.max(x2, x); y2 = Math.max(y2, y); }
    if (m.type === "text" || m.type === "stamp") { x2 = x1 + 200; y1 -= 30; y2 += 10; }
    return `<rect x="${x1 - 10}" y="${y1 - 10}" width="${x2 - x1 + 20}" height="${y2 - y1 + 20}" fill="none" stroke="#1f6fd1" stroke-width="2" stroke-dasharray="6 4"/>`;
  }

  function select(id) { V.selected = id; renderOverlay(); renderSide(); }

  function followLink(sheetId, url) {
    if (url && !sheetId) { window.open(url, "_blank", "noopener"); return; }
    store.event("hyperlink_follow", { from: V.sheet.id, to: sheetId });
    location.hash = `#/sheet/${sheetId}`;
  }

  /* ================= side panel ================= */
  function renderSide() {
    if (!V) return;
    const el = $("#sidePanel", V.root); if (!el) return;
    const tabs = [["markups", "Markups"], ["issues", "Issues"], ["info", "Info"]];
    let body = "";
    const sel = V.selected && store.find("markups", V.selected);
    if (sel) {
      body += `<div class="card sel-card"><h3>Selected: ${esc(sel.type)}</h3>
        <p class="muted">By ${esc(sel.createdBy)} • ${PT.util.fmtDateTime(sel.createdAt)}</p>
        ${sel.value != null ? `<p><b>${sel.type === "area" ? sel.value.toFixed(1) + " SF" : ftIn(sel.value)}</b></p>` : ""}
        ${EDITABLE.includes(sel.type) ? `<p class="muted small">Drag the round grips on the sheet to move an end point or corner.</p>` : ""}
        ${sel.type === "count" ? `<p><b>${sel.points.length}</b> ${esc(sel.label || "items")}</p>` : ""}
        <label>Layer <select id="selLayer">${options(LAYERS, sel.layer)}</select></label>
        <div class="swatches">${COLORS.map((c) => `<button class="swatch ${c === sel.color ? "on" : ""}" data-c="${c}" style="background:${c}"></button>`).join("")}</div>
        ${["text"].includes(sel.type) ? `<label>Text <textarea id="selText" rows="2">${esc(sel.text)}</textarea></label>` : ""}
        ${sel.type === "count" ? `<label>Label <input id="selLabel" value="${esc(sel.label || "")}"></label>` : ""}
        <div class="row gap">
          ${sel.layer === "personal" ? `<button class="btn btn-primary btn-sm" id="selPublish">Publish</button>` : ""}
          ${sel.type === "link" ? `<button class="btn btn-sm" id="selGo">Open link</button>` : ""}
          <button class="btn btn-sm" id="selIssue">Create issue here</button>
          <button class="btn btn-sm btn-danger" id="selDel">Delete</button>
        </div></div>`;
    }
    body += `<div class="tabs">${tabs.map(([k, l]) => `<button class="tab ${V.sideTab === k ? "on" : ""}" data-tab="${k}">${l}</button>`).join("")}</div>`;
    if (V.sideTab === "markups") {
      body += `<div class="layer-toggles">${[...LAYERS, ["issues", "Issues"], ["photos", "Photos"], ["links", "Links"]].map(([k, l]) => `<label class="check"><input type="checkbox" data-show="${k}" ${V.show[k] !== false ? "checked" : ""}> ${l}</label>`).join("")}</div>`;
      const ms = store.list("markups").filter((m) => m.sheetId === V.sheet.id);
      body += ms.length ? `<ul class="mk-list">${ms.map((m) => `<li data-mk="${m.id}" class="${m.id === V.selected ? "on" : ""}"><span class="dot" style="background:${m.color}"></span>${esc(m.type)}${m.type === "count" ? ` (${m.points.length})` : ""}${m.value != null ? ` – ${m.type === "area" ? m.value.toFixed(0) + " SF" : ftIn(m.value)}` : ""} <span class="badge b-${m.layer}">${m.layer}</span></li>`).join("")}</ul>`
        : `<p class="muted">No markups yet. Pick a tool on the left and draw on the sheet.</p>`;
      const pers = ms.filter((m) => m.layer === "personal").length;
      if (pers) body += `<button class="btn btn-sm" id="publishAll">Publish all ${pers} personal markups</button>`;
    } else if (V.sideTab === "issues") {
      const iss = store.list("issues").filter((i) => i.sheetId === V.sheet.id);
      body += `<button class="btn btn-sm btn-primary" id="sideNewIssue">+ Issue (then click sheet)</button>`;
      body += iss.length ? `<ul class="mk-list">${iss.map((i) => `<li data-iss="${i.id}"><span class="dot st-${i.status.replace(/ /g, "")}"></span>#${i.number} ${esc(i.title)} <span class="badge">${esc(i.type)}</span></li>`).join("")}</ul>` : `<p class="muted">No issues on this sheet.</p>`;
    } else {
      body += `<dl class="info">
        <dt>Sheet</dt><dd>${esc(V.sheet.number)} – ${esc(V.sheet.title)}</dd>
        <dt>Discipline</dt><dd>${esc(V.sheet.discipline || "")}</dd>
        <dt>Viewing</dt><dd>Rev ${esc(V.ver.rev)} (${esc(V.ver.set || "")}) ${V.verIdx !== V.sheet.current ? `<b class="warn-text">– NOT the current version</b>` : ""}</dd>
        <dt>Scale</dt><dd>${V.ver.scalePxPerFt ? `${esc(scaleText(V.ver))} ${V.ver.userCalibrated ? "(calibrated by user)" : "(from drawing)"}` : "<b class='warn-text'>Not set – use Calibrate</b>"}</dd>
        <dt>Tags</dt><dd>${(V.sheet.tags || []).map((t) => `<span class="badge">${esc(t)}</span>`).join(" ") || "—"}</dd>
      </dl>
      <div class="row gap"><button class="btn btn-sm" id="calBtn">⇔ Calibrate</button><button class="btn btn-sm" id="tagBtn">Edit tags</button><button class="btn btn-sm" id="newVerBtn">Upload new version</button></div>
      <h4>Version history</h4>
      <ul class="mk-list">${V.sheet.versions.map((v, k) => `<li data-ver="${k}" class="${k === V.verIdx ? "on" : ""}">Rev ${esc(v.rev)} – ${esc(v.set || "")} <span class="muted">${esc(v.date)}</span></li>`).join("")}</ul>
      <h4>Keyboard shortcuts</h4>
      <p class="muted small">${TOOLS.filter((t) => !t.sep).map((t) => `<kbd>${t.key.toUpperCase()}</kbd> ${esc(t.label.split(" (")[0])}`).join(" · ")} · <kbd>Space</kbd>+drag pan · <kbd>Del</kbd> delete · <kbd>Ctrl+Z</kbd> undo · <kbd>0</kbd> fit</p>`;
    }
    el.innerHTML = body;

    // wire up
    $$(".tab", el).forEach((b) => (b.onclick = () => { V.sideTab = b.dataset.tab; renderSide(); }));
    $$("[data-show]", el).forEach((c) => (c.onchange = () => { V.show[c.dataset.show] = c.checked; renderOverlay(); }));
    $$("[data-mk]", el).forEach((li) => (li.onclick = () => { const m = store.find("markups", li.dataset.mk); select(m.id); if (m.points?.[0]) focusOn(m.points[0][0], m.points[0][1], Math.max(V.z, 0.9)); }));
    $$("[data-iss]", el).forEach((li) => (li.onclick = () => { const i = store.find("issues", li.dataset.iss); focusOn(i.x, i.y, Math.max(V.z, 0.9)); PT.views.issueForm(i); }));
    $$("[data-ver]", el).forEach((li) => (li.onclick = () => (location.hash = `#/sheet/${V.sheet.id}/v/${li.dataset.ver}`)));
    const q = (id) => $("#" + id, el);
    q("publishAll") && (q("publishAll").onclick = () => {
      store.list("markups").filter((m) => m.sheetId === V.sheet.id && m.layer === "personal").forEach((m) => (m.layer = "published"));
      store.log(`Published markups on ${V.sheet.number}`); store.event("publish", { sheetId: V.sheet.id }); renderOverlay(); renderSide(); toast("Markups published to the team", "ok");
    });
    q("sideNewIssue") && (q("sideNewIssue").onclick = () => setTool("issue"));
    q("calBtn") && (q("calBtn").onclick = () => setTool("calibrate"));
    q("tagBtn") && (q("tagBtn").onclick = () => modal({ title: "Sheet tags", body: `<label>Tags (comma separated) <input name="tags" value="${esc((V.sheet.tags || []).join(", "))}" placeholder="rough-in, level 1, lab"></label>`, onSubmit: (f) => { store.update("sheets", V.sheet.id, { tags: f.tags.split(",").map((s) => s.trim()).filter(Boolean) }, `Tagged ${V.sheet.number}`); renderSide(); } }));
    q("newVerBtn") && (q("newVerBtn").onclick = () => PT.views.uploadSheets(V.sheet));
    if (sel) {
      q("selLayer").onchange = (e) => { pushUndo({ kind: "modify", id: sel.id, before: { ...sel } }); sel.layer = e.target.value; if (sel.layer === "published") store.event("publish", { sheetId: V.sheet.id }); store.emit(); renderOverlay(); renderSide(); };
      $$(".sel-card .swatch", el).forEach((s) => (s.onclick = () => { pushUndo({ kind: "modify", id: sel.id, before: { ...sel } }); sel.color = s.dataset.c; store.emit(); renderOverlay(); renderSide(); }));
      q("selText") && (q("selText").onchange = (e) => { pushUndo({ kind: "modify", id: sel.id, before: { ...sel } }); sel.text = e.target.value; store.emit(); renderOverlay(); });
      q("selLabel") && (q("selLabel").onchange = (e) => { sel.label = e.target.value; store.emit(); renderOverlay(); });
      q("selPublish") && (q("selPublish").onclick = () => { pushUndo({ kind: "modify", id: sel.id, before: { ...sel } }); sel.layer = "published"; store.log(`Published ${sel.type} on ${V.sheet.number}`); store.event("publish", { sheetId: V.sheet.id }); renderOverlay(); renderSide(); toast("Published", "ok"); });
      q("selGo") && (q("selGo").onclick = () => followLink(sel.target, sel.url));
      q("selIssue").onclick = () => { const p = sel.points[0]; PT.views.issueForm(null, { sheetId: V.sheet.id, x: p[0], y: p[1] }); };
      q("selDel").onclick = () => deleteMarkup(sel.id);
    }
  }

  /* ================= compare ================= */
  function loadImg(src) { return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; }); }

  async function overlayCompare(oldVer, newVer) {
    const w = newVer.w, h = newVer.h;
    const [a, b] = await Promise.all([loadImg(srcOf(oldVer)), loadImg(srcOf(newVer))]);
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const ctx = c.getContext("2d");
    const grab = (img) => { ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, w, h); ctx.drawImage(img, 0, 0, w, h); return ctx.getImageData(0, 0, w, h); };
    const A = grab(a), B = grab(b), out = ctx.createImageData(w, h);
    for (let i = 0; i < A.data.length; i += 4) {
      const la = (A.data[i] + A.data[i + 1] + A.data[i + 2]) / 3, lb = (B.data[i] + B.data[i + 1] + B.data[i + 2]) / 3;
      const da = la < 170, db = lb < 170;
      let r = 255, g = 255, bl = 255;
      if (da && db) { r = g = bl = 150; } else if (da) { r = 225; g = 30; bl = 30; } else if (db) { r = 20; g = 90; bl = 235; }
      out.data[i] = r; out.data[i + 1] = g; out.data[i + 2] = bl; out.data[i + 3] = 255;
    }
    ctx.putImageData(out, 0, 0);
    return c.toDataURL("image/png");
  }

  function openCompare() {
    if (V.compare) { // exit compare
      V.compare = null; $("#sheetImg", V.root).src = srcOf(V.ver); $("#cmpLegend", V.root).classList.add("hidden"); $("#cmpBtn", V.root).classList.remove("active"); return;
    }
    const others = V.sheet.versions.map((v, k) => [k, v]).filter(([k]) => k !== V.verIdx);
    modal({
      title: "Compare versions",
      body: `<p>Overlay shows what changed between two versions of <b>${esc(V.sheet.number)}</b>.</p>
        <label>Compare current view (Rev ${esc(V.ver.rev)}) with <select name="other">${others.map(([k, v]) => `<option value="${k}">Rev ${esc(v.rev)} – ${esc(v.set || "")}</option>`).join("")}</select></label>`,
      submitLabel: "Compare",
      onSubmit: async (f) => {
        const other = V.sheet.versions[+f.other];
        const [older, newer] = +f.other < V.verIdx ? [other, V.ver] : [V.ver, other];
        toast("Building overlay…");
        try {
          const url = await overlayCompare(older, newer);
          V.compare = { url }; $("#sheetImg", V.root).src = url; $("#cmpBtn", V.root).classList.add("active");
          const lg = $("#cmpLegend", V.root); lg.classList.remove("hidden");
          lg.innerHTML = `<b>Overlay</b> <span class="lg red">■ Removed (Rev ${esc(older.rev)} only)</span> <span class="lg blue">■ Added (Rev ${esc(newer.rev)} only)</span> <span class="lg gray">■ Unchanged</span> <button class="btn btn-sm" id="cmpExit">Exit compare</button>`;
          $("#cmpExit", lg).onclick = openCompare;
          store.event("compare", { sheetId: V.sheet.id }); store.log(`Compared ${V.sheet.number} Rev ${older.rev} ↔ Rev ${newer.rev}`);
        } catch (e) { console.error(e); toast("Could not compare these images", "warn"); }
      },
    });
  }

  /* ================= export ================= */
  async function exportPNG() {
    const w = V.ver.w, hh = V.ver.h;
    const c = document.createElement("canvas"); c.width = w; c.height = hh;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, w, hh);
    ctx.drawImage(await loadImg($("#sheetImg", V.root).src), 0, 0, w, hh);
    const svg = $("#overlay", V.root).cloneNode(true);
    svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(new XMLSerializer().serializeToString(svg));
    try { ctx.drawImage(await loadImg(url), 0, 0, w, hh); } catch (e) { console.warn(e); }
    c.toBlob((b) => { download(`${V.sheet.number}_Rev${V.ver.rev}_markups.png`, b); store.event("export", { what: "sheet_png" }); });
  }

  return { open, refresh: () => { if (V && document.contains(V.root) && $("#overlay", V.root)) { renderOverlay(); renderSide(); } }, current: () => V, measureValue };
})();
