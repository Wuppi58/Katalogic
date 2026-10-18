"use strict";

const { app, BrowserWindow, dialog, session, shell } = require("electron");
const { createServer } = require("../server.js");

const HOST = "127.0.0.1";
const PORT = 41739;
let server;

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    const [window] = BrowserWindow.getAllWindows();
    if (window) {
      if (window.isMinimized()) window.restore();
      window.focus();
    }
  });

  app.whenReady().then(async () => {
    try {
      server = createServer();
      await new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(PORT, HOST, resolve);
      });

      const appUrl = `http://${HOST}:${PORT}/`;
      const appOrigin = new URL(appUrl).origin;
      session.defaultSession.setPermissionRequestHandler((webContents, permission, callback, details) => {
        let requestingOrigin = "";
        try {
          requestingOrigin = new URL(details?.requestingUrl || webContents.getURL()).origin;
        } catch (error) {
          console.error("Could not verify a permission request origin.", error);
        }
        callback(
          permission === "media" &&
          requestingOrigin === appOrigin &&
          details?.mediaTypes?.includes("video") === true
        );
      });

      const window = new BrowserWindow({
        width: 1280,
        height: 850,
        minWidth: 900,
        minHeight: 620,
        show: false,
        autoHideMenuBar: true,
        webPreferences: {
          contextIsolation: true,
          nodeIntegration: false,
          sandbox: true
        }
      });

      window.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith("https://") || url.startsWith("http://")) {
          void shell.openExternal(url).catch((error) => console.error("Could not open external link.", error));
        }
        return { action: "deny" };
      });
      window.webContents.on("will-navigate", (event, url) => {
        if (url !== `http://${HOST}:${PORT}/` && !url.startsWith(`http://${HOST}:${PORT}/`)) {
          event.preventDefault();
          if (url.startsWith("https://") || url.startsWith("http://")) {
            void shell.openExternal(url).catch((error) => console.error("Could not open external link.", error));
          }
        }
      });

      window.once("ready-to-show", () => window.show());
      await window.loadURL(appUrl);
    } catch (error) {
      console.error("Could not start Katalogic.", error);
      await dialog.showMessageBox({
        type: "error",
        title: "Katalogic konnte nicht gestartet werden",
        message: "Der lokale App-Server konnte nicht gestartet werden.",
        detail: error.message
      });
      app.quit();
    }
  });

  app.on("before-quit", () => {
    if (server) server.close();
  });

  app.on("window-all-closed", () => app.quit());
}
