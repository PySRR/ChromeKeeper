# Tab Manager with AI Summary

A Chrome extension that helps you manage your open tabs with AI-powered summaries, grouped by domain.

## Features

- **Tab Grouping**: Automatically groups open tabs by domain for easier navigation
- **AI Summaries**: Get AI-powered summaries of your browsing sessions using OpenRouter API
  - Summarize all open tabs at once
  - Summarize individual domain groups
- **Side Panel**: View all your tabs in Chrome's side panel
- **Quick Stats**: See tab counts, domains, windows, and pinned tabs at a glance
- **Settings**: Configure API key, AI model, theme, and auto-refresh interval
- **Dark/Light Theme**: Choose your preferred appearance

## Project Structure

```
├── manifest.json        # Extension manifest (Manifest V3)
├── background.js        # Service worker for tab management
├── popup.html           # Quick actions popup
├── popup.js             # Popup logic
├── sidePanel.html       # Side panel UI
├── sidePanel.js         # Side panel logic
├── settings.html        # Settings page
├── settings.js          # Settings logic
├── styles/
│   ├── common.css       # Shared styles and theme variables
│   ├── popup.css        # Popup-specific styles
│   ├── sidePanel.css    # Side panel styles
│   └── settings.css     # Settings page styles
└── icons/
    ├── icon16.png       # 16x16 extension icon
    ├── icon48.png       # 48x48 extension icon
    └── icon128.png      # 128x128 extension icon
```

## Setup Instructions

### 1. Load the Extension

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** using the toggle in the top-right corner
3. Click **Load unpacked**
4. Select the folder containing this extension

### 2. Configure OpenRouter API Key

1. Click the extension icon in the Chrome toolbar
2. Click **Configure Settings** (or right-click the extension icon and select **Options**)
3. Enter your OpenRouter API key
   - Get one at [openrouter.ai](https://openrouter.ai/)
4. Select your preferred AI model from the dropdown
5. Click **Save Settings**

### 3. Using the Extension

- **Popup**: Click the extension icon for quick stats and actions
- **Side Panel**: Click **Open Side Panel** from the popup, or use the side panel button in Chrome's toolbar
- **Summarize Tabs**: Use the **Summarize All** button in the side panel, or **Summarize** on individual domain groups
- **Refresh**: Click the refresh button to re-scan your open tabs

### 4. Settings

| Setting | Description |
|---------|-------------|
| API Key | Your OpenRouter API key for AI summaries |
| Model | AI model to use for summarization |
| Custom Model | Enter a custom model ID when "Custom Model" is selected |
| Theme | Light, Dark, or System theme |
| Auto Refresh | Interval for automatic tab scanning |

## Permissions

| Permission | Purpose |
|------------|---------|
| `tabs` | Read all open tabs across all windows |
| `storage` | Save settings and API key locally |
| `sidePanel` | Display the side panel UI |

## Requirements

- Chrome 114 or later (for side panel support)
- An OpenRouter API key for AI summaries

## License

MIT
