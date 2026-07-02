import { loadState, saveState, generateId } from "./storage.js";
import { getPlayerById, formatPlayerOption, sortPlayers } from "./roster.js";
import { PENALTY_TYPES, PENALTY_DURATIONS } from "./data/penalties.js";
import { GOAL_TYPES } from "./data/goals.js";
import {
  computeGameStats,
  suggestGoalType,
  validateTime,
  getActivePenaltiesAtEvent,
  compareTime,
  toGameTime,
  splitArenaTime,
  joinArenaTime
} from "./penalties.js";

let state = loadState();
let editingEventId = null;
let activeTeam = null;

if (!state.gameStarted || !canStartGameCheck()) {
  window.location.href = "index.html";
}

function canStartGameCheck() {
  return state.details.homeTeam && state.details.awayTeam &&
    state.home.players.some((p) => p.role === "skater") &&
    state.away.players.some((p) => p.role === "skater");
}

const els = {
  homeName: document.getElementById("homeName"),
  awayName: document.getElementById("awayName"),
  homeScore: document.getElementById("homeScore"),
  awayScore: document.getElementById("awayScore"),
  period: document.getElementById("period"),
  gameMinutes: document.getElementById("gameMinutes"),
  gameSeconds: document.getElementById("gameSeconds"),
  clockDirection: document.getElementById("clockDirection"),
  eventLog: document.getElementById("eventLog"),
  goalForm: document.getElementById("goalForm"),
  penaltyForm: document.getElementById("penaltyForm"),
  swapForm: document.getElementById("swapForm"),
  goalError: document.getElementById("goalError"),
  penaltyError: document.getElementById("penaltyError"),
  swapError: document.getElementById("swapError"),
  goalModal: document.getElementById("goalModal"),
  penaltyModal: document.getElementById("penaltyModal"),
  swapModal: document.getElementById("swapModal"),
  goalModalTitle: document.getElementById("goalModalTitle"),
  penaltyModalTitle: document.getElementById("penaltyModalTitle"),
  goalSubmitBtn: document.getElementById("goalSubmitBtn"),
  penaltySubmitBtn: document.getElementById("penaltySubmitBtn"),
  swapSubmitBtn: document.getElementById("swapSubmitBtn"),
  homeGoalBtn: document.getElementById("homeGoalBtn"),
  homePenBtn: document.getElementById("homePenBtn"),
  awayGoalBtn: document.getElementById("awayGoalBtn"),
  awayPenBtn: document.getElementById("awayPenBtn"),
  completeGame: document.getElementById("completeGame"),
  backToSetup: document.getElementById("backToSetup"),
  editBanner: document.getElementById("editBanner"),
  cancelEdit: document.getElementById("cancelEdit")
};

function teamPlayers(team, includeGoalies = true) {
  const players = includeGoalies
    ? state[team].players
    : state[team].players.filter((p) => p.role === "skater");
  return sortPlayers(players);
}

function populateSelect(select, team, { includeGoalies = true, allowEmpty = false } = {}) {
  const current = select.value;
  select.innerHTML = allowEmpty ? '<option value="">—</option>' : "";
  teamPlayers(team, includeGoalies).forEach((p) => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = formatPlayerOption(p);
    select.appendChild(opt);
  });
  if (current) select.value = current;
}

