# AI project documentation

This folder is the **living reference** for how the Digital Game Sheet app works and what has changed over time. Update these files whenever behaviour or architecture changes.

## Contents

| File | Purpose |
|------|---------|
| [HOW-IT-WORKS.md](HOW-IT-WORKS.md) | Architecture, user flow, modules, business rules |
| [DATA-MODEL.md](DATA-MODEL.md) | `GameState` shape, event types, derived stats |
| [CHANGELOG.md](CHANGELOG.md) | Chronological record of changes (append new entries at top) |

## Quick summary

- **Stack:** Vanilla HTML / CSS / JS (ES modules), no build step required
- **Storage:** Single `GameState` object in `localStorage` (`gamesheet_state`)
- **Pages:** `index.html` (setup) → `game.html` (logging) → `sheet.html` (print)
- **Source of truth for penalty lists:** [`docs/PenaltyTypes.json`](../docs/PenaltyTypes.json) (embedded in `js/data/penalties.js`)
- **Print template reference:** [`docs/Game Sheet Template.pdf`](../docs/Game%20Sheet%20Template.pdf) (EIHA layout)

## Running locally

```bash
npx serve .
```

Open the URL shown (e.g. `http://localhost:3000`). ES modules need a local server; opening files directly via `file://` may fail.

## Tests

```bash
node test/logic-test.mjs
```

Covers roster validation, penalty/PP logic, cumulative game time, and netminder stats.

## For AI agents

When making changes:

1. Read `HOW-IT-WORKS.md` and `DATA-MODEL.md` first.
2. After completing work, add an entry to the top of `CHANGELOG.md` with date, summary, and files touched.
3. Update `HOW-IT-WORKS.md` if flows or rules change materially.
