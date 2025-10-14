> [!NOTE]
> I'm archiving this repository until I get the courage to migrate to Manifest V3 or someone helps me.

_Open New Tab After Current Tab_ is a [Chromium](https://m.wikipedia.org/wiki/Chromium_(web_browser)) ([Google Chrome](https://chrome.google.com/webstore/detail/open-new-tab-after-curren/mmcgnaachjapbbchcpjihhgjhpfcnoan), [Microsoft Edge](https://microsoftedge.microsoft.com/addons/detail/open-new-tab-after-curren/deebimacbjlpdcfbpacpckoccjnojacb)) extension that opens new tab after the active tab, instead of last position.

[![Open New Tab After Current Tab available in the Chrome Web Store](docs/ChromeWebStoreBadgeWBorder.png)](https://chrome.google.com/webstore/detail/open-new-tab-after-curren/mmcgnaachjapbbchcpjihhgjhpfcnoan) [![Open New Tab After Current Tab available in Microsoft Edge Addons](docs/MicrosoftEdgeAddonsBadge.png)](https://microsoftedge.microsoft.com/addons/detail/open-new-tab-after-curren/deebimacbjlpdcfbpacpckoccjnojacb)

By default a new tab is opened at the end of the row of tabs, but it's not intuitive: with this extension a new tab opened with the keyboard shortcut (<kbd>⌘ Cmd</kbd>+<kbd>T</kbd>) or with the "plus" button will be opened just after the current active tab.

![Demo](docs/Open-New-Tab-After-Current-Tab.gif)

## Support

<https://github.com/ArnaudLigny/Open-New-Tab-After-Current-Tab/issues>

### Known issues

- New tab opened from the last tab in a group at the last position openes outside the group [#33](https://github.com/ArnaudLigny/Open-New-Tab-After-Current-Tab/issues/33)
- Not compatible with `#scrollable-tabstrip` on Ungoogled Chromium [#38](https://github.com/ArnaudLigny/Open-New-Tab-After-Current-Tab/issues/38)

## Development

### Source code

<https://github.com/ArnaudLigny/Open-New-Tab-After-Current-Tab.git>

### Install dependencies

```bash
npm install
```

### Run tests

<a href="https://github.com/ArnaudLigny/Open-New-Tab-After-Current-Tab/actions/workflows/test.yml"><img src="https://github.com/ArnaudLigny/Open-New-Tab-After-Current-Tab/actions/workflows/test.yml/badge.svg" alt="Test workflow" /></a>

```bash
npm run test
```

### Build package

```bash
npm run build
```

Actions:

1. process files (with [Gulp](https://gulpjs.com)) and store result in `build/`
2. create a ZIP archive from `build/` in `dist/`

### Deploy to stores

<a href="https://github.com/ArnaudLigny/Open-New-Tab-After-Current-Tab/actions/workflows/release.yml"><img src="https://github.com/ArnaudLigny/Open-New-Tab-After-Current-Tab/actions/workflows/release.yml/badge.svg" alt="Release workflow" /></a>

```bash
npm run release
```

## License

_Open New Tab After Current Tab_ is a free software distributed under the terms of the [MIT license](https://opensource.org/licenses/MIT).

© [Arnaud Ligny](https://arnaudligny.fr)

The _new tab_ icon by [Danil Polshin](https://thenounproject.com/everydaytemplate/).
