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
| AT&T Reroof Blueprint Exercise | 20 short answers on the real AT&T plan set, scored by keywords 👁 (model answers shown in the detail view) |
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