function getGoalies(teamKey) {
  return sortPlayers(state[teamKey].players.filter((p) => p.role === "goalie"));
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function teamLabel(team) {
  return team === "home" ? state.details.homeTeam : state.details.awayTeam;
}

function openModal(modal) {
  modal.hidden = false;
}

function closeModal(modal) {
  modal.hidden = true;
}

function closeAllModals() {
  closeModal(els.goalModal);
  closeModal(els.penaltyModal);
  closeModal(els.swapModal);
}

function refreshGoalDropdowns(team) {
  populateSelect(document.getElementById("goalScorer"), team, { includeGoalies: false });
  populateSelect(document.getElementById("goalAssist1"), team, { includeGoalies: false, allowEmpty: true });
  populateSelect(document.getElementById("goalAssist2"), team, { includeGoalies: false, allowEmpty: true });
}

function refreshPenaltyDropdowns(team) {
  populateSelect(document.getElementById("penaltyPlayer"), team, { includeGoalies: false, allowEmpty: true });
  const isBench = document.getElementById("penaltyOffence").value === "BENCH";
  document.getElementById("penaltyPlayer").disabled = isBench;
}

function refreshSwapDropdowns(team) {
  const swapTeam = document.getElementById("swapTeam");
  swapTeam.innerHTML = `
    <option value="home">${escapeHtml(state.details.homeTeam)} (Home)</option>
    <option value="away">${escapeHtml(state.details.awayTeam)} (Away)</option>
  `;
  swapTeam.value = team;
  document.getElementById("swapGoalie").innerHTML = getGoalies(team)
    .map((g) => `<option value="${g.id}">${formatPlayerOption(g)}</option>`)
    .join("");
}

function openGoalModal(team) {
  if (!validateCurrentTime()) {
    alert("Set the period and arena clock at the top of the page.");
    return;
  }
  activeTeam = team;
  els.goalError.textContent = "";
  els.goalModalTitle.textContent = `${teamLabel(team)} — Goal`;
  els.goalSubmitBtn.textContent = editingEventId ? "Save Goal" : "Log Goal";
  refreshGoalDropdowns(team);
  openModal(els.goalModal);
}

function openPenaltyModal(team) {
  if (!validateCurrentTime()) {
    alert("Set the period and arena clock at the top of the page.");
    return;
  }
  activeTeam = team;
  els.penaltyError.textContent = "";
  els.penaltyModalTitle.textContent = `${teamLabel(team)} — Penalty`;
  els.penaltySubmitBtn.textContent = editingEventId ? "Save Penalty" : "Log Penalty";
  refreshPenaltyDropdowns(team);
  openModal(els.penaltyModal);
}

function openSwapModal(team = "home") {
  if (!validateCurrentTime()) {
    alert("Set the period and arena clock at the top of the page.");
    return;
  }
  activeTeam = team;
  els.swapError.textContent = "";
  els.swapSubmitBtn.textContent = editingEventId ? "Save Swap" : "Log Swap";
  refreshSwapDropdowns(team);
  openModal(els.swapModal);
}

function initPage() {
  document.getElementById("penaltyOffence").innerHTML = PENALTY_TYPES.map(
    (p) => `<option value="${p.abbreviation}">${p.abbreviation} — ${p.description}</option>`
  ).join("");

  document.getElementById("penaltyDuration").innerHTML = PENALTY_DURATIONS.map(
    (d) => `<option value="${d}">${d} min</option>`
  ).join("");

  document.getElementById("goalType").innerHTML = Object.entries(GOAL_TYPES).map(
    ([k, v]) => `<option value="${k}">${k} — ${v}</option>`
  ).join("");

  els.period.value = String(state.settings.period);
  els.clockDirection.value = state.settings.clockDirection;
  if (state.settings.gameTime) {
    const { minutes, seconds } = splitArenaTime(state.settings.gameTime);
    els.gameMinutes.value = minutes;
    els.gameSeconds.value = seconds;
  }
  updateGameTimeMax();

  els.period.addEventListener("change", () => {
    state.settings.period = els.period.value === "OT" ? "OT" : Number(els.period.value);
    updateGameTimeMax();
    saveGameTimeFromFields();
  });

  els.gameMinutes.addEventListener("change", saveGameTimeFromFields);
  els.gameSeconds.addEventListener("change", saveGameTimeFromFields);
  els.gameMinutes.addEventListener("input", saveGameTimeFromFields);
  els.gameSeconds.addEventListener("input", saveGameTimeFromFields);

  els.clockDirection.addEventListener("change", () => {
    state.settings.clockDirection = els.clockDirection.value;
    saveState(state);
  });

  els.homeGoalBtn.addEventListener("click", () => openGoalModal("home"));
  els.homePenBtn.addEventListener("click", () => openPenaltyModal("home"));
  els.awayGoalBtn.addEventListener("click", () => openGoalModal("away"));
  els.awayPenBtn.addEventListener("click", () => openPenaltyModal("away"));
  document.getElementById("openSwapBtn").addEventListener("click", () => openSwapModal("home"));

  document.getElementById("swapTeam").addEventListener("change", (e) => {
    refreshSwapDropdowns(e.target.value);
  });

  document.getElementById("penaltyOffence").addEventListener("change", () => {
    if (activeTeam) refreshPenaltyDropdowns(activeTeam);
  });

  document.querySelectorAll("[data-close]").forEach((btn) => {
    btn.addEventListener("click", () => {
      closeModal(document.getElementById(btn.dataset.close));
      if (!editingEventId) {
        els.goalForm.reset();
        els.penaltyForm.reset();
        els.swapForm.reset();
      }
    });
  });

  [els.goalModal, els.penaltyModal, els.swapModal].forEach((modal) => {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal(modal);
    });
  });
}

function saveGameTimeFromFields() {
  state.settings.gameTime = joinArenaTime(els.gameMinutes.value, els.gameSeconds.value);
  saveState(state);
}

function setClockFields(time) {
  const { minutes, seconds } = splitArenaTime(time);
  els.gameMinutes.value = minutes;
  els.gameSeconds.value = seconds;
}

function updateGameTimeMax() {
  els.gameMinutes.max = els.period.value === "OT" ? 59 : 20;
}

function getCurrentPeriodTime() {
  const period = els.period.value === "OT" ? "OT" : Number(els.period.value);
  const time = joinArenaTime(els.gameMinutes.value, els.gameSeconds.value);
  return { period, time };
}

function validateCurrentTime() {
  const time = joinArenaTime(els.gameMinutes.value, els.gameSeconds.value);
  return !!(els.gameMinutes.value !== "" && els.gameSeconds.value !== "" && validateTime(time));
}

function updateActionButtons() {
  els.homeGoalBtn.textContent = `${state.details.homeTeam} — Goal`;
  els.homePenBtn.textContent = `${state.details.homeTeam} — Pen`;
  els.awayGoalBtn.textContent = `${state.details.awayTeam} — Goal`;
  els.awayPenBtn.textContent = `${state.details.awayTeam} — Pen`;
}

function renderHeader() {
  const stats = computeGameStats(state);
  els.homeName.textContent = state.details.homeTeam;
  els.awayName.textContent = state.details.awayTeam;
  els.homeScore.textContent = stats.totalGoals.home;
  els.awayScore.textContent = stats.totalGoals.away;
  updateActionButtons();
}

function formatEventSummary(event) {
  const teamName = teamLabel(event.team);

  if (event.type === "goal") {
    const scorer = getPlayerById(state[event.team], event.scorerId);
    const assists = (event.assistIds || [])
      .filter(Boolean)
      .map((id) => getPlayerById(state[event.team], id))
      .filter(Boolean);
    const astText = assists.length
      ? ` (${assists.map((a) => `#${a.number} ${a.name}`).join(", ")})`
      : "";
    return `GOAL — ${teamName}: #${scorer?.number} ${scorer?.name}${astText} [${event.goalType || "E"}]`;
  }

  if (event.type === "penalty") {
    const player = event.playerId ? getPlayerById(state[event.team], event.playerId) : null;
    const who = player ? `#${player.number} ${player.name}` : "Bench";
    const coin = event.coincidental ? " (coincidental)" : "";
    return `PEN — ${teamName}: ${who} — ${event.offence} ${event.duration}min${coin}`;
  }

  if (event.type === "goalie_swap") {
    const goalie = getPlayerById(state[event.team], event.goalieId);
    return `GOALIE — ${teamName}: #${goalie?.number} ${goalie?.name} in`;
  }

  return event.type;
}

function renderEventLog() {
  const sorted = [...state.events].sort((a, b) => {
    const order = (p) => (p === "OT" ? 4 : Number(p));
    if (order(a.period) !== order(b.period)) return order(a.period) - order(b.period);
    return compareTime(a.time, b.time, state.settings.clockDirection);
  });

  if (!sorted.length) {
    els.eventLog.innerHTML = '<p class="empty-roster">No events logged yet.</p>';
    return;
  }

  els.eventLog.innerHTML = sorted
    .map((event) => `
      <div class="event-row ${event.type}" data-id="${event.id}">
        <div class="event-main">
          <span class="event-time">${toGameTime(event.period, event.time, state.settings.clockDirection)}</span>
          <span class="event-summary">${escapeHtml(formatEventSummary(event))}</span>
        </div>
        <div class="event-actions">
          <button type="button" class="btn btn-small" data-edit="${event.id}">Edit</button>
          <button type="button" class="btn btn-small btn-danger" data-delete="${event.id}">Delete</button>
        </div>
      </div>
    `)
    .join("");
}

function saveEvent(event) {
  if (editingEventId) {
    const idx = state.events.findIndex((e) => e.id === editingEventId);
    state.events[idx] = { ...event, id: editingEventId };
    clearEditMode();
  } else {
    state.events.push({ ...event, id: generateId() });
  }
  state.settings.period = event.period;
  state.settings.gameTime = event.time;
  saveState(state);
  closeAllModals();
  renderHeader();
  renderEventLog();
}

function clearEditMode() {
  editingEventId = null;
  activeTeam = null;
  els.editBanner.hidden = true;
  els.goalForm.reset();
  els.penaltyForm.reset();
  els.swapForm.reset();
  closeAllModals();
}

els.goalForm.addEventListener("submit", (e) => {
  e.preventDefault();
  els.goalError.textContent = "";

  const team = activeTeam;
  const { period, time } = getCurrentPeriodTime();
  const scorerId = document.getElementById("goalScorer").value;
  const assist1 = document.getElementById("goalAssist1").value;
  const assist2 = document.getElementById("goalAssist2").value;
  let goalType = document.getElementById("goalType").value;

  if (!validateCurrentTime()) {
    els.goalError.textContent = "Set the arena clock time at the top of the page.";
    return;
  }
  if (assist1 && assist1 === scorerId) {
    els.goalError.textContent = "Assists must be different from the scorer.";
    return;
  }
  if (assist2 && (assist2 === scorerId || assist2 === assist1)) {
    els.goalError.textContent = "Assists must be unique.";
    return;
  }

  const active = getActivePenaltiesAtEvent(state, editingEventId);
  if (goalType !== "EN") {
    goalType = suggestGoalType(active, team, goalType);
  }

  saveEvent({
    type: "goal",
    team,
    period,
    time,
    scorerId,
    assistIds: [assist1, assist2].filter(Boolean),
    goalType
  });
});

els.penaltyForm.addEventListener("submit", (e) => {
  e.preventDefault();
  els.penaltyError.textContent = "";

  const team = activeTeam;
  const { period, time } = getCurrentPeriodTime();
  const playerId = document.getElementById("penaltyPlayer").value || null;
  const offence = document.getElementById("penaltyOffence").value;
  const duration = document.getElementById("penaltyDuration").value;
  const coincidental = document.getElementById("penaltyCoincidental").checked;

  if (!validateCurrentTime()) {
    els.penaltyError.textContent = "Set the arena clock time at the top of the page.";
    return;
  }
  if (offence !== "BENCH" && !playerId) {
    els.penaltyError.textContent = "Select a player (or choose BENCH offence).";
    return;
  }

  saveEvent({
    type: "penalty",
    team,
    period,
    time,
    playerId: offence === "BENCH" ? null : playerId,
    offence,
    duration,
    coincidental
  });
});

els.swapForm.addEventListener("submit", (e) => {
  e.preventDefault();
  els.swapError.textContent = "";

  const team = document.getElementById("swapTeam").value;
  const { period, time } = getCurrentPeriodTime();
  const goalieId = document.getElementById("swapGoalie").value;

  if (!validateCurrentTime()) {
    els.swapError.textContent = "Set the arena clock time at the top of the page.";
    return;
  }

  saveEvent({ type: "goalie_swap", team, period, time, goalieId });
});

els.eventLog.addEventListener("click", (e) => {
  const editId = e.target.dataset.edit;
  const deleteId = e.target.dataset.delete;

  if (deleteId) {
    if (confirm("Delete this event?")) {
      state.events = state.events.filter((ev) => ev.id !== deleteId);
      saveState(state);
      if (editingEventId === deleteId) clearEditMode();
      renderHeader();
      renderEventLog();
    }
    return;
  }

  if (editId) {
    const event = state.events.find((ev) => ev.id === editId);
    if (!event) return;
    editingEventId = editId;
    els.editBanner.hidden = false;

    els.period.value = String(event.period);
    setClockFields(event.time);
    state.settings.period = event.period;
    state.settings.gameTime = event.time;
    updateGameTimeMax();

    if (event.type === "goal") {
      activeTeam = event.team;
      els.goalModalTitle.textContent = `${teamLabel(event.team)} — Goal`;
      els.goalSubmitBtn.textContent = "Save Goal";
      refreshGoalDropdowns(event.team);
      document.getElementById("goalScorer").value = event.scorerId;
      document.getElementById("goalAssist1").value = event.assistIds?.[0] || "";
      document.getElementById("goalAssist2").value = event.assistIds?.[1] || "";
      document.getElementById("goalType").value = event.goalType || "E";
      openModal(els.goalModal);
    }

    if (event.type === "penalty") {
      activeTeam = event.team;
      els.penaltyModalTitle.textContent = `${teamLabel(event.team)} — Penalty`;
      els.penaltySubmitBtn.textContent = "Save Penalty";
      refreshPenaltyDropdowns(event.team);
      document.getElementById("penaltyPlayer").value = event.playerId || "";
      document.getElementById("penaltyOffence").value = event.offence;
      document.getElementById("penaltyDuration").value = event.duration;
      document.getElementById("penaltyCoincidental").checked = !!event.coincidental;
      openModal(els.penaltyModal);
    }

    if (event.type === "goalie_swap") {
      activeTeam = event.team;
      els.swapSubmitBtn.textContent = "Save Swap";
      refreshSwapDropdowns(event.team);
      document.getElementById("swapGoalie").value = event.goalieId;
      openModal(els.swapModal);
    }
  }
});

els.cancelEdit.addEventListener("click", clearEditMode);

els.completeGame.addEventListener("click", () => {
  window.location.href = "sheet.html";
});

els.backToSetup.addEventListener("click", () => {
  if (state.events.length && !confirm("Leave game? Events are saved and you can resume later.")) return;
  window.location.href = "index.html";
});

initPage();
renderHeader();
renderEventLog();
