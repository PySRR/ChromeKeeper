# ChromeKeeper

A Chrome extension for managing and organizing your browser tabs with AI-powered summaries.

## Features

- **Tab Management**: View all open tabs grouped by domain
- **Side Panel Integration**: Quick access to your tabs from the browser side panel
- **AI Summaries**: Summarize your open tabs using OpenRouter AI models
- **Customizable**: Configure your API key, model, and theme preferences

## Loading the Extension

1. Open Chrome and navigate to `chrome://extensions`
2. Enable **Developer mode** using the toggle in the top-right corner
3. Click **Load unpacked**
4. Select the folder containing this extension (the folder with `manifest.json`)
5. The ChromeKeeper icon should appear in your extensions toolbar

## Usage

### Opening the Extension

- Click the ChromeKeeper icon in your toolbar to open the quick popup
- Press `Alt+Shift+T` to open the side panel (configurable in Chrome settings)
- Click the side panel icon in Chrome's toolbar

### Configuring Your API Key

1. Click **Settings** from the popup or side panel
2. Enter your OpenRouter API key
3. Select your preferred AI model
4. Click **Save**

You can get an API key from [openrouter.ai/keys](https://openrouter.ai/keys)

### Theme

Toggle between light and dark mode in the Settings page.

## File Structure

```
├── manifest.json        # Extension manifest (V3)
├── background.js        # Service worker for initialization
├── popup.html           # Quick popup UI
├── popup.css            # Popup styles
├── popup.js             # Popup logic
├── sidepanel.html       # Side panel UI
├── sidepanel.css        # Side panel styles
├── sidepanel.js         # Side panel logic
├── settings.html        # Settings page UI
├── settings.css         # Settings styles
├── settings.js          # Settings logic
└── README.md            # This file
```

## Permissions

- `tabs` - Access your open tabs
- `storage` - Save your settings locally
- `sidePanel` - Display the side panel
- `scripting` - Execute scripts for tab content access

## License

MIT
