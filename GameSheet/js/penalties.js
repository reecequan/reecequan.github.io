import { PENALTY_TYPES } from "./data/penalties.js";

export function getPenaltyPim(duration) {
  switch (duration) {
    case "2": return 2;
    case "2+2": return 4;
    case "5": return 5;
    case "10": return 10;
    case "2+10": return 12;
    default: return 0;
  }
}

export function createsPowerPlay(duration) {
  return duration === "2" || duration === "2+2" || duration === "5" || duration === "2+10";
}

export function canEndOnGoal(duration, minorSegmentActive = true) {
  if (duration === "2" || duration === "2+2") return true;
  if (duration === "2+10" && minorSegmentActive) return true;
  return false;
}

export function getOffenceLabel(abbreviation) {
  const found = PENALTY_TYPES.find((p) => p.abbreviation === abbreviation);
  return found ? found.abbreviation : abbreviation;
}

export const PERIOD_LENGTH_MINUTES = 20;

export function timeToSeconds(time) {
  const [m, s] = time.split(":").map(Number);
  return m * 60 + s;
}

export function secondsToTime(totalSeconds) {
  const secs = Math.max(0, totalSeconds);
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function addMinutes(time, minutes, clockDirection = "down") {
  const secs = timeToSeconds(time);
  const delta = minutes * 60;
  const result = clockDirection === "down" ? secs - delta : secs + delta;
  return secondsToTime(result);
}

export function addMinutesGameTime(gameTime, minutes) {
  return secondsToTime(timeToSeconds(gameTime) + minutes * 60);
}

export function periodOffsetMinutes(period) {
  if (period === "OT") return 3 * PERIOD_LENGTH_MINUTES;
  return (Number(period) - 1) * PERIOD_LENGTH_MINUTES;
}

/** Convert period clock time to cumulative game time (e.g. P2 1:10 → 21:10). */
export function toGameTime(period, time, clockDirection = "down") {
  if (!time) return "";
  const periodOffsetSecs = periodOffsetMinutes(period) * 60;
  let elapsedInPeriod = timeToSeconds(time);
  if (clockDirection === "down") {
    elapsedInPeriod = PERIOD_LENGTH_MINUTES * 60 - elapsedInPeriod;
  }
  return secondsToTime(periodOffsetSecs + elapsedInPeriod);
}

/** Convert cumulative game time back to period and arena clock. */
export function fromGameTime(gameTime, clockDirection = "down") {
  const totalSecs = timeToSeconds(gameTime);
  const periodLengthSecs = PERIOD_LENGTH_MINUTES * 60;
  const otStartSecs = 3 * periodLengthSecs;

  let period;
  let elapsedInPeriod;

  if (totalSecs >= otStartSecs) {
    period = "OT";
    elapsedInPeriod = totalSecs - otStartSecs;
  } else {
    const periodIndex = Math.floor(totalSecs / periodLengthSecs);
    period = periodIndex + 1;
    elapsedInPeriod = totalSecs % periodLengthSecs;
  }

  const arenaSecs = clockDirection === "down"
    ? periodLengthSecs - elapsedInPeriod
    : elapsedInPeriod;

  return { period, time: secondsToTime(arenaSecs) };
}

function createActivePenalty(event) {
  const segments = event.duration === "2+2" ? 2 : 1;

  return {
    eventId: event.id,
    team: event.team,
    playerId: event.playerId,
    duration: event.duration,
    coincidental: !!event.coincidental,
    segmentsRemaining: segments,
    minorActive: event.duration === "2+10" ? true : createsPowerPlay(event.duration),
    terminated: false,
    period: event.period,
    segmentPeriod: event.period,
    segmentStartTime: event.time,
    endTime: null
  };
}

function countPPMinors(active, team) {
  return active.filter((p) => {
    if (p.team !== team || p.terminated) return false;
    if (p.coincidental) return false;
    if (p.duration === "10") return false;
    if (p.duration === "2+10" && !p.minorActive) return false;
    if (p.duration === "5") return true;
    if (p.segmentsRemaining > 0 && createsPowerPlay(p.duration)) return true;
    return false;
  }).length;
}

export function getPowerPlayTeam(active) {
  const homeMinors = countPPMinors(active, "home");
  const awayMinors = countPPMinors(active, "away");
  if (homeMinors > awayMinors) return "away";
  if (awayMinors > homeMinors) return "home";
  return null;
}

export function suggestGoalType(active, scoringTeam, manualType = null) {
  if (manualType === "EN") return "EN";
  const ppTeam = getPowerPlayTeam(active);
  if (ppTeam === scoringTeam) return "PPG";
  if (ppTeam && ppTeam !== scoringTeam) return "SH";
  return manualType || "E";
}

function terminatePenalty(penalty, endTime) {
  penalty.terminated = true;
  penalty.endTime = endTime;
  penalty.segmentsRemaining = 0;
  penalty.minorActive = false;
}

function getRemainingMinutes(active) {
  switch (active.duration) {
    case "2":
      return 2;
    case "2+2":
      return active.segmentsRemaining * 2;
    case "5":
      return 5;
    case "10":
      return 10;
    case "2+10":
      return active.minorActive ? 12 : 10;
    default:
      return 0;
  }
}

export function calculatePenaltyExpiry(active, clockDirection) {
  const minutes = getRemainingMinutes(active);
  const startGameTime = toGameTime(active.segmentPeriod, active.segmentStartTime, clockDirection);
  return addMinutesGameTime(startGameTime, minutes);
}

function syncPenaltyRecord(penRecord, active) {
  penRecord.startTime = active.segmentStartTime;
  penRecord.startPeriod = active.segmentPeriod;
  if (active.terminated && active.endTime && !penRecord.endTime) {
    penRecord.endTime = active.endTime;
    penRecord.endPeriod = active.endPeriod;
  }
}

function advancePenaltySegment(active, penRecord, expiryGameTime, clockDirection) {
  const { period, time } = fromGameTime(expiryGameTime, clockDirection);
  active.segmentStartTime = time;
  active.segmentPeriod = period;
  if (penRecord) {
    penRecord.startTime = time;
    penRecord.startPeriod = period;
  }
}

function expirePenaltiesByTime(activePenalties, eventPeriod, eventTime, clockDirection, penalties) {
  const eventGameSeconds = timeToSeconds(toGameTime(eventPeriod, eventTime, clockDirection));

  for (const active of activePenalties) {
    if (active.terminated) continue;

    while (!active.terminated) {
      const expiryGameTime = calculatePenaltyExpiry(active, clockDirection);
      const expiryGameSeconds = timeToSeconds(expiryGameTime);
      if (eventGameSeconds < expiryGameSeconds) break;

      const penRecord = penalties.find((p) => p.id === active.eventId);
      const { period: expiryPeriod, time: expiryArenaTime } = fromGameTime(expiryGameTime, clockDirection);

      if (active.duration === "2+2" && active.segmentsRemaining === 2) {
        active.segmentsRemaining = 1;
        advancePenaltySegment(active, penRecord, expiryGameTime, clockDirection);
        continue;
      }

      if (active.duration === "2+10" && active.minorActive) {
        active.minorActive = false;
        advancePenaltySegment(active, penRecord, expiryGameTime, clockDirection);
        continue;
      }

      terminatePenalty(active, expiryArenaTime);
      active.endPeriod = expiryPeriod;
      if (penRecord) {
        penRecord.endTime = expiryGameTime;
        penRecord.endIsGameTime = true;
        penRecord.endPeriod = expiryPeriod;
      }
    }
  }
}

function terminateEligiblePenalty(active, opponentTeam, endTime, endPeriod, penalties) {
  const eligible = active
    .filter((p) => {
      if (p.team !== opponentTeam || p.terminated || p.coincidental) return false;
      if (p.duration === "5" || p.duration === "10") return false;
      if (p.duration === "2+10" && !p.minorActive) return false;
      return canEndOnGoal(p.duration, p.minorActive);
    })
    .sort((a, b) => timeToSeconds(a.segmentStartTime) - timeToSeconds(b.segmentStartTime));

  if (!eligible.length) return null;

  const target = eligible[0];
  const penRecord = penalties.find((p) => p.id === target.eventId);

  if (target.duration === "2+2" && target.segmentsRemaining === 2) {
    target.segmentsRemaining = 1;
    target.segmentStartTime = endTime;
    target.segmentPeriod = endPeriod;
    if (penRecord) {
      penRecord.startTime = endTime;
      penRecord.startPeriod = endPeriod;
    }
    return target;
  }

  if (target.duration === "2+10") {
    target.minorActive = false;
    target.segmentStartTime = endTime;
    target.segmentPeriod = endPeriod;
    if (penRecord) {
      penRecord.startTime = endTime;
      penRecord.startPeriod = endPeriod;
    }
    return target;
  }

  terminatePenalty(target, endTime);
  if (penRecord) {
    penRecord.endTime = endTime;
    penRecord.endPeriod = endPeriod;
    penRecord.endedEarly = true;
    penRecord.startTime = target.segmentStartTime;
    penRecord.startPeriod = target.segmentPeriod;
  }
  return target;
}

function periodIndex(period) {
  if (period === "OT") return 3;
  return Number(period) - 1;
}

const EVENT_SORT_ORDER = { penalty: 0, goal: 1, goalie_swap: 2 };

export function computeGameStats(state, options = {}) {
  const { finalizePenalties = false } = options;
  const clockDirection = state.settings?.clockDirection || "down";

  const playerStats = {};
  const initTeamStats = () => ({ goals: [0, 0, 0, 0], pim: [0, 0, 0, 0] });

  const teamStats = { home: initTeamStats(), away: initTeamStats() };
  const goals = [];
  const penalties = [];
  const goalieSwaps = { home: [], away: [] };
  let activeGoalies = {
    home: state.home.startingGoalieId,
    away: state.away.startingGoalieId
  };

  function ensurePlayer(team, playerId) {
    const key = `${team}:${playerId}`;
    if (!playerStats[key]) {
      playerStats[key] = { goals: 0, assists: 0, pim: 0 };
    }
    return playerStats[key];
  }

  const sortedEvents = [...state.events].sort((a, b) => {
    const pa = periodIndex(a.period);
    const pb = periodIndex(b.period);
    if (pa !== pb) return pa - pb;
    const timeCmp = compareTime(a.time, b.time, clockDirection);
    if (timeCmp !== 0) return timeCmp;
    return EVENT_SORT_ORDER[a.type] - EVENT_SORT_ORDER[b.type];
  });

  const activePenalties = [];

  for (const event of sortedEvents) {
    expirePenaltiesByTime(activePenalties, event.period, event.time, clockDirection, penalties);

    const pi = periodIndex(event.period);

    if (event.type === "penalty") {
      const pim = getPenaltyPim(event.duration);
      if (event.playerId) {
        const stats = ensurePlayer(event.team, event.playerId);
        stats.pim += pim;
      }
      teamStats[event.team].pim[pi] += pim;

      const active = createActivePenalty(event);
      activePenalties.push(active);

      penalties.push({
        ...event,
        pim,
        offenceLabel: getOffenceLabel(event.offence),
        givenTime: event.time,
        startTime: event.time,
        startPeriod: event.period,
        endTime: null,
        endPeriod: null
      });
    }

    if (event.type === "goal") {
      const ppBefore = getPowerPlayTeam(activePenalties);
      const goalType = event.goalType || suggestGoalType(activePenalties, event.team);

      const scorerStats = ensurePlayer(event.team, event.scorerId);
      scorerStats.goals += 1;
      teamStats[event.team].goals[pi] += 1;

      (event.assistIds || []).forEach((aid) => {
        if (aid) {
          const astStats = ensurePlayer(event.team, aid);
          astStats.assists += 1;
        }
      });

      if (ppBefore === event.team) {
        const opponent = event.team === "home" ? "away" : "home";
        terminateEligiblePenalty(activePenalties, opponent, event.time, event.period, penalties);
      }

      goals.push({ ...event, goalType });
    }

    if (event.type === "goalie_swap") {
      activeGoalies[event.team] = event.goalieId;
      goalieSwaps[event.team].push({
        ...event,
        goalieId: event.goalieId
      });
    }
  }

  for (const p of penalties) {
    const active = activePenalties.find((a) => a.eventId === p.id);
    if (active) {
      syncPenaltyRecord(p, active);
    }
  }

  if (finalizePenalties) {
    for (const p of penalties) {
      const active = activePenalties.find((a) => a.eventId === p.id);
      if (!active || active.terminated) continue;
      if (!p.endTime) {
        p.endTime = calculatePenaltyExpiry(active, clockDirection);
        p.endIsGameTime = true;
        p.finalized = true;
      }
    }
  }

  const totalGoals = {
    home: teamStats.home.goals.reduce((a, b) => a + b, 0),
    away: teamStats.away.goals.reduce((a, b) => a + b, 0)
  };

  const totalPim = {
    home: teamStats.home.pim.reduce((a, b) => a + b, 0),
    away: teamStats.away.pim.reduce((a, b) => a + b, 0)
  };

  return {
    playerStats,
    teamStats,
    totalGoals,
    totalPim,
    goals,
    penalties,
    goalieSwaps,
    activeGoalies,
    activePenalties: activePenalties.filter((p) => !p.terminated)
  };
}

export function compareTime(a, b, direction = "down") {
  const sa = timeToSeconds(a);
  const sb = timeToSeconds(b);
  return direction === "down" ? sb - sa : sa - sb;
}

export function validateTime(time) {
  return /^\d{1,2}:\d{2}$/.test(time);
}

/** Split arena clock M:SS into minutes and seconds parts. */
export function splitArenaTime(time) {
  if (!time) return { minutes: "", seconds: "" };
  const [m, s = "0"] = time.split(":");
  return { minutes: String(Number(m)), seconds: String(Number(s)).padStart(2, "0") };
}

/** Combine minutes and seconds into arena clock M:SS. */
export function joinArenaTime(minutes, seconds) {
  if (minutes === "" || seconds === "") return "";
  const m = Number(minutes);
  const s = Number(seconds);
  if (Number.isNaN(m) || Number.isNaN(s) || s < 0 || s > 59) return "";
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function getActivePenaltiesAtEvent(state, beforeEventId = null) {
  const events = beforeEventId
    ? state.events.filter((e) => e.id !== beforeEventId)
    : state.events;

  const tempState = { ...state, events };
  return computeGameStats(tempState).activePenalties;
}

function sortEventsChronologically(events, clockDirection) {
  return [...events].sort((a, b) => {
    const pa = periodIndex(a.period);
    const pb = periodIndex(b.period);
    if (pa !== pb) return pa - pb;
    const timeCmp = compareTime(a.time, b.time, clockDirection);
    if (timeCmp !== 0) return timeCmp;
    return EVENT_SORT_ORDER[a.type] - EVENT_SORT_ORDER[b.type];
  });
}

function createStint(goalieId, timeOn) {
  return {
    goalieId,
    timeOn,
    timeOnSeconds: timeToSeconds(timeOn),
    goalsConceded: [0, 0, 0, 0]
  };
}

function activeStintIndex(stints, gameSeconds) {
  let idx = 0;
  for (let i = 0; i < stints.length; i++) {
    if (stints[i].timeOnSeconds <= gameSeconds) idx = i;
  }
  return idx;
}

/** Build netminder stints with time on and goals conceded per period. */
export function computeNetminderStats(state) {
  const clockDirection = state.settings?.clockDirection || "down";
  const result = { home: [], away: [] };

  for (const teamKey of ["home", "away"]) {
    const opponent = teamKey === "home" ? "away" : "home";
    const startingId = state[teamKey].startingGoalieId;
    if (!startingId) continue;

    const stints = [createStint(startingId, "0:00")];

    const swaps = sortEventsChronologically(
      state.events.filter((e) => e.type === "goalie_swap" && e.team === teamKey),
      clockDirection
    );

    for (const swap of swaps) {
      if (swap.goalieId === stints[stints.length - 1].goalieId) continue;
      stints.push(
        createStint(swap.goalieId, toGameTime(swap.period, swap.time, clockDirection))
      );
    }

    const goalsAgainst = sortEventsChronologically(
      state.events.filter((e) => e.type === "goal" && e.team === opponent),
      clockDirection
    );

    for (const goal of goalsAgainst) {
      const gameSeconds = timeToSeconds(
        toGameTime(goal.period, goal.time, clockDirection)
      );
      const idx = activeStintIndex(stints, gameSeconds);
      const pi = periodIndex(goal.period);
      stints[idx].goalsConceded[pi] += 1;
    }

    result[teamKey] = stints;
  }

  return result;
}
