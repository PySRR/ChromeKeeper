// ChromeKeeper Background Service Worker
// Handles initialization, storage setup, and tab management helpers

// On installation, set default values in chrome.storage.local
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    apiKey: '',
    model: 'google/gemma-3-27b-it',
    customModel: '',
    theme: 'light',
    autoRefresh: 'off'
  });
  console.log('ChromeKeeper installed with default settings');
});

/**
 * Helper function to get all open tabs across all windows
 * @returns {Promise<chrome.tabs.Tab[]>} Array of all open tabs
 */
function getTabs() {
  return chrome.tabs.query({});
}

// Expose getTabs to other extension pages via message passing
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getTabs') {
    getTabs().then(sendResponse);
    return true; // Required to use sendResponse asynchronously
  }

  if (request.action === 'getApiKey') {
    chrome.storage.local.get(['apiKey'], (result) => {
      sendResponse({ apiKey: result.apiKey || '' });
    });
    return true;
  }
});
