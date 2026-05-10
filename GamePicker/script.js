let isLocked = false;

/** If column names in the export change, update only these keys. */
const CSV_COLUMNS = {
  name: 'name',
};

/**
 * Roster files live one level up from GamePicker/. Serve from the repo root.
 * Opening index.html via file:// often blocks fetch; use a static server.
 */
const ROSTER_TXT_URLS = {
  forward: '../FORWARD.txt',
  defense: '../DEFENSE.txt',
  either: '../BOTH.txt',
  goal: '../GOALIES.txt',
};

let rosterSetsCache = null;

function normalizeName(str) {
  if (str == null || typeof str !== 'string') return '';
  return str.trim().toLowerCase().replace(/\s+/g, ' ');
}

function parseRosterText(text) {
  const set = new Set();
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const name = trimmed.split(',')[0].trim();
    const key = normalizeName(name);
    if (key) set.add(key);
  }
  return set;
}

async function loadRosterSets() {
  if (rosterSetsCache) return rosterSetsCache;

  const entries = Object.entries(ROSTER_TXT_URLS);
  const responses = await Promise.all(
    entries.map(([, url]) =>
      fetch(url).then((r) => {
        if (!r.ok) throw new Error(`Failed to load roster: ${url} (${r.status})`);
        return r.text();
      })
    )
  );

  rosterSetsCache = {};
  entries.forEach(([key], i) => {
    rosterSetsCache[key] = parseRosterText(responses[i]);
  });
  return rosterSetsCache;
}

/** Precedence if a name appears in multiple lists: Goal > Forward > Defense > Either (BOTH). */
function groupIdForName(name, rosterSets) {
  const key = normalizeName(name);
  if (!key) return 'Either';
  if (rosterSets.goal.has(key)) return 'Goal';
  if (rosterSets.forward.has(key)) return 'Forward';
  if (rosterSets.defense.has(key)) return 'Defense';
  if (rosterSets.either.has(key)) return 'Either';
  return 'Either';
}

document.getElementById('csvFile').addEventListener('change', async function (e) {
  const file = e.target.files[0];
  if (!file) return;

  let rosterSets;
  try {
    rosterSets = await loadRosterSets();
  } catch (err) {
    console.error(err);
    alert('Could not load roster files. Use a local server from the repo root (not file://).');
    return;
  }

  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: function (results) {
      const items = results.data;
      ['Forward', 'Defense', 'Either', 'Goal'].forEach((group) => {
        document.getElementById('group-' + group).innerHTML = '';
      });

      items.forEach((row, index) => {
        const displayName = (row[CSV_COLUMNS.name] ?? '').toString().trim();
        if (!normalizeName(displayName)) return;

        const groupId = groupIdForName(displayName, rosterSets);

        const div = document.createElement('div');
        div.className = 'draggable';
        div.draggable = true;
        div.ondragstart = (ev) => {
          if (!isLocked) ev.dataTransfer.setData('text/plain', div.id);
        };
        div.id = 'item-' + index;
        div.innerText = displayName;

        document.getElementById('group-' + groupId).appendChild(div);
      });
    },
  });
});

function allowDrop(ev) {
  if (!isLocked) ev.preventDefault();
}

function drop(ev) {
  if (!isLocked) {
    ev.preventDefault();
    const id = ev.dataTransfer.getData("text/plain");
    const draggableElement = document.getElementById(id);
    ev.target.appendChild(draggableElement);
  }
}

document.getElementById('lockToggle').addEventListener('click', () => {
  isLocked = !isLocked;
  document.getElementById('lockToggle').innerText = isLocked ? 'Unlock' : 'Lock';
  document.getElementById('copyTeam').style.display = isLocked ? 'inline-block' : 'none';

  document.querySelectorAll('.slot .draggable').forEach(el => {
    el.onclick = isLocked ? () => navigator.clipboard.writeText(el.innerText) : null;
  });
});

document.getElementById('copyTeam').addEventListener('click', () => {
  const slots = Array.from(document.querySelectorAll('.slot'));
  const getName = slot => {
    const player = slot.querySelector('.draggable');
    return player ? player.innerText : '[Empty]';
  };

  const formatLine = (indexesTop, indexesBottom) => {
    const top = indexesTop.map(i => getName(slots[i])).join(' - ');
    const bottom = indexesBottom.map(i => getName(slots[i])).join(' - ');
    return `${top}\n${bottom}`;
  };

  let output = `Goal\n${getName(slots[0])}\n\n`;

  output += `Line 1\n${formatLine([1, 2, 3], [4, 5])}\n\n`;
  output += `Line 2\n${formatLine([6, 7, 8], [9, 10])}\n\n`;
  output += `Line 3\n${formatLine([11, 12, 13], [14, 15])}`;

  navigator.clipboard.writeText(output);
});


document.querySelectorAll('.toggle-button').forEach(button => {
  button.addEventListener('click', () => {
    const groupDiv = button.nextElementSibling;
    groupDiv.style.display = groupDiv.style.display === 'none' ? 'block' : 'none';
    button.innerText = button.innerText.includes('▼')
      ? button.innerText.replace('▼', '▲')
      : button.innerText.replace('▲', '▼');
  });
});
