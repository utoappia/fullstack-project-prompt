## Electron UI Features

### Window customization

**Frameless window:**
```typescript
const win = new BrowserWindow({
  frame: false,
  webPreferences: { preload: path.join(__dirname, 'preload.js') },
});
```

**macOS hidden titlebar (keeps traffic lights):**
```typescript
const win = new BrowserWindow({
  titleBarStyle: 'hidden', // or 'hiddenInset', 'customButtonsOnHover'
  trafficLightPosition: { x: 10, y: 10 }, // reposition traffic lights
});
```

**Windows overlay controls:**
```typescript
const win = new BrowserWindow({
  titleBarOverlay: {
    color: '#2f3241',
    symbolColor: '#74b1be',
    height: 30,
  },
});
```

**Draggable regions** (make custom titlebar draggable):
```css
.titlebar {
  -webkit-app-region: drag;
  height: 32px;
}
.titlebar button {
  -webkit-app-region: no-drag; /* buttons must be clickable */
}
```

**Transparent window:**
```typescript
const win = new BrowserWindow({
  transparent: true,
  frame: false,
  backgroundColor: '#00000000',
});
```

**Prevent flash on load:**
```typescript
const win = new BrowserWindow({ show: false });
win.once('ready-to-show', () => win.show());
```

### Dark mode

```typescript
import { nativeTheme, ipcMain } from 'electron';

ipcMain.handle('dark-mode:toggle', () => {
  nativeTheme.themeSource = nativeTheme.shouldUseDarkColors ? 'light' : 'dark';
  return nativeTheme.shouldUseDarkColors;
});

ipcMain.handle('dark-mode:system', () => {
  nativeTheme.themeSource = 'system';
});
```

```css
@media (prefers-color-scheme: dark) {
  body { background: #1e1e1e; color: #d4d4d4; }
}
@media (prefers-color-scheme: light) {
  body { background: #ffffff; color: #1e1e1e; }
}
```

### Application menu

```typescript
import { Menu, app } from 'electron';

const template: Electron.MenuItemConstructorOptions[] = [
  {
    label: 'File',
    submenu: [
      { label: 'Open', accelerator: 'CmdOrCtrl+O', click: () => { /* open file */ } },
      { type: 'separator' },
      { role: 'quit' },
    ],
  },
  {
    label: 'Edit',
    submenu: [
      { role: 'undo' }, { role: 'redo' }, { type: 'separator' },
      { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' },
    ],
  },
  {
    label: 'View',
    submenu: [
      { role: 'reload' }, { role: 'forceReload' }, { role: 'toggleDevTools' },
      { type: 'separator' },
      { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' },
      { type: 'separator' },
      { role: 'togglefullscreen' },
    ],
  },
];

// macOS: app name menu as first item
if (process.platform === 'darwin') {
  template.unshift({
    label: app.name,
    submenu: [
      { role: 'about' }, { type: 'separator' }, { role: 'services' },
      { type: 'separator' }, { role: 'hide' }, { role: 'hideOthers' },
      { role: 'unhide' }, { type: 'separator' }, { role: 'quit' },
    ],
  });
}

Menu.setApplicationMenu(Menu.buildFromTemplate(template));
```

### Context menu (right-click)

```typescript
// main.ts
ipcMain.on('show-context-menu', (event) => {
  const menu = Menu.buildFromTemplate([
    { label: 'Cut', role: 'cut' },
    { label: 'Copy', role: 'copy' },
    { label: 'Paste', role: 'paste' },
  ]);
  menu.popup({ window: BrowserWindow.fromWebContents(event.sender)! });
});

// preload.ts
contextBridge.exposeInMainWorld('electronAPI', {
  showContextMenu: () => ipcRenderer.send('show-context-menu'),
});
```

### System tray

```typescript
import { Tray, Menu, nativeImage } from 'electron';

let tray: Tray | null = null;

app.whenReady().then(() => {
  const icon = nativeImage.createFromPath(path.join(__dirname, 'tray-icon.png'));
  tray = new Tray(icon.resize({ width: 16, height: 16 }));
  tray.setToolTip('My App');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Show', click: () => mainWindow.show() },
    { label: 'Quit', click: () => app.quit() },
  ]));
  tray.on('click', () => mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show());
});
```

Keep a reference to the Tray object — it's garbage collected otherwise.

### Notifications

```typescript
// Main process
import { Notification } from 'electron';

new Notification({ title: 'Update', body: 'New version available', icon: 'icon.png' }).show();

// Renderer process (standard Web API)
new Notification('Update', { body: 'New version available' });
```

macOS requires code-signed app for Notification Center. Windows requires Start Menu shortcut.

### Keyboard shortcuts

**Global** (work even when app is not focused):
```typescript
import { globalShortcut } from 'electron';

app.whenReady().then(() => {
  globalShortcut.register('CommandOrControl+Shift+I', () => { /* action */ });
});
app.on('will-quit', () => globalShortcut.unregisterAll());
```

**Local** (via menu accelerators): `accelerator: 'CmdOrCtrl+S'` on menu items.

**In-renderer:**
```typescript
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    window.electronAPI.saveFile();
  }
});
```

### Accessibility

- Use semantic HTML — Electron renders web content, so standard web accessibility applies.
- Test with VoiceOver (macOS), NVDA/JAWS (Windows), Orca (Linux).
- Use Chrome DevTools Accessibility panel (built into Electron DevTools).
- Support `prefers-reduced-motion` and `prefers-contrast: high` CSS media queries.
- Ensure all interactive elements are keyboard-navigable.
