import { app, BrowserWindow, clipboard, dialog, ipcMain } from 'electron';
import type { IpcMainEvent, IpcMainInvokeEvent } from 'electron';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { appendFileSync, mkdirSync, statSync, renameSync } from 'node:fs';
import { ConversionManager } from './backend/conversionManager';
import { binaryPaths } from './backend/binaries';
import { mp3Filename } from '../shared/filename';
import type { SaveRequest, SaveResponse } from '../shared/types';

let mainWindow: BrowserWindow;
let manager: ConversionManager;
let quitting = false;
const devUrl = !app.isPackaged && process.env.VITE_DEV_SERVER_URL === 'http://127.0.0.1:5173'
  ? process.env.VITE_DEV_SERVER_URL : undefined;
const entry = path.join(__dirname, '../../dist/index.html');
function trusted(event: IpcMainEvent | IpcMainInvokeEvent) {
  const frame = event.senderFrame;
  return event.sender === mainWindow.webContents && frame === mainWindow.webContents.mainFrame &&
    !!frame && (devUrl ? new URL(frame.url).origin === devUrl : frame.url.split('?')[0] === pathToFileURL(entry).href);
}
app.whenReady().then(() => {
  const logDirectory = app.getPath('logs');
  mkdirSync(logDirectory, { recursive: true });
  const logFile = path.join(logDirectory, 'conversion.log');
  try { if (statSync(logFile).size > 1024 * 1024) renameSync(logFile, logFile + '.previous'); } catch { /* First launch. */ }
  const log = (category: string, detail = '') => {
    try { appendFileSync(logFile, new Date().toISOString() + ' ' + category + ' ' + detail + '\n'); } catch { /* Logging must not stop conversion. */ }
  };
  log('application startup', app.getVersion());
  app.setAppUserModelId('com.ytmp3.desktop');
  mainWindow = new BrowserWindow({
    width: 720, height: 500, minWidth: 650, minHeight: 450, resizable: true,
    title: 'YT MP3', backgroundColor: '#0f1720', frame: false, show: false,
    icon: path.join(__dirname, '../../dist/logo.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', event => event.preventDefault());
  mainWindow.webContents.on('will-attach-webview', event => event.preventDefault());
  mainWindow.webContents.session.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
  manager = new ConversionManager(binaryPaths(app.isPackaged ? path.join(process.resourcesPath, 'bin')
    : path.join(app.getAppPath(), 'resources', 'bin')), path.join(app.getPath('temp'), 'YT-MP3'), update => {
      if (!mainWindow.isDestroyed()) mainWindow.webContents.send('conversion:progress', update);
    }, log);
  ipcMain.handle('conversion:start', (event, requestId: unknown, url: unknown) => {
    if (!trusted(event)) return { status: 'error', message: 'Conversion unavailable.' };
    return manager.start(requestId, url);
  });
  ipcMain.handle('conversion:cancel', (event, requestId: unknown) => {
    if (trusted(event)) return manager.cancel(requestId);
  });
  ipcMain.handle('conversion:reset', event => { if (trusted(event)) return manager.reset(); });
  mainWindow.webContents.on('render-process-gone', () => { void manager.reset().catch(() => {}); });
  ipcMain.handle('clipboard:read', event => trusted(event) ? clipboard.readText() : '');
  ipcMain.handle('window:is-maximized', event => trusted(event) && mainWindow.isMaximized());
  ipcMain.on('window:action', (event, action: unknown) => {
    if (!trusted(event)) return;
    if (action === 'minimize') mainWindow.minimize();
    if (action === 'maximize') mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
    if (action === 'close') mainWindow.close();
  });
  const reportMaximized = () => mainWindow.webContents.send('window:maximized', mainWindow.isMaximized());
  mainWindow.on('maximize', reportMaximized);
  mainWindow.on('unmaximize', reportMaximized);
  let savePending = false;
  ipcMain.handle('file:save-mp3', async (event, request: SaveRequest): Promise<SaveResponse> => {
    if (!trusted(event) || !request || typeof request.resultId !== 'string' || savePending)
      return { status: 'error', message: 'Save unavailable. Please try again.' };
    savePending = true;
    try {
      if (!app.isPackaged && process.env.VITE_MOCK_MODE === 'true' && request.isMock === true) {
        const result = await dialog.showSaveDialog(mainWindow, {
          title: 'Save MP3 — preview only', defaultPath: path.join(app.getPath('music'), mp3Filename(String(request.title).slice(0, 1000))),
          filters: [{ name: 'MP3 Audio', extensions: ['mp3'] }]
        });
        return { status: result.canceled ? 'canceled' : 'preview' };
      }
      return { status: await manager.save(request.resultId, async title => {
        const result = await dialog.showSaveDialog(mainWindow, {
          title: 'Save MP3', defaultPath: path.join(app.getPath('music'), mp3Filename(title)),
          filters: [{ name: 'MP3 Audio', extensions: ['mp3'] }]
        });
        return result.canceled ? undefined : result.filePath;
      }) };
    } catch (error) {
      log('save error', (error as NodeJS.ErrnoException).code || 'dialog or file operation');
      return { status: 'error', message: "Couldn't save the MP3. Check the selected location and try again." };
    } finally { savePending = false; }
  });
  mainWindow.once('ready-to-show', () => mainWindow.show());
  if (devUrl) void mainWindow.loadURL(devUrl); else void mainWindow.loadFile(entry);
});
app.on('window-all-closed', () => app.quit());
app.on('before-quit', event => {
  if (quitting || !manager) return;
  event.preventDefault();
  void manager.reset().then(() => { quitting = true; app.quit(); }).catch(() => {
    // A native Save As operation owns the result until it finishes.
    setTimeout(() => app.quit(), 250);
  });
});
