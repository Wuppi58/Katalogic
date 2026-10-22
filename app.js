"use strict";

const THEME_STORAGE_KEY = "katalogic-theme";
const SYNC_INTERVAL = 60_000;
const ACCESSORY_TYPES = {
  original: "Original-Zubehör",
  thirdParty: "Zubehör von Drittanbietern"
};
const DEFAULT_CATEGORIES = [
  "Kleinteile",
  "Sonstiges"
];
let legacyVaultKey = "";
let needsStateMigration = false;
const state = loadState();
let persistedState = {
  ...structuredClone(state),
  ...(legacyVaultKey ? { legacyMigrationKey: legacyVaultKey } : {})
};
let syncInProgress = false;
let scannerStream = null;
let activeView = "home";
let editingRecordId = null;
let toastTimeout;

const elements = {
  themeToggle: document.querySelector("#theme-toggle"),
  connectionDot: document.querySelector("#connection-dot"),
  connectionLabel: document.querySelector("#connection-label"),
  homeLink: document.querySelector("#home-link"),
  taskbar: document.querySelector("#app-taskbar"),
  managementNavigation: document.querySelector("#management-navigation"),
  managementToggle: document.querySelector("#management-toggle"),
  managementMenu: document.querySelector("#management-menu"),
  welcomeIntro: document.querySelector("#welcome-intro"),
  welcomeOpenActions: document.querySelector("#welcome-open-actions"),
  collectionView: document.querySelector("#collection-view"),
  catalogEditDialog: document.querySelector("#catalog-edit-dialog"),
  catalogEditForm: document.querySelector("#catalog-edit-form"),
  catalogEditName: document.querySelector("#catalog-edit-name"),
  catalogEditCategory: document.querySelector("#catalog-edit-category"),
  catalogEditLocation: document.querySelector("#catalog-edit-location"),
  catalogEditBarcode: document.querySelector("#catalog-edit-barcode"),
  catalogEditNotes: document.querySelector("#catalog-edit-notes"),
  catalogEditMessage: document.querySelector("#catalog-edit-message"),
  searchView: document.querySelector("#search-view"),
  devicesView: document.querySelector("#devices-view"),
  booksView: document.querySelector("#books-view"),
  filmsView: document.querySelector("#films-view"),
  gamesView: document.querySelector("#games-view"),
  filamentsView: document.querySelector("#filaments-view"),
  smallPartsView: document.querySelector("#small-parts-view"),
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
  libraryStartScanner: document.querySelector("#library-start-scanner"),
  libraryStopScanner: document.querySelector("#library-stop-scanner"),
  libraryScannerPanel: document.querySelector("#library-scanner-panel"),
  libraryScannerVideo: document.querySelector("#library-scanner-video"),
  libraryScannerMessage: document.querySelector("#library-scanner-message"),
  itemList: document.querySelector("#item-list"),
  itemCount: document.querySelector("#item-count"),
  categoryFilter: document.querySelector("#category-filter"),
  collectionPrompt: document.querySelector("#collection-prompt"),
  emptyState: document.querySelector("#empty-state"),
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
  exportPdf: document.querySelector("#export-pdf"),
  exportCharts: document.querySelector("#export-charts"),
  importDataButton: document.querySelector("#import-data-button"),
  importDataFile: document.querySelector("#import-data-file"),
  backupMessage: document.querySelector("#backup-message"),
  toast: document.querySelector("#toast")
};

const MANAGEMENT_ICONS = {
  devices: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
  games: '<path d="M7 7h10a4 4 0 0 1 3.9 4.9l-.9 4.3a2.5 2.5 0 0 1-4.3 1.2L14 15.5h-4l-1.7 1.9A2.5 2.5 0 0 1 4 16.2l-.9-4.3A4 4 0 0 1 7 7z"/><path d="M8 10v3M6.5 11.5h3"/><circle cx="15.5" cy="10.5" r=".6"/><circle cx="17.5" cy="12.5" r=".6"/>',
  books: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/><path d="M9 7h7"/>',
  films: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4M17 9h4M3 15h4M17 15h4"/>',
  filaments: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/><path d="M12 3a9 9 0 0 1 9 9"/><path d="M5.6 18.4 9.9 14"/>',
  "small-parts": '<path d="M12 2.5 20 7v10l-8 4.5L4 17V7z"/><circle cx="12" cy="12" r="3"/>'
};

