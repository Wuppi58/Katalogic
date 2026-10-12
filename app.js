"use strict";

const STORAGE_KEY = "katalogic-state-v1";
const THEME_STORAGE_KEY = "katalogic-theme";
const SYNC_INTERVAL = 60_000;
const DEFAULT_CATEGORIES = [
  "3D Drucker",
  "Bücher",
  "Filament",
  "Filme",
  "Geräte",
  "Kleinteile",
  "Laser",
  "Sonstiges",
  "Spiele",
  "Zubehör"
];
let legacyVaultKey = "";
let needsStateMigration = false;
const state = loadState();
let editingId = null;
let syncInProgress = false;
let scannerStream = null;
let pendingGoogleTab = null;
let selectedCandidate = null;
let activeView = "home";
let gameDetailsExpanded = false;
let toastTimeout;

const elements = {
  themeToggle: document.querySelector("#theme-toggle"),
  connectionDot: document.querySelector("#connection-dot"),
  connectionLabel: document.querySelector("#connection-label"),
  homeLink: document.querySelector("#home-link"),
  welcomeOpenActions: document.querySelector("#welcome-open-actions"),
  taskbar: document.querySelector("#app-taskbar"),
  welcomeIntro: document.querySelector("#welcome-intro"),
  collectionView: document.querySelector("#collection-view"),
  searchView: document.querySelector("#search-view"),
  addView: document.querySelector("#add-view"),
  syncView: document.querySelector("#sync-view"),
  librarySearchForm: document.querySelector("#library-search-form"),
  librarySearchQuery: document.querySelector("#library-search-query"),
  librarySearchMessage: document.querySelector("#library-search-message"),
  librarySearchResults: document.querySelector("#library-search-results"),
  itemForm: document.querySelector("#item-form"),
  itemName: document.querySelector("#item-name"),
  itemCategory: document.querySelector("#item-category"),
  itemNotes: document.querySelector("#item-notes"),
  itemLocation: document.querySelector("#item-location"),
  itemBarcode: document.querySelector("#item-barcode"),
  gameDetails: document.querySelector("#game-details"),
  gameDetailsToggle: document.querySelector("#game-details-toggle"),
  itemList: document.querySelector("#item-list"),
  itemCount: document.querySelector("#item-count"),
  categoryFilter: document.querySelector("#category-filter"),
  collectionPrompt: document.querySelector("#collection-prompt"),
  lookupCategory: document.querySelector("#lookup-category"),
  emptyState: document.querySelector("#empty-state"),
  itemFormHeading: document.querySelector("#item-form-heading"),
  saveItem: document.querySelector("#save-item"),
  cancelEdit: document.querySelector("#cancel-edit"),
  barcodeForm: document.querySelector("#barcode-form"),
  barcodeQuery: document.querySelector("#barcode-query"),
  titleSearchForm: document.querySelector("#title-search-form"),
  titleQuery: document.querySelector("#title-query"),
  lookupMessage: document.querySelector("#lookup-message"),
  searchProviderMessage: document.querySelector("#search-provider-message"),
  lookupResults: document.querySelector("#lookup-results"),
  googleFallback: document.querySelector("#google-fallback"),
  googleFallbackLabel: document.querySelector("#google-fallback-label"),
  googleSearchLink: document.querySelector("#google-search-link"),
  googleShoppingLink: document.querySelector("#google-shopping-link"),
  googleBarcodeQuery: document.querySelector("#google-barcode-query"),
  googleWidgetOpen: document.querySelector("#google-widget-open"),
  googleWidgetSameTab: document.querySelector("#google-widget-same-tab"),
  googleCameraScan: document.querySelector("#google-camera-scan"),
  googleScanMessage: document.querySelector("#google-scan-message"),
  selectedPreview: document.querySelector("#selected-preview"),
  startScanner: document.querySelector("#start-scanner"),
  stopScanner: document.querySelector("#stop-scanner"),
  scannerPanel: document.querySelector("#scanner-panel"),
  scannerVideo: document.querySelector("#scanner-video"),
  scannerMessage: document.querySelector("#scanner-message"),
  settingsForm: document.querySelector("#settings-form"),
  supabaseUrl: document.querySelector("#supabase-url"),
  supabaseKey: document.querySelector("#supabase-key"),
  syncNow: document.querySelector("#sync-now"),
  syncMessage: document.querySelector("#sync-message"),
  syncId: document.querySelector("#sync-id"),
  syncIdForm: document.querySelector("#sync-id-form"),
  syncIdMessage: document.querySelector("#sync-id-message"),
  copySyncId: document.querySelector("#copy-sync-id"),
  exportData: document.querySelector("#export-data"),
  importDataButton: document.querySelector("#import-data-button"),
  importDataFile: document.querySelector("#import-data-file"),
  backupMessage: document.querySelector("#backup-message"),
  toast: document.querySelector("#toast")
};

function applyTheme(theme, persistChoice = false) {
  const selectedTheme = theme === "light" ? "light" : "dark";
  document.documentElement.dataset.theme = selectedTheme;
  document.documentElement.style.colorScheme = selectedTheme;
  const themeColor = selectedTheme === "dark" ? "#11141b" : "#f7f8f5";
  document.querySelector('meta[name="theme-color"]').content = themeColor;
  const switchTo = selectedTheme === "dark" ? "hellen" : "dunklen";
  const label = selectedTheme === "dark" ? "Hell" : "Dunkel";
  elements.themeToggle.setAttribute("aria-label", `Zum ${switchTo} Design wechseln`);
  elements.themeToggle.title = `Zum ${switchTo} Design wechseln`;
  elements.themeToggle.querySelector(".theme-icon").textContent = selectedTheme === "dark" ? "☀" : "☾";
  elements.themeToggle.querySelector(".theme-label").textContent = label;
  if (persistChoice) {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, selectedTheme);
    } catch (error) {
      console.error("Could not save the selected appearance.", error);
      notify("Design wurde geändert, konnte aber nicht dauerhaft gespeichert werden.");
    }
  }
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    legacyVaultKey = typeof saved.legacyMigrationKey === "string"
      ? saved.legacyMigrationKey
      : (typeof saved.vaultKey === "string" ? saved.vaultKey : "");
    let syncId = typeof saved.syncId === "string" ? saved.syncId : "";
    if (!isUuid(syncId)) {
      try {
        syncId = legacyVaultKey ? parseVaultKey(legacyVaultKey).vaultId : crypto.randomUUID();
      } catch (error) {
        console.error("Could not migrate the old Katalogic collection ID.", error);
        syncId = crypto.randomUUID();
      }
      needsStateMigration = true;
    }
    if (legacyVaultKey || saved.vaultKey) needsStateMigration = true;
    return {
      syncId,
      supabaseUrl: typeof saved.supabaseUrl === "string" ? saved.supabaseUrl : "",
      supabaseKey: typeof saved.supabaseKey === "string" ? saved.supabaseKey : "",
      records: Array.isArray(saved.records) ? saved.records.filter(isValidRecord) : []
    };
  } catch (error) {
    console.error("Could not load local Katalogic data.", error);
    return { syncId: crypto.randomUUID(), supabaseUrl: "", supabaseKey: "", records: [] };
  }
}

