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

const TEAMS = [
  "Don Valley Vikings",
  "Peterborough Dynamo",
  "Whitley Bay Islanders",
  "Blackburn Falcons",
  "Kingston Cobras",
  "Leeds Lightning A",
  "Newcastle Predators",
  "Grimsby Stormers",
  "Leeds Lightning",
  "Hull Knights",
  "Leeds Warriors",
  "Sheffield Blazers",
  "Sheffield Ice Tigers",
  "Blackburn Buccaneers",
  "Durham Dragons",
  "Kingston Fat Dads",
  "Tyneside Jesters",
  "Beighton Bombers",
  "Telford Spartans"
];

const COMPETITIONS = ["Challenge", "IHSC"];

const CUSTOM_VALUE = "__custom__";

let state = loadState();
let editingId = { home: null, away: null };

const els = {
  homeTeamSelect: document.getElementById("homeTeamSelect"),
  homeTeamCustom: document.getElementById("homeTeamCustom"),
  awayTeamSelect: document.getElementById("awayTeamSelect"),
  awayTeamCustom: document.getElementById("awayTeamCustom"),
  date: document.getElementById("date"),
  time: document.getElementById("time"),
  venue: document.getElementById("venue"),
  competitionSelect: document.getElementById("competitionSelect"),
  competitionCustom: document.getElementById("competitionCustom"),
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

function populateChoiceSelect(select, options, { placeholder = "— Select —", required = false } = {}) {
  select.innerHTML = "";
  const blank = document.createElement("option");
  blank.value = "";
  blank.textContent = placeholder;
  select.appendChild(blank);

  options.forEach((label) => {
    const opt = document.createElement("option");
    opt.value = label;
    opt.textContent = label;
    select.appendChild(opt);
  });

  const custom = document.createElement("option");
  custom.value = CUSTOM_VALUE;
  custom.textContent = "Not listed";
  select.appendChild(custom);

  if (required) select.required = true;
}

function setCustomFieldVisible(input, visible) {
  input.hidden = !visible;
  input.disabled = !visible;
  input.required = visible;
  if (!visible) input.value = "";
}

function syncChoiceField(select, input, options, stateKey) {
  const saved = state.details[stateKey] || "";
  if (options.includes(saved)) {
    select.value = saved;
    setCustomFieldVisible(input, false);
  } else if (saved) {
    select.value = CUSTOM_VALUE;
    input.value = saved;
    setCustomFieldVisible(input, true);
  } else {
    select.value = "";
    setCustomFieldVisible(input, false);
  }
}

function bindChoiceField(select, input, options, stateKey, { required = false } = {}) {
  populateChoiceSelect(select, options, { required });
  syncChoiceField(select, input, options, stateKey);

  const save = () => {
    if (select.value === CUSTOM_VALUE) {
      state.details[stateKey] = input.value.trim();
    } else {
      state.details[stateKey] = select.value;
    }
    saveState(state);
    updateStartButton();
  };

  select.addEventListener("change", () => {
    const isCustom = select.value === CUSTOM_VALUE;
    setCustomFieldVisible(input, isCustom);
    if (isCustom) input.focus();
    save();
  });

  input.addEventListener("input", save);
}

function bindDetails() {
  bindChoiceField(els.homeTeamSelect, els.homeTeamCustom, TEAMS, "homeTeam", { required: true });
  bindChoiceField(els.awayTeamSelect, els.awayTeamCustom, TEAMS, "awayTeam", { required: true });
  bindChoiceField(els.competitionSelect, els.competitionCustom, COMPETITIONS, "competition");

  ["date", "time", "venue"].forEach((field) => {
    els[field].value = state.details[field] || "";
    els[field].addEventListener("input", () => {
      state.details[field] = els[field].value;
      saveState(state);
      updateStartButton();
    });
  });
}

function syncDetailsFromState() {
  syncChoiceField(els.homeTeamSelect, els.homeTeamCustom, TEAMS, "homeTeam");
  syncChoiceField(els.awayTeamSelect, els.awayTeamCustom, TEAMS, "awayTeam");
  syncChoiceField(els.competitionSelect, els.competitionCustom, COMPETITIONS, "competition");
  els.date.value = state.details.date || "";
  els.time.value = state.details.time || "";
  els.venue.value = state.details.venue || "";
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
    syncDetailsFromState();
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
