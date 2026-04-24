document.addEventListener('DOMContentLoaded', () => {
  const tabGroupsContainer = document.getElementById('tabGroups');
  const tabCountEl = document.getElementById('tabCount');
  const refreshTabsBtn = document.getElementById('refreshTabs');
  const summarizeAllBtn = document.getElementById('summarizeAll');
  const openSettingsBtn = document.getElementById('openSettings');
  const overviewSection = document.getElementById('overviewSection');
  const overviewSummary = document.getElementById('overviewSummary');

  const groupTemplate = document.getElementById('groupTemplate');
  const tabItemTemplate = document.getElementById('tabItemTemplate');

  let allTabs = [];
  let groupedTabs = {};

  loadTabs();
  setupEventListeners();
  loadSettings();

  function setupEventListeners() {
    refreshTabsBtn.addEventListener('click', loadTabs);

    summarizeAllBtn.addEventListener('click', summarizeAll);

    openSettingsBtn.addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });

    tabGroupsContainer.addEventListener('click', handleGroupClick);

    chrome.runtime.onMessage.addListener((message) => {
      if (message.action === 'tabsUpdated') {
        loadTabs();
      }
    });
  }

  async function loadTabs() {
    tabGroupsContainer.innerHTML = '<div class="loading">Loading tabs...</div>';

    chrome.runtime.sendMessage({ action: 'getTabs' }, (response) => {
      if (response && response.tabs) {
        allTabs = response.tabs;
        groupedTabs = groupTabsByDomain(allTabs);
        renderTabGroups(groupedTabs);
        updateTabCount(allTabs.length);
        loadSettings();
      } else {
        tabGroupsContainer.innerHTML = '<div class="loading">Error loading tabs</div>';
      }
    });
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

    const sorted = {};
    Object.keys(groups)
      .sort((a, b) => {
        if (a === 'System Pages') return -1;
        if (b === 'System Pages') return 1;
        if (a === 'Unknown') return 1;
        if (b === 'Unknown') return -1;
        return groups[b].length - groups[a].length;
      })
      .forEach(key => {
        sorted[key] = groups[key];
      });

    return sorted;
  }

  function renderTabGroups(groups) {
    tabGroupsContainer.innerHTML = '';

    const domains = Object.keys(groups);
    const totalTabs = domains.reduce((sum, d) => sum + groups[d].length, 0);

    if (totalTabs === 0) {
      tabGroupsContainer.innerHTML = '<div class="loading">No tabs open</div>';
      return;
    }

    domains.forEach(domain => {
      const tabs = groups[domain];
      const clone = groupTemplate.content.cloneNode(true);

      const groupEl = clone.querySelector('.tab-group');
      groupEl.dataset.domain = domain;

      const groupToggle = clone.querySelector('.group-toggle');
      const groupFavicon = clone.querySelector('.group-favicon');
      const groupDomain = clone.querySelector('.group-domain');
      const groupCount = clone.querySelector('.group-count');
      const tabsList = clone.querySelector('.tabs-list');
      const summarizeBtn = clone.querySelector('.group-summarize');

      groupDomain.textContent = domain;
      groupCount.textContent = `${tabs.length} tab${tabs.length !== 1 ? 's' : ''}`;

      const firstTabWithFavicon = tabs.find(t => t.favicon);
      if (firstTabWithFavicon) {
        groupFavicon.src = firstTabWithFavicon.favicon;
        groupFavicon.onerror = null;
      } else {
        groupFavicon.style.display = 'none';
      }

      summarizeBtn.dataset.domain = domain;

      groupToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const content = groupEl.querySelector('.group-content');
        const isCollapsed = content.classList.toggle('collapsed');
        groupToggle.classList.toggle('collapsed', isCollapsed);
      });

      groupEl.querySelector('.group-header').addEventListener('click', (e) => {
        if (e.target === summarizeBtn || summarizeBtn.contains(e.target)) return;
        groupToggle.click();
      });

      tabs.forEach(tab => {
        const tabClone = tabItemTemplate.content.cloneNode(true);
        const tabItem = tabClone.querySelector('.tab-item');

        tabItem.dataset.tabId = tab.id;
        tabItem.dataset.tabUrl = tab.url || '';

        const favicon = tabClone.querySelector('.tab-favicon');
        const title = tabClone.querySelector('.tab-title');
        const url = tabClone.querySelector('.tab-url');
        const pinnedBadge = tabClone.querySelector('.tab-pinned');
        const activeBadge = tabClone.querySelector('.tab-active');
        const windowBadge = tabClone.querySelector('.tab-window');

        if (tab.favicon) {
          favicon.src = tab.favicon;
        } else {
          favicon.style.display = 'none';
        }

        title.textContent = tab.title || 'Untitled';
        url.textContent = tab.url ? truncateUrl(tab.url) : '';

        if (tab.pinned) {
          pinnedBadge.style.display = 'inline-flex';
        }

        if (tab.active) {
          activeBadge.style.display = 'inline-flex';
        }

        windowBadge.textContent = `W${tab.windowId}`;

        tabItem.addEventListener('click', () => {
          chrome.tabs.update(tab.id, { active: true });
          chrome.windows.update(tab.windowId, { focused: true });
        });

        tabsList.appendChild(tabClone);
      });

      tabGroupsContainer.appendChild(clone);
    });
  }

  function truncateUrl(url) {
    try {
      const u = new URL(url);
      return u.hostname + u.pathname.substring(0, 30);
    } catch {
      return url.substring(0, 50);
    }
  }

  function updateTabCount(count) {
    tabCountEl.textContent = `${count} tab${count !== 1 ? 's' : ''}`;
  }

  function handleGroupClick(e) {
    const summarizeBtn = e.target.closest('.group-summarize');
    if (summarizeBtn) {
      const domain = summarizeBtn.dataset.domain;
      summarizeGroup(domain);
      return;
    }
  }

  async function loadSettings() {
    const result = await chrome.storage.local.get(['theme']);
    applyTheme(result.theme || 'light');
  }

  function applyTheme(theme) {
    document.documentElement.removeAttribute('data-theme');
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    }
  }

  async function summarizeAll() {
    const apiKey = await getApiKey();
    if (!apiKey) {
      showMessage('Please configure your API key in Settings first.', 'warning');
      return;
    }

    summarizeAllBtn.disabled = true;
    summarizeAllBtn.textContent = 'Summarizing...';

    const model = await getModel();

    const tabData = allTabs.map(tab => ({
      title: tab.title,
      url: tab.url,
      domain: tab.domain
    }));

    const prompt = `Summarize what the user has open in their browser. Provide a brief overview of their browsing session.\n\nTabs:\n${JSON.stringify(tabData, null, 2)}`;

    try {
      const summary = await callOpenRouter(apiKey, model, prompt);
      overviewSection.style.display = 'block';
      overviewSummary.textContent = summary;
    } catch (error) {
      overviewSection.style.display = 'block';
      overviewSummary.textContent = `Error: ${error.message}`;
      overviewSummary.classList.add('message-error');
    } finally {
      summarizeAllBtn.disabled = false;
      summarizeAllBtn.textContent = 'Summarize All';
    }
  }

  async function summarizeGroup(domain) {
    const apiKey = await getApiKey();
    if (!apiKey) {
      showMessage('Please configure your API key in Settings first.', 'warning');
      return;
    }

    const groupEl = tabGroupsContainer.querySelector(`[data-domain="${domain}"]`);
    if (!groupEl) return;

    const summarizeBtn = groupEl.querySelector('.group-summarize');
    const summaryEl = groupEl.querySelector('.group-summary');

    summarizeBtn.disabled = true;
    summarizeBtn.textContent = '...';

    const model = await getModel();
    const tabs = groupedTabs[domain] || [];

    const tabData = tabs.map(tab => ({
      title: tab.title,
      url: tab.url
    }));

    const prompt = `Summarize these browser tabs grouped under "${domain}". What are these tabs about?\n\nTabs:\n${JSON.stringify(tabData, null, 2)}`;

    try {
      const summary = await callOpenRouter(apiKey, model, prompt);
      summaryEl.textContent = summary;
      summaryEl.style.display = 'block';
    } catch (error) {
      summaryEl.textContent = `Error: ${error.message}`;
      summaryEl.style.display = 'block';
      summaryEl.classList.add('message-error');
    } finally {
      summarizeBtn.disabled = false;
      summarizeBtn.textContent = 'Summarize';
    }
  }

  async function getApiKey() {
    const result = await chrome.storage.local.get(['openrouterApiKey']);
    return result.openrouterApiKey || '';
  }

  async function getModel() {
    const result = await chrome.storage.local.get(['model', 'customModel']);
    if (result.model === 'custom' && result.customModel) {
      return result.customModel;
    }
    return result.model || 'google/gemma-3-27b-it';
  }

  async function callOpenRouter(apiKey, model, prompt) {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': chrome.runtime.getURL(''),
        'X-Title': 'Tab Manager with AI Summary'
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that summarizes browser tabs. Be concise and informative.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 401) {
        throw new Error('Invalid API key. Please check your settings.');
      } else if (response.status === 429) {
        throw new Error('Rate limited. Please try again later.');
      } else {
        throw new Error(errorData.error?.message || `API error: ${response.status}`);
      }
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || 'No summary generated.';
  }

  function showMessage(text, type) {
    const existing = document.querySelector('.sidepanel-message');
    if (existing) existing.remove();

    const msg = document.createElement('div');
    msg.className = `sidepanel-message message message-${type}`;
    msg.textContent = text;
    msg.style.cssText = 'margin: 8px 16px; padding: 10px 14px; border-radius: 4px; font-size: 13px;';

    tabGroupsContainer.parentNode.insertBefore(msg, tabGroupsContainer);

    setTimeout(() => msg.remove(), 5000);
  }
});
