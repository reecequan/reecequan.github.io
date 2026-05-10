async function loadSkillMap() {
  const roles = ['FORWARD', 'DEFENSE', 'BOTH', 'GOALIES'];
  const skillMap = {};

  for (const role of roles) {
    const response = await fetch(`./${role}.txt`);
    const text = await response.text();
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

    for (const line of lines) {
      const [name, skillStr] = line.split(',').map(s => s.trim());
      const skill = parseInt(skillStr, 10);
      if (!skillMap[name]) {
        skillMap[name] = { skill, roles: [role] };
      } else {
        skillMap[name].roles.push(role);
        skillMap[name].skill = Math.max(skillMap[name].skill, skill);
      }
    }
  }

  return skillMap;
}

function normalizeName(rawName) {
  let name = rawName?.trim() || '';
  if (name.startsWith('"') && name.endsWith('"')) {
    name = name.slice(1, -1);
  }
  return name.trim();
}

function groupPlayersByRole(players) {
  const grouped = {
    FORWARD: [],
    DEFENSE: [],
    BOTH: [],
  };

  for (const p of players) {
    if (p.roles.includes('GOALIES')) continue;
    if (p.roles.includes('FORWARD') && !p.roles.includes('DEFENSE')) grouped.FORWARD.push(p);
    else if (p.roles.includes('DEFENSE') && !p.roles.includes('FORWARD')) grouped.DEFENSE.push(p);
    else grouped.BOTH.push(p);
  }

  for (const role of Object.keys(grouped)) {
    grouped[role].sort((a, b) => b.skill - a.skill);
  }

  return grouped;
}

function assignBalancedTeams(grouped) {
  const teamA = [], teamB = [];
  let totalA = 0, totalB = 0;
  let bothA = 0, bothB = 0;

  const takePlayer = (arr, idx) => {
    const player = arr[idx];
    arr.splice(idx, 1);
    return player;
  };

  const matchAndDistribute = (roleList, fallbackList) => {
    while (roleList.length) {
      const player = takePlayer(roleList, 0);

      let match = null;

      // 1. Match with same-role equal skill
      let matchIdx = roleList.findIndex(p => p.skill === player.skill);
      if (matchIdx !== -1) {
        match = takePlayer(roleList, matchIdx);
      }

      // 2. Match with BOTH of similar skill
      if (!match && fallbackList.length) {
        matchIdx = fallbackList.findIndex(p => Math.abs(p.skill - player.skill) <= 1);
        if (matchIdx !== -1) {
          match = takePlayer(fallbackList, matchIdx);
        }
      }

      // 3. Match with any closest available player if skill gap > 2
      if (!match && Math.abs(player.skill - (roleList[0]?.skill ?? 0)) > 2) {
        const allCandidates = [...roleList, ...fallbackList];
        if (allCandidates.length) {
          let closestIdx = 0;
          let closestDiff = Math.abs(allCandidates[0].skill - player.skill);
          for (let i = 1; i < allCandidates.length; i++) {
            const diff = Math.abs(allCandidates[i].skill - player.skill);
            if (diff < closestDiff) {
              closestDiff = diff;
              closestIdx = i;
            }
          }

          const pool = closestIdx < roleList.length ? roleList : fallbackList;
          match = takePlayer(pool, closestIdx % pool.length);
        }
      }

      if (!match) {
        const weakerTeam = totalA <= totalB ? teamA : teamB;
        const teamSkill = totalA <= totalB ? totalA : totalB;
        weakerTeam.push(player);
        if (player.role === 'BOTH') totalA <= totalB ? bothA++ : bothB++;
        if (totalA <= totalB) totalA += player.skill;
        else totalB += player.skill;
        continue;
      }

      // Distribute matched pair across teams
      const assignToTeamA = totalA <= totalB;
      if (assignToTeamA) {
        teamA.push(player);
        teamB.push(match);
        totalA += player.skill;
        totalB += match.skill;
        if (player.role === 'BOTH') bothA++;
        if (match.role === 'BOTH') bothB++;
      } else {
        teamA.push(match);
        teamB.push(player);
        totalA += match.skill;
        totalB += player.skill;
        if (match.role === 'BOTH') bothA++;
        if (player.role === 'BOTH') bothB++;
      }
    }
  };

  // Distribute FORWARDs and DEFENSEs with fallback to BOTHs
  matchAndDistribute(grouped.FORWARD, grouped.BOTH);
  matchAndDistribute(grouped.DEFENSE, grouped.BOTH);

  // Distribute remaining BOTHs to balance BOTH player count
  while (grouped.BOTH.length) {
    const player = takePlayer(grouped.BOTH, 0);
    if (bothA <= bothB) {
      teamA.push(player);
      totalA += player.skill;
      bothA++;
    } else {
      teamB.push(player);
      totalB += player.skill;
      bothB++;
    }
  }

  // Balance player count if off by more than 1
  while (Math.abs(teamA.length - teamB.length) > 1) {
    let from = teamA.length > teamB.length ? teamA : teamB;
    let to = from === teamA ? teamB : teamA;
    let fromTotal = from === teamA ? totalA : totalB;
    let toTotal = from === teamA ? totalB : totalA;

    // Find the player to move that minimizes skill imbalance
    let bestIdx = 0;
    let minSkillDiff = Infinity;

    for (let i = 0; i < from.length; i++) {
      const simulatedFromTotal = fromTotal - from[i].skill;
      const simulatedToTotal = toTotal + from[i].skill;
      const diff = Math.abs(simulatedFromTotal - simulatedToTotal);
      if (diff < minSkillDiff) {
        minSkillDiff = diff;
        bestIdx = i;
      }
    }

    const playerToMove = from.splice(bestIdx, 1)[0];
    to.push(playerToMove);

    if (from === teamA) {
      totalA -= playerToMove.skill;
      totalB += playerToMove.skill;
    } else {
      totalB -= playerToMove.skill;
      totalA += playerToMove.skill;
    }
  }

  return {
    group1: teamA,
    group2: teamB,
    skill1: totalA,
    skill2: totalB
  };

}



