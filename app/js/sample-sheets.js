/* Generates the sample ROOFING & WATERPROOFING drawing set as SVG.
   Sheet = 1800 x 1200 units (36" x 24" sheet @ 50 units per inch).
   Plan scale 1/4" = 1'-0"  ->  12.5 units per foot.                  */
PT.samples = (() => {
  const W = 1800, H = 1200;
  const S = 12.5, OX = 150, OY = 230;
  const X = (f) => OX + f * S, Y = (f) => OY + f * S;
  const PROJECT = "CENTRAL VALLEY TRAINING CENTER – BLDG B";

  /* ---------- primitives ---------- */
  const xesc = (s) => String(s).replace(/&(?![a-z#0-9]+;)/gi, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const t = (x, y, s, size = 14, extra = "") =>
    `<text x="${x}" y="${y}" font-size="${size}" ${extra}>${xesc(s)}</text>`;
  const line = (x1, y1, x2, y2, w = 1.5, extra = "") =>
    `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#111" stroke-width="${w}" ${extra}/>`;
  const rect = (x, y, w, h, sw = 1.5, fill = "none", extra = "") =>
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" stroke="#111" stroke-width="${sw}" fill="${fill}" ${extra}/>`;
  const circ = (cx, cy, r, sw = 1.5, fill = "none") =>
    `<circle cx="${cx}" cy="${cy}" r="${r}" stroke="#111" stroke-width="${sw}" fill="${fill}"/>`;

  function frame(number, title, scale, revs = [], sheetDate = "08/15/2026") {
    const tbx = 1530;
    const revRows = revs.map((r, i) =>
      `${t(tbx + 12, 842 + i * 22, r.n, 12)}${t(tbx + 40, 842 + i * 22, r.date, 12)}${t(tbx + 120, 842 + i * 22, r.desc, 12)}`).join("");
    return `
      ${rect(20, 20, W - 40, H - 40, 4)}
      ${rect(tbx, 20, W - 20 - tbx, H - 40, 3)}
      ${t(tbx + 125, 70, "CENTRAL VALLEY", 22, 'text-anchor="middle" font-weight="700"')}
      ${t(tbx + 125, 95, "ROOFERS & WATERPROOFERS", 16, 'text-anchor="middle"')}
      ${t(tbx + 125, 116, "PRACTICE DRAWING SET", 13, 'text-anchor="middle" fill="#a00"')}
      ${line(tbx, 135, W - 20, 135, 2)}
      ${t(tbx + 12, 160, "PROJECT:", 11)}
      ${t(tbx + 12, 182, "CENTRAL VALLEY", 15, 'font-weight="700"')}
      ${t(tbx + 12, 202, "TRAINING CENTER – BLDG B", 15, 'font-weight="700"')}
      ${t(tbx + 12, 222, "1234 EXAMPLE AVE, FRESNO CA", 11)}
      ${line(tbx, 240, W - 20, 240, 2)}
      ${t(tbx + 12, 262, "ARCHITECT OF RECORD:", 11)}
      ${t(tbx + 12, 282, "SAMPLE ARCHITECTS INC.", 13)}
      ${t(tbx + 12, 300, "(FICTITIOUS – FOR TRAINING)", 11)}
      ${line(tbx, 320, W - 20, 320, 2)}
      ${t(tbx + 125, 360, "NOT FOR CONSTRUCTION", 16, 'text-anchor="middle" fill="#a00" font-weight="700"')}
      ${line(tbx, 800, W - 20, 800, 2)}
      ${t(tbx + 12, 820, "REVISIONS", 12, 'font-weight="700"')}
      ${revRows}
      ${line(tbx, 930, W - 20, 930, 2)}
      ${t(tbx + 12, 950, "SHEET TITLE:", 11)}
      ${t(tbx + 12, 975, title.split("|")[0], 16, 'font-weight="700"')}
      ${title.split("|")[1] ? t(tbx + 12, 996, title.split("|")[1], 16, 'font-weight="700"') : ""}
      ${t(tbx + 12, 1022, "SCALE: " + scale, 12)}
      ${t(tbx + 12, 1040, "DATE: " + sheetDate, 12)}
      ${line(tbx, 1055, W - 20, 1055, 2)}
      ${t(tbx + 12, 1075, "SHEET NUMBER:", 11)}
      ${t(tbx + 125, 1150, number, 58, 'text-anchor="middle" font-weight="700"')}
    `;
  }

  function northArrow(x, y) {
    return `<g>${circ(x, y, 28, 2)}<path d="M${x} ${y - 26} L${x + 12} ${y + 16} L${x} ${y + 8} L${x - 12} ${y + 16} Z" fill="#111"/>${t(x, y - 34, "N", 18, 'text-anchor="middle" font-weight="700"')}</g>`;
  }

  function drawingTitle(x, y, num, name, scale) {
    return `${circ(x, y, 22, 2)}${line(x - 22, y, x + 22, y, 1.5)}${t(x, y - 5, num, 14, 'text-anchor="middle" font-weight="700"')}
      ${t(x, y + 16, "", 11, 'text-anchor="middle"')}
      ${t(x + 34, y + 2, name, 20, 'font-weight="700"')}${line(x + 34, y + 10, x + 34 + name.length * 12.5, y + 10, 2)}
      ${t(x + 34, y + 28, "SCALE: " + scale, 13)}
      ${unitsPerFt(scale) ? scaleBar(x + 210, y + 18, unitsPerFt(scale), BAR_PARTS[unitsPerFt(scale)]) : ""}`;
  }

  /* Graphic scale (scale bar). Sheet = 50 units per paper inch, so a scale of N" = 1'-0" is 50·N units per foot.
     The bar is drawn from the same number the sheet is printed at, so measuring the bar always matches the text. */
  const PPI = 50;
  function unitsPerFt(scale) {
    const m = /^\s*(?:(\d+)-)?(\d+)(?:\/(\d+))?"\s*=\s*1'-0"/.exec(scale);
    if (!m) return null;
    const inch = (+m[1] || 0) + (m[3] ? +m[2] / +m[3] : +m[2]);
    return PPI * inch;
  }
  const fmtLen = (ft) => ft >= 1 ? `${+ft.toFixed(2)}'` : `${Math.round(ft * 12)}"`;
  function scaleBar(x, y, upf, parts) {
    // parts: tick positions in feet, e.g. [0, 4, 8, 16]
    const L = parts[parts.length - 1] * upf, hgt = 8;
    let g = "";
    for (let i = 0; i < parts.length - 1; i++) {
      const a = x + parts[i] * upf, b = x + parts[i + 1] * upf;
      g += `<rect x="${a}" y="${y}" width="${b - a}" height="${hgt}" fill="${i % 2 ? "#fff" : "#111"}" stroke="#111" stroke-width="1"/>`;
    }
    g += parts.map((f) => t(x + f * upf, y + hgt + 13, fmtLen(f).replace(/^0'$|^0"$/, "0"), 10, 'text-anchor="middle"')).join("");
    return `<g class="graphic-scale">${g}${t(x + L + 8, y + hgt, "FEET", 9)}</g>`;
  }
  const BAR_PARTS = { 12.5: [0, 4, 8, 16], 25: [0, 2, 4, 8], 37.5: [0, 1, 2, 4], 50: [0, 1, 2, 3], 75: [0, 0.5, 1, 2], 150: [0, 0.25, 0.5, 1] };

  /* Detail / section callout bubble that links to another sheet. */
  function callout(x, y, detail, sheet) {
    return `${circ(x, y, 26, 2, "#fff")}${line(x - 26, y, x + 26, y, 1.5)}${t(x, y - 6, detail, 15, 'text-anchor="middle" font-weight="700"')}${t(x, y + 18, sheet, 13, 'text-anchor="middle"')}`;
  }

  function cloud(x, y, w, h) {
    // revision cloud around a box (sheet units)
    const r = 14; let d = `M${x} ${y}`;
    for (let i = x; i < x + w; i += r * 2) d += ` a${r} ${r} 0 0 1 ${r * 2} 0`;
    for (let i = y; i < y + h; i += r * 2) d += ` a${r} ${r} 0 0 1 0 ${r * 2}`;
    for (let i = x + w; i > x; i -= r * 2) d += ` a${r} ${r} 0 0 1 ${-r * 2} 0`;
    for (let i = y + h; i > y; i -= r * 2) d += ` a${r} ${r} 0 0 1 0 ${-r * 2}`;
    return `<path d="${d}" fill="none" stroke="#111" stroke-width="2"/>`;
  }
  const delta = (x, y, n) => `<path d="M${x} ${y - 14} L${x + 14} ${y + 10} L${x - 14} ${y + 10} Z" fill="#fff" stroke="#111" stroke-width="2"/>${t(x, y + 6, n, 13, 'text-anchor="middle" font-weight="700"')}`;

  function keynotes(x, y, notes, heading = "KEYED NOTES", sp = 26) {
    return t(x, y, heading, 15, 'font-weight="700" text-decoration="underline"') +
      notes.map((n, i) => `${circ(x + 10, y + 24 + i * sp, 9)}${t(x + 10, y + 28 + i * sp, i + 1, 11, 'text-anchor="middle"')}${t(x + 26, y + 28 + i * sp, n, 12)}`).join("");
  }

  const defs = `<defs><pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="#111" stroke-width="1.5"/></pattern></defs>`;
  const wrap = (inner) =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="Arial, Helvetica, sans-serif" fill="#111">${defs}<rect width="${W}" height="${H}" fill="#fff"/>${inner}</svg>`;

  /* ---------- roofing symbols ---------- */
  const lbl = (x1, y1, x2, y2, s, size = 13, anchor) => {
    const a = anchor || (x2 >= x1 ? "start" : "end");
    const tw = String(s).length * size * 0.62;
    const lx = a === "start" && x1 > x2 + tw ? x2 + tw + 10 : a === "end" && x1 < x2 - tw ? x2 - tw - 10 : x2;
    return line(x1, y1, lx, y2, 1) + `<circle cx="${x1}" cy="${y1}" r="2.5" fill="#111"/>` + t(x2 + (a === "start" ? 4 : -4), y2 + 4, s, size, `text-anchor="${a}"`);
  };
  const roofDrain = (fx, fy, tag) => circ(X(fx), Y(fy), 11, 2, "#fff") + line(X(fx) - 8, Y(fy), X(fx) + 8, Y(fy), 1.5) + line(X(fx), Y(fy) - 8, X(fx), Y(fy) + 8, 1.5) + (tag ? t(X(fx) - 14, Y(fy) - 16, tag, 12, 'font-weight="700"') : "");
  const overflow = (fx, fy, tag) => circ(X(fx), Y(fy), 9, 2, "#fff") + circ(X(fx), Y(fy), 4, 1.5) + (tag ? t(X(fx) + 4, Y(fy) + 24, tag, 11) : "");
  const pipe = (fx, fy) => `<g class="pen">${circ(X(fx), Y(fy), 7, 2, "#fff")}${circ(X(fx), Y(fy), 2.5, 1, "#111")}</g>`;
  const curb = (fx, fy, w, h, tag) => rect(X(fx), Y(fy), w * S, h * S, 2.5, "#fff") + line(X(fx), Y(fy), X(fx + w), Y(fy + h), 1) + line(X(fx + w), Y(fy), X(fx), Y(fy + h), 1) +
    `<rect x="${X(fx + w / 2) - 26}" y="${Y(fy + h / 2) - 9}" width="52" height="18" fill="#fff"/>` + t(X(fx + w / 2), Y(fy + h / 2) + 5, tag, 12, 'text-anchor="middle" font-weight="700"');
  const skylight = (fx, fy, s = 4) => rect(X(fx), Y(fy), s * S, s * S, 2, "#fff") + rect(X(fx) + 6, Y(fy) + 6, s * S - 12, s * S - 12, 1) + t(X(fx + s / 2), Y(fy + s) + 16, "SK-1", 11, 'text-anchor="middle"');
  const hatchBox = (fx, fy, s = 3) => rect(X(fx), Y(fy), s * S, s * S, 2, "url(#hatch)") + t(X(fx), Y(fy + s) + 14, "RH-1", 11);
  const pad = (fx, fy) => `<rect x="${X(fx) - 14}" y="${Y(fy) - 14}" width="28" height="28" fill="none" stroke="#555" stroke-width="1.2" stroke-dasharray="4 3"/>`;
  function padRun(pts) { // walkway pads every 4' along polyline (feet)
    let s = "";
    for (let i = 1; i < pts.length; i++) {
      const [x1, y1] = pts[i - 1], [x2, y2] = pts[i]; const L = Math.hypot(x2 - x1, y2 - y1); const n = Math.floor(L / 4);
      for (let k = 0; k <= n; k++) s += pad(x1 + (x2 - x1) * k / Math.max(n, 1), y1 + (y2 - y1) * k / Math.max(n, 1));
    }
    return s;
  }
  const slope = (fx, fy, dir, label = '1/4":12"') => { // dir 1 = arrow points down (south), -1 = up
    const x = X(fx), y1 = Y(fy), y2 = Y(fy + dir * 8);
    return line(x, y1, x, y2, 1.5) + `<path d="M${x} ${y2} l-6 ${-dir * 12} l12 0 z" fill="#111"/>` + t(x + 8, (y1 + y2) / 2 + 4, label, 11);
  };
  const cricket = (cx, cy, hw, hh) => { // diamond cricket in feet
    const p = [[cx, cy - hh], [cx + hw, cy], [cx, cy + hh], [cx - hw, cy]].map(([a, b]) => `${X(a)},${Y(b)}`).join(" ");
    return `<polygon points="${p}" fill="rgba(0,0,0,.04)" stroke="#111" stroke-width="1.5"/>` + line(X(cx - hw), Y(cy), X(cx + hw), Y(cy), 1, 'stroke-dasharray="6 4"');
  };
  function parapet() {
    return `<rect x="${X(0)}" y="${Y(0)}" width="${100 * S}" height="${64 * S}" fill="none" stroke="#111" stroke-width="5"/>` +
      `<rect x="${X(1)}" y="${Y(1)}" width="${98 * S}" height="${62 * S}" fill="none" stroke="#111" stroke-width="1.5"/>`;
  }
  function dimH(f1, f2, fy, lbl2, off) {
    const y = Y(fy) + off;
    return line(X(f1), y, X(f2), y, 1) + line(X(f1) - 6, y + 6, X(f1) + 6, y - 6, 2) + line(X(f2) - 6, y + 6, X(f2) + 6, y - 6, 2) +
      line(X(f1), Y(fy), X(f1), y - 6, 0.8) + line(X(f2), Y(fy), X(f2), y - 6, 0.8) + t((X(f1) + X(f2)) / 2, y - 6, lbl2, 14, 'text-anchor="middle"');
  }
  function dimV(f1, f2, fx, lbl2, off) {
    const x = X(fx) + off, my = (Y(f1) + Y(f2)) / 2;
    return line(x, Y(f1), x, Y(f2), 1) + line(x - 6, Y(f1) + 6, x + 6, Y(f1) - 6, 2) + line(x - 6, Y(f2) + 6, x + 6, Y(f2) - 6, 2) +
      line(X(fx), Y(f1), x - 6, Y(f1), 0.8) + line(X(fx), Y(f2), x - 6, Y(f2), 0.8) + t(x - 8, my, lbl2, 14, `text-anchor="middle" transform="rotate(-90 ${x - 8} ${my})"`);
  }

  /* ---------- roof layout data (shared with training answer checks) ---------- */
  const drains = [["RD-1", 15, 32], ["RD-2", 40, 32], ["RD-3", 80, 32]];
  const overflows = [["OD-1", 18, 32], ["OD-2", 43, 32], ["OD-3", 83, 32]];
  const pipesR0 = [[10, 20], [36, 8.5], [38, 22], [55, 58], [70, 45], [92, 42], [96, 58]];
  const pipesR1 = [...pipesR0, [89, 52]];
  const rtus = [["RTU-1", 18, 7.5, 8, 5], ["RTU-2", 44, 46, 8, 5], ["RTU-3", 81, 12, 8, 5]];
  const rtu4 = ["RTU-4", 66, 50, 8, 5];

  function roofPlan(rev) {
    let s = parapet();
    // area divider
    s += line(X(60), Y(1), X(60), Y(63), 3, 'stroke-dasharray="14 6"') + t(X(60) + 8, Y(2.8), "AREA DIVIDER", 11, 'font-weight="700"');
    s += t(X(20), Y(41), "ROOF AREA A", 20, 'text-anchor="middle" font-weight="700" fill="#555"') + t(X(87), Y(25), "ROOF AREA B", 20, 'text-anchor="middle" font-weight="700" fill="#555"');
    // low line (valley) and crickets
    s += line(X(1), Y(32), X(99), Y(32), 1, 'stroke-dasharray="3 5"');
    s += cricket(27.5, 32, 6, 5) + cricket(51, 32, 5, 5) + cricket(92, 32, 6, 5) + cricket(7, 32, 5, 4) + cricket(68, 32, 5, 4);
    // slopes
    for (const x of [8, 32, 55, 74, 94]) s += slope(x, 12, 1) + slope(x, 52, -1);
    // drains
    for (const [tag, x, y] of drains) s += roofDrain(x, y, tag);
    for (const [tag, x, y] of overflows) s += overflow(x, y, tag);
    // curbs, skylight, hatch
    for (const [tag, x, y, w, h] of rtus) s += curb(x, y, w, h, tag);
    s += skylight(66, 16) + hatchBox(4.5, 55.5);
    // walkway pads
    s += padRun([[6, 52], [6, 10], [16, 10]]) + padRun([[9, 57], [42, 57], [42, 53]]) + padRun([[28, 5], [79, 5], [79, 11]]);
    // pipes
    for (const [x, y] of (rev >= 1 ? pipesR1 : pipesR0)) s += pipe(x, y);
    let revs = [{ n: "0", date: "08/15/26", desc: "BID SET" }];
    if (rev >= 1) {
      s += curb(...rtu4.slice(1), rtu4[0]).replace(/^/, "");
      s += `<path d="M${X(66)} ${Y(55)} L${X(70)} ${Y(59)} L${X(74)} ${Y(55)}" fill="rgba(0,0,0,.04)" stroke="#111" stroke-width="1.5"/>` + t(X(75), Y(58), "CRICKET", 10);
      s += padRun([[46, 57], [65, 57], [65, 55]]);
      s += cloud(X(62.5), Y(47.5), 17 * S, 13.5 * S) + delta(X(81.5), Y(47), "1");
      s += cloud(X(86.5), Y(49.5), 5 * S, 5 * S) + delta(X(93), Y(49), "1");
      revs.push({ n: "1", date: "09/12/26", desc: "ASI-01" });
    }
    // callouts
    s += line(X(50), Y(0), X(50), Y(0) - 34, 1) + callout(X(50), Y(0) - 60, "1", "R-501");
    s += callout(X(40), Y(38.5), "2", "R-501");
    s += callout(X(31), Y(9.5), "3", "R-501");
    s += callout(X(22), Y(17), "4", "R-501");
    // dimensions
    s += dimH(0, 100, 0, "100'-0\"", -100) + dimH(0, 60, 0, "60'-0\"", -24) + dimH(60, 100, 0, "40'-0\"", -24);
    s += dimV(0, 64, 0, "64'-0\"", -45) + dimV(0, 32, 100, "32'-0\"", 40) + dimV(32, 64, 100, "32'-0\"", 40);
    const notes = ["ROOF SLOPE 1/4\":12\" MIN TO DRAINS VIA TAPERED INSULATION. CRICKETS 1/2\":12\". SEE R-102.", "ALL PENETRATIONS MIN 12\" FROM CURBS, WALLS & OTHER PENETRATIONS.", "OVERFLOW DRAIN INLETS SET 2\" ABOVE PRIMARY DRAIN INLETS.", "WALKWAY PADS: HEAT-WELD TO MEMBRANE, 3\" GAP BETWEEN PADS.", "VERIFY ALL CURB & PENETRATION LOCATIONS W/ MECH SUB BEFORE INSULATION."];
    if (rev >= 1) notes.push("RTU-4 ADDED PER ASI-01. PROVIDE CRICKET ON UPSLOPE SIDE OF CURB.");
    return wrap(frame("R-101", "ROOF PLAN", '1/4" = 1\'-0"', revs, rev >= 1 ? "09/12/2026" : "08/15/2026") + s + northArrow(1450, 110) +
      drawingTitle(170, 1120, "1", "ROOF PLAN", '1/4" = 1\'-0"') + keynotes(640, 1046, notes, "ROOF NOTES", 19));
  }

  function taperPlan() {
    let s = parapet();
    const th = (y) => (1.5 + Math.abs(32 - y) * 0.25);
    for (const y of [0, 8, 16, 24, 40, 48, 56, 64]) {
      const yy = y === 0 ? 1 : y === 64 ? 63 : y;
      s += `<line x1="${X(1)}" y1="${Y(yy)}" x2="${X(99)}" y2="${Y(yy)}" stroke="#555" stroke-width="1" stroke-dasharray="10 4"/>`;
      s += `<rect x="${X(46)}" y="${Y(yy) - 11}" width="64" height="20" fill="#fff"/>` + t(X(48.5), Y(yy) + 4, `${th(y)}"`, 14, 'font-weight="700"');
    }
    s += line(X(1), Y(32), X(99), Y(32), 2.5) + t(X(73.5), Y(34.8), 'LOW LINE – 1.5" MIN', 12, 'font-weight="700"');
    s += cricket(27.5, 32, 6, 5) + cricket(51, 32, 5, 5) + cricket(92, 32, 6, 5) + cricket(7, 32, 5, 4) + cricket(68, 32, 5, 4);
    for (const [tag, x, y] of drains) s += roofDrain(x, y, tag) + `<rect x="${X(x - 2)}" y="${Y(y - 2)}" width="${4 * S}" height="${4 * S}" fill="none" stroke="#111" stroke-dasharray="3 2"/>`;
    s += line(X(60), Y(1), X(60), Y(63), 3, 'stroke-dasharray="14 6"');
    for (const x of [20, 88]) s += slope(x, 3, 1) + slope(x, 61, -1);
    s += dimH(0, 100, 0, "100'-0\"", -60) + dimV(0, 64, 0, "64'-0\"", -45);
    const notes = ["TAPERED POLYISO 1/4\":12\", 1.5\" MIN AT LOW LINE. THICKNESS SHOWN = TOTAL TAPER.", "CRICKETS: 1/2\":12\" TAPERED POLYISO, FIELD-CUT TO FIT.", "DRAIN SUMPS: 4'x4' TAPERED SUMP, 1/2\" DEPRESSION. SEE 2/R-501.", "INSTALL (2) LAYERS 2.0\" FLAT POLYISO BELOW TAPER, STAGGER JOINTS 12\" MIN.", "TAPERED LAYOUT SHOP DRAWING FROM MFR REQUIRED BEFORE ORDERING."];
    return wrap(frame("R-102", "TAPERED INSULATION|PLAN", '1/4" = 1\'-0"', [{ n: "0", date: "08/15/26", desc: "BID SET" }]) + s + northArrow(1450, 110) +
      drawingTitle(170, 1120, "1", "TAPERED INSULATION PLAN", '1/4" = 1\'-0"') + keynotes(640, 1046, notes, "INSULATION NOTES", 21));
  }

  function sheetR001() {
    let y = 110; const lx = 70;
    const sym = (fn, desc) => { y += 50; return fn(lx + 50, y) + t(lx + 130, y + 5, desc, 14); };
    const FX = (px) => (px - OX) / S, FY = (py) => (py - OY) / S;
    let lg = t(lx, 90, "SYMBOL LEGEND", 20, 'font-weight="700" text-decoration="underline"');
    lg += sym((x, yy) => roofDrain(FX(x), FY(yy), ""), "PRIMARY ROOF DRAIN (RD)");
    lg += sym((x, yy) => overflow(FX(x), FY(yy), ""), "OVERFLOW / SECONDARY DRAIN (OD)");
    lg += sym((x, yy) => pipe(FX(x), FY(yy)), "PIPE PENETRATION – PREMOLDED BOOT");
    lg += sym((x, yy) => curb(FX(x) - 3, FY(yy) - 1.2, 6, 2.4, "RTU"), "EQUIPMENT CURB");
    lg += sym((x, yy) => rect(x - 20, yy - 14, 40, 28, 2, "url(#hatch)"), "ROOF HATCH");
    lg += sym((x, yy) => rect(x - 20, yy - 14, 40, 28, 2) + rect(x - 14, yy - 8, 28, 16, 1), "SKYLIGHT");
    lg += sym((x, yy) => pad(FX(x), FY(yy)), "WALKWAY PAD");
    lg += sym((x, yy) => line(x - 30, yy, x + 30, yy, 1.5) + `<path d="M${x + 30} ${yy} l-12 -6 l0 12 z" fill="#111"/>`, "SLOPE ARROW – POINTS DOWNHILL");
    lg += sym((x, yy) => cricket(FX(x), FY(yy), 2.5, 1.5), "CRICKET / SADDLE");
    lg += sym((x, yy) => line(x - 30, yy, x + 30, yy, 3, 'stroke-dasharray="14 6"'), "AREA DIVIDER");
    lg += sym((x, yy) => `<rect x="${x - 30}" y="${yy - 4}" width="60" height="8" fill="none" stroke="#1a5fb4" stroke-width="3" stroke-dasharray="10 4"/>`, "BELOW-GRADE WATERPROOFING");
    lg += sym((x, yy) => callout(x, yy, "1", "R-501").replace(/r="26"/, 'r="20"'), "DETAIL CALLOUT – DETAIL / SHEET");
    lg += sym((x, yy) => delta(x, yy, "1"), "REVISION DELTA");
    const notes = [
      "1. ROOFING WORK SHALL MEET MFR REQUIREMENTS FOR A 20-YEAR NDL WARRANTY.",
      "2. INSTALL ONLY AS MUCH ROOF AS CAN BE MADE WATERTIGHT THE SAME DAY.",
      "3. PROVIDE TEMPORARY TIE-INS / NIGHT SEALS AT END OF EACH WORK DAY.",
      "4. BASE FLASHINGS MIN 8\" ABOVE FINISHED ROOF SURFACE.",
      "5. PENETRATIONS MIN 12\" FROM CURBS, WALLS AND OTHER PENETRATIONS.",
      "6. DO NOT INSTALL MATERIALS ON WET, FROSTED OR DAMAGED SUBSTRATES.",
      "7. SUBMIT RFI FOR ANY CONFLICT BETWEEN DRAWINGS AND FIELD CONDITIONS.",
      "8. FALL PROTECTION PER OSHA 1926 SUBPART M AND SITE SAFETY PLAN.",
    ];
    const gn = t(760, 90, "GENERAL NOTES", 20, 'font-weight="700" text-decoration="underline"') + notes.map((n, i) => t(760, 130 + i * 30, n, 14)).join("");
    const idx = [["R-001", "SYMBOLS, NOTES & SHEET INDEX"], ["R-101", "ROOF PLAN"], ["R-102", "TAPERED INSULATION PLAN"], ["R-501", "ROOF DETAILS"], ["R-601", "ROOF & WATERPROOFING SCHEDULES"], ["W-101", "BELOW-GRADE WATERPROOFING PLAN"], ["W-501", "WATERPROOFING DETAILS"]];
    let si = t(760, 440, "SHEET INDEX", 20, 'font-weight="700" text-decoration="underline"');
    idx.forEach(([n, d], i) => { si += rect(760, 460 + i * 34, 120, 34, 1) + rect(880, 460 + i * 34, 420, 34, 1) + t(775, 483 + i * 34, n, 15, 'font-weight="700"') + t(895, 483 + i * 34, d, 14); });
    const abbr = [["AFF", "ABOVE FINISHED FLOOR"], ["BUR", "BUILT-UP ROOF"], ["NDL", "NO DOLLAR LIMIT (WARRANTY)"], ["OD", "OVERFLOW DRAIN"], ["RD", "ROOF DRAIN"], ["RTU", "ROOFTOP UNIT"], ["SBS", "SBS MODIFIED BITUMEN"], ["TPO", "THERMOPLASTIC POLYOLEFIN"], ["TYP", "TYPICAL"], ["WP", "WATERPROOFING"]];
    let ab = t(760, 760, "ABBREVIATIONS", 20, 'font-weight="700" text-decoration="underline"');
    abbr.forEach(([a, d], i) => { ab += t(760, 795 + i * 26, a, 14, 'font-weight="700"') + t(840, 795 + i * 26, d, 14); });
    return wrap(frame("R-001", "ROOFING SYMBOLS,|NOTES & SHEET INDEX", "NONE", [{ n: "0", date: "08/15/26", desc: "BID SET" }]) + lg + gn + si + ab);
  }

  /* ---------- details ---------- */
  function panel(x, y, w, hgt, num, title, scale) {
    return `<rect x="${x}" y="${y}" width="${w}" height="${hgt}" fill="none" stroke="#999" stroke-width="1"/>` + circ(x + 30, y + hgt - 30, 18, 2) + line(x + 12, y + hgt - 30, x + 48, y + hgt - 30, 1.5) +
      t(x + 30, y + hgt - 35, num, 13, 'text-anchor="middle" font-weight="700"') + t(x + 58, y + hgt - 28, title, 16, 'font-weight="700"') + t(x + 58, y + hgt - 10, "SCALE: " + scale, 11) +
      (unitsPerFt(scale) ? scaleBar(x + w - 60 - BAR_PARTS[unitsPerFt(scale)].slice(-1)[0] * unitsPerFt(scale), y + hgt - 34, unitsPerFt(scale), BAR_PARTS[unitsPerFt(scale)]) : "");
  }
  const insul = (x, y, w, hgt) => `<rect x="${x}" y="${y}" width="${w}" height="${hgt}" fill="url(#insul)" stroke="#111" stroke-width="1"/>`;
  const membrane = (d) => `<path d="${d}" fill="none" stroke="#111" stroke-width="4"/>`;

  function sheetR501() {
    let s = "";
    // 1 parapet
    {
      const x = 50, y = 50; s += panel(x, y, 720, 520, "1", "PARAPET BASE FLASHING & COPING", '3" = 1\'-0"');
      s += rect(x + 470, y + 90, 60, 320, 2, "url(#hatch)"); // wall
      s += rect(x + 60, y + 380, 410, 30, 2, "#ddd") + t(x + 70, y + 432, "", 10); // deck
      s += insul(x + 60, y + 310, 410, 70); // insulation
      s += rect(x + 60, y + 298, 410, 12, 1, "#bbb"); // cover board
      s += membrane(`M${x + 60} ${y + 295} L${x + 468} ${y + 295} L${x + 468} ${y + 195}`);
      s += rect(x + 460, y + 189, 10, 12, 1, "#111"); // term bar
      s += `<path d="M${x + 455} ${y + 80} L${x + 545} ${y + 80} L${x + 545} ${y + 130} M${x + 455} ${y + 80} L${x + 455} ${y + 170}" fill="none" stroke="#111" stroke-width="3"/>`;
      s += lbl(x + 500, y + 80, x + 580, y + 60, "METAL COPING W/ CONT. CLEAT");
      s += lbl(x + 457, y + 160, x + 20, y + 120, "COUNTERFLASHING / COPING FACE", 13, "start");
      s += lbl(x + 465, y + 192, x + 20, y + 160, "TERMINATION BAR + SEALANT", 13, "start");
      s += lbl(x + 468, y + 240, x + 20, y + 205, "TPO BASE FLASHING – 8\" MIN ABOVE ROOF", 13, "start");
      s += lbl(x + 200, y + 295, x + 20, y + 260, "60-MIL TPO MEMBRANE, FULLY ADHERED", 13, "start");
      s += lbl(x + 300, y + 304, x + 580, y + 330, "1/2\" HD COVER BOARD");
      s += lbl(x + 300, y + 345, x + 580, y + 360, "TAPERED + FLAT POLYISO");
      s += lbl(x + 300, y + 395, x + 580, y + 395, "METAL DECK");
      s += line(x + 480, y + 295, x + 480, y + 195, 1) + t(x + 485, y + 250, "8\"", 12, 'font-weight="700"'); // 8" = 100 units at 3" = 1'-0"
    }
    // 2 roof drain
    {
      const x = 800, y = 50; s += panel(x, y, 700, 520, "2", "ROOF DRAIN AT TAPERED SUMP", '3" = 1\'-0"');
      s += rect(x + 60, y + 380, 580, 30, 2, "#ddd");
      // 1/2" sump = 6.25 units at 3" = 1'-0"
      s += `<path d="M${x + 60} ${y + 290} L${x + 250} ${y + 296} L${x + 450} ${y + 296} L${x + 640} ${y + 290} L${x + 640} ${y + 380} L${x + 60} ${y + 380} Z" fill="url(#insul)" stroke="#111"/>`;
      s += membrane(`M${x + 60} ${y + 286} L${x + 250} ${y + 292} L${x + 450} ${y + 292} L${x + 640} ${y + 286}`);
      s += `<path d="M${x + 290} ${y + 294} L${x + 300} ${y + 470} L${x + 400} ${y + 470} L${x + 410} ${y + 294} Z" fill="#fff" stroke="#111" stroke-width="2"/>`;
      s += rect(x + 270, y + 286, 160, 12, 2, "#888");
      s += `<path d="M${x + 300} ${y + 286} Q${x + 350} ${y + 190} ${x + 400} ${y + 286}" fill="none" stroke="#111" stroke-width="2"/>`;
      s += lbl(x + 350, y + 240, x + 480, y + 170, "CAST IRON DOME STRAINER");
      s += lbl(x + 420, y + 302, x + 520, y + 240, "CLAMPING RING – TORQUE BOLTS");
      s += lbl(x + 150, y + 293, x + 20, y + 230, "MEMBRANE INTO CLAMPING RING", 13, "start");
      s += lbl(x + 150, y + 330, x + 20, y + 450, "TAPERED SUMP 1/2\" DEPRESSION", 13, "start");
      s += lbl(x + 350, y + 420, x + 480, y + 450, "4\" DRAIN BODY – BY PLUMBING");
    }
    // 3 pipe penetration
    {
      const x = 50, y = 590; s += panel(x, y, 720, 440, "3", "PIPE PENETRATION – PREMOLDED BOOT", '3" = 1\'-0"');
      s += rect(x + 60, y + 310, 600, 24, 2, "#ddd") + insul(x + 60, y + 250, 600, 60);
      s += membrane(`M${x + 60} ${y + 246} L${x + 660} ${y + 246}`);
      s += rect(x + 330, y + 60, 50, 280, 2, "#fff");
      s += `<path d="M${x + 260} ${y + 244} L${x + 330} ${y + 140} M${x + 450} ${y + 244} L${x + 380} ${y + 140}" stroke="#111" stroke-width="4" fill="none"/>`;
      s += rect(x + 322, y + 128, 66, 12, 1, "#555");
      s += lbl(x + 388, y + 134, x + 470, y + 110, "STAINLESS CLAMP + SEALANT");
      s += lbl(x + 415, y + 200, x + 480, y + 180, "PREMOLDED TPO PIPE BOOT");
      s += lbl(x + 355, y + 80, x + 480, y + 70, "PIPE – CLEAN & PRIME");
      s += lbl(x + 200, y + 246, x + 20, y + 190, "BOOT FLANGE WELD 1-1/2\" MIN", 13, "start");
      s += line(x + 395, y + 244, x + 395, y + 140, 1) + t(x + 400, y + 236, "8\" MIN", 12, 'font-weight="700"');
    }
    // 4 curb
    {
      const x = 800, y = 590; s += panel(x, y, 700, 440, "4", "EQUIPMENT CURB FLASHING", '3" = 1\'-0"');
      s += rect(x + 60, y + 320, 580, 24, 2, "#ddd") + insul(x + 60, y + 260, 580, 60);
      s += rect(x + 330, y + 120, 40, 200, 2, "url(#hatch)");
      s += rect(x + 300, y + 70, 300, 50, 2, "#eee") + t(x + 450, y + 100, "RTU", 14, 'text-anchor="middle" font-weight="700"');
      s += membrane(`M${x + 60} ${y + 256} L${x + 328} ${y + 256} L${x + 328} ${y + 140}`);
      s += `<path d="M${x + 320} ${y + 120} L${x + 320} ${y + 160}" stroke="#111" stroke-width="3"/>`;
      s += lbl(x + 320, y + 150, x + 20, y + 120, "EQUIPMENT RAIL / COUNTERFLASHING", 13, "start");
      s += lbl(x + 328, y + 200, x + 20, y + 180, "TPO CURB FLASHING – 8\" MIN", 13, "start");
      s += lbl(x + 200, y + 256, x + 20, y + 225, "INSIDE/OUTSIDE CORNERS: PREFAB", 13, "start");
      s += lbl(x + 450, y + 290, x + 520, y + 220, "CRICKET ON UPSLOPE SIDE");
    }
    s += callout(1515 - 40, 1110, "1", "R-101").replace(/1515/, "1515");
    return wrap(frame("R-501", "ROOF DETAILS", "AS NOTED", [{ n: "0", date: "08/15/26", desc: "BID SET" }]) + s + t(1330, 1115, "SEE ROOF PLAN →", 12));
  }

  function sheetR601() {
    const table = (x, y, title, heads, widths, rows) => {
      let s = t(x, y, title, 18, 'font-weight="700" text-decoration="underline"'); let cy = y + 14, cx = x;
      heads.forEach((hd, i) => { s += rect(cx, cy, widths[i], 26, 1.5, "#ddd") + t(cx + 6, cy + 18, hd, 12, 'font-weight="700"'); cx += widths[i]; });
      rows.forEach((r, j) => { cx = x; r.forEach((c, i) => { s += rect(cx, cy + 26 * (j + 1), widths[i], 26, 1) + t(cx + 6, cy + 26 * (j + 1) + 18, c, 12); cx += widths[i]; }); });
      return s;
    };
    let s = table(60, 70, "ROOF ASSEMBLY (TOP DOWN)", ["LAYER", "MATERIAL", "ATTACHMENT"], [60, 480, 300], [
      ["1", "60-MIL TPO MEMBRANE, WHITE (REFLECTIVE)", "FULLY ADHERED – BONDING ADHESIVE"],
      ["2", "1/2\" HIGH-DENSITY POLYISO COVER BOARD", "LOW-RISE FOAM ADHESIVE"],
      ["3", "TAPERED POLYISO 1/4\":12\", 1.5\" MIN", "LOW-RISE FOAM ADHESIVE"],
      ["4", "(2) LAYERS 2.0\" FLAT POLYISO, STAGGERED", "MECH. FASTENED – FM 1-90 PATTERN"],
      ["5", "SELF-ADHERED VAPOR RETARDER", "OVER PRIMED DECK / THERMAL BARRIER"],
      ["6", "1-1/2\" TYPE B STEEL DECK (BY OTHERS)", "—"],
    ]);
    s += table(60, 300, "DRAIN SCHEDULE", ["TAG", "TYPE", "SIZE", "NOTES"], [80, 220, 80, 460], [
      ["RD-1..3", "PRIMARY ROOF DRAIN", "4\"", "CAST IRON, CLAMPING RING, DOME STRAINER"],
      ["OD-1..3", "OVERFLOW DRAIN", "4\"", "WATER DAM – INLET 2\" ABOVE PRIMARY"],
    ]);
    s += table(60, 420, "PENETRATIONS & CURBS", ["ITEM", "QTY", "FLASHING METHOD"], [220, 80, 540], [
      ["PIPE PENETRATIONS", "SEE R-101", "PREMOLDED TPO BOOT + CLAMP (3/R-501)"],
      ["RTU CURBS", "SEE R-101", "TPO CURB FLASHING 8\" MIN (4/R-501)"],
      ["SKYLIGHT SK-1", "1", "TPO CURB FLASHING, MFR CURB"],
      ["ROOF HATCH RH-1", "1", "TPO CURB FLASHING, GUARDRAIL BY OTHERS"],
    ]);
    s += table(60, 600, "BELOW-GRADE WATERPROOFING ASSEMBLY (OUTSIDE IN)", ["LAYER", "MATERIAL", "NOTES"], [60, 480, 300], [
      ["1", "BACKFILL (BY OTHERS)", "COMPACT IN 8\" LIFTS"],
      ["2", "PREFAB DRAINAGE COMPOSITE W/ FILTER FABRIC", "FABRIC SIDE TO SOIL"],
      ["3", "1/8\" PROTECTION BOARD", "INSTALL SAME DAY AS MEMBRANE"],
      ["4", "60-MIL SELF-ADHERED RUBBERIZED ASPHALT SHEET", "LAP 2-1/2\" SIDES / ENDS"],
      ["5", "PRIMER PER MFR", "CONCRETE CURED 7 DAYS MIN"],
      ["6", "CAST-IN-PLACE CONCRETE WALL", "HYDROPHILIC WATERSTOP AT JOINTS"],
    ]);
    s += table(60, 830, "WARRANTY & TESTING", ["ITEM", "REQUIREMENT"], [300, 540], [
      ["ROOF WARRANTY", "20-YEAR MFR NDL + 2-YEAR CONTRACTOR"],
      ["SEAM TESTING", "PROBE ALL WELDS DAILY; TEST CUTS PER MFR"],
      ["ELEVATOR PIT", "24-HR FLOOD TEST BEFORE BACKFILL/TOPPING"],
      ["BELOW-GRADE WP", "5-YEAR MATERIAL WARRANTY"],
    ]);
    return wrap(frame("R-601", "ROOF & WATERPROOFING|SCHEDULES", "NONE", [{ n: "0", date: "08/15/26", desc: "BID SET" }]) + s);
  }

  /* ---------- below grade ---------- */
  const BX = (f) => 300 + f * S, BY = (f) => 300 + f * S; // basement 60' x 40'
  const wpPipes = [[20, 0], [32, 0], [60, 22]];
  function sheetW101() {
    let s = "";
    s += `<rect x="${BX(0)}" y="${BY(0)}" width="${60 * S}" height="${40 * S}" fill="url(#hatch)" stroke="#111" stroke-width="2"/>`;
    s += `<rect x="${BX(1)}" y="${BY(1)}" width="${58 * S}" height="${38 * S}" fill="#fff" stroke="#111" stroke-width="2"/>`;
    s += `<rect x="${BX(0) - 7}" y="${BY(0) - 7}" width="${60 * S + 14}" height="${40 * S + 14}" fill="none" stroke="#1a5fb4" stroke-width="4" stroke-dasharray="14 5"/>`;
    s += `<rect x="${BX(0) - 30}" y="${BY(0) - 30}" width="${60 * S + 60}" height="${40 * S + 60}" fill="none" stroke="#555" stroke-width="2" stroke-dasharray="3 6"/>`;
    for (const [cx, cy] of [[BX(0) - 30, BY(0) - 30], [BX(60) + 30, BY(0) - 30], [BX(60) + 30, BY(40) + 30], [BX(0) - 30, BY(40) + 30]]) s += circ(cx, cy, 9, 2, "#fff") + t(cx + 12, cy + 22, "CO", 11);
    // elevator pit
    s += rect(BX(46), BY(4), 8 * S, 8 * S, 3, "#f3f6fb") + `<rect x="${BX(46) - 5}" y="${BY(4) - 5}" width="${8 * S + 10}" height="${8 * S + 10}" fill="none" stroke="#1a5fb4" stroke-width="3" stroke-dasharray="10 4"/>` + t(BX(50), BY(8) + 5, "ELEV PIT", 12, 'text-anchor="middle" font-weight="700"');
    // sump
    s += circ(BX(5), BY(34), 16, 2, "#fff") + t(BX(5), BY(34) + 4, "SP", 11, 'text-anchor="middle"');
    for (const [x, y] of wpPipes) s += `<rect x="${BX(x) - 8}" y="${BY(y) - 8}" width="16" height="16" fill="#fff" stroke="#111" stroke-width="2"/>`;
    s += t(BX(30), BY(20), "BASEMENT – MECHANICAL / STORAGE", 16, 'text-anchor="middle" fill="#555" font-weight="700"');
    s += t(BX(30), BY(22.5), "SLAB EL -12'-0\"   •   TOP OF WALL EL 0'-0\"", 13, 'text-anchor="middle" fill="#555"');
    // labels / leaders
    s += lbl(BX(10), BY(0) - 7, BX(-18), BY(-10), "BELOW-GRADE WP – FULL HEIGHT, SEE 1/W-501", 13, "start");
    s += lbl(BX(60) + 30, BY(15), BX(66), BY(12), "4\" PERF FOOTING DRAIN IN GRAVEL");
    s += lbl(BX(54) + 5, BY(12), BX(66), BY(20), "PIT WATERPROOFING – SEE 2/W-501");
    s += lbl(BX(60), BY(22), BX(66), BY(26), "PIPE SLEEVE – SEE 3/W-501");
    s += lbl(BX(10), BY(40), BX(-18), BY(47), "HYDROPHILIC WATERSTOP AT WALL/FOOTING JOINT", 13, "start");
    s += callout(BX(66) + 300, BY(4), "1", "W-501") + callout(BX(66) + 300, BY(14), "2", "W-501") + callout(BX(66) + 300, BY(24), "3", "W-501");
    // dims
    s += line(BX(0), BY(0) - 80, BX(60), BY(0) - 80, 1) + line(BX(0), BY(0) - 90, BX(0), BY(0) - 40, 0.8) + line(BX(60), BY(0) - 90, BX(60), BY(0) - 40, 0.8) + t(BX(30), BY(0) - 86, "60'-0\"", 14, 'text-anchor="middle"');
    s += line(BX(0) - 80, BY(0), BX(0) - 80, BY(40), 1) + line(BX(0) - 90, BY(0), BX(0) - 40, BY(0), 0.8) + line(BX(0) - 90, BY(40), BX(0) - 40, BY(40), 0.8) + t(BX(0) - 88, BY(20), "40'-0\"", 14, `text-anchor="middle" transform="rotate(-90 ${BX(0) - 88} ${BY(20)})"`);
    const notes = ["WALL WATERPROOFING FROM TOP OF FOOTING (EL -12'-0\") TO FINISH GRADE.", "CONCRETE MUST CURE 7 DAYS MIN AND PASS MOISTURE TEST BEFORE PRIMING.", "INSTALL PROTECTION BOARD & DRAINAGE COMPOSITE SAME DAY AS MEMBRANE.", "ELEVATOR PIT: BLINDSIDE (PRE-APPLIED) MEMBRANE; 24-HR FLOOD TEST.", "INSPECT & PHOTOGRAPH ALL WATERPROOFING BEFORE BACKFILL."];
    return wrap(frame("W-101", "BELOW-GRADE|WATERPROOFING PLAN", '1/4" = 1\'-0"', [{ n: "0", date: "08/15/26", desc: "BID SET" }]) + s + northArrow(1450, 110) +
      drawingTitle(170, 1120, "1", "BASEMENT WATERPROOFING PLAN", '1/4" = 1\'-0"') + keynotes(640, 1046, notes, "WATERPROOFING NOTES", 21));
  }

  function sheetW501() {
    let s = "";
    { // 1 wall section
      const x = 50, y = 50; s += panel(x, y, 720, 980, "1", "FOUNDATION WALL WATERPROOFING", '1" = 1\'-0"');
      s += rect(x + 330, y + 90, 90, 700, 2, "url(#hatch)"); // wall
      s += rect(x + 250, y + 790, 330, 80, 2, "url(#hatch)"); // footing
      s += rect(x + 420, y + 720, 200, 40, 1.5, "#ddd"); // slab
      s += membrane(`M${x + 327} ${y + 130} L${x + 327} ${y + 790} L${x + 250} ${y + 790}`);
      s += line(x + 318, y + 130, x + 318, y + 790, 2); // protection board
      s += `<path d="M${x + 305} ${y + 130} L${x + 305} ${y + 790}" stroke="#111" stroke-width="6" stroke-dasharray="3 3"/>`;
      s += circ(x + 200, y + 765, 20, 2) + `<rect x="${x + 150}" y="${y + 720}" width="100" height="70" fill="none" stroke="#111" stroke-dasharray="2 4"/>`;
      s += rect(x + 322, y + 122, 12, 10, 1, "#111");
      s += line(x + 60, y + 130, x + 330, y + 130, 2) + t(x + 70, y + 122, "FINISH GRADE", 12, 'font-weight="700"');
      s += `<rect x="${x + 418}" y="${y + 785}" width="8" height="10" fill="#1a5fb4"/>`;
      s += lbl(x + 328, y + 127, x + 480, y + 110, "TERMINATION BAR + SEALANT AT GRADE");
      s += lbl(x + 327, y + 300, x + 480, y + 260, "60-MIL SELF-ADHERED SHEET WP");
      s += lbl(x + 318, y + 380, x + 480, y + 340, "PROTECTION BOARD");
      s += lbl(x + 305, y + 460, x + 20, y + 420, "DRAINAGE COMPOSITE (FABRIC OUT)", 13, "start");
      s += lbl(x + 200, y + 765, x + 20, y + 660, "4\" PERF DRAIN IN GRAVEL + FABRIC", 13, "start");
      s += lbl(x + 422, y + 790, x + 480, y + 840, "HYDROPHILIC WATERSTOP");
      s += lbl(x + 280, y + 790, x + 20, y + 900, "MEMBRANE LAPPED ONTO FOOTING 6\"", 13, "start");
    }
    { // 2 elevator pit
      const x = 800, y = 50; s += panel(x, y, 700, 500, "2", "ELEVATOR PIT – BLINDSIDE", '3/4" = 1\'-0"');
      s += `<path d="M${x + 120} ${y + 120} L${x + 120} ${y + 380} L${x + 580} ${y + 380} L${x + 580} ${y + 120}" fill="none" stroke="#1a5fb4" stroke-width="5"/>`;
      s += rect(x + 130, y + 120, 40, 250, 1.5, "url(#hatch)") + rect(x + 530, y + 120, 40, 250, 1.5, "url(#hatch)") + rect(x + 130, y + 330, 440, 40, 1.5, "url(#hatch)");
      s += lbl(x + 120, y + 250, x + 20, y + 80, "HDPE BLINDSIDE MEMBRANE", 13, "start");
      s += lbl(x + 350, y + 380, x + 380, y + 430, "LAPS TAPED – NO PENETRATIONS");
      s += lbl(x + 550, y + 200, x + 580, y + 90, "FLOOD TEST 24 HR");
    }
    { // 3 pipe sleeve
      const x = 800, y = 570; s += panel(x, y, 700, 460, "3", "PIPE PENETRATION AT FOUNDATION WALL", '1-1/2" = 1\'-0"');
      s += rect(x + 300, y + 60, 90, 300, 2, "url(#hatch)");
      s += rect(x + 150, y + 180, 380, 36, 2, "#fff") + rect(x + 290, y + 172, 110, 52, 2, "none");
      s += membrane(`M${x + 297} ${y + 60} L${x + 297} ${y + 172} M${x + 297} ${y + 224} L${x + 297} ${y + 360}`);
      s += `<path d="M${x + 297} ${y + 172} L${x + 240} ${y + 180} M${x + 297} ${y + 224} L${x + 240} ${y + 216}" stroke="#111" stroke-width="3"/>`;
      s += lbl(x + 250, y + 198, x + 20, y + 110, "TARGET PATCH + MASTIC COLLAR", 13, "start");
      s += lbl(x + 345, y + 176, x + 450, y + 120, "SLEEVE W/ LINK SEAL");
      s += lbl(x + 297, y + 300, x + 20, y + 380, "WALL WP LAPPED 6\" ONTO PATCH", 13, "start");
    }
    s += callout(1480, 1110, "", "W-101");
    return wrap(frame("W-501", "WATERPROOFING DETAILS", "AS NOTED", [{ n: "0", date: "08/15/26", desc: "BID SET" }]) + s);
  }

  const defs2 = `<pattern id="insul" width="16" height="16" patternUnits="userSpaceOnUse"><path d="M0 8 Q4 0 8 8 T16 8" fill="none" stroke="#777" stroke-width="1"/></pattern>`;

  const sheets = [
    { key: "R-001", number: "R-001", title: "Roofing Symbols, Notes & Sheet Index", discipline: "Roofing", scalePxPerFt: null, svg: sheetR001, links: [] },
    { key: "R-101r0", number: "R-101", title: "Roof Plan", discipline: "Roofing", scalePxPerFt: S, svg: () => roofPlan(0), rev: "0", date: "2026-08-15", set: "Bid Set", links: [] },
    { key: "R-101r1", number: "R-101", title: "Roof Plan", discipline: "Roofing", scalePxPerFt: S, svg: () => roofPlan(1), rev: "1", date: "2026-09-12", set: "ASI-01", links: [] },
    { key: "R-102", number: "R-102", title: "Tapered Insulation Plan", discipline: "Roofing", scalePxPerFt: S, svg: taperPlan, links: [] },
    { key: "R-501", number: "R-501", title: "Roof Details", discipline: "Roofing", scalePxPerFt: null, svg: sheetR501, links: [{ x: 1475, y: 1110, r: 28, target: "R-101" }] },
    { key: "R-601", number: "R-601", title: "Roof & Waterproofing Schedules", discipline: "Roofing", scalePxPerFt: null, svg: sheetR601, links: [] },
    { key: "W-101", number: "W-101", title: "Below-Grade Waterproofing Plan", discipline: "Waterproofing", scalePxPerFt: S, svg: sheetW101, links: [1, 2, 3].map((n, i) => ({ x: BX(66) + 300, y: BY(4 + i * 10), r: 28, target: "W-501" })) },
    { key: "W-501", number: "W-501", title: "Waterproofing Details", discipline: "Waterproofing", scalePxPerFt: null, svg: sheetW501, links: [{ x: 1480, y: 1110, r: 28, target: "W-101" }] },
  ];
  const roofLinks = [{ x: X(50), y: Y(0) - 60, r: 28, target: "R-501" }, { x: X(40), y: Y(38.5), r: 28, target: "R-501" }, { x: X(31), y: Y(9.5), r: 28, target: "R-501" }, { x: X(22), y: Y(17), r: 28, target: "R-501" }];
  sheets[1].links = roofLinks; sheets[2].links = roofLinks;

  const cache = {};
  function dataUrl(key) {
    if (!cache[key]) {
      const sh = sheets.find((s) => s.key === key);
      cache[key] = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(sh.svg().replace("<defs>", "<defs>" + defs2));
    }
    return cache[key];
  }

  /* Answer-key geometry used by training checks (sheet units). */
  const answers = {
    parapetLength: 100,
    roofAreaB: 40 * 64,
    penetrationsCurrent: pipesR1.length,
    penetrationPts: (rev = 1) => (rev ? pipesR1 : pipesR0).map(([x, y]) => ({ x: X(x), y: Y(y) })),
    basementPerimeter: 200,
    roofBox: { x1: X(0), y1: Y(0), x2: X(100), y2: Y(64) },
  };

  return { W, H, PPI, PROJECT, sheets, dataUrl, answers, scale: S, unitsPerFt };
})();
