const { app, BrowserWindow, Menu } = require('electron')
const path = require('path')

require('electron-reload')(__dirname, {
  electron: path.join(__dirname, 'node_modules', '.bin', 'electron'),
  awaitWriteFinish: true,
});

let win

const createWindow = () => {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    background: '#f5f5f5',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: true, 
      webSecurity: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'src/preload.js')
    }
  })

  win.loadFile(
  path.join(__dirname, 'src', 'renderer', 'Pages', 'Auth', 'LoginPage.html')
)

  win.webContents.on('context-menu', (event, params) => {
    const menu = Menu.buildFromTemplate([
      {
        label: 'Inspect Element',
        click: () => {
          win.webContents.inspectElement(params.x, params.y)
        }
      },
      { type: 'separator' },
      {
        label: 'Reload',
        accelerator: 'CmdOrCtrl+R',
        click: () => {
          win.webContents.reload()
        }
      }
    ])
    
    menu.popup()
  })

  win.setMenuBarVisibility(false);
}

app.whenReady().then(createWindow)

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Re-create a window when the app is activated (macOS behavior)
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
