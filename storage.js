"use strict";

(() => {
  const DATABASE_NAME = "katalogic-local";
  const DATABASE_VERSION = 1;
  const STORE_NAME = "app";
  const STATE_KEY = "katalogic-state-v1";
  const SCRIPT_PATHS = [
    "pdf-export.js?v=pdf-2",
    "chart-export.js?v=chart-2",
    "app.js?v=management-10",
    "devices.js?v=devices-7",
    "games.js?v=games-10",
    "books.js?v=books-10",
    "films.js?v=films-6",
    "filaments.js?v=filaments-6",
    "small-parts.js?v=small-parts-11",
    "management-search-scanner.js?v=search-scanner-2",
    "product-recognition.js?v=recognition-9",
    "localize-file-inputs.js?v=file-inputs-1"
  ];

  let database;
  let cachedState;
  let writeQueue = Promise.resolve();

  function openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
      request.addEventListener("upgradeneeded", () => {
        if (!request.result.objectStoreNames.contains(STORE_NAME)) {
          request.result.createObjectStore(STORE_NAME, { keyPath: "key" });
        }
      });
      request.addEventListener("success", () => resolve(request.result), { once: true });
      request.addEventListener("error", () => reject(request.error || new Error("Die lokale Datenbank konnte nicht geöffnet werden.")), { once: true });
      request.addEventListener("blocked", () => reject(new Error("Die lokale Datenbank ist durch ein anderes Katalogic-Fenster blockiert. Schließe andere Fenster und lade die App neu.")), { once: true });
    });
  }

  function readState() {
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readonly");
      const request = transaction.objectStore(STORE_NAME).get("state");
      request.addEventListener("success", () => resolve(request.result?.value), { once: true });
      request.addEventListener("error", () => reject(request.error || new Error("Die lokale Datenbank konnte nicht gelesen werden.")), { once: true });
      transaction.addEventListener("abort", () => reject(transaction.error || new Error("Lesen aus der lokalen Datenbank wurde abgebrochen.")), { once: true });
    });
  }

  function writeState(value) {
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).put({ key: "state", value });
      transaction.addEventListener("complete", resolve, { once: true });
      transaction.addEventListener("error", () => reject(transaction.error || new Error("Speichern in der lokalen Datenbank ist fehlgeschlagen.")), { once: true });
      transaction.addEventListener("abort", () => reject(transaction.error || new Error("Speichern in der lokalen Datenbank wurde abgebrochen.")), { once: true });
    });
  }

  function loadScript(path) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = new URL(path, document.baseURI).href;
      script.addEventListener("load", resolve, { once: true });
      script.addEventListener("error", () => reject(new Error(`Die App-Datei ${path.split("?")[0]} konnte nicht geladen werden.`)), { once: true });
      document.head.append(script);
    });
  }

  function showStartupError(error) {
    console.error("Could not initialize Katalogic local storage.", error);
    const message = document.createElement("section");
    message.setAttribute("role", "alert");
    message.style.cssText = "position:fixed;inset:1rem;z-index:99999;max-width:42rem;height:max-content;margin:auto;padding:1.5rem;border:1px solid #b42318;border-radius:12px;background:#fff;color:#222;font:16px/1.5 system-ui,sans-serif;box-shadow:0 8px 32px #0003";
    const heading = document.createElement("h1");
    heading.textContent = "Katalogic konnte den lokalen Speicher nicht öffnen";
    const detail = document.createElement("p");
    detail.textContent = `${error.message} Deine vorhandenen Daten wurden nicht absichtlich gelöscht.`;
    const reload = document.createElement("button");
    reload.type = "button";
    reload.textContent = "Erneut versuchen";
    reload.addEventListener("click", () => location.reload());
    message.append(heading, detail, reload);
    document.body.append(message);
  }

  async function initialize() {
    if (!("indexedDB" in window)) throw new Error("Dieser Browser unterstützt IndexedDB nicht.");
    database = await openDatabase();
    let value = await readState();
    if (value === undefined) {
      const legacyValue = localStorage.getItem(STATE_KEY);
      value = legacyValue ? JSON.parse(legacyValue) : {};
      await writeState(value);
    }
    cachedState = value;
    try {
      localStorage.removeItem(STATE_KEY);
    } catch (error) {
      console.error("Could not remove the migrated browser storage copy.", error);
    }
    if (navigator.storage?.persist) {
      try {
        const persisted = await navigator.storage.persist();
        if (!persisted) console.info("Browser storage may be cleared automatically when device storage is low.");
      } catch (error) {
        console.error("Could not request persistent browser storage.", error);
      }
    }
    for (const path of SCRIPT_PATHS) await loadScript(path);
  }

  window.KatalogicLocalStorage = {
    load() {
      return structuredClone(cachedState);
    },
    save(value) {
      const next = structuredClone(value);
      const write = writeQueue.then(() => writeState(next));
      writeQueue = write.catch(() => {});
      return write.then(() => {
        cachedState = next;
      });
    },
    estimate() {
      if (!navigator.storage?.estimate) return Promise.resolve(null);
      return navigator.storage.estimate();
    }
  };

  void initialize().catch(showStartupError);
})();
