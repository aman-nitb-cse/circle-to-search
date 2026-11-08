// Circle to Search v2.0.0 - background service worker
// A browser-level command activates the extension on the focused tab.
// Chrome grants activeTab for this explicit keyboard shortcut gesture.

chrome.commands.onCommand.addListener(async (command, tab) => {
  if (command !== 'activate-visual-search') return;
  if (!tab || typeof tab.id !== 'number') return;

  try {
    await chrome.scripting.insertCSS({
      target: { tabId: tab.id },
      files: ['style.css']
    });

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    });

    await chrome.tabs.sendMessage(tab.id, { action: 'activateOverlay' });
  } catch (error) {
    // Chrome pages, the Web Store, and some restricted pages do not allow injection.
    console.warn('Circle to Search could not activate on this page:', error?.message || error);
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'captureRect') {
    if (!sender.tab || typeof sender.tab.id !== 'number') {
      sendResponse?.({ ok: false, error: 'The active tab is unavailable.' });
      return false;
    }

    const bounds = request.bounds || {};
    const valid = ['x', 'y', 'width', 'height', 'viewportWidth', 'viewportHeight'].every((key) =>
      Number.isFinite(bounds[key])
    ) && bounds.width > 0 && bounds.height > 0 && bounds.viewportWidth > 0 && bounds.viewportHeight > 0;

    if (!valid) {
      sendResponse?.({ ok: false, error: 'The selected area is invalid.' });
      return false;
    }

    chrome.tabs.captureVisibleTab(sender.tab.windowId, { format: 'png' }, (dataUrl) => {
      if (chrome.runtime.lastError || !dataUrl) {
        const message = chrome.runtime.lastError?.message || 'Screenshot capture failed.';
        console.error('Circle to Search screenshot capture failed:', message);
        chrome.tabs.sendMessage(sender.tab.id, { action: 'captureFailed', message }, () => void chrome.runtime.lastError);
        sendResponse?.({ ok: false, error: message });
        return;
      }

      chrome.tabs.sendMessage(sender.tab.id, {
        action: 'cropAndSearch',
        dataUrl,
        bounds
      }, () => {
        if (chrome.runtime.lastError) {
          const message = chrome.runtime.lastError.message;
          console.warn('Circle to Search could not crop the captured image:', message);
          sendResponse?.({ ok: false, error: message });
        } else {
          sendResponse?.({ ok: true });
        }
      });
    });
    return true;
  }

  if (request.action === 'openGoogleImageSearch' && typeof request.croppedDataUrl === 'string') {
    chrome.storage.local.set({ lastCroppedImage: request.croppedDataUrl }, () => {
      if (chrome.runtime.lastError) {
        const message = chrome.runtime.lastError.message;
        console.error('Circle to Search could not store the selected image:', message);
        sendResponse?.({ ok: false, error: message });
        return;
      }

      chrome.tabs.create({ url: chrome.runtime.getURL('search_bridge.html') }, (tab) => {
        if (chrome.runtime.lastError || !tab) {
          const message = chrome.runtime.lastError?.message || 'Could not open the Google Lens search page.';
          console.error('Circle to Search could not open the search page:', message);
          sendResponse?.({ ok: false, error: message });
          return;
        }
        sendResponse?.({ ok: true });
      });
    });
    return true;
  }

  return false;
});
