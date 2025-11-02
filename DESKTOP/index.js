require("dotenv").config();
const { app, BrowserWindow, Menu, ipcMain, globalShortcut } = require("electron");
const path = require("path");
const fs = require("fs");

let mainWindow;

const createWindow = () => {
  const preloadPath = path.resolve(__dirname, "preload.js");

  console.log("📁 Preload path:", preloadPath);
  console.log("📁 File exists:", fs.existsSync(preloadPath));

  console.log("🔐 SUPABASE_URL:", process.env.SUPABASE_URL ? "LOADED" : "MISSING");
  console.log("🔐 SUPABASE_ANON_KEY:", process.env.SUPABASE_ANON_KEY ? "LOADED" : "MISSING");

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
      additionalArguments: [
        `--supabaseUrl=${process.env.SUPABASE_URL || ""}`,
        `--supabaseAnonKey=${process.env.SUPABASE_ANON_KEY || ""}`,
      ],
    },
  });

  // ✅ Hide the top menu bar
  Menu.setApplicationMenu(null);
  mainWindow.setMenuBarVisibility(false);

  // ✅ Right-click context menu with Reload + Inspect Element
  mainWindow.webContents.on("context-menu", (e, params) => {
    const contextMenu = Menu.buildFromTemplate([
      {
        label: "Reload",
        accelerator: "CmdOrCtrl+R",
        click: () => mainWindow.reload(),
      },
      {
        label: "Inspect Element",
        click: () => {
          mainWindow.webContents.inspectElement(params.x, params.y);
          if (!mainWindow.webContents.isDevToolsOpened()) {
            mainWindow.webContents.openDevTools();
          }
        },
      },
    ]);
    contextMenu.popup({ window: mainWindow });
  });

  // ✅ Keyboard shortcut for DevTools toggle
  app.whenReady().then(() => {
    globalShortcut.register("Control+Shift+I", () => {
      if (mainWindow.webContents.isDevToolsOpened()) {
        mainWindow.webContents.closeDevTools();
      } else {
        mainWindow.webContents.openDevTools();
      }
    });

    globalShortcut.register("Control+R", () => {
      mainWindow.reload();
    });
  });

  // ✅ Load your login page
  const loginPagePath = path.join(__dirname, "src", "renderer", "Pages", "Auth", "LoginPage.html");
  console.log("📄 Loading login page from:", loginPagePath);

  if (fs.existsSync(loginPagePath)) {
    mainWindow
      .loadFile(loginPagePath)
      .then(() => console.log("✅ Login page loaded successfully"))
      .catch((err) => console.error("❌ Error loading login page:", err));
  } else {
    console.error("❌ Login page not found");
  }

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
    mainWindow.focus();
  });
};

// 🟢 App lifecycle
app.whenReady().then(() => {
  console.log("🚀 Electron app starting...");
  createWindow();
});

app.on("window-all-closed", () => {
  console.log("👋 All windows closed - quitting app");
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});

// IPC handlers
ipcMain.handle("get-app-version", () => app.getVersion());
ipcMain.handle("get-platform", () => process.platform);