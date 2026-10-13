"use strict";

const STORAGE_KEY = "katalogic-state-v1";
const THEME_STORAGE_KEY = "katalogic-theme";
const SYNC_INTERVAL = 60_000;
const MAX_ITEM_PHOTOS = 3;
const ACCESSORY_TYPES = {
  original: "Original-Zubehör",
  thirdParty: "Zubehör von Drittanbietern"
};
const MAX_PHOTO_FILE_SIZE = 12 * 1024 * 1024;
const MAX_STORED_PHOTO_SIZE = 400 * 1024;
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
let itemPhotos = [];
let photoProcessing = false;
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
  barcodeView: document.querySelector("#barcode-view"),
  barcodeGenForm: document.querySelector("#barcode-generator-form"),
  barcodeGenFormat: document.querySelector("#barcode-gen-format"),
  barcodeGenValue: document.querySelector("#barcode-gen-value"),
  barcodeGenCaption: document.querySelector("#barcode-gen-caption"),
  barcodeGenRandom: document.querySelector("#barcode-gen-random"),
  barcodeGenSvg: document.querySelector("#barcode-gen-svg"),
  barcodeGenPng: document.querySelector("#barcode-gen-png"),
  barcodeGenPrint: document.querySelector("#barcode-gen-print"),
  barcodeGenShare: document.querySelector("#barcode-gen-share"),
  barcodeGenMessage: document.querySelector("#barcode-gen-message"),
  barcodeGenOutput: document.querySelector("#barcode-gen-output"),
  barcodeWebQuery: document.querySelector("#barcode-web-search-query"),
  barcodeWebLink: document.querySelector("#barcode-web-search-link"),
  librarySearchForm: document.querySelector("#library-search-form"),
  librarySearchQuery: document.querySelector("#library-search-query"),
  librarySearchMessage: document.querySelector("#library-search-message"),
  librarySearchResults: document.querySelector("#library-search-results"),
  ocrImage: document.querySelector("#ocr-image"),
  ocrFileName: document.querySelector("#ocr-file-name"),
  itemPhotosName: document.querySelector("#item-photos-name"),
  ocrRun: document.querySelector("#ocr-run"),
  ocrProgress: document.querySelector("#ocr-progress"),
  ocrMessage: document.querySelector("#ocr-message"),
  ocrLines: document.querySelector("#ocr-lines"),
  ocrLineList: document.querySelector("#ocr-line-list"),
  libraryStartScanner: document.querySelector("#library-start-scanner"),
  libraryStopScanner: document.querySelector("#library-stop-scanner"),
  libraryScannerPanel: document.querySelector("#library-scanner-panel"),
  libraryScannerVideo: document.querySelector("#library-scanner-video"),
  libraryScannerMessage: document.querySelector("#library-scanner-message"),
  itemForm: document.querySelector("#item-form"),
  itemName: document.querySelector("#item-name"),
  itemCategory: document.querySelector("#item-category"),
  accessoryField: document.querySelector("#accessory-field"),
  accessoryType: document.querySelector("#accessory-type"),
  itemNotes: document.querySelector("#item-notes"),
  itemLocation: document.querySelector("#item-location"),
  itemBarcode: document.querySelector("#item-barcode"),
  itemPhotos: document.querySelector("#item-photos"),
  itemPhotoPreview: document.querySelector("#item-photo-preview"),
  photoMessage: document.querySelector("#photo-message"),
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
    (record.imageUrls === undefined || (Array.isArray(record.imageUrls) &&
      record.imageUrls.length <= MAX_ITEM_PHOTOS &&
      record.imageUrls.every((image) => typeof image === "string" &&
        image.length <= 700_000 && /^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(image)))) &&
    (record.sourceUrl === undefined || typeof record.sourceUrl === "string") &&
    (record.accessoryType === undefined || ACCESSORY_TYPES[record.accessoryType] !== undefined) &&
    (record.gameDetails === undefined || (record.gameDetails && typeof record.gameDetails === "object" &&
      !Array.isArray(record.gameDetails) && Object.values(record.gameDetails).every((value) => typeof value === "string")));
}

function updateAccessoryControls() {
  elements.accessoryField.classList.toggle("hidden", elements.itemCategory.value !== "Geräte");
  elements.accessoryField.querySelectorAll("[data-accessory]").forEach((button) => {
    const active = button.dataset.accessory === elements.accessoryType.value;
    button.setAttribute("aria-pressed", String(active));
    button.classList.toggle("button-primary", active);
    button.classList.toggle("button-secondary", !active);
  });
}

elements.accessoryField.addEventListener("click", (event) => {
  const button = event.target.closest("[data-accessory]");
  if (!button) return;
  // Erneutes Antippen hebt die Auswahl wieder auf.
  elements.accessoryType.value = elements.accessoryType.value === button.dataset.accessory ? "" : button.dataset.accessory;
  updateAccessoryControls();
});

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

function renderPhotoPreview() {
  elements.itemPhotosName.textContent = itemPhotos.length
    ? `${itemPhotos.length} von ${MAX_ITEM_PHOTOS} Fotos ausgewählt`
    : "Keine Fotos ausgewählt";
  elements.itemPhotoPreview.replaceChildren();
  itemPhotos.forEach((photo, index) => {
    const entry = document.createElement("div");
    entry.className = "photo-preview-entry";
    const image = document.createElement("img");
    image.src = photo;
    image.alt = `Ausgewähltes Foto ${index + 1}`;
    const remove = document.createElement("button");
    remove.className = "icon-button";
    remove.type = "button";
    remove.dataset.removePhoto = String(index);
    remove.setAttribute("aria-label", `Foto ${index + 1} entfernen`);
    remove.title = "Foto entfernen";
    remove.textContent = "×";
    entry.append(image, remove);
    elements.itemPhotoPreview.append(entry);
  });
  const remaining = MAX_ITEM_PHOTOS - itemPhotos.length;
  elements.itemPhotos.disabled = remaining === 0 || photoProcessing;
  elements.saveItem.disabled = photoProcessing;
  elements.cancelEdit.disabled = photoProcessing;
  elements.itemPhotos.setAttribute("aria-describedby", "photo-message");
  elements.itemPhotos.setAttribute("title", remaining
    ? `Noch ${remaining} ${remaining === 1 ? "Foto" : "Fotos"} möglich`
    : "Maximal 3 Fotos pro Eintrag");
}

function appendRecordPhotos(container, record) {
  const photos = Array.isArray(record.imageUrls) ? record.imageUrls : [];
  if (photos.length) {
    const gallery = document.createElement("div");
    gallery.className = "item-photo-gallery";
    for (const [index, photo] of photos.entries()) {
      const image = document.createElement("img");
      image.className = "item-image";
      image.src = photo;
      image.alt = `${record.name} – Foto ${index + 1}`;
      image.loading = "lazy";
      gallery.append(image);
    }
    container.append(gallery);
    return true;
  }
  const imageUrl = safeImageUrl(record.imageUrl);
  if (!imageUrl) return false;
  const image = document.createElement("img");
  image.className = "item-image";
  image.src = imageUrl;
  image.alt = "";
  image.loading = "lazy";
  image.referrerPolicy = "no-referrer";
  container.append(image);
  return true;
}

async function resizePhoto(file) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new Error(`${file.name}: Bitte ein JPEG-, PNG- oder WebP-Bild auswählen.`);
  }
  if (file.size > MAX_PHOTO_FILE_SIZE) {
    throw new Error(`${file.name}: Das Bild darf höchstens 12 MB groß sein.`);
  }
  const bitmap = await createImageBitmap(file);
  try {
    if (bitmap.width * bitmap.height > 40_000_000) {
      throw new Error(`${file.name}: Die Bildauflösung ist zu groß.`);
    }
    let scale = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height));
    let quality = 0.82;
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
      if (!blob) throw new Error(`${file.name}: Das Bild konnte nicht verarbeitet werden.`);
      if (blob.size <= MAX_STORED_PHOTO_SIZE) {
        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.addEventListener("load", () => resolve(reader.result), { once: true });
          reader.addEventListener("error", () => reject(new Error(`${file.name}: Das Bild konnte nicht gelesen werden.`)), { once: true });
          reader.readAsDataURL(blob);
        });
        return dataUrl;
      }
      if (quality > 0.55) quality -= 0.1;
      else scale *= 0.75;
    }
    throw new Error(`${file.name}: Das Bild ließ sich nicht ausreichend verkleinern.`);
  } finally {
    bitmap.close();
  }
}

async function addSelectedPhotos() {
  const files = [...elements.itemPhotos.files];
  elements.itemPhotos.value = "";
  if (!files.length || photoProcessing) return;
  const available = MAX_ITEM_PHOTOS - itemPhotos.length;
  const selectedFiles = files.slice(0, available);
  const skipped = files.length - selectedFiles.length;
  if (!selectedFiles.length) {
    showMessage(elements.photoMessage, `Es sind bereits ${MAX_ITEM_PHOTOS} Fotos ausgewählt.`, false);
    return;
  }
  photoProcessing = true;
  renderPhotoPreview();
  showMessage(elements.photoMessage, "Fotos werden vorbereitet …", false);
  try {
    const processed = [];
    for (const file of selectedFiles) processed.push(await resizePhoto(file));
    itemPhotos.push(...processed);
    showMessage(elements.photoMessage, `${itemPhotos.length} von ${MAX_ITEM_PHOTOS} Fotos ausgewählt.${skipped ? ` ${skipped} weitere ${skipped === 1 ? "Datei wurde" : "Dateien wurden"} wegen des Limits ignoriert.` : ""}`, false);
  } catch (error) {
    console.error("Could not prepare item photos.", error);
    showMessage(elements.photoMessage, error.message);
  } finally {
    photoProcessing = false;
    renderPhotoPreview();
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
    barcode: elements.barcodeView,
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
  const stripZeros = (value) => String(value || "").replace(/^0+/, "");
  const isNumericQuery = /^\d{6,}$/.test(query);
  const matches = state.records.filter((record) => {
    if (record.deletedAt) return false;
    // EAN-13 und UPC-A unterscheiden sich nur durch eine führende Null.
    if (isNumericQuery && record.barcode && stripZeros(record.barcode) === stripZeros(query)) return true;
    const searchable = [record.name, record.category, record.notes, record.location, record.barcode, ACCESSORY_TYPES[record.accessoryType], formatGameDetails(record.gameDetails)]
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
    appendRecordPhotos(card, record);
    const copy = document.createElement("div");
    copy.className = "item-copy";
    const title = document.createElement("h3");
    title.textContent = record.name;
    const details = document.createElement("p");
    details.textContent = [record.category || "Sonstiges", record.barcode ? `Barcode: ${record.barcode}` : "", record.location ? `Lagerort: ${record.location}` : "", ACCESSORY_TYPES[record.accessoryType], record.notes, formatGameDetails(record.gameDetails)]
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
    barcode: elements.barcodeView,
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
      appendRecordPhotos(card, record);
      const notes = record.notes ? `<p>${escapeHtml(record.notes)}</p>` : "";
      const barcode = record.barcode ? `<p class="item-barcode">Barcode · ${escapeHtml(record.barcode)}</p>` : "";
      const location = record.location ? `<p class="item-location">Lagerort · ${escapeHtml(record.location)}</p>` : "";
      const accessory = ACCESSORY_TYPES[record.accessoryType] ? `<p class="item-location">${escapeHtml(ACCESSORY_TYPES[record.accessoryType])}</p>` : "";
      const gameDetails = formatGameDetails(record.gameDetails);
      const gameDetailsMarkup = gameDetails ? `<p class="game-details-summary">${escapeHtml(gameDetails)}</p>` : "";
      const source = safeImageUrl(record.sourceUrl);
      const sourceLink = source ? `<a class="source-link" href="${escapeHtml(source)}" target="_blank" rel="noopener noreferrer">Quelldaten ↗</a>` : "";
      const copy = document.createElement("div");
      copy.className = "item-copy";
      copy.innerHTML = `<h3>${escapeHtml(record.name)}</h3>${notes}${location}${accessory}${barcode}${gameDetailsMarkup}${sourceLink}`;
      card.append(copy);
      card.insertAdjacentHTML("beforeend", `
        <div class="item-actions">
          <button class="icon-button" type="button" data-edit="${escapeHtml(record.id)}" aria-label="Eintrag ${escapeHtml(record.name)} bearbeiten" title="Bearbeiten">✎</button>
          <button class="icon-button" type="button" data-delete="${escapeHtml(record.id)}" aria-label="Eintrag ${escapeHtml(record.name)} löschen" title="Löschen">×</button>
        </div>`);
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

function scannerUi(purpose) {
  return purpose === "library"
    ? { panel: elements.libraryScannerPanel, video: elements.libraryScannerVideo, message: elements.libraryScannerMessage }
    : { panel: elements.scannerPanel, video: elements.scannerVideo, message: elements.scannerMessage };
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
  for (const purpose of ["lookup", "library"]) {
    const ui = scannerUi(purpose);
    ui.video.srcObject = null;
    ui.panel.classList.add("hidden");
  }
}

async function startScanner(purpose = "lookup") {
  if (scannerStream) await stopScanner();
  const ui = scannerUi(purpose);
  const reportScanner = (text, isError = true) => {
    if (purpose === "google") showMessage(elements.googleScanMessage, text, isError);
    else showMessage(ui.message, text, isError);
  };
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
    reportScanner("Kamerazugriff ist hier nicht verfügbar. Nutze die Barcode-Eingabe oder einen USB-/Bluetooth-Scanner.");
    ui.panel.classList.remove("hidden");
    return;
  }
  if (!("BarcodeDetector" in window)) {
    if (pendingGoogleTab) {
      pendingGoogleTab.close();
      pendingGoogleTab = null;
    }
    reportScanner("Dieser Browser unterstützt die integrierte Barcode-Erkennung nicht. Nutze die Barcode-Eingabe oder einen USB-/Bluetooth-Scanner.");
    ui.panel.classList.remove("hidden");
    return;
  }
  try {
    scannerStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } },
      audio: false
    });
    ui.video.srcObject = scannerStream;
    ui.panel.classList.remove("hidden");
    await ui.video.play();
    const supported = await BarcodeDetector.getSupportedFormats();
    const formats = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "qr_code"]
      .filter((format) => supported.includes(format));
    if (!formats.length) throw new Error("Dieser Browser unterstützt kein geeignetes Barcode-Format.");
    const detector = new BarcodeDetector({ formats });
    showMessage(ui.message, purpose === "google"
      ? "Barcode scannen. Danach öffnet sich Google im neuen Tab …"
      : "Barcode in den Kamerarahmen halten …", false);
    while (scannerStream) {
      const hits = await detector.detect(ui.video);
      if (hits.length && hits[0].rawValue) {
        const code = hits[0].rawValue;
        const googleTab = purpose === "google" ? pendingGoogleTab : null;
        pendingGoogleTab = null;
        await stopScanner();
        if (purpose === "google") {
          elements.googleBarcodeQuery.value = code;
          openGoogleSearch(code, googleTab);
        } else if (purpose === "library") {
          elements.librarySearchQuery.value = code;
          renderLibrarySearch();
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
    reportScanner(error.name === "NotAllowedError"
      ? "Kamerazugriff wurde verweigert. Erlaube den Kamerazugriff oder gib den Barcode manuell ein."
      : `Scanner konnte nicht gestartet werden: ${error.message}`);
    ui.panel.classList.remove("hidden");
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
  updateAccessoryControls();
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
elements.libraryStartScanner.addEventListener("click", () => void startScanner("library"));
elements.libraryStopScanner.addEventListener("click", () => void stopScanner());

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
  if (photoProcessing) {
    showMessage(elements.photoMessage, "Warte bitte, bis die Fotoverarbeitung abgeschlossen ist.");
    return;
  }
  const name = elements.itemName.value.trim();
  if (!name) return;
  const now = new Date().toISOString();
  const existing = editingId && state.records.find((record) => record.id === editingId);
  const category = elements.itemCategory.value.trim();
  const gameDetails = category === "Spiele" ? readGameDetails() : {};
  const accessoryType = category === "Geräte" && ACCESSORY_TYPES[elements.accessoryType.value] ? elements.accessoryType.value : undefined;
  const record = {
    id: existing ? existing.id : crypto.randomUUID(),
    name,
    category,
    notes: elements.itemNotes.value.trim(),
    location: elements.itemLocation.value.trim(),
    barcode: elements.itemBarcode.value.trim(),
    accessoryType,
    gameDetails: Object.keys(gameDetails).length ? gameDetails : undefined,
    imageUrls: itemPhotos.length ? [...itemPhotos] : undefined,
    imageUrl: selectedCandidate ? safeImageUrl(selectedCandidate.imageUrl) : (existing ? existing.imageUrl || "" : ""),
    sourceUrl: selectedCandidate ? safeImageUrl(selectedCandidate.sourceUrl) : (existing ? existing.sourceUrl || "" : ""),
    updatedAt: now,
    deletedAt: ""
  };
  const index = state.records.findIndex((entry) => entry.id === record.id);
  const previous = index >= 0 ? state.records[index] : null;
  if (index >= 0) state.records[index] = record;
  else state.records.push(record);
  try {
    persist();
  } catch {
    if (previous) state.records[index] = previous;
    else state.records.pop();
    showMessage(elements.photoMessage, "Eintrag konnte nicht gespeichert werden. Prüfe den verfügbaren Speicherplatz oder entferne Fotos und versuche es erneut.");
    return;
  }
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
    itemPhotos = Array.isArray(record.imageUrls) ? [...record.imageUrls] : [];
    renderPhotoPreview();
    showMessage(elements.photoMessage, itemPhotos.length
      ? `${itemPhotos.length} von ${MAX_ITEM_PHOTOS} Fotos ausgewählt.`
      : "", false);
    fillGameDetails(record.gameDetails);
    elements.accessoryType.value = ACCESSORY_TYPES[record.accessoryType] ? record.accessoryType : "";
    updateAccessoryControls();
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

const OCR_BASE = new URL("vendor/tesseract/", document.baseURI).href;
const OCR_PLATFORMS = [
  [/nintendo\s*switch\s*2|switch\s*2\b/i, "Nintendo Switch 2"],
  [/nintendo\s*switch|switch\s*(?:lite|oled)/i, "Nintendo Switch"],
  [/play\s*station\s*5|\bps\s?5\b/i, "PlayStation 5"],
  [/play\s*station\s*4|\bps\s?4\b/i, "PlayStation 4"],
  [/play\s*station\s*3|\bps\s?3\b/i, "PlayStation 3"],
  [/play\s*station\s*2|\bps\s?2\b/i, "PlayStation 2"],
  [/play\s*station\s*vita|\bps\s?vita\b/i, "PlayStation Vita"],
  [/\bpsp\b/i, "PSP"],
  [/play\s*station\b/i, "PlayStation"],
  [/xbox\s*series/i, "Xbox Series X|S"],
  [/xbox\s*one/i, "Xbox One"],
  [/xbox\s*360/i, "Xbox 360"],
  [/\bxbox\b/i, "Xbox"],
  [/wii\s*u\b/i, "Wii U"],
  [/\bwii\b/i, "Wii"],
  [/game\s*cube/i, "GameCube"],
  [/nintendo\s*64|\bn64\b/i, "Nintendo 64"],
  [/\b3ds\b/i, "Nintendo 3DS"],
  [/nintendo\s*ds\b|\bnds\b/i, "Nintendo DS"],
  [/game\s*boy\s*advance|\bgba\b/i, "Game Boy Advance"],
  [/game\s*boy\s*color/i, "Game Boy Color"],
  [/game\s*boy/i, "Game Boy"],
  [/super\s*nintendo|\bsnes\b/i, "Super Nintendo (SNES)"],
  [/steam\s*deck/i, "Steam Deck"],
  [/dreamcast/i, "Sega Dreamcast"],
  [/windows\s*(?:10|11)|\bpc[\s-]*(?:dvd|cd|spiel|game)|\bfor\s+pc\b|\bpc\b.*\bwindows\b/i, "PC (Windows)"]
];
const OCR_EDITIONS = [
  [/day\s*one/i, "Day One Edition"],
  [/launch\s*edition/i, "Launch Edition"],
  [/deluxe/i, "Deluxe Edition"],
  [/special\s*edition/i, "Special Edition"],
  [/limited\s*edition|limitierte/i, "Limited Edition"],
  [/collector/i, "Collector’s Edition"],
  [/ultimate/i, "Ultimate Edition"],
  [/game\s*of\s*the\s*year|\bgoty\b/i, "Game of the Year Edition"],
  [/complete\s*edition/i, "Complete Edition"],
  [/definitive/i, "Definitive Edition"],
  [/remaster/i, "Remastered"],
  [/steelbook/i, "Steelbook Edition"],
  [/platinum|greatest\s*hits|nintendo\s*selects|essentials/i, "Platinum / Greatest Hits"]
];
let ocrWorker = null;
let ocrWorkerPromise = null;
let ocrIdleTimer = null;
let ocrBusy = false;

function isbn10Valid(digits) {
  if (!/^\d{9}[\dX]$/.test(digits)) return false;
  const sum = [...digits].reduce((total, char, index) => total + (char === "X" ? 10 : Number(char)) * (10 - index), 0);
  return sum % 11 === 0;
}

function gtinValid(digits) {
  if (!/^\d+$/.test(digits) || ![8, 12, 13].includes(digits.length)) return false;
  const body = [...digits.slice(0, -1)].reverse();
  const sum = body.reduce((total, char, index) => total + Number(char) * (index % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === Number(digits.at(-1));
}

function findOcrBarcode(text) {
  const groups = [...text.matchAll(/\d[\d -]{6,}[\dXx]?/g)].map((match) => match[0].replace(/[^\dXx]/g, "").toUpperCase());
  for (const group of groups) {
    for (let start = 0; start + 13 <= group.length; start += 1) {
      const window = group.slice(start, start + 13);
      if (gtinValid(window)) return window;
    }
  }
  for (const group of groups) {
    for (let start = 0; start + 10 <= group.length; start += 1) {
      const window = group.slice(start, start + 10);
      if (isbn10Valid(window)) return window;
    }
  }
  return groups.find((group) => group.length === 12 && gtinValid(group)) || groups.find((group) => group.length === 8 && gtinValid(group)) || "";
}

function stripPlatformWords(text) {
  let result = text;
  for (const [pattern] of OCR_PLATFORMS) result = result.replace(new RegExp(pattern.source, `${pattern.flags.replace("g", "")}g`), " ");
  return result.replace(/\s+/g, " ").trim();
}

function isOcrNoiseLine(text) {
  const trimmed = text.trim();
  const letters = (trimmed.match(/\p{L}/gu) || []).length;
  if (letters < 3) return true;
  if ((trimmed.match(/[\p{L}\p{N}]/gu) || []).length / trimmed.length < 0.6) return true;
  if (/^(?:pegi|usk|fsk|esrb|cero)\b/i.test(trimmed) || /https?:|www\.|\.(?:de|com)\b/i.test(trimmed)) return true;
  if (/\d[\d -]{7,}\d/.test(trimmed) || /\d+[.,]\d{2}\s*(?:€|eur)/i.test(trimmed)) return true;
  return stripPlatformWords(trimmed).replace(/[^\p{L}]/gu, "").length < 3;
}

function parseOcrText(text, lines) {
  const result = { gameDetails: {} };
  const barcode = findOcrBarcode(text);
  if (barcode) result.barcode = barcode;

  const platform = OCR_PLATFORMS.find(([pattern]) => pattern.test(text));
  if (platform) result.gameDetails.platform = platform[1];
  const edition = OCR_EDITIONS.find(([pattern]) => pattern.test(text));
  if (edition) result.gameDetails.edition = edition[1];
  if (/\b(?:pegi|usk)\b|\bpal\b/i.test(text)) result.gameDetails.region = "PAL (Europa)";
  else if (/\besrb\b|ntsc-?u\b/i.test(text)) result.gameDetails.region = "NTSC-U / USA";
  else if (/\bcero\b|ntsc-?j\b/i.test(text)) result.gameDetails.region = "NTSC-J / Japan";

  if (platform || /\b(?:pegi|usk)\b/i.test(text)) result.category = "Spiele";
  else if (/\bisbn\b|taschenbuch|hardcover|gebunden|\bverlag\b/i.test(text) || (barcode && /^97[89]/.test(barcode)) || (barcode && barcode.length === 10)) result.category = "Bücher";
  else if (/blu-?ray|\bdvd\b|ultra\s*hd|\bfsk\b|laufzeit|spieldauer|\bminuten\b/i.test(text)) result.category = "Filme";
  else if (/filament|\b(?:pla|petg|tpu)\b|1[.,]75\s?mm|2[.,]85\s?mm/i.test(text)) result.category = "Filament";

  const rating = text.match(/\b(USK|FSK|PEGI)\s*(?:ab\s*)?(\d{1,2})\b/i);
  const year = text.match(/\b(19[7-9]\d|20[0-3]\d)\b/);
  const notes = [rating ? `${rating[1].toUpperCase()} ${rating[2]}` : "", year ? `Jahr ${year[1]}` : ""].filter(Boolean).join(" · ");
  if (notes) result.notes = notes;

  const candidates = lines.filter((line) => line.confidence >= 45 && !isOcrNoiseLine(line.text));
  const best = candidates.reduce((top, line) => {
    const score = Math.max(1, line.height) * (line.confidence / 100);
    return !top || score > top.score ? { line, score } : top;
  }, null);
  if (best) result.name = stripPlatformWords(best.line.text).slice(0, 120);
  result.lines = candidates.map((line) => stripPlatformWords(line.text).slice(0, 120)).filter((line, index, all) => line && all.indexOf(line) === index).slice(0, 14);
  return result;
}

function loadScriptOnce(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.addEventListener("load", resolve, { once: true });
    script.addEventListener("error", () => reject(new Error("Die Texterkennung konnte nicht geladen werden.")), { once: true });
    document.head.append(script);
  });
}

function reportOcrProgress(message) {
  const labels = {
    "loading tesseract core": "Erkennungsmodul wird geladen …",
    "initializing tesseract": "Erkennungsmodul wird gestartet …",
    "loading language traineddata": "Sprachdaten werden geladen …",
    "initializing api": "Erkennung wird vorbereitet …",
    "recognizing text": "Text wird erkannt …"
  };
  if (labels[message.status]) showMessage(elements.ocrMessage, labels[message.status], false);
  if (message.status === "recognizing text") elements.ocrProgress.value = Math.round(message.progress * 100);
}

async function getOcrWorker() {
  clearTimeout(ocrIdleTimer);
  if (ocrWorker) return ocrWorker;
  if (!ocrWorkerPromise) {
    ocrWorkerPromise = (async () => {
      if (!window.Tesseract) await loadScriptOnce(`${OCR_BASE}tesseract.min.js`);
      ocrWorker = await window.Tesseract.createWorker(["deu", "eng"], 1, {
        workerPath: `${OCR_BASE}worker.min.js`,
        corePath: OCR_BASE,
        langPath: `${OCR_BASE}lang`,
        logger: reportOcrProgress
      });
      return ocrWorker;
    })().catch((error) => {
      ocrWorkerPromise = null;
      throw error;
    });
  }
  return ocrWorkerPromise;
}

function releaseOcrWorker() {
  const worker = ocrWorker;
  ocrWorker = null;
  ocrWorkerPromise = null;
  if (worker) void worker.terminate();
}

async function prepareOcrImage(file) {
  let source;
  try {
    source = await createImageBitmap(file);
  } catch {
    throw new Error("Dieses Bildformat wird nicht unterstützt. Nutze JPEG, PNG oder WebP.");
  }
  const longest = Math.max(source.width, source.height);
  const scale = longest > 2200 ? 2200 / longest : longest < 1200 ? Math.min(2, 1600 / longest) : 1;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(source.width * scale);
  canvas.height = Math.round(source.height * scale);
  const context = canvas.getContext("2d");
  context.fillStyle = "#fff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  source.close?.();
  return canvas;
}

function collectOcrLines(data) {
  const lines = [];
  for (const block of data.blocks || []) {
    for (const paragraph of block.paragraphs || []) {
      for (const line of paragraph.lines || []) {
        const text = (line.text || "").replace(/\s+/g, " ").trim();
        if (text) lines.push({ text, confidence: line.confidence ?? 0, height: line.bbox ? line.bbox.y1 - line.bbox.y0 : 1 });
      }
    }
  }
  if (lines.length) return lines;
  return (data.text || "").split(/\r?\n/).map((text) => text.trim()).filter(Boolean)
    .map((text) => ({ text, confidence: data.confidence ?? 60, height: 1 }));
}

function applyOcrResult(result) {
  const applied = [];
  if (result.name && !elements.itemName.value.trim()) {
    elements.itemName.value = result.name;
    applied.push("Name");
  }
  if (result.category && elements.itemCategory.value === "Sonstiges") {
    elements.itemCategory.value = result.category;
    updateAccessoryControls();
    applied.push(`Kategorie (${result.category})`);
  }
  if (result.barcode && !elements.itemBarcode.value.trim()) {
    elements.itemBarcode.value = result.barcode;
    applied.push("Barcode");
  }
  if (result.notes && !elements.itemNotes.value.trim()) {
    elements.itemNotes.value = result.notes;
    applied.push("Notiz");
  }
  if (elements.itemCategory.value === "Spiele" && Object.keys(result.gameDetails).length) {
    const current = readGameDetails();
    const additions = Object.fromEntries(Object.entries(result.gameDetails).filter(([key]) => !current[key]));
    if (Object.keys(additions).length) {
      fillGameDetails({ ...current, ...additions });
      gameDetailsExpanded = true;
      applied.push(`Spieldetails (${Object.values(additions).join(", ")})`);
    }
  }
  updateGameDetailsControls();
  return applied;
}

function renderOcrLines(lines) {
  elements.ocrLineList.replaceChildren();
  for (const line of lines) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "ocr-line";
    button.textContent = line;
    button.dataset.ocrLine = line;
    elements.ocrLineList.append(button);
  }
  elements.ocrLines.classList.toggle("hidden", !lines.length);
}

function resetOcrPanel() {
  elements.ocrFileName.textContent = "Keine Datei ausgewählt";
  elements.ocrRun.disabled = true;
  elements.ocrProgress.classList.add("hidden");
  elements.ocrProgress.value = 0;
  showMessage(elements.ocrMessage, "", false);
  renderOcrLines([]);
}

async function runOcr() {
  const file = elements.ocrImage.files[0];
  if (!file || ocrBusy) return;
  ocrBusy = true;
  elements.ocrRun.disabled = true;
  elements.ocrProgress.value = 0;
  elements.ocrProgress.classList.remove("hidden");
  renderOcrLines([]);
  showMessage(elements.ocrMessage, "Bild wird vorbereitet …", false);
  try {
    const canvas = await prepareOcrImage(file);
    const worker = await getOcrWorker();
    const { data } = await worker.recognize(canvas, {}, { text: true, blocks: true });
    const text = data.text || "";
    const result = parseOcrText(text, collectOcrLines(data));
    const applied = applyOcrResult(result);
    renderOcrLines(result.lines);
    showMessage(elements.ocrMessage, applied.length
      ? `Übernommen: ${applied.join(", ")}. Bitte alle Angaben kurz prüfen.`
      : text.trim()
        ? "Es wurden keine leeren Felder gefüllt. Tippe unten auf eine erkannte Zeile, um sie als Name zu übernehmen."
        : "Kein Text erkannt. Fotografiere näher, gerade und bei guter Beleuchtung.", !applied.length && !text.trim());
  } catch (error) {
    console.error("Text recognition failed.", error);
    releaseOcrWorker();
    showMessage(elements.ocrMessage, error.message || "Die Texterkennung ist fehlgeschlagen.");
  } finally {
    ocrBusy = false;
    elements.ocrRun.disabled = !elements.ocrImage.files.length;
    elements.ocrProgress.classList.add("hidden");
    clearTimeout(ocrIdleTimer);
    ocrIdleTimer = setTimeout(releaseOcrWorker, 60_000);
  }
}

elements.ocrImage.addEventListener("change", () => {
  elements.ocrFileName.textContent = elements.ocrImage.files.length ? elements.ocrImage.files[0].name : "Keine Datei ausgewählt";
  elements.ocrRun.disabled = !elements.ocrImage.files.length;
  if (elements.ocrImage.files.length) void runOcr();
});
elements.ocrRun.addEventListener("click", () => void runOcr());
elements.ocrLineList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-ocr-line]");
  if (!button) return;
  elements.itemName.value = button.dataset.ocrLine;
  elements.itemName.focus();
});
window.addEventListener("pagehide", releaseOcrWorker);

function resetItemForm() {
  editingId = null;
  elements.itemForm.reset();
  resetOcrPanel();
  updateAccessoryControls();
  itemPhotos = [];
  renderPhotoPreview();
  showMessage(elements.photoMessage, "", false);
  gameDetailsExpanded = false;
  updateGameDetailsControls();
  selectedCandidate = null;
  elements.selectedPreview.replaceChildren();
  elements.selectedPreview.classList.add("hidden");
  elements.itemFormHeading.textContent = "Etwas hinzufügen";
  elements.saveItem.textContent = "Eintrag speichern";
  elements.cancelEdit.classList.add("hidden");
}

elements.itemPhotos.addEventListener("change", () => void addSelectedPhotos());
elements.itemPhotoPreview.addEventListener("click", (event) => {
  const button = event.target.closest("[data-remove-photo]");
  if (!button) return;
  itemPhotos.splice(Number(button.dataset.removePhoto), 1);
  renderPhotoPreview();
  showMessage(elements.photoMessage, itemPhotos.length
    ? `${itemPhotos.length} von ${MAX_ITEM_PHOTOS} Fotos ausgewählt.`
    : "Alle Fotos entfernt.", false);
});

const CODE128_PATTERNS = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213",
  "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132",
  "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211",
  "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313",
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331",
  "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111",
  "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214",
  "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111",
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141",
  "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141",
  "114131", "311141", "411131", "211412", "211214", "211232", "2331112"
];
const EAN_L = ["0001101", "0011001", "0010011", "0111101", "0100011", "0110001", "0101111", "0111011", "0110111", "0001011"];
const EAN_G = ["0100111", "0110011", "0011011", "0100001", "0011101", "0111001", "0000101", "0010001", "0001001", "0010111"];
const EAN_R = EAN_L.map((code) => [...code].map((bit) => (bit === "1" ? "0" : "1")).join(""));
const EAN_PARITY = ["LLLLLL", "LLGLGG", "LLGGLG", "LLGGGL", "LGLLGG", "LGGLLG", "LGGGLL", "LGLGLG", "LGLGGL", "LGGLGL"];
let generatedBarcode = null;

function encodeCode128(text) {
  if (!text) throw new Error("Bitte einen Inhalt eingeben.");
  const useSetC = /^\d{4,}$/.test(text) && text.length % 2 === 0;
  let values;
  if (useSetC) {
    values = [105, ...text.match(/\d{2}/g).map(Number)];
  } else {
    values = [104];
    for (const character of text) {
      const code = character.charCodeAt(0);
      if (code < 32 || code > 126) throw new Error("Code 128 unterstützt hier nur Buchstaben ohne Umlaute, Ziffern und gängige Satzzeichen.");
      values.push(code - 32);
    }
  }
  const checksum = values.reduce((sum, value, index) => sum + value * (index || 1), 0) % 103;
  values.push(checksum, 106);
  const widths = values.flatMap((value) => [...CODE128_PATTERNS[value]].map(Number));
  return { widths, text };
}

function encodeEan13(input) {
  if (!/^\d{12,13}$/.test(input)) throw new Error("EAN-13 benötigt 12 oder 13 Ziffern.");
  const digits = [...input.slice(0, 12)].map(Number);
  const check = (10 - digits.reduce((sum, digit, index) => sum + digit * (index % 2 ? 3 : 1), 0) % 10) % 10;
  if (input.length === 13 && Number(input[12]) !== check) {
    throw new Error(`Die Prüfziffer stimmt nicht. Richtig wäre ${check}; gib 12 Ziffern ein, um sie automatisch zu ergänzen.`);
  }
  const full = `${input.slice(0, 12)}${check}`;
  const parity = EAN_PARITY[Number(full[0])];
  let bits = "101";
  for (let index = 1; index <= 6; index += 1) {
    bits += (parity[index - 1] === "L" ? EAN_L : EAN_G)[Number(full[index])];
  }
  bits += "01010";
  for (let index = 7; index <= 12; index += 1) bits += EAN_R[Number(full[index])];
  bits += "101";
  const widths = [];
  let run = 1;
  for (let index = 1; index < bits.length; index += 1) {
    if (bits[index] === bits[index - 1]) run += 1;
    else {
      widths.push(run);
      run = 1;
    }
  }
  widths.push(run);
  return { widths, text: full };
}

const QR_ECC_PER_BLOCK = [0, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26];
const QR_BLOCKS = [0, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16];
const QR_MAX_VERSION = 20;

function qrRawModules(version) {
  let result = (16 * version + 128) * version + 64;
  if (version >= 2) {
    const align = Math.floor(version / 7) + 2;
    result -= (25 * align - 10) * align - 55;
    if (version >= 7) result -= 36;
  }
  return result;
}

function gfMultiply(x, y) {
  let z = 0;
  for (let i = 7; i >= 0; i -= 1) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z;
}

function reedSolomon(data, degree) {
  const divisor = new Array(degree).fill(0);
  divisor[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i += 1) {
    for (let j = 0; j < degree; j += 1) {
      divisor[j] = gfMultiply(divisor[j], root);
      if (j + 1 < degree) divisor[j] ^= divisor[j + 1];
    }
    root = gfMultiply(root, 2);
  }
  const result = new Array(degree).fill(0);
  for (const byte of data) {
    const factor = byte ^ result.shift();
    result.push(0);
    divisor.forEach((coefficient, index) => {
      result[index] ^= gfMultiply(coefficient, factor);
    });
  }
  return result;
}

function encodeQr(text) {
  const bytes = [...new TextEncoder().encode(text)];
  if (!bytes.length) throw new Error("Bitte einen Inhalt eingeben.");
  let version = 1;
  const capacity = (v) => Math.floor(qrRawModules(v) / 8) - QR_ECC_PER_BLOCK[v] * QR_BLOCKS[v];
  while (version <= QR_MAX_VERSION && (4 + (version < 10 ? 8 : 16) + bytes.length * 8 > capacity(version) * 8)) version += 1;
  if (version > QR_MAX_VERSION) throw new Error("Der Text ist für einen QR-Code zu lang.");

  const bits = [];
  const pushBits = (value, length) => {
    for (let i = length - 1; i >= 0; i -= 1) bits.push((value >>> i) & 1);
  };
  pushBits(4, 4);
  pushBits(bytes.length, version < 10 ? 8 : 16);
  bytes.forEach((byte) => pushBits(byte, 8));
  const dataBits = capacity(version) * 8;
  pushBits(0, Math.min(4, dataBits - bits.length));
  pushBits(0, (8 - (bits.length % 8)) % 8);
  const data = [];
  for (let i = 0; i < bits.length; i += 8) data.push(parseInt(bits.slice(i, i + 8).join(""), 2));
  for (let pad = 0xec; data.length < capacity(version); pad ^= 0xec ^ 0x11) data.push(pad);

  const numBlocks = QR_BLOCKS[version];
  const eccLength = QR_ECC_PER_BLOCK[version];
  const rawCodewords = Math.floor(qrRawModules(version) / 8);
  const shortBlocks = numBlocks - (rawCodewords % numBlocks);
  const shortLength = Math.floor(rawCodewords / numBlocks);
  const blocks = [];
  for (let i = 0, k = 0; i < numBlocks; i += 1) {
    const length = shortLength - eccLength + (i < shortBlocks ? 0 : 1);
    const block = data.slice(k, k + length);
    k += length;
    const ecc = reedSolomon(block, eccLength);
    if (i < shortBlocks) block.push(0);
    blocks.push(block.concat(ecc));
  }
  const codewords = [];
  for (let i = 0; i < blocks[0].length; i += 1) {
    blocks.forEach((block, j) => {
      if (i !== shortLength - eccLength || j >= shortBlocks) codewords.push(block[i]);
    });
  }

  const size = version * 4 + 17;
  const modules = Array.from({ length: size }, () => new Array(size).fill(false));
  const isFunction = Array.from({ length: size }, () => new Array(size).fill(false));
  const setFunction = (x, y, dark) => {
    modules[y][x] = dark;
    isFunction[y][x] = true;
  };
  for (let i = 0; i < size; i += 1) {
    setFunction(6, i, i % 2 === 0);
    setFunction(i, 6, i % 2 === 0);
  }
  const drawFinder = (cx, cy) => {
    for (let dy = -4; dy <= 4; dy += 1) {
      for (let dx = -4; dx <= 4; dx += 1) {
        const distance = Math.max(Math.abs(dx), Math.abs(dy));
        const x = cx + dx;
        const y = cy + dy;
        if (x >= 0 && x < size && y >= 0 && y < size) setFunction(x, y, distance !== 2 && distance !== 4);
      }
    }
  };
  drawFinder(3, 3);
  drawFinder(size - 4, 3);
  drawFinder(3, size - 4);
  if (version > 1) {
    const count = Math.floor(version / 7) + 2;
    const step = Math.ceil((version * 4 + 4) / (count * 2 - 2)) * 2;
    const positions = [6];
    for (let position = size - 7; positions.length < count; position -= step) positions.splice(1, 0, position);
    positions.forEach((py, i) => positions.forEach((px, j) => {
      if ((i === 0 && j === 0) || (i === 0 && j === count - 1) || (i === count - 1 && j === 0)) return;
      for (let dy = -2; dy <= 2; dy += 1) {
        for (let dx = -2; dx <= 2; dx += 1) setFunction(px + dx, py + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
      }
    }));
  }
  const drawFormat = (mask) => {
    const formatData = (0 << 3) | mask;
    let rem = formatData;
    for (let i = 0; i < 10; i += 1) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    const formatBits = ((formatData << 10) | rem) ^ 0x5412;
    const bit = (i) => ((formatBits >>> i) & 1) !== 0;
    for (let i = 0; i <= 5; i += 1) setFunction(8, i, bit(i));
    setFunction(8, 7, bit(6));
    setFunction(8, 8, bit(7));
    setFunction(7, 8, bit(8));
    for (let i = 9; i < 15; i += 1) setFunction(14 - i, 8, bit(i));
    for (let i = 0; i < 8; i += 1) setFunction(size - 1 - i, 8, bit(i));
    for (let i = 8; i < 15; i += 1) setFunction(8, size - 15 + i, bit(i));
    setFunction(8, size - 8, true);
  };
  drawFormat(0);
  if (version >= 7) {
    let rem = version;
    for (let i = 0; i < 12; i += 1) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
    const versionBits = (version << 12) | rem;
    for (let i = 0; i < 18; i += 1) {
      const dark = ((versionBits >>> i) & 1) !== 0;
      const a = size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      setFunction(a, b, dark);
      setFunction(b, a, dark);
    }
  }
  let index = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert += 1) {
      for (let j = 0; j < 2; j += 1) {
        const x = right - j;
        const y = ((right + 1) & 2) === 0 ? size - 1 - vert : vert;
        if (!isFunction[y][x] && index < codewords.length * 8) {
          modules[y][x] = ((codewords[index >>> 3] >>> (7 - (index & 7))) & 1) !== 0;
          index += 1;
        }
      }
    }
  }
  const conditions = [
    (x, y) => (x + y) % 2 === 0,
    (x, y) => y % 2 === 0,
    (x) => x % 3 === 0,
    (x, y) => (x + y) % 3 === 0,
    (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
    (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
    (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
    (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0
  ];
  const applyMask = (mask) => {
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        if (!isFunction[y][x] && conditions[mask](x, y)) modules[y][x] = !modules[y][x];
      }
    }
  };
  const penalty = () => {
    let score = 0;
    for (let a = 0; a < size; a += 1) {
      for (const horizontal of [true, false]) {
        let run = 1;
        for (let b = 1; b < size; b += 1) {
          const current = horizontal ? modules[a][b] : modules[b][a];
          const previous = horizontal ? modules[a][b - 1] : modules[b - 1][a];
          if (current === previous) {
            run += 1;
            if (run === 5) score += 3;
            else if (run > 5) score += 1;
          } else run = 1;
        }
      }
    }
    for (let y = 0; y < size - 1; y += 1) {
      for (let x = 0; x < size - 1; x += 1) {
        const c = modules[y][x];
        if (c === modules[y][x + 1] && c === modules[y + 1][x] && c === modules[y + 1][x + 1]) score += 3;
      }
    }
    const dark = modules.flat().filter(Boolean).length;
    return score + Math.floor(Math.abs(dark * 20 - size * size * 10) / (size * size)) * 10;
  };
  let bestMask = 0;
  let bestScore = Infinity;
  for (let mask = 0; mask < 8; mask += 1) {
    applyMask(mask);
    drawFormat(mask);
    const score = penalty();
    if (score < bestScore) {
      bestScore = score;
      bestMask = mask;
    }
    applyMask(mask);
  }
  applyMask(bestMask);
  drawFormat(bestMask);
  return { qr: modules, size, text };
}

function buildBarcodeSvg(encoded, caption) {
  if (encoded.qr) return buildQrSvg(encoded, caption);
  const moduleWidth = 3;
  const quiet = 10;
  const barHeight = 110;
  const totalModules = encoded.widths.reduce((sum, width) => sum + width, 0) + quiet * 2;
  const captionText = caption || "";
  const width = totalModules * moduleWidth;
  const textBlock = captionText ? 56 : 30;
  const height = barHeight + textBlock + 16;
  const namespace = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(namespace, "svg");
  svg.setAttribute("xmlns", namespace);
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(height));
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", `Barcode ${encoded.text}`);
  const background = document.createElementNS(namespace, "rect");
  background.setAttribute("width", "100%");
  background.setAttribute("height", "100%");
  background.setAttribute("fill", "#fff");
  svg.append(background);
  let x = quiet * moduleWidth;
  encoded.widths.forEach((run, index) => {
    if (index % 2 === 0) {
      const bar = document.createElementNS(namespace, "rect");
      bar.setAttribute("x", String(x));
      bar.setAttribute("y", "8");
      bar.setAttribute("width", String(run * moduleWidth));
      bar.setAttribute("height", String(barHeight));
      bar.setAttribute("fill", "#000");
      svg.append(bar);
    }
    x += run * moduleWidth;
  });
  const addText = (value, y, size) => {
    const label = document.createElementNS(namespace, "text");
    label.setAttribute("x", String(width / 2));
    label.setAttribute("y", String(y));
    label.setAttribute("text-anchor", "middle");
    label.setAttribute("font-family", "Arial, Helvetica, sans-serif");
    label.setAttribute("font-size", String(size));
    label.setAttribute("fill", "#000");
    label.textContent = value;
    svg.append(label);
  };
  addText(encoded.text, barHeight + 30, 20);
  if (captionText) addText(captionText, barHeight + 54, 16);
  return svg;
}

function buildQrSvg(encoded, caption) {
  const scale = 10;
  const quiet = 4;
  const side = (encoded.size + quiet * 2) * scale;
  const height = side + (caption ? 44 : 0);
  const namespace = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(namespace, "svg");
  svg.setAttribute("xmlns", namespace);
  svg.setAttribute("viewBox", `0 0 ${side} ${height}`);
  svg.setAttribute("width", String(side));
  svg.setAttribute("height", String(height));
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "QR-Code");
  const background = document.createElementNS(namespace, "rect");
  background.setAttribute("width", "100%");
  background.setAttribute("height", "100%");
  background.setAttribute("fill", "#fff");
  svg.append(background);
  const path = document.createElementNS(namespace, "path");
  let d = "";
  encoded.qr.forEach((row, y) => row.forEach((dark, x) => {
    if (dark) d += `M${(x + quiet) * scale},${(y + quiet) * scale}h${scale}v${scale}h-${scale}z`;
  }));
  path.setAttribute("d", d);
  path.setAttribute("fill", "#000");
  svg.append(path);
  if (caption) {
    const label = document.createElementNS(namespace, "text");
    label.setAttribute("x", String(side / 2));
    label.setAttribute("y", String(side + 22));
    label.setAttribute("text-anchor", "middle");
    label.setAttribute("font-family", "Arial, Helvetica, sans-serif");
    label.setAttribute("font-size", "20");
    label.setAttribute("fill", "#000");
    label.textContent = caption;
    svg.append(label);
  }
  return svg;
}

function setBarcodeActions(enabled) {
  elements.barcodeGenShare.hidden = !(navigator.canShare && navigator.share);
  for (const button of [elements.barcodeGenSvg, elements.barcodeGenPng, elements.barcodeGenPrint, elements.barcodeGenShare]) button.disabled = !enabled;
}

function generateBarcode() {
  const value = elements.barcodeGenValue.value.trim();
  const format = elements.barcodeGenFormat.value;
  try {
    const encoded = format === "ean13" ? encodeEan13(value) : format === "qr" ? encodeQr(value) : encodeCode128(value);
    const svg = buildBarcodeSvg(encoded, elements.barcodeGenCaption.value.trim());
    elements.barcodeGenOutput.replaceChildren(svg);
    generatedBarcode = { svg, text: encoded.text };
    setBarcodeActions(true);
    showMessage(elements.barcodeGenMessage, format === "ean13" && value.length === 12
      ? `Barcode erzeugt. Prüfziffer ergänzt: ${encoded.text}`
      : "Barcode erzeugt.", false);
  } catch (error) {
    generatedBarcode = null;
    elements.barcodeGenOutput.replaceChildren();
    setBarcodeActions(false);
    showMessage(elements.barcodeGenMessage, error.message);
  }
}

function barcodeFileName(extension) {
  const safe = generatedBarcode.text.replace(/[^A-Za-z0-9_-]+/g, "_").slice(0, 40) || "barcode";
  return `barcode-${safe}.${extension}`;
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function serializeBarcodeSvg() {
  return new XMLSerializer().serializeToString(generatedBarcode.svg);
}

elements.barcodeGenForm.addEventListener("submit", (event) => {
  event.preventDefault();
  generateBarcode();
});
elements.barcodeGenFormat.addEventListener("change", () => {
  const ean = elements.barcodeGenFormat.value === "ean13";
  elements.barcodeGenValue.inputMode = ean ? "numeric" : "text";
  const qr = elements.barcodeGenFormat.value === "qr";
  elements.barcodeGenValue.maxLength = ean ? 13 : qr ? 300 : 48;
  elements.barcodeGenValue.placeholder = ean ? "12 oder 13 Ziffern" : qr ? "Text oder Link, z. B. https://…" : "z. B. KISTE-A-01";
});
elements.barcodeWebQuery.addEventListener("input", () => {
  const query = elements.barcodeWebQuery.value.trim();
  const url = new URL("https://www.google.com/search");
  if (query) url.searchParams.set("q", query);
  elements.barcodeWebLink.href = query ? url.href : "https://www.google.com/";
});

elements.barcodeGenRandom.addEventListener("click", () => {
  const random = crypto.getRandomValues(new Uint32Array(2));
  if (elements.barcodeGenFormat.value === "ean13") {
    // Präfix 20 ist für interne Nutzung reserviert und kollidiert nicht mit Handelsartikeln.
    elements.barcodeGenValue.value = `20${String(random[0] % 100000).padStart(5, "0")}${String(random[1] % 100000).padStart(5, "0")}`;
  } else {
    elements.barcodeGenValue.value = `KAT-${random[0].toString(36).toUpperCase().slice(0, 6)}`;
  }
  generateBarcode();
});
elements.barcodeGenSvg.addEventListener("click", () => {
  if (!generatedBarcode) return;
  downloadBlob(new Blob([serializeBarcodeSvg()], { type: "image/svg+xml" }), barcodeFileName("svg"));
});
async function barcodePngBlob() {
  const svgUrl = URL.createObjectURL(new Blob([serializeBarcodeSvg()], { type: "image/svg+xml" }));
  const image = new Image();
  await new Promise((resolve, reject) => {
    image.addEventListener("load", resolve, { once: true });
    image.addEventListener("error", () => reject(new Error("Das Bild konnte nicht erstellt werden.")), { once: true });
    image.src = svgUrl;
  });
  URL.revokeObjectURL(svgUrl);
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  canvas.getContext("2d").drawImage(image, 0, 0);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("Das Bild konnte nicht erstellt werden.");
  return blob;
}

elements.barcodeGenShare.addEventListener("click", async () => {
  if (!generatedBarcode) return;
  try {
    const file = new File([await barcodePngBlob()], barcodeFileName("png"), { type: "image/png" });
    if (!navigator.canShare({ files: [file] })) throw new Error("Teilen wird von diesem Gerät nicht unterstützt. Nutze „PNG speichern“.");
    await navigator.share({ files: [file], title: "Barcode" });
  } catch (error) {
    if (error.name !== "AbortError") showMessage(elements.barcodeGenMessage, error.message);
  }
});
elements.barcodeGenPng.addEventListener("click", async () => {
  if (!generatedBarcode) return;
  try {
    downloadBlob(await barcodePngBlob(), barcodeFileName("png"));
  } catch (error) {
    console.error("Could not export barcode PNG.", error);
    showMessage(elements.barcodeGenMessage, error.message);
  }
});
elements.barcodeGenPrint.addEventListener("click", () => {
  if (!generatedBarcode) return;
  const frame = document.createElement("iframe");
  frame.style.cssText = "position:fixed;width:0;height:0;border:0;";
  document.body.append(frame);
  const doc = frame.contentDocument;
  doc.open();
  doc.write(`<!doctype html><title>Barcode</title><style>body{margin:0;text-align:center}svg{max-width:100%;height:auto}</style>${serializeBarcodeSvg()}`);
  doc.close();
  frame.contentWindow.addEventListener("afterprint", () => frame.remove(), { once: true });
  frame.contentWindow.focus();
  frame.contentWindow.print();
});

elements.cancelEdit.addEventListener("click", resetItemForm);
elements.itemCategory.addEventListener("change", () => {
  updateAccessoryControls();
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
  renderPhotoPreview();
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
