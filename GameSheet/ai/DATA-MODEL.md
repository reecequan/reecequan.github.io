# Data model

## GameState (`localStorage` key: `gamesheet_state`)

```javascript
{
  details: {
    homeTeam: string,
    awayTeam: string,
    date: string,        // HTML date input (YYYY-MM-DD)
    time: string,        // HTML time input (HH:MM)
    venue: string,
    competition: string
  },
  home: TeamRoster,
  away: TeamRoster,
  settings: {
    period: 1 | 2 | 3 | "OT",
    clockDirection: "down" | "up",
    gameTime: string     // last arena clock M:SS e.g. "15:30"
  },
  events: GameEvent[],
  gameStarted: boolean
}
```

## TeamRoster

```javascript
{
  players: [
    { id: string, number: number, name: string, role: "skater" | "goalie" }
  ],
  startingGoalieId: string | null
}
```

## Game events

All events share: `id`, `type`, `team` (`"home"` | `"away"`), `period`, `time` (arena M:SS).

### Goal

```javascript
{
  type: "goal",
  scorerId: string,
  assistIds: string[],   // 0–2 player ids
  goalType: "E" | "SH" | "PPG" | "EN"
}
```

### Penalty

```javascript
{
  type: "penalty",
  playerId: string | null,  // null for BENCH offence
  offence: string,          // abbreviation from PenaltyTypes e.g. "HOOK"
  duration: "2" | "2+2" | "5" | "10" | "2+10",
  coincidental: boolean
}
```

### Goalie swap

```javascript
{
  type: "goalie_swap",
  goalieId: string
}
```

## Penalty types source

Canonical list: [`docs/PenaltyTypes.json`](../docs/PenaltyTypes.json)

Runtime copy: [`js/data/penalties.js`](../js/data/penalties.js) — update both if offences change.

## Goal types source

[`docs/GoalTypes.json`](../docs/GoalTypes.json) → [`js/data/goals.js`](../js/data/goals.js)

## computeGameStats output (summary)

```javascript
{
  playerStats: { "home:<playerId>": { goals, assists, pim } },
  teamStats: { home|away: { goals: [p1,p2,p3,ot], pim: [p1,p2,p3,ot] } },
  totalGoals, totalPim,
  goals[],           // enriched goal events
  penalties[],       // enriched with givenTime, startTime, endTime, pim, offenceLabel
  goalieSwaps,
  activeGoalies,
  activePenalties
}
```

## computeNetminderStats output

```javascript
{
  home: [
    { goalieId, timeOn: "0:00", goalsConceded: [p1, p2, p3, ot] }
  ],
  away: [ /* same */ ]
}
```

One array entry per **stint** (starter + each distinct swap-in).
