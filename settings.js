// ChromeKeeper Settings Script
// Handles API key, model selection, and theme persistence

document.addEventListener('DOMContentLoaded', () => {
  const apiKeyInput = document.getElementById('apiKeyInput');
  const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
  const modelSelect = document.getElementById('modelSelect');
  const customModelGroup = document.getElementById('customModelGroup');
  const customModelInput = document.getElementById('customModelInput');
  const themeToggle = document.getElementById('themeToggle');
  const statusMessage = document.getElementById('statusMessage');

  // Show status message
  function showStatus(message, type = 'success') {
    statusMessage.textContent = message;
    statusMessage.className = `status-message ${type}`;
    statusMessage.classList.remove('hidden');

    // Auto-hide after 3 seconds
    setTimeout(() => {
      statusMessage.classList.add('hidden');
    }, 3000);
  }

  // Load saved settings
  chrome.storage.local.get(['apiKey', 'model', 'customModel', 'theme'], (result) => {
    // Load API key (empty if not set)
    apiKeyInput.value = result.apiKey || '';

    // Load model selection
    const savedModel = result.model || 'google/gemma-3-27b-it';
    const predefinedModels = [
      'google/gemma-3-27b-it',
      'google/gemma-3-12b-it',
      'anthropic/claude-sonnet-4-20250514'
    ];

    if (predefinedModels.includes(savedModel)) {
      modelSelect.value = savedModel;
      customModelGroup.classList.add('hidden');
    } else {
      modelSelect.value = 'custom';
      customModelGroup.classList.remove('hidden');
      customModelInput.value = savedModel;
    }

    // Load theme
    const savedTheme = result.theme || 'light';
    themeToggle.checked = savedTheme === 'dark';
    applyTheme(savedTheme);
  });

  // Apply theme to document
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
  }

  // Save API key
  saveApiKeyBtn.addEventListener('click', () => {
    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
      showStatus('Please enter an API key', 'error');
      return;
    }

    chrome.storage.local.set({ apiKey }, () => {
      showStatus('API key saved successfully', 'success');
    });
  });

  // Handle model selection change
  modelSelect.addEventListener('change', () => {
    if (modelSelect.value === 'custom') {
      customModelGroup.classList.remove('hidden');
      customModelInput.focus();
    } else {
      customModelGroup.classList.add('hidden');
      // Save the selected model immediately
      chrome.storage.local.set({ model: modelSelect.value }, () => {
        showStatus(`Model updated to ${modelSelect.options[modelSelect.selectedIndex].text}`, 'success');
      });
    }
  });

  // Save custom model
  customModelInput.addEventListener('change', () => {
    const customModel = customModelInput.value.trim();
    if (customModel) {
      chrome.storage.local.set({ model: customModel }, () => {
        showStatus('Custom model saved', 'success');
      });
    }
  });

  // Theme toggle
  themeToggle.addEventListener('change', () => {
    const theme = themeToggle.checked ? 'dark' : 'light';
    chrome.storage.local.set({ theme }, () => {
      applyTheme(theme);
    });
  });
});
