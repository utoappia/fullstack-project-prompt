## Electron API Quick Reference

Key modules and their most-used methods. All main process unless noted.

### app (lifecycle)

```typescript
app.whenReady().then(() => { /* create windows */ });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { /* macOS: recreate window if none exist */ });
app.on('second-instance', (event, argv, workingDirectory) => { /* single instance lock */ });

app.requestSingleInstanceLock();  // prevent multiple instances
app.getPath('userData');          // per-user app data directory
app.getPath('downloads');         // downloads directory
app.getVersion();                 // from package.json
app.isPackaged;                   // true in production build
app.setLoginItemSettings({ openAtLogin: true }); // launch at startup
```

### BrowserWindow

```typescript
const win = new BrowserWindow({
  width: 1200, height: 800,
  minWidth: 600, minHeight: 400,
  show: false,                    // use ready-to-show for flicker-free
  icon: path.join(__dirname, 'icon.png'),
  webPreferences: {
    preload: path.join(__dirname, 'preload.js'),
    // contextIsolation: true,    // default
    // sandbox: true,             // default
    // nodeIntegration: false,    // default
  },
});
win.loadFile('index.html');
win.once('ready-to-show', () => win.show());

// Static methods
BrowserWindow.getAllWindows();
BrowserWindow.getFocusedWindow();
BrowserWindow.fromWebContents(webContents);
```

### dialog

```typescript
// Open file
const { canceled, filePaths } = await dialog.showOpenDialog(win, {
  properties: ['openFile', 'multiSelections'],
  filters: [{ name: 'Images', extensions: ['jpg', 'png', 'gif'] }],
});

// Save file
const { canceled, filePath } = await dialog.showSaveDialog(win, {
  defaultPath: 'untitled.txt',
  filters: [{ name: 'Text', extensions: ['txt'] }],
});

// Message box
const { response } = await dialog.showMessageBox(win, {
  type: 'question',
  buttons: ['Save', 'Discard', 'Cancel'],
  message: 'Save changes?',
});
```

### session

```typescript
// Default session
const ses = session.defaultSession;

// Clear cache
await ses.clearCache();
await ses.clearStorageData({ storages: ['cookies', 'localstorage'] });

// Set proxy
await ses.setProxy({ proxyRules: 'http=proxy:8080' });

// Permission handling
ses.setPermissionRequestHandler((webContents, permission, callback) => {
  if (permission === 'notifications') callback(true);
  else callback(false);
});

// Download handling
ses.on('will-download', (event, item) => {
  item.setSavePath(path.join(app.getPath('downloads'), item.getFilename()));
  item.on('done', (event, state) => {
    if (state === 'completed') console.log('Download complete');
  });
});
```

### webContents

```typescript
// Execute JS in renderer
const result = await win.webContents.executeJavaScript('document.title');

// Send IPC to renderer
win.webContents.send('channel-name', data);

// Control navigation
win.webContents.on('will-navigate', (event, url) => {
  if (!url.startsWith('https://allowed.com')) event.preventDefault();
});

win.webContents.setWindowOpenHandler(({ url }) => {
  shell.openExternal(url);
  return { action: 'deny' };
});

// DevTools
win.webContents.openDevTools({ mode: 'detach' });

// Print to PDF
const buffer = await win.webContents.printToPDF({});
fs.writeFileSync('output.pdf', buffer);
```

### shell

```typescript
shell.openExternal('https://example.com');     // open in default browser
shell.openPath('/path/to/file');               // open with default app
shell.showItemInFolder('/path/to/file');       // reveal in file manager
shell.trashItem('/path/to/file');              // move to trash
shell.beep();                                  // system beep
```

### safeStorage (encrypted storage)

```typescript
if (safeStorage.isEncryptionAvailable()) {
  const encrypted = safeStorage.encryptString('secret-api-key');
  fs.writeFileSync('token.dat', encrypted);

  const decrypted = safeStorage.decryptString(fs.readFileSync('token.dat'));
}
```

### powerMonitor

```typescript
powerMonitor.on('suspend', () => { /* save state */ });
powerMonitor.on('resume', () => { /* refresh data */ });
powerMonitor.on('lock-screen', () => { /* pause sensitive operations */ });
powerMonitor.on('on-battery', () => { /* reduce background work */ });
powerMonitor.isOnBatteryPower();
```

### protocol (custom URL schemes)

```typescript
// Register before app.ready
protocol.registerSchemesAsPrivileged([
  { scheme: 'myapp', privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);

// Handle custom protocol
app.whenReady().then(() => {
  session.defaultSession.protocol.handle('myapp', (request) => {
    const filePath = request.url.replace('myapp://', '');
    return net.fetch(`file://${path.join(__dirname, filePath)}`);
  });
});
```

### autoUpdater (Squirrel-based)

```typescript
autoUpdater.setFeedURL({ url: 'https://update.myapp.com' });
autoUpdater.checkForUpdates();

autoUpdater.on('update-available', () => { /* notify user */ });
autoUpdater.on('update-downloaded', () => { autoUpdater.quitAndInstall(); });
```

For electron-builder projects, use `electron-updater` instead (see `distribution.md`).

### MessagePort (cross-process communication)

```typescript
// main.ts — create channel, send port to renderer
const { MessageChannelMain } = require('electron');
const { port1, port2 } = new MessageChannelMain();
win.webContents.postMessage('port', null, [port2]);
port1.on('message', (event) => console.log(event.data));
port1.start();
```

### process (Electron extensions)

```typescript
process.type;            // 'browser' (main), 'renderer', 'worker', 'utility'
process.versions.chrome; // Chromium version
process.versions.electron;
process.resourcesPath;   // path to app resources
process.sandboxed;       // true if sandboxed
process.contextIsolated; // true if context isolated
```

### Breaking changes to watch

- **Electron 20+**: renderers sandboxed by default
- **Electron 14+**: `remote` module removed (use `@electron/remote` package)
- **Electron 12+**: `contextIsolation` defaults to true
- **`BrowserView`**: deprecated in favor of `WebContentsView`
- **`ipcRenderer.sendTo()`**: deprecated
- Security defaults tighten with each major version — always check the breaking changes doc when upgrading
