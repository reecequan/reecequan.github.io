# Changelog

Ongoing record of changes. **New entries go at the top.**

---

## 2026-06-12 — Netminder goals conceded

- Added `computeNetminderStats()` in `js/penalties.js`.
- Print sheet netminder section: one row per goalie **stint** (starter + each swap).
- **Time On:** `0:00` for starting goalie; cumulative game time for swap-ins.
- Period columns show **goals conceded** while that goalie was in net.
- Section title updated to "NETMINDERS — Goals Conceded".
- Tests added for stint attribution after swaps.

**Files:** `js/penalties.js`, `js/sheet.js`, `sheet.html`, `test/logic-test.mjs`

---

## 2026-06-12 — Arena clock MM:SS inputs

- Replaced HTML `time` input (HH:MM:SS) with separate **minutes** and **seconds** number fields.
- Added `splitArenaTime()` / `joinArenaTime()` in `js/penalties.js`.
- Removed `arenaTimeToInput()` / `inputToArenaTime()`.

**Files:** `game.html`, `js/game.js`, `js/penalties.js`, `css/styles.css`, `test/logic-test.mjs`

---

## 2026-06-12 — Goal / pen action buttons with modals

- Removed tabbed forms from game page.
- Added four team buttons: `{Team} — Goal` and `{Team} — Pen` (labels use team names).
- Goal and penalty details open in **modals**; team pre-selected from button.
- Goalie swap kept as secondary link + modal.
- Edit from event log opens the appropriate modal.

**Files:** `game.html`, `js/game.js`, `css/styles.css`

---

## 2026-06-12 — Cumulative game time

- All sheet and event-log times display as **total elapsed game time** (20-min periods).
- Added `toGameTime()`, `PERIOD_LENGTH_MINUTES`, `addMinutesGameTime()`.
- Penalty finalize/expiry calculated in cumulative time.
- `endIsGameTime` flag on finalized penalty end times.

**Files:** `js/penalties.js`, `js/sheet.js`, `js/game.js`, `test/logic-test.mjs`

---

## 2026-06-12 — Penalty column fixes & PP rules

- **Given** column shows time assessed (not period).
- PP goal ends eligible opponent minors; event sort order penalty-before-goal at same clock.
- Completed sheet calculates penalty **End** times from duration + clock direction.
- `startPeriod` / `endPeriod` tracked for segment restarts (2+2, 2+10).

**Files:** `js/penalties.js`, `js/sheet.js`, `test/logic-test.mjs`

---

## 2026-06-12 — Print sheet layout (EIHA template)

- Rebuilt `sheet.html` / `sheet.css` to match EIHA PDF: unified team tables, right sidebar.
- Roster, scoring, and penalty logs aligned per row (23 rows).
- Column widths and readability fixes for player names.
- `colgroup` proportional widths from Excel template.

**Files:** `sheet.html`, `css/sheet.css`, `js/sheet.js`

---

## 2026-06-12 — Initial implementation

- Greenfield vanilla static site for digital EIHA ice hockey game sheets.
- **index.html:** roster setup (22 skaters + 3 goalies), game details, starting goalie modal.
- **game.html:** goals, penalties, goalie swaps, event log with edit/delete.
- **sheet.html:** printable game sheet.
- `localStorage` persistence, penalty engine, goal type suggestions.
- Embedded data from `docs/PenaltyTypes.json` and `docs/GoalTypes.json`.
- `test/logic-test.mjs` for core logic.

**Files:** All project source files, `package.json`, `docs/`
