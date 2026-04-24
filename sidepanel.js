// sidepanel.js - Chrome Tab Manager Side Panel Logic

// State
let currentTabs = null;
let selectedGroup = null;
let autoRefreshTimer = null;
let currentTheme = 'light';

// DOM Elements
const content = document.getElementById('content');
const refreshBtn = document.getElementById('refreshBtn');
const headerStats = document.getElementById('headerStats');
const loadingState = document.getElementById('loadingState');
const themeToggle = document.getElementById('themeToggle');
const settingsBtn = document.getElementById('settingsBtn');
const closeSettings = document.getElementById('closeSettings');
const settingsPanel = document.getElementById('settingsPanel');
const summaryToggle = document.getElementById('summaryToggle');
const summaryPanel = document.getElementById('summaryPanel');
const closeSummary = document.getElementById('closeSummary');
const summarizeAll = document.getElementById('summarizeAll');
const summarizeGroup = document.getElementById('summarizeGroup');
const summaryOutput = document.getElementById('summaryOutput');
const apiKeyInput = document.getElementById('apiKey');
const apiKeyStatus = document.getElementById('apiKeyStatus');
const modelSelect = document.getElementById('modelSelect');
const customModelGroup = document.getElementById('customModelGroup');
const customEndpoint = document.getElementById('customEndpoint');
const customModelInput = document.getElementById('customModelInput');
const autoRefresh = document.getElementById('autoRefresh');

// Icons
const icons = {
  chevron: '<svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>',
  active: '<svg class="indicator active" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" title="Active tab"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
  pinned: '<svg class="indicator pinned" viewBox="0 0 24 24" fill="currentColor" title="Pinned tab"><path d="M16 2L16.2 2.2L16.4 2L22 8V9L20 11L18 9L15 12L17 14L12 19L14 22H2V14L6 10L8 12L11 9L9 7L11 5L11.2 4.8L11.4 5L16 2Z"/></svg>',
  close: '<button class="close-tab-btn" title="Close tab"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>',
  error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>',
  empty: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>',
  sun: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>',
  moon: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>',
};

// Settings Management
async function loadSettings() {
  const defaults = {
    apiKey: '',
    model: 'openai/gpt-4o-mini',
    customEndpoint: '',
    customModel: '',
    autoRefresh: '0',
    theme: 'light',
  };

  try {
    const result = await chrome.storage.local.get(defaults);
    apiKeyInput.value = result.apiKey;
    modelSelect.value = result.model;
    customEndpoint.value = result.customEndpoint;
    customModelInput.value = result.customModel;
    autoRefresh.value = result.autoRefresh;
    currentTheme = result.theme;
    applyTheme();
    updateCustomModelVisibility();
    updateApiKeyStatus(result.apiKey ? 'saved' : null);
  } catch (e) {
    console.error('Failed to load settings:', e);
  }
}

async function saveSetting(key, value) {
  try {
    await chrome.storage.local.set({ [key]: value });
  } catch (e) {
    console.error(`Failed to save ${key}:`, e);
  }
}

// Theme Management
function applyTheme() {
  if (currentTheme === 'dark') {
    document.body.classList.add('dark');
    themeToggle.innerHTML = icons.sun;
    themeToggle.title = 'Switch to light theme';
  } else {
    document.body.classList.remove('dark');
    themeToggle.innerHTML = icons.moon;
    themeToggle.title = 'Switch to dark theme';
  }
}

async function toggleTheme() {
  currentTheme = currentTheme === 'light' ? 'dark' : 'light';
  applyTheme();
  await saveSetting('theme', currentTheme);
}

// Custom Model Visibility
function updateCustomModelVisibility() {
  if (modelSelect.value === 'custom') {
    customModelGroup.classList.remove('hidden');
  } else {
    customModelGroup.classList.add('hidden');
  }
}

// API Key Status
function updateApiKeyStatus(status, message = '') {
  apiKeyStatus.classList.remove('visible', 'error', 'success', 'validating');

  if (!status) {
    return;
  }

  apiKeyStatus.classList.add('visible');

  switch (status) {
    case 'saved':
      apiKeyStatus.classList.add('success');
      apiKeyStatus.textContent = 'API key saved';
      break;
    case 'validating':
      apiKeyStatus.classList.add('validating');
      apiKeyStatus.textContent = 'Validating...';
      break;
    case 'valid':
      apiKeyStatus.classList.add('success');
      apiKeyStatus.textContent = 'API key is valid';
      break;
    case 'invalid':
      apiKeyStatus.classList.add('error');
      apiKeyStatus.textContent = message || 'Invalid API key';
      break;
    case 'error':
      apiKeyStatus.classList.add('error');
      apiKeyStatus.textContent = message || 'Failed to validate API key';
      break;
  }
}

// API Key Validation
async function validateApiKey(apiKey) {
  if (!apiKey) {
    updateApiKeyStatus(null);
    return;
  }

  updateApiKeyStatus('validating');

  try {
    const response = await fetch('https://openrouter.ai/api/v1/auth/key', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      updateApiKeyStatus('valid');
    } else {
      const error = await response.json().catch(() => ({}));
      const message = error.error?.message || 'Invalid API key. Please check and try again.';
      updateApiKeyStatus('invalid', message);
    }
  } catch (e) {
    updateApiKeyStatus('error', 'Network error. Check your connection and try again.');
  }
}

// Auto-refresh Management
function setupAutoRefresh() {
  clearAutoRefresh();

  const interval = parseInt(autoRefresh.value, 10);
  if (interval > 0) {
    autoRefreshTimer = setInterval(loadTabs, interval);
  }
}

function clearAutoRefresh() {
  if (autoRefreshTimer) {
    clearInterval(autoRefreshTimer);
    autoRefreshTimer = null;
  }
}

// Tab Loading
async function loadTabs() {
  refreshBtn.classList.add('loading');

  try {
    const response = await new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'GET_TABS' }, resolve);
    });
    currentTabs = response;
    content.innerHTML = renderState(response);
    attachEventListeners();
    updateGroupSummaryButton();
  } catch (error) {
    content.innerHTML = `
      <div class="error">
        ${icons.error}
        <p>Failed to load tabs</p>
        <p style="font-size: 11px; margin-top: 8px;">${escapeHtml(error.message)}</p>
      </div>
    `;
  } finally {
    refreshBtn.classList.remove('loading');
  }
}

// Rendering
function renderState(state) {
  if (!state || !state.success) {
    return `
      <div class="error">
        ${icons.error}
        <p>Failed to load tabs</p>
        <p style="font-size: 11px; margin-top: 8px;">${state?.error || 'Unknown error'}</p>
      </div>
    `;
  }

  if (state.groups.length === 0) {
    return `
      <div class="empty-state">
        ${icons.empty}
        <p>No tabs open</p>
      </div>
    `;
  }

  headerStats.textContent = `${state.totalTabs} tabs across ${state.groups.length} domains`;
  return state.groups.map(group => renderGroup(group)).join('');
}

function renderGroup(group) {
  const isSelected = selectedGroup && selectedGroup.domain === group.domain;
  const tabsHTML = group.tabs.map(tab => renderTab(tab, group.domain)).join('');
  return `
    <div class="domain-group ${isSelected ? 'selected' : ''}" data-group-domain="${escapeHtml(group.domain)}">
      <div class="group-header" data-group="${escapeHtml(group.domain)}">
        ${icons.chevron}
        ${getGroupFaviconHTML(group)}
        <span class="group-title">${escapeHtml(group.domain)}</span>
        <span class="group-count">${group.tabs.length}</span>
      </div>
      <div class="group-tabs">
        ${tabsHTML}
      </div>
    </div>
  `;
}

function renderTab(tab, domain) {
  const indicators = [];
  if (tab.active) indicators.push(icons.active);
  if (tab.pinned) indicators.push(icons.pinned);
  indicators.push(getWindowIndicator(tab.windowId));

  let classes = 'tab-item';
  if (tab.active) classes += ' active';
  if (tab.pinned) classes += ' pinned';
  if (tab.discarded) classes += ' discarded';

  return `
    <div class="${classes}" data-tab-id="${tab.id}" title="${escapeHtml(tab.url)}">
      ${getFaviconHTML(tab, domain)}
      <div class="tab-info">
        <div class="tab-title">${escapeHtml(tab.title)}</div>
        <div class="tab-url">${escapeHtml(truncateUrl(tab.url))}</div>
      </div>
      <div class="tab-indicators">
        ${indicators.join('')}
        ${icons.close}
      </div>
    </div>
  `;
}

function getFaviconHTML(tab, domain) {
  let src = null;
  if (tab.favIconUrl && !tab.favIconUrl.startsWith('data:')) {
    src = tab.favIconUrl;
  } else if (!domain.startsWith('chrome://') && !domain.startsWith('about:')) {
    src = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  }
  if (src) {
    return `<img class="tab-favicon" src="${src}" alt="" onerror="this.classList.add('fallback');this.onerror=null;this.removeAttribute('src');"/>`;
  }
  return `<span class="tab-favicon fallback"></span>`;
}

function getGroupFaviconHTML(group) {
  if (group.faviconUrl) {
    return `<img class="group-favicon" src="${group.faviconUrl}" alt="" onerror="this.classList.add('fallback');this.onerror=null;this.removeAttribute('src');"/>`;
  }
  return `<span class="group-favicon fallback"></span>`;
}

function getWindowIndicator(windowId) {
  return `<span class="indicator window" title="Window ${windowId}">W${windowId}</span>`;
}

// Event Listeners
function attachEventListeners() {
  // Group collapse/expand
  document.querySelectorAll('.group-header').forEach(header => {
    header.addEventListener('click', (e) => {
      header.classList.toggle('collapsed');
    });
  });

  // Group selection for summary
  document.querySelectorAll('.domain-group').forEach(group => {
    group.addEventListener('click', (e) => {
      if (e.target.closest('.group-header')) {
        const domain = group.dataset.groupDomain;
        selectGroup(domain);
      }
    });
  });

  // Tab activation
  document.querySelectorAll('.tab-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (e.target.closest('.close-tab-btn')) return;
      const tabId = parseInt(item.dataset.tabId);
      chrome.runtime.sendMessage({ type: 'ACTIVATE_TAB', tabId });
    });
  });

  // Close tab buttons
  document.querySelectorAll('.close-tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const tabId = parseInt(btn.closest('.tab-item').dataset.tabId);
      chrome.runtime.sendMessage({ type: 'CLOSE_TAB', tabId });
    });
  });
}

function selectGroup(domain) {
  if (selectedGroup && selectedGroup.domain === domain) {
    selectedGroup = null;
  } else {
    selectedGroup = currentTabs?.groups.find(g => g.domain === domain) || null;
  }
  updateGroupSelection();
  updateGroupSummaryButton();
}

function updateGroupSelection() {
  document.querySelectorAll('.domain-group').forEach(group => {
    const domain = group.dataset.groupDomain;
    if (selectedGroup && selectedGroup.domain === domain) {
      group.classList.add('selected');
    } else {
      group.classList.remove('selected');
    }
  });
}

function updateGroupSummaryButton() {
  summarizeGroup.disabled = !selectedGroup;
}

// AI Summary
async function callOpenRouter(messages, onChunk) {
  const apiKey = apiKeyInput.value.trim();
  if (!apiKey) {
    throw new Error('Please enter your OpenRouter API key in Settings.');
  }

  let model = modelSelect.value;
  let endpoint = 'https://openrouter.ai/api/v1/chat/completions';

  if (model === 'custom') {
    model = customModelInput.value.trim();
    endpoint = customEndpoint.value.trim() || endpoint;
    if (!model) {
      throw new Error('Please enter a custom model ID in Settings.');
    }
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': chrome.runtime.getURL(''),
      'X-Title': 'Tab Manager with AI Summary',
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    if (response.status === 401 || response.status === 403) {
      throw new Error('Invalid API key. Please check your API key in Settings.');
    }
    throw new Error(error.error?.message || `API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || 'No summary generated.';
}

function buildTabContext(tabs) {
  const tabList = tabs.map(t => `- ${t.title} (${truncateUrl(t.url)})`).join('\n');
  return `Here are the open tabs:\n${tabList}\n\nPlease provide a concise summary of what these tabs are about and what the user might be working on.`;
}

async function summarizeAllTabs() {
  if (!currentTabs?.groups?.length) {
    showSummaryError('No tabs to summarize.');
    return;
  }

  const allTabs = currentTabs.groups.flatMap(g => g.tabs);
  const systemPrompt = 'You are a helpful assistant that summarizes browser tabs. Provide a concise, organized summary of the tabs, grouping them by topic or task when possible.';

  summaryOutput.innerHTML = '<div class="summary-text loading">Generating summary...</div>';
  summarizeAll.disabled = true;

  try {
    const summary = await callOpenRouter([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: buildTabContext(allTabs) },
    ]);
    summaryOutput.innerHTML = `<div class="summary-text">${formatSummary(summary)}</div>`;
  } catch (e) {
    showSummaryError(e.message);
  } finally {
    summarizeAll.disabled = false;
  }
}

async function summarizeGroupTabs() {
  if (!selectedGroup) {
    showSummaryError('Please select a group first.');
    return;
  }

  const systemPrompt = 'You are a helpful assistant that summarizes browser tabs. Provide a concise summary of what these tabs are about.';

  summaryOutput.innerHTML = `<div class="summary-text loading">Summarizing ${escapeHtml(selectedGroup.domain)}...</div>`;
  summarizeGroup.disabled = true;

  try {
    const summary = await callOpenRouter([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: buildTabContext(selectedGroup.tabs) },
    ]);
    summaryOutput.innerHTML = `
      <div class="summary-group-title">${escapeHtml(selectedGroup.domain)} (${selectedGroup.tabs.length} tabs)</div>
      <div class="summary-text">${formatSummary(summary)}</div>
    `;
  } catch (e) {
    showSummaryError(e.message);
  } finally {
    summarizeGroup.disabled = false;
  }
}

function formatSummary(text) {
  return escapeHtml(text).replace(/\n/g, '<br>');
}

function showSummaryError(message) {
  summaryOutput.innerHTML = `<div class="summary-text error">${icons.error}<p style="margin-top: 8px;">${escapeHtml(message)}</p></div>`;
}

// Utility
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function truncateUrl(url) {
  if (!url) return '';
  try {
    const urlObj = new URL(url);
    return urlObj.pathname + urlObj.search;
  } catch {
    return url.length > 60 ? url.substring(0, 60) + '...' : url;
  }
}

// Initialization
function init() {
  // Load settings
  loadSettings();

  // Theme toggle
  themeToggle.addEventListener('click', toggleTheme);

  // Settings panel
  settingsBtn.addEventListener('click', () => settingsPanel.classList.add('visible'));
  closeSettings.addEventListener('click', () => settingsPanel.classList.remove('visible'));

  // Summary panel
  summaryToggle.addEventListener('click', () => summaryPanel.classList.add('visible'));
  closeSummary.addEventListener('click', () => summaryPanel.classList.remove('visible'));

  // Model select
  modelSelect.addEventListener('change', () => {
    updateCustomModelVisibility();
    saveSetting('model', modelSelect.value);
  });

  // Custom inputs
  customEndpoint.addEventListener('change', () => saveSetting('customEndpoint', customEndpoint.value));
  customModelInput.addEventListener('change', () => saveSetting('customModel', customModelInput.value));

  // Auto-refresh
  autoRefresh.addEventListener('change', () => {
    saveSetting('autoRefresh', autoRefresh.value);
    setupAutoRefresh();
  });

  // API key
  let apiKeyDebounce = null;
  apiKeyInput.addEventListener('input', () => {
    clearTimeout(apiKeyDebounce);
    updateApiKeyStatus('saved');
    apiKeyDebounce = setTimeout(() => {
      saveSetting('apiKey', apiKeyInput.value);
      validateApiKey(apiKeyInput.value);
    }, 500);
  });

  // Summary buttons
  summarizeAll.addEventListener('click', summarizeAllTabs);
  summarizeGroup.addEventListener('click', summarizeGroupTabs);

  // Refresh
  refreshBtn.addEventListener('click', loadTabs);

  // Listen for tab updates from background
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'TABS_UPDATED') {
      currentTabs = message.data;
      content.innerHTML = renderState(message.data);
      attachEventListeners();
    }
  });

  // Initial load
  loadTabs();
}

// Start
init();