function managementIcon(view, fallback) {
  const icon = document.createElement("span");
  icon.setAttribute("aria-hidden", "true");
  if (!MANAGEMENT_ICONS[view]) {
    icon.textContent = fallback || "▤";
    return icon;
  }
  icon.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${MANAGEMENT_ICONS[view]}</svg>`;
  return icon;
}

function populateManagementMenu() {
  const managementViews = [...document.querySelectorAll(".app-view[data-management-view]")];
  elements.managementMenu.replaceChildren(...managementViews.map((section) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "management-menu-link";
    button.dataset.view = section.dataset.managementView;
    const icon = managementIcon(section.dataset.managementView, section.dataset.managementIcon);
    button.append(icon, document.createTextNode(section.dataset.managementLabel || section.dataset.managementView));
    return button;
  }));
}

populateManagementMenu();

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
    const saved = window.KatalogicLocalStorage.load() || {};
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
      records: Array.isArray(saved.records) ? saved.records.filter(isValidRecord) : [],
      deviceInventory: isValidDeviceInventory(saved.deviceInventory) ? saved.deviceInventory : null,
      gameInventory: isValidGameInventory(saved.gameInventory) ? saved.gameInventory : null,
      bookInventory: isValidBookInventory(saved.bookInventory) ? saved.bookInventory : null,
      filmInventory: isValidFilmInventory(saved.filmInventory) ? saved.filmInventory : null,
      filamentInventory: isValidFilamentInventory(saved.filamentInventory) ? saved.filamentInventory : null,
      smallPartsInventory: isValidSmallPartsInventory(saved.smallPartsInventory) ? saved.smallPartsInventory : null
    };
  } catch (error) {
    console.error("Could not load local Katalogic data.", error);
    return { syncId: crypto.randomUUID(), supabaseUrl: "", supabaseKey: "", records: [], gameInventory: null, bookInventory: null, filmInventory: null, filamentInventory: null, smallPartsInventory: null };
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
    (record.deviceDetails === undefined || typeof record.deviceDetails === "string") &&
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

function isValidDeviceInventory(inventory) {
  const isString = (value) => typeof value === "string";
  const validRow = (entry) => entry && typeof entry === "object" && isString(entry.id);
  return inventory === undefined || inventory === null || (
    inventory && typeof inventory === "object" && !Array.isArray(inventory) &&
    ["devices", "cables", "controllers", "accessories", "photos", "checks", "requiredFields"].every((key) => Array.isArray(inventory[key])) &&
    inventory.customCatalog && typeof inventory.customCatalog === "object" && !Array.isArray(inventory.customCatalog) &&
    inventory.devices.every((device) => validRow(device) && isString(device.name) &&
      (device.technical === undefined || (device.technical && typeof device.technical === "object" &&
        !Array.isArray(device.technical) && Object.values(device.technical).every(isString))) &&
      (device.customTechnical === undefined || (Array.isArray(device.customTechnical) &&
        device.customTechnical.every((entry) => entry && isString(entry.key) && isString(entry.value)))) &&
      (device.quantity === undefined || (Number.isInteger(device.quantity) && device.quantity > 0))) &&
    inventory.cables.every((entry) => validRow(entry) && isString(entry.deviceId)) &&
    inventory.controllers.every((entry) => validRow(entry) && isString(entry.deviceId)) &&
    inventory.accessories.every((entry) => validRow(entry) && Array.isArray(entry.deviceIds) && entry.deviceIds.every(isString)) &&
    inventory.photos.every((entry) => validRow(entry) && isString(entry.deviceId) && isString(entry.kind) &&
      typeof entry.dataUrl === "string" && /^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(entry.dataUrl)) &&
    inventory.checks.every((entry) => validRow(entry) && isString(entry.deviceId))
  );
}

function isValidGameInventory(inventory) {
  const isString = (value) => typeof value === "string";
  const validRow = (entry) => entry && typeof entry === "object" && !Array.isArray(entry) && isString(entry.id);
  const validGame = (game) => validRow(game) && isString(game.name) &&
    (game.quantity === undefined || (Number.isInteger(game.quantity) && game.quantity > 0)) &&
    ["subtitle", "category", "type", "platform", "developer", "publisher", "genre", "language", "region",
      "releaseYear", "releaseDate", "barcode", "sku", "description", "condition", "functionality", "completeness",
      "purchaseDate", "source", "location", "mediaCondition", "packaging", "manual", "updatedAt"]
      .every((key) => game[key] === undefined || isString(game[key])) &&
    ["purchasePrice", "estimatedValue"].every((key) => game[key] === undefined || game[key] === null ||
      (typeof game[key] === "number" && Number.isFinite(game[key]) && game[key] >= 0)) &&
    (game.photos === undefined || (Array.isArray(game.photos) && game.photos.length <= 8 &&
      game.photos.every((photo) => typeof photo === "string" && photo.length <= 700_000 &&
        /^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(photo)))) &&
    (game.specifics === undefined || (game.specifics && typeof game.specifics === "object" &&
      !Array.isArray(game.specifics) && Object.values(game.specifics).every(isString))) &&
    (game.customFields === undefined || (Array.isArray(game.customFields) &&
      game.customFields.every((entry) => entry && isString(entry.key) && isString(entry.value))));
  return inventory === undefined || inventory === null || (
    inventory && typeof inventory === "object" && !Array.isArray(inventory) &&
    Array.isArray(inventory.games) && Array.isArray(inventory.accessories) &&
    inventory.customOptions && typeof inventory.customOptions === "object" && !Array.isArray(inventory.customOptions) &&
    Object.values(inventory.customOptions).every((values) => Array.isArray(values) && values.every(isString)) &&
    (inventory.view === undefined || inventory.view === "grid" || inventory.view === "list") &&
    inventory.games.every(validGame) &&
    new Set(inventory.games.map((game) => game.id)).size === inventory.games.length &&
    inventory.accessories.every((entry) => validRow(entry) && isString(entry.name) &&
      Array.isArray(entry.gameIds) && entry.gameIds.every((gameId) => isString(gameId) &&
        inventory.games.some((game) => game.id === gameId)) &&
      (entry.quantity === undefined || (Number.isInteger(entry.quantity) && entry.quantity > 0))) &&
    new Set(inventory.accessories.map((entry) => entry.id)).size === inventory.accessories.length
  );
}

function isValidBookInventory(inventory) {
  const isString = (value) => typeof value === "string";
  const validRow = (entry) => entry && typeof entry === "object" && !Array.isArray(entry) && isString(entry.id);
  const validBook = (book) => validRow(book) && isString(book.title) &&
    ["subtitle", "editor", "publisher", "year", "publishDate", "edition", "seriesId", "volume",
      "category", "subcategory", "genre", "format", "binding", "isbn10", "isbn13", "ean", "language",
      "originalLanguage", "translator", "illustrator", "blurb", "notes", "condition", "readingStatus",
      "location", "purchaseDate", "source", "review", "updatedAt"]
      .every((key) => book[key] === undefined || isString(book[key])) &&
    (book.authors === undefined || (Array.isArray(book.authors) && book.authors.every(isString))) &&
    (book.quantity === undefined || (Number.isInteger(book.quantity) && book.quantity > 0)) &&
    (book.pages === undefined || book.pages === null || (Number.isInteger(book.pages) && book.pages > 0)) &&
    (book.rating === undefined || book.rating === null || (Number.isInteger(book.rating) && book.rating >= 1 && book.rating <= 5)) &&
    ["purchasePrice", "estimatedValue"].every((key) => book[key] === undefined || book[key] === null ||
      (typeof book[key] === "number" && Number.isFinite(book[key]) && book[key] >= 0)) &&
    (book.details === undefined || (book.details && typeof book.details === "object" &&
      !Array.isArray(book.details) && Object.values(book.details).every(isString))) &&
    (book.loan === undefined || (book.loan && typeof book.loan === "object" && !Array.isArray(book.loan) &&
      ["borrower", "loanDate", "dueDate", "returnDate"].every((key) => book.loan[key] === undefined || isString(book.loan[key])))) &&
    (book.relatedBookIds === undefined || (Array.isArray(book.relatedBookIds) && book.relatedBookIds.every(isString))) &&
    (book.photos === undefined || (Array.isArray(book.photos) && book.photos.length <= 8 &&
      book.photos.every((photo) => typeof photo === "string" && photo.length <= 700_000 &&
        /^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(photo))));
  return inventory === undefined || inventory === null || (
    inventory && typeof inventory === "object" && !Array.isArray(inventory) &&
    Array.isArray(inventory.books) && Array.isArray(inventory.series) &&
    inventory.series.every((series) => validRow(series) && isString(series.name)) &&
    inventory.customOptions && typeof inventory.customOptions === "object" && !Array.isArray(inventory.customOptions) &&
    Object.values(inventory.customOptions).every((values) => Array.isArray(values) && values.every(isString)) &&
    (inventory.view === undefined || inventory.view === "grid" || inventory.view === "list") &&
    inventory.books.every(validBook) &&
    new Set(inventory.books.map((book) => book.id)).size === inventory.books.length &&
    new Set(inventory.series.map((series) => series.id)).size === inventory.series.length &&
    inventory.books.every((book) => !book.seriesId || inventory.series.some((series) => series.id === book.seriesId)) &&
    inventory.books.every((book) => (book.relatedBookIds || []).every((id) => id !== book.id && inventory.books.some((related) => related.id === id)))
  );
}

function isValidFilmInventory(inventory) {
  const isString = (value) => typeof value === "string";
  const validRow = (entry) => entry && typeof entry === "object" && !Array.isArray(entry) && isString(entry.id);
  const validEntry = (entry) => validRow(entry) && isString(entry.title) &&
    ["originalTitle", "alternateTitle", "category", "kind", "genre", "year", "releaseDate", "studio",
      "publisher", "country", "language", "originalLanguage", "rating", "franchise", "part", "edition",
      "barcode", "condition", "functionality", "completeness", "seriesName", "seasonCompleteness",
      "seasonMedia", "boxName", "purchaseDate", "source", "location", "description", "updatedAt"]
      .every((key) => entry[key] === undefined || isString(entry[key])) &&
    ["directors", "cast", "writers", "producers", "episodes", "customValues"].every((key) =>
      entry[key] === undefined || (Array.isArray(entry[key]) && entry[key].every(isString))) &&
    ["runtime", "quantity", "seasonNumber", "episodeCount", "episodeRuntime", "ratingScore"]
      .every((key) => entry[key] === undefined || entry[key] === null ||
        (Number.isInteger(entry[key]) && entry[key] >= (key === "ratingScore" ? 1 : 0) && (key !== "ratingScore" || entry[key] <= 5))) &&
    ["purchasePrice", "estimatedValue"].every((key) => entry[key] === undefined || entry[key] === null ||
      (typeof entry[key] === "number" && Number.isFinite(entry[key]) && entry[key] >= 0)) &&
    (entry.details === undefined || (entry.details && typeof entry.details === "object" &&
      !Array.isArray(entry.details) && Object.values(entry.details).every(isString))) &&
    (entry.relatedIds === undefined || (Array.isArray(entry.relatedIds) && entry.relatedIds.every(isString))) &&
    (entry.photos === undefined || (Array.isArray(entry.photos) && entry.photos.length <= 8 &&
      entry.photos.every((photo) => typeof photo === "string" && photo.length <= 700_000 &&
        /^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(photo))));
  return inventory === undefined || inventory === null || (
    inventory && typeof inventory === "object" && !Array.isArray(inventory) &&
    Array.isArray(inventory.entries) && Array.isArray(inventory.franchises) &&
    inventory.franchises.every((franchise) => validRow(franchise) && isString(franchise.name)) &&
    inventory.customOptions && typeof inventory.customOptions === "object" && !Array.isArray(inventory.customOptions) &&
    Object.values(inventory.customOptions).every((values) => Array.isArray(values) && values.every(isString)) &&
    (inventory.view === undefined || inventory.view === "grid" || inventory.view === "list") &&
    inventory.entries.every(validEntry) &&
    new Set(inventory.entries.map((entry) => entry.id)).size === inventory.entries.length &&
    new Set(inventory.franchises.map((franchise) => franchise.id)).size === inventory.franchises.length &&
    inventory.entries.every((entry) => (entry.relatedIds || []).every((id) =>
      id !== entry.id && inventory.entries.some((related) => related.id === id)))
  );
}

function isValidFilamentInventory(inventory) {
  const isString = (value) => typeof value === "string";
  const validRow = (entry) => entry && typeof entry === "object" && !Array.isArray(entry) && isString(entry.id);
  const validOptions = (value) => value && typeof value === "object" && !Array.isArray(value) &&
    Object.values(value).every((options) => Array.isArray(options) && options.every(isString));
  const validProduct = (product) => validRow(product) && isString(product.name) &&
    ["manufacturer", "materialType", "variant", "diameter", "color", "manufacturerColor", "colorHex",
      "sku", "spoolType", "spoolMaterial", "manufacturedDate", "shelfLife", "datasheetUrl"]
      .every((key) => product[key] === undefined || isString(product[key])) &&
    (product.photo === undefined || product.photo === "" ||
      (isString(product.photo) && product.photo.length <= 700_000 &&
        /^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(product.photo))) &&
    ["netWeightG", "emptySpoolWeightG", "fullWeightG", "spoolDiameterMm", "spoolWidthMm"]
      .every((key) => product[key] === undefined || product[key] === null ||
        (typeof product[key] === "number" && Number.isFinite(product[key]) && product[key] >= 0)) &&
    (product.technical === undefined || (product.technical && typeof product.technical === "object" &&
      !Array.isArray(product.technical) && Object.values(product.technical).every(isString))) &&
    (product.customTechnical === undefined || (Array.isArray(product.customTechnical) &&
      product.customTechnical.every((entry) => entry && isString(entry.key) && isString(entry.value) && isString(entry.unit))));
  const validSpool = (spool) => validRow(spool) && isString(spool.productId) &&
    ["lotNumber", "purchaseDate", "dealer", "location", "container", "storageStatus",
      "lastDriedDate", "humidityStatus", "notes", "state", "createdAt", "updatedAt", "printerLink", "profileLink"]
      .every((key) => spool[key] === undefined || isString(spool[key])) &&
    ["originalNetWeightG", "remainingG", "weighedTotalG", "humidityPercent", "recommendedHumidityPercent", "lowStockThresholdG", "quantity",
      "dryingTemperatureC", "dryingDurationHours"].every((key) => spool[key] === undefined || spool[key] === null ||
        (typeof spool[key] === "number" && Number.isFinite(spool[key]) && spool[key] >= 0)) &&
    (spool.consumptions === undefined || (Array.isArray(spool.consumptions) &&
      spool.consumptions.every((entry) => validRow(entry) && isString(entry.date) &&
        typeof entry.grams === "number" && Number.isFinite(entry.grams) && entry.grams > 0 &&
        (entry.project === undefined || isString(entry.project))))) &&
    (spool.spoolPhoto === undefined || spool.spoolPhoto === "" ||
      (isString(spool.spoolPhoto) && spool.spoolPhoto.length <= 700_000 &&
        /^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(spool.spoolPhoto)));
  const validProfile = (profile) => validRow(profile) &&
    ["manufacturer", "materialType", "variant", "name", "printer", "notes"].every((key) => profile[key] === undefined || isString(profile[key])) &&
    profile.settings && typeof profile.settings === "object" && !Array.isArray(profile.settings) &&
    Object.values(profile.settings).every(isString);
  const validAmsUnits = inventory == null || inventory.amsUnits === undefined || (
    Array.isArray(inventory.amsUnits) && Array.isArray(inventory.spools) && inventory.amsUnits.every((unit) =>
      validRow(unit) && ["AMS 2 Pro", "AMS Lite", "AMS", "AMS HT", "Benutzerdefiniert"].includes(unit.model) &&
      isString(unit.name) && isString(unit.printer) && Array.isArray(unit.slots) &&
      (unit.model === "Benutzerdefiniert"
        ? unit.slots.length >= 1 && unit.slots.length <= 16
        : unit.slots.length === (unit.model === "AMS HT" ? 1 : 4)) &&
      unit.slots.every((spoolId) => spoolId === null || (isString(spoolId) &&
        inventory.spools.some((spool) => spool.id === spoolId)))
    ) &&
    new Set(inventory.amsUnits.map((unit) => unit.id)).size === inventory.amsUnits.length &&
    new Set(inventory.amsUnits.flatMap((unit) => unit.slots).filter(Boolean)).size ===
      inventory.amsUnits.flatMap((unit) => unit.slots).filter(Boolean).length
  );
  return inventory === undefined || inventory === null || (
    inventory && typeof inventory === "object" && !Array.isArray(inventory) &&
    Array.isArray(inventory.products) && Array.isArray(inventory.spools) && Array.isArray(inventory.profiles) &&
    validOptions(inventory.customOptions) && (inventory.view === undefined || inventory.view === "grid" || inventory.view === "list") &&
    inventory.products.every(validProduct) && inventory.spools.every(validSpool) && inventory.profiles.every(validProfile) &&
    new Set(inventory.products.map((product) => product.id)).size === inventory.products.length &&
    new Set(inventory.spools.map((spool) => spool.id)).size === inventory.spools.length &&
    new Set(inventory.profiles.map((profile) => profile.id)).size === inventory.profiles.length &&
    validAmsUnits &&
    inventory.spools.every((spool) => inventory.products.some((product) => product.id === spool.productId))
  );
}

function isValidSmallPartsInventory(inventory) {
  const string = (value) => typeof value === "string";
  const row = (value) => value && typeof value === "object" && !Array.isArray(value) && string(value.id);
  const image = (value) => string(value) && value.length <= 400_000 &&
    /^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(value);
  const validLocation = (location) => row(location) && string(location.name) && location.name.trim().length > 0 &&
    string(location.barcode) && location.barcode.trim().length > 0 &&
    ["parentId", "notes"].every((key) => location[key] === undefined || string(location[key]));
  const validMovement = (movement) => row(movement) &&
    ["date", "kind", "note", "project", "user"].every((key) => movement[key] === undefined || string(movement[key])) &&
    Number.isFinite(Date.parse(movement.date)) &&
    ["in", "out", "adjustment"].includes(movement.kind) &&
    Number.isFinite(movement.delta) && movement.delta !== 0 &&
    (movement.kind !== "in" || movement.delta > 0) &&
    (movement.kind !== "out" || movement.delta < 0) &&
    Number.isFinite(movement.quantityAfter) && movement.quantityAfter >= 0;
  const validItem = (item) => row(item) && string(item.name) && item.name.trim().length > 0 &&
    ["category", "manufacturer", "partNumber", "description", "locationId", "notes",
      "createdAt", "updatedAt", "archivedAt"].every((key) => item[key] === undefined || string(item[key])) &&
    string(item.unit) && item.unit.trim().length > 0 &&
    string(item.barcode) && item.barcode.trim().length > 0 &&
    Number.isFinite(item.quantity) && item.quantity >= 0 &&
    (item.reorderLevel === null || item.reorderLevel === undefined ||
      (Number.isFinite(item.reorderLevel) && item.reorderLevel >= 0)) &&
    (item.images === undefined || (Array.isArray(item.images) && item.images.length <= 8 && item.images.every(image))) &&
    Array.isArray(item.movements) && item.movements.every(validMovement) &&
    new Set(item.movements.map((movement) => movement.id)).size === item.movements.length &&
    item.movements.every((movement, index) =>
      Math.abs(movement.quantityAfter - ((index ? item.movements[index - 1].quantityAfter : 0) + movement.delta)) < 1e-9) &&
    (item.movements.length
      ? Math.abs(item.movements.at(-1).quantityAfter - item.quantity) < 1e-9
      : item.quantity === 0);
  return inventory === undefined || inventory === null || (
    inventory && typeof inventory === "object" && !Array.isArray(inventory) &&
    Array.isArray(inventory.items) && Array.isArray(inventory.locations) &&
    inventory.items.every(validItem) && inventory.locations.every(validLocation) &&
    new Set(inventory.items.map((item) => item.id)).size === inventory.items.length &&
    new Set(inventory.locations.map((location) => location.id)).size === inventory.locations.length &&
    new Set(inventory.items.map((item) => item.barcode.toLocaleLowerCase("de"))).size === inventory.items.length &&
    new Set(inventory.locations.map((location) => location.barcode.toLocaleLowerCase("de"))).size === inventory.locations.length &&
    inventory.items.every((item) => !item.locationId || inventory.locations.some((location) => location.id === item.locationId)) &&
    inventory.locations.every((location) => !location.parentId ||
      (location.parentId !== location.id && inventory.locations.some((parent) => parent.id === location.parentId))) &&
    inventory.locations.every((location) => {
      const visited = new Set([location.id]);
      let parent = inventory.locations.find((entry) => entry.id === location.parentId);
      while (parent) {
        if (visited.has(parent.id)) return false;
        visited.add(parent.id);
        parent = inventory.locations.find((entry) => entry.id === parent.parentId);
      }
      return true;
    })
  );
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

function formatGameDetails(details = {}) {
  return Object.entries(GAME_DETAIL_LABELS)
    .filter(([key]) => typeof details[key] === "string" && details[key])
    .map(([key, label]) => `${label}: ${key === "purchasePrice" ? `${details[key]} €` : details[key]}`)
    .join(" · ");
}

async function persist() {
  try {
    const saved = { ...state };
    if (legacyVaultKey) saved.legacyMigrationKey = legacyVaultKey;
    await window.KatalogicLocalStorage.save(saved);
    persistedState = structuredClone(saved);
  } catch (error) {
    console.error("Could not save local Katalogic data.", error);
    const restoredState = structuredClone(persistedState);
    delete restoredState.legacyMigrationKey;
    for (const key of Object.keys(state)) delete state[key];
    Object.assign(state, restoredState);
    legacyVaultKey = typeof persistedState.legacyMigrationKey === "string" ? persistedState.legacyMigrationKey : "";
    for (const category of ["device", "game", "book", "film", "filament", "small-parts"]) {
      window.dispatchEvent(new Event(`katalogic:${category}-inventory-imported`));
    }
    const reason = error.name === "QuotaExceededError"
      ? "Das Speicherlimit des Browsers ist erreicht. Exportiere eine Sicherung und entferne nicht benötigte Bilder."
      : `Lokales Speichern fehlgeschlagen: ${error.message}`;
    showMessage(elements.syncMessage, reason);
    notify(reason);
    throw error;
  }
}

function saveInventoryState(key, inventory, validator) {
  if (!validator(inventory)) throw new Error("Ungültige Bestandsdaten.");
  const previous = state[key];
  state[key] = inventory;
  return persist().then(() => true).catch(() => {
    state[key] = previous;
    notify("Speichern fehlgeschlagen. Die vorherigen Daten wurden wiederhergestellt.");
    return false;
  });
}

window.KatalogicDeviceStorage = {
  load() {
    return structuredClone(state.deviceInventory || {
      devices: [], cables: [], controllers: [], accessories: [], photos: [], checks: [], customCatalog: {}, requiredFields: []
    });
  },
  save(inventory) {
    return saveInventoryState("deviceInventory", inventory, isValidDeviceInventory);
  }
};

window.KatalogicGameStorage = {
  load() {
    return structuredClone(state.gameInventory || { games: [], accessories: [], customOptions: {} });
  },
  save(inventory) {
    return saveInventoryState("gameInventory", inventory, isValidGameInventory);
  }
};

window.KatalogicBookStorage = {
  load() {
    return structuredClone(state.bookInventory || { books: [], series: [], customOptions: {}, view: "grid" });
  },
  save(inventory) {
    return saveInventoryState("bookInventory", inventory, isValidBookInventory);
  }
};

window.KatalogicFilmStorage = {
  load() {
    return structuredClone(state.filmInventory || { entries: [], franchises: [], customOptions: {}, view: "grid" });
  },
  save(inventory) {
    return saveInventoryState("filmInventory", inventory, isValidFilmInventory);
  }
};

window.KatalogicSmallPartsStorage = {
  load() {
    return structuredClone(state.smallPartsInventory || { items: [], locations: [] });
  },
  save(inventory) {
    return saveInventoryState("smallPartsInventory", inventory, isValidSmallPartsInventory);
  }
};

window.KatalogicFilamentStorage = {
  load() {
    return structuredClone(state.filamentInventory || { products: [], spools: [], profiles: [], customOptions: {}, view: "grid" });
  },
  save(inventory) {
    return saveInventoryState("filamentInventory", inventory, isValidFilamentInventory);
  }
};

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

function refreshCategoryFilter(records) {
  const selected = elements.categoryFilter.value;
  const collections = [
    ["Geräte", "__view_devices__", state.deviceInventory?.devices?.length || 0],
    ["Bücher", "__view_books__", state.bookInventory?.books?.length || 0],
    ["Filme", "__view_films__", state.filmInventory?.entries?.length || 0],
    ["Spiele", "__view_games__", state.gameInventory?.games?.length || 0],
    ["Filamente", "__view_filaments__", state.filamentInventory?.spools?.length || 0],
    ["Kleinteile", "__view_small-parts__", state.smallPartsInventory?.items?.length || 0]
  ];
  const collectionOptions = document.createElement("optgroup");
  collectionOptions.label = "Verwaltungsbereiche";
  for (const [label, view, count] of collections) {
    collectionOptions.append(new Option(`${label} (${count})`, view));
  }
  elements.categoryFilter.replaceChildren(
    new Option("Sammlung auswählen …", "__choose__"),
    new Option(`Alle Katalogeinträge (${records.length})`, ""),
    collectionOptions
  );
  if (selected === "" || collections.some(([, view]) => view === selected)) {
    elements.categoryFilter.value = selected;
  }
}

function showAppView(view) {
  activeView = view;
  const views = {
    collection: elements.collectionView,
    search: elements.searchView,
    devices: elements.devicesView,
    books: elements.booksView,
    films: elements.filmsView,
    games: elements.gamesView,
    filaments: elements.filamentsView,
    "small-parts": elements.smallPartsView,
    barcode: elements.barcodeView,
    sync: elements.syncView
  };
  for (const [name, section] of Object.entries(views)) {
    section.classList.toggle("hidden", name !== activeView);
  }
  elements.welcomeIntro.classList.toggle("hidden", activeView !== "home");
  const managementViews = [...elements.managementMenu.querySelectorAll("[data-view]")];
  const inManagement = managementViews.some((button) => button.dataset.view === activeView);
  elements.managementToggle.classList.toggle("is-active", inManagement);
  elements.managementToggle.setAttribute("aria-expanded", String(!elements.managementMenu.classList.contains("hidden")));
  for (const button of [...elements.taskbar.querySelectorAll(".taskbar-link"), ...managementViews]) {
    const active = button === elements.managementToggle ? inManagement : button.dataset.view === activeView;
    button.classList.toggle("is-active", active);
    if (active) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  }
  if (activeView === "collection") render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function openCatalogEditor(record) {
  const managedCategories = new Set(["Geräte", "Spiele", "Bücher", "Filme", "Filamente"]);
  const categories = [...new Set([
    ...DEFAULT_CATEGORIES,
    ...state.records.map((entry) => entry.category.trim()).filter((category) => category && !managedCategories.has(category)),
    record.category.trim() || "Sonstiges"
  ])].sort((a, b) => a.localeCompare(b, "de"));
  elements.catalogEditCategory.replaceChildren(...categories.map((category) => new Option(category, category)));
  elements.catalogEditName.value = record.name;
  elements.catalogEditCategory.value = record.category.trim() || "Sonstiges";
  elements.catalogEditLocation.value = record.location || "";
  elements.catalogEditBarcode.value = record.barcode || "";
  elements.catalogEditNotes.value = record.notes || "";
  editingRecordId = record.id;
  showMessage(elements.catalogEditMessage, "", false);
  elements.catalogEditDialog.showModal();
  elements.catalogEditName.focus();
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
  let savedGames = [];
  let deviceData = { devices: [], photos: [] };
  let bookData = { books: [], series: [] };
  let filmData = { entries: [], franchises: [] };
  const searchErrors = [];
  let filamentData = { products: [], spools: [] };
  let smallPartsData = { items: [], locations: [] };
  try {
    deviceData = window.KatalogicDeviceStorage.load();
  } catch (error) {
    console.error("Could not search saved devices.", error);
    searchErrors.push("Geräte konnten nicht durchsucht werden.");
  }
  try {
    savedGames = window.KatalogicGameStorage.load().games;
  } catch (error) {
    console.error("Could not search saved games.", error);
    searchErrors.push("Spiele konnten nicht durchsucht werden.");
  }
  try {
    bookData = window.KatalogicBookStorage.load();
  } catch (error) {
    console.error("Could not search saved books.", error);
    searchErrors.push("Bücher konnten nicht durchsucht werden.");
  }
  const matches = state.records.filter((record) => {
    if (record.deletedAt) return false;
    // EAN-13 und UPC-A unterscheiden sich nur durch eine führende Null.
    if (isNumericQuery && record.barcode && stripZeros(record.barcode) === stripZeros(query)) return true;
    const searchable = [record.name, record.category, record.notes, record.deviceDetails, record.location, record.barcode, ACCESSORY_TYPES[record.accessoryType], formatGameDetails(record.gameDetails)]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase("de");
    return searchable.includes(query);
  }).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const gameMatches = savedGames.filter((game) => {
    if (isNumericQuery && game.barcode && stripZeros(game.barcode) === stripZeros(query)) return true;
    const searchable = [
      "Spiele", game.name, game.subtitle, game.category, game.type, game.platform, game.developer,
      game.publisher, game.genre, game.language, game.region, game.barcode, game.sku,
      game.description, game.location, game.source, game.condition, game.functionality,
      game.completeness, ...Object.values(game.specifics || {}),
      ...(game.customFields || []).flatMap((entry) => [entry.key, entry.value])
    ].filter(Boolean).join(" ").toLocaleLowerCase("de");
    return searchable.includes(query);
  }).sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
  const savedBooks = bookData.books;
  try {
    filmData = window.KatalogicFilmStorage.load();
  } catch (error) {
    console.error("Could not search saved films.", error);
    searchErrors.push("Filme konnten nicht durchsucht werden.");
  }
  try {
    filamentData = window.KatalogicFilamentStorage.load();
  } catch (error) {
    console.error("Could not search saved filament spools.", error);
    searchErrors.push("Filamentrollen konnten nicht durchsucht werden.");
  }
  try {
    smallPartsData = window.KatalogicSmallPartsStorage.load();
  } catch (error) {
    console.error("Could not search saved small parts.", error);
    searchErrors.push("Kleinteile konnten nicht durchsucht werden.");
  }
  const deviceMatches = deviceData.devices.filter((device) => {
    const searchable = [
      "Geräte", device.name, device.category, device.type, device.manufacturer, device.model,
      device.variant, device.serial, device.inventory, device.color, device.owner, device.location,
      device.condition, device.functionality, device.packaging, device.receipt, device.notes,
      device.purchaseDate, device.source, ...Object.values(device.technical || {}),
      ...(device.customTechnical || []).flatMap((entry) => [entry.key, entry.value]),
      ...deviceData.cables.filter((entry) => entry.deviceId === device.id).flatMap((entry) => Object.values(entry)),
      ...deviceData.controllers.filter((entry) => entry.deviceId === device.id).flatMap((entry) => Object.values(entry)),
      ...deviceData.accessories.filter((entry) => (entry.deviceIds || []).includes(device.id)).flatMap((entry) => Object.values(entry))
    ].filter(Boolean).join(" ").toLocaleLowerCase("de");
    return searchable.includes(query);
  }).sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
  const seriesNames = new Map(bookData.series.map((series) => [series.id, series.name]));
  const bookMatches = savedBooks.filter((book) => {
    if (isNumericQuery && [book.isbn10, book.isbn13, book.ean].some((value) => value && stripZeros(value.replace(/\D/g, "")) === stripZeros(query))) return true;
    const searchable = [
      "Bücher", book.title, book.subtitle, ...(book.authors || []), book.editor, book.publisher, book.year,
      book.edition, seriesNames.get(book.seriesId), book.volume, book.category, book.subcategory,
      book.genre, book.format, book.binding, book.isbn10, book.isbn13, book.ean, book.language,
      book.originalLanguage, book.translator, book.illustrator, book.blurb, book.notes,
      book.condition, book.readingStatus, book.location, book.source, book.review,
      ...(book.relatedBookIds || []).map((id) => savedBooks.find((related) => related.id === id)?.title || ""),
      ...Object.values(book.details || {}), ...Object.values(book.loan || {})
    ].filter(Boolean).join(" ").toLocaleLowerCase("de");
    return searchable.includes(query);
  }).sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
  const franchiseNames = new Map(filmData.franchises.map((franchise) => [franchise.id, franchise.name]));
  const filmMatches = filmData.entries.filter((film) => {
    if (isNumericQuery && film.barcode && stripZeros(film.barcode.replace(/\D/g, "")) === stripZeros(query)) return true;
    const searchable = [
      "Filme", film.title, film.originalTitle, film.alternateTitle, film.category, film.kind, film.genre,
      film.year, film.directors, film.cast, film.writers, film.producers, film.studio, film.publisher,
      film.country, film.language, film.originalLanguage, film.rating, franchiseNames.get(film.franchiseId),
      film.franchise, film.part, film.edition, film.barcode, film.condition, film.functionality,
      film.completeness, film.seriesName, film.seasonNumber, film.episodes, film.boxName,
      film.location, film.source, film.description, film.customValues, ...Object.values(film.details || {})
    ].flat().filter(Boolean).join(" ").toLocaleLowerCase("de");
    return searchable.includes(query);
  }).sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
  const filamentProducts = new Map(filamentData.products.map((product) => [product.id, product]));
  const filamentMatches = filamentData.spools.filter((spool) => {
    const product = filamentProducts.get(spool.productId);
    if (!product) return false;
    if (isNumericQuery && [product.sku, spool.lotNumber].some((value) =>
      value && stripZeros(String(value).replace(/\D/g, "")) === stripZeros(query))) return true;
    const searchable = [
      "Filamente", product.manufacturer, product.name, product.materialType, product.variant, product.color,
      product.manufacturerColor, product.colorHex, product.sku, product.diameter,
      ...Object.values(product.technical || {}),
      ...(product.customTechnical || []).flatMap((entry) => [entry.key, entry.value, entry.unit]),
      spool.id, spool.lotNumber, spool.location, spool.container, spool.storageStatus,
      spool.humidityStatus, spool.storageNotes, spool.notes, spool.dealer, spool.printerLink,
      spool.profileLink, spool.state, spool.purchaseDate
    ].filter(Boolean).join(" ").toLocaleLowerCase("de");
    return searchable.includes(query);
  }).sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
  const smallPartsMatches = smallPartsData.items.filter((item) => {
    const location = smallPartsData.locations.find((entry) => entry.id === item.locationId);
    const searchable = [
      "Kleinteile", item.name, item.category, item.manufacturer, item.partNumber, item.barcode,
      item.description, item.notes, item.unit, location?.name, item.quantity
    ].filter(Boolean).join(" ").toLocaleLowerCase("de");
    return isNumericQuery && item.barcode && stripZeros(item.barcode) === stripZeros(query) || searchable.includes(query);
  }).sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
  const totalMatches = matches.length + deviceMatches.length + gameMatches.length + bookMatches.length + filmMatches.length + filamentMatches.length + smallPartsMatches.length;
  if (!totalMatches) {
    const noMatches = "Nicht in deinem Bestand gefunden. Prüfe den Suchbegriff oder den Barcode.";
    showMessage(elements.librarySearchMessage, searchErrors.length ? `${noMatches} ${searchErrors.join(" ")} Prüfe die gespeicherten Daten.` : noMatches, searchErrors.length > 0);
    return;
  }
  showMessage(
    elements.librarySearchMessage,
    `${totalMatches} Treffer in Sammlung, Geräte-, Spiele-, Bücher-, Film-, Filament- und Kleinteilebestand gefunden.${searchErrors.length ? ` ${searchErrors.join(" ")} Prüfe die gespeicherten Daten.` : ""}`,
    searchErrors.length > 0
  );
  for (const record of matches) {
    const card = document.createElement("article");
    card.className = "item-card";
    appendRecordPhotos(card, record);
    const copy = document.createElement("div");
    copy.className = "item-copy";
    const title = document.createElement("h3");
    title.textContent = record.name;
    const details = document.createElement("p");
    details.textContent = [record.category || "Sonstiges", record.barcode ? `Barcode: ${record.barcode}` : "", record.location ? `Lagerort: ${record.location}` : "", ACCESSORY_TYPES[record.accessoryType], record.notes, record.deviceDetails ? `Weitere Geräteangaben: ${record.deviceDetails}` : "", formatGameDetails(record.gameDetails)]
      .filter(Boolean)
      .join(" · ");
    copy.append(title, details);
    card.append(copy);
    elements.librarySearchResults.append(card);
  }
  for (const device of deviceMatches) {
    const card = document.createElement("article");
    card.className = "item-card";
    const photos = deviceData.photos
      .filter((photo) => photo.deviceId === device.id)
      .map((photo) => photo.dataUrl);
    appendRecordPhotos(card, { name: device.name, imageUrls: photos, imageUrl: "" });
    const copy = document.createElement("div");
    copy.className = "item-copy";
    const title = document.createElement("h3");
    title.textContent = device.name;
    const details = document.createElement("p");
    details.textContent = [
      "Geräte", device.category, device.type, device.manufacturer, device.model, device.variant,
      device.serial ? `Seriennummer: ${device.serial}` : "",
      device.inventory ? `Inventarnummer: ${device.inventory}` : "",
      device.location ? `Standort: ${device.location}` : ""
    ].filter(Boolean).join(" · ");
    copy.append(title, details);
    const open = document.createElement("button");
    open.type = "button";
    open.className = "button button-secondary";
    open.textContent = "In Geräte öffnen";
    open.dataset.openDevice = device.id;
    card.append(copy, open);
    elements.librarySearchResults.append(card);
  }
  for (const game of gameMatches) {
    const card = document.createElement("article");
    card.className = "item-card";
    appendRecordPhotos(card, { name: game.name, imageUrls: game.photos || [], imageUrl: "" });
    const copy = document.createElement("div");
    copy.className = "item-copy";
    const title = document.createElement("h3");
    title.textContent = game.name;
    const details = document.createElement("p");
    details.textContent = [
      "Spiele", game.category, game.type, game.platform,
      game.barcode ? `EAN / ISBN: ${game.barcode}` : "",
      game.location ? `Lagerort: ${game.location}` : "",
      game.publisher || game.developer
    ].filter(Boolean).join(" · ");
    copy.append(title, details);
    const open = document.createElement("button");
    open.type = "button";
    open.className = "button button-secondary";
    open.textContent = "In Spiele öffnen";
    open.dataset.openGame = game.id;
    card.append(copy, open);
    elements.librarySearchResults.append(card);
  }
  for (const book of bookMatches) {
    const card = document.createElement("article");
    card.className = "item-card";
    appendRecordPhotos(card, { name: book.title, imageUrls: book.photos || [], imageUrl: "" });
    const copy = document.createElement("div");
    copy.className = "item-copy";
    const title = document.createElement("h3");
    title.textContent = book.title;
    const details = document.createElement("p");
    details.textContent = [
      "Bücher", book.category, book.format, (book.authors || []).join(", "),
      book.isbn13 || book.isbn10 || book.ean ? `ISBN / EAN: ${book.isbn13 || book.isbn10 || book.ean}` : "",
      book.location ? `Standort: ${book.location}` : "",
      book.publisher
    ].filter(Boolean).join(" · ");
    copy.append(title, details);
    const open = document.createElement("button");
    open.type = "button";
    open.className = "button button-secondary";
    open.textContent = "In Bücher öffnen";
    open.dataset.openBook = book.id;
    card.append(copy, open);
    elements.librarySearchResults.append(card);
  }
  for (const film of filmMatches) {
    const card = document.createElement("article");
    card.className = "item-card";
    appendRecordPhotos(card, { name: film.title, imageUrls: film.photos || [], imageUrl: "" });
    const copy = document.createElement("div");
    copy.className = "item-copy";
    const title = document.createElement("h3");
    title.textContent = film.title;
    const details = document.createElement("p");
    details.textContent = [
      "Filme", film.category, film.kind, film.format, film.year,
      film.barcode ? `EAN: ${film.barcode}` : "", film.franchise,
      film.location ? `Standort: ${film.location}` : ""
    ].filter(Boolean).join(" · ");
    copy.append(title, details);
    const open = document.createElement("button");
    open.type = "button";
    open.className = "button button-secondary";
    open.textContent = "In Filme öffnen";
    open.dataset.openFilm = film.id;
    card.append(copy, open);
    elements.librarySearchResults.append(card);
  }
  for (const spool of filamentMatches) {
    const product = filamentProducts.get(spool.productId);
    const card = document.createElement("article");
    card.className = "item-card";
    appendRecordPhotos(card, { name: product.name, imageUrls: [], imageUrl: product.photo || spool.spoolPhoto || "" });
    const copy = document.createElement("div");
    copy.className = "item-copy";
    const title = document.createElement("h3");
    title.textContent = product.name || product.materialType || "Filamentrolle";
    const details = document.createElement("p");
    details.textContent = [
      "Filamente", product.manufacturer, product.materialType, product.variant, product.color,
      product.sku ? `Artikelnummer: ${product.sku}` : "",
      spool.lotNumber ? `Charge: ${spool.lotNumber}` : "",
      spool.remainingG == null ? "Restmenge unbekannt" : `Restmenge: ${spool.remainingG} g`,
      spool.location ? `Lagerort: ${spool.location}` : ""
    ].filter(Boolean).join(" · ");
    copy.append(title, details);
    const open = document.createElement("button");
    open.type = "button";
    open.className = "button button-secondary";
    open.textContent = "In Filamenten öffnen";
    open.dataset.openFilament = spool.id;
    card.append(copy, open);
    elements.librarySearchResults.append(card);
  }
  for (const item of smallPartsMatches) {
    const card = document.createElement("article");
    card.className = "item-card";
    appendRecordPhotos(card, { name: item.name, imageUrls: item.images || [], imageUrl: "" });
    const copy = document.createElement("div");
    copy.className = "item-copy";
    const title = document.createElement("h3");
    title.textContent = item.name;
    const detail = document.createElement("p");
    const location = smallPartsData.locations.find((entry) => entry.id === item.locationId);
    detail.textContent = ["Kleinteile", item.category, item.partNumber, item.barcode,
      `${item.quantity} ${item.unit}`, location?.name].filter(Boolean).join(" · ");
    const open = document.createElement("button");
    open.type = "button";
    open.className = "button button-secondary";
    open.textContent = "In Kleinteile öffnen";
    open.addEventListener("click", () => {
      showAppView("small-parts");
      document.querySelector("#small-parts-search").value = item.name;
      document.querySelector("#small-parts-search").dispatchEvent(new Event("input", { bubbles: true }));
    });
    copy.append(title, detail, open);
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
    devices: elements.devicesView,
    books: elements.booksView,
    films: elements.filmsView,
    games: elements.gamesView,
    filaments: elements.filamentsView,
    barcode: elements.barcodeView,
    sync: elements.syncView
  };
  for (const [name, section] of Object.entries(views)) {
    section.classList.toggle("hidden", name !== activeView);
  }
  const managementViews = [...elements.managementMenu.querySelectorAll("[data-view]")];
  const inManagement = managementViews.some((button) => button.dataset.view === activeView);
  elements.managementToggle.classList.toggle("is-active", inManagement);
  elements.managementToggle.setAttribute("aria-expanded", String(!elements.managementMenu.classList.contains("hidden")));
  for (const button of [...elements.taskbar.querySelectorAll(".taskbar-link"), ...managementViews]) {
    const active = activeView !== "home" &&
      (button === elements.managementToggle ? inManagement : button.dataset.view === activeView);
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
      const deviceDetails = record.deviceDetails ? `<p>Weitere Geräteangaben · ${escapeHtml(record.deviceDetails)}</p>` : "";
      const barcode = record.barcode ? `<p class="item-barcode">Barcode · ${escapeHtml(record.barcode)}</p>` : "";
      const location = record.location ? `<p class="item-location">Lagerort · ${escapeHtml(record.location)}</p>` : "";
      const accessory = ACCESSORY_TYPES[record.accessoryType] ? `<p class="item-location">${escapeHtml(ACCESSORY_TYPES[record.accessoryType])}</p>` : "";
      const gameDetails = formatGameDetails(record.gameDetails);
      const gameDetailsMarkup = gameDetails ? `<p class="game-details-summary">${escapeHtml(gameDetails)}</p>` : "";
      const source = safeImageUrl(record.sourceUrl);
      const sourceLink = source ? `<a class="source-link" href="${escapeHtml(source)}" target="_blank" rel="noopener noreferrer">Quelldaten ↗</a>` : "";
      const copy = document.createElement("div");
      copy.className = "item-copy";
      copy.innerHTML = `<h3>${escapeHtml(record.name)}</h3>${notes}${deviceDetails}${location}${accessory}${barcode}${gameDetailsMarkup}${sourceLink}`;
      card.append(copy);
      const managedCategory = ["Geräte", "Spiele", "Bücher", "Filme"].includes(record.category);
      const editAction = !managedCategory && !record.deviceDetails && !record.accessoryType
            ? `<button class="icon-button" type="button" data-edit="${escapeHtml(record.id)}" aria-label="Eintrag ${escapeHtml(record.name)} bearbeiten" title="Bearbeiten">✎</button>`
            : "";
      card.insertAdjacentHTML("beforeend", `
            <div class="item-actions">
              ${editAction}
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
    await persist();
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
    await persist();
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

async function stopScanner() {
  if (scannerStream) {
    for (const track of scannerStream.getTracks()) track.stop();
    scannerStream = null;
  }
  elements.libraryScannerVideo.srcObject = null;
  elements.libraryScannerPanel.classList.add("hidden");
}

async function startScanner() {
  if (scannerStream) await stopScanner();
  const reportScanner = (text, isError = true) => showMessage(elements.libraryScannerMessage, text, isError);
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    reportScanner("Kamerazugriff ist hier nicht verfügbar. Nutze die Barcode-Eingabe oder einen USB-/Bluetooth-Scanner.");
    elements.libraryScannerPanel.classList.remove("hidden");
    return;
  }
  if (!("BarcodeDetector" in window)) {
    reportScanner("Dieser Browser unterstützt die integrierte Barcode-Erkennung nicht. Nutze die Barcode-Eingabe oder einen USB-/Bluetooth-Scanner.");
    elements.libraryScannerPanel.classList.remove("hidden");
    return;
  }
  try {
    scannerStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } },
      audio: false
    });
    elements.libraryScannerVideo.srcObject = scannerStream;
    elements.libraryScannerPanel.classList.remove("hidden");
    await elements.libraryScannerVideo.play();
    const supported = await BarcodeDetector.getSupportedFormats();
    const formats = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "qr_code"]
      .filter((format) => supported.includes(format));
    if (!formats.length) throw new Error("Dieser Browser unterstützt kein geeignetes Barcode-Format.");
    const detector = new BarcodeDetector({ formats });
    showMessage(elements.libraryScannerMessage, "Barcode in den Kamerarahmen halten …", false);
    while (scannerStream) {
      const hits = await detector.detect(elements.libraryScannerVideo);
      if (hits.length && hits[0].rawValue) {
        await stopScanner();
        elements.librarySearchQuery.value = hits[0].rawValue;
        renderLibrarySearch();
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
    elements.libraryScannerPanel.classList.remove("hidden");
  }
}

