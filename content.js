// Circle to Search v2.0.0
// Injected on demand by the browser-level keyboard command or extension popup.
(() => {
  if (window.__circleToSearchInjected) return;
  window.__circleToSearchInjected = true;

  const MODES = new Set(['draw', 'rectangle', 'fullscreen']);
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
  const systemDarkQuery = window.matchMedia('(prefers-color-scheme: dark)');

  chrome.storage.local.get(['defaultMode', 'themePreference'], (settings) => {
    defaultMode = MODES.has(settings.defaultMode) ? settings.defaultMode : 'rectangle';
    themePreference = THEMES.has(settings.themePreference) ? settings.themePreference : 'auto';
    if (!MODES.has(settings.defaultMode)) chrome.storage.local.set({ defaultMode: 'rectangle' });
    if (!THEMES.has(settings.themePreference)) chrome.storage.local.set({ themePreference: 'auto' });
    settingsLoaded = true;
    if (pendingActivation) {
      pendingActivation = false;
      initOverlay();
    }
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local') return;
    if (changes.defaultMode) defaultMode = MODES.has(changes.defaultMode.newValue) ? changes.defaultMode.newValue : 'rectangle';
    if (changes.themePreference) {
      themePreference = THEMES.has(changes.themePreference.newValue) ? changes.themePreference.newValue : 'auto';
      applyToolbarTheme();
    }
  });

  function resolveTheme() {
    if (themePreference === 'light' || themePreference === 'dark') return themePreference;
    return systemDarkQuery.matches ? 'dark' : 'light';
  }

  function applyToolbarTheme() {
    if (toolbar) toolbar.dataset.theme = resolveTheme();
  }

  systemDarkQuery.addEventListener?.('change', () => {
    if (themePreference === 'auto') applyToolbarTheme();
  });

  function activateOverlay() {
    if (!settingsLoaded) {
      pendingActivation = true;
      return;
    }
    initOverlay();
  }

  // Escape closes the current selector. Activation itself is handled by
  // chrome.commands in the service worker, so it works in newly opened tabs.
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && canvas) {
      event.preventDefault();
      removeOverlay();
    }
  }, true);

  function initOverlay() {
    if (!document.body || canvas) return;
    selectionMode = MODES.has(defaultMode) ? defaultMode : 'rectangle';
    points = [];
    startPoint = null;
    isSelecting = false;

    canvas = document.createElement('canvas');
    canvas.id = 'cts-overlay-canvas';
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.setAttribute('aria-label', 'Circle to Search selection area');
    document.body.appendChild(canvas);
    ctx = canvas.getContext('2d');

    toolbar = document.createElement('div');
    toolbar.id = 'cts-mode-toolbar';
    toolbar.innerHTML = `
      <div class="cts-toolbar-heading">
        <span class="cts-google-mark"><i></i><i></i><i></i><i></i></span>
        <span>Circle to Search</span>
        <span class="cts-toolbar-hint" id="cts-mode-hint">Choose a search mode</span>
      </div>
      <div class="cts-mode-options" role="group" aria-label="Search mode">
        <button type="button" class="cts-mode-button" data-mode="draw" aria-pressed="false">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 17.5V20h2.5L19 7.5 16.5 5 4 17.5Z"/><path d="m14.8 6.7 2.5 2.5M4 20l5.2-1.4"/></svg>
          <span>Draw</span>
        </button>
        <button type="button" class="cts-mode-button" data-mode="rectangle" aria-pressed="false">
          <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="14" rx="2"/><path d="M8 5v2M16 17v2"/></svg>
          <span>Rectangle</span>
        </button>
        <button type="button" class="cts-mode-button" data-mode="fullscreen" aria-pressed="false">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
          <span>Full screen</span>
        </button>
      </div>
      <div class="cts-toolbar-footer"><span id="cts-mode-description"></span><span>Esc to cancel</span></div>
    `;
    document.body.appendChild(toolbar);
    applyToolbarTheme();

    toolbar.querySelectorAll('[data-mode]').forEach((button) => {
      button.addEventListener('click', () => {
        const mode = button.dataset.mode;
        if (!MODES.has(mode)) return;
        if (mode === 'fullscreen') {
          captureSelection({ x: 0, y: 0, width: window.innerWidth, height: window.innerHeight });
        } else {
          setSelectionMode(mode);
        }
      });
    });

    canvas.addEventListener('pointerdown', startSelection);
    canvas.addEventListener('pointermove', moveSelection);
    canvas.addEventListener('pointerup', finishSelection);
    canvas.addEventListener('pointercancel', cancelSelection);
    canvas.addEventListener('contextmenu', (event) => event.preventDefault());
    setSelectionMode(selectionMode);
  }

  function setSelectionMode(mode) {
    if (!MODES.has(mode)) return;
    selectionMode = mode;
    points = [];
    startPoint = null;
    isSelecting = false;
    if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
    canvas.style.pointerEvents = 'auto';

    toolbar.querySelectorAll('[data-mode]').forEach((button) => {
      const selected = button.dataset.mode === mode;
      button.classList.toggle('is-selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });

    const hint = toolbar.querySelector('#cts-mode-hint');
    const description = toolbar.querySelector('#cts-mode-description');
    if (mode === 'fullscreen') {
      hint.textContent = 'Full screen selected';
      description.textContent = 'Click Full screen to search the visible tab';
      canvas.style.cursor = 'default';
    } else if (mode === 'draw') {
      hint.textContent = 'Draw around anything';
      description.textContent = 'Click and freely draw around an object';
      canvas.style.cursor = 'crosshair';
    } else {
      hint.textContent = 'Rectangle selected';
      description.textContent = 'Drag between opposite corners';
      canvas.style.cursor = 'crosshair';
    }
  }

  function startSelection(event) {
    if (event.button !== 0 || !canvas || !['draw', 'rectangle'].includes(selectionMode)) return;
    event.preventDefault();
    isSelecting = true;
    startPoint = { x: event.clientX, y: event.clientY };
    points = [startPoint];
    try { canvas.setPointerCapture(event.pointerId); } catch (_) { /* Pointer capture is optional. */ }
    renderSelection();
  }

  function moveSelection(event) {
    if (!isSelecting) return;
    event.preventDefault();
    const nextPoint = { x: event.clientX, y: event.clientY };
    if (selectionMode === 'draw') points.push(nextPoint);
    else points = [startPoint, nextPoint];
    renderSelection();
  }

  function finishSelection(event) {
    if (!isSelecting) return;
    event.preventDefault();
    isSelecting = false;
    const endPoint = { x: event.clientX, y: event.clientY };
    if (selectionMode === 'draw') points.push(endPoint);
    else points = [startPoint, endPoint];

    if (points.length < (selectionMode === 'draw' ? 3 : 2)) {
      points = [];
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const point of points) {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    }
    minX = Math.max(0, minX);
    minY = Math.max(0, minY);
    maxX = Math.min(window.innerWidth, maxX);
    maxY = Math.min(window.innerHeight, maxY);
    const width = maxX - minX;
    const height = maxY - minY;

    if (width > 12 && height > 12) captureSelection({ x: minX, y: minY, width, height });
    else {
      points = [];
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  function cancelSelection() {
    if (!isSelecting) return;
    isSelecting = false;
    points = [];
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  function googleGradient(x1, y1, x2, y2) {
    const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
    gradient.addColorStop(0, '#4285F4');
    gradient.addColorStop(0.34, '#EA4335');
    gradient.addColorStop(0.67, '#FBBC05');
    gradient.addColorStop(1, '#34A853');
    return gradient;
  }

  function renderSelection() {
    if (!ctx || !canvas || points.length < 2) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    if (selectionMode === 'draw') {
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#4285F4';
      ctx.strokeStyle = googleGradient(points[0].x, points[0].y, points[points.length - 1].x, points[points.length - 1].y);
      ctx.lineWidth = 2.7;
      ctx.stroke();
      ctx.shadowBlur = 4;
      ctx.shadowColor = '#EA4335';
      ctx.strokeStyle = 'rgba(255,255,255,.96)';
      ctx.lineWidth = 1.0;
      ctx.stroke();
    } else {
      const x = Math.min(points[0].x, points[1].x);
      const y = Math.min(points[0].y, points[1].y);
      const width = Math.abs(points[1].x - points[0].x);
      const height = Math.abs(points[1].y - points[0].y);
      ctx.beginPath();
      ctx.rect(x, y, width, height);
      ctx.fillStyle = 'rgba(66, 133, 244, 0.08)';
      ctx.fill();
      ctx.shadowBlur = 9;
      ctx.shadowColor = '#4285F4';
      ctx.strokeStyle = googleGradient(x, y, x + width, y + height);
      ctx.lineWidth = 3.0;
      ctx.stroke();
      ctx.shadowBlur = 4;
      ctx.shadowColor = '#EA4335';
      ctx.strokeStyle = 'rgba(255,255,255,.94)';
      ctx.lineWidth = 1.0;
      ctx.stroke();
    }
    ctx.restore();
  }

  function captureSelection(bounds) {
    if (!canvas) return;
    removeOverlay();
    // Allow the original page to repaint before capturing the visible tab.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      setTimeout(() => {
        chrome.runtime.sendMessage({
          action: 'captureRect',
          bounds: {
            x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height,
            dpr: window.devicePixelRatio || 1,
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight
          }
        }, () => {
          if (chrome.runtime.lastError) console.warn('Circle to Search capture request failed:', chrome.runtime.lastError.message);
        });
      }, 70);
    }));
  }

  function showToast(message, isError = false) {
    const previous = document.getElementById('cts-status-toast');
    if (previous) previous.remove();
    const toast = document.createElement('div');
    toast.id = 'cts-status-toast';
    toast.textContent = message;
    toast.style.cssText = `position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:2147483647;padding:10px 16px;border-radius:999px;background:${isError ? '#b3261e' : '#202124'};color:#fff;font:500 13px/1.35 Roboto,Arial,sans-serif;box-shadow:0 4px 18px rgba(0,0,0,.28);max-width:calc(100vw - 32px);text-align:center;`;
    (document.body || document.documentElement).appendChild(toast);
    window.setTimeout(() => toast.remove(), 3800);
  }

  function removeOverlay() {
    if (canvas) canvas.remove();
    if (toolbar) toolbar.remove();
    canvas = null;
    toolbar = null;
    ctx = null;
    points = [];
    startPoint = null;
    isSelecting = false;
  }

  // The worker sends the captured screenshot back here for cropping.
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'activateOverlay') {
      activateOverlay();
      sendResponse?.({ ok: true });
      return false;
    }
    if (message.action === 'captureFailed') {
      showToast(message.message || 'Could not capture this tab. Please try again.', true);
      return;
    }
    if (message.action !== 'cropAndSearch') return false;
    sendResponse?.({ received: true });

    const image = new Image();
    image.onload = () => {
      try {
        const bounds = message.bounds || {};
        const viewportWidth = Number(bounds.viewportWidth) > 0 ? Number(bounds.viewportWidth) : window.innerWidth;
        const viewportHeight = Number(bounds.viewportHeight) > 0 ? Number(bounds.viewportHeight) : window.innerHeight;
        const scaleX = image.naturalWidth / viewportWidth;
        const scaleY = image.naturalHeight / viewportHeight;
        const sx = Math.max(0, Math.min(image.naturalWidth - 1, Math.floor(Number(bounds.x) * scaleX)));
        const sy = Math.max(0, Math.min(image.naturalHeight - 1, Math.floor(Number(bounds.y) * scaleY)));
        const sw = Math.min(image.naturalWidth - sx, Math.max(1, Math.ceil(Number(bounds.width) * scaleX)));
        const sh = Math.min(image.naturalHeight - sy, Math.max(1, Math.ceil(Number(bounds.height) * scaleY)));
        if (!Number.isFinite(sx + sy + sw + sh) || sw < 2 || sh < 2) throw new Error('The selected area is too small to search.');

        const cropCanvas = document.createElement('canvas');
        cropCanvas.width = sw;
        cropCanvas.height = sh;
        const cropContext = cropCanvas.getContext('2d');
        if (!cropContext) throw new Error('Image processing is unavailable in this tab.');
        cropContext.drawImage(image, sx, sy, sw, sh, 0, 0, sw, sh);
        const croppedDataUrl = cropCanvas.toDataURL('image/jpeg', 0.92);

        chrome.runtime.sendMessage({ action: 'openGoogleImageSearch', croppedDataUrl }, (response) => {
          if (chrome.runtime.lastError) showToast('Could not open Google Lens. Please try again.', true);
          else if (!response || response.ok !== true) showToast(response?.error || 'Could not start visual search. Please try again.', true);
        });
      } catch (error) {
        console.error('Circle to Search could not crop the screenshot:', error);
        showToast(error.message || 'Could not process the selected area.', true);
      }
    };
    image.onerror = () => showToast('Could not read the screenshot. Please try again.', true);
    image.src = message.dataUrl;
    return false;
  });
})();
