chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'captureRect') {
    chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
      if (chrome.runtime.lastError || !dataUrl) {
        console.error('Capture failed:', chrome.runtime.lastError);
        return;
      }
      if (sender.tab && sender.tab.id) {
        chrome.tabs.sendMessage(sender.tab.id, {
          action: 'cropAndSearch',
          dataUrl: dataUrl,
          bounds: request.bounds
        });
      }
    });
  } else if (request.action === 'openGoogleImageSearch') {
    chrome.storage.local.set({ lastCroppedImage: request.croppedDataUrl }, () => {
      chrome.tabs.create({
        url: chrome.runtime.getURL('search_bridge.html')
      });
    });
  }
});
