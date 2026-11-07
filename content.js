let shortcutCombo = ['Alt'];
let activeKeys = new Set();
let isDrawing = false;
let points = [];
let canvas = null;
let banner = null;
let ctx = null;

chrome.storage.local.get(['shortcutCombo'], (res) => {
  if (res.shortcutCombo && Array.isArray(res.shortcutCombo) && res.shortcutCombo.length > 0) {
    shortcutCombo = res.shortcutCombo;
  }
});

chrome.storage.onChanged.addListener((changes) => {
  if (changes.shortcutCombo && changes.shortcutCombo.newValue) {
    shortcutCombo = changes.shortcutCombo.newValue;
  }
});

function normalizeKey(k) {
  return k.length === 1 ? k.toLowerCase() : k;
}

function isComboMatched() {
  if (!shortcutCombo || shortcutCombo.length === 0) return false;
  if (activeKeys.size !== shortcutCombo.length) return false;
  return shortcutCombo.every(k => activeKeys.has(normalizeKey(k)));
}

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && canvas) {
    activeKeys.clear();
    removeOverlay();
    return;
  }

  const tag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
  const isEditable = document.activeElement && (document.activeElement.isContentEditable || tag === 'input' || tag === 'textarea');
  if (isEditable && shortcutCombo.length === 1 && shortcutCombo[0].length === 1) {
    return;
  }

  activeKeys.add(normalizeKey(e.key));

  if (!canvas && isComboMatched()) {
    e.preventDefault();
    initOverlay();
  }
});

window.addEventListener('keyup', (e) => {
  activeKeys.delete(normalizeKey(e.key));
});

window.addEventListener('blur', () => {
  activeKeys.clear();
});

function initOverlay() {
  canvas = document.createElement('canvas');
  canvas.id = 'cts-overlay-canvas';
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);

  banner = document.createElement('div');
  banner.id = 'cts-banner-pill';
  banner.innerHTML = '<span style="color:#4285F4">●</span><span style="color:#EA4335">●</span><span style="color:#FBBC05">●</span><span style="color:#34A853">●</span>&nbsp;Circle anything to search Google • Esc to cancel';
  document.body.appendChild(banner);

  ctx = canvas.getContext('2d');

  canvas.addEventListener('mousedown', startDraw);
  canvas.addEventListener('mousemove', draw);
  canvas.addEventListener('mouseup', endDraw);
}

function getGoogleStrokeColor(t) {
  const stops = [
    [66, 133, 244],
    [234, 67, 53],
    [251, 188, 5],
    [52, 168, 83],
    [66, 133, 244]
  ];
  const scaled = t * (stops.length - 1);
  const idx = Math.min(Math.floor(scaled), stops.length - 2);
  const f = scaled - idx;
  const c0 = stops[idx];
  const c1 = stops[idx + 1];
  const r = Math.round(c0[0] + f * (c1[0] - c0[0]));
  const g = Math.round(c0[1] + f * (c1[1] - c0[1]));
  const b = Math.round(c0[2] + f * (c1[2] - c0[2]));
  return `rgb(${r}, ${g}, ${b})`;
}

function renderDoodle() {
  if (!ctx || points.length === 0) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const n = points.length;
  if (n > 1) {
    for (let i = 1; i < n; i++) {
      const t = i / (n - 1);
      const col = getGoogleStrokeColor(t);
      ctx.beginPath();
      ctx.moveTo(points[i - 1].x, points[i - 1].y);
      ctx.lineTo(points[i].x, points[i].y);
      ctx.strokeStyle = col;
      ctx.lineWidth = 9;
      ctx.shadowColor = col;
      ctx.shadowBlur = 18;
      ctx.stroke();
    }

    for (let i = 1; i < n; i++) {
      const t = i / (n - 1);
      const col = getGoogleStrokeColor(t);
      ctx.beginPath();
      ctx.moveTo(points[i - 1].x, points[i - 1].y);
      ctx.lineTo(points[i].x, points[i].y);
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 4;
      ctx.shadowColor = col;
      ctx.shadowBlur = 8;
      ctx.stroke();
    }
  }

  const last = points[n - 1];
  const radial = ctx.createRadialGradient(last.x, last.y, 1, last.x, last.y, 12);
  radial.addColorStop(0, '#FFFFFF');
  radial.addColorStop(0.3, '#FBBC05');
  radial.addColorStop(0.7, '#34A853');
  radial.addColorStop(1, '#4285F4');

  ctx.shadowBlur = 16;
  ctx.shadowColor = '#4285F4';
  ctx.fillStyle = radial;
  ctx.beginPath();
  ctx.arc(last.x, last.y, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function startDraw(e) {
  isDrawing = true;
  points = [{ x: e.clientX, y: e.clientY }];
  renderDoodle();
}

function draw(e) {
  if (!isDrawing) return;
  points.push({ x: e.clientX, y: e.clientY });
  renderDoodle();
}

function endDraw() {
  if (!isDrawing) return;
  isDrawing = false;

  if (points.length < 3) {
    removeOverlay();
    return;
  }

  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  const pad = 6;
  const minX = Math.max(0, Math.min(...xs) - pad);
  const minY = Math.max(0, Math.min(...ys) - pad);
  const maxX = Math.min(window.innerWidth, Math.max(...xs) + pad);
  const maxY = Math.min(window.innerHeight, Math.max(...ys) + pad);

  const width = Math.round(maxX - minX);
  const height = Math.round(maxY - minY);

  if (width > 12 && height > 12) {
    // Immediately remove the canvas & banner from the DOM and wait for repaint before taking screenshot
    removeOverlay();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setTimeout(() => {
          chrome.runtime.sendMessage({
            action: 'captureRect',
            bounds: {
              x: minX,
              y: minY,
              width: width,
              height: height,
              dpr: window.devicePixelRatio || 1
            }
          });
          setTimeout(() => {
            showLoadingToast('Searching circled area with Google...');
          }, 80);
        }, 50);
      });
    });
  } else {
    removeOverlay();
  }
}

function removeOverlay() {
  if (canvas) {
    canvas.remove();
    canvas = null;
  }
  if (banner) {
    banner.remove();
    banner = null;
  }
}

function showLoadingToast(text) {
  let existing = document.getElementById('cts-toast-loading');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.id = 'cts-toast-loading';
  toast.textContent = text;
  document.body.appendChild(toast);
  setTimeout(() => {
    if (toast.parentNode) toast.remove();
  }, 3500);
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === 'cropAndSearch') {
    const img = new Image();
    img.onload = () => {
      const dpr = msg.bounds.dpr || 1;
      const sx = Math.round(msg.bounds.x * dpr);
      const sy = Math.round(msg.bounds.y * dpr);
      const sw = Math.round(msg.bounds.width * dpr);
      const sh = Math.round(msg.bounds.height * dpr);

      const cropCanvas = document.createElement('canvas');
      cropCanvas.width = sw;
      cropCanvas.height = sh;

      const cropCtx = cropCanvas.getContext('2d');
      cropCtx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

      const croppedDataUrl = cropCanvas.toDataURL('image/jpeg', 0.92);

      chrome.runtime.sendMessage({
        action: 'openGoogleImageSearch',
        croppedDataUrl: croppedDataUrl
      });
    };
    img.src = msg.dataUrl;
  }
});
