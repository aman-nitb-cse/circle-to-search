// Circle to Search v2.0.0 popup settings
const modeButtons = Array.from(document.querySelectorAll('.mode-option'));
const modeNote = document.getElementById('mode-note');
const themeSelect = document.getElementById('theme-select');
const currentKey = document.getElementById('current-key');
const shortcutHint = document.getElementById('shortcut-hint');
const changeShortcutButton = document.getElementById('change-shortcut');
const systemDarkQuery = window.matchMedia('(prefers-color-scheme: dark)');

const modeDescriptions = {
  draw: 'Draw freely around an object or area to select it.',
  rectangle: 'Drag from one corner to the opposite corner to select an area.',
  fullscreen: 'Search the entire visible browser screen.'
};

function applyPopupTheme(preference) {
  const resolved = preference === 'dark' || (preference === 'auto' && systemDarkQuery.matches) ? 'dark' : 'light';
  document.documentElement.dataset.theme = resolved;
}

function setDefaultMode(mode) {
  if (!Object.prototype.hasOwnProperty.call(modeDescriptions, mode)) mode = 'rectangle';
  modeButtons.forEach((button) => {
    const selected = button.dataset.mode === mode;
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  modeNote.textContent = modeDescriptions[mode];
}

modeButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const mode = button.dataset.mode;
    if (!Object.prototype.hasOwnProperty.call(modeDescriptions, mode)) return;
    setDefaultMode(mode);
    chrome.storage.local.set({ defaultMode: mode }, () => {
      if (chrome.runtime.lastError) console.warn('Circle to Search could not save default mode:', chrome.runtime.lastError.message);
    });
  });
});

themeSelect.addEventListener('change', () => {
  const preference = ['auto', 'light', 'dark'].includes(themeSelect.value) ? themeSelect.value : 'auto';
  chrome.storage.local.set({ themePreference: preference }, () => {
    if (chrome.runtime.lastError) console.warn('Circle to Search could not save appearance:', chrome.runtime.lastError.message);
    applyPopupTheme(preference);
  });
});

systemDarkQuery.addEventListener?.('change', () => {
  if (themeSelect.value === 'auto') applyPopupTheme('auto');
});

function formatShortcut(shortcut) {
  if (!shortcut) return 'Not assigned';
  return shortcut.replace(/Command/g, '⌘').replace(/\+/g, ' + ');
}

function loadCommandShortcut() {
  chrome.commands.getAll((commands) => {
    if (chrome.runtime.lastError) {
      currentKey.textContent = 'Unavailable';
      shortcutHint.textContent = 'Open Chrome shortcut settings to assign a key combination.';
      return;
    }
    const command = (commands || []).find((item) => item.name === 'activate-visual-search');
    currentKey.textContent = formatShortcut(command?.shortcut || '');
    if (!command?.shortcut) shortcutHint.textContent = 'No shortcut is assigned. Choose one in Chrome shortcut settings.';
  });
}

changeShortcutButton.addEventListener('click', () => {
  chrome.tabs.create({ url: 'chrome://extensions/shortcuts' }, () => {
    if (chrome.runtime.lastError) console.warn('Circle to Search could not open Chrome shortcut settings:', chrome.runtime.lastError.message);
  });
});

chrome.storage.local.get(['defaultMode', 'themePreference'], (settings) => {
  const mode = Object.prototype.hasOwnProperty.call(modeDescriptions, settings.defaultMode) ? settings.defaultMode : 'rectangle';
  setDefaultMode(mode);
  if (settings.defaultMode !== mode) chrome.storage.local.set({ defaultMode: mode });

  const theme = ['auto', 'light', 'dark'].includes(settings.themePreference) ? settings.themePreference : 'auto';
  themeSelect.value = theme;
  if (settings.themePreference !== theme) chrome.storage.local.set({ themePreference: theme });
  applyPopupTheme(theme);
});

loadCommandShortcut();
