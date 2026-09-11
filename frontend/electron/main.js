const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");

let mainWindow;
let backendProcess;

// ── Launch Python backend ─────────────────────────────────
function startBackend() {
  const isDev = !app.isPackaged;
  const backendPath = isDev
    ? path.join(__dirname, "../../backend")
    : path.join(process.resourcesPath, "backend");

  let pythonExecutable = process.platform === "win32" ? "python" : "python3";

  // Check for virtualenv python executable in backendPath or workspace
  const venvPythonPath = process.platform === "win32"
    ? path.join(backendPath, "venv", "Scripts", "python.exe")
    : path.join(backendPath, "venv", "bin", "python");

  if (fs.existsSync(venvPythonPath)) {
    pythonExecutable = venvPythonPath;
  }

  console.log(`[electron] Starting backend at ${backendPath} using ${pythonExecutable}`);

  backendProcess = spawn(
    pythonExecutable,
    ["-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", "8000"],
    {
      cwd: backendPath,
      stdio: ["ignore", "pipe", "pipe"],
    }
  );

  if (backendProcess.stdout) {
    backendProcess.stdout.on("data", d => console.log("[backend]", d.toString().trim()));
  }
  if (backendProcess.stderr) {
    backendProcess.stderr.on("data", d => console.error("[backend]", d.toString().trim()));
  }

  backendProcess.on("exit", code => {
    console.log(`[backend] exited with code ${code}`);
  });

  backendProcess.on("error", err => {
    console.error("[backend] failed to start process:", err.message);
  });

  console.log("[electron] Backend process started, PID:", backendProcess.pid);
}

// ── Wait for backend to be ready ─────────────────────────
async function waitForBackend(retries = 20, delay = 500) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch("http://127.0.0.1:8000/api/health");
      if (res.ok) {
        console.log("[electron] Backend is healthy and responding.");
        return true;
      }
    } catch (_) {}
    await new Promise(r => setTimeout(r, delay));
  }
  console.warn("[electron] Backend health check timed out. Proceeding to create window.");
  return false;
}

// ── Create main window ────────────────────────────────────
async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: "PDF Studio",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const isDev = !app.isPackaged;
  if (isDev) {
    await mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  } else {
    await mainWindow.loadFile(
      path.join(__dirname, "../dist/index.html")
    );
  }
}

// ── IPC: open file dialog ─────────────────────────────────
ipcMain.handle("dialog:openFile", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openFile"],
    filters: [
      { name: "PDF Documents", extensions: ["pdf"] },
      { name: "All Files",     extensions: ["*"] },
    ],
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle("dialog:saveFile", async (_, defaultName) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultName,
    filters: [{ name: "PDF Documents", extensions: ["pdf"] }],
  });
  return result.canceled ? null : result.filePath;
});

// ── App lifecycle ─────────────────────────────────────────
app.whenReady().then(async () => {
  try {
    startBackend();
    await waitForBackend();
  } catch (err) {
    console.error("[electron] Backend startup error:", err.message);
  }
  await createWindow();
});

app.on("window-all-closed", () => {
  if (backendProcess) {
    try { backendProcess.kill(); } catch (_) {}
  }
  if (process.platform !== "darwin") app.quit();
});

app.on("will-quit", () => {
  if (backendProcess) {
    try { backendProcess.kill(); } catch (_) {}
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
