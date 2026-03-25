## Electron Performance and Native Modules

### Performance best practices

1. **Load modules lazily** — don't `require()` everything at startup:
   ```typescript
   // BAD: all loaded at startup
   const { app, BrowserWindow, dialog, Menu } = require('electron');

   // GOOD: load when needed
   app.whenReady().then(() => {
     const { Menu } = require('electron');
     // build menu...
   });
   ```

2. **Defer non-critical work** — use `setTimeout` or `requestIdleCallback` to push work out of the critical startup path.

3. **Bundle renderer code** — use Vite, webpack, or esbuild. Avoid loading many separate files in the renderer.

4. **Never use `ipcRenderer.sendSync()`** — it blocks the renderer. Use `invoke`/`handle`.

5. **Don't block the main process** — a blocked main process freezes all windows. Offload heavy work to utility processes or worker threads.

6. **Use `ready-to-show`** — prevents white flash:
   ```typescript
   const win = new BrowserWindow({ show: false });
   win.once('ready-to-show', () => win.show());
   ```

7. **Profile with DevTools** — use Chrome DevTools Performance panel. Main process: launch with `--inspect` flag.

8. **Monitor memory** — close unused BrowserWindows, dereference large objects, use `process.memoryUsage()`.

### Multithreading

**Web Workers** (renderer process):
```typescript
const worker = new Worker('./worker.js');
worker.postMessage({ data: largeArray });
worker.onmessage = (e) => console.log('Result:', e.data);
```

**Worker Threads** (main process):
```typescript
import { Worker } from 'node:worker_threads';
const worker = new Worker(path.join(__dirname, 'heavy-task.js'), { workerData: { input: data } });
worker.on('message', (result) => mainWindow.webContents.send('result', result));
```

**Utility Process** (recommended for main-process offloading):
```typescript
const child = utilityProcess.fork(path.join(__dirname, 'utility.js'));
child.postMessage({ action: 'compute', data: payload });
child.on('message', (result) => { /* handle */ });
```

Prefer utility processes over worker threads for heavy main-process work — they run in a separate process (can't crash the main process) without Chromium overhead.

### Native Node modules

Native modules (C/C++ addons) must be recompiled for Electron's Node.js version.

**Using @electron/rebuild (recommended):**
```bash
npm install --save-dev @electron/rebuild
npx @electron/rebuild
```

Add to `package.json`:
```json
{
  "scripts": {
    "postinstall": "electron-rebuild"
  }
}
```

**Native code options:**

| Approach | Best for |
|---|---|
| **N-API / node-addon-api** | Custom C/C++ addons, ABI-stable across Node versions |
| **napi-rs** | Rust addons (modern, type-safe) |
| **ffi-napi / koffi** | Calling existing shared libraries without writing C |
| **Child process** | Running external executables bundled with the app |

**Bundling native executables:**
```typescript
import { execFile } from 'node:child_process';
const binaryPath = path.join(process.resourcesPath, 'bin', 'mytool');
execFile(binaryPath, ['--arg1', 'value'], (error, stdout) => {
  console.log(stdout);
});
```

### Key rules

- Always run `@electron/rebuild` after `npm install` when using native modules.
- For Apple Silicon: specify `--arch=arm64` or `--arch=x64` for cross-compilation.
- Bundle renderer code with a bundler (Vite recommended) for fast startup.
- Never block the main process — it freezes all windows.
