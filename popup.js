const btn = document.getElementById('record-btn');
const display = document.getElementById('current-key');
const hint = document.getElementById('record-hint');

let isRecording = false;
let pressedSet = new Set();
let maxCombo = [];

function formatKeyName(k) {
  if (k === ' ') return 'Space';
  if (k === 'Control') return 'Ctrl';
  if (k.length === 1) return k.toUpperCase();
  return k;
}

function renderCombo(keysArray) {
  return keysArray.map(formatKeyName).join(' + ');
}

chrome.storage.local.get(['shortcutCombo'], (res) => {
  if (res.shortcutCombo && Array.isArray(res.shortcutCombo) && res.shortcutCombo.length > 0) {
    display.textContent = renderCombo(res.shortcutCombo);
  } else {
    chrome.storage.local.set({ shortcutCombo: ['Alt'] });
    display.textContent = 'Alt';
  }
});

btn.addEventListener('click', () => {
  if (isRecording) return;
  isRecording = true;
  pressedSet.clear();
  maxCombo = [];
  btn.textContent = 'Hold keys... Release to save';
  btn.classList.add('recording');
  display.textContent = 'Waiting for keys...';
  hint.textContent = 'Press 1 or multiple keys together, then release';
});

window.addEventListener('keydown', (e) => {
  if (!isRecording) return;
  e.preventDefault();
  e.stopPropagation();

  const normKey = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  pressedSet.add(normKey);

  const modOrder = ['Control', 'Alt', 'Shift', 'Meta'];
  const currentKeys = Array.from(pressedSet).sort((a, b) => {
    const ia = modOrder.indexOf(a);
    const ib = modOrder.indexOf(b);
    if (ia !== -1 && ib !== -1) return ia - ib;
    if (ia !== -1) return -1;
    if (ib !== -1) return 1;
    return a.localeCompare(b);
  });

  if (currentKeys.length >= maxCombo.length) {
    maxCombo = currentKeys;
  }

  display.textContent = renderCombo(maxCombo);
});

window.addEventListener('keyup', (e) => {
  if (!isRecording) return;
  e.preventDefault();
  e.stopPropagation();

  const normKey = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  pressedSet.delete(normKey);

  if (pressedSet.size === 0 && maxCombo.length > 0) {
    isRecording = false;
    chrome.storage.local.set({ shortcutCombo: maxCombo }, () => {
      display.textContent = renderCombo(maxCombo);
      btn.textContent = 'Record Shortcut Keys';
      btn.classList.remove('recording');
      hint.textContent = 'Shortcut saved! Refresh open tabs to use.';
    });
  }
});
