import { app, BrowserWindow, ipcMain } from 'electron';
import { execFile, exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    const scriptsDir = app.isPackaged
      ? path.join(process.resourcesPath, 'applescripts')
      : path.join(__dirname, 'applescripts')
    const scriptPath = path.join(scriptsDir, scriptName);
    return new Promise((resolve, reject) => {
      execFile('osascript', [scriptPath], (error, stdout, stderr) => {
        if (error) reject(stderr);
        else resolve(stdout);
      });
    });
  });

  ipcMain.handle('spotify-playpause', async () => {
  const scriptsDir = app.isPackaged
    ? path.join(process.resourcesPath, 'applescripts')
    : path.join(__dirname, 'applescripts')
  const scriptPath = path.join(scriptsDir, 'PlayPauseSpotify.scpt');
  return new Promise((resolve, reject) => {
    execFile('osascript', [scriptPath], (error, stdout, stderr) => {
      if (error) reject(stderr);
      else resolve(stdout);
    });
  });
  });

  ipcMain.handle('open-spotify', async () => {
  return new Promise((resolve, reject) => {
    execFile('open', ['-a', 'Spotify'], (error, stdout, stderr) => {
      if (error) reject(stderr);
      else resolve(stdout);
    });
  });
});

  ipcMain.handle('spotify-get-track', async () => {
  const script = `
    tell application "Spotify"
      if player state is playing then
        set trackName to name of current track
        set artistName to artist of current track
        return trackName & "||" & artistName
      else
        return ""
      end if
    end tell
  `;
  return new Promise((resolve, reject) => {
    exec(`osascript -e '${script.replace(/'/g, "\\'")}'`, (error, stdout, stderr) => {
      if (error) reject(stderr);
      else resolve(stdout.trim());
    });
  });
  });



  
  // Determine the correct path for loading the renderer
  const isDev = !app.isPackaged;
  const startURL = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, '../../dist/renderer/index.html')}`;

  console.log('Loading URL:', startURL);
  console.log('App is packaged:', app.isPackaged);
  console.log('__dirname:', __dirname);

  // Handle camera permissions
  win.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'media' || permission === 'camera' || permission === 'microphone') {
      callback(true)
      return
    }
    callback(false)
  })

  // Handle new window requests (for debugging)
  win.webContents.setWindowOpenHandler(({ url }) => {
    return { action: 'deny' }
  })

  // Open DevTools in development
  if (isDev) {
    win.webContents.openDevTools()
  }
  // Load the URL - only once!
  win.loadURL(startURL);
}

app.whenReady().then(() => {
  createWindow();

  // Attempt to trigger macOS Automation prompt for Spotify on first launch
  setTimeout(() => {
    try {
      const script = `tell application "Spotify" to player state`;
      exec(`osascript -e '${script}'`, (error, stdout, stderr) => {
        if (error) {
          console.warn('[Automation] Spotify Apple Event probe error:', stderr || error.message)
        } else {
          console.log('[Automation] Spotify player state probe:', stdout.trim())
        }
      })
    } catch (e) {
      console.warn('[Automation] Failed to trigger Spotify probe:', e)
    }
  }, 1500)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});