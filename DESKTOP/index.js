require("dotenv").config();
const { app, BrowserWindow, Menu, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");

let mainWindow;

const createWindow = () => {
  const preloadPath = path.resolve(__dirname, 'preload.js');
  console.log("📁 __dirname:", __dirname);
  console.log("📁 Resolved preload path:", preloadPath);
  console.log("📁 File exists:", fs.existsSync(preloadPath));
  
  // Verify environment variables
  console.log("🔐 SUPABASE_URL:", process.env.SUPABASE_URL ? "LOADED" : "MISSING");
  console.log("🔐 SUPABASE_ANON_KEY:", process.env.SUPABASE_ANON_KEY ? "LOADED" : "MISSING");

  // DEBUG: Log the actual values (be careful with secrets)
  if (process.env.SUPABASE_URL) {
    console.log("🌐 SUPABASE_URL value:", process.env.SUPABASE_URL);
  }
  if (process.env.SUPABASE_ANON_KEY) {
    console.log("🔑 SUPABASE_ANON_KEY: [HIDDEN FOR SECURITY]");
  }

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      enableRemoteModule: false,
      webSecurity: true,
      preload: preloadPath,
      // FIX: Use correct argument names that match preload.js
      additionalArguments: [
        `--supabaseUrl=${process.env.SUPABASE_URL || ''}`,
        `--supabaseAnonKey=${process.env.SUPABASE_ANON_KEY || ''}`
      ],
    }
  });

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Renderer ${level}] ${message}`);
  });

  // 🔧 FIXED CONTEXT MENU WITH INSPECT ELEMENT
  // ===========================================
  
  // Auto-open DevTools in development
  mainWindow.webContents.openDevTools();

  // Working context menu
  mainWindow.webContents.on('context-menu', (e, params) => {
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Inspect Element',
        click: () => {
          mainWindow.webContents.inspectElement(params.x, params.y);
          // Ensure DevTools is open
          if (!mainWindow.webContents.isDevToolsOpened()) {
            mainWindow.webContents.openDevTools();
          }
          // Focus on the inspected element
          mainWindow.webContents.devToolsWebContents?.focus();
        }
      },
      { type: 'separator' },
      {
        label: 'Reload',
        accelerator: 'CmdOrCtrl+R',
        click: () => {
          mainWindow.reload();
        }
      },
      {
        label: 'Force Reload',
        accelerator: 'CmdOrCtrl+Shift+R',
        click: () => {
          mainWindow.webContents.reloadIgnoringCache();
        }
      },
      { type: 'separator' },
      {
        label: 'Toggle Developer Tools',
        accelerator: 'F12',
        click: () => {
          if (mainWindow.webContents.isDevToolsOpened()) {
            mainWindow.webContents.closeDevTools();
          } else {
            mainWindow.webContents.openDevTools();
          }
        }
      },
      {
        label: 'Toggle Full Screen',
        accelerator: 'F11',
        click: () => {
          mainWindow.setFullScreen(!mainWindow.isFullScreen());
        }
      }
    ]);

    contextMenu.popup({ window: mainWindow });
  });

  // Alternative: Global shortcut for inspect mode
  const { globalShortcut } = require('electron');
  
  app.whenReady().then(() => {
    // Register Ctrl+Shift+I for inspect element mode
    globalShortcut.register('Control+Shift+I', () => {
      mainWindow.webContents.openDevTools();
      mainWindow.webContents.executeJavaScript(`
        console.log('🔍 Entering inspect mode - click on any element to inspect');
        document.body.style.cursor = 'crosshair';
        
        const inspectHandler = (e) => {
          e.preventDefault();
          e.stopPropagation();
          document.body.style.cursor = 'default';
          // The actual inspection happens via the context menu
        };
        
        document.addEventListener('click', inspectHandler, { once: true });
      `);
    });
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
    console.log("✅ Window ready to show");
  });

  const loginPagePath = path.join(__dirname, "src", "renderer", "Pages", "Auth", "LoginPage.html");
  console.log("📄 Loading login page from:", loginPagePath);
  
  if (fs.existsSync(loginPagePath)) {
    mainWindow.loadFile(loginPagePath).then(() => {
      console.log("✅ Login page loaded successfully");
    }).catch(err => {
      console.error("❌ Error loading login page:", err);
    });
  } else {
    console.error("❌ Login page not found");
  }

  // Don't hide menu bar if you want reliable context menus
  // mainWindow.setMenuBarVisibility(false);
  
  // Instead, create an application menu
  const template = [
    {
      label: 'View',
      submenu: [
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click: () => mainWindow.reload()
        },
        {
          label: 'Force Reload',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: () => mainWindow.webContents.reloadIgnoringCache()
        },
        {
          label: 'Toggle Developer Tools',
          accelerator: 'F12',
          click: () => {
            if (mainWindow.webContents.isDevToolsOpened()) {
              mainWindow.webContents.closeDevTools();
            } else {
              mainWindow.webContents.openDevTools();
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Actual Size',
          accelerator: 'CmdOrCtrl+0',
          click: () => mainWindow.webContents.setZoomLevel(0)
        },
        {
          label: 'Zoom In',
          accelerator: 'CmdOrCtrl+Plus',
          click: () => mainWindow.webContents.setZoomLevel(mainWindow.webContents.getZoomLevel() + 0.5)
        },
        {
          label: 'Zoom Out',
          accelerator: 'CmdOrCtrl+-',
          click: () => mainWindow.webContents.setZoomLevel(mainWindow.webContents.getZoomLevel() - 0.5)
        }
      ]
    }
  ];
  
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
};

app.whenReady().then(() => {
  console.log("🚀 Electron app starting...");
  console.log("📦 App path:", app.getAppPath());
  console.log("🏠 User data:", app.getPath('userData'));
  createWindow();
});

app.on("window-all-closed", () => {
  console.log("👋 All windows closed - quitting app");
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Unregister all shortcuts when app quits
app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

// IPC handlers
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('get-platform', () => {
  return process.platform;
});