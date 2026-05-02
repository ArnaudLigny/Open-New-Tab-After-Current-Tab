# Copilot Instructions

## Project Overview

**Open New Tab After Current Tab** is a Chromium browser extension (Manifest V3) for Google Chrome and Microsoft Edge. It intercepts new tab creation and moves the new tab to the position immediately after the currently active tab, instead of the browser default of opening it at the end of the tab strip.

The extension is published on the [Chrome Web Store](https://chrome.google.com/webstore/detail/open-new-tab-after-curren/mmcgnaachjapbbchcpjihhgjhpfcnoan) and [Microsoft Edge Addons](https://microsoftedge.microsoft.com/addons/detail/open-new-tab-after-curren/deebimacbjlpdcfbpacpckoccjnojacb).

## Repository Structure

```
src/                    # Extension source (what gets shipped)
  background.js         # Service worker — the only JS logic
  manifest.json         # MV3 manifest (minimum_chrome_version: 102)
  icon-{16,32,48,128}.png
  _locales/
    en/messages.json    # English strings
    fr/messages.json    # French strings
build/                  # Gulp output (git-ignored) — copy of src/
dist/                   # Gulp output (git-ignored) — ZIP archive for store upload
docs/                   # Static assets for the GitHub Pages website
gulpfile.js             # Build pipeline (ESM)
xo.config.js            # XO linter flat config (ESM)
package.json            # npm metadata; "type":"module" (ESM throughout)
cecil.yml               # Cecil static site config for GitHub Pages
.editorconfig           # 2-space indentation, LF, UTF-8
```

## Tech Stack

- **Language**: JavaScript (ESM, `"type": "module"` in package.json)
- **Browser extension API**: Chrome Extensions (MV3) — `chrome.tabs`, `chrome.windows`, `chrome.storage`, `chrome.runtime`
- **Build tool**: [Gulp 5](https://gulpjs.com) — copies `src/` → `build/`, then zips to `dist/`
- **Linter**: [XO v2](https://github.com/xojs/xo) with flat config (`xo.config.js`)
- **Node.js version**: 20 (used in CI)
- **No test framework** — `npm test` runs the linter only

## Common Commands

```bash
# Install dependencies
npm install

# Lint (this is the only "test")
npm run test

# Build extension (copies src → build/, creates dist/*.zip)
npm run build

# Full release (build + publish to Chrome Web Store)
npm run release
```

## Key Architecture: background.js

The entire extension logic lives in `src/background.js`, which runs as a MV3 service worker.

### State management

State is stored per-window in `chrome.storage.session` using keys `currentIndex_${windowId}` and `currentGroup_${windowId}`. This ensures concurrent updates to different windows never clobber each other. Helper functions `getWindowState(windowId)` and `setWindowState(windowId, updates)` encapsulate all storage access.

### Event flow

1. `chrome.tabs.onActivated` / `chrome.windows.onFocusChanged` / `chrome.tabs.onRemoved` — each fires after a 300ms `setTimeout` (workaround for Chrome timing bug) and updates the stored `currentIndex`/`currentGroup` for the relevant window.
2. `chrome.tabs.onMoved` (`eventOnMoved`) — updates `currentIndex` to `moveInfo.toIndex` after a user manually drags a tab.
3. `chrome.tabs.onCreated` — calls `moveIt()`, which reads the stored `currentIndex` and moves the new tab to `currentIndex + 1`. During this move, `eventOnMoved` is temporarily removed and re-added to avoid recursive state updates.
4. `chrome.runtime.onInstalled` / `chrome.runtime.onStartup` — calls `getCurrentActiveTab()` to seed initial state.

### Tab group support

When the active tab belongs to a group (`groupId >= 0`), `moveIt()` also calls `chrome.tabs.group()` to add the new tab to the same group.

### Logging convention

Debug logs follow the format: `windowId + ': event - description: ' + value`  
Example: `"42: tabs.onCreated - move to: 3"`

All event handlers use `try/catch` and log errors with `console.error`.

## Code Style

- 2-space indentation (enforced by XO `space: true` and `.editorconfig`)
- LF line endings, UTF-8 encoding
- XO disables `unicorn/prefer-module` and `unicorn/prefer-top-level-await` (service workers cannot use top-level await)
- `globals.browser` and `globals.webextensions` are declared in `xo.config.js` so the linter recognises browser and WebExtension globals
- `gulpfile.js` and `xo.config.js` are in the XO `devDependencies` exception list (they import dev packages)

## Manifest Permissions

The manifest requests only `"storage"`. Basic tab manipulation (reading index, moving tabs, grouping) does not require the `"tabs"` permission under MV3.

## CI / CD

| Workflow | Trigger | What it does |
|---|---|---|
| `test.yml` | push/PR to `master` (excluding `docs/`) | `npm ci` + `npm run test` (XO lint) on Node 20 |
| `release.yml` | GitHub Release published | Build extension, upload ZIP to GitHub Release assets, publish to Chrome Web Store |
| `website.yml` | push to `master` touching docs/md/config | Build GitHub Pages site with [Cecil](https://cecil.app) |

Release to Chrome Web Store uses secrets: `CLIENT_ID`, `CLIENT_SECRET`, `REFRESH_TOKEN`.

## Known Issues / Workarounds

- **300ms delay on `onActivated`/`onFocusChanged`/`onRemoved`**: Chrome fires these events before the browser's internal tab state is settled; the delay avoids reading stale data. See [Reddit thread](https://www.reddit.com/r/chrome_extensions/comments/no7igm/).
- **Scrollable tabstrip workaround**: After moving a tab, the extension temporarily re-activates the opener tab and then the moved tab to force the tab strip to scroll correctly (only when opener is not pinned).
- **Known open bug**: A new tab opened from the last tab in a group at the last position may land outside the group ([#33](https://github.com/ArnaudLigny/Open-New-Tab-After-Current-Tab/issues/33)).
- **Ungoogled Chromium incompatibility**: Not compatible with `#scrollable-tabstrip` flag on Ungoogled Chromium ([#38](https://github.com/ArnaudLigny/Open-New-Tab-After-Current-Tab/issues/38)).

## Localisation

Locale strings live in `src/_locales/{en,fr}/messages.json`. The manifest references them via `__MSG_extDescription__`. Add new locales by creating `src/_locales/{lang}/messages.json` with matching keys.
