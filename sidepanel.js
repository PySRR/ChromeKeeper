// ChromeKeeper Side Panel Script
// Handles tab enumeration, grouping by domain, and rendering

document.addEventListener('DOMContentLoaded', () => {
  const domainGroupsContainer = document.getElementById('domainGroups');
  const emptyState = document.getElementById('emptyState');
  const loadingState = document.getElementById('loadingState');
  const tabCount = document.getElementById('tabCount');
  const refreshBtn = document.getElementById('refreshBtn');
  const summarizeAllBtn = document.getElementById('summarizeAllBtn');
  const settingsBtn = document.getElementById('settingsBtn');
  const summaryContainer = document.getElementById('summaryContainer');
  const summaryContent = document.getElementById('summaryContent');
  const closeSummaryBtn = document.getElementById('closeSummaryBtn');

  // Extract domain from URL
  function extractDomain(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace(/^www\./, '');
    } catch {
      return 'Unknown';
    }
  }

  // Group tabs by domain
  function groupTabsByDomain(tabs) {
    const groups = {};
    tabs.forEach(tab => {
      // Filter out chrome:// URLs and extension pages
      if (tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
        const domain = extractDomain(tab.url);
        if (!groups[domain]) {
          groups[domain] = [];
        }
        groups[domain].push(tab);
      }
    });
    return groups;
  }

  // Render a single domain group
  function renderDomainGroup(domain, tabs) {
    const group = document.createElement('div');
    group.className = 'domain-group';
    group.dataset.domain = domain;

    const tabCount = tabs.length;
    const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;

    group.innerHTML = `
      <div class="group-header" data-domain="${domain}">
        <div class="group-info">
          <img class="group-favicon" src="${faviconUrl}" alt="${domain}" onerror="this.style.display='none'">
          <span class="group-domain">${domain}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span class="group-count">${tabCount} tab${tabCount !== 1 ? 's' : ''}</span>
          <svg class="group-collapse-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
      </div>
      <ul class="tab-list">
        ${tabs.map(tab => renderTabItem(tab)).join('')}
      </ul>
    `;

    return group;
  }

  // Render a single tab item
  function renderTabItem(tab) {
    const isActive = tab.active;
    const isPinned = tab.pinned;
    const faviconUrl = tab.favIconUrl || `https://www.google.com/s2/favicons?domain=${extractDomain(tab.url)}&sz=16`;

    return `
      <li class="tab-item ${isActive ? 'active' : ''}" data-tab-id="${tab.id}">
        <img class="tab-favicon" src="${faviconUrl}" alt="" onerror="this.style.display='none'">
        <div class="tab-info">
          <div class="tab-title">${escapeHtml(tab.title || 'Untitled')}</div>
          <div class="tab-url">${escapeHtml(tab.url || '')}</div>
        </div>
        <div class="tab-indicators">
          ${isActive ? '<span class="tab-badge active">Active</span>' : ''}
          ${isPinned ? '<span class="tab-badge pinned">Pinned</span>' : ''}
        </div>
      </li>
    `;
  }

  // Escape HTML to prevent XSS
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Load and render all tabs
  async function loadTabs() {
    loadingState.classList.remove('hidden');
    emptyState.classList.add('hidden');
    domainGroupsContainer.innerHTML = '';

    try {
      const tabs = await chrome.tabs.query({});
      const groups = groupTabsByDomain(tabs);
      const groupEntries = Object.entries(groups);

      loadingState.classList.add('hidden');

      if (groupEntries.length === 0) {
        emptyState.classList.remove('hidden');
        tabCount.textContent = '0 tabs';
        return;
      }

      // Sort groups by tab count (descending)
      groupEntries.sort((a, b) => b[1].length - a[1].length);

      groupEntries.forEach(([domain, tabs]) => {
        domainGroupsContainer.appendChild(renderDomainGroup(domain, tabs));
      });

      tabCount.textContent = `${tabs.length} tab${tabs.length !== 1 ? 's' : ''}`;
    } catch (error) {
      console.error('Error loading tabs:', error);
      loadingState.classList.add('hidden');
      emptyState.classList.remove('hidden');
    }
  }

  // Add collapse/expand functionality
  domainGroupsContainer.addEventListener('click', (e) => {
    const groupHeader = e.target.closest('.group-header');
    if (groupHeader) {
      const group = groupHeader.closest('.domain-group');
      const tabList = group.querySelector('.tab-list');
      const collapseIcon = groupHeader.querySelector('.group-collapse-icon');

      if (tabList.style.display === 'none') {
        tabList.style.display = '';
        collapseIcon.classList.remove('collapsed');
      } else {
        tabList.style.display = 'none';
        collapseIcon.classList.add('collapsed');
      }
    }

    // Handle tab click to switch to that tab
    const tabItem = e.target.closest('.tab-item');
    if (tabItem) {
      const tabId = parseInt(tabItem.dataset.tabId, 10);
      chrome.tabs.update(tabId, { active: true });
      chrome.windows.update(tabItem.dataset.windowId, { focused: true });
    }
  });

  // Refresh button
  refreshBtn.addEventListener('click', loadTabs);

  // Summarize All button (placeholder - will be implemented in future)
  summarizeAllBtn.addEventListener('click', async () => {
    summaryContainer.classList.remove('hidden');
    summaryContent.innerHTML = `
      <div class="loading-spinner">
        <div class="spinner"></div>
        <span>Generating summary...</span>
      </div>
    `;
    // TODO: Implement AI summarization
    setTimeout(() => {
      summaryContent.innerHTML = '<p class="text-muted">AI summarization will be available soon. Configure your API key in Settings to enable this feature.</p>';
    }, 1500);
  });

  // Close summary button
  closeSummaryBtn.addEventListener('click', () => {
    summaryContainer.classList.add('hidden');
  });

  // Settings button
  settingsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // Check API key status and enable/disable summarize button
  function updateSummarizeButton() {
    chrome.storage.local.get(['apiKey'], (result) => {
      const hasApiKey = result.apiKey && result.apiKey.length > 0;
      summarizeAllBtn.disabled = !hasApiKey;
    });
  }

  // Initial load
  loadTabs();
  updateSummarizeButton();

  // Listen for storage changes to update button state
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.apiKey) {
      updateSummarizeButton();
    }
  });
});
