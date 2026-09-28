/* Shared helpers. Everything hangs off the global PT namespace so the app
   runs by double-clicking index.html (no build step, no server required). */
window.PT = window.PT || {};

PT.util = (() => {
  const uid = (p = "id") => p + "_" + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);

  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const today = () => new Date().toISOString().slice(0, 10);
  const nowIso = () => new Date().toISOString();
  const fmtDate = (iso) => (iso ? new Date(iso.length === 10 ? iso + "T12:00:00" : iso).toLocaleDateString() : "—");
  const fmtDateTime = (iso) => (iso ? new Date(iso).toLocaleString([], { dateStyle: "short", timeStyle: "short" }) : "—");

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function h(html) {
    const t = document.createElement("template");
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }

  function toast(msg, kind = "info") {
    const el = h(`<div class="toast toast-${kind}">${esc(msg)}</div>`);
    const box = $("#toasts");
    while (box.children.length >= 4) box.firstElementChild.remove();
    box.appendChild(el);
    setTimeout(() => el.classList.add("show"), 10);
    setTimeout(() => { el.classList.remove("show"); setTimeout(() => el.remove(), 300); }, 3200);
  }

  /* Modal dialog. `body` is HTML; returns {el, close}. onSubmit receives FormData-as-object. */
  function modal({ title, body, submitLabel = "Save", onSubmit, wide = false, cancelLabel = "Cancel", extraButtons = "" }) {
    const el = h(`
      <div class="modal-backdrop">
        <form class="modal ${wide ? "modal-wide" : ""}" novalidate>
          <header><h2>${esc(title)}</h2><button type="button" class="icon-btn" data-close aria-label="Close">✕</button></header>
          <div class="modal-body">${body}</div>
          <footer>
            ${extraButtons}
            <span class="spacer"></span>
            <button type="button" class="btn" data-close>${esc(cancelLabel)}</button>
            ${onSubmit ? `<button type="submit" class="btn btn-primary">${esc(submitLabel)}</button>` : ""}
          </footer>
        </form>
      </div>`);
    const close = () => el.remove();
    el.addEventListener("click", (e) => { if (e.target === el || e.target.closest("[data-close]")) close(); });
    el.querySelector("form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const form = e.target;
      for (const req of $$("[required]", form)) {
        if (!req.value.trim()) { req.focus(); toast("Please fill in: " + (req.dataset.label || req.name), "warn"); return; }
      }
      const data = {};
      new FormData(form).forEach((v, k) => {
        if (data[k] !== undefined) data[k] = [].concat(data[k], v); else data[k] = v;
      });
      const keep = onSubmit ? await onSubmit(data, form) : null;
      if (keep !== false) close();
    });
    document.body.appendChild(el);
    const first = el.querySelector("input:not([type=hidden]),select,textarea");
    if (first) setTimeout(() => { if (!el.contains(document.activeElement)) first.focus(); }, 30); // don't steal focus from a field already being typed in
    return { el, close };
  }

  function confirmBox(message, onYes, yesLabel = "Yes") {
    modal({ title: "Please confirm", body: `<p>${esc(message)}</p>`, submitLabel: yesLabel, onSubmit: () => onYes() });
  }

  const options = (list, selected) =>
    list.map((o) => {
      const [v, l] = Array.isArray(o) ? o : [o, o];
      return `<option value="${esc(v)}" ${String(v) === String(selected ?? "") ? "selected" : ""}>${esc(l)}</option>`;
    }).join("");

  function download(filename, content, mime = "text/plain") {
    const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  function toCSV(rows) {
    if (!rows.length) return "";
    const cols = Object.keys(rows[0]);
    const cell = (v) => { const s = String(v ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    return [cols.join(","), ...rows.map((r) => cols.map((c) => cell(r[c])).join(","))].join("\n");
  }

  const readFileAsDataURL = (file) => new Promise((res, rej) => {
    const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file);
  });

  /* Shrink photos so the browser database stays small. */
  function shrinkImage(dataUrl, max = 1400, quality = 0.8) {
    return new Promise((res) => {
      const img = new Image();
      img.onload = () => {
        const s = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        res({ dataUrl: c.toDataURL("image/jpeg", quality), width: c.width, height: c.height });
      };
      img.onerror = () => res({ dataUrl, width: 0, height: 0 });
      img.src = dataUrl;
    });
  }

  /* Feet (decimal) -> 12'-6" style */
  function ftIn(feet) {
    const neg = feet < 0; feet = Math.abs(feet);
    let ft = Math.floor(feet); let inch = Math.round((feet - ft) * 12);
    if (inch === 12) { ft += 1; inch = 0; }
    return (neg ? "-" : "") + `${ft}'-${inch}"`;
  }

  /* Parse 12'-6", 12' 6", 12.5, 150" into decimal feet */
  function parseFtIn(str) {
    str = String(str).trim();
    let m = str.match(/^(\d+(?:\.\d+)?)\s*'\s*-?\s*(\d+(?:\.\d+)?)?\s*"?$/);
    if (m) return parseFloat(m[1]) + (m[2] ? parseFloat(m[2]) / 12 : 0);
    m = str.match(/^(\d+(?:\.\d+)?)\s*"$/);
    if (m) return parseFloat(m[1]) / 12;
    const n = parseFloat(str);
    return isNaN(n) ? null : n;
  }

  const initials = (name) => String(name || "?").split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  /* Class options from the JATC standards, Exhibit C – Curriculum Outline (revised 2016).
     This course is taught in the specs / blueprint weeks, listed first. */
  const CLASS_WEEKS = {
    "Specs & blueprint weeks (this course)": [
      "Week 3A – Advanced Specs, Blueprints & Details",
      "Week 3B – Roofing Specs & Details",
      "Week 3C – Waterproofing Specs & Details",
      "Week 2B – Single Ply Systems (Plans & Specs)",
      "Week 4B – Service & Blueprints",
    ],
    "Other Exhibit C weeks": [
      "Week 1A – Introduction to the Trade",
      "Week 1B – Intro to Roofing/Waterproofing Systems, OSHA 10, First Aid/CPR",
      "Week 2A – Built-Up Systems",
      "Week 2C – Steep Roofing",
      "Week 2D – Waterproofing",
      "Week 4A – Leadership & Project Management",
      "Option 4C – OSHA 30 Plus",
    ],
    "Other": ["Journeyman", "Instructor"],
  };
  const DEFAULT_CLASS = "Week 3A – Advanced Specs, Blueprints & Details";
  const classOptions = (sel) => Object.entries(CLASS_WEEKS).map(([g, list]) =>
    `<optgroup label="${esc(g)}">${list.map((v) => `<option ${v === sel ? "selected" : ""}>${esc(v)}</option>`).join("")}</optgroup>`).join("");

  return { CLASS_WEEKS, DEFAULT_CLASS, classOptions, uid, esc, today, nowIso, fmtDate, fmtDateTime, $, $$, h, toast, modal, confirmBox, options, download, toCSV, readFileAsDataURL, shrinkImage, ftIn, parseFtIn, initials };
})();
