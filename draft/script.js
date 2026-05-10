let draggedPlayer = null;
let draggedFromRoundIndex = null;
let draggedPlayerIndex = null;
let draggedRoundIndex = null;

class Player {
  constructor(name, skill, position, jerseySize) {
    this.name = name;
    this.skill = parseInt(skill);
    this.position = position;
    this.jerseySize = jerseySize;
  }

  canPlay(positionType) {
    return this.position === positionType || this.position === 'either';
  }
}

class Round {
  constructor(type) {
    this.type = type; // 'forward', 'defence', or 'goalie'
    this.players = [];
  }

  addPlayer(player) {
    this.players.push(player);
  }

  render(index) {
    const row = document.createElement('tr');
    row.setAttribute('draggable', true);
    row.dataset.roundIndex = index;

    // Round info cell
    const roundInfoCell = document.createElement('td');
    roundInfoCell.className = 'round-info';
    roundInfoCell.innerHTML = `<strong>Round ${index + 1}</strong><br>${this.type}`;
    row.appendChild(roundInfoCell);

    // Player cells
    this.players.forEach((player, playerIndex) => {
      const cell = document.createElement('td');
      cell.className = 'player-card';
      cell.setAttribute('draggable', true);
      cell.dataset.roundIndex = index;
      cell.dataset.playerIndex = playerIndex;

      cell.innerHTML = `
        <div><strong>${player.name}</strong></div>
        <div>Skill: ${player.skill}</div>
        <div>Pos: ${player.position}</div>
        <div>Size: ${player.jerseySize}</div>
      `;

      // Event listeners
      cell.addEventListener('dragstart', handlePlayerDragStart);
      cell.addEventListener('dragover', handleDragOver);
      cell.addEventListener('drop', handlePlayerDrop);

      row.appendChild(cell);
    });

    // Drag events for whole round
    row.addEventListener('dragstart', handleRoundDragStart);
    row.addEventListener('dragover', handleDragOver);
    row.addEventListener('drop', handleRoundDrop);

    return row;
  }



}

class DraftOrganizer {
  constructor() {
    this.players = [];
    this.rounds = [];
    this.roundSize = 6;
  }

 sortPlayersIntoRounds() {
  const roundSize = this.roundSize;

  // Separate goalies from others
  const goalies = this.players.filter(p => p.position.toLowerCase() === 'goalie');
  const others = this.players.filter(p => p.position.toLowerCase() !== 'goalie');

  // Fill non-goalie rounds
  let currentRound = new Round('mixed');
  for (const player of others) {
    currentRound.addPlayer(player);
    if (currentRound.players.length === roundSize) {
      this.rounds.push(currentRound);
      currentRound = new Round('mixed');
    }
  }

  // If leftover players and a partial round is not allowed
  if (currentRound.players.length > 0) {
    // Try to move players into existing rounds if not full
    for (const player of currentRound.players) {
      let added = false;
      for (const round of this.rounds) {
        if (round.players.length < roundSize) {
          round.addPlayer(player);
          added = true;
          break;
        }
      }
      if (!added) {
        const lastResort = new Round('mixed');
        lastResort.addPlayer(player);
        this.rounds.push(lastResort);
      }
    }
  }

  // Handle goalie rounds separately
  let goalieRound = new Round('goalie');
  for (const goalie of goalies) {
    goalieRound.addPlayer(goalie);
    if (goalieRound.players.length === roundSize) {
      this.rounds.push(goalieRound);
      goalieRound = new Round('goalie');
    }
  }

  // Add any remaining goalies as a final smaller round
  if (goalieRound.players.length > 0) {
    this.rounds.push(goalieRound);
  }
}


  assignBalancedRounds(forwards, defencemen) {
  while (forwards.length > 0 || defencemen.length > 0) {
    const forwardTopSkill = forwards[0]?.skill ?? 0;
    const defenceTopSkill = defencemen[0]?.skill ?? 0;

    const skillGap = Math.abs(forwardTopSkill - defenceTopSkill);

    const roundType = forwardTopSkill >= defenceTopSkill ? 'forward' : 'defence';
    const sourceGroup = roundType === 'forward' ? forwards : defencemen;
    const oppositeGroup = roundType === 'forward' ? defencemen : forwards;

    const round = new Round(roundType);

    while (round.players.length < this.roundSize && (sourceGroup.length > 0 || (skillGap >= 2 && oppositeGroup.length > 0))) {
      if (sourceGroup.length > 0) {
        round.addPlayer(sourceGroup.shift());
      } else if (skillGap >= 2 && oppositeGroup.length > 0) {
        round.addPlayer(oppositeGroup.shift());
      } else {
        break;
      }
    }

    this.rounds.push(round);
  }
  }



