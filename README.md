# Plan Room Trainer – JATC Construction Plan Software Training

A hands-on training kit that teaches **roofer and waterproofer apprentices** how to use
construction plan-management software such as **PlanGrid / Autodesk Build**, Procore Drawings,
Fieldwire and Bluebeam.

It has two parts:

1. **Plan Room Trainer** (`app/`) – a practice web app that works like PlanGrid. It runs in
   any browser, needs no login, and comes loaded with a fictional 7-sheet roofing & below-grade
   waterproofing drawing set.
   Apprentices can make mistakes here without touching a real project.
2. **Curriculum** (`docs/`, `instructor/`) – 8 lessons, hands-on labs, quizzes, a final exam,
   an instructor guide and a skills checklist. **Answer keys are kept in a separate private repo**
   (`jatc-plangrid-instructor-keys`) so apprentices can't look them up.

> **Not affiliated with Autodesk.** PlanGrid, Autodesk Build, Procore, Fieldwire and Bluebeam are
> trademarks of their owners. This is an independent training tool. The drawings are fictional
> and marked *NOT FOR CONSTRUCTION*.

---

**Curriculum fit:** built for the specs & blueprint weeks of the Central Valley Roofers JATC
Standards, Exhibit C – **Week 3A Advanced Specs, Blueprints & Details** (default), 3B Roofing Specs &
Details and 3C Waterproofing Specs & Details. See the instructor guide for the full mapping.

## Quick start

**Option A – just open it (no install)**
1. Download the repo (green **Code** button → **Download ZIP**) and unzip it.
2. Open `app/index.html` in Chrome, Edge, Safari or Firefox.

**Option B – GitHub Pages (best for a class)**
1. Push this repo to GitHub.
2. Go to **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. The included workflow publishes the app. Every apprentice uses the same link, e.g.
   `https://<your-org>.github.io/jatc-plangrid-training/`.

**Option C – local web server**
```bash
cd app
python3 -m http.server 8080
# open http://localhost:8080
```

Work is saved in each apprentice's browser. To turn work in, apprentices use
**Settings → Export backup (.json)** and send you the file. Drop all the files into the
**Instructor Dashboard** (`instructor.html`, linked from Settings) to grade the whole class at once.

---

## What the practice app can do

| Area | Features |
|---|---|
| **Sheets** | Thumbnail grid, search, discipline and tag filters, upload PDF or image sheets (multi-page PDFs split into sheets, sheet-number detection), sheet review step, version sets, version history, prev/next sheet navigation |
| **Sheet viewer** | Smooth zoom (wheel, pinch, buttons), pan, fit to screen, keyboard shortcuts, touch support for tablets |
| **Markups** | Pen, highlighter, line, arrow, rectangle, ellipse, revision cloud, text, stamps (FIELD VERIFY, AS-BUILT, LEAK, PROBED OK, SEE RFI…), 7 colors, line width, move, recolor, delete, undo/redo |
| **Layers** | Personal, Published (team) and As-Built layers with show/hide toggles, publish one or all |
| **Measure & takeoff** | Calibrate scale from any known dimension, length, multi-segment path (parapet / flashing runs), area (SF → squares), count tool (penetrations, drains, curbs) |
| **Hyperlinks** | Auto-linked detail callouts (click `2 / R-501`), user-made links to other sheets or web pages |
| **Compare** | Overlay two revisions: red = removed, blue = added, gray = unchanged |
| **Issues** | Pin on sheet, type (Issue, Punch, Safety, Quality, Leak, Observation, Warranty, Design Coordination), status, priority, assignee, due date, location, photos, comments, overdue flags, filters, CSV export, printable report |
| **Punch list** | Dedicated view with one-tap close-out checkboxes |
| **RFIs** | Numbered RFIs, Draft → Open → Answered → Closed workflow, ball-in-court, cost/schedule impact, sheet references, official answer, history, print |
| **Submittals** | Division 07 spec-section log, types, review statuses (Approved, Approved as Noted, Revise & Resubmit, Rejected), ball-in-court, due dates |
| **Photos** | Upload/camera capture, captions, tags, pin to sheet location, attach to issues, gallery |
| **Reports & forms** | Daily report (weather incl. dew/wind/rain delays, manpower, work performed, delays, safety, equipment, visitors), Toolbox Talk sign-in, Pre-Task Plan / JHA, Inspection request (deck, tapered layout, mfr inspection, before backfill, flood test, final/warranty) – draft/submit/print |
| **Documents & specs** | Folders, upload any file, full-text search inside specs with highlighting, PDF/image preview |
| **Team** | Members, roles, companies, contacts – used for assignments |
| **Everything else** | Dashboard, global search, activity log, multiple projects, backup/restore, reset |
| **Training missions** | 32 self-checking missions in 6 modules, progress bar, printable training record |
| **Quizzes & worksheets** | All 6 quizzes, the lab worksheets and the written final are answered in the app (multiple choice, select-all, numbers, short answer) and saved in the apprentice's backup |
| **Automatic grading** | Instructor Dashboard grades the whole class at once: quizzes and worksheets against a private answer key, lab work and the final practical by rubric straight from each apprentice's project, all 32 missions – with overrides, notes and CSV gradebook export. No server; nothing uploaded |

See [`docs/feature-map.md`](docs/feature-map.md) for where each feature lives in the real
PlanGrid / Autodesk Build and other apps.

---

## The sample project

*Central Valley Training Center – Bldg B* – a fictional 100' × 64' building with a 60-mil TPO
roof over tapered polyiso, and a 60' × 40' basement with below-grade sheet waterproofing.

