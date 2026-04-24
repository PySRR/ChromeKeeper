document.addEventListener('DOMContentLoaded', () => {
  const apiKeyInput = document.getElementById('apiKey');
  const toggleApiKeyBtn = document.getElementById('toggleApiKeyVisibility');
  const modelSelect = document.getElementById('modelSelect');
  const customModelGroup = document.getElementById('customModelGroup');
  const customModelInput = document.getElementById('customModel');
  const themeSelect = document.getElementById('themeSelect');
  const autoRefreshSelect = document.getElementById('autoRefreshSelect');
  const saveBtn = document.getElementById('saveSettings');
  const resetBtn = document.getElementById('resetSettings');
  const apiKeyMessage = document.getElementById('apiKeyMessage');

  const DEFAULT_SETTINGS = {
    openrouterApiKey: '',
    model: 'google/gemma-3-27b-it',
    customModel: '',
    theme: 'light',
    autoRefreshInterval: 0
  };

  loadSettings();

  toggleApiKeyBtn.addEventListener('click', () => {
    if (apiKeyInput.type === 'password') {
      apiKeyInput.type = 'text';
      toggleApiKeyBtn.textContent = 'Hide';
    } else {
      apiKeyInput.type = 'password';
      toggleApiKeyBtn.textContent = 'Show';
    }
  });

  modelSelect.addEventListener('change', () => {
    customModelGroup.style.display = modelSelect.value === 'custom' ? 'block' : 'none';
  });

  saveBtn.addEventListener('click', saveSettings);
  resetBtn.addEventListener('click', resetSettings);

  async function loadSettings() {
    const result = await chrome.storage.local.get(Object.keys(DEFAULT_SETTINGS));

    apiKeyInput.value = result.openrouterApiKey || '';
    modelSelect.value = result.model || DEFAULT_SETTINGS.model;
    customModelInput.value = result.customModel || '';
    themeSelect.value = result.theme || DEFAULT_SETTINGS.theme;
    autoRefreshSelect.value = String(result.autoRefreshInterval ?? DEFAULT_SETTINGS.autoRefreshInterval);

    customModelGroup.style.display = modelSelect.value === 'custom' ? 'block' : 'none';
    applyTheme(themeSelect.value);
  }

  async function saveSettings() {
    const settings = {
      openrouterApiKey: apiKeyInput.value.trim(),
      model: modelSelect.value,
      customModel: customModelInput.value.trim(),
      theme: themeSelect.value,
      autoRefreshInterval: parseInt(autoRefreshSelect.value, 10)
    };

    if (settings.model === 'custom' && !settings.customModel) {
      showMessage('Please enter a custom model ID', 'error');
      return;
    }

    await chrome.storage.local.set(settings);

    if (settings.openrouterApiKey) {
      showMessage('Settings saved successfully!', 'success');
    } else {
      showMessage('Settings saved. No API key configured.', 'warning');
    }

    applyTheme(settings.theme);
  }

  async function resetSettings() {
    if (!confirm('Reset all settings to defaults?')) return;

    await chrome.storage.local.set(DEFAULT_SETTINGS);
    await loadSettings();
    showMessage('Settings reset to defaults', 'info');
  }

  function showMessage(text, type) {
    apiKeyMessage.textContent = text;
    apiKeyMessage.className = `message message-${type}`;
    setTimeout(() => {
      apiKeyMessage.textContent = '';
      apiKeyMessage.className = 'message';
    }, 5000);
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
});