function isUuid(value) {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isValidRecord(record) {
  return record && typeof record.id === "string" &&
    typeof record.updatedAt === "string" && typeof record.deletedAt === "string" &&
    typeof record.name === "string" && typeof record.category === "string" &&
    typeof record.notes === "string" &&
    (record.barcode === undefined || typeof record.barcode === "string") &&
    (record.location === undefined || typeof record.location === "string") &&
    (record.imageUrl === undefined || typeof record.imageUrl === "string") &&
    (record.sourceUrl === undefined || typeof record.sourceUrl === "string") &&
    (record.gameDetails === undefined || (record.gameDetails && typeof record.gameDetails === "object" &&
      !Array.isArray(record.gameDetails) && Object.values(record.gameDetails).every((value) => typeof value === "string")));
}

const GAME_DETAIL_LABELS = {
  platform: "Plattform",
  edition: "Edition",
  region: "Region",
  medium: "Medium",
  developer: "Entwickler",
  publisher: "Publisher",
  releaseYear: "Jahr",
  condition: "Zustand",
  originalBox: "Originalhülle",
  manual: "Anleitung",
  extras: "Beilagen",
  purchaseDate: "Kaufdatum",
  purchasePrice: "Kaufpreis"
};

function readGameDetails() {
  return Object.fromEntries(
    [...elements.gameDetails.querySelectorAll("[data-game-field]")]
      .map((field) => {
        const otherInput = elements.gameDetails.querySelector(`[data-game-other="${field.dataset.gameField}"]`);
        const value = field.value === "__other__" && otherInput ? otherInput.value : field.value;
        return [field.dataset.gameField, value.trim()];
      })
      .filter(([, value]) => value)
  );
}

function fillGameDetails(details = {}) {
  for (const field of elements.gameDetails.querySelectorAll("[data-game-field]")) {
    const value = typeof details[field.dataset.gameField] === "string" ? details[field.dataset.gameField] : "";
    const hasOption = field.tagName !== "SELECT" || [...field.options].some((option) => option.value === value);
    const otherInput = elements.gameDetails.querySelector(`[data-game-other="${field.dataset.gameField}"]`);
    if (otherInput && value && !hasOption) {
      field.value = "__other__";
      otherInput.value = value;
    } else {
      field.value = value;
      if (otherInput) otherInput.value = "";
    }
  }
  updateGameOtherInputs();
}

function updateGameOtherInputs() {
  for (const field of elements.gameDetails.querySelectorAll("[data-has-other]")) {
    const otherInput = elements.gameDetails.querySelector(`[data-game-other="${field.dataset.gameField}"]`);
    otherInput.classList.toggle("hidden", field.value !== "__other__");
  }
}

function updateGameDetailsControls() {
  const isGame = elements.itemCategory.value === "Spiele";
  elements.gameDetailsToggle.classList.toggle("hidden", !isGame);
  elements.gameDetails.classList.toggle("hidden", !isGame || !gameDetailsExpanded);
  elements.gameDetailsToggle.setAttribute("aria-expanded", String(isGame && gameDetailsExpanded));
  elements.gameDetailsToggle.textContent = gameDetailsExpanded ? "Spieldetails schließen" : "Spieldetails öffnen";
}

function formatGameDetails(details = {}) {
  return Object.entries(GAME_DETAIL_LABELS)
    .filter(([key]) => typeof details[key] === "string" && details[key])
    .map(([key, label]) => `${label}: ${key === "purchasePrice" ? `${details[key]} €` : details[key]}`)
    .join(" · ");
}

function persist() {
  try {
    const saved = { ...state };
    if (legacyVaultKey) saved.legacyMigrationKey = legacyVaultKey;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  } catch (error) {
    console.error("Could not save local Katalogic data.", error);
    showMessage(elements.syncMessage, "Speichern auf diesem Gerät fehlgeschlagen. Prüfe den verfügbaren Speicherplatz.");
    throw error;
  }
}

function decodeBase64Url(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(normalized + "=".repeat((4 - normalized.length % 4) % 4));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function parseVaultKey(value) {
  const match = /^katalogic:v1:([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}):([A-Za-z0-9_-]{43})$/i.exec(value.trim());
  if (!match) throw new Error("Der Schlüssel hat nicht das erwartete Katalogic-Format.");
  const rawKey = decodeBase64Url(match[2]);
  if (rawKey.length !== 32) throw new Error("Der Schlüssel ist ungültig.");
  return { vaultId: match[1].toLowerCase(), rawKey };
}

async function decryptRecord(payload, key) {
  const combined = decodeBase64Url(payload);
  if (combined.length < 29) throw new Error("Verschlüsselter Eintrag ist beschädigt.");
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: combined.slice(0, 12) },
    key,
    combined.slice(12)
  );
  const record = JSON.parse(new TextDecoder().decode(plaintext));
  if (!isValidRecord(record)) throw new Error("Eintrag hat ein ungültiges Format.");
  return record;
}

async function cryptoKey() {
  if (!legacyVaultKey) throw new Error("Ein alter verschlüsselter Supabase-Eintrag benötigt zur einmaligen Migration seinen früheren Tresor-Schlüssel. Stelle eine Sicherung mit dem Schlüssel wieder her.");
  const legacyVault = parseVaultKey(legacyVaultKey);
  return crypto.subtle.importKey("raw", legacyVault.rawKey, { name: "AES-GCM" }, false, ["decrypt"]);
}

function showMessage(element, text, isError = true) {
  element.textContent = text;
  element.classList.toggle("error", isError);
}

function notify(text) {
  elements.toast.textContent = text;
  elements.toast.classList.add("visible");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => elements.toast.classList.remove("visible"), 2600);
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

function safeImageUrl(value) {
  if (typeof value !== "string") return "";
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
}

function refreshCategoryFilter(records) {
  const selected = elements.categoryFilter.value;
  const recordCounts = new Map();
  for (const record of records) {
    const category = record.category.trim() || "Sonstiges";
    recordCounts.set(category, (recordCounts.get(category) || 0) + 1);
  }
  const categories = [...new Set([
    ...DEFAULT_CATEGORIES,
    ...records.map((record) => record.category.trim()).filter(Boolean)
  ])].sort((a, b) => a.localeCompare(b, "de"));
  elements.categoryFilter.replaceChildren(
    new Option("Sammlung auswählen …", "__choose__"),
    new Option(`Alle Sammlungen (${records.length})`, "")
  );
  for (const category of categories) {
    elements.categoryFilter.add(new Option(`${category} (${recordCounts.get(category) || 0})`, category));
  }
  if (selected === "" || categories.includes(selected)) elements.categoryFilter.value = selected;
}

