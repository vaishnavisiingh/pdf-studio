const { contextBridge, ipcRenderer } = require("electron");

// Expose safe APIs to renderer (React)
contextBridge.exposeInMainWorld("electronAPI", {
  openFile:    ()           => ipcRenderer.invoke("dialog:openFile"),
  saveFile:    (name)       => ipcRenderer.invoke("dialog:saveFile", name),
  onMenuAction:(cb)         => ipcRenderer.on("menu:action", (_, action) => cb(action)),
});
