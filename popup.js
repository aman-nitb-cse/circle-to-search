// Circle to Search v3.0.0 popup settings
const modeButtons = Array.from(document.querySelectorAll('.mode-option'));
const themeSelect = document.getElementById('theme-select');
const shortcutHint = document.getElementById('shortcut-hint');
const promptPanel = document.getElementById('prompt-panel');
const promptToggle = document.getElementById('prompt-toggle');
const promptInput = document.getElementById('prompt-input');
const promptCount = document.getElementById('prompt-count');
const PROMPT_MAX = 300;
const systemDarkQuery = window.matchMedia('(prefers-color-scheme: dark)');

// One badge per keyboard command declared in manifest.json.
const shortcutBadges = {
  'search-full-screen': document.getElementById('key-fullscreen'),
  'activate-visual-search': document.getElementById('key-select')
};

const MODES = new Set(['draw', 'rectangle']);

function applyPopupTheme(preference) {
  const resolved = preference === 'dark' || (preference === 'auto' && systemDarkQuery.matches) ? 'dark' : 'light';
  document.documentElement.dataset.theme = resolved;
}

function setDefaultMode(mode) {
  if (!MODES.has(mode)) mode = 'rectangle';
  modeButtons.forEach((button) => {
    const selected = button.dataset.mode === mode;
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
}

modeButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const mode = button.dataset.mode;
    if (!MODES.has(mode)) return;
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
  if (!shortcut) return 'Record key';
  return shortcut.replace(/Command/g, '⌘').replace(/\+/g, ' + ');
}

// ---------------------------------------------------------------------------
// Default prompt: text that is sent with every search (applied in search_bridge.js).
// Saved automatically on every change; an empty prompt or a switched-off toggle sends nothing.
// ---------------------------------------------------------------------------
function renderPromptState() {
  promptCount.textContent = `${promptInput.value.length}/${PROMPT_MAX}`;
  promptPanel.classList.toggle('is-off', !promptToggle.checked);
}

function saveSetting(patch) {
  chrome.storage.local.set(patch, () => {
    if (chrome.runtime.lastError) console.warn('Circle to Search could not save settings:', chrome.runtime.lastError.message);
  });
}

promptInput.addEventListener('input', () => {
  renderPromptState();
  saveSetting({ defaultPrompt: promptInput.value.trim().slice(0, PROMPT_MAX) });
});

promptToggle.addEventListener('change', () => {
  renderPromptState();
  saveSetting({ defaultPromptEnabled: promptToggle.checked });
});

// ---------------------------------------------------------------------------
// Shortcuts: Chrome owns the key assignments, so "Record key" / a shortcut badge
// sends the user to the browser's keyboard shortcuts settings.
// ---------------------------------------------------------------------------
const SHORTCUTS_URL = /\bEdg\//.test(navigator.userAgent) ? 'edge://extensions/shortcuts' : 'chrome://extensions/shortcuts';
let chromeShortcuts = {};

function setHint(text, isError) {
  shortcutHint.textContent = text || '';
  shortcutHint.classList.toggle('is-error', !!isError);
}

function renderShortcuts() {
  Object.entries(shortcutBadges).forEach(([command, badge]) => {
    const shortcut = chromeShortcuts[command];
    badge.classList.toggle('is-empty', !shortcut);
    badge.textContent = formatShortcut(shortcut);
  });
}

function openShortcutSettings() {
  chrome.tabs.create({ url: SHORTCUTS_URL }, () => {
    if (chrome.runtime.lastError) {
      setHint(`Could not open the settings. Open ${SHORTCUTS_URL} manually.`, true);
    }
  });
}

Object.values(shortcutBadges).forEach((badge) => badge.addEventListener('click', openShortcutSettings));

function loadCommandShortcuts() {
  chrome.commands.getAll((commands) => {
    if (chrome.runtime.lastError) {
      console.warn('Circle to Search could not read shortcuts:', chrome.runtime.lastError.message);
    } else {
      chromeShortcuts = {};
      (commands || []).forEach((command) => { chromeShortcuts[command.name] = command.shortcut || ''; });
    }
    renderShortcuts();
  });
}

chrome.storage.local.get(['defaultMode', 'themePreference', 'defaultPrompt', 'defaultPromptEnabled'], (settings) => {
  promptInput.value = typeof settings.defaultPrompt === 'string' ? settings.defaultPrompt.slice(0, PROMPT_MAX) : '';
  promptToggle.checked = settings.defaultPromptEnabled !== false;
  renderPromptState();

  const mode = MODES.has(settings.defaultMode) ? settings.defaultMode : 'rectangle';
  setDefaultMode(mode);
  if (settings.defaultMode !== mode) chrome.storage.local.set({ defaultMode: mode });

  const theme = ['auto', 'light', 'dark'].includes(settings.themePreference) ? settings.themePreference : 'auto';
  themeSelect.value = theme;
  if (settings.themePreference !== theme) chrome.storage.local.set({ themePreference: theme });
  applyPopupTheme(theme);
});

loadCommandShortcuts();
