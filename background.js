// background.js - Service worker for tab management

chrome.runtime.onInstalled.addListener(() => {
  console.log('Tab Manager with AI Summary installed');
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getTabs') {
    getAllTabs().then(tabs => {
      sendResponse({ tabs: tabs });
    });
    return true;
  }

  if (request.action === 'openSidePanel') {
    chrome.sidePanel.open({ windowId: sender.tab.windowId });
    sendResponse({ success: true });
    return true;
  }
});

async function getAllTabs() {
  try {
    const tabs = await chrome.tabs.query({});
    return tabs.map(tab => ({
      id: tab.id,
      title: tab.title,
      url: tab.url,
      favicon: tab.favIconUrl,
      active: tab.active,
      pinned: tab.pinned,
      discarded: tab.discarded,
      windowId: tab.windowId,
      domain: extractDomain(tab.url)
    }));
  } catch (error) {
    console.error('Error getting tabs:', error);
    return [];
  }
}

function extractDomain(url) {
  if (!url || url.startsWith('chrome://') || url.startsWith('chrome-extension://')) {
    return 'System Pages';
  }

  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./, '');
  } catch {
    return 'Unknown';
  }
}

function groupTabsByDomain(tabs) {
  const groups = {};

  tabs.forEach(tab => {
    const domain = tab.domain || 'Unknown';
    if (!groups[domain]) {
      groups[domain] = [];
    }
    groups[domain].push(tab);
  });

  return groups;
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    chrome.runtime.sendMessage({
      action: 'tabsUpdated',
      tab: {
        id: tab.id,
        title: tab.title,
        url: tab.url,
        domain: extractDomain(tab.url)
      }
    }).catch(() => {});
  }
});

chrome.tabs.onCreated.addListener(() => {
  chrome.runtime.sendMessage({ action: 'tabsUpdated' }).catch(() => {});
});

chrome.tabs.onRemoved.addListener(() => {
  chrome.runtime.sendMessage({ action: 'tabsUpdated' }).catch(() => {});
});
