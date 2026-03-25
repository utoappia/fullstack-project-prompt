## Electron Security

Electron apps have full OS access from the main process. Security mistakes can give web content (including potentially injected scripts) access to the filesystem, network, and OS.

### Security checklist

1. **Context isolation enabled** (default since Electron 12):
   ```typescript
   webPreferences: { contextIsolation: true }
   ```

2. **Sandbox enabled** (default since Electron 20):
   ```typescript
   webPreferences: { sandbox: true }
   ```

3. **Node integration disabled in renderer** (default):
   ```typescript
   webPreferences: { nodeIntegration: false }
   ```

4. **Content Security Policy set** — restrict what scripts can run:
   ```html
   <meta http-equiv="Content-Security-Policy"
     content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'">
   ```

5. **Never disable webSecurity:**
   ```typescript
   // NEVER do this:
   webPreferences: { webSecurity: false } // disables same-origin policy
   ```

6. **Validate all IPC inputs** — the renderer is untrusted:
   ```typescript
   ipcMain.handle('read-file', async (_event, filePath: string) => {
     const allowedDir = path.join(app.getPath('userData'), 'documents');
     const resolved = path.resolve(filePath);
     if (!resolved.startsWith(allowedDir)) {
       throw new Error('Access denied');
     }
     return fs.readFile(resolved, 'utf-8');
   });
   ```

7. **Control navigation** — prevent renderer from navigating to untrusted origins:
   ```typescript
   win.webContents.on('will-navigate', (event, url) => {
     const parsedUrl = new URL(url);
     if (parsedUrl.origin !== 'https://my-app.com') {
       event.preventDefault();
     }
   });
   ```

8. **Control new window creation:**
   ```typescript
   win.webContents.setWindowOpenHandler(({ url }) => {
     if (url.startsWith('https://my-app.com/')) {
       return { action: 'allow' };
     }
     shell.openExternal(url); // open in default browser instead
     return { action: 'deny' };
   });
   ```

9. **Validate URLs before shell.openExternal:**
   ```typescript
   const url = new URL(untrustedUrl);
   if (url.protocol === 'https:') {
     shell.openExternal(untrustedUrl);
   }
   ```

10. **Do not load remote content in BrowserWindow** unless absolutely necessary. If you must, use a strict CSP and validate the origin.

### Key rules

- Treat the renderer process as untrusted — it runs web content.
- The main process is the security boundary. All privileged operations go through IPC with validation.
- Default security settings are good — don't weaken them.
- If loading remote URLs, use `session.webRequest` to filter requests and set a strict CSP.
- Keep Electron updated — security patches are released regularly.
