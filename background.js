// background.js - Chrome Tab Manager Service Worker

// Open side panel when extension icon is clicked
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId });
});

// Extract domain from URL
function extractDomain(url) {
  if (!url) return "unknown";

  // Handle chrome:// URLs
  if (url.startsWith("chrome://")) {
    const match = url.match(/^chrome:\/\/([^/]+)/);
    return match ? `chrome://${match[1]}` : "chrome://";
  }

  // Handle chrome-extension:// URLs
  if (url.startsWith("chrome-extension://")) {
    return "chrome-extension://";
  }

  // Handle about: URLs
  if (url.startsWith("about:")) {
    return url;
  }

  try {
    const urlObj = new URL(url);
    let hostname = urlObj.hostname;

    // Remove www. prefix
    if (hostname.startsWith("www.")) {
      hostname = hostname.substring(4);
    }

    return hostname;
  } catch {
    return "unknown";
  }
}

// Get favicon URL for a tab
function getFaviconUrl(tab) {
  if (tab.favIconUrl && !tab.favIconUrl.startsWith("data:")) {
    return tab.favIconUrl;
  }
  // Fallback to Google's favicon service
  const domain = extractDomain(tab.url);
  if (domain.startsWith("chrome://") || domain.startsWith("about:")) {
    return null;
  }
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
}

// Group tabs by domain
function groupTabsByDomain(tabs) {
  const groups = {};

  for (const tab of tabs) {
    const domain = extractDomain(tab.url);

    if (!groups[domain]) {
      groups[domain] = {
        domain,
        faviconUrl: getFaviconUrl(tab),
        tabs: [],
      };
    }

    groups[domain].tabs.push({
      id: tab.id,
      title: tab.title || "Untitled",
      url: tab.url,
      active: tab.active,
      pinned: tab.pinned,
      discarded: tab.discarded,
      audible: tab.audible,
      mutedInfo: tab.mutedInfo,
      windowId: tab.windowId,
      index: tab.index,
      favIconUrl: tab.favIconUrl,
    });
  }

  // Convert to array and sort by number of tabs (descending)
  return Object.values(groups).sort((a, b) => b.tabs.length - a.tabs.length);
}

// Get all tabs and send to side panel
async function getAllTabs() {
  try {
    const tabs = await chrome.tabs.query({});
    const groupedTabs = groupTabsByDomain(tabs);

    return {
      success: true,
      groups: groupedTabs,
      totalTabs: tabs.length,
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error("Error getting tabs:", error);
    return {
      success: false,
      error: error.message,
      groups: [],
      totalTabs: 0,
      timestamp: Date.now(),
    };
  }
}

// Listen for messages from side panel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GET_TABS") {
    getAllTabs().then(sendResponse);
    return true; // Keep message channel open for async response
  }

  if (message.type === "REFRESH_TABS") {
    getAllTabs().then((data) => {
      // Broadcast to all side panels
      chrome.runtime.sendMessage({
        type: "TABS_UPDATED",
        data,
      });
      sendResponse(data);
    });
    return true;
  }

  if (message.type === "ACTIVATE_TAB") {
    chrome.tabs.update(message.tabId, { active: true }).then((tab) => {
      chrome.windows.update(tab.windowId, { focused: true });
      sendResponse({ success: true });
    }).catch((error) => {
      sendResponse({ success: false, error: error.message });
    });
    return true;
  }

  if (message.type === "CLOSE_TAB") {
    chrome.tabs.remove(message.tabId).then(() => {
      sendResponse({ success: true });
    }).catch((error) => {
      sendResponse({ success: false, error: error.message });
    });
    return true;
  }
});

// Listen for tab changes and notify side panel
chrome.tabs.onCreated.addListener(() => notifyTabsUpdated());
chrome.tabs.onUpdated.addListener(() => notifyTabsUpdated());
chrome.tabs.onRemoved.addListener(() => notifyTabsUpdated());
chrome.tabs.onActivated.addListener(() => notifyTabsUpdated());
chrome.tabs.onMoved.addListener(() => notifyTabsUpdated());
chrome.windows.onCreated.addListener(() => notifyTabsUpdated());
chrome.windows.onRemoved.addListener(() => notifyTabsUpdated());

// Keyboard shortcut to open side panel
chrome.commands.onCommand.addListener((command) => {
  if (command === 'open-side-panel') {
    chrome.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
      if (tabs.length > 0) {
        chrome.sidePanel.open({ windowId: tabs[0].windowId });
      }
    });
  }
});

async function notifyTabsUpdated() {
  const data = await getAllTabs();
  try {
    chrome.runtime.sendMessage({
      type: "TABS_UPDATED",
      data,
    });
  } catch {
    // Side panel may not be open, ignore
  }
}
