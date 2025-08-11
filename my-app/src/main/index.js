const { app, BrowserWindow, ipcMain } = require('electron');
const { execFile } = require('child_process');
const path = require('path');

function createWindow () {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      // Enable WASM
      experimentalFeatures: true,
      // Allow camera access
      permissions: ['camera'],
      preload: path.join(__dirname, 'preload.js')
    }
  })


  ipcMain.handle('toggle-focus', async (event, isOn) => {
    const scriptName = isOn ? 'ToggleFocusOn.scpt' : 'ToggleFocusOff.scpt';
    const scriptPath = path.join(__dirname, '/applescripts', scriptName);
    return new Promise((resolve, reject) => {
      execFile('osascript', [scriptPath], (error, stdout, stderr) => {
        if (error) reject(stderr);
        else resolve(stdout);
      });
    });
  });

  ipcMain.handle('spotify-playpause', async () => {
  const scriptPath = path.join(__dirname, 'applescripts', 'PlayPauseSpotify.scpt');
  return new Promise((resolve, reject) => {
    execFile('osascript', [scriptPath], (error, stdout, stderr) => {
      if (error) reject(stderr);
      else resolve(stdout);
    });
  });
});

  
  const startURL = process.env.NODE_ENV === 'development'
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, '/renderer/index.html')}`;

  win.loadURL(startURL)

  // Handle camera permissions
  win.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    const cameraPermission = permission === 'media'
    if (cameraPermission) {
      callback(true) // Allow camera access
    } else {
      callback(false) // Deny other permissions
    }
  })

  // Handle new window requests (for debugging)
  win.webContents.setWindowOpenHandler(({ url }) => {
    return { action: 'deny' }
  })

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    win.webContents.openDevTools()
  }
  win.loadURL(startURL);
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});