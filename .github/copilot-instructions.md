# Copilot Instructions for Open New Tab After Current Tab

## Project overview

This is a Chromium browser extension (Manifest V2) published on the Chrome Web Store and Microsoft Edge Add-ons store. It intercepts new-tab creation events and moves the new tab to the position immediately after the currently active tab, rather than the browser default of appending it at the end of the tab strip.

> **Note:** The repository is currently archived pending a migration from Manifest V2 to Manifest V3. Contributions toward that migration are welcome.

## Repository structure

```
src/                  Extension source code (what gets packed and shipped)
  background.js       Single service/background script — all extension logic lives here
  manifest.json       Extension manifest (Manifest V2, minimum Chrome 52)
  _locales/
    en/messages.json  English i18n strings
    fr/messages.json  French i18n strings
  icon-*.png          Extension icons (16, 32, 48, 128 px)
gulpfile.js           Build script (CommonJS): copies src/ → build/, zips → dist/
package.json          npm metadata, scripts, and XO linter config
build/                Generated — not committed; output of `npm run build`
dist/                 Generated — not committed; ZIP archive for store uploads
```

## Language and runtime

- **JavaScript only** — no TypeScript, no transpilation step.
- **CommonJS** (`require()`/`module.exports`) — the repo does **not** have `"type": "module"`. `gulpfile.js` uses `require()`.
- **Node.js 16** is the version used in CI (see `.github/workflows/`).
- The extension's own `background.js` targets browser APIs (`chrome.*`); it is not a Node module.

## How to install dependencies

```bash
npm install
```

## Linting (= "test" in this repo)

The test suite is just the XO linter — there are no unit tests.

```bash
npm run test   # runs: xo
```

XO configuration lives in `package.json` under the `"xo"` key:

- `"space": true` — 2-space indent (not tabs)
- `"envs": ["browser", "webextensions"]` — Chrome extension globals are allowed
- `"rules": { "unicorn/prefer-module": "off" }` — CommonJS `require()` is permitted
- `"ignores": ["build/**"]` — generated output is excluded

**Always run `npm run test` (XO) after changing any `.js` file** to catch style or correctness issues before committing.

## Building

```bash
npm run build   # runs: gulp dist
```

Gulp pipeline (`gulpfile.js`):

1. `clean` — deletes `build/` directory
2. `build` — copies everything under `src/` into `build/`
3. `dist`  — zips `build/` into `dist/Open-New-Tab-After-Current-Tab_v<version>.zip`

The version string in the ZIP filename comes from `src/manifest.json`.

## Releasing

Releases are triggered by publishing a GitHub Release. The `release.yml` workflow:

1. Builds the extension and uploads `build/` and `dist/` as artifacts.
2. Publishes the ZIP to the Chrome Web Store via `chrome-webstore-upload-cli` (requires `CLIENT_ID`, `CLIENT_SECRET`, `REFRESH_TOKEN` secrets).
3. Attaches the ZIP to the GitHub Release via `svenstaro/upload-release-action`.

## Code style and conventions

- **Indent**: 2 spaces (enforced by both `.editorconfig` and XO).
- **Line endings**: LF.
- **Quotes**: XO defaults (double quotes for strings unless overridden).
- **Semicolons**: XO defaults (required).
- All `chrome.*` async callbacks use the callback API (not the newer promise API), consistent with Manifest V2 and Chrome ≥ 52 support.
- Console logging is intentionally present for debugging; do not remove existing `console.log` calls without a clear reason.

## Key extension logic (background.js)

- `currentIndex[]` — per-window array tracking the index of the last active tab.
- `currentGroup` — tracks the tab group of the current active tab.
- `getCurrentActiveTab()` — queries Chrome for the active tab and sets `currentIndex` and `currentGroup`; includes a fallback for windows where no active tab is found yet.
- `moveIt(tab, event)` — moves a newly created tab to `currentIndex + 1`.
- Listeners: `onCreated`, `onMoved`, `onActivated`, `onRemoved`, `windows.onFocusChanged`, `runtime.onInstalled`.
- `onMoved` listener is temporarily removed during `onCreated` handling to avoid re-entrancy (`eventOnMoved` function).

## Known issues (do not accidentally regress)

- New tab opened from the last tab in a group at the last position may open outside the group ([#33](https://github.com/ArnaudLigny/Open-New-Tab-After-Current-Tab/issues/33)).
- Not compatible with `#scrollable-tabstrip` on Ungoogled Chromium ([#38](https://github.com/ArnaudLigny/Open-New-Tab-After-Current-Tab/issues/38)).
- A `setTimeout(..., 300)` workaround is used in several listeners because `chrome.tabs.onActivated` fires before the tab is fully focused — do not remove it.

## CI workflows

| File | Trigger | Purpose |
|------|---------|---------|
| `.github/workflows/test.yml` | push to `master`, pull requests | Runs `npm run test` (XO linter) |
| `.github/workflows/release.yml` | GitHub Release published | Builds and publishes to Chrome Web Store + GitHub |
| `.github/workflows/website.yml` | (see file) | Deploys documentation site |

## Errors and workarounds encountered during onboarding

- The stored Copilot memory for this repo previously stated that `xo.config.js` existed and the project used ESM. Both are incorrect: XO config is in `package.json` and the project uses CommonJS. That memory has been corrected.
