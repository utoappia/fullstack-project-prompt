## Electron Process Model and IPC

Electron uses a multi-process architecture inherited from Chromium. Understanding the process model is critical — it determines how you structure your code and communicate between components.

### Process types

| Process | Role | Has Node.js? | Has DOM? | Count |
|---|---|---|---|---|
| **Main** | App entry point, creates windows, OS integration | Yes (full) | No | 1 |
| **Renderer** | Renders web content in BrowserWindow | No (sandboxed by default) | Yes | 1 per window |
| **Preload** | Bridge between main and renderer | Limited (contextBridge, ipcRenderer) | Yes (runs before page) | 1 per window |
| **Utility** | Offload heavy work from main process | Yes (full) | No | As needed |

### Main process

The entry point (`main.js` or `main.ts`). Manages the app lifecycle, creates BrowserWindows, handles native OS interactions (menus, dialogs, tray, notifications), and has full Node.js + Electron API access.

```typescript
import { app, BrowserWindow } from 'electron';
import path from 'node:path';

const createWindow = () => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });
  win.loadFile('index.html');
};

app.whenReady().then(() => {
  createWindow();

  // macOS: re-create window when dock icon clicked and no windows exist
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
```

### Preload scripts

Run before renderer web content loads. They have access to `contextBridge` and `ipcRenderer` from Electron, plus limited Node.js APIs. Use them to safely expose main-process functionality to the renderer.

```typescript
// preload.ts
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  setTitle: (title: string) => ipcRenderer.send('set-title', title),
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  onUpdateCounter: (callback: (value: number) => void) =>
    ipcRenderer.on('update-counter', (_event, value) => callback(value)),
});
```

### Context isolation and sandbox

Both are **enabled by default** — never disable them in production.

- **Context isolation** (since Electron 12): preload scripts run in an isolated context from the renderer's web content. The renderer cannot access `require`, `ipcRenderer`, or any Node/Electron API directly.
- **Sandbox** (since Electron 20): renderer processes run in a Chromium OS sandbox with restricted OS access.

```typescript
// These are the secure defaults — don't override them
new BrowserWindow({
  webPreferences: {
    contextIsolation: true,  // default: true
    sandbox: true,           // default: true
    nodeIntegration: false,  // default: false
    preload: path.join(__dirname, 'preload.js'),
  },
});
```

### IPC Pattern 1: Renderer → Main (fire-and-forget)

```typescript
// preload.ts
contextBridge.exposeInMainWorld('electronAPI', {
  setTitle: (title: string) => ipcRenderer.send('set-title', title),
});

// main.ts
ipcMain.on('set-title', (event, title: string) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  win?.setTitle(title);
});

// renderer.ts
document.getElementById('btn')?.addEventListener('click', () => {
  window.electronAPI.setTitle('New Title');
});
```

### IPC Pattern 2: Renderer → Main (request/response)

```typescript
// main.ts
ipcMain.handle('dialog:openFile', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog();
  if (!canceled) return filePaths[0];
  return null;
});

// preload.ts
contextBridge.exposeInMainWorld('electronAPI', {
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
});

// renderer.ts
const filePath = await window.electronAPI.openFile();
```

### IPC Pattern 3: Main → Renderer

```typescript
// main.ts
mainWindow.webContents.send('update-counter', 1);

// preload.ts
contextBridge.exposeInMainWorld('electronAPI', {
  onUpdateCounter: (callback: (value: number) => void) =>
    ipcRenderer.on('update-counter', (_event, value) => callback(value)),
});

// renderer.ts
window.electronAPI.onUpdateCounter((value) => {
  document.getElementById('counter')!.innerText = String(value);
});
```

### Utility processes (offload heavy work)

For CPU-intensive tasks in the main process, use `utilityProcess.fork()` instead of blocking the main thread:

```typescript
// main.ts
import { utilityProcess } from 'electron';

const child = utilityProcess.fork(path.join(__dirname, 'heavy-task.js'));
child.postMessage({ action: 'compute', data: payload });
child.on('message', (result) => {
  mainWindow.webContents.send('task-result', result);
});

// heavy-task.js
process.parentPort.on('message', (e) => {
  const result = performHeavyComputation(e.data);
  process.parentPort.postMessage(result);
});
```

Utility processes have full Node.js access without Chromium rendering overhead. They can't crash the main process (unlike worker_threads which share memory).

### Key rules

- Never expose the full `ipcRenderer` module via contextBridge. Expose specific, named functions.
- Always validate IPC inputs in the main process — the renderer is untrusted.
- Never use `ipcRenderer.sendSync()` — it blocks the renderer. Use `invoke`/`handle` instead.
- Keep the main process responsive — offload heavy work to utility processes or worker threads.
- Never disable `contextIsolation` or `sandbox` in production.
- Never enable `nodeIntegration` in renderer processes.
