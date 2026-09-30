# Instructor Guide

## Course at a glance
| | |
|---|---|
| Audience | Roofer & waterproofer apprentices – taught in the **specs & blueprint weeks** of Exhibit C (default: **Week 3A – Advanced Specs, Blueprints & Details**) |
| Length | 2 × 3-hour sessions, or 8 × ~45-minute lab rotations |
| Equipment | Any laptop/Chromebook/tablet with a modern browser. Tablets are ideal for the punch walk. |
| Internet | Only needed to load the app from GitHub Pages and to open PDFs. Once loaded it works offline. |
| Prerequisite | Basic blueprint reading (scales, symbols) helps but isn't required. |

## Where this course fits – JATC Standards, Exhibit C (Curriculum Outline, rev. 2016)
Apprentices pick their class under **Settings → Class (curriculum week)**. The list comes from
Exhibit C; the specs & blueprint weeks are listed first and **Week 3A** is the default. The
Instructor Dashboard can filter the gradebook by class.

| Exhibit C week / class | Topics in the standards | Covered by |
|---|---|---|
| **3A – Advanced Specs, Blueprints & Details** | Class 1 Math, perimeter & areas, roofing/waterproofing formulas · Class 2 Blueprint reading, details · Class 3 Specifications, taper system layout | Modules 1–3 & 5, Labs 1–3 & 5 (R-102 tapered plan, RTU-4 conflict) |
| **3B – Roofing Specs & Details** | Class 1 TPO specifications, perimeter & areas, job setup · Classes 2–3 spec group presentations | Spec 07 54 23, R-101/R-501/R-601, Lab 3, Module 5 (RFIs & submittals) |
| **3C – Waterproofing Specs & Details** | Waterproofing specs, horizontal/vertical applications, estimating | Spec 07 13 26, W-101/W-501, Lab 3 Part F |
| 2B – Single Ply Systems, Classes 4–5 | Flashing details, specifications, plans & specs, blueprint reading, basic math | Modules 1–3 (intro level) |
| 4B – Service & Blueprints, Classes 3–5 | Spec & blueprint comprehension, ratios & scales | Modules 1, 3, 5 (review / refresher) |

Not covered here (hands-on in the shop): pavers & pedestals, laser operation, the Green Manual.

## Answer keys
Answer keys are **not** in this public repo. They live in the separate private repo
**`jatc-plangrid-instructor-keys`** so apprentices can't look them up. Ask the program
coordinator for access.

## Setup (one time, ~10 minutes)
1. Push this repo to your JATC's GitHub account.
2. **Settings → Pages → Source: GitHub Actions.** Wait for the green check under **Actions**.
3. Open the Pages URL and bookmark/QR-code it for the class.
4. Print the [skills checklist](../docs/skills-checklist.md) and the lab worksheets.

No accounts, no licenses, no student data leaves the device. Each apprentice's work is stored in
their own browser.

## Session plan

### Session 1 (3 hrs)
| Time | Activity |
|---|---|
| 0:00 | Why plan software? A paper set on a windy roof vs. a tablet. Building off an old revision = tear-off. |
| 0:15 | Module 1 demo → apprentices set their name and do **Lab 1** |
| 0:55 | Module 2 demo → **Lab 2** |
| 1:35 | Break |
| 1:45 | Module 3 demo (calibrate live, squares, rolls) → **Lab 3** takeoff |
| 2:35 | Module 4 demo → start **Lab 4** punch walk (Option A on the mock-up if possible) |
| 2:55 | Apprentices **Export backup** and turn it in |

### Session 2 (3 hrs)
| Time | Activity |
|---|---|
| 0:00 | Finish Lab 4, review quizzes 1–4 |
| 0:30 | Module 5 → **Lab 5** RFI (pairs – one plays the architect) |
| 1:15 | Module 6 → **Lab 6** day on the roof |
| 2:00 | Break |
| 2:10 | Module 7 → **Lab 7** as-builts |
| 2:40 | Module 8: your contractors' apps, tablets on the roof, etiquette |
| 2:50 | Print training records (Training Missions → Progress report); sign checklists |

## Collecting and grading work (automatic)
Almost everything is graded automatically. Apprentice data never leaves their device unless
they send it, so grading works by file:

1. Apprentices do the labs in the app and answer every quiz, lab worksheet and the written final
   under **Quizzes & Worksheets** in the app.
2. They click **Settings → Export backup (.json)** and send you the file (email, shared
   Google Drive/OneDrive folder, LMS, or USB).
3. Open the **Instructor Dashboard** (Settings → *Open Instructor Dashboard*, or `…/instructor.html`).
   Drop in **all** the apprentice files plus **`grading-key.json`** from the private
   `jatc-plangrid-instructor-keys` repo. The key is remembered in that browser.
4. The dashboard scores:

| Assessment | How it's graded |
|---|---|
| Quizzes 1–6 | Answer key (multiple choice, select-all with partial credit, numbers with tolerance, short answers by keywords 👁) |
| Lab 1 | Worksheet vs. answer key |
| Lab 2 | Rubric from their markups (clouds, layers, stamps, hyperlink, exports) |
| Lab 3 | Takeoff worksheet vs. key + their actual measurements in the app |
| Lab 4 | Rubric from their punch items (count, pins, specific titles, assignee/due/priority, photos, closed with comments, CSV export) |
| Lab 5 | Conflict worksheet vs. key + RFI rubric (subject, references, suggestion, impacts, sent/assigned) + submittal + SEE RFI stamp |
| Lab 6 | Rubric from toolbox talk, JHA, photos, inspection request, daily report + compare worksheet |
| Lab 7 | Rubric from as-built markups, dimensions, RFI reference, AS-BUILT stamps, exports |
| 3A PlanGrid Project | Rubric (100 pts) from their project: 5 daily reports with work/material/equipment logs, notes & photos · material documents uploaded · a time sheet for each day · 3 tasks (assigned, you watching, photo, delay/cost, published markups) · 3 RFIs to Juan Rodarte (sent & due dates, published markups) |
| AT&T Reroof Blueprint Exercise | 20 short answers on the real AT&T plan set, scored by keywords 👁 (model answers shown in the detail view) |
| Practice Plan Exercise | Same 20 questions on the Training Center practice set, scored by keywords 👁 |
| Final | Written part vs. key + practical rubric from their project |
| Training missions | All 32 re-checked from their actual work |

5. Only glance at items marked **👁** (short written answers scored by keywords) and read RFIs
   if you want. Type an **override** for any score you disagree with.
6. **Export gradebook CSV** for your records or LMS.

Nothing is uploaded; files are read in your browser only. Overrides and notes are remembered in
that browser – export the CSV to keep a permanent copy.

**Changing questions:** questions live in `app/js/quizzes.js` (public); answers live in
`grading-key.json` (private). If you edit one, update the other with the same question ids.
Never list the correct choice in the same position every time – each apprentice also sees the
choices in their own shuffled order, so "the answer is B" can't be shared.

**Keeping the key safe:** grade on your own computer. The dashboard remembers the key in that
browser – click **Forget key** when you're done on any shared computer.

## 3A PlanGrid Project
Hand-out: [docs/labs/3a-plangrid-project.md](../docs/labs/3a-plangrid-project.md). Apprentices can use the
sample project or create their own (**Settings → New project**, **Sheets → Upload** real plans).
**Juan Rodarte (Instructor)** is on the team of every project automatically, so they can assign RFIs to you
and add you as a watcher. The dashboard grades the apprentice's best project (column **3A Proj**); labs are
still graded on the sample project.

**Team projects (2–4 apprentices):** apprentices use **Team Project** in the app – one starts it and sends a
*team file*, the others join with it, then they swap team files to combine work (works offline, no accounts).
Optional **live sync** makes changes appear on teammates' devices by themselves – one-time setup in
[live-sync-setup.md](live-sync-setup.md). In the dashboard, load **all** teammates' backups: their copies are
combined automatically, every member gets the **team score**, and the 3A detail shows **who did what** –
adjust anyone who didn't contribute with an override.

