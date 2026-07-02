const STORAGE_KEY = "gamesheet_state";

export function createEmptyState() {
  return {
    details: {
      homeTeam: "",
      awayTeam: "",
      date: "",
      time: "",
      venue: "",
      competition: ""
    },
    home: { players: [], startingGoalieId: null },
    away: { players: [], startingGoalieId: null },
    settings: { period: 1, clockDirection: "down", gameTime: "" },
    events: [],
    gameStarted: false
  };
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createEmptyState();
    const parsed = JSON.parse(raw);
    return { ...createEmptyState(), ...parsed };
  } catch {
    return createEmptyState();
  }
}

export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function clearState() {
  localStorage.removeItem(STORAGE_KEY);
}

export function generateId() {
  return crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
