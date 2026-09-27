# Module 3 – Measure, Count & Takeoff

**Time:** 60 min · **App missions:** Module 3 (5 missions) · **Lab:** [Lab 3 – Roof & Waterproofing Takeoff](../labs/lab-03-takeoff.md)

## Objectives
- Explain drawing **scale** and why a PDF must be **calibrated**.
- Calibrate a sheet using a known dimension.
- Measure straight lengths, multi-segment runs and areas.
- Convert square feet to **roofing squares** and count penetrations, drains and curbs.
- Turn measurements into a material takeoff (membrane rolls, insulation boards, flashing,
  waterproofing rolls) with waste.

## Scale, in one minute
A plan drawn at **1/4" = 1'-0"** means every 1/4 inch on the printed 36×24 sheet equals 1 foot on
the roof. On a screen there are no inches – the app needs to know how many *screen units* equal one
foot. That's **calibration**.

- Roof plans: usually 1/8" or 1/4" = 1'-0". Details: 1-1/2" or 3" = 1'-0".
- Schedules and many details are **NTS (not to scale)** – don't measure them.
- **Half-size prints (11×17) are half scale** – a 1/4" plan becomes 1/8".

## Calibrate
1. Open **R-101 Roof Plan**. Find the overall dimension **100'-0"** above the roof.
2. Press `K` (Calibrate). Drag from one end tick of that dimension to the other.
3. Enter `100'-0"`.
4. **Check it:** measure the **64'-0"** side. It should be within a few inches.

## Measure
| Tool | Key | How |
|---|---|---|
| 📏 Length | `M` | Drag from point to point |
| 〰 Path | `U` | Click each corner (e.g. around a parapet), double-click or Enter to finish |
| ⬠ Area | `G` | Click each corner, double-click or click the first point to close |
| # Count | `N` | Click each item, press Enter, name the count |

Zoom in close before clicking corners – accuracy depends on where you click.

## Roofing math
**1 square = 100 SF.** Roofing is bid, bought and paid in squares.

```
Squares          = area (SF) ÷ 100
Membrane (sq)    = squares × (1 + waste)          waste ≈ 10% for laps, flashings, cut-offs
Rolls            = membrane SF ÷ roll size        (a 10' × 100' roll = 1,000 SF = 10 sq)
Insulation board = area ÷ 32 SF (4'×8' board) × layers, + 5% waste
Perimeter flashing (LF) = length of parapet walls (inside face)
```

**Example – Roof Area B** (40' × 64'):
- Area = **2,560 SF = 25.6 squares**
- Membrane with 10% = 28.2 sq = 2,816 SF → **3 rolls** of 10' × 100'
- 2 layers flat 4'×8' polyiso: 2,560 ÷ 32 = 80 per layer × 2 = 160 → +5% = **168 boards**

**Below-grade walls** – area = perimeter × height:
Basement on W-101 is 60' × 40', wall 12' high → 200 LF × 12' = **2,400 SF**.
+10% for laps/corners = 2,640 SF ÷ 200 SF rolls = **14 rolls** (13.2 → round up).

Always round **rolls, boards and boxes UP**.

## Count
Count every **pipe penetration**, **curb**, **drain** and **scupper** – each one needs a boot,
flashing kit, or clamping ring, and each one is a leak point if it's missed.

## In PlanGrid / Autodesk Build and other apps
- PlanGrid/Autodesk Build: measure tools on the sheet toolbar; calibrate once per sheet.
- **Bluebeam Revu** is the estimator's favorite for roofing takeoff – same ideas: calibrate,
  area, perimeter, count, and a *Markups List* that totals it into a spreadsheet.
- Satellite-based tools (roof measurement reports) are common for reroofs – field-verify them.

## Check yourself
1. Why can't you measure on R-601?
2. How many squares is a 100' × 64' roof?
3. A roof area measures 3,840 SF. With 10% waste, how many 10' × 100' rolls?
4. After calibrating, what's a quick way to check it's right?

➡ Do [Lab 3](../labs/lab-03-takeoff.md), then take [Quiz 3](../quizzes/quiz-03.md).
