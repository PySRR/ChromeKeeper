// ChromeKeeper Popup Script
// Handles API key display and button actions

document.addEventListener('DOMContentLoaded', () => {
  const apiKeyStatus = document.getElementById('apiKeyStatus');
  const settingsBtn = document.getElementById('settingsBtn');
  const sidePanelBtn = document.getElementById('sidePanelBtn');

  // Load and display API key status (masked)
  chrome.storage.local.get(['apiKey'], (result) => {
    const apiKey = result.apiKey || '';
    if (apiKey) {
      // Mask the API key, showing only first 4 and last 4 characters
      const masked = apiKey.length > 8
        ? `${apiKey.substring(0, 4)}${'•'.repeat(8)}${apiKey.substring(apiKey.length - 4)}`
        : '••••••••';
      apiKeyStatus.textContent = masked;
      apiKeyStatus.classList.add('configured');
    } else {
      apiKeyStatus.textContent = 'Not configured';
      apiKeyStatus.classList.add('unconfigured');
    }
  });

  // Open settings page
  settingsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // Open side panel
  sidePanelBtn.addEventListener('click', () => {
    chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT });
  });
});
