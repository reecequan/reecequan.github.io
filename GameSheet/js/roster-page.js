import { loadState, saveState, clearState, generateId } from "./storage.js";
import {
  sortPlayers,
  countByRole,
  validatePlayer,
  canStartGame,
  getGoalies,
  MAX_SKATERS,
  MAX_GOALIES
} from "./roster.js";

let state = loadState();
let editingId = { home: null, away: null };

const els = {
  homeTeam: document.getElementById("homeTeam"),
  awayTeam: document.getElementById("awayTeam"),
  date: document.getElementById("date"),
  time: document.getElementById("time"),
  venue: document.getElementById("venue"),
  competition: document.getElementById("competition"),
  homeRoster: document.getElementById("homeRoster"),
  awayRoster: document.getElementById("awayRoster"),
  homeForm: document.getElementById("homeForm"),
  awayForm: document.getElementById("awayForm"),
  homeError: document.getElementById("homeError"),
  awayError: document.getElementById("awayError"),
  homeCounts: document.getElementById("homeCounts"),
  awayCounts: document.getElementById("awayCounts"),
  startGame: document.getElementById("startGame"),
  newGame: document.getElementById("newGame"),
  goalieModal: document.getElementById("goalieModal"),
  goalieModalBody: document.getElementById("goalieModalBody"),
  confirmGoalies: document.getElementById("confirmGoalies"),
  cancelGoalies: document.getElementById("cancelGoalies")
};

function bindDetails() {
  const fields = ["homeTeam", "awayTeam", "date", "time", "venue", "competition"];
  fields.forEach((field) => {
    els[field].value = state.details[field] || "";
    els[field].addEventListener("input", () => {
      state.details[field] = els[field].value;
      saveState(state);
      updateStartButton();
    });
  });
}

function renderRoster(teamKey) {
  const team = state[teamKey];
  const listEl = els[`${teamKey}Roster`];
  const counts = countByRole(team.players);
  els[`${teamKey}Counts`].textContent =
    `${counts.skaters}/${MAX_SKATERS} skaters, ${counts.goalies}/${MAX_GOALIES} goalies`;

  listEl.innerHTML = "";
  if (!team.players.length) {
    listEl.innerHTML = '<p class="empty-roster">No players added yet.</p>';
    return;
  }

  sortPlayers(team.players).forEach((player) => {
    const row = document.createElement("div");
    row.className = `roster-row ${player.role}`;
    row.innerHTML = `
      <span class="roster-num">#${player.number}</span>
      <span class="roster-name">${escapeHtml(player.name)}</span>
      <span class="roster-role">${player.role === "goalie" ? "G" : "Skater"}</span>
      <button type="button" class="btn btn-small" data-action="edit" data-team="${teamKey}" data-id="${player.id}">Edit</button>
      <button type="button" class="btn btn-small btn-danger" data-action="remove" data-team="${teamKey}" data-id="${player.id}">Remove</button>
    `;
    listEl.appendChild(row);
  });
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function setupForm(teamKey) {
  const form = els[`${teamKey}Form`];
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const number = form.querySelector('[name="number"]').value;
    const name = form.querySelector('[name="name"]').value;
    const role = form.querySelector('[name="role"]').value;
    const excludeId = editingId[teamKey];
    const errors = validatePlayer(state[teamKey].players, { number, name, role }, excludeId);

    if (errors.length) {
      els[`${teamKey}Error`].textContent = errors.join(" ");
      return;
    }

    els[`${teamKey}Error`].textContent = "";

    if (excludeId) {
      const player = state[teamKey].players.find((p) => p.id === excludeId);
      player.number = Number(number);
      player.name = name.trim();
      player.role = role;
      editingId[teamKey] = null;
      form.querySelector('[type="submit"]').textContent = "Add Player";
    } else {
      state[teamKey].players.push({
        id: generateId(),
        number: Number(number),
        name: name.trim(),
        role
      });
    }

    form.reset();
    form.querySelector('[name="role"]').value = "skater";
    saveState(state);
    renderRoster(teamKey);
    updateStartButton();
  });
}

function handleRosterActions(e) {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;

  const { action, team, id } = btn.dataset;
  if (action === "remove") {
    state[team].players = state[team].players.filter((p) => p.id !== id);
    if (editingId[team] === id) editingId[team] = null;
    saveState(state);
    renderRoster(team);
    updateStartButton();
  }

  if (action === "edit") {
    const player = state[team].players.find((p) => p.id === id);
    const form = els[`${team}Form`];
    form.querySelector('[name="number"]').value = player.number;
    form.querySelector('[name="name"]').value = player.name;
    form.querySelector('[name="role"]').value = player.role;
    editingId[team] = id;
    form.querySelector('[type="submit"]').textContent = "Save Player";
    els[`${team}Error`].textContent = "";
  }
}

function updateStartButton() {
  els.startGame.disabled = !canStartGame(state);
}

function showGoalieModal() {
  const homeGoalies = getGoalies(state.home);
  const awayGoalies = getGoalies(state.away);
  let html = "";

  if (homeGoalies.length > 1) {
    html += `<label class="field">Home starting goalie<select id="homeStartingGoalie" required>
      ${homeGoalies.map((g) => `<option value="${g.id}">#${g.number} ${escapeHtml(g.name)}</option>`).join("")}
    </select></label>`;
  }
  if (awayGoalies.length > 1) {
    html += `<label class="field">Away starting goalie<select id="awayStartingGoalie" required>
      ${awayGoalies.map((g) => `<option value="${g.id}">#${g.number} ${escapeHtml(g.name)}</option>`).join("")}
    </select></label>`;
  }

  if (!html) {
    startGameConfirmed();
    return;
  }

  els.goalieModalBody.innerHTML = html;
  els.goalieModal.hidden = false;
}

function startGameConfirmed() {
  const homeGoalies = getGoalies(state.home);
  const awayGoalies = getGoalies(state.away);

  state.home.startingGoalieId =
    homeGoalies.length === 1
      ? homeGoalies[0].id
      : document.getElementById("homeStartingGoalie")?.value || state.home.startingGoalieId;
  state.away.startingGoalieId =
    awayGoalies.length === 1
      ? awayGoalies[0].id
      : document.getElementById("awayStartingGoalie")?.value || state.away.startingGoalieId;

  state.gameStarted = true;
  saveState(state);
  window.location.href = "game.html";
}

els.startGame.addEventListener("click", showGoalieModal);
els.confirmGoalies.addEventListener("click", () => {
  els.goalieModal.hidden = true;
  startGameConfirmed();
});
els.cancelGoalies.addEventListener("click", () => {
  els.goalieModal.hidden = true;
});

els.newGame.addEventListener("click", () => {
  if (confirm("Start a new game? All current data will be cleared.")) {
    clearState();
    state = loadState();
    bindDetails();
    renderRoster("home");
    renderRoster("away");
    updateStartButton();
  }
});

document.getElementById("homeRoster").addEventListener("click", handleRosterActions);
document.getElementById("awayRoster").addEventListener("click", handleRosterActions);

setupForm("home");
setupForm("away");
bindDetails();
renderRoster("home");
renderRoster("away");
updateStartButton();

if (state.gameStarted && state.events.length > 0) {
  const resume = document.createElement("p");
  resume.className = "resume-note";
  resume.innerHTML = 'Game in progress. <a href="game.html">Resume game</a> or start fresh with New Game.';
  document.querySelector(".page-header").appendChild(resume);
}