**Answering their RFIs (RFI inbox):**
1. Drop the apprentices' backup files into the Instructor Dashboard.
2. Click **📨 RFI inbox** (top right – it shows how many are waiting). Every RFI sent to Juan Rodarte is listed
   with the question, suggested solution, sheets, sent/due dates and cost/schedule impact. Overdue ones are flagged.
   (Also in each apprentice's detail view.)
3. Type your answer under each RFI – it's saved in that browser as you type.
4. Click **⤓ Download answers file** and send that **one file to the whole class** (email, LMS, shared drive).
5. Apprentices open **RFIs → ⤒ Import instructor answers** (or Settings → Import). Only their own RFIs are
   updated to **Answered** with your answer, name and date. You can answer more later and send a new file.

To see their markups on the plans, use **Open full project in app** in the apprentice's detail view (on your
own computer – it replaces the project stored in that browser).

Their backup file includes their photos and uploaded documents, so it can be several MB – use email
attachments or a shared drive.

## AT&T Reroof Blueprint Exercise (real plan set)
A 20-question exercise on a real bid set – *AT&T Upper Roof Replacement, 217 W. Acequia Ave, Visalia*
(11 sheets). Good for **Week 3A** (blueprints & details) and **3B** (roofing specs & details).

- **The plans are not on the public site.** Every sheet is stamped *"Proprietary AT&T information – not
  for general use or disclosure outside AT&T"*, so the PDF lives in the private
  `jatc-plangrid-instructor-keys` repo (`plans/`). Hand it out through your LMS, a shared drive or
  print it; apprentices load it in the app with **Sheets → Upload**. Don't post it publicly.
- Apprentices answer in the app (**Quizzes & Worksheets → AT&T Reroof Blueprint Exercise**) or on the
  printable [worksheet](../docs/quizzes/att-reroof-exercise.md).
- Answers and sheet references: `answer-keys.md` in the private repo. The dashboard scores by keywords
  and shows the model answer next to each response – #8, #9 and #20 are open-ended, so read them and
  override as needed.

## Training Center practice plan set (made-up project at the JATC)
The same 20 questions as the AT&T exercise, on an 11-sheet practice set drawn for this class:
*Training Center Roof Replacement, 5537 E. Lamona Ave. #1, Fresno* (made-up consultants and companies;
roof photos on A502 are JATC photos, with some equipment added digitally for training).

- **Getting the plans to apprentices** – use any of these:
  1. **In the app (easiest):** **Sheets → 📐 Load practice plans**. One tap downloads the set from the training
     site and adds all 11 sheets as their own project (*Training Center Roof Replacement (practice plans)*).
     In an empty team project the sheets go into that project, so every teammate taps the button once.
  2. **PDF link / QR code:** `…/jatc-plangrid-training/plans/jatc-training-center-practice-plans.pdf`
     (on the QR code sheet). Apprentices can also load it with **Sheets → Upload**.
  3. **Hand out / print:** e-mail or LMS the PDF, or print it on 36"×24" (ARCH D) – it is drawn to scale at that size.
- Apprentices answer under **Quizzes & Worksheets → Training Center Reroof – Practice Plan Exercise** (or the
  printable [worksheet](../docs/quizzes/practice-plans-exercise.md)). The dashboard grades it in the **Practice**
  column once `grading-key.json` is loaded.
- The practice set is also a good choice for the **3A PlanGrid Project** – RFIs, tasks and daily reports on a
  real-looking bid set instead of the sample drawings.
- Answers with sheet references: `answer-keys.md` (private repo) → *Training Center Reroof – practice plan set*,
  and the Word file *JATC Training Center Reroof – Answer Key (INSTRUCTOR)*. Read #8, #9 and #20 – they are open-ended.

## Tips
- Project the app with the browser zoomed to 125%.
- Calibrate *wrong* on purpose first (type 60' instead of 100') and measure the roof – let them see
  what a bad scale does to a bid.
- Lab 4 Option A: plant 6–10 real defects on the shop mock-up and hand out seam probes.
- Lab 5 is the most valuable lab: the RTU-4 curb doesn't leave room for 8" of flashing once the
  taper, flat insulation and cover board are added. Let stronger apprentices find it on their own.
- Use real (non-confidential) roof plans from a past job: **Sheets → Upload** accepts multi-page
  PDFs. Remove client names first.

## Resetting
**Settings → Reset training data** restores the sample project in that browser.

## Customizing
See the README "Customizing for your JATC" section. Everything is plain HTML/JS – no build tools.
