import { contextBridge, ipcRenderer } from 'electron';
import type { ElectronAPI } from '../shared/types';
const api: ElectronAPI = {
  startConversion: (requestId, url) => ipcRenderer.invoke('conversion:start', requestId, url),
  cancelConversion: requestId => ipcRenderer.invoke('conversion:cancel', requestId),
  resetConversion: () => ipcRenderer.invoke('conversion:reset'),
  onConversionProgress: callback => {
    const listener = (_event: Electron.IpcRendererEvent, update: import('../shared/types').ConversionProgress) => callback(update);
    ipcRenderer.on('conversion:progress', listener);
    return () => { ipcRenderer.removeListener('conversion:progress', listener); };
  },
  readClipboard: () => ipcRenderer.invoke('clipboard:read'),
  windowAction: action => ipcRenderer.send('window:action', action),
  isMaximized: () => ipcRenderer.invoke('window:is-maximized'),
  onMaximizedChange: callback => {
    const listener = (_event: Electron.IpcRendererEvent, maximized: boolean) => callback(maximized);
    ipcRenderer.on('window:maximized', listener);
    return () => { ipcRenderer.removeListener('window:maximized', listener); };
  },
  saveMp3: request => ipcRenderer.invoke('file:save-mp3', request)
};
contextBridge.exposeInMainWorld('electronAPI', api);
