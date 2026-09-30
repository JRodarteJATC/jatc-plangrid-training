/* Router + app chrome. */
PT.app = (() => {
  const { esc, $, $$ } = PT.util;
  const store = PT.store;

  const NAV = [
    ["", "🏠", "Home"], ["sheets", "🗺", "Sheets"], ["issues", "⚠", "Issues & Tasks"], ["punch", "✅", "Punch List"],
    ["rfis", "❓", "RFIs"], ["submittals", "📦", "Submittals"], ["photos", "📷", "Photos"], ["reports", "📝", "Daily Reports & Time Sheets"],
    ["documents", "📁", "Documents & Specs"], ["team", "👷", "Team"], ["teamproject", "👥", "Team Project"], ["activity", "🕑", "Activity"],
    ["training", "🎓", "Training Missions"], ["quizzes", "✏️", "Quizzes & Worksheets"], ["help", "❔", "Help"], ["settings", "⚙", "Settings"],
  ];

  function renderChrome() {
    const s = store.get(), p = store.project();
    const openIss = store.list("issues").filter((i) => i.status === "Open" || i.status === "In Review");
    const counts = { issues: openIss.filter((i) => i.type !== "Punch").length, punch: openIss.filter((i) => i.type === "Punch").length, rfis: store.list("rfis").filter((r) => r.status === "Open").length, training: PT.training.progress() + "%" };
    // project switcher: apprentices can always get back to their other projects (sample, team, practice plans…)
    const pn = $("#projName");
    if ((s.projects || []).length > 1) {
      pn.innerHTML = `<select id="projSel" title="Switch project" aria-label="Switch project">${s.projects.map((x) => `<option value="${x.id}" ${x.id === s.activeProjectId ? "selected" : ""}>${x.team ? "👥 " : ""}${PT.util.esc(x.name)}</option>`).join("")}</select>`;
      $("#projSel").onchange = (e) => { s.activeProjectId = e.target.value; store.emit(); renderChrome(); location.hash = "#/"; route(); PT.util.toast("Switched to " + store.project().name, "ok"); };
    } else pn.textContent = p ? p.name : "";
    $("#userChip").textContent = PT.util.initials(s.user.name);
    $("#userChip").title = s.user.name;
    $("#nav").innerHTML = NAV.map(([r, i, l]) => `<a href="#/${r}" data-r="${r}"><span class="ni">${i}</span><span class="nl">${l}</span>${counts[r] ? `<span class="count">${counts[r]}</span>` : ""}</a>`).join("");
    highlightNav();
  }
  function highlightNav() {
    const r = (location.hash.replace(/^#\/?/, "").split("/")[0]) || "";
    const key = r === "sheet" ? "sheets" : r === "quiz" ? "quizzes" : r;
    $$("#nav a").forEach((a) => a.classList.toggle("on", a.dataset.r === key));
  }

  function help(root) {
    root.innerHTML = `<div class="page-head"><h1>Help & Quick Reference</h1></div>
      <div class="grid2">
      <section class="card"><h2>What is this?</h2>
        <p><b>Plan Room Trainer</b> is a practice version of construction plan-management apps like PlanGrid / Autodesk Build, Procore Drawings, Fieldwire and Bluebeam. It uses a fictional drawing set so apprentices can learn the workflow without touching a real project.</p>
        <p>Everything is saved <b>in this browser only</b>. Use Settings → Export backup to hand work in or move to another computer.</p>
        <p>Lessons, labs and quizzes are in the <code>docs/</code> folder of the GitHub repository.</p></section>
      <section class="card"><h2>Sheet viewer shortcuts</h2>
        <table class="tbl"><tbody>
        <tr><td><kbd>V</kbd></td><td>Select / pan</td><td><kbd>M</kbd></td><td>Measure length</td></tr>
        <tr><td><kbd>P</kbd></td><td>Pen</td><td><kbd>U</kbd></td><td>Measure path</td></tr>
        <tr><td><kbd>H</kbd></td><td>Highlighter</td><td><kbd>G</kbd></td><td>Measure area</td></tr>
        <tr><td><kbd>L</kbd>/<kbd>A</kbd></td><td>Line / Arrow</td><td><kbd>N</kbd></td><td>Count</td></tr>
        <tr><td><kbd>R</kbd>/<kbd>E</kbd></td><td>Rectangle / Ellipse</td><td><kbd>K</kbd></td><td>Calibrate</td></tr>
        <tr><td><kbd>C</kbd></td><td>Revision cloud</td><td><kbd>I</kbd></td><td>Issue pin</td></tr>
        <tr><td><kbd>T</kbd>/<kbd>S</kbd></td><td>Text / Stamp</td><td><kbd>O</kbd></td><td>Photo pin</td></tr>
        <tr><td><kbd>Y</kbd></td><td>Hyperlink</td><td><kbd>Del</kbd></td><td>Delete selected</td></tr>
        <tr><td><kbd>Ctrl+Z</kbd></td><td>Undo</td><td><kbd>0</kbd></td><td>Fit sheet</td></tr>
        <tr><td><kbd>Space</kbd>+drag</td><td>Pan with any tool</td><td>Wheel / pinch</td><td>Zoom</td></tr>
        </tbody></table></section>
      <section class="card"><h2>Layers</h2><ul>
        <li><b>Personal</b> – only you see it. Use for your own notes and takeoffs.</li>
        <li><b>Published</b> – shared with the whole project team.</li>
        <li><b>As-Built</b> – dashed lines recording what was actually installed. Turned over to the owner at closeout.</li></ul></section>
      <section class="card"><h2>Pin colors</h2><ul>
        <li><span class="dot st-Open"></span> Open</li><li><span class="dot st-InReview"></span> In Review</li><li><span class="dot st-Closed"></span> Closed</li>
        <li>Circle = issue, square = punch item, blue = photo</li></ul></section>
      </div>`;
  }

  function route() {
    const main = $("#main");
    const parts = location.hash.replace(/^#\/?/, "").split("/").map(decodeURIComponent);
    const [r, a, b, c, d] = parts;
    document.body.classList.toggle("viewer-mode", r === "sheet");
    document.body.classList.remove("nav-open");
    document.querySelectorAll(".modal-backdrop").forEach((m) => m.remove());
    highlightNav();
    const V = PT.views;
    const table = {
      "": V.dashboard, sheets: V.sheets, issues: V.issues, punch: V.punch, rfis: V.rfis, submittals: V.submittals, photos: V.photos,
      reports: V.reports, documents: V.documents, quizzes: PT.quizzes.list, team: V.team, activity: V.activity, settings: V.settings, training: PT.training.view, teamproject: PT.team.page, help,
    };
    if (r === "sheet") {
      const opts = {};
      if (b === "v") opts.version = +c;
      if (b === "at") opts.focus = { x: +c, y: +d };
      PT.viewer.open(main, a, opts);
      return;
    }
    if (r === "search") return V.search(main, a);
    if (r === "quiz") return PT.quizzes.take(main, a);
    (table[r] || V.dashboard)(main);
    main.scrollTop = 0;
  }

  let rerenderTimer = null;
  function onStoreChange() {
    if (PT.training.evaluate()) { store.emit(); return; }
    renderChrome();
    clearTimeout(rerenderTimer);
    rerenderTimer = setTimeout(() => {
      if (location.hash.startsWith("#/sheet/")) return PT.viewer.refresh();
      if (document.querySelector(".modal-backdrop")) return;
      const ae = document.activeElement;
      if (ae && ae.closest && ae.closest("#main") && ae.matches("input,textarea,select")) return;
      route();
    }, 30);
  }

  async function start() {
    await store.init();
    renderChrome();
    PT.team.live.resume();
    PT.rfiLive && PT.rfiLive.startApprentice();
    store.onChange(onStoreChange);
    window.addEventListener("hashchange", route);
    $("#searchForm").onsubmit = (e) => { e.preventDefault(); const q = $("#searchInput").value.trim(); if (q) { location.hash = "#/search/" + encodeURIComponent(q); store.event("search", { q: q.toLowerCase() }); } };
    $("#menuBtn").onclick = () => document.body.classList.toggle("nav-open");
    $("#userChip").onclick = () => (location.hash = "#/settings");
    route();
    if (store.get().user.name === "Apprentice" && !store.get().events.length) {
      setTimeout(() => PT.util.toast("Welcome! Start with Training Missions, or set your name in Settings."), 600);
    }
  }

  return { start, route, renderChrome };
})();

document.addEventListener("DOMContentLoaded", PT.app.start);