elements.librarySearchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  renderLibrarySearch();
});
elements.librarySearchQuery.addEventListener("input", renderLibrarySearch);
elements.libraryStartScanner.addEventListener("click", () => void startScanner());
elements.libraryStopScanner.addEventListener("click", () => void stopScanner());
elements.categoryFilter.addEventListener("change", render);
elements.categoryFilter.addEventListener("change", () => {
  const viewByCollection = {
    __view_devices__: "devices",
    __view_books__: "books",
    __view_films__: "films",
    __view_games__: "games",
    __view_filaments__: "filaments",
    "__view_small-parts__": "small-parts"
  };
  const view = viewByCollection[elements.categoryFilter.value];
  if (view) {
    elements.categoryFilter.value = "__choose__";
    showAppView(view);
  }
});
elements.taskbar.addEventListener("click", (event) => {
  const toggle = event.target.closest("[data-management-toggle]");
  if (toggle) {
    const isExpanded = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", String(!isExpanded));
    elements.managementMenu.classList.toggle("hidden", isExpanded);
    return;
  }
  const button = event.target.closest(".taskbar-link");
  const managementButton = event.target.closest("#management-menu [data-view]");
  if (managementButton) {
    showAppView(managementButton.dataset.view);
    elements.managementMenu.classList.add("hidden");
    elements.managementToggle.setAttribute("aria-expanded", "false");
    return;
  }
  if (button) showAppView(button.dataset.view);
});
document.addEventListener("click", (event) => {
  if (!elements.managementNavigation.contains(event.target)) {
    elements.managementMenu.classList.add("hidden");
    elements.managementToggle.setAttribute("aria-expanded", "false");
  }
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    elements.managementMenu.classList.add("hidden");
    elements.managementToggle.setAttribute("aria-expanded", "false");
  }
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

elements.itemList.addEventListener("click", async (event) => {
  const editButton = event.target.closest("[data-edit]");
  if (editButton) {
    const record = state.records.find((entry) => entry.id === editButton.dataset.edit);
    if (record) openCatalogEditor(record);
    return;
  }
  const deleteButton = event.target.closest("[data-delete]");
  if (!deleteButton) return;
  const record = state.records.find((entry) => entry.id === deleteButton.dataset.delete);
  if (!record || !window.confirm(`„${record.name}“ aus dem Katalog löschen?`)) return;
  record.deletedAt = new Date().toISOString();
  record.updatedAt = record.deletedAt;
  try {
    await persist();
  } catch {
    return;
  }
  render();
  if (state.supabaseUrl && state.supabaseKey) void synchronize();
});
elements.catalogEditForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const index = state.records.findIndex((record) => record.id === editingRecordId);
  if (index < 0) {
    elements.catalogEditDialog.close();
    return;
  }
  const original = state.records[index];
  const updated = {
    ...original,
    name: elements.catalogEditName.value.trim(),
    category: elements.catalogEditCategory.value.trim(),
    location: elements.catalogEditLocation.value.trim(),
    barcode: elements.catalogEditBarcode.value.trim(),
    notes: elements.catalogEditNotes.value.trim(),
    updatedAt: new Date().toISOString()
  };
  if (!updated.name || !updated.category) {
    showMessage(elements.catalogEditMessage, "Name und Kategorie sind erforderlich.");
    return;
  }
  state.records[index] = updated;
  try {
    await persist();
  } catch {
    state.records[index] = original;
    showMessage(elements.catalogEditMessage, "Änderungen konnten nicht gespeichert werden.");
    return;
  }
  elements.catalogEditDialog.close();
  render();
  notify("Katalogeintrag aktualisiert.");
  if (state.supabaseUrl && state.supabaseKey) void synchronize();
});
elements.catalogEditDialog.querySelector("[data-catalog-edit-cancel]").addEventListener("click", () => {
  elements.catalogEditDialog.close();
});
elements.catalogEditDialog.addEventListener("close", () => {
  editingRecordId = null;
  elements.catalogEditForm.reset();
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

window.KatalogicBarcodeTools = {
  svgFor(format, value, caption = "") {
    const encoded = format === "qr" ? encodeQr(value) : encodeCode128(value);
    return format === "qr" ? buildQrSvg(encoded, caption) : buildBarcodeSvg(encoded, caption);
  }
};

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

elements.syncIdForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const syncId = elements.syncId.value.trim().toLowerCase();
  if (!isUuid(syncId)) {
    showMessage(elements.syncIdMessage, "Die Sammlungs-ID muss eine gültige UUID sein.");
    return;
  }
  if (syncId !== state.syncId && state.records.length &&
      !window.confirm("Die lokale Sammlung wird mit der ausgewählten Sammlungs-ID synchronisiert. Vorhandene Einträge werden mit dem Cloud-Bestand zusammengeführt. Fortfahren?")) return;
  state.syncId = syncId;
  try {
    await persist();
  } catch {
    return;
  }
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

elements.exportPdf.addEventListener("click", () => {
  try {
    if (!window.KatalogicPdfExport) throw new Error("Das PDF-Modul wurde nicht geladen.");
    const { blob, total, fileName } = window.KatalogicPdfExport.create(state);
    downloadBlob(blob, fileName);
    showMessage(elements.backupMessage, `PDF mit ${total} Einträgen erstellt. Das PDF dient nur der Ansicht und kann nicht importiert werden.`, false);
  } catch (error) {
    console.error("Could not export PDF.", error);
    showMessage(elements.backupMessage, `PDF-Export fehlgeschlagen: ${error.message}`);
  }
});

elements.exportCharts.addEventListener("click", async () => {
  try {
    if (!window.KatalogicChartExport) throw new Error("Das Diagramm-Modul wurde nicht geladen.");
    const { blob, fileName, count } = await window.KatalogicChartExport.create(state);
    downloadBlob(blob, fileName);
    showMessage(elements.backupMessage, `${count} Diagramme als PNG-Bild exportiert.`, false);
  } catch (error) {
    console.error("Could not export charts.", error);
    showMessage(elements.backupMessage, `Diagramm-Export fehlgeschlagen: ${error.message}`);
  }
});

elements.exportData.addEventListener("click", () => {
  try {
    const backup = {
      format: "katalogic-backup",
      version: 1,
      exportedAt: new Date().toISOString(),
      syncId: state.syncId,
      records: state.records,
      deviceInventory: state.deviceInventory,
      gameInventory: state.gameInventory,
      bookInventory: state.bookInventory,
      filmInventory: state.filmInventory,
      filamentInventory: state.filamentInventory,
      smallPartsInventory: state.smallPartsInventory
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
    const deviceCount = state.deviceInventory?.devices?.length || 0;
    const gameCount = state.gameInventory?.games?.length || 0;
    const bookCount = state.bookInventory?.books?.length || 0;
    const filmCount = state.filmInventory?.entries?.length || 0;
    const filamentCount = state.filamentInventory?.spools?.length || 0;
    const filamentAmsCount = state.filamentInventory?.amsUnits?.length || 0;
    const smallPartsCount = state.smallPartsInventory?.items?.length || 0;
    showMessage(elements.backupMessage, `${state.records.filter((record) => !record.deletedAt).length} Einträge, ${deviceCount} Geräte, ${gameCount} Spiele, ${bookCount} Bücher, ${filmCount} Filme, ${filamentCount} Filamentrollen, ${smallPartsCount} Kleinteile und ${filamentAmsCount} AMS-Zuordnungen exportiert. Die Sicherungsdatei vertraulich aufbewahren.`, false);
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
    if (file.size > 250 * 1024 * 1024) throw new Error("Die Sicherungsdatei ist größer als 250 MB.");
    const backup = JSON.parse(await file.text());
    if (backup?.format !== "katalogic-backup" || backup.version !== 1 ||
        !isUuid(backup.syncId) || !Array.isArray(backup.records) ||
        !backup.records.every(isValidRecord) ||
        (backup.deviceInventory !== undefined && !isValidDeviceInventory(backup.deviceInventory)) ||
        (backup.gameInventory !== undefined && !isValidGameInventory(backup.gameInventory)) ||
        (backup.bookInventory !== undefined && !isValidBookInventory(backup.bookInventory)) ||
        (backup.filmInventory !== undefined && !isValidFilmInventory(backup.filmInventory)) ||
        (backup.filamentInventory !== undefined && !isValidFilamentInventory(backup.filamentInventory)) ||
        (backup.smallPartsInventory !== undefined && !isValidSmallPartsInventory(backup.smallPartsInventory))) {
      throw new Error("Die Datei ist keine gültige Katalogic-Sicherung.");
    }
    if (new Set(backup.records.map((record) => record.id)).size !== backup.records.length) {
      throw new Error("Die Sicherungsdatei enthält doppelte Eintrags-IDs.");
    }
    if (!window.confirm("Die aktuell gespeicherte Sammlung wird durch die importierte Sicherung ersetzt. Exportiere vorher eine Sicherung, falls du deine aktuellen Daten behalten möchtest.")) return;
    state.syncId = backup.syncId.toLowerCase();
    state.records = backup.records;
    if (backup.deviceInventory !== undefined) state.deviceInventory = backup.deviceInventory;
    if (backup.gameInventory !== undefined) state.gameInventory = backup.gameInventory;
    if (backup.bookInventory !== undefined) state.bookInventory = backup.bookInventory;
    if (backup.filmInventory !== undefined) state.filmInventory = backup.filmInventory;
    if (backup.filamentInventory !== undefined) state.filamentInventory = backup.filamentInventory;
    if (backup.smallPartsInventory !== undefined) state.smallPartsInventory = backup.smallPartsInventory;
    legacyVaultKey = "";
    needsStateMigration = false;
    await persist();
    window.dispatchEvent(new Event("katalogic:device-inventory-imported"));
    window.dispatchEvent(new Event("katalogic:game-inventory-imported"));
    window.dispatchEvent(new Event("katalogic:book-inventory-imported"));
    window.dispatchEvent(new Event("katalogic:film-inventory-imported"));
    window.dispatchEvent(new Event("katalogic:filament-inventory-imported"));
    window.dispatchEvent(new Event("katalogic:small-parts-inventory-imported"));
    render();
    const importedCount = state.records.filter((record) => !record.deletedAt).length;
    const importedDevices = backup.deviceInventory?.devices?.length || 0;
    const importedGames = backup.gameInventory?.games?.length || 0;
    const importedBooks = backup.bookInventory?.books?.length || 0;
    const importedFilms = backup.filmInventory?.entries?.length || 0;
    const importedFilaments = backup.filamentInventory?.spools?.length || 0;
    const importedSmallParts = backup.smallPartsInventory?.items?.length || 0;
    const importedAms = backup.filamentInventory?.amsUnits?.length || 0;
    showMessage(elements.backupMessage, `${importedCount} ${importedCount === 1 ? "Eintrag" : "Einträge"}, ${importedDevices} Geräte, ${importedGames} Spiele, ${importedBooks} Bücher, ${importedFilms} Filme, ${importedFilaments} Filamentrollen, ${importedSmallParts} Kleinteile und ${importedAms} AMS-Zuordnungen importiert.`, false);
    if (state.supabaseUrl && state.supabaseKey) void synchronize();
  } catch (error) {
    console.error("Could not import Katalogic backup.", error);
    showMessage(elements.backupMessage, `Import fehlgeschlagen: ${error.message}`);
  } finally {
    elements.importDataFile.value = "";
  }
});

elements.settingsForm.addEventListener("submit", async (event) => {
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
    await persist();
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
if (needsStateMigration) {
  void persist().then(() => {
    needsStateMigration = false;
  }).catch(() => {});
}
if (state.supabaseUrl && state.supabaseKey) {
  showMessage(elements.syncMessage, "Verbinde mit Supabase …", false);
  void synchronize();
} else {
  void window.KatalogicLocalStorage.estimate().then((estimate) => {
    if (!estimate || !Number.isFinite(estimate.usage) || !Number.isFinite(estimate.quota)) return;
    const used = Math.round(estimate.usage / 1024 / 1024);
    const quota = Math.round(estimate.quota / 1024 / 1024);
    showMessage(elements.syncMessage, `Lokal in IndexedDB gespeichert · ca. ${used} MB von ${quota} MB Browser-Speicher belegt`, false);
  }).catch((error) => {
    console.error("Could not estimate available browser storage.", error);
  });
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