| Sheet | Title | Used to teach |
|---|---|---|
| R-001 | Roofing Symbols, Notes & Sheet Index | Reading legends and general notes |
| R-101 | Roof Plan (Rev 0 and Rev 1 / ASI-01) | Drains, overflows, crickets, curbs, penetrations, walkway pads, measuring, squares, counting, revisions, compare |
| R-102 | Tapered Insulation Plan | Reading slope and insulation thickness |
| R-501 | Roof Details | Parapet flashing & coping, roof drain, pipe boot, curb flashing |
| R-601 | Roof & Waterproofing Schedules | Roof assembly, drain schedule, below-grade assembly, warranty & testing |
| W-101 | Below-Grade Waterproofing Plan | Foundation wall WP, footing drain, elevator pit, pipe sleeves |
| W-501 | Waterproofing Details | Wall section, blindside pit, pipe penetration |

Also seeded: team (foreman, GC, architect, manufacturer's rep), open issues (ponding, failed seam
probe, honeycomb in foundation wall), an answered RFI, four Division 07 submittals, TPO and
waterproofing specs, ASI-01, a fall-protection toolbox talk and a daily report.

A deliberate conflict is built into the set for the RFI lab (Lab 5).

---

## Curriculum

| # | Lesson | Lab | Quiz |
|---|---|---|---|
| 1 | [Getting started & navigating sheets](docs/modules/01-getting-started.md) | [Lab 1](docs/labs/lab-01-scavenger-hunt.md) | [Quiz 1](docs/quizzes/quiz-01.md) |
| 2 | [Markups & layers](docs/modules/02-markups.md) | [Lab 2](docs/labs/lab-02-markups.md) | [Quiz 2](docs/quizzes/quiz-02.md) |
| 3 | [Measure, count & takeoff](docs/modules/03-measure-and-count.md) | [Lab 3](docs/labs/lab-03-takeoff.md) | [Quiz 3](docs/quizzes/quiz-03.md) |
| 4 | [Issues & punch lists](docs/modules/04-issues-and-punch.md) | [Lab 4](docs/labs/lab-04-punch-walk.md) | [Quiz 4](docs/quizzes/quiz-04.md) |
| 5 | [RFIs & submittals](docs/modules/05-rfis-and-submittals.md) | [Lab 5](docs/labs/lab-05-rfi.md) | [Quiz 5](docs/quizzes/quiz-05.md) |
| 6 | [Photos, daily reports & revisions](docs/modules/06-photos-reports-revisions.md) | [Lab 6](docs/labs/lab-06-field-day.md) | [Quiz 6](docs/quizzes/quiz-06.md) |
| 7 | [Closeout & as-builts](docs/modules/07-closeout-and-as-builts.md) | [Lab 7](docs/labs/lab-07-as-builts.md) | [Final exam](docs/quizzes/final-exam.md) |
| 8 | [Moving to the real app](docs/modules/08-moving-to-the-real-app.md) | – | – |
| ★ | **3A PlanGrid Project** – daily reports, time sheets, material docs, tasks & RFIs (graded automatically) | [3A Project](docs/labs/3a-plangrid-project.md) | – |
| ★ | Real plan set: AT&T Upper Roof Replacement (plans from your instructor → Sheets → Upload) | – | [AT&T Reroof Blueprint Exercise](docs/quizzes/att-reroof-exercise.md) |
| ★ | Practice plan set: Training Center Roof Replacement (Sheets → 📐 Load practice plans, or the [PDF](app/plans/jatc-training-center-practice-plans.pdf)) | – | [Practice Plan Exercise](docs/quizzes/practice-plans-exercise.md) |

Plus: [Glossary](docs/glossary.md) · [Skills checklist](docs/skills-checklist.md) ·
[Instructor guide](instructor/instructor-guide.md) · Answer keys: private repo `jatc-plangrid-instructor-keys`

Suggested pace: **one 3-hour class** (modules 1–4) + **one 3-hour class** (modules 5–8), or one
module per week in a lab rotation.

---

## Repository layout

```
app/                  Practice web app (plain HTML/CSS/JS – no build step)
  index.html
  css/app.css
  js/util.js          helpers (modals, CSV, dates, feet-inch parsing)
  js/sample-sheets.js generates the drawing set as SVG
  js/store.js         data + browser storage (IndexedDB) + seed project
  js/viewer.js        sheet viewer, markups, measuring, compare, export
  js/views.js         issues, RFIs, submittals, photos, reports, docs, team, settings
  js/training.js      self-checking training missions
  js/app.js           router and navigation
  instructor.html     instructor dashboard / gradebook
  js/instructor.js    loads apprentice backups, gradebook, CSV export
  js/grading.js       auto-grading: answer-key scoring + lab rubrics
  js/quizzes.js       in-app quizzes & worksheets (questions only – answers are private)
docs/                 lessons, labs, quizzes, glossary, feature map
instructor/           instructor guide (answer keys are in a separate private repo)
tests/                automated browser test (Playwright)
.github/workflows/    GitHub Pages deploy
```

## Running the tests (optional, for maintainers)

```bash
npm install
npx playwright install chromium
npm test
```

## Customizing for your JATC

- **Use your own drawings:** upload PDFs in the app, or add sheets in `app/js/sample-sheets.js`.
- **Change the seed project** (team names, RFIs, specs): edit `seedProject()` in `app/js/store.js`.
- **Add missions:** add an entry to `MODULES` in `app/js/training.js` with a `check()` function.
- Bump `VERSION` in `store.js` after changing seed data so browsers load the new sample.

## License

MIT – see [LICENSE](LICENSE). Free for any JATC, apprenticeship program or school to use and adapt.