function showAppView(view) {
  activeView = view;
  const views = {
    collection: elements.collectionView,
    search: elements.searchView,
    add: elements.addView,
    sync: elements.syncView
  };
  for (const [name, section] of Object.entries(views)) {
    section.classList.toggle("hidden", name !== activeView);
  }
  elements.welcomeIntro.classList.toggle("hidden", activeView !== "home");
  for (const button of elements.taskbar.querySelectorAll(".taskbar-link")) {
    const active = button.dataset.view === activeView;
    button.classList.toggle("is-active", active);
    if (active) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderLibrarySearch() {
  const query = elements.librarySearchQuery.value.trim().toLocaleLowerCase("de");
  elements.librarySearchResults.replaceChildren();
  if (!query) {
    showMessage(elements.librarySearchMessage, "Gib einen Suchbegriff ein, um deinen Bestand zu prüfen.", false);
    return;
  }
  const matches = state.records.filter((record) => {
    if (record.deletedAt) return false;
    const searchable = [record.name, record.category, record.notes, record.location, record.barcode, formatGameDetails(record.gameDetails)]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase("de");
    return searchable.includes(query);
  }).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  if (!matches.length) {
    showMessage(elements.librarySearchMessage, "Nicht in deiner Sammlung gefunden. Du kannst den Artikel unter „Hinzufügen“ suchen oder manuell eintragen.", false);
    return;
  }
  showMessage(elements.librarySearchMessage, `${matches.length} ${matches.length === 1 ? "Eintrag" : "Einträge"} in deiner Sammlung gefunden.`, false);
  for (const record of matches) {
    const card = document.createElement("article");
    card.className = "item-card";
    const imageUrl = safeImageUrl(record.imageUrl);
    if (imageUrl) {
      const image = document.createElement("img");
      image.className = "item-image";
      image.src = imageUrl;
      image.alt = "";
      image.loading = "lazy";
      image.referrerPolicy = "no-referrer";
      card.append(image);
    }
    const copy = document.createElement("div");
    copy.className = "item-copy";
    const title = document.createElement("h3");
    title.textContent = record.name;
    const details = document.createElement("p");
    details.textContent = [record.category || "Sonstiges", record.barcode ? `Barcode: ${record.barcode}` : "", record.location ? `Lagerort: ${record.location}` : "", record.notes, formatGameDetails(record.gameDetails)]
      .filter(Boolean)
      .join(" · ");
    copy.append(title, details);
    card.append(copy);
    elements.librarySearchResults.append(card);
  }
}

function render() {
  elements.taskbar.classList.remove("hidden");
  elements.welcomeIntro.classList.toggle("hidden", activeView !== "home");
  elements.welcomeOpenActions.classList.remove("hidden");
  const views = {
    collection: elements.collectionView,
    search: elements.searchView,
    add: elements.addView,
    sync: elements.syncView
  };
  for (const [name, section] of Object.entries(views)) {
    section.classList.toggle("hidden", name !== activeView);
  }
  for (const button of elements.taskbar.querySelectorAll(".taskbar-link")) {
    const active = activeView !== "home" && button.dataset.view === activeView;
    button.classList.toggle("is-active", active);
    if (active) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  }
  elements.syncNow.disabled = !state.supabaseUrl || !state.supabaseKey || syncInProgress;
  elements.supabaseUrl.value = state.supabaseUrl;
  elements.supabaseKey.value = state.supabaseKey;
  elements.syncId.value = state.syncId;
  elements.itemList.replaceChildren();
  const allRecords = state.records.filter((record) => !record.deletedAt)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  refreshCategoryFilter(allRecords);
  const selectedCategory = elements.categoryFilter.value;
  const hasSelection = selectedCategory !== "__choose__";
  const records = !hasSelection ? [] : selectedCategory === ""
    ? allRecords
    : allRecords.filter((record) => (record.category.trim() || "Sonstiges") === selectedCategory);
  elements.itemCount.textContent = hasSelection
    ? `${records.length}${selectedCategory === "" ? "" : ` / ${allRecords.length}`} ${records.length === 1 ? "EINTRAG" : "EINTRÄGE"}`
    : "SAMMLUNG WÄHLEN";
  elements.collectionPrompt.classList.toggle("hidden", hasSelection);
  elements.emptyState.classList.toggle("hidden", !hasSelection || allRecords.length !== 0);
  if (!hasSelection || !allRecords.length) {
    renderLibrarySearch();
    return;
  }

  const groups = new Map();
  for (const record of records) {
    const category = record.category.trim() || "Sonstiges";
    if (!groups.has(category)) groups.set(category, []);
    groups.get(category).push(record);
  }
  for (const [category, groupRecords] of groups) {
    const group = document.createElement("section");
    group.className = "category-group";
    const heading = document.createElement("h3");
    heading.className = "category-heading";
    heading.textContent = category;
    group.append(heading);
    for (const record of groupRecords) {
      const card = document.createElement("article");
      card.className = "item-card";
      const imageUrl = safeImageUrl(record.imageUrl);
      const image = imageUrl ? `<img class="item-image" src="${escapeHtml(imageUrl)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : "";
      const notes = record.notes ? `<p>${escapeHtml(record.notes)}</p>` : "";
      const barcode = record.barcode ? `<p class="item-barcode">Barcode · ${escapeHtml(record.barcode)}</p>` : "";
      const location = record.location ? `<p class="item-location">Lagerort · ${escapeHtml(record.location)}</p>` : "";
      const gameDetails = formatGameDetails(record.gameDetails);
      const gameDetailsMarkup = gameDetails ? `<p class="game-details-summary">${escapeHtml(gameDetails)}</p>` : "";
      const source = safeImageUrl(record.sourceUrl);
      const sourceLink = source ? `<a class="source-link" href="${escapeHtml(source)}" target="_blank" rel="noopener noreferrer">Quelldaten ↗</a>` : "";
      card.innerHTML = `${image}<div class="item-copy"><h3>${escapeHtml(record.name)}</h3>${notes}${location}${barcode}${gameDetailsMarkup}${sourceLink}</div>
        <div class="item-actions">
          <button class="icon-button" type="button" data-edit="${escapeHtml(record.id)}" aria-label="Eintrag ${escapeHtml(record.name)} bearbeiten" title="Bearbeiten">✎</button>
          <button class="icon-button" type="button" data-delete="${escapeHtml(record.id)}" aria-label="Eintrag ${escapeHtml(record.name)} löschen" title="Löschen">×</button>
        </div>`;
      group.append(card);
    }
    elements.itemList.append(group);
  }
  if (!records.length) {
    const noMatches = document.createElement("p");
    noMatches.className = "muted no-category-results";
    noMatches.textContent = "In dieser Kategorie gibt es noch keine Einträge.";
    elements.itemList.append(noMatches);
  }
  renderLibrarySearch();
}

function setConnectionStatus() {
  const online = navigator.onLine;
  elements.connectionLabel.textContent = online ? "Lokal verfügbar" : "Offline";
  elements.connectionDot.style.background = online ? "#7d9a57" : "#c2784f";
}

async function synchronize() {
  if (syncInProgress) return;
  if (!navigator.onLine) {
    showMessage(elements.syncMessage, "Offline – Änderungen bleiben lokal und werden später synchronisiert.");
    return;
  }
  if (!state.supabaseUrl || !state.supabaseKey) {
    showMessage(elements.syncMessage, "Trage zuerst Supabase-Projekt-URL und Publishable-/Anon-Key ein.");
    return;
  }
  syncInProgress = true;
  render();
  showMessage(elements.syncMessage, "Synchronisiere Einträge …", false);
  try {
    const baseUrl = state.supabaseUrl.replace(/\/+$/, "");
    const endpoint = `${baseUrl}/rest/v1/katalogic_records`;
    const headers = {
      apikey: state.supabaseKey,
      "Content-Type": "application/json"
    };
    if (!state.supabaseKey.startsWith("sb_publishable_")) {
      headers.Authorization = `Bearer ${state.supabaseKey}`;
    }
    const query = new URLSearchParams({
      select: "vault_id,item_id,payload,updated_at",
      vault_id: `eq.${state.syncId}`
    });
    const response = await fetch(`${endpoint}?${query}`, { headers });
    if (!response.ok) throw new Error(`Abruf fehlgeschlagen (${response.status}). Prüfe URL, Key und Tabellen-Policies.`);
    const remoteRows = await response.json();
    const remoteRecords = [];
    const encryptedRemoteIds = new Set();
    for (const row of remoteRows) {
      let record;
      try {
        record = JSON.parse(row.payload);
      } catch {
        if (legacyVaultKey) {
          record = await decryptRecord(row.payload, await cryptoKey());
        } else {
          const local = state.records.find((entry) => entry.id === row.item_id);
          if (!local) throw new Error("In Supabase liegen noch alte verschlüsselte Einträge. Importiere zuerst eine Sicherung des alten Geräts, damit sie migriert werden können.");
          record = local;
        }
        encryptedRemoteIds.add(row.item_id);
      }
      if (!isValidRecord(record) || record.id !== row.item_id) {
        throw new Error(`Eintrag ${row.item_id} in Supabase hat ein ungültiges Format.`);
      }
      remoteRecords.push(record);
    }

    const merged = new Map(state.records.map((record) => [record.id, record]));
    for (const remote of remoteRecords) {
      const local = merged.get(remote.id);
      if (!local || remote.updatedAt > local.updatedAt) merged.set(remote.id, remote);
    }
    state.records = Array.from(merged.values());
    persist();
    const remoteIds = new Set(remoteRecords.map((record) => record.id));
    const remoteById = new Map(remoteRecords.map((record) => [record.id, record]));
    const uploads = [];
    for (const record of state.records) {
      const remote = remoteById.get(record.id);
      if (!remoteIds.has(record.id) || (remote && record.updatedAt > remote.updatedAt) || encryptedRemoteIds.has(record.id)) {
        uploads.push({
          vault_id: state.syncId,
          item_id: record.id,
          payload: JSON.stringify(record),
          updated_at: record.updatedAt
        });
      }
    }
    if (uploads.length) {
      const uploadUrl = `${endpoint}?on_conflict=vault_id%2Citem_id`;
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: { ...headers, Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify(uploads)
      });
      if (!uploadResponse.ok) throw new Error(`Upload fehlgeschlagen (${uploadResponse.status}). Prüfe die Datenbank-Policies.`);
    }
    legacyVaultKey = "";
    needsStateMigration = false;
    persist();
    render();
    showMessage(elements.syncMessage, `Synchronisiert · ${state.records.filter((record) => !record.deletedAt).length} Einträge · ${new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}`, false);
  } catch (error) {
    console.error("Katalogic synchronization failed.", error);
    showMessage(elements.syncMessage, error instanceof TypeError
      ? "Verbindung fehlgeschlagen. Prüfe Internetverbindung und Supabase-URL."
      : `Synchronisation fehlgeschlagen: ${error.message}`);
  } finally {
    syncInProgress = false;
    render();
  }
}

let lookupCandidates = [];

function makeBookCandidate(book, barcode = "") {
  const workKey = typeof book.key === "string" ? book.key : "";
  const coverId = Number.isInteger(book.cover_i) ? book.cover_i : null;
  const isbn = Array.isArray(book.isbn) ? book.isbn[0] : barcode;
  const details = [
    Array.isArray(book.author_name) ? `Autor: ${book.author_name.join(", ")}` : "",
    book.first_publish_year ? `Erstveröffentlichung: ${book.first_publish_year}` : "",
    isbn ? `ISBN: ${isbn}` : ""
  ].filter(Boolean).join(" · ");
  return {
    name: typeof book.title === "string" ? book.title : "Unbekannter Buchtitel",
    category: "Bücher",
    notes: details,
    barcode: barcode || isbn || "",
    imageUrl: coverId ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg?default=false` : "",
    sourceUrl: workKey ? `https://openlibrary.org${workKey}` : "",
    sourceName: "Open Library"
  };
}

function inferCategory(text) {
  const value = String(text || "").toLocaleLowerCase("de");
  if (/\b(book|buch|isbn|novel|roman|publisher|verlag)\b/.test(value)) return "Bücher";
  if (/\b(game|spiel|ps[345]|xbox|nintendo|switch|playstation|steam|videogame)\b/.test(value)) return "Spiele";
  if (/\b(film|movie|dvd|blu.?ray|cinema|serie|season)\b/.test(value)) return "Filme";
  if (/\b(filament|pla\b|petg|abs\b|tpu\b|resin|kunststoffdraht)\b/.test(value)) return "Filament";
  if (/\b(laser|engraver|gravier|laser cutter)\b/.test(value)) return "Laser";
  if (/\b(3d.?printer|3d.?druck|drucker|printer|ender.?[35]|bambu.?lab|prusa)\b/.test(value)) return "3D Drucker";
  if (/\b(accessor|zubehör|cable|kabel|adapter|nozzle|düse|spare part|ersatzteil)\b/.test(value)) return "Zubehör";
  if (/\b(electronic|device|gerät|phone|computer|laptop|camera|kamera|tablet|monitor)\b/.test(value)) return "Geräte";
  if (/\b(part|kleinteil|screw|schraube|bearing|lager|connector|verbinder)\b/.test(value)) return "Kleinteile";
  return "Sonstiges";
}

function makeUPCItemCandidate(item, barcode = "") {
  const name = typeof item.title === "string" ? item.title.trim() : "";
  if (!name) return null;
  const details = [
    item.brand ? `Marke: ${item.brand}` : "",
    item.model ? `Modell: ${item.model}` : "",
    item.color ? `Farbe: ${item.color}` : "",
    item.size ? `Größe: ${item.size}` : "",
    item.description ? String(item.description).slice(0, 240) : "",
    item.category ? `Produktgruppe: ${item.category}` : ""
  ].filter(Boolean);
  const ean = item.ean || item.upc || barcode;
  return {
    name,
    category: inferCategory(`${item.category || ""} ${name} ${item.brand || ""}`),
    notes: details.join(" · "),
    barcode: String(ean || ""),
    imageUrl: Array.isArray(item.images) ? safeImageUrl(item.images[0]) : "",
    sourceUrl: safeImageUrl(item.product_link) || (ean ? `https://www.upcitemdb.com/upc/${encodeURIComponent(ean)}` : ""),
    sourceName: item.provider || "UPCitemdb"
  };
}

async function searchUPCItemDb({ barcode = "", query = "" }) {
  const params = new URLSearchParams(barcode ? { barcode } : { query });
  const response = await fetch(`/api/products?${params}`);
  if (response.status === 404) return [];
  if (!response.ok) throw new Error(`UPCitemdb antwortet mit Status ${response.status}.`);
  const data = await response.json();
  if (data.code !== "OK" || !Array.isArray(data.items)) return [];
  return data.items.slice(0, 8)
    .map((item) => makeUPCItemCandidate(item, barcode))
    .filter(Boolean);
}

async function showSearchProvider() {
  try {
    const response = await fetch("/api/search-provider");
    if (!response.ok) throw new Error(`Provider-Status nicht verfügbar (${response.status}).`);
    const data = await response.json();
    elements.searchProviderMessage.textContent = data.provider === "google-shopping"
      ? "Google Shopping-Suche aktiv."
      : "Produktsuche aktiv · Google Shopping kann optional auf dem Server eingerichtet werden.";
  } catch (error) {
    console.error("Could not load product search provider status.", error);
    elements.searchProviderMessage.textContent = "Produktsuche verfügbar; optionale Google Shopping API siehe README.";
  }
}

async function searchBooks(query, barcode = "") {
  const params = new URLSearchParams({ limit: "8", fields: "key,title,author_name,first_publish_year,cover_i,isbn" });
  if (barcode) params.set("isbn", barcode);
  else params.set("q", query);
  const response = await fetch(`https://openlibrary.org/search.json?${params}`);
  if (!response.ok) throw new Error(`Open Library antwortet mit Status ${response.status}.`);
  const data = await response.json();
  return (Array.isArray(data.docs) ? data.docs : [])
    .filter((book) => typeof book.title === "string")
    .map((book) => makeBookCandidate(book, barcode));
}

async function searchOpenFoodFacts(barcode) {
  const fields = "code,product_name,product_name_de,brands,quantity,categories,image_front_url";
  const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=${fields}`);
  if (response.status === 404) return [];
  if (!response.ok) throw new Error(`Open Food Facts antwortet mit Status ${response.status}.`);
  const data = await response.json();
  if (data.status !== 1 || !data.product) return [];
  const product = data.product;
  const name = product.product_name_de || product.product_name;
  if (typeof name !== "string" || !name.trim()) return [];
  const notes = [
    product.brands ? `Marke: ${product.brands}` : "",
    product.quantity ? `Menge: ${product.quantity}` : "",
    product.categories ? `Produktgruppe: ${String(product.categories).split(",").slice(0, 3).join(", ")}` : ""
  ].filter(Boolean).join(" · ");
  return [{
    name: name.trim(),
    category: inferCategory(product.categories || name),
    notes,
    barcode,
    imageUrl: safeImageUrl(product.image_front_url),
    sourceUrl: `https://world.openfoodfacts.org/product/${encodeURIComponent(barcode)}`,
    sourceName: "Open Food Facts"
  }];
}

function renderLookupResults(candidates) {
  lookupCandidates = candidates;
  elements.lookupResults.replaceChildren();
  for (const [index, candidate] of candidates.entries()) {
    const card = document.createElement("article");
    card.className = "lookup-result";
    const imageUrl = safeImageUrl(candidate.imageUrl);
    if (imageUrl) {
      const image = document.createElement("img");
      image.src = imageUrl;
      image.alt = "";
      image.loading = "lazy";
      image.referrerPolicy = "no-referrer";
      card.append(image);
    }
    const copy = document.createElement("div");
    copy.className = "lookup-result-copy";
    const title = document.createElement("h4");
    title.textContent = candidate.name;
    const details = document.createElement("p");
    details.textContent = [candidate.category, candidate.notes, candidate.sourceName].filter(Boolean).join(" · ");
    copy.append(title, details);
    const select = document.createElement("button");
    select.className = "button button-secondary";
    select.type = "button";
    select.dataset.candidateIndex = String(index);
    select.textContent = "Übernehmen";
    card.append(copy, select);
    elements.lookupResults.append(card);
  }
}

async function runLookup({ barcode = "", query = "" }) {
  showMessage(elements.lookupMessage, "Suche in offenen Produktdatenbanken …", false);
  elements.lookupResults.replaceChildren();
  const normalizedBarcode = barcode.trim().replace(/[\s-]/g, "");
  const searchTerm = normalizedBarcode || query.trim();
  if (searchTerm) {
    elements.googleFallback.classList.remove("hidden");
    elements.googleFallbackLabel.textContent = normalizedBarcode
      ? `Zusätzlich im Web nach Barcode ${normalizedBarcode} suchen:`
      : "Noch nicht das Richtige gefunden?";
    const googleUrl = new URL("https://www.google.com/search");
    googleUrl.searchParams.set("q", normalizedBarcode || query.trim());
    elements.googleSearchLink.href = googleUrl.href;
    elements.googleShoppingLink.classList.toggle("hidden", !normalizedBarcode);
    if (normalizedBarcode) {
      googleUrl.searchParams.set("tbm", "shop");
      elements.googleShoppingLink.href = googleUrl.href;
    }
  } else {
    elements.googleFallback.classList.add("hidden");
  }
  const numericBarcode = /^\d{8,14}$/.test(normalizedBarcode);
  const isIsbn = /^(?:\d{9}[\dX]|\d{13})$/i.test(normalizedBarcode);
  if (barcode && !numericBarcode && !/^\d{9}[\dX]$/i.test(normalizedBarcode)) {
    showMessage(elements.lookupMessage, "Bitte einen gültigen Barcode (8–14 Ziffern) oder eine 10-/13-stellige ISBN eingeben.");
    return;
  }

  const lookups = [];
  const selectedCategory = elements.lookupCategory.value;
  if (query.trim()) {
    lookups.push(searchUPCItemDb({ query: query.trim() })
      .then((results) => ({ source: "products", results })));
  }
  if (query.trim() || (barcode && isIsbn)) {
    if (!selectedCategory || selectedCategory === "Bücher") {
      lookups.push(searchBooks(query.trim(), barcode && isIsbn ? normalizedBarcode : "")
        .then((results) => ({ source: "books", results })));
    }
  }
  if (barcode && numericBarcode) {
    lookups.push(searchOpenFoodFacts(normalizedBarcode).then((results) => ({ source: "products", results })));
    lookups.push(searchUPCItemDb({ barcode: normalizedBarcode })
      .then((results) => ({ source: "barcode-products", results })));
  }
  if (!lookups.length) {
    showMessage(elements.lookupMessage, "Gib eine ISBN, einen Barcode oder einen Buchtitel ein.");
    return;
  }

  const settled = await Promise.allSettled(lookups);
  const results = settled.filter((entry) => entry.status === "fulfilled")
    .flatMap((entry) => entry.value.results)
    .map((candidate) => ({
      ...candidate,
      category: selectedCategory || candidate.category || "Sonstiges"
    }))
    .filter((candidate, index, all) =>
      all.findIndex((other) => other.name.toLocaleLowerCase("de") === candidate.name.toLocaleLowerCase("de") &&
        other.barcode === candidate.barcode) === index
    );
  const failures = settled.filter((entry) => entry.status === "rejected");
  renderLookupResults(results);
  if (failures.length) {
    console.error("Some catalog lookup providers failed.", failures.map((entry) => entry.reason));
  }
  if (results.length) {
    showMessage(elements.lookupMessage, failures.length
      ? `${results.length} Treffer gefunden; eine Quelle ist nicht erreichbar, die Ergebnisse können unvollständig sein.`
      : `${results.length} Treffer gefunden. Wähle einen passenden Eintrag zum Übernehmen.`, Boolean(failures.length));
  } else if (failures.length) {
    showMessage(elements.lookupMessage, "Die Suche ist fehlgeschlagen. Prüfe die Internetverbindung und versuche es erneut.");
  } else {
    showMessage(elements.lookupMessage, barcode
      ? "Kein Treffer gefunden. Prüfe den Barcode oder ergänze den Eintrag manuell."
      : "Keine Treffer gefunden. Prüfe den Suchbegriff oder ergänze den Eintrag manuell.");
  }
}

function googleSearchUrl(query, shopping = false) {
  const url = new URL("https://www.google.com/search");
  url.searchParams.set("q", query);
  if (shopping) url.searchParams.set("tbm", "shop");
  return url.href;
}

function openGoogleSearch(query, tab = null) {
  const normalized = query.trim();
  if (!normalized) {
    showMessage(elements.googleScanMessage, "Bitte zuerst einen Barcode eingeben oder scannen.");
    return;
  }
  const googleUrl = googleSearchUrl(normalized);
  const target = tab && !tab.closed ? tab : window.open(googleUrl, "_blank");
  if (target) target.opener = null;
  if (tab && !tab.closed) tab.location.href = googleUrl;
  if (!target) {
    showMessage(elements.googleScanMessage, "Der Browser hat den neuen Tab blockiert. Erlaube Pop-ups für diese App oder nutze den Google-Link unten.");
  } else {
    showMessage(elements.googleScanMessage, `Google-Suche für ${normalized} wurde in einem neuen Tab geöffnet.`, false);
  }
  updateGoogleFallback(normalized);
}

function updateGoogleFallback(query) {
  const normalized = query.trim();
  if (!normalized) return;
  elements.googleFallback.classList.remove("hidden");
  elements.googleFallbackLabel.textContent = `Google-Suche für Barcode ${normalized}:`;
  elements.googleSearchLink.href = googleSearchUrl(normalized);
  elements.googleShoppingLink.href = googleSearchUrl(normalized, true);
  elements.googleShoppingLink.classList.remove("hidden");
  elements.googleWidgetOpen.href = googleSearchUrl(normalized);
  elements.googleWidgetSameTab.href = googleSearchUrl(normalized);
}

async function stopScanner() {
  if (scannerStream) {
    for (const track of scannerStream.getTracks()) track.stop();
    scannerStream = null;
  }
  if (pendingGoogleTab) {
    pendingGoogleTab.close();
    pendingGoogleTab = null;
  }
  elements.scannerVideo.srcObject = null;
  elements.scannerPanel.classList.add("hidden");
}

async function startScanner(purpose = "lookup") {
  if (scannerStream) await stopScanner();
  if (purpose === "google") {
    pendingGoogleTab = window.open("https://www.google.com/search?q=", "_blank");
    showMessage(elements.googleScanMessage, pendingGoogleTab
      ? "Kamera gestartet. Barcode in den Rahmen halten …"
      : "Der Browser hat den neuen Tab blockiert. Erlaube Pop-ups oder nutze das Barcode-Feld.", false);
  }
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    if (pendingGoogleTab) {
      pendingGoogleTab.close();
      pendingGoogleTab = null;
    }
    const message = "Kamerazugriff ist hier nicht verfügbar. Nutze die Barcode-Eingabe oder einen USB-/Bluetooth-Scanner.";
    if (purpose === "google") showMessage(elements.googleScanMessage, message);
    else showMessage(elements.scannerMessage, message);
    elements.scannerPanel.classList.remove("hidden");
    return;
  }
  if (!("BarcodeDetector" in window)) {
    if (pendingGoogleTab) {
      pendingGoogleTab.close();
      pendingGoogleTab = null;
    }
    const message = "Dieser Browser unterstützt die integrierte Barcode-Erkennung nicht. Nutze die Barcode-Eingabe oder einen USB-/Bluetooth-Scanner.";
    if (purpose === "google") showMessage(elements.googleScanMessage, message);
    else showMessage(elements.scannerMessage, message);
    elements.scannerPanel.classList.remove("hidden");
    return;
  }
  try {
    scannerStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } },
      audio: false
    });
    elements.scannerVideo.srcObject = scannerStream;
    elements.scannerPanel.classList.remove("hidden");
    await elements.scannerVideo.play();
    const supported = await BarcodeDetector.getSupportedFormats();
    const formats = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "qr_code"]
      .filter((format) => supported.includes(format));
    if (!formats.length) throw new Error("Dieser Browser unterstützt kein geeignetes Barcode-Format.");
    const detector = new BarcodeDetector({ formats });
    showMessage(elements.scannerMessage, purpose === "google"
      ? "Barcode scannen. Danach öffnet sich Google im neuen Tab …"
      : "Barcode in den Kamerarahmen halten …", false);
    while (scannerStream) {
      const hits = await detector.detect(elements.scannerVideo);
      if (hits.length && hits[0].rawValue) {
        const code = hits[0].rawValue;
        const googleTab = purpose === "google" ? pendingGoogleTab : null;
        pendingGoogleTab = null;
        await stopScanner();
        if (purpose === "google") {
          elements.googleBarcodeQuery.value = code;
          openGoogleSearch(code, googleTab);
        } else {
          elements.barcodeQuery.value = code;
          await runLookup({ barcode: code });
        }
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 220));
    }
  } catch (error) {
    await stopScanner();
    console.error("Camera barcode scanning failed.", error);
    const message = error.name === "NotAllowedError"
      ? "Kamerazugriff wurde verweigert. Erlaube den Kamerazugriff oder gib den Barcode manuell ein."
      : `Scanner konnte nicht gestartet werden: ${error.message}`;
    if (purpose === "google") showMessage(elements.googleScanMessage, message);
    else showMessage(elements.scannerMessage, message);
    elements.scannerPanel.classList.remove("hidden");
  }
}

function applyCandidate(candidate) {
  if (editingId) {
    notify("Beende zuerst die aktuelle Bearbeitung, bevor du einen Suchtreffer übernimmst.");
    return;
  }
  selectedCandidate = candidate;
  elements.itemName.value = candidate.name;
  elements.itemCategory.value = candidate.category || "Sonstiges";
  gameDetailsExpanded = false;
  updateGameDetailsControls();
  elements.itemNotes.value = candidate.notes || "";
  elements.itemBarcode.value = candidate.barcode || "";
  elements.selectedPreview.replaceChildren();
  const imageUrl = safeImageUrl(candidate.imageUrl);
  if (imageUrl) {
    const image = document.createElement("img");
    image.src = imageUrl;
    image.alt = "";
    image.referrerPolicy = "no-referrer";
    elements.selectedPreview.append(image);
  }
  const label = document.createElement("span");
  label.textContent = `Datenquelle: ${candidate.sourceName}`;
  elements.selectedPreview.append(label);
  elements.selectedPreview.classList.remove("hidden");
  showAppView("add");
  elements.itemForm.scrollIntoView({ behavior: "smooth", block: "center" });
  elements.itemName.focus();
}

elements.barcodeForm.addEventListener("submit", (event) => {
  event.preventDefault();
  void runLookup({ barcode: elements.barcodeQuery.value });
});

elements.titleSearchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  void runLookup({ query: elements.titleQuery.value });
});

elements.librarySearchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  renderLibrarySearch();
});
elements.librarySearchQuery.addEventListener("input", renderLibrarySearch);

elements.lookupResults.addEventListener("click", (event) => {
  const button = event.target.closest("[data-candidate-index]");
  if (!button) return;
  const candidate = lookupCandidates[Number(button.dataset.candidateIndex)];
  if (candidate) applyCandidate(candidate);
});

elements.startScanner.addEventListener("click", () => void startScanner("lookup"));
elements.stopScanner.addEventListener("click", () => void stopScanner());
elements.googleBarcodeQuery.addEventListener("input", () => {
  const barcode = elements.googleBarcodeQuery.value.trim();
  if (!barcode) {
    elements.googleWidgetOpen.href = "https://www.google.com/search";
    elements.googleWidgetSameTab.href = "https://www.google.com/search";
    return;
  }
  updateGoogleFallback(barcode);
  showMessage(elements.googleScanMessage, "Barcode bereit. Tippe auf „Google öffnen“ oder nutze den direkten Link darunter.", false);
});
elements.googleWidgetOpen.addEventListener("click", (event) => {
  const barcode = elements.googleBarcodeQuery.value.trim();
  if (!barcode) {
    event.preventDefault();
    showMessage(elements.googleScanMessage, "Bitte zuerst einen Barcode eingeben oder scannen.");
    elements.googleBarcodeQuery.focus();
    return;
  }
  updateGoogleFallback(barcode);
  showMessage(elements.googleScanMessage, "Der Google-Link wird in einem neuen Tab geöffnet. Falls das nicht klappt, nutze den direkten Link darunter.", false);
});
elements.googleCameraScan.addEventListener("click", () => void startScanner("google"));
elements.categoryFilter.addEventListener("change", render);
elements.taskbar.addEventListener("click", (event) => {
  const button = event.target.closest(".taskbar-link");
  if (button) showAppView(button.dataset.view);
});
elements.homeLink.addEventListener("click", (event) => {
  event.preventDefault();
  showAppView("home");
});
elements.welcomeIntro.addEventListener("click", (event) => {
  const button = event.target.closest("[data-view]");
  if (button) showAppView(button.dataset.view);
});
window.addEventListener("pagehide", () => void stopScanner());

elements.itemForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = elements.itemName.value.trim();
  if (!name) return;
  const now = new Date().toISOString();
  const existing = editingId && state.records.find((record) => record.id === editingId);
  const category = elements.itemCategory.value.trim();
  const gameDetails = category === "Spiele" ? readGameDetails() : {};
  const record = {
    id: existing ? existing.id : crypto.randomUUID(),
    name,
    category,
    notes: elements.itemNotes.value.trim(),
    location: elements.itemLocation.value.trim(),
    barcode: elements.itemBarcode.value.trim(),
    gameDetails: Object.keys(gameDetails).length ? gameDetails : undefined,
    imageUrl: selectedCandidate ? safeImageUrl(selectedCandidate.imageUrl) : (existing ? existing.imageUrl || "" : ""),
    sourceUrl: selectedCandidate ? safeImageUrl(selectedCandidate.sourceUrl) : (existing ? existing.sourceUrl || "" : ""),
    updatedAt: now,
    deletedAt: ""
  };
  const index = state.records.findIndex((entry) => entry.id === record.id);
  if (index >= 0) state.records[index] = record;
  else state.records.push(record);
  persist();
  activeView = "collection";
  render();
  resetItemForm();
  elements.barcodeQuery.value = "";
  elements.titleQuery.value = "";
  elements.lookupResults.replaceChildren();
  showMessage(elements.lookupMessage, "Eintrag gespeichert.", false);
  if (state.supabaseUrl && state.supabaseKey) void synchronize();
});

elements.itemList.addEventListener("click", (event) => {
  const editButton = event.target.closest("[data-edit]");
  const deleteButton = event.target.closest("[data-delete]");
  if (editButton) {
    const record = state.records.find((entry) => entry.id === editButton.dataset.edit);
    if (!record) return;
    editingId = record.id;
    elements.itemName.value = record.name;
    if (![...elements.itemCategory.options].some((option) => option.value === record.category)) {
      elements.itemCategory.add(new Option(record.category, record.category));
    }
    elements.itemCategory.value = record.category;
    elements.itemNotes.value = record.notes;
    elements.itemLocation.value = record.location || "";
    elements.itemBarcode.value = record.barcode || "";
    fillGameDetails(record.gameDetails);
    gameDetailsExpanded = false;
    updateGameDetailsControls();
    selectedCandidate = null;
    elements.selectedPreview.replaceChildren();
    elements.selectedPreview.classList.add("hidden");
    elements.itemFormHeading.textContent = "Eintrag bearbeiten";
    elements.saveItem.textContent = "Änderungen speichern";
    elements.cancelEdit.classList.remove("hidden");
    showAppView("add");
    elements.itemName.focus();
    elements.itemForm.scrollIntoView({ behavior: "smooth", block: "center" });
  }
  if (deleteButton) {
    const record = state.records.find((entry) => entry.id === deleteButton.dataset.delete);
    if (!record || !window.confirm(`„${record.name}“ aus dem Katalog löschen?`)) return;
    record.deletedAt = new Date().toISOString();
    record.updatedAt = record.deletedAt;
    persist();
    render();
    if (state.supabaseUrl && state.supabaseKey) void synchronize();
  }
});

function resetItemForm() {
  editingId = null;
  elements.itemForm.reset();
  gameDetailsExpanded = false;
  updateGameDetailsControls();
  selectedCandidate = null;
  elements.selectedPreview.replaceChildren();
  elements.selectedPreview.classList.add("hidden");
  elements.itemFormHeading.textContent = "Etwas hinzufügen";
  elements.saveItem.textContent = "Eintrag speichern";
  elements.cancelEdit.classList.add("hidden");
}

elements.cancelEdit.addEventListener("click", resetItemForm);
elements.itemCategory.addEventListener("change", () => {
  gameDetailsExpanded = false;
  updateGameDetailsControls();
});
elements.gameDetailsToggle.addEventListener("click", () => {
  gameDetailsExpanded = !gameDetailsExpanded;
  updateGameDetailsControls();
  if (gameDetailsExpanded) elements.gameDetails.querySelector("[data-game-field='platform']").focus();
});
elements.gameDetails.addEventListener("change", (event) => {
  if (event.target.matches("[data-has-other]")) updateGameOtherInputs();
});

elements.syncIdForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const syncId = elements.syncId.value.trim().toLowerCase();
  if (!isUuid(syncId)) {
    showMessage(elements.syncIdMessage, "Die Sammlungs-ID muss eine gültige UUID sein.");
    return;
  }
  if (syncId !== state.syncId && state.records.length &&
      !window.confirm("Die lokale Sammlung wird mit der ausgewählten Sammlungs-ID synchronisiert. Vorhandene Einträge werden mit dem Cloud-Bestand zusammengeführt. Fortfahren?")) return;
  state.syncId = syncId;
  persist();
  render();
  showMessage(elements.syncIdMessage, "Sammlungs-ID gespeichert. Auf allen verbundenen Geräten dieselbe ID verwenden.", false);
  if (state.supabaseUrl && state.supabaseKey) void synchronize();
});

elements.copySyncId.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(state.syncId);
    showMessage(elements.syncIdMessage, "Sammlungs-ID kopiert. Sie ist nicht geheim; verwende auf anderen Geräten dieselbe ID.", false);
  } catch (error) {
    console.error("Could not copy the collection ID.", error);
    showMessage(elements.syncIdMessage, "Kopieren nicht möglich. Markiere die Sammlungs-ID und kopiere sie manuell.");
  }
});

elements.exportData.addEventListener("click", () => {
  try {
    const backup = {
      format: "katalogic-backup",
      version: 1,
      exportedAt: new Date().toISOString(),
      syncId: state.syncId,
      records: state.records
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `katalogic-sicherung-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showMessage(elements.backupMessage, `${state.records.filter((record) => !record.deletedAt).length} Einträge exportiert. Die Sicherungsdatei vertraulich aufbewahren.`, false);
  } catch (error) {
    console.error("Could not export Katalogic data.", error);
    showMessage(elements.backupMessage, `Export fehlgeschlagen: ${error.message}`);
  }
});

elements.importDataButton.addEventListener("click", () => elements.importDataFile.click());
elements.importDataFile.addEventListener("change", async () => {
  const file = elements.importDataFile.files[0];
  if (!file) return;
  try {
    if (file.size > 25 * 1024 * 1024) throw new Error("Die Sicherungsdatei ist größer als 25 MB.");
    const backup = JSON.parse(await file.text());
    if (backup?.format !== "katalogic-backup" || backup.version !== 1 ||
        !isUuid(backup.syncId) || !Array.isArray(backup.records) ||
        !backup.records.every(isValidRecord)) {
      throw new Error("Die Datei ist keine gültige Katalogic-Sicherung.");
    }
    if (new Set(backup.records.map((record) => record.id)).size !== backup.records.length) {
      throw new Error("Die Sicherungsdatei enthält doppelte Eintrags-IDs.");
    }
    if (!window.confirm("Die aktuell gespeicherte Sammlung wird durch die importierte Sicherung ersetzt. Exportiere vorher eine Sicherung, falls du deine aktuellen Daten behalten möchtest.")) return;
    state.syncId = backup.syncId.toLowerCase();
    state.records = backup.records;
    legacyVaultKey = "";
    needsStateMigration = false;
    persist();
    render();
    const importedCount = state.records.filter((record) => !record.deletedAt).length;
    showMessage(elements.backupMessage, `${importedCount} ${importedCount === 1 ? "Eintrag" : "Einträge"} importiert.`, false);
    if (state.supabaseUrl && state.supabaseKey) void synchronize();
  } catch (error) {
    console.error("Could not import Katalogic backup.", error);
    showMessage(elements.backupMessage, `Import fehlgeschlagen: ${error.message}`);
  } finally {
    elements.importDataFile.value = "";
  }
});

elements.settingsForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const url = elements.supabaseUrl.value.trim().replace(/\/+$/, "");
  const key = elements.supabaseKey.value.trim();
  if (url && !/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url)) {
    showMessage(elements.syncMessage, "Bitte eine gültige HTTPS-Supabase-Projekt-URL im Format https://projekt.supabase.co eingeben.");
    return;
  }
  if (Boolean(url) !== Boolean(key)) {
    showMessage(elements.syncMessage, "Bitte Supabase-URL und Key gemeinsam eintragen – oder beide Felder leeren.");
    return;
  }
  state.supabaseUrl = url;
  state.supabaseKey = key;
  try {
    persist();
  } catch {
    return;
  }
  render();
  showMessage(elements.syncMessage, url ? "Einstellungen gespeichert. Du kannst jetzt synchronisieren." : "Supabase-Verbindung entfernt. Lokale Speicherung bleibt aktiv.", false);
  if (url) void synchronize();
});

elements.syncNow.addEventListener("click", () => void synchronize());
elements.themeToggle.addEventListener("click", () => {
  const currentTheme = document.documentElement.dataset.theme || "dark";
  applyTheme(currentTheme === "dark" ? "light" : "dark", true);
});
document.querySelector("#connection-label").addEventListener("click", () => void synchronize());
window.addEventListener("online", () => {
  setConnectionStatus();
  if (state.supabaseUrl && state.supabaseKey) void synchronize();
});
window.addEventListener("offline", setConnectionStatus);
setConnectionStatus();
let savedTheme = "dark";
try {
  savedTheme = localStorage.getItem(THEME_STORAGE_KEY) || "dark";
} catch (error) {
  console.error("Could not read the saved appearance preference.", error);
}
applyTheme(savedTheme);
render();
void showSearchProvider();
if (needsStateMigration) {
  persist();
  needsStateMigration = false;
}
if (state.supabaseUrl && state.supabaseKey) {
  showMessage(elements.syncMessage, "Verbinde mit Supabase …", false);
  void synchronize();
}
if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch((error) => {
      console.error("Could not register service worker.", error);
    });
  });
}
setInterval(() => {
  if (state.supabaseUrl && state.supabaseKey) void synchronize();
}, SYNC_INTERVAL);