  assignToRounds(group, type) {
    group.sort((a, b) => b.skill - a.skill); // High skill first

    while (group.length > 0) {
      const round = new Round(type);
      for (let i = 0; i < this.roundSize && group.length > 0; i++) {
        round.addPlayer(group.shift());
      }
      this.rounds.push(round);
    }
  }

renderRounds() {
  const container = document.getElementById('roundsContainer');
  container.innerHTML = '';

  const table = document.createElement('table');
  table.className = 'rounds-table';

  this.rounds.forEach((round, index) => {
    const row = document.createElement('tr');
    row.setAttribute('draggable', true);
    row.dataset.roundIndex = index;

    const roundCell = document.createElement('td');
    roundCell.className = 'round-info';
    roundCell.innerHTML = `<strong>Round ${index + 1}</strong><br>${round.type}`;
    row.appendChild(roundCell);

    round.players.forEach((player, playerIndex) => {
      const cell = document.createElement('td');
      cell.className = 'player-card';
      cell.setAttribute('draggable', true);
      cell.dataset.roundIndex = index;
      cell.dataset.playerIndex = playerIndex;

      cell.innerHTML = `
        <div><strong>${player.name}</strong></div>
        <div>Skill: ${player.skill}</div>
        <div>Pos: ${player.position}</div>
        <div>Size: ${player.jerseySize}</div>
      `;

      cell.addEventListener('dragstart', handlePlayerDragStart);
      cell.addEventListener('dragover', handleDragOver);
      cell.addEventListener('drop', handlePlayerDrop);

      row.appendChild(cell);
    });

    // Round-level drag-and-drop
    row.addEventListener('dragstart', handleRoundDragStart);
    row.addEventListener('dragover', handleDragOver);
    row.addEventListener('drop', handleRoundDrop);

    table.appendChild(row);
  });

  container.appendChild(table);
}

  
}

function processFile() {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];
    const roundSize = parseInt(document.getElementById('roundSize').value);


    if (!file) return alert('Please select a file.');

  const reader = new FileReader();
  reader.onload = function(e) {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: 'array' });

    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    const headerIndex = jsonData.findIndex(row => row['Name'] && row['Skill Ranking']);
    const validRows = jsonData.slice(headerIndex); // Skip empty lines and junk

    const players = validRows.map(row => new Player(
      row['Name'],
      row['Skill Ranking'],
      row['Position'],
      row['Beer'],
      row['Gender'],
      row['Highest level played'],
      row['Notes']
    ));

    draftOrganizer = new DraftOrganizer(players, roundSize);
    draftOrganizer.sortPlayersIntoRounds();
    draftOrganizer.renderRounds();
  };

  reader.readAsArrayBuffer(file);
}

function handleDragStart(e) {
  draggedPlayer = e.target;
  draggedFromRoundIndex = parseInt(e.target.dataset.roundIndex);
  draggedPlayerIndex = parseInt(e.target.dataset.playerIndex);
}

function handleDragOver(e) {
  e.preventDefault();
}


function handleDrop(e) {
  e.preventDefault();
  const toRoundIndex = parseInt(e.currentTarget.dataset.roundIndex);

  if (isNaN(toRoundIndex)) return;

  const fromRound = draftOrganizer.rounds[draggedFromRoundIndex];
  const toRound = draftOrganizer.rounds[toRoundIndex];

  const player = fromRound.players.splice(draggedPlayerIndex, 1)[0];
  toRound.players.push(player);

  draftOrganizer.renderRounds();
}

function handleRoundDragStart(e) {
  draggedRoundIndex = parseInt(e.currentTarget.dataset.roundIndex);
}

function handleRoundDrop(e) {
  e.preventDefault();
  const targetIndex = parseInt(e.currentTarget.dataset.roundIndex);
  if (isNaN(draggedRoundIndex) || isNaN(targetIndex) || draggedRoundIndex === targetIndex) return;

  const rounds = draftOrganizer.rounds;
  const [movedRound] = rounds.splice(draggedRoundIndex, 1);
  rounds.splice(targetIndex, 0, movedRound);

  draftOrganizer.renderRounds();
  draggedRoundIndex = null;
}

function handlePlayerDragStart(e) {
  draggedPlayer = e.target;
  draggedFromRoundIndex = parseInt(e.target.dataset.roundIndex);
  draggedPlayerIndex = parseInt(e.target.dataset.playerIndex);
}

function handlePlayerDrop(e) {
  e.preventDefault();
  const toRoundIndex = parseInt(e.currentTarget.dataset.roundIndex);

  if (isNaN(toRoundIndex)) return;

  const fromRound = draftOrganizer.rounds[draggedFromRoundIndex];
  const toRound = draftOrganizer.rounds[toRoundIndex];

  const player = fromRound.players.splice(draggedPlayerIndex, 1)[0];
  toRound.players.push(player);

  draftOrganizer.renderRounds();
}

