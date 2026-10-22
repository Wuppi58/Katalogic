"use strict";

(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
  const makeId = () => crypto.randomUUID();
  const now = () => new Date().toISOString();
  const DEFAULT_CATEGORIES = [
    "Videospiele", "Brettspiele", "Kartenspiele & Sammelkartenspiele",
    "Rollenspiele & Pen-and-Paper", "Gesellschaftsspiele", "Puzzles & Denkspiele",
    "Lernspiele", "Partyspiele", "Sport- & Geschicklichkeitsspiele",
    "Miniaturen- & Tabletop-Spiele", "Erweiterungen & DLCs", "Sonstige Spiele"
  ];
  const DEFAULT_TYPES = {
    "Videospiele": ["Videospiel", "Erweiterung / DLC", "Sammleredition"],
    "Brettspiele": ["Brettspiel", "Gesellschaftsspiel", "Erweiterung"],
    "Kartenspiele & Sammelkartenspiele": ["Sammelkartenspiel", "Kartenspiel", "Kartenset"],
    "Rollenspiele & Pen-and-Paper": ["Pen-and-Paper-Spiel", "Regelwerk", "Abenteuer / Erweiterung"],
    "Gesellschaftsspiele": ["Gesellschaftsspiel", "Partyspiel", "Lernspiel"],
    "Puzzles & Denkspiele": ["Puzzle", "Denkspiel", "Logikspiel"],
    "Lernspiele": ["Lernspiel", "Lehrmittel-Spiel"],
    "Partyspiele": ["Partyspiel", "Quizspiel", "Geschicklichkeitsspiel"],
    "Sport- & Geschicklichkeitsspiele": ["Sportspiel", "Geschicklichkeitsspiel"],
    "Miniaturen- & Tabletop-Spiele": ["Tabletop-Spiel", "Miniaturen", "Regelwerk", "Erweiterung"],
    "Erweiterungen & DLCs": ["DLC", "Spielerweiterung", "Zusatzinhalt"],
    "Sonstige Spiele": ["Sonstiges Spiel"]
  };
  const CONDITIONS = ["Schlecht", "Gebraucht", "Gut", "Sehr gut", "Wie neu", "Neu und originalverpackt"];
  const FUNCTIONALITIES = ["Funktioniert einwandfrei", "Eingeschränkt funktionsfähig", "Defekt", "Ungeprüft", "Nicht zutreffend"];
  const COMPLETENESS = ["Vollständig", "Teilweise vollständig", "Fehlende Teile", "Ungeprüft"];
  const FIELD_SETS = {
    video: [
      ["distribution", "Vertrieb", ["Physisch", "Digital", "Beides"]],
      ["medium", "Speichermedium", ["Disc", "Modul / Cartridge", "UMD", "UMD Film", "Speicherkarte", "Download Code", "Download", "Karte", "Sonstiges"]],
      ["ageRating", "Altersfreigabe", ["USK 0", "USK 6", "USK 12", "USK 16", "USK 18", "PEGI 3", "PEGI 7", "PEGI 12", "PEGI 16", "PEGI 18", "Unbekannt"]],
      ["playMode", "Spielmodus", ["Einzelspieler", "Mehrspieler", "Online", "Lokal & Online"]],
      ["editionType", "Speicher- / Editionstyp", null],
      ["dlc", "DLCs / Zusatzinhalte", null],
      ["discCondition", "Datenträgerzustand", null]
    ],
    board: [
      ["players", "Spieleranzahl", null], ["recommendedAge", "Empfohlenes Alter", null],
      ["duration", "Spieldauer", null], ["difficulty", "Schwierigkeitsgrad", ["Einfach", "Mittel", "Anspruchsvoll", "Variabel"]],
      ["rulesIncluded", "Spielanleitung", ["Vorhanden", "Fehlt", "Digital"]],
      ["partsCompleteness", "Vollständigkeit der Teile", ["Vollständig", "Teile fehlen", "Ungeprüft"]],
      ["boardCondition", "Zustand Spielbrett", null], ["cardsCondition", "Zustand Karten", null],
      ["figuresCondition", "Zustand Figuren", null], ["boxCondition", "Zustand Verpackung", null],
      ["expansions", "Erweiterungen", null]
    ],
    cards: [
      ["system", "Spielsystem", null], ["cardType", "Kartentyp", ["Sammelkarte", "Spielkarte", "Promokarte", "Sonstige"]],
      ["set", "Set / Edition", null], ["cardNumber", "Kartennummer", null],
      ["rarity", "Seltenheit", ["Gewöhnlich", "Ungewöhnlich", "Selten", "Sehr selten", "Promo", "Sonstige"]],
      ["foil", "Foil / Holo", ["Nein", "Foil", "Holo", "Reverse Holo", "Sonstige"]],
      ["cardCondition", "Zustand der Karten", ["Beschädigt", "Gespielt", "Gut", "Near Mint", "Mint"]],
      ["storage", "Zubehör / Aufbewahrung", null]
    ],
    tabletop: [
      ["system", "System / Regelwerk", null], ["rulebookEdition", "Regelwerk-Edition", null],
      ["miniatureCount", "Anzahl Miniaturen / Figuren", null],
      ["paintCondition", "Bemalungszustand", ["Unbemalt", "Grundiert", "Teilweise bemalt", "Bemalt", "Professionell bemalt"]],
      ["terrain", "Gelände / Spielbrett", null], ["rulebooks", "Regelbücher", null],
      ["expansions", "Regelbuch-Erweiterungen", null], ["partCount", "Anzahl Teile", null],
      ["partsCompleteness", "Vollständigkeit", ["Vollständig", "Teile fehlen", "Ungeprüft"]]
    ]
  };
  const PLATFORM_SUGGESTIONS = [
    "PC", "Steam", "PlayStation", "PlayStation 5", "PlayStation 4", "PlayStation 3",
    "Xbox Series X|S", "Xbox One", "Xbox 360", "Nintendo Switch", "Nintendo 3DS",
    "Nintendo DS", "Wii", "Game Boy", "Android", "iOS", "Dungeons & Dragons",
    "Pathfinder", "Warhammer 40.000", "Magic: The Gathering", "Pokémon TCG", "Yu-Gi-Oh!"
  ];
  const emptyDatabase = () => ({ games: [], accessories: [], customOptions: {}, view: "grid" });
  let database;
  let photosDraft = [];
  let specificsDraft = {};
  let editorMode = "create";
  let photoProcessing = false;
  let activeTab = "";
  let loadWarning = "";

  function normalizeDatabase(value) {
    const blank = emptyDatabase();
    return {
      games: Array.isArray(value?.games) ? value.games : [],
      accessories: Array.isArray(value?.accessories) ? value.accessories : [],
      customOptions: value?.customOptions && typeof value.customOptions === "object" && !Array.isArray(value.customOptions)
        ? value.customOptions
        : blank.customOptions,
      view: value?.view === "list" ? "list" : "grid"
    };
  }

  function loadDatabase() {
    try {
      return normalizeDatabase(window.KatalogicGameStorage.load());
    } catch (error) {
      console.error("Could not load saved games.", error);
      loadWarning = "Gespeicherte Spieldaten konnten nicht gelesen werden. Vorhandene Daten wurden nicht überschrieben.";
      return emptyDatabase();
    }
  }

  function saveDatabase(next) {
    window.KatalogicGameStorage.save(next);
    database = normalizeDatabase(next);
  }

  function report(element, message, isError = true) {
    element.textContent = message;
    element.classList.toggle("error", isError);
  }

  function updateDuplicateWarning() {
    const name = $("#game-name").value.trim();
    const normalizedName = name.toLocaleLowerCase("de");
    const matches = normalizedName
      ? database.games.filter((game) =>
        game.id !== $("#game-id").value &&
        String(game.name || "").trim().toLocaleLowerCase("de") === normalizedName)
      : [];
    const warning = $("#game-duplicate-warning");
    warning.classList.toggle("hidden", matches.length === 0);
    if (!matches.length) {
      report(warning, "", false);
      return;
    }
    const existing = uniqueSorted(matches.map((game) => [game.name, game.platform].filter(Boolean).join(" · ")));
    report(warning, `Hinweis: „${name}“ ist bereits vorhanden${existing.length ? ` (${existing.join(", ")})` : ""}. Du kannst trotzdem speichern, wenn es ein weiterer Eintrag sein soll.`);
  }

  function normalizeReleaseDate(value) {
    const input = value.trim();
    if (!input) return "";
    if (/^\d{4}$/.test(input)) {
      const year = Number(input);
      return year >= 1000 ? input : null;
    }
    const isoDate = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input);
    const germanDate = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(input);
    const [, yearText, monthText, dayText] = isoDate
      ? [isoDate[0], isoDate[1], isoDate[2], isoDate[3]]
      : germanDate
        ? [germanDate[0], germanDate[3], germanDate[2], germanDate[1]]
        : [];
    if (!yearText) return null;
    const year = Number(yearText);
    const month = Number(monthText);
    const day = Number(dayText);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (year < 1000 || date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
      return null;
    }
    return `${yearText}-${monthText}-${dayText}`;
  }

  function formatReleaseDate(value) {
    const normalized = normalizeReleaseDate(String(value || ""));
    if (!normalized || /^\d{4}$/.test(normalized)) return String(value || "");
    const [year, month, day] = normalized.split("-");
    return `${day}.${month}.${year}`;
  }

  function uniqueSorted(values) {
    return [...new Set(values.filter((value) => typeof value === "string" && value.trim()).map((value) => value.trim()))]
      .sort((a, b) => a.localeCompare(b, "de"));
  }

  function customValues(key) {
    return Array.isArray(database.customOptions[key]) ? database.customOptions[key] : [];
  }

  function fillSelect(select, values, placeholder, selected = "") {
    select.replaceChildren(new Option(placeholder, ""));
    for (const value of uniqueSorted(values)) select.add(new Option(value, value));
    select.add(new Option("＋ Eigenen Eintrag …", "__custom__"));
    if (selected && [...select.options].some((option) => option.value === selected)) select.value = selected;
    else if (selected) select.value = "__custom__";
  }

  function updateCategorySelect(selected = $("#game-category").value) {
    const values = uniqueSorted([...DEFAULT_CATEGORIES, ...customValues("categories")]);
    fillSelect($("#game-category"), values, "Kategorie auswählen", selected);
    $("#game-category").dispatchEvent(new Event("game-options-updated"));
    $("[data-game-custom='category']").classList.toggle("hidden", $("#game-category").value !== "__custom__");
    if ($("#game-category").value === "__custom__" && selected && !values.includes(selected)) {
      $("[data-game-custom='category']").value = selected;
    }
  }

  function updateTypeSelect(selected = $("#game-type").value) {
    const category = $("#game-category").value === "__custom__"
      ? $("[data-game-custom='category']").value.trim()
      : $("#game-category").value;
    const values = uniqueSorted([...(DEFAULT_TYPES[category] || []), ...customValues("types")]);
    fillSelect($("#game-type"), values, "Spielart auswählen", selected);
    $("[data-game-custom='type']").classList.toggle("hidden", $("#game-type").value !== "__custom__");
    if ($("#game-type").value === "__custom__" && selected && !values.includes(selected)) {
      $("[data-game-custom='type']").value = selected;
    }
    renderSpecificFields();
  }

  function selectedFieldValue(select, input) {
    return select.value === "__custom__" ? input.value.trim() : select.value;
  }

  function currentCategory() {
    return selectedFieldValue($("#game-category"), $("[data-game-custom='category']"));
  }

  function currentType() {
    return selectedFieldValue($("#game-type"), $("[data-game-custom='type']"));
  }

  function fieldSetFor(category, type) {
    const value = `${category} ${type}`.toLocaleLowerCase("de");
    if (/video|videospiel|dlc|digital|playstation|xbox|nintendo/.test(value)) return FIELD_SETS.video;
    if (/sammelkarten|kartenspiel|card|tcg/.test(value)) return FIELD_SETS.cards;
    if (/tabletop|miniatur|pen-and-paper|rollenspiel|regelwerk|dungeons/.test(value)) return FIELD_SETS.tabletop;
    if (/brett|gesellschaft|puzzle|denkspiel|lernspiel|partyspiel|sport|geschicklichkeit/.test(value)) return FIELD_SETS.board;
    return [];
  }

  function preserveSpecifics() {
    for (const input of $$("#game-specific-fields [data-specific]")) {
      const value = input.value.trim();
      if (value) specificsDraft[input.dataset.specific] = value;
      else delete specificsDraft[input.dataset.specific];
    }
  }

  function renderSpecificFields(values = specificsDraft) {
    const container = $("#game-specific-fields");
    if (!container) return;
    container.replaceChildren();
    for (const [key, label, options] of fieldSetFor(currentCategory(), currentType())) {
      const wrapper = document.createElement("label");
      wrapper.textContent = label;
      let input;
      if (options) {
        input = document.createElement("select");
        input.add(new Option("Bitte auswählen", ""));
        for (const option of options) input.add(new Option(option, option));
        input.add(new Option("Eigener Wert …", "__custom__"));
        const custom = document.createElement("input");
        custom.className = "game-specific-custom hidden";
        custom.placeholder = `Eigener Wert für ${label.toLocaleLowerCase("de")}`;
        custom.dataset.specificCustom = key;
        custom.value = values[key] && !options.includes(values[key]) ? values[key] : "";
        wrapper.append(input, custom);
        input.dataset.specific = key;
        const value = values[key] || "";
        input.value = options.includes(value) ? value : value ? "__custom__" : "";
        custom.classList.toggle("hidden", input.value !== "__custom__");
      } else {
        input = document.createElement("input");
        input.value = values[key] || "";
        input.dataset.specific = key;
        input.maxLength = 250;
        wrapper.append(input);
      }
      container.append(wrapper);
    }
  }

  function readSpecifics() {
    preserveSpecifics();
    for (const input of $$("#game-specific-fields [data-specific]")) {
      const custom = $(`[data-specific-custom="${CSS.escape(input.dataset.specific)}"]`);
      const value = input.value === "__custom__" && custom ? custom.value.trim() : input.value.trim();
      if (value) specificsDraft[input.dataset.specific] = value;
      else delete specificsDraft[input.dataset.specific];
    }
    return { ...specificsDraft };
  }

  function addCustomField(entry = {}) {
    const row = document.createElement("div");
    row.className = "game-repeat-row game-custom-field-row";
    row.innerHTML = `<label>Feldname<input data-field="key" maxlength="80" value="${escapeHtml(entry.key)}" placeholder="z. B. Spielerzahl"></label><label>Wert<input data-field="value" maxlength="250" value="${escapeHtml(entry.value)}"></label><button class="icon-button game-row-remove" type="button" aria-label="Eigenes Feld entfernen">×</button>`;
    $("#game-custom-field-list").append(row);
  }

  function addAccessoryRow(entry = {}) {
    const row = document.createElement("div");
    row.className = "game-repeat-row game-accessory-row";
    row.dataset.id = entry.id || makeId();
    const title = document.createElement("div");
    title.className = "game-repeat-heading";
    title.innerHTML = `<strong>${escapeHtml(entry.name || "Zubehör")}</strong><button class="icon-button game-row-remove" type="button" aria-label="Zubehör entfernen">×</button>`;
    const fields = document.createElement("div");
    fields.className = "game-accessory-grid";
    const descriptors = [
      ["name", "Name", "text"], ["type", "Zubehörtyp", "text"], ["manufacturer", "Hersteller", "text"],
      ["quantity", "Menge", "number"], ["condition", "Zustand", "text"],
      ["functionality", "Funktionsfähigkeit", "text"], ["notes", "Notizen", "text"]
    ];
    for (const [key, label, inputType] of descriptors) {
      const wrapper = document.createElement("label");
      wrapper.textContent = label;
      const input = document.createElement("input");
      input.type = inputType;
      input.dataset.field = key;
      input.maxLength = 300;
      if (inputType === "number") {
        input.min = "1";
        input.step = "1";
        input.value = String(entry.quantity || 1);
      } else input.value = entry[key] || "";
      wrapper.append(input);
      fields.append(wrapper);
    }
    const linkLabel = document.createElement("label");
    linkLabel.className = "game-accessory-links";
    linkLabel.textContent = "Mit weiteren Spielen verknüpfen";
    const links = document.createElement("select");
    links.multiple = true;
    links.size = 3;
    links.dataset.field = "gameIds";
    for (const game of database.games) {
      if (game.id === $("#game-id").value) continue;
      const option = new Option(game.name, game.id);
      option.selected = (entry.gameIds || []).includes(game.id);
      links.add(option);
    }
    linkLabel.append(links);
    fields.append(linkLabel);
    row.append(title, fields);
    $("#game-accessories").append(row);
  }

  function linkedAccessories(gameId) {
    return database.accessories.filter((accessory) => (accessory.gameIds || []).includes(gameId));
  }

  function paintAccessories(gameId, duplicate = false) {
    $("#game-accessories").replaceChildren();
    linkedAccessories(gameId).forEach((entry) => addAccessoryRow(duplicate
      ? { ...entry, id: makeId(), gameIds: [] }
      : entry));
  }

  function readAccessoryRows(gameId) {
    return $$(".game-accessory-row", $("#game-accessories")).map((row) => {
      const accessory = { id: row.dataset.id, gameIds: [] };
      for (const input of $$("[data-field]", row)) {
        accessory[input.dataset.field] = input.multiple
          ? [...input.selectedOptions].map((option) => option.value)
          : input.type === "number" ? Math.max(1, Number(input.value) || 1) : input.value.trim();
      }
      if (!accessory.name) return null;
      accessory.gameIds.push(gameId, ...accessory.gameIds);
      return { ...accessory, gameIds: [...new Set(accessory.gameIds)] };
    }).filter(Boolean);
  }

  function renderPhotoGallery() {
    const gallery = $("#game-photo-gallery");
    gallery.replaceChildren();
    if (!photosDraft.length) {
      const empty = document.createElement("p");
      empty.className = "game-empty-hint";
      empty.textContent = "Noch keine Bilder hinzugefügt.";
      gallery.append(empty);
      return;
    }
    photosDraft.forEach((photo, index) => {
      const figure = document.createElement("figure");
      figure.className = "game-photo";
      const image = document.createElement("img");
      image.src = photo;
      image.alt = `Spielbild ${index + 1}`;
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "icon-button";
      remove.dataset.removePhoto = String(index);
      remove.setAttribute("aria-label", `Bild ${index + 1} entfernen`);
      remove.textContent = "×";
      figure.append(image, remove);
      gallery.append(figure);
    });
  }

  function setCustomChoice(select, customInput, value, options) {
    if (options.includes(value)) {
      select.value = value;
      customInput.value = "";
      customInput.classList.add("hidden");
    } else if (value) {
      select.value = "__custom__";
      customInput.value = value;
      customInput.classList.remove("hidden");
    } else {
      select.value = "";
      customInput.value = "";
      customInput.classList.add("hidden");
    }
  }

  function fillDatalists() {
    const values = {
      "#game-platform-options": [...PLATFORM_SUGGESTIONS, ...customValues("platforms"), ...database.games.map((game) => game.platform)],
      "#game-developer-options": database.games.map((game) => game.developer),
      "#game-publisher-options": database.games.map((game) => game.publisher),
      "#game-genre-options": database.games.map((game) => game.genre),
      "#game-language-options": database.games.map((game) => game.language)
    };
    for (const [selector, entries] of Object.entries(values)) {
      const list = $(selector);
      list.replaceChildren(...uniqueSorted(entries).map((value) => new Option(value, value)));
    }
  }

  function clearForm() {
    $("#game-form").reset();
    $("#game-id").value = makeId();
    $("#game-quantity").value = "1";
    photosDraft = [];
    specificsDraft = {};
    $("#game-custom-field-list").replaceChildren();
    $("#game-accessories").replaceChildren();
    updateCategorySelect("");
    $("[data-game-custom='category']").value = "";
    updateTypeSelect("");
    $("[data-game-custom='type']").value = "";
    $("#inventory-game-condition").value = CONDITIONS[2];
    $("#game-functionality").value = FUNCTIONALITIES[3];
    $("#game-completeness").value = COMPLETENESS[3];
    renderPhotoGallery();
    report($("#game-form-message"), "", false);
    updateDuplicateWarning();
  }

  function showEditor(mode, game) {
    editorMode = mode;
    $("#game-detail").classList.add("hidden");
    $("#game-editor").classList.remove("hidden");
    $("#game-editor-heading").textContent = mode === "edit" ? "Spiel bearbeiten" : mode === "duplicate" ? "Spiel duplizieren" : "Spiel hinzufügen";
    clearForm();
    const data = game || {};
    const legacyYear = /^\d{4}$/.test(String(data.releaseDate || "")) ? data.releaseDate : "";
    $("#game-id").value = mode === "edit" && game ? game.id : mode === "duplicate" ? makeId() : $("#game-id").value;
    updateCategorySelect(data.category || "");
    const categoryOptions = uniqueSorted([...DEFAULT_CATEGORIES, ...customValues("categories")]);
    setCustomChoice($("#game-category"), $("[data-game-custom='category']"), data.category || "", categoryOptions);
    updateTypeSelect(data.type || "");
    const typeOptions = uniqueSorted([...(DEFAULT_TYPES[data.category] || []), ...customValues("types")]);
    setCustomChoice($("#game-type"), $("[data-game-custom='type']"), data.type || "", typeOptions);
    specificsDraft = structuredClone(data.specifics || {});
    renderSpecificFields();
    const fieldMap = {
      name: "game-name", subtitle: "game-subtitle", platform: "inventory-game-platform", developer: "inventory-game-developer",
      publisher: "inventory-game-publisher", genre: "game-genre", language: "game-language", region: "inventory-game-region",
      releaseDate: "game-release-date", barcode: "game-barcode", sku: "game-sku", quantity: "game-quantity",
      description: "game-description", condition: "inventory-game-condition", functionality: "game-functionality",
      completeness: "game-completeness", purchaseDate: "inventory-game-purchase-date", purchasePrice: "inventory-game-purchase-price",
      estimatedValue: "game-estimated-value", source: "game-source", location: "game-location",
      mediaCondition: "game-media-condition", packaging: "game-packaging", manual: "inventory-game-manual",
      loanBorrower: "game-loan-borrower", loanDate: "game-loan-date"
    };
    for (const [key, selector] of Object.entries(fieldMap)) {
      const value = data[key];
      if (value !== undefined && value !== null) {
        if (key === "releaseDate" && /^\d{4}$/.test(String(value))) continue;
        $(`#${selector}`).value = String(value);
      }
    }
    $("#game-release-year").value = data.releaseYear || legacyYear;
    updateDuplicateWarning();
    if (mode === "duplicate") {
      $("#game-barcode").value = "";
      $("#game-sku").value = "";
      $("#game-loan-borrower").value = "";
      $("#game-loan-date").value = "";
    }
    photosDraft = Array.isArray(data.photos) ? [...data.photos] : [];
    renderPhotoGallery();
    for (const entry of data.customFields || []) addCustomField(entry);
    paintAccessories(game?.id || "", mode === "duplicate");
    $("#game-editor").scrollIntoView({ behavior: "smooth", block: "start" });
    $("#game-name").focus({ preventScroll: true });
  }

  function readCustomFields() {
    return $$(".game-custom-field-row", $("#game-custom-field-list"))
      .map((row) => ({
        key: $("[data-field='key']", row).value.trim(),
        value: $("[data-field='value']", row).value.trim()
      }))
      .filter((entry) => entry.key && entry.value);
  }

  function collectGame() {
    const value = (selector) => $(selector).value.trim();
    const number = (selector) => $(selector).value === "" ? null : Number($(selector).value);
    return {
      id: $("#game-id").value || makeId(),
      name: value("#game-name"),
      subtitle: value("#game-subtitle"),
      category: currentCategory(),
      type: currentType(),
      platform: value("#inventory-game-platform"),
      developer: value("#inventory-game-developer"),
      publisher: value("#inventory-game-publisher"),
      genre: value("#game-genre"),
      language: value("#game-language"),
      region: value("#inventory-game-region"),
      releaseYear: value("#game-release-year"),
      releaseDate: normalizeReleaseDate(value("#game-release-date")),
      barcode: value("#game-barcode"),
      sku: value("#game-sku"),
      quantity: Math.max(1, Number($("#game-quantity").value) || 1),
      description: value("#game-description"),
      condition: value("#inventory-game-condition"),
      functionality: value("#game-functionality"),
      completeness: value("#game-completeness"),
      purchaseDate: value("#inventory-game-purchase-date"),
      purchasePrice: number("#inventory-game-purchase-price"),
      estimatedValue: number("#game-estimated-value"),
      source: value("#game-source"),
      location: value("#game-location"),
      mediaCondition: value("#game-media-condition"),
      packaging: value("#game-packaging"),
      manual: value("#inventory-game-manual"),
      loanBorrower: value("#game-loan-borrower"),
      loanDate: value("#game-loan-date"),
      specifics: readSpecifics(),
      customFields: readCustomFields(),
      photos: [...photosDraft],
      updatedAt: now()
    };
  }

  function addCustomSelection(key, value) {
    const trimmed = value.trim();
    if (!trimmed) return false;
    const next = structuredClone(database);
    next.customOptions[key] = uniqueSorted([...customValues(key), trimmed]);
    try {
      saveDatabase(next);
      renderAll();
      return true;
    } catch (error) {
      console.error("Could not save custom game selection.", error);
      report($("#game-result-count"), "Eigener Auswahlwert konnte nicht gespeichert werden.");
      return false;
    }
  }

  function submitGame(event) {
    event.preventDefault();
    if (photoProcessing) return report($("#game-form-message"), "Warte bitte, bis die Bildverarbeitung abgeschlossen ist.");
    if (!$("#game-form").reportValidity()) return;
    const releaseDate = normalizeReleaseDate($("#game-release-date").value);
    if (releaseDate === null) {
      $("#game-release-date").focus();
      return report($("#game-form-message"), "Bitte gib ein gültiges vollständiges Erscheinungsdatum ein.");
    }
    const game = collectGame();
    game.releaseDate = releaseDate;
    if (!game.name) return report($("#game-form-message"), "Bitte gib einen Spielnamen ein.");
    if (!game.category) return report($("#game-form-message"), "Bitte wähle oder ergänze eine Spielkategorie.");
    if (!game.type) return report($("#game-form-message"), "Bitte wähle oder ergänze eine Spielart.");
    if ([game.purchasePrice, game.estimatedValue].some((amount) => amount !== null && (!Number.isFinite(amount) || amount < 0))) {
      return report($("#game-form-message"), "Preis und Wert müssen gültige positive Beträge sein.");
    }
    updateDuplicateWarning();
    const next = structuredClone(database);
    const index = next.games.findIndex((entry) => entry.id === game.id);
    const wasEditing = index >= 0;
    if (wasEditing) next.games[index] = game;
    else next.games.push(game);
    next.customOptions.categories = uniqueSorted([...customValues("categories"), ...(!DEFAULT_CATEGORIES.includes(game.category) ? [game.category] : [])]);
    const customTypeValues = Object.values(DEFAULT_TYPES).flat();
    next.customOptions.types = uniqueSorted([...customValues("types"), ...(!customTypeValues.includes(game.type) ? [game.type] : [])]);
    if (game.platform) next.customOptions.platforms = uniqueSorted([...customValues("platforms"), game.platform]);
    next.accessories = next.accessories
      .map((entry) => ({ ...entry, gameIds: (entry.gameIds || []).filter((gameId) => gameId !== game.id) }))
      .filter((entry) => entry.gameIds.length);
    const accessoryRows = readAccessoryRows(game.id);
    for (const accessory of accessoryRows) {
      const old = database.accessories.find((entry) => entry.id === accessory.id);
      const otherGameIds = old ? old.gameIds.filter((gameId) => gameId !== game.id && database.games.some((item) => item.id === gameId)) : [];
      accessory.gameIds = [...new Set([...accessory.gameIds, ...otherGameIds])];
      const previousIndex = next.accessories.findIndex((entry) => entry.id === accessory.id);
      if (previousIndex >= 0) next.accessories[previousIndex] = accessory;
      else next.accessories.push(accessory);
    }
    try {
      saveDatabase(next);
    } catch (error) {
      console.error("Could not save game.", error);
      return report($("#game-form-message"), "Spiel konnte nicht gespeichert werden. Prüfe den verfügbaren Speicherplatz.");
    }
    $("#game-editor").classList.add("hidden");
    $("#game-detail").classList.add("hidden");
    activeTab = game.category;
    renderAll();
    report($("#game-result-count"), wasEditing ? "Spiel aktualisiert." : editorMode === "duplicate" ? "Spiel als eigener Datensatz dupliziert." : "Spiel gespeichert.", false);
  }

  function getFilteredGames() {
    const query = $("#game-query").value.trim().toLocaleLowerCase("de");
    const platform = $("#game-filter-platform").value.trim().toLocaleLowerCase("de");
    const minPrice = $("#game-filter-price-min").value;
    const maxPrice = $("#game-filter-price-max").value;
    const type = $("#game-filter-type").value;
    const condition = $("#game-filter-condition").value;
    const functionality = $("#game-filter-function").value;
    const completeness = $("#game-filter-completeness").value;
    const matches = database.games.filter((game) => {
      if (activeTab && game.category !== activeTab) return false;
      if (type && game.type !== type) return false;
      if (condition && game.condition !== condition) return false;
      if (functionality && game.functionality !== functionality) return false;
      if (completeness && game.completeness !== completeness) return false;
      if (platform && !String(game.platform || "").toLocaleLowerCase("de").includes(platform)) return false;
      if (minPrice !== "" && (game.purchasePrice == null || game.purchasePrice < Number(minPrice))) return false;
      if (maxPrice !== "" && (game.purchasePrice == null || game.purchasePrice > Number(maxPrice))) return false;
      if (query) {
        const accessoryText = linkedAccessories(game.id).map((item) => [item.name, item.type, item.notes].join(" ")).join(" ");
        const text = [
          game.name, game.subtitle, game.category, game.type, game.platform, game.developer,
          game.publisher, game.genre, game.language, game.region, game.barcode, game.sku,
          game.releaseYear, game.description, game.location, game.source, game.condition, game.functionality,
          game.completeness, ...Object.values(game.specifics || {}),
          ...(game.customFields || []).flatMap((entry) => [entry.key, entry.value]), accessoryText
        ].filter(Boolean).join(" ").toLocaleLowerCase("de");
        if (!text.includes(query)) return false;
      }
      return true;
    });
    const sortKey = $("#game-sort").value;
    const direction = $("#game-sort-direction").value === "desc" ? -1 : 1;
    const conditionOrder = CONDITIONS;
    return matches.sort((a, b) => {
      let first = a[sortKey] ?? "";
      let second = b[sortKey] ?? "";
      if (sortKey === "condition") {
        first = conditionOrder.indexOf(first);
        second = conditionOrder.indexOf(second);
      }
      if (typeof first === "number" || typeof second === "number") return ((Number(first) || 0) - (Number(second) || 0)) * direction;
      return String(first).localeCompare(String(second), "de", { numeric: true }) * direction;
    });
  }

  function renderTabs() {
    const categories = uniqueSorted([...DEFAULT_CATEGORIES, ...customValues("categories"), ...database.games.map((game) => game.category)]);
    const container = $("#game-category-tabs");
    container.replaceChildren();
    const addTab = (label, value, count) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "game-category-tab";
      button.role = "tab";
      button.setAttribute("aria-selected", String(activeTab === value));
      button.textContent = `${label} (${count})`;
      button.addEventListener("click", () => {
        activeTab = value;
        renderTabs();
        renderGames();
      });
      container.append(button);
    };
    addTab("Alle Spiele", "", database.games.length);
    for (const category of categories) addTab(category, category, database.games.filter((game) => game.category === category).length);
  }

  function formatMoney(value) {
    return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(value);
  }

  function gameSummary(game) {
    return [
      game.category, game.type, game.platform, game.releaseYear, game.publisher || game.developer,
      game.condition, game.functionality, game.completeness,
      `${game.quantity || 1} ${game.quantity === 1 ? "Exemplar" : "Exemplare"}`,
      game.location, game.loanBorrower ? `Verliehen an ${game.loanBorrower}${game.loanDate ? ` (${game.loanDate})` : ""}` : "",
      game.purchasePrice == null ? "" : `Kauf ${formatMoney(game.purchasePrice)}`,
      game.estimatedValue == null ? "" : `Wert ${formatMoney(game.estimatedValue)}`
    ].filter(Boolean).join(" · ");
  }

  function renderGames() {
    const container = $("#game-cards");
    container.replaceChildren();
    const games = getFilteredGames();
    const total = database.games.length;
    report($("#game-result-count"), `${games.length} von ${total} Spielen`, false);
    container.classList.toggle("is-list", database.view === "list");
    if (!games.length) {
      const empty = document.createElement("div");
      empty.className = "game-empty-state";
      empty.innerHTML = `<span aria-hidden="true">♟</span><h3>${total ? "Keine passenden Spiele gefunden." : "Deine Spielesammlung ist noch leer."}</h3><p>${total ? "Passe Suche oder Filter an." : "Füge ein Videospiel, Brettspiel, Kartenspiel oder eine andere Spielart hinzu."}</p>`;
      container.append(empty);
      return;
    }
    for (const game of games) {
      const card = document.createElement("article");
      card.className = "game-card";
      const image = game.photos?.[0];
      if (image) {
        const img = document.createElement("img");
        img.src = image;
        img.alt = `Cover: ${game.name}`;
        img.loading = "lazy";
        card.append(img);
      } else {
        const placeholder = document.createElement("div");
        placeholder.className = "game-card-placeholder";
        placeholder.textContent = "♟";
        placeholder.setAttribute("aria-hidden", "true");
        card.append(placeholder);
      }
      const content = document.createElement("div");
      content.className = "game-card-content";
      const heading = document.createElement("div");
      heading.className = "game-card-title";
      const title = document.createElement("h3");
      title.textContent = game.name;
      const subtitle = document.createElement("p");
      subtitle.textContent = [game.subtitle, game.platform].filter(Boolean).join(" · ");
      const meta = document.createElement("p");
      meta.className = "game-card-meta";
      meta.textContent = gameSummary(game);
      const actions = document.createElement("div");
      actions.className = "game-card-actions";
      const detail = document.createElement("button");
      detail.type = "button";
      detail.className = "button button-secondary";
      detail.textContent = "Details";
      detail.dataset.gameAction = "view";
      const edit = document.createElement("button");
      edit.type = "button";
      edit.className = "button button-secondary";
      edit.textContent = "Bearbeiten";
      edit.dataset.gameAction = "edit";
      const duplicate = document.createElement("button");
      duplicate.type = "button";
      duplicate.className = "button button-secondary";
      duplicate.textContent = "Duplizieren";
      duplicate.dataset.gameAction = "duplicate";
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "icon-button";
      remove.textContent = "×";
      remove.setAttribute("aria-label", `${game.name} löschen`);
      remove.dataset.gameAction = "delete";
      for (const button of [detail, edit, duplicate, remove]) button.dataset.id = game.id;
      heading.append(title, subtitle);
      actions.append(detail, edit, duplicate, remove);
      content.append(heading, meta, actions);
      card.append(content);
      container.append(card);
    }
  }

  function detailSection(title, values) {
    const entries = Array.isArray(values) ? values : Object.entries(values);
    const rows = entries.filter(([, value]) => value !== "" && value !== null && value !== undefined);
    if (!rows.length) return "";
    return `<section class="game-detail-section"><h4>${escapeHtml(title)}</h4><dl>${rows.map(([label, value]) => `<div class="game-detail-row"><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}</dl></section>`;
  }

  function renderDetail(gameId) {
    const game = database.games.find((entry) => entry.id === gameId);
    if (!game) return;
    const photos = (game.photos || []).map((photo, index) => `<figure><img src="${escapeHtml(photo)}" alt="${escapeHtml(game.name)} – Bild ${index + 1}" loading="lazy"></figure>`).join("");
    const specificLabels = new Map(Object.values(FIELD_SETS).flat().map(([key, label]) => [key, label]));
    const specifics = Object.entries(game.specifics || {}).map(([key, value]) => [specificLabels.get(key) || key, value]);
    const customFields = (game.customFields || []).map((entry) => [entry.key, entry.value]);
    const accessories = linkedAccessories(game.id).map((entry) => [entry.name, [
      entry.type, entry.manufacturer, `Menge: ${entry.quantity || 1}`, entry.condition,
      entry.functionality, entry.notes,
      (entry.gameIds || []).length > 1 ? `Geteilt mit ${entry.gameIds.length - 1} weiteren Spiel(en)` : ""
    ].filter(Boolean).join(" · ")]);
    const detail = $("#game-detail");
    detail.innerHTML = `<div class="game-detail-heading"><div><p class="eyebrow">SPIELDETAILS</p><h3 id="game-detail-heading">${escapeHtml(game.name)}</h3><p class="muted">${escapeHtml([game.category, game.type, game.platform].filter(Boolean).join(" · "))}</p></div><div class="game-detail-actions"><button class="button button-secondary" type="button" data-game-detail-action="edit" data-id="${escapeHtml(game.id)}">Bearbeiten</button><button class="button button-secondary" type="button" data-game-detail-action="duplicate" data-id="${escapeHtml(game.id)}">Duplizieren</button><button class="button button-secondary" type="button" data-game-detail-action="delete" data-id="${escapeHtml(game.id)}">Löschen</button><button class="icon-button" type="button" data-game-detail-action="close" aria-label="Details schließen">×</button></div></div>${photos ? `<div class="game-detail-gallery">${photos}</div>` : ""}<div class="game-detail-grid">${detailSection("Stammdaten", [["Untertitel / Edition", game.subtitle], ["Kategorie", game.category], ["Spielart", game.type], ["Plattform / System", game.platform], ["Entwickler", game.developer], ["Publisher / Verlag", game.publisher], ["Genre", game.genre], ["Sprache", game.language], ["Region / Edition", game.region], ["Erscheinungsjahr", game.releaseYear || (/^\d{4}$/.test(String(game.releaseDate || "")) ? game.releaseDate : "")], ["Erscheinungsdatum", /^\d{4}$/.test(String(game.releaseDate || "")) ? "" : formatReleaseDate(game.releaseDate)], ["EAN / ISBN", game.barcode], ["Artikelnummer", game.sku], ["Exemplare", game.quantity]])}${detailSection("Sammlung & Zustand", [["Zustand", game.condition], ["Funktionsfähigkeit", game.functionality], ["Vollständigkeit", game.completeness], ["Datenträgerzustand", game.mediaCondition], ["Hülle / Verpackung", game.packaging], ["Anleitung", game.manual], ["Standort", game.location], ["Verliehen an", game.loanBorrower], ["Verliehen am", game.loanDate]])}${detailSection("Kauf & Wert", [["Kaufdatum", game.purchaseDate], ["Kaufpreis", game.purchasePrice == null ? "" : formatMoney(game.purchasePrice)], ["Geschätzter Wert", game.estimatedValue == null ? "" : formatMoney(game.estimatedValue)], ["Kaufort / Händler", game.source]])}${detailSection("Spielartspezifische Daten", specifics)}${detailSection("Eigene Datenfelder", customFields)}${detailSection("Beschreibung & Notizen", [["Beschreibung", game.description]])}${detailSection("Zubehör & Erweiterungen", accessories)}</div>`;
    detail.classList.remove("hidden");
    detail.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function deleteGame(game) {
    if (!window.confirm(`„${game.name}“ und ausschließlich diesem Spiel zugeordnete Zubehörteile endgültig löschen?`)) return;
    const next = structuredClone(database);
    next.games = next.games.filter((entry) => entry.id !== game.id);
    next.accessories = next.accessories
      .map((entry) => ({ ...entry, gameIds: entry.gameIds.filter((id) => id !== game.id) }))
      .filter((entry) => entry.gameIds.length);
    try {
      saveDatabase(next);
      $("#game-detail").classList.add("hidden");
      renderAll();
      report($("#game-result-count"), "Spiel und ausschließlich zugeordnete Zubehördaten gelöscht.", false);
    } catch (error) {
      console.error("Could not delete game.", error);
      report($("#game-result-count"), "Löschen fehlgeschlagen. Die Spieldaten wurden nicht geändert.");
    }
  }

  function renderAll() {
    fillDatalists();
    fillFilters();
    renderTabs();
    renderGames();
  }

  function fillFilters() {
    const setup = (selector, values, label) => {
      const select = $(selector);
      const old = select.value;
      select.replaceChildren(new Option(label, ""), ...uniqueSorted(values).map((value) => new Option(value, value)));
      if (values.includes(old)) select.value = old;
    };
    setup("#game-filter-type", database.games.map((game) => game.type), "Alle Spielarten");
    setup("#game-filter-condition", CONDITIONS, "Alle Zustände");
    setup("#game-filter-function", FUNCTIONALITIES, "Alle Funktionsstände");
    setup("#game-filter-completeness", COMPLETENESS, "Alle Vollständigkeiten");
  }

  function clearFilters() {
    for (const selector of ["#game-query", "#game-filter-platform", "#game-filter-price-min", "#game-filter-price-max"]) $(selector).value = "";
    for (const selector of ["#game-filter-type", "#game-filter-condition", "#game-filter-function", "#game-filter-completeness"]) $(selector).value = "";
    $("#game-sort").value = "name";
    $("#game-sort-direction").value = "asc";
    activeTab = "";
    renderAll();
  }

  async function resizePhoto(file) {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error(`${file.name}: Bitte ein JPEG-, PNG- oder WebP-Bild auswählen.`);
    if (file.size > 12 * 1024 * 1024) throw new Error(`${file.name}: Die Bilddatei darf höchstens 12 MB groß sein.`);
    const bitmap = await createImageBitmap(file);
    try {
      let scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
      let quality = 0.82;
      for (let attempt = 0; attempt < 10; attempt += 1) {
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(bitmap.width * scale));
        canvas.height = Math.max(1, Math.round(bitmap.height * scale));
        const context = canvas.getContext("2d");
        if (!context) throw new Error(`${file.name}: Bild konnte nicht verarbeitet werden.`);
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
        if (!blob) throw new Error(`${file.name}: Bild konnte nicht verarbeitet werden.`);
        if (blob.size <= 350 * 1024) {
          return await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.addEventListener("load", () => resolve(reader.result), { once: true });
            reader.addEventListener("error", () => reject(new Error(`${file.name}: Bild konnte nicht gelesen werden.`)), { once: true });
            reader.readAsDataURL(blob);
          });
        }
        if (quality > 0.5) quality -= 0.08;
        else scale *= 0.75;
      }
      throw new Error(`${file.name}: Bild ließ sich nicht ausreichend verkleinern.`);
    } finally {
      bitmap.close();
    }
  }

  $("#game-create").addEventListener("click", () => showEditor("create"));
  $("#game-editor-close").addEventListener("click", () => $("#game-editor").classList.add("hidden"));
  $("#game-editor-cancel").addEventListener("click", () => $("#game-editor").classList.add("hidden"));
  $("#game-form").addEventListener("submit", submitGame);
  $("#game-name").addEventListener("input", updateDuplicateWarning);
  $("#game-category").addEventListener("change", () => {
    const input = $("[data-game-custom='category']");
    input.classList.toggle("hidden", $("#game-category").value !== "__custom__");
    if ($("#game-category").value !== "__custom__") input.value = "";
    updateTypeSelect("");
  });
  $("[data-game-custom='category']").addEventListener("input", () => updateTypeSelect(""));
  $("#game-type").addEventListener("change", () => {
    const input = $("[data-game-custom='type']");
    input.classList.toggle("hidden", $("#game-type").value !== "__custom__");
    if ($("#game-type").value !== "__custom__") input.value = "";
    preserveSpecifics();
    renderSpecificFields();
  });
  $("[data-game-custom='type']").addEventListener("input", () => {
    preserveSpecifics();
    renderSpecificFields();
  });
  $("#game-specific-fields").addEventListener("input", (event) => {
    if (event.target.matches("[data-specific]")) preserveSpecifics();
    if (event.target.matches("[data-specific-custom]")) specificsDraft[event.target.dataset.specificCustom] = event.target.value.trim();
  });
  $("#game-specific-fields").addEventListener("change", (event) => {
    if (!event.target.matches("[data-specific]")) return;
    const custom = $(`[data-specific-custom="${CSS.escape(event.target.dataset.specific)}"]`);
    if (custom) {
      custom.classList.toggle("hidden", event.target.value !== "__custom__");
      if (event.target.value !== "__custom__") specificsDraft[event.target.dataset.specific] = event.target.value;
    }
  });
  $("#game-add-custom-field").addEventListener("click", () => addCustomField());
  $("#game-add-accessory").addEventListener("click", () => addAccessoryRow());
  $("#game-custom-field-list").addEventListener("click", (event) => {
    if (event.target.closest(".game-row-remove")) event.target.closest(".game-repeat-row").remove();
  });
  $("#game-accessories").addEventListener("click", (event) => {
    if (event.target.closest(".game-row-remove")) event.target.closest(".game-repeat-row").remove();
  });
  $("#game-photos-input").addEventListener("change", async (event) => {
    const files = [...event.target.files];
    event.target.value = "";
    window.updateLocalizedFileInput?.(event.target);
    const remaining = 8 - photosDraft.length;
    photoProcessing = true;
    try {
      for (const file of files.slice(0, remaining)) photosDraft.push(await resizePhoto(file));
      if (files.length > remaining) report($("#game-form-message"), `Maximal acht Bilder je Spiel; ${remaining} weitere wurden verarbeitet.`, false);
      renderPhotoGallery();
    } catch (error) {
      console.error("Could not add game photo.", error);
      report($("#game-form-message"), error.message);
    } finally {
      photoProcessing = false;
    }
  });
  $("#game-photo-gallery").addEventListener("click", (event) => {
    const button = event.target.closest("[data-remove-photo]");
    if (!button) return;
    photosDraft.splice(Number(button.dataset.removePhoto), 1);
    renderPhotoGallery();
  });
  $("#game-form").addEventListener("click", (event) => {
    if (!event.target.closest("[data-loan-return='game']")) return;
    $("#game-loan-borrower").value = "";
    $("#game-loan-date").value = "";
    report($("#game-form-message"), "Spiel zurück erhalten – Ausleihdaten gelöscht. Zum Übernehmen bitte speichern.", false);
  });

  $("#game-cards").addEventListener("click", (event) => {
    const button = event.target.closest("[data-game-action]");
    if (!button) return;
    const game = database.games.find((entry) => entry.id === button.dataset.id);
    if (!game) return;
    if (button.dataset.gameAction === "view") renderDetail(game.id);
    if (button.dataset.gameAction === "edit") showEditor("edit", game);
    if (button.dataset.gameAction === "duplicate") showEditor("duplicate", game);
    if (button.dataset.gameAction === "delete") deleteGame(game);
  });
  $("#game-detail").addEventListener("click", (event) => {
    const button = event.target.closest("[data-game-detail-action]");
    if (!button) return;
    if (button.dataset.gameDetailAction === "close") {
      $("#game-detail").classList.add("hidden");
      return;
    }
    const game = database.games.find((entry) => entry.id === button.dataset.id);
    if (!game) return;
    if (button.dataset.gameDetailAction === "edit") showEditor("edit", game);
    if (button.dataset.gameDetailAction === "duplicate") showEditor("duplicate", game);
    if (button.dataset.gameDetailAction === "delete") deleteGame(game);
  });
  $("#game-category-tabs").addEventListener("keydown", (event) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    const tabs = $$(".game-category-tab", $("#game-category-tabs"));
    const current = tabs.indexOf(document.activeElement);
    const direction = event.key === "ArrowRight" ? 1 : -1;
    tabs[(current + direction + tabs.length) % tabs.length]?.focus();
  });
  $("#game-query").addEventListener("input", renderGames);
  for (const selector of [
    "#game-filter-type", "#game-filter-condition", "#game-filter-function", "#game-filter-completeness",
    "#game-filter-platform", "#game-filter-price-min", "#game-filter-price-max", "#game-sort", "#game-sort-direction"
  ]) $(selector).addEventListener("input", renderGames);
  $("#game-clear-filters").addEventListener("click", clearFilters);
  $("#game-view-grid").addEventListener("click", () => {
    database.view = "grid";
    $("#game-view-grid").setAttribute("aria-pressed", "true");
    $("#game-view-list").setAttribute("aria-pressed", "false");
    renderGames();
    try { saveDatabase(database); } catch (error) {
      console.error("Could not save game view preference.", error);
      report($("#game-result-count"), "Ansicht konnte nicht gespeichert werden.");
    }
  });
  $("#game-view-list").addEventListener("click", () => {
    database.view = "list";
    $("#game-view-grid").setAttribute("aria-pressed", "false");
    $("#game-view-list").setAttribute("aria-pressed", "true");
    renderGames();
    try { saveDatabase(database); } catch (error) {
      console.error("Could not save game view preference.", error);
      report($("#game-result-count"), "Ansicht konnte nicht gespeichert werden.");
    }
  });
  $("#library-search-results").addEventListener("click", (event) => {
    const button = event.target.closest("[data-open-game]");
    if (!button) return;
    const game = database.games.find((entry) => entry.id === button.dataset.openGame);
    if (!game) return;
    activeTab = game.category;
    renderAll();
    $('[data-view="games"]').click();
    renderDetail(game.id);
  });
  $("#game-save-category").addEventListener("click", () => {
    const input = $("#game-new-category");
    if (addCustomSelection("categories", input.value)) input.value = "";
  });
  $("#game-save-type").addEventListener("click", () => {
    const input = $("#game-new-type");
    if (addCustomSelection("types", input.value)) input.value = "";
  });
  $("#game-save-platform").addEventListener("click", () => {
    const input = $("#game-new-platform");
    if (addCustomSelection("platforms", input.value)) input.value = "";
  });
  window.addEventListener("katalogic:game-inventory-imported", () => {
    try {
      database = loadDatabase();
      $("#game-editor").classList.add("hidden");
      $("#game-detail").classList.add("hidden");
      renderAll();
    } catch (error) {
      console.error("Could not refresh imported games.", error);
      report($("#game-result-count"), "Importierte Spieldaten konnten nicht angezeigt werden.");
    }
  });
  for (const selector of ["#inventory-game-condition", "#game-functionality", "#game-completeness"]) {
    const values = selector === "#inventory-game-condition" ? CONDITIONS : selector === "#game-functionality" ? FUNCTIONALITIES : COMPLETENESS;
    $(selector).replaceChildren(...values.map((value) => new Option(value, value)));
  }
  database = loadDatabase();
  renderAll();
  $("#game-view-list").setAttribute("aria-pressed", "false");
  if (database.view === "list") {
    $("#game-view-grid").setAttribute("aria-pressed", "false");
    $("#game-view-list").setAttribute("aria-pressed", "true");
  }
  if (loadWarning) report($("#game-result-count"), loadWarning);
})();
