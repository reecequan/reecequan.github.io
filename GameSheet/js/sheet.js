import { loadState } from "./storage.js";
import { sortPlayers, getPlayerById } from "./roster.js";
import { computeGameStats, computeNetminderStats, toGameTime } from "./penalties.js";

const ROW_COUNT = 23;

const state = loadState();
const clockDirection = state.settings?.clockDirection || "down";

if (!state.gameStarted) {
  window.location.href = "index.html";
}

const stats = computeGameStats(state, { finalizePenalties: true });
const netminderStats = computeNetminderStats(state);

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text ?? "";
  return div.innerHTML;
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return `${parts[2]} / ${parts[1]} / ${parts[0]}`;
  }
  return dateStr;
}

function formatTime(timeStr) {
  if (!timeStr) return "";
  return timeStr.slice(0, 5);
}

function displayGameTime(period, time) {
  if (!time) return "";
  return toGameTime(period, time, clockDirection);
}

function displayPenaltyEnd(pen) {
  if (!pen.endTime) return "";
  if (pen.endIsGameTime) return pen.endTime;
  return displayGameTime(pen.endPeriod || pen.period, pen.endTime);
}

function getPlayerLineStats(team, player) {
  const key = `${team}:${player.id}`;
  return stats.playerStats[key] || { goals: 0, assists: 0, pim: 0 };
}

function renderTeamRows(teamKey) {
  const players = sortPlayers(state[teamKey].players);
  const teamGoals = stats.goals.filter((g) => g.team === teamKey);
  const teamPens = stats.penalties.filter((p) => p.team === teamKey);
  const rows = [];

  for (let i = 0; i < ROW_COUNT; i++) {
    const player = players[i];
    const goal = teamGoals[i];
    const pen = teamPens[i];

    let rosterCells = "<td></td><td class='player-col'></td><td></td><td></td><td></td>";
    if (player) {
      const ps = getPlayerLineStats(teamKey, player);
      rosterCells = `
        <td>${player.number}</td>
        <td class="player-col">${escapeHtml(player.name)}</td>
        <td>${ps.goals || ""}</td>
        <td>${ps.assists || ""}</td>
        <td>${ps.pim || ""}</td>
      `;
    }

    let scoringCells = `<td>${i + 1}</td><td></td><td></td><td></td><td></td><td></td>`;
    if (goal) {
      const scorer = getPlayerById(state[teamKey], goal.scorerId);
      const assists = (goal.assistIds || [])
        .map((id) => getPlayerById(state[teamKey], id))
        .filter(Boolean);
      scoringCells = `
        <td>${i + 1}</td>
        <td>${displayGameTime(goal.period, goal.time)}</td>
        <td>${goal.goalType || "E"}</td>
        <td>${scorer ? scorer.number : ""}</td>
        <td>${assists[0]?.number || ""}</td>
        <td>${assists[1]?.number || ""}</td>
      `;
    }

    let penaltyCells = "<td></td><td></td><td></td><td></td><td></td><td></td>";
    if (pen) {
      const num = pen.playerId ? getPlayerById(state[teamKey], pen.playerId)?.number || "" : "";
      penaltyCells = `
        <td>${num}</td>
        <td>${pen.pim}</td>
        <td class="offence-col">${escapeHtml(pen.offenceLabel)}</td>
        <td>${displayGameTime(pen.period, pen.givenTime || pen.startTime)}</td>
        <td>${displayGameTime(pen.startPeriod || pen.period, pen.startTime)}</td>
        <td>${displayPenaltyEnd(pen)}</td>
      `;
    }

    rows.push(`<tr>${rosterCells}${scoringCells}${penaltyCells}</tr>`);
  }

  return rows.join("");
}

function periodTotals(arr) {
  return {
    p1: arr[0] || 0,
    p2: arr[1] || 0,
    p3: arr[2] || 0,
    ot: arr[3] || 0,
    total: arr.reduce((a, b) => a + b, 0)
  };
}

function formatGoalsCell(value) {
  return value === 0 ? "" : String(value);
}

function renderNetminderRows(teamKey, teamLabel) {
  const stints = netminderStats[teamKey];
  if (!stints.length) {
    return `<tr><td>${teamLabel}</td><td colspan="7"></td></tr>`;
  }

  return stints
    .map((stint, index) => {
      const goalie = getPlayerById(state[teamKey], stint.goalieId);
      const total = stint.goalsConceded.reduce((a, b) => a + b, 0);
      const label = index === 0 ? teamLabel : "";

      return `
        <tr>
          <td>${label}</td>
          <td class="name-col">${goalie ? escapeHtml(goalie.name) : ""}</td>
          <td>${stint.timeOn}</td>
          <td>${formatGoalsCell(stint.goalsConceded[0])}</td>
          <td>${formatGoalsCell(stint.goalsConceded[1])}</td>
          <td>${formatGoalsCell(stint.goalsConceded[2])}</td>
          <td>${formatGoalsCell(stint.goalsConceded[3])}</td>
          <td>${formatGoalsCell(total)}</td>
        </tr>
      `;
    })
    .join("");
}

function setPeriod(prefix, data) {
  const fields = ["P1", "P2", "P3", "OT", "Total"];
  const values = [data.p1, data.p2, data.p3, data.ot, data.total];
  fields.forEach((field, i) => {
    const el = document.getElementById(`${prefix}${field}`);
    if (el) el.textContent = values[i] === 0 ? "" : values[i];
  });
}

function fillSheet() {
  document.getElementById("detailHome").textContent = state.details.homeTeam;
  document.getElementById("detailAway").textContent = state.details.awayTeam;
  document.getElementById("detailDate").textContent = formatDate(state.details.date);
  document.getElementById("detailTime").textContent = formatTime(state.details.time);
  document.getElementById("detailVenue").textContent = state.details.venue;
  document.getElementById("detailComp").textContent = state.details.competition;

  document.getElementById("homeBody").innerHTML = renderTeamRows("home");
  document.getElementById("awayBody").innerHTML = renderTeamRows("away");

  setPeriod("homeScore", periodTotals(stats.teamStats.home.goals));
  setPeriod("awayScore", periodTotals(stats.teamStats.away.goals));
  setPeriod("homePim", periodTotals(stats.teamStats.home.pim));
  setPeriod("awayPim", periodTotals(stats.teamStats.away.pim));

  document.getElementById("netminderBody").innerHTML =
    renderNetminderRows("home", "HOME") + renderNetminderRows("away", "AWAY");
}

document.getElementById("printBtn").addEventListener("click", () => window.print());
document.getElementById("backToGame").addEventListener("click", () => {
  window.location.href = "game.html";
});

fillSheet();
