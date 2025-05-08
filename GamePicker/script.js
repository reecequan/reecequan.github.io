let isLocked = false;

document.getElementById('csvFile').addEventListener('change', function (e) {
  const file = e.target.files[0];
  if (!file) return;

  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: function(results) {
      const items = results.data;
      ['Forward', 'Defense', 'Either', 'Goal'].forEach(group => {
        document.getElementById('group-' + group).innerHTML = '';
      });

      items.forEach((row, index) => {
        const [role, answer] = row.answers.split(':');
        const group = answer?.trim() || 'Either';
        const groupId = ['Forward', 'Defense', 'Goal'].includes(group) ? group : 'Either';

        const div = document.createElement('div');
        div.className = 'draggable';
        div.draggable = true;
        div.ondragstart = (e) => {
          if (!isLocked) e.dataTransfer.setData("text/plain", div.id);
        };
        div.id = 'item-' + index;
        div.innerText = row.name;

        document.getElementById('group-' + groupId).appendChild(div);
      });
    }
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
