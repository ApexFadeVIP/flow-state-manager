const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  toggleFocus: (isOn) => ipcRenderer.invoke('toggle-focus', isOn)
});