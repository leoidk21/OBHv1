const { app, BrowserWindow, Menu } = require('electron')
const path = require('path')

let mainWindow

const createWindow = () => {
  mainWindow = new BrowserWindow({
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

  // LOAD DIRECTLY - NO SERVER NEEDED!
  mainWindow.loadFile(
    path.join(__dirname, 'src', 'renderer', 'Pages', 'Auth', 'LoginPage.html')
  )

  // Remove the server startup code completely
  // No more localhost, no more Express server

  // Rest of your code...
  mainWindow.webContents.on('context-menu', (event, params) => {
    const menu = Menu.buildFromTemplate([
      {
        label: 'Inspect Element',
        click: () => {
          mainWindow.webContents.inspectElement(params.x, params.y)
        }
      },
      { type: 'separator' },
      {
        label: 'Reload',
        accelerator: 'CmdOrCtrl+R',
        click: () => {
          mainWindow.webContents.reload()
        }
      }
    ])
    
    menu.popup()
  })

  mainWindow.setMenuBarVisibility(false)
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})