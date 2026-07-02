export const MAX_SKATERS = 22;
export const MAX_GOALIES = 3;

export function sortPlayers(players) {
  return [...players].sort((a, b) => Number(a.number) - Number(b.number));
}

export function countByRole(players) {
  return players.reduce(
    (acc, p) => {
      if (p.role === "goalie") acc.goalies += 1;
      else acc.skaters += 1;
      return acc;
    },
    { skaters: 0, goalies: 0 }
  );
}

export function findDuplicateNumber(players, number, excludeId = null) {
  return players.find(
    (p) => p.id !== excludeId && String(p.number) === String(number)
  );
}

export function validatePlayer(players, { number, name, role }, excludeId = null) {
  const errors = [];
  const num = String(number).trim();

  if (!num || isNaN(Number(num)) || Number(num) < 0) {
    errors.push("Jersey number is required and must be a valid number.");
  }
  if (!name.trim()) {
    errors.push("Player name is required.");
  }
  if (findDuplicateNumber(players, num, excludeId)) {
    errors.push(`Jersey #${num} is already on this team.`);
  }

  const counts = countByRole(players.filter((p) => p.id !== excludeId));
  if (role === "skater" && counts.skaters >= MAX_SKATERS) {
    errors.push(`Maximum ${MAX_SKATERS} skaters allowed.`);
  }
  if (role === "goalie" && counts.goalies >= MAX_GOALIES) {
    errors.push(`Maximum ${MAX_GOALIES} goalies allowed.`);
  }

  return errors;
}

export function canStartGame(state) {
  const homeCounts = countByRole(state.home.players);
  const awayCounts = countByRole(state.away.players);
  return (
    state.details.homeTeam.trim() &&
    state.details.awayTeam.trim() &&
    homeCounts.skaters >= 1 &&
    awayCounts.skaters >= 1
  );
}

export function getGoalies(team) {
  return sortPlayers(team.players.filter((p) => p.role === "goalie"));
}

export function getSkaters(team) {
  return sortPlayers(team.players.filter((p) => p.role === "skater"));
}

export function getPlayerById(team, id) {
  return team.players.find((p) => p.id === id);
}

export function formatPlayerOption(player) {
  return `#${player.number} ${player.name}`;
}