async function processCSV() {
  const fileInput = document.getElementById('csvFile');
  const file = fileInput.files[0];
  if (!file) {
    alert('Please upload a CSV file.');
    return;
  }

  const skillMap = await loadSkillMap();

  const reader = new FileReader();
  reader.onload = function(e) {
    const lines = e.target.result.split('\n').map(l => l.trim()).filter(Boolean);
    const names = lines.slice(1).map(line => normalizeName(line.split(',')[0]));
    const allPlayers = [];
    const goalies = [];

    for (const name of names) {
      let player = skillMap[name];
      if (!player) {
        player = {
          name,
          skill: 4,
          roles: ['FORWARD'],
          missing: true
        };
      } else {
        player.name = name;
        player.missing = false;
      }

      if (player.roles.includes('GOALIES')) {
        goalies.push(player);
      } else {
        allPlayers.push(player);
      }
    }

    const grouped = groupPlayersByRole(allPlayers);
    const { group1, group2, skill1, skill2 } = assignBalancedTeams(grouped);

    displayGroup('group1', 'group1Header', group1, skill1);
    displayGroup('group2', 'group2Header', group2, skill2);
    displayGroup('goalies', null, goalies);
  };

  reader.readAsText(file);
}

function displayGroup(listId, headerId, players, totalSkill = 0) {
  const list = document.getElementById(listId);
  list.innerHTML = '';

  players.forEach(p => {
    const li = document.createElement('li');
    li.textContent = `${p.name}${p.missing ? ' (missing stats)' : ''}`;
    if (p.missing) li.classList.add('missing');
    li.style.cursor = 'pointer';

    li.onclick = () => {
      navigator.clipboard.writeText(p.name).then(() => {
        showToast(`Copied: ${p.name}`);
      });
    };

    list.appendChild(li);
  });

  if (headerId) {
    const header = document.getElementById(headerId);
    header.textContent = `${headerId === 'group1Header' ? 'Group 1' : 'Group 2'} - ${players.length} players, Total Skill: ${totalSkill}`;
  }
}

function showHelp() {
    document.getElementById("helpModal").style.display = "block";
  }

function closeHelp() {
  document.getElementById("helpModal").style.display = "none";
}

 // Optional: close modal if user clicks outside
window.onclick = function(event) {
  const modal = document.getElementById("helpModal");
  if (event.target == modal) {
    modal.style.display = "none";
  }
};
