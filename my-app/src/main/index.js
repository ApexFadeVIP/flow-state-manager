const { app, BrowserWindow } = require('electron')
const path = require('path')

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
      permissions: ['camera']
    }
  })

  const startURL = process.env.NODE_ENV === 'development'
    ? 'http://localhost:3000'  // 👈 must match Vite
    : `file://${path.join(__dirname, '/renderer/index.html')}`

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
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
