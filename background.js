// Circle to Search v3.0.0 - background service worker
//
//   search-full-screen     -> captures the visible tab and goes straight to Google Lens.
//   activate-visual-search -> opens the Rectangle / Draw selection overlay.
//
// Speed notes: the screenshot is taken as JPEG (not PNG) and cropped right here with
// OffscreenCanvas, so the big image never travels back and forth to the page.

const BRIDGE_PAGE = 'search_bridge.html';
const QUALITY = 90;
const FALLBACK_QUALITY = 55;

let busy = false;

chrome.commands.onCommand.addListener(async (command, tab) => {
  if (command !== 'search-full-screen' && command !== 'activate-visual-search') return;
  const activeTab = await resolveTab(tab);
  if (!activeTab) return;
  if (command === 'search-full-screen') await searchFullScreen(activeTab);
  else await activateOverlay(activeTab);
});

// Clean up the old in-popup shortcut recorder (replaced by Chrome's keyboard shortcut settings).
chrome.runtime.onInstalled.addListener(async () => {
  try {
    await chrome.storage.local.remove('customShortcuts');
    await chrome.scripting.unregisterContentScripts({ ids: ['cts-shortcuts'] }).catch(() => {});
    await chrome.permissions.remove({ origins: ['<all_urls>'] }).catch(() => {});
  } catch (_) { /* nothing to clean up */ }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action !== 'searchFullScreen' && request.action !== 'captureRect') return false;

  if (!sender.tab || typeof sender.tab.id !== 'number') {
    sendResponse({ ok: false, error: 'The active tab is unavailable.' });
    return false;
  }

  const job = request.action === 'searchFullScreen'
    ? searchFullScreen(sender.tab)
    : searchRect(sender.tab, request.bounds);
  job.then(sendResponse);
  return true;
});

// ---------------------------------------------------------------------------
// Searches
// ---------------------------------------------------------------------------

async function searchFullScreen(tab) {
  return runSearch(tab, () => (quality) => captureTab(tab.windowId, quality));
}

async function searchRect(tab, bounds) {
  if (!validBounds(bounds)) return { ok: false, error: 'The selected area is invalid.' };
  return runSearch(tab, async () => {
    const shot = await captureTab(tab.windowId, QUALITY);
    return (quality) => cropImage(shot, bounds, quality);
  });
}

async function runSearch(tab, prepare) {
  if (busy) return { ok: false, error: 'A search is already running.' };
  busy = true;
  try {
    const render = await prepare();
    let dataUrl = await render(QUALITY);
    try {
      await storeImage(dataUrl);
    } catch (storageError) {
      // Very large / high-DPI screens can exceed the storage quota: retry with a lighter JPEG.
      dataUrl = await render(FALLBACK_QUALITY);
      await storeImage(dataUrl);
    }
    await openBridgeTab(tab);
    return { ok: true };
  } catch (error) {
    const message = error?.message || 'Could not capture this page.';
    console.warn('Circle to Search failed:', message);
    flagFailure(tab.id, 'This page cannot be captured');
    return { ok: false, error: message };
  } finally {
    busy = false;
  }
}

async function activateOverlay(tab) {
  // Overlay script already on the page? Just wake it up (no re-injection = faster).
  try {
    await chrome.tabs.sendMessage(tab.id, { action: 'activateOverlay' });
    return;
  } catch (_) { /* not injected yet */ }

  try {
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
    await chrome.tabs.sendMessage(tab.id, { action: 'activateOverlay' });
  } catch (error) {
    console.warn('Circle to Search could not activate on this page:', error?.message || error);
    flagFailure(tab.id, 'This page does not allow Circle to Search');
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function validBounds(b) {
  return !!b && ['x', 'y', 'width', 'height', 'viewportWidth', 'viewportHeight'].every((k) => Number.isFinite(b[k]))
    && b.width > 0 && b.height > 0 && b.viewportWidth > 0 && b.viewportHeight > 0;
}

async function resolveTab(tab) {
  if (tab && typeof tab.id === 'number') return tab;
  try {
    const [active] = await chrome.tabs.query({ active: true, currentWindow: true });
    return active && typeof active.id === 'number' ? active : null;
  } catch (_) {
    return null;
  }
}

function captureTab(windowId, quality) {
  const target = typeof windowId === 'number' ? windowId : chrome.windows.WINDOW_ID_CURRENT;
  return new Promise((resolve, reject) => {
    chrome.tabs.captureVisibleTab(target, { format: 'jpeg', quality }, (dataUrl) => {
      if (chrome.runtime.lastError || !dataUrl) {
        reject(new Error(chrome.runtime.lastError?.message || 'Screenshot capture failed.'));
      } else {
        resolve(dataUrl);
      }
    });
  });
}

// Crops the screenshot to the selected area and returns it as a JPEG data URL.
async function cropImage(dataUrl, bounds, quality) {
  const source = await (await fetch(dataUrl)).blob();
  const full = await createImageBitmap(source);
  try {
    const scaleX = full.width / bounds.viewportWidth;
    const scaleY = full.height / bounds.viewportHeight;
    const sx = Math.max(0, Math.min(full.width - 1, Math.floor(bounds.x * scaleX)));
    const sy = Math.max(0, Math.min(full.height - 1, Math.floor(bounds.y * scaleY)));
    const sw = Math.min(full.width - sx, Math.max(1, Math.ceil(bounds.width * scaleX)));
    const sh = Math.min(full.height - sy, Math.max(1, Math.ceil(bounds.height * scaleY)));
    if (sw < 2 || sh < 2) throw new Error('The selected area is too small to search.');

    const canvas = new OffscreenCanvas(sw, sh);
    canvas.getContext('2d').drawImage(full, sx, sy, sw, sh, 0, 0, sw, sh);
    const out = await canvas.convertToBlob({ type: 'image/jpeg', quality: quality / 100 });
    return blobToDataUrl(out);
  } finally {
    full.close();
  }
}

async function blobToDataUrl(blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  }
  return `data:${blob.type || 'image/jpeg'};base64,${btoa(binary)}`;
}

function storeImage(dataUrl) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ lastCroppedImage: dataUrl }, () => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else resolve();
    });
  });
}

// Opens the bridge page right next to the tab the search came from.
function openBridgeTab(originTab) {
  const props = { url: chrome.runtime.getURL(BRIDGE_PAGE), active: true };
  if (originTab && typeof originTab.index === 'number') props.index = originTab.index + 1;
  if (originTab && typeof originTab.id === 'number') props.openerTabId = originTab.id;

  return new Promise((resolve, reject) => {
    chrome.tabs.create(props, (created) => {
      if (chrome.runtime.lastError || !created) {
        reject(new Error(chrome.runtime.lastError?.message || 'Could not open the Google Lens search page.'));
      } else {
        resolve(created);
      }
    });
  });
}

// Shows a short-lived red "!" on the toolbar icon.
function flagFailure(tabId, message) {
  if (typeof tabId !== 'number') return;
  const quiet = (result) => Promise.resolve(result).catch(() => {});
  quiet(chrome.action.setBadgeBackgroundColor({ tabId, color: '#E5484D' }));
  quiet(chrome.action.setBadgeText({ tabId, text: '!' }));
  quiet(chrome.action.setTitle({ tabId, title: `Circle to Search - ${message}` }));
  setTimeout(() => {
    quiet(chrome.action.setBadgeText({ tabId, text: '' }));
    quiet(chrome.action.setTitle({ tabId, title: 'Circle to Search' }));
  }, 4000);
}
