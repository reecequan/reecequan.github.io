import {
  computeGameStats,
  computeNetminderStats,
  getPenaltyPim,
  toGameTime,
  splitArenaTime,
  joinArenaTime
} from "../js/penalties.js";
import { validatePlayer, sortPlayers } from "../js/roster.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

// Roster validation
const players = [{ id: "1", number: 10, name: "A", role: "skater" }];
assert(validatePlayer(players, { number: 10, name: "B", role: "skater" }).length > 0, "duplicate number");
assert(sortPlayers([{ number: 22 }, { number: 3 }])[0].number === 3, "sort order");

assert(toGameTime(2, "1:10", "up") === "21:10", "cumulative game time period 2");
assert(toGameTime(1, "1:10", "up") === "1:10", "cumulative game time period 1");
assert(toGameTime(2, "18:50", "down") === "21:10", "countdown converts to cumulative");
assert(splitArenaTime("15:30").minutes === "15" && splitArenaTime("15:30").seconds === "30", "split time");
assert(joinArenaTime(15, 30) === "15:30", "join time");
assert(joinArenaTime(1, 10) === "1:10", "join single digit minutes");

const state = {
  details: { homeTeam: "H", awayTeam: "A" },
  home: {
    players: [
      { id: "h1", number: 9, name: "Scorer", role: "skater" },
      { id: "h2", number: 7, name: "Assist", role: "skater" }
    ],
    startingGoalieId: null
  },
  away: {
    players: [{ id: "a1", number: 4, name: "Penalized", role: "skater" }],
    startingGoalieId: null
  },
  settings: { period: 1, clockDirection: "down" },
  events: [
    {
      id: "p1",
      type: "penalty",
      team: "away",
      period: 1,
      time: "15:00",
      playerId: "a1",
      offence: "HOOK",
      duration: "2",
      coincidental: false
    },
    {
      id: "g1",
      type: "goal",
      team: "home",
      period: 1,
      time: "14:30",
      scorerId: "h1",
      assistIds: ["h2"],
      goalType: "PPG"
    }
  ]
};

const stats = computeGameStats(state);
assert(stats.totalGoals.home === 1, "home scored once");
assert(stats.playerStats["home:h1"].goals === 1, "scorer goal");
assert(stats.playerStats["home:h2"].assists === 1, "assist counted");
assert(stats.penalties[0].endedEarly === true, "PP goal ends minor");
assert(stats.penalties[0].endTime === "14:30", "PP goal sets penalty end time");
assert(stats.penalties[0].givenTime === "15:00", "given time is assessment time");
assert(getPenaltyPim("2+10") === 12, "pim calc");

const openPenState = {
  ...state,
  events: [state.events[0]]
};
const finalized = computeGameStats(openPenState, { finalizePenalties: true });
assert(finalized.penalties[0].endIsGameTime === true, "finalized end is game time");
assert(finalized.penalties[0].endTime === "7:00", "2 min pen at 15:00 countdown ends at 7:00 game time");

const netminderState = {
  details: { homeTeam: "H", awayTeam: "A" },
  home: {
    players: [
      { id: "hg1", number: 1, name: "Starter", role: "goalie" },
      { id: "hg2", number: 30, name: "Backup", role: "goalie" }
    ],
    startingGoalieId: "hg1"
  },
  away: {
    players: [{ id: "ag1", number: 1, name: "Away G", role: "goalie" }],
    startingGoalieId: "ag1"
  },
  settings: { period: 1, clockDirection: "up" },
  events: [
    {
      id: "g1",
      type: "goal",
      team: "away",
      period: 1,
      time: "5:00",
      scorerId: "x",
      assistIds: [],
      goalType: "E"
    },
    {
      id: "sw1",
      type: "goalie_swap",
      team: "home",
      period: 2,
      time: "2:00",
      goalieId: "hg2"
    },
    {
      id: "g2",
      type: "goal",
      team: "away",
      period: 2,
      time: "10:00",
      scorerId: "x",
      assistIds: [],
      goalType: "E"
    }
  ]
};

const netminder = computeNetminderStats(netminderState);
assert(netminder.home.length === 2, "home has starter and backup rows");
assert(netminder.home[0].timeOn === "0:00", "starter time on");
assert(netminder.home[0].goalsConceded[0] === 1, "goal against starter in P1");
assert(netminder.home[1].timeOn === "22:00", "backup time on in P2");
assert(netminder.home[1].goalsConceded[1] === 1, "goal against backup in P2");
assert(netminder.home[0].goalsConceded[1] === 0, "starter not charged P2 goal after swap");

console.log("All logic tests passed.");
