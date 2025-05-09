let draggedPlayer = null;
let draggedFromRoundIndex = null;
let draggedPlayerIndex = null;
let draggedRoundIndex = null;

class Player {
  constructor(name, skill, position, jerseySize) {
    this.name = name;
    this.skill = parseInt(skill);
    this.position = position.toLowerCase();
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
    const div = document.createElement('div');
    div.className = 'round';
    div.setAttribute('draggable', true);
    div.dataset.roundIndex = index;

    div.innerHTML = `<h3>Round ${index + 1} - ${this.type}</h3>`;

    this.players.forEach((player, playerIndex) => {
      const card = document.createElement('div');
      card.className = 'player-card';
      card.textContent = `${player.name} (Skill: ${player.skill}, ${player.position}, Size: ${player.jerseySize})`;
      card.setAttribute('draggable', true);
      card.dataset.roundIndex = index;
      card.dataset.playerIndex = playerIndex;

      // Player-level drag
      card.addEventListener('dragstart', handlePlayerDragStart);
      card.addEventListener('dragover', handleDragOver);
      card.addEventListener('drop', handlePlayerDrop);

      div.appendChild(card);
    });

    // Round-level drag
    div.addEventListener('dragstart', handleRoundDragStart);
    div.addEventListener('dragover', handleDragOver);
    div.addEventListener('drop', handleRoundDrop);

    return div;
  }


}

class DraftOrganizer {
  constructor() {
    this.players = [];
    this.rounds = [];
    this.roundSize = 4; // Default, can be changed
  }

  processFile() {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];

    if (!file) return alert('Please select a file.');

    const reader = new FileReader();
    reader.onload = (e) => {
      const lines = e.target.result.trim().split('\n');
      this.players = lines.map(line => {
        const [name, skill, position, jerseySize] = line.split(',');
        return new Player(name, skill, position, jerseySize);
      });

      this.sortPlayersIntoRounds();
      this.renderRounds();
    };

    reader.readAsText(file);
  }

  sortPlayersIntoRounds() {
    this.rounds = [];

    const forwards = this.players.filter(p => p.canPlay('forward') && p.position !== 'defence');
    const defencemen = this.players.filter(p => p.canPlay('defence') && p.position !== 'forward');
    const goalies = this.players.filter(p => p.position === 'goalie');

    forwards.sort((a, b) => b.skill - a.skill);
    defencemen.sort((a, b) => b.skill - a.skill);
    goalies.sort((a, b) => b.skill - a.skill);

    // Assign goalies (they are separate)
    this.assignToRounds(goalies, 'goalie');

    // Merge logic for forward and defence
    this.assignBalancedRounds(forwards, defencemen);
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

    this.rounds.forEach((round, index) => {
      const roundDiv = round.render(index);
      container.appendChild(roundDiv);
    });
  }
}

const draftOrganizer = new DraftOrganizer();
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

