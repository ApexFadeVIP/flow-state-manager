const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  toggleFocus: (isOn) => ipcRenderer.invoke('toggle-focus', isOn),
  spotifyPlayPause: () => ipcRenderer.invoke('spotify-playpause'),
  getSpotifyTrack: () => ipcRenderer.invoke('spotify-get-track'),
  openSpotify: () => ipcRenderer.invoke('open-spotify')
});

