const { app, BrowserWindow, shell, Menu } = require("electron");
const path = require("path");
const { spawn } = require("child_process");

let mainWindow;
let serverProcess;

const isDev = process.env.NODE_ENV === "development";
const port = process.env.PORT || 3000;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
    icon: path.join(__dirname, "../public/icon.ico"),
    title: "Better Chatbot",
    show: false,
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  // Créer le menu
  const template = [
    {
      label: "File",
      submenu: [{ role: "quit" }],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Window",
      submenu: [{ role: "minimize" }, { role: "close" }],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  // Ouvrir les liens externes dans le navigateur par défaut
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (
      !url.startsWith(`http://localhost:${port}`) &&
      !url.startsWith("file://")
    ) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  // Charger l'application
  if (isDev) {
    mainWindow.loadURL(`http://localhost:${port}`);
    mainWindow.webContents.openDevTools();
  } else {
    // En production, démarrer le serveur Next.js
    startNextServer().then(() => {
      setTimeout(() => {
        mainWindow.loadURL(`http://localhost:${port}`);
      }, 3000); // Attendre que le serveur démarre
    });
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function startNextServer() {
  return new Promise((resolve) => {
    if (!isDev) {
      // Utiliser le serveur Next.js standalone
      const serverPath = path.join(__dirname, "../.next/standalone/server.js");

      serverProcess = spawn("node", [serverPath], {
        env: {
          ...process.env,
          PORT: port,
          NODE_ENV: "production",
        },
        cwd: path.join(__dirname, ".."),
      });

      serverProcess.stdout.on("data", (data) => {
        console.log(`Server: ${data}`);
        if (data.toString().includes("Listening on")) {
          resolve();
        }
      });

      serverProcess.stderr.on("data", (data) => {
        console.error(`Server Error: ${data}`);
      });

      serverProcess.on("error", (error) => {
        console.error("Failed to start server:", error);
      });
    } else {
      resolve();
    }
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (serverProcess) {
    serverProcess.kill();
  }
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  if (serverProcess) {
    serverProcess.kill();
  }
});
