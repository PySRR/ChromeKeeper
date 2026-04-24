document.addEventListener('DOMContentLoaded', () => {
  const openSidePanelBtn = document.getElementById('openSidePanel');
  const refreshTabsBtn = document.getElementById('refreshTabs');
  const openSettingsBtn = document.getElementById('openSettings');
  const apiKeyStatus = document.getElementById('apiKeyStatus');
  const tabStats = document.getElementById('tabStats');

  openSidePanelBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'openSidePanel' });
    window.close();
  });

  refreshTabsBtn.addEventListener('click', () => {
    loadTabStats();
  });

  openSettingsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
    window.close();
  });

  async function checkApiKey() {
    const result = await chrome.storage.local.get(['openrouterApiKey']);
    if (result.openrouterApiKey) {
      apiKeyStatus.textContent = 'API key configured';
      apiKeyStatus.classList.add('status-success');
    } else {
      apiKeyStatus.textContent = 'No API key configured';
      apiKeyStatus.classList.add('status-warning');
    }
  }

  async function loadTabStats() {
    chrome.runtime.sendMessage({ action: 'getTabs' }, (response) => {
      if (response && response.tabs) {
        const tabs = response.tabs;
        const domains = [...new Set(tabs.map(tab => tab.domain))];
        const windows = [...new Set(tabs.map(tab => tab.windowId))];
        const pinnedTabs = tabs.filter(tab => tab.pinned).length;

        tabStats.innerHTML = `
          <div class="stat">
            <span class="stat-value">${tabs.length}</span>
            <span class="stat-label">Open Tabs</span>
          </div>
          <div class="stat">
            <span class="stat-value">${domains.length}</span>
            <span class="stat-label">Domains</span>
          </div>
          <div class="stat">
            <span class="stat-value">${windows.length}</span>
            <span class="stat-label">Windows</span>
          </div>
          <div class="stat">
            <span class="stat-value">${pinnedTabs}</span>
            <span class="stat-label">Pinned</span>
          </div>
        `;
      } else {
        tabStats.innerHTML = '<p>Error loading stats</p>';
      }
    });
  }

  checkApiKey();
  loadTabStats();
});
