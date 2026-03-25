## Electron Distribution, Packaging, and Updates

### Packaging with Electron Forge (recommended)

```bash
# New project with Forge
npm init electron-app@latest my-app

# Add Forge to existing project
npm install --save-dev @electron-forge/cli
npx electron-forge import

# Package (creates distributable folder)
npm run package

# Make installers
npm run make
```

**forge.config.js:**
```typescript
module.exports = {
  packagerConfig: {
    asar: true,
    icon: './assets/icon', // .ico (Windows), .icns (macOS) — no extension
    appBundleId: 'com.mycompany.myapp',
    osxSign: {},
    osxNotarize: {
      appleId: process.env.APPLE_ID,
      appleIdPassword: process.env.APPLE_PASSWORD,
      teamId: process.env.APPLE_TEAM_ID,
    },
  },
  makers: [
    { name: '@electron-forge/maker-squirrel', config: {} },      // Windows .exe
    { name: '@electron-forge/maker-zip', platforms: ['darwin'] },  // macOS .zip
    { name: '@electron-forge/maker-dmg', config: {} },             // macOS .dmg
    { name: '@electron-forge/maker-deb', config: {} },             // Linux .deb
    { name: '@electron-forge/maker-rpm', config: {} },             // Linux .rpm
  ],
  publishers: [
    {
      name: '@electron-forge/publisher-github',
      config: { repository: { owner: 'user', name: 'repo' }, prerelease: true },
    },
  ],
};
```

### ASAR archives

App source is packed into an asar archive — prevents casual source inspection (not encryption). Node.js APIs transparently read from asar. Some native modules need unpacking:

```typescript
packagerConfig: {
  asar: true,
  asarUnpack: ['**/node_modules/native-module/**'],
}
```

### Code signing

**macOS** (required for distribution):
- Apple Developer account ($99/year)
- Sign with Developer ID Application certificate
- Notarize with Apple's notary service (mandatory since macOS 10.15)
- Forge handles this via `osxSign` and `osxNotarize` config

**Windows:**
- Code signing certificate from a Certificate Authority
- EV (Extended Validation) certificates eliminate SmartScreen warnings
- Sign via Forge or electron-builder's built-in signing

### Auto-updates

**With electron-updater (recommended, works with electron-builder or Forge):**
```typescript
import { autoUpdater } from 'electron-updater';

app.whenReady().then(() => {
  autoUpdater.checkForUpdatesAndNotify();
});

autoUpdater.on('update-available', (info) => { /* notify user */ });
autoUpdater.on('update-downloaded', (info) => {
  dialog.showMessageBox({
    type: 'info',
    title: 'Update Ready',
    message: 'Restart to update?',
    buttons: ['Restart', 'Later'],
  }).then((result) => {
    if (result.response === 0) autoUpdater.quitAndInstall();
  });
});
```

**Update servers:**
- **GitHub Releases** — free, works with electron-updater out of the box
- **update.electronjs.org** — free for public GitHub repos
- **Custom server** — any server returning the proper update manifest JSON

### Testing

**With Playwright (recommended):**
```bash
npm install --save-dev @playwright/test electron
```

```typescript
import { test, expect, _electron as electron } from '@playwright/test';

test('app launches', async () => {
  const app = await electron.launch({ args: ['.'] });
  const window = await app.firstWindow();
  const title = await window.title();
  expect(title).toBe('My App');
  await app.close();
});

test('click button', async () => {
  const app = await electron.launch({ args: ['.'] });
  const window = await app.firstWindow();
  await window.click('#my-button');
  const result = await window.textContent('#result');
  expect(result).toBe('Clicked');
  await app.close();
});
```

**Testing IPC:** mock `ipcMain.handle` responses or use Playwright's `evaluate` to call exposed APIs.

### Key rules

- Always use asar packaging in production — it improves load performance and prevents casual tampering.
- Code sign for macOS (required) and Windows (strongly recommended to avoid SmartScreen).
- Notarize macOS builds — unsigned/un-notarized apps are blocked by Gatekeeper.
- Use GitHub Releases + electron-updater for the simplest auto-update setup.
- Test with Playwright — it's the officially recommended testing framework for Electron.
