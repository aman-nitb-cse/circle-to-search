// Circle to Search v3.0.0
// Injected on demand by the "Rectangle / Draw" keyboard command.
(() => {
  if (window.__circleToSearchInjected) return;
  window.__circleToSearchInjected = true;

  const SELECTION_MODES = new Set(['draw', 'rectangle']);
  const THEMES = new Set(['auto', 'light', 'dark']);
  let settingsLoaded = false;
  let pendingActivation = false;
  let defaultMode = 'rectangle';
  let themePreference = 'auto';
  let selectionMode = 'rectangle';
  let isSelecting = false;
  let points = [];
  let startPoint = null;
  let canvas = null;
  let toolbar = null;
  let ctx = null;
  let host = null;
  let rafId = 0;

  const OVERLAY_CSS = `
*, *::before, *::after { box-sizing: border-box; }
#cts-canvas {
  position: absolute; inset: 0; width: 100%; height: 100%; display: block;
  cursor: crosshair; background: rgba(8, 10, 24, .10); touch-action: none; pointer-events: auto;
}
#cts-toolbar {
  --bg: rgba(255,255,255,.96); --fg: #1e1b3a; --border: rgba(60,50,120,.18);
  --hover: rgba(139,92,246,.10); --active: rgba(139,92,246,.18); --accent: #7c3aed;
  position: fixed; top: 12px; right: 12px; z-index: 2147483647;
  display: flex; gap: 4px; padding: 5px;
  border: 1px solid var(--border); border-radius: 14px;
  background: var(--bg); color: var(--fg);
  box-shadow: 0 6px 20px rgba(0,0,0,.28);
  font-family: Roboto, Arial, sans-serif; user-select: none; pointer-events: auto;
}
#cts-toolbar[data-theme="dark"] {
  --bg: rgba(24,24,44,.96); --fg: #ece9ff; --border: rgba(167,139,250,.30);
  --hover: rgba(167,139,250,.16); --active: rgba(167,139,250,.30); --accent: #a78bfa;
}
#cts-toolbar button {
  min-width: 62px; display: flex; flex-direction: column; align-items: center; gap: 4px;
  padding: 7px 8px; border: 1px solid transparent; border-radius: 10px;
  background: transparent; color: inherit; cursor: pointer; font: 600 11px/1 Roboto, Arial, sans-serif;
}
#cts-toolbar button:hover { background: var(--hover); }
#cts-toolbar button.is-selected { background: var(--active); border-color: var(--accent); }
#cts-toolbar button[data-action="close"] { min-width: 30px; justify-content: center; }
#cts-toolbar svg { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 1.9; stroke-linecap: round; stroke-linejoin: round; }
`;

  const TOOLBAR_HTML = `
<button type="button" data-mode="draw">
  <svg viewBox="0 0 24 24"><path d="M4 17.5V20h2.5L19 7.5 16.5 5 4 17.5Z"/><path d="m14.8 6.7 2.5 2.5"/></svg><span>Draw</span>
</button>
<button type="button" data-mode="rectangle">
  <svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="14" rx="2"/></svg><span>Rectangle</span>
</button>
<button type="button" data-action="close" aria-label="Close">
  <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>
</button>`;

  const systemDarkQuery = window.matchMedia('(prefers-color-scheme: dark)');

  chrome.storage.local.get(['defaultMode', 'themePreference'], (settings) => {
    defaultMode = SELECTION_MODES.has(settings.defaultMode) ? settings.defaultMode : 'rectangle';
    themePreference = THEMES.has(settings.themePreference) ? settings.themePreference : 'auto';
    settingsLoaded = true;
    if (pendingActivation) {
      pendingActivation = false;
      initOverlay();
    }
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local') return;
    if (changes.defaultMode) defaultMode = SELECTION_MODES.has(changes.defaultMode.newValue) ? changes.defaultMode.newValue : 'rectangle';
    if (changes.themePreference) {
      themePreference = THEMES.has(changes.themePreference.newValue) ? changes.themePreference.newValue : 'auto';
      applyToolbarTheme();
    }
  });

  function applyToolbarTheme() {
    if (!toolbar) return;
    const dark = themePreference === 'dark' || (themePreference === 'auto' && systemDarkQuery.matches);
    toolbar.dataset.theme = dark ? 'dark' : 'light';
  }

  function activateOverlay() {
    if (!settingsLoaded) {
      pendingActivation = true;
      return;
    }
    initOverlay();
  }

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && canvas) {
      event.preventDefault();
      removeOverlay();
    }
  }, true);

  function initOverlay() {
    if (!document.documentElement || canvas) return;
    selectionMode = defaultMode;
    points = [];
    startPoint = null;
    isSelecting = false;

    // Shadow root + !important geometry, so host-page CSS cannot move or restyle the overlay.
    host = document.createElement('div');
    host.id = 'cts-overlay-host';
    host.style.cssText = 'all:initial!important;position:fixed!important;top:0!important;left:0!important;right:0!important;bottom:0!important;width:auto!important;height:auto!important;margin:0!important;padding:0!important;border:0!important;transform:none!important;filter:none!important;display:block!important;visibility:visible!important;opacity:1!important;pointer-events:none!important;z-index:2147483647!important;';
    const shadow = host.attachShadow({ mode: 'open' });

    const styleEl = document.createElement('style');
    styleEl.textContent = OVERLAY_CSS;
    shadow.appendChild(styleEl);

    canvas = document.createElement('canvas');
    canvas.id = 'cts-canvas';
    shadow.appendChild(canvas);

    toolbar = document.createElement('div');
    toolbar.id = 'cts-toolbar';
    toolbar.innerHTML = TOOLBAR_HTML;
    shadow.appendChild(toolbar);

    document.documentElement.appendChild(host);
    ctx = canvas.getContext('2d');
    sizeCanvas();
    window.addEventListener('resize', sizeCanvas);
    applyToolbarTheme();

    toolbar.addEventListener('click', (event) => {
      const button = event.target.closest('button');
      if (!button) return;
      if (button.dataset.action === 'close') removeOverlay();
      else if (SELECTION_MODES.has(button.dataset.mode)) setSelectionMode(button.dataset.mode);
    });

    canvas.addEventListener('pointerdown', startSelection);
    canvas.addEventListener('pointermove', moveSelection);
    canvas.addEventListener('pointerup', finishSelection);
    canvas.addEventListener('pointercancel', cancelSelection);
    canvas.addEventListener('contextmenu', (event) => event.preventDefault());
    setSelectionMode(selectionMode);
  }

  function sizeCanvas() {
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(window.innerWidth * dpr));
    canvas.height = Math.max(1, Math.round(window.innerHeight * dpr));
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    points = [];
    isSelecting = false;
  }

  function clearCanvas() {
    if (ctx) ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  }

  function setSelectionMode(mode) {
    if (!SELECTION_MODES.has(mode) || !toolbar || !canvas) return;
    selectionMode = mode;
    points = [];
    startPoint = null;
    isSelecting = false;
    cancelAnimationFrame(rafId);
    rafId = 0;
    clearCanvas();
    toolbar.querySelectorAll('[data-mode]').forEach((button) => {
      button.classList.toggle('is-selected', button.dataset.mode === mode);
    });
  }

  function startSelection(event) {
    if (event.button !== 0) return;
    event.preventDefault();
    isSelecting = true;
    startPoint = { x: event.clientX, y: event.clientY };
    points = [startPoint];
    try { canvas.setPointerCapture(event.pointerId); } catch (_) { /* optional */ }
  }

  function moveSelection(event) {
    if (!isSelecting) return;
    event.preventDefault();
    const next = { x: event.clientX, y: event.clientY };
    if (selectionMode === 'draw') {
      const last = points[points.length - 1];
      if (!last || Math.hypot(next.x - last.x, next.y - last.y) >= 2) points.push(next);
    } else {
      points = [startPoint, next];
    }
    scheduleRender();
  }

  function finishSelection(event) {
    if (!isSelecting) return;
    event.preventDefault();
    isSelecting = false;
    cancelAnimationFrame(rafId);
    rafId = 0;
    const end = { x: event.clientX, y: event.clientY };
    if (selectionMode === 'draw') points.push(end);
    else points = [startPoint, end];

    const box = pointBounds(points);
    const minX = Math.max(0, box.minX);
    const minY = Math.max(0, box.minY);
    const maxX = Math.min(window.innerWidth, box.maxX);
    const maxY = Math.min(window.innerHeight, box.maxY);
    const width = maxX - minX;
    const height = maxY - minY;

    if (points.length >= 2 && width > 12 && height > 12) {
      captureSelection({ x: minX, y: minY, width, height });
    } else {
      points = [];
      clearCanvas();
    }
  }

  function cancelSelection() {
    if (!isSelecting) return;
    isSelecting = false;
    cancelAnimationFrame(rafId);
    rafId = 0;
    points = [];
    clearCanvas();
  }

  function pointBounds(list) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of list) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }
    return { minX, minY, maxX, maxY };
  }

  // ---------------------------------------------------------------------------
  // Rendering: dim everything except the selection, plus a simple outline.
  // Drawn only when the pointer moves (no animation loop, no blur/shadow).
  // ---------------------------------------------------------------------------

  function scheduleRender() {
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      rafId = 0;
      renderSelection();
    });
  }

  function buildShape() {
    const outline = new Path2D();
    if (selectionMode === 'draw') {
      outline.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length - 1; i++) {
        outline.quadraticCurveTo(points[i].x, points[i].y, (points[i].x + points[i + 1].x) / 2, (points[i].y + points[i + 1].y) / 2);
      }
      const tip = points[points.length - 1];
      outline.lineTo(tip.x, tip.y);
      const area = new Path2D(outline);
      area.closePath();
      return { outline, area };
    }
    const x = Math.min(points[0].x, points[1].x);
    const y = Math.min(points[0].y, points[1].y);
    const width = Math.abs(points[1].x - points[0].x);
    const height = Math.abs(points[1].y - points[0].y);
    outline.rect(x, y, width, height);
    return { outline, area: outline };
  }

  function renderSelection() {
    if (!ctx || !canvas || points.length < 2) return;
    const width = window.innerWidth;
    const height = window.innerHeight;
    const shape = buildShape();

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(6, 8, 22, 0.45)';
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = '#000';
    ctx.fill(shape.area);
    ctx.restore();

    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#8B5CF6';
    ctx.lineWidth = 4;
    ctx.stroke(shape.outline);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.stroke(shape.outline);
  }

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  // Lets the page repaint without our overlay before the tab is captured.
  function afterRepaint(callback) {
    requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(callback, 30)));
  }

  function handleResponse(response) {
    if (chrome.runtime.lastError) showToast('Could not start search. Please try again.');
    else if (!response || response.ok !== true) showToast(response?.error || 'Could not start search. Please try again.');
  }

  function captureSelection(bounds) {
    removeOverlay();
    afterRepaint(() => {
      chrome.runtime.sendMessage({
        action: 'captureRect',
        bounds: {
          x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height,
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight
        }
      }, handleResponse);
    });
  }

  function showToast(message) {
    const previous = document.getElementById('cts-status-toast');
    if (previous) previous.remove();
    const toast = document.createElement('div');
    toast.id = 'cts-status-toast';
    toast.textContent = message;
    toast.style.cssText = 'position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:2147483647;padding:10px 16px;border-radius:999px;background:#b3261e;color:#fff;font:500 13px/1.35 Roboto,Arial,sans-serif;box-shadow:0 4px 18px rgba(0,0,0,.28);max-width:calc(100vw - 32px);text-align:center;';
    (document.body || document.documentElement).appendChild(toast);
    window.setTimeout(() => toast.remove(), 3800);
  }

  function removeOverlay() {
    cancelAnimationFrame(rafId);
    rafId = 0;
    window.removeEventListener('resize', sizeCanvas);
    if (host) host.remove();
    host = null;
    canvas = null;
    toolbar = null;
    ctx = null;
    points = [];
    startPoint = null;
    isSelecting = false;
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'activateOverlay') {
      activateOverlay();
      sendResponse?.({ ok: true });
    }
    return false;
  });
})();
