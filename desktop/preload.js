const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getStatus: () => ipcRenderer.invoke('get-status'),
  startListening: () => ipcRenderer.invoke('start-listening'),
  stopListening: () => ipcRenderer.invoke('stop-listening'),
  openWebApp: () => ipcRenderer.invoke('open-webapp')
});
