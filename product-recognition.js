"use strict";

(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const dialog = $("#product-recognition-dialog");
  if (!dialog) return;

  const category = $("#recognition-category");
  const barcode = $("#recognition-barcode");
  const message = $("#recognition-message");
  const preview = $("#recognition-preview");
  const video = $("#recognition-video");
  const progress = $("#recognition-progress");
  const webSearch = $("#recognition-web-search");
  const CATEGORY_NAMES = { devices: "Geräte", games: "Spiele", books: "Bücher", films: "Filme", filaments: "Filamente", smallParts: "Kleinteile" };
  const FORM_MAP = {
    devices: {
      name: "#device-name", manufacturer: "#device-manufacturer", model: "#device-variant", color: "#device-color"
    },
    games: {
      name: "#game-name", subtitle: "#game-subtitle", platform: "#inventory-game-platform",
      developer: "#inventory-game-developer", publisher: "#inventory-game-publisher",
      productNumber: "#game-barcode", sku: "#game-sku"
    },
    books: {
      name: "#book-title", authors: "#book-authors", publisher: "#book-publisher",
      year: "#book-year", edition: "#book-edition", isbn10: "#book-isbn10",
      isbn13: "#book-isbn13", productNumber: "#book-ean", pages: "#book-pages", description: "#book-blurb"
    },
    films: {
      name: "#film-title", originalTitle: "#film-original-title", year: "#film-year",
      studio: "#film-studio", publisher: "#film-publisher", barcode: "#film-barcode",
      description: "#film-description", synopsis: "#film-synopsis"
    },
    filaments: {
      name: "#filament-product-name", manufacturer: "#filament-manufacturer",
      materialType: "#filament-material-type", variant: "#filament-variant",
      color: "#filament-color", colorHex: "#filament-color-hex", sku: "#filament-sku",
      netWeightG: "#filament-net-weight", diameter: "#filament-diameter",
      nozzleTemperatureC: '[data-filament-tech="nozzleTemperatureC"]',
      bedTemperatureC: '[data-filament-tech="bedTemperatureC"]',
      printSpeedMmS: '[data-filament-tech="printSpeedMmS"]',
      dryingTempC: '[data-filament-tech="dryingTempC"]',
      dryingDuration: '[data-filament-tech="dryingDuration"]',
      cooling: '[data-filament-tech="cooling"]',
      bedSurface: '[data-filament-tech="bedSurface"]',
      enclosure: '[data-filament-tech="enclosure"]',
      hardenedNozzle: '[data-filament-tech="hardenedNozzle"]',
      abrasiveness: '[data-filament-tech="abrasiveness"]',
      shoreHardness: '[data-filament-tech="shoreHardness"]',
      densityGcm3: '[data-filament-tech="densityGcm3"]',
      tensileStrengthMpa: '[data-filament-tech="tensileStrengthMpa"]',
      heatDeflectionTempC: '[data-filament-tech="heatDeflectionTempC"]',
      moistureSensitivity: '[data-filament-tech="moistureSensitivity"]',
      manufacturerNotes: '[data-filament-tech="manufacturerNotes"]',
      datasheetUrl: '[data-filament-tech="datasheetUrl"]'
    },
    smallParts: {
      name: "#small-parts-name", category: "#small-parts-category", manufacturer: "#small-parts-manufacturer",
      partNumber: "#small-parts-part-number", barcode: "#small-parts-barcode", description: "#small-parts-description"
    }
  };
  const SAFE_FIELDS = {
    devices: new Set(["name", "manufacturer", "model", "color"]),
    games: new Set(["name", "subtitle", "platform", "developer", "publisher", "productNumber", "sku"]),
    books: new Set(["name", "authors", "publisher", "year", "edition", "isbn10", "isbn13", "productNumber", "pages", "description"]),
    films: new Set(["name", "originalTitle", "year", "studio", "publisher", "barcode", "description", "synopsis"]),
    filaments: new Set([
      "name", "manufacturer", "materialType", "variant", "color", "colorHex", "sku", "netWeightG", "diameter",
      "nozzleTemperatureC", "bedTemperatureC", "printSpeedMmS", "dryingTempC", "dryingDuration",
      "cooling", "bedSurface", "enclosure", "hardenedNozzle", "abrasiveness", "shoreHardness",
      "densityGcm3", "tensileStrengthMpa", "heatDeflectionTempC", "moistureSensitivity",
      "manufacturerNotes", "datasheetUrl"
    ]),
    smallParts: new Set(["name", "category", "manufacturer", "partNumber", "barcode", "description"])
  };
  const STATE = {
    devices: { storage: "KatalogicDeviceStorage", list: "devices", name: "name", barcode: [] },
    games: { storage: "KatalogicGameStorage", list: "games", name: "name", barcode: ["barcode", "sku"] },
    books: { storage: "KatalogicBookStorage", list: "books", name: "title", barcode: ["isbn10", "isbn13", "ean"] },
    films: { storage: "KatalogicFilmStorage", list: "entries", name: "title", barcode: ["barcode"] },
    filaments: { storage: "KatalogicFilamentStorage", list: "spools", name: "productId", barcode: [] },
    smallParts: { storage: "KatalogicSmallPartsStorage", list: "items", name: "name", barcode: ["barcode", "partNumber"] }
  };
  const CATEGORY_SELECTORS = {
    devices: { create: "#device-create", cards: "#device-cards", viewAction: "view", viewAttr: "data-action", editAction: "edit" },
    games: { create: "#game-create", cards: "#game-cards", viewAction: "view", viewAttr: "data-game-action", editAction: "edit" },
    books: { create: "#book-create", cards: "#book-cards", viewAction: "view", viewAttr: "data-book-action", editAction: "edit" },
    films: { create: "#film-create", cards: "#film-cards", viewAction: "view", viewAttr: "data-film-action", editAction: "edit" },
    filaments: { create: "#filament-create", cards: "#filament-cards", viewAction: "view", viewAttr: "data-filament-action", editAction: "edit" },
    smallParts: { create: "#small-parts-create", cards: "#small-parts-list", viewAction: "view", viewAttr: "data-small-part-action", editAction: "edit" }
  };
  let stream = null;
  let detector = null;
  let scanning = false;
  let lastResult = null;
  let tessScriptPromise = null;

  function report(text, isError = false) {
    message.textContent = text;
    message.classList.toggle("error", isError);
  }

  function normalized(value) {
    return String(value || "").replace(/[\s-]/g, "").toLocaleLowerCase("de");
  }

  function normalizeBarcode(value) {
    return String(value || "").trim().replace(/^ISBN(?:-1[03])?\s*:?\s*/i, "").replace(/[\s-]/g, "");
  }

  function validBarcode(value) {
    if (/^\d{9}[\dXx]$/.test(value)) {
      const sum = [...value.toUpperCase()].reduce((total, digit, index) =>
        total + (digit === "X" ? 10 : Number(digit)) * (10 - index), 0);
      return sum % 11 === 0;
    }
    if (!/^(?:\d{8}|\d{12,14})$/.test(value)) return false;
    if (value.length === 8) {
      if (!/^[01]\d{7}$/.test(value)) return false;
      const numberSystem = value[0];
      const [a, b, c, d, e, f] = value.slice(1, 7);
      const expanded = Number(f) <= 2
        ? `${numberSystem}${a}${b}${f}0000${c}${d}${e}`
        : f === "3" ? `${numberSystem}${a}${b}${c}00000${d}${e}`
          : f === "4" ? `${numberSystem}${a}${b}${c}${d}00000${e}`
            : `${numberSystem}${a}${b}${c}${d}${e}0000${f}`;
      return validGs1Check(expanded, Number(value[7]));
    }
    return validGs1Check(value.slice(0, -1), Number(value.at(-1)));
  }

  function validGs1Check(body, checkDigit) {
    const weightedSum = [...body].reverse().reduce((sum, digit, index) =>
      sum + Number(digit) * (index % 2 === 0 ? 3 : 1), 0);
    return (10 - weightedSum % 10) % 10 === checkDigit;
  }

  function updateSearchLink() {
    const query = barcode.value.trim() || $("#recognition-text").value.trim().slice(0, 160);
    const suffix = `${CATEGORY_NAMES[category.value]} ${query}`.trim();
    webSearch.href = `https://www.google.com/search?q=${encodeURIComponent(suffix)}`;
  }

  function openDialog(selectedCategory) {
    category.value = CATEGORY_NAMES[selectedCategory] ? selectedCategory : "devices";
    preview.classList.add("hidden");
    preview.replaceChildren();
    barcode.value = "";
    $("#recognition-text").value = "";
    report("Barcode, Foto oder Produkttext eingeben. Es wird nichts gespeichert, bevor du den bestehenden Kategorie-Dialog bestätigst.");
    updateSearchLink();
    dialog.showModal();
  }

  function readCollection(selectedCategory) {
    const spec = STATE[selectedCategory];
    const storage = window[spec.storage];
    if (!storage) throw new Error(`Die Speicherfunktion für ${CATEGORY_NAMES[selectedCategory]} ist nicht verfügbar.`);
    const data = storage.load();
    if (!data || !Array.isArray(data[spec.list])) throw new Error(`Der Bestand für ${CATEGORY_NAMES[selectedCategory]} hat ein ungültiges Format.`);
    return data[spec.list];
  }

  function duplicateMatches(selectedCategory, fields, scannedCode) {
    const spec = STATE[selectedCategory];
    const identifiers = [scannedCode, fields.isbn10, fields.isbn13, fields.productNumber, fields.barcode, fields.sku]
      .map(normalized).filter(Boolean);
    const title = normalized(fields.name);
    if (selectedCategory === "filaments") {
      const data = window.KatalogicFilamentStorage.load();
      return data.spools.filter((spool) => {
        const product = data.products.find((candidate) => candidate.id === spool.productId);
        return Boolean(product && title && normalized(product.name) === title &&
          ["manufacturer", "color", "materialType", "variant"].every((key) =>
            !fields[key] || !product[key] || normalized(product[key]) === normalized(fields[key])
          ));
      });
    }
    const entries = readCollection(selectedCategory);
    return entries.filter((entry) => {
      const exactIdentifier = spec.barcode.some((key) =>
        identifiers.some((value) => value && normalized(entry[key]) === value)
      );
      const sameName = title && normalized(entry[spec.name]) === title;
      const sameAuthor = selectedCategory !== "books" || !fields.authors ||
        (entry.authors || []).some((author) => normalized(author) === normalized(fields.authors.split(/[;,]/)[0]));
      return exactIdentifier || (sameName && sameAuthor);
    });
  }

  function makeFields(data, selectedCategory) {
    const fields = {};
    const put = (key, value) => {
      if (value !== undefined && value !== null && String(value).trim()) fields[key] = String(value).trim();
    };
    const code = barcode.value.trim();
    switch (selectedCategory) {
      case "devices":
        put("name", data.title || data.name || data.model);
        put("manufacturer", data.brand || data.manufacturer);
        put("model", data.model);
        put("barcode", code);
        put("color", data.color);
        break;
      case "games":
        put("name", data.title || data.name);
        put("subtitle", data.subtitle || data.edition);
        put("platform", data.platform);
        put("developer", data.developer);
        put("publisher", data.publisher || data.brand);
        put("productNumber", data.ean || data.upc || code);
        put("sku", data.sku);
        break;
      case "books": {
        put("name", data.title || data.name);
        put("authors", Array.isArray(data.authors) ? data.authors.join("; ") : data.authors);
        put("publisher", Array.isArray(data.publishers) ? data.publishers.join("; ") : data.publisher);
        put("year", String(data.publishDate || data.year || "").match(/\b(?:1[5-9]\d{2}|20\d{2}|21\d{2})\b/)?.[0]);
        put("edition", data.edition);
        put("pages", data.pageCount || data.pages);
        put("description", data.description);
        const isbn = Array.isArray(data.identifiers) ? data.identifiers : [];
        const dataIsbn = String(data.isbn || "");
        const dataEan = String(data.ean || "");
        const isIsbn13 = (value) => /^(?:978|979)\d{10}$/.test(value);
        put("isbn10", data.isbn10 || isbn.find((item) => item.type === "ISBN_10")?.identifier ||
          (/^\d{9}[\dXx]$/i.test(dataIsbn) ? dataIsbn : "") || (/^\d{9}[\dXx]$/i.test(code) ? code : ""));
        put("isbn13", data.isbn13 || isbn.find((item) => item.type === "ISBN_13")?.identifier ||
          (isIsbn13(dataIsbn) ? dataIsbn : "") || (isIsbn13(code) ? code : ""));
        put("productNumber", (!isIsbn13(dataEan) ? data.ean : "") || data.upc ||
          (!isIsbn13(code) && !/^\d{9}[\dXx]$/i.test(code) ? code : ""));
        break;
      }
      case "films":
        put("name", data.title || data.name);
        put("originalTitle", data.originalTitle);
        put("year", data.year);
        put("studio", data.studio);
        put("publisher", data.publisher);
        put("barcode", data.ean || data.upc || code);
        put("description", data.description);
        put("synopsis", data.synopsis);
        break;
      case "filaments":
        put("name", data.title || data.name);
        put("manufacturer", data.brand || data.manufacturer);
        put("materialType", data.materialType);
        put("variant", data.variant);
        put("color", data.color);
        put("colorHex", data.colorHex);
        put("sku", data.sku);
        put("barcode", code);
        put("netWeightG", data.netWeightG);
        put("diameter", data.diameter);
        for (const key of [
          "nozzleTemperatureC", "bedTemperatureC", "printSpeedMmS", "dryingTempC", "dryingDuration",
          "cooling", "bedSurface", "enclosure", "hardenedNozzle", "abrasiveness", "shoreHardness",
          "densityGcm3", "tensileStrengthMpa", "heatDeflectionTempC", "moistureSensitivity",
          "manufacturerNotes", "datasheetUrl"
        ]) put(key, data[key]);
        break;
      case "smallParts":
        put("name", data.title || data.name);
        put("category", data.category || data.type);
        put("manufacturer", data.brand || data.manufacturer);
        put("partNumber", data.partNumber || data.sku || data.ean || data.upc || code);
        put("barcode", code);
        put("description", data.description);
        break;
    }
    return fields;
  }

  function renderPreview(fields, source, duplicates = [], imageUrl = "") {
    lastResult = { fields, source, barcode: barcode.value.trim(), duplicates };
    preview.replaceChildren();
    preview.classList.remove("hidden");
    const heading = document.createElement("h3");
    heading.textContent = "Erkannte Angaben prüfen";
    preview.append(heading);
    const sourceLine = document.createElement("p");
    sourceLine.className = "muted";
    sourceLine.textContent = `Quelle: ${source}. Erkannte Felder werden nicht automatisch gespeichert.`;
    preview.append(sourceLine);
    if (fields.barcode && ["devices", "filaments"].includes(category.value)) {
      const codeNote = document.createElement("p");
      codeNote.className = "muted";
      codeNote.textContent = "Das bestehende Datenmodell dieser Kategorie hat kein Barcodefeld. Der Code wird angezeigt, aber nicht im Eintrag gespeichert.";
      preview.append(codeNote);
    }
    if (imageUrl) {
      try {
        const image = new URL(imageUrl);
        if (image.protocol === "http:") image.protocol = "https:";
        if (image.protocol === "https:") {
          const productImage = document.createElement("img");
          productImage.className = "recognition-product-image";
          productImage.src = image.href;
          productImage.alt = "Produktbild aus der externen Datenquelle (Vorschau, nicht gespeichert)";
          productImage.referrerPolicy = "no-referrer";
          productImage.loading = "lazy";
          preview.append(productImage);
        }
      } catch (error) {
        console.warn("Ignoring an invalid external product image URL.", error);
      }
    }
    const list = document.createElement("ul");
    list.className = "recognition-result-list";
    const fieldNames = {
      name: "Produktname / Titel", manufacturer: "Hersteller", model: "Modell", subtitle: "Untertitel / Edition",
      platform: "Plattform", developer: "Entwickler", publisher: "Verlag / Herausgeber", authors: "Autor(en)",
      year: "Jahr", edition: "Ausgabe", isbn10: "ISBN-10", isbn13: "ISBN-13", productNumber: "EAN / Artikelnummer",
      pages: "Seiten", barcode: "Barcode", studio: "Studio", description: "Beschreibung",
      synopsis: "Inhalt", color: "Farbe", colorHex: "Farbcode", materialType: "Materialtyp", variant: "Variante",
      sku: "Artikelnummer", netWeightG: "Nettogewicht", diameter: "Durchmesser",
      nozzleTemperatureC: "Düsentemperatur", bedTemperatureC: "Druckbetttemperatur",
      printSpeedMmS: "Druckgeschwindigkeit", dryingTempC: "Trocknungstemperatur",
      dryingDuration: "Trocknungsdauer", cooling: "Kühlung", bedSurface: "Druckoberfläche",
      enclosure: "Druckkammer", hardenedNozzle: "Gehärtete Düse", abrasiveness: "Abrasivität",
      shoreHardness: "Shore-Härte", densityGcm3: "Dichte", tensileStrengthMpa: "Zugfestigkeit",
      heatDeflectionTempC: "Wärmeformbeständigkeit", moistureSensitivity: "Feuchtigkeitsempfindlichkeit",
      manufacturerNotes: "Herstellerhinweise", datasheetUrl: "Datenblatt-URL",
      category: "Kategorie", partNumber: "Artikelnummer"
    };
    const previewKeys = {
      devices: ["name", "manufacturer", "model", "barcode", "color"],
      games: ["name", "subtitle", "platform", "developer", "publisher", "productNumber", "sku"],
      books: ["name", "authors", "publisher", "year", "edition", "isbn10", "isbn13", "productNumber", "pages", "description"],
      films: ["name", "originalTitle", "year", "studio", "publisher", "barcode"],
      filaments: [
        "name", "manufacturer", "materialType", "variant", "color", "colorHex", "sku", "barcode",
        "netWeightG", "diameter", "nozzleTemperatureC", "bedTemperatureC", "printSpeedMmS",
        "dryingTempC", "dryingDuration", "cooling", "bedSurface", "enclosure", "hardenedNozzle",
        "abrasiveness", "shoreHardness", "densityGcm3", "tensileStrengthMpa",
        "heatDeflectionTempC", "moistureSensitivity", "manufacturerNotes", "datasheetUrl"
      ],
      smallParts: ["name", "category", "manufacturer", "partNumber", "barcode", "description"]
    };
    const displayFields = previewKeys[category.value].map((key) => [key, fields[key] || ""]);
    for (const [key, value] of displayFields) {
      const row = document.createElement("li");
      const label = document.createElement("span");
      label.textContent = fieldNames[key] || key;
      const content = document.createElement("input");
      content.type = "text";
      content.value = value;
      content.placeholder = value ? "" : "Nicht gefunden";
      content.setAttribute("aria-label", fieldNames[key] || key);
      content.addEventListener("input", () => {
        if (lastResult) lastResult.fields[key] = content.value.trim();
      });
      row.append(label, content);
      list.append(row);
    }
    if (displayFields.length) preview.append(list);
    if (duplicates.length) {
      const duplicateHeading = document.createElement("p");
      duplicateHeading.textContent = `Mögliche Duplikate (${duplicates.length})`;
      preview.append(duplicateHeading);
      duplicates.slice(0, 5).forEach((entry) => {
        const box = document.createElement("div");
        box.className = "recognition-match";
        const label = document.createElement("strong");
        label.textContent = entry.displayName;
        const actions = document.createElement("div");
        actions.className = "button-row";
        actions.append(
          actionButton("Vorhandenen Eintrag öffnen", () => openExisting(entry.id)),
          actionButton("Fehlende Angaben ergänzen", () => editExisting(entry.id, fields)),
          actionButton("Vorhandenen Eintrag prüfen / aktualisieren", () => editExisting(entry.id, fields, false))
        );
        box.append(label, actions);
        preview.append(box);
      });
    }
    const actions = document.createElement("div");
    actions.className = "button-row";
    actions.append(actionButton(
      duplicates.length ? "Weiteren Eintrag / Exemplar anlegen" : "In Formular übernehmen",
      () => createWithFields(fields, duplicates.length > 0)
    ));
    preview.append(actions);
  }

  function actionButton(label, handler) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "button button-secondary";
    button.textContent = label;
    button.addEventListener("click", handler);
    return button;
  }

  function buildDuplicateLabels(entries, selectedCategory) {
    const spec = STATE[selectedCategory];
    if (selectedCategory !== "filaments") return entries.map((entry) => ({ id: entry.id, displayName: entry[spec.name] || "Eintrag ohne Titel" }));
    const data = window.KatalogicFilamentStorage.load();
    return entries.map((spool) => {
      const product = data.products.find((candidate) => candidate.id === spool.productId);
      return { id: spool.id, displayName: [product?.name || "Filamentrolle", product?.manufacturer, product?.color].filter(Boolean).join(" · ") };
    });
  }

  function setField(selector, value, { onlyEmpty = true } = {}) {
    const field = $(selector);
    if (!field || value === undefined || value === null || !String(value).trim()) return false;
    if (onlyEmpty && field.value.trim()) return false;
    if (field.tagName === "SELECT" && ![...field.options].some((option) => option.value === String(value))) {
      field.add(new Option(String(value), String(value)));
    }
    field.value = String(value);
    field.dispatchEvent(new Event("input", { bubbles: true }));
    return true;
  }

  function fillForm(fields, onlyEmpty = true) {
    let count = 0;
    for (const [key, selector] of Object.entries(FORM_MAP[category.value])) {
      if (SAFE_FIELDS[category.value].has(key) && setField(selector, fields[key], { onlyEmpty })) count += 1;
    }
    return count;
  }

  function createWithFields(fields, explicitlyAllowDuplicate = false) {
    if (!explicitlyAllowDuplicate) {
      const duplicates = buildDuplicateLabels(
        duplicateMatches(category.value, fields, barcode.value.trim()),
        category.value
      );
      if (duplicates.length) {
        const source = lastResult?.source || "erkannte Angaben";
        renderPreview(fields, source, duplicates);
        report("Beim Prüfen wurde ein möglicher vorhandener Eintrag gefunden. Wähle bewusst, ob du ihn öffnest, ergänzt, aktualisierst oder trotzdem ein weiteres Exemplar anlegst.", false);
        return;
      }
    }
    const target = CATEGORY_SELECTORS[category.value];
    $(target.create)?.click();
    const count = fillForm(fields);
    closeDialog();
    document.querySelector(CATEGORY_SELECTORS[category.value].create)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    reportFormResult(`Erkannte Produktangaben wurden in ${CATEGORY_NAMES[category.value]} übernommen (${count} Felder). Prüfe und bestätige sie im Formular, um zu speichern.`);
  }

  function reportFormResult(text) {
    const candidates = {
      devices: "#device-result-count", games: "#game-form-message", books: "#book-form-message",
      films: "#film-form-message", filaments: "#filament-form-message"
    };
    const element = $(candidates[category.value]);
    if (element) element.textContent = text;
  }

  function findActionButton(id, action, selectedCategory) {
    const selectors = CATEGORY_SELECTORS[selectedCategory];
    const container = $(selectors.cards);
    if (!container) return null;
    return [...container.querySelectorAll(`[${selectors.viewAttr}]`)].find((button) => button.dataset.id === id && button.getAttribute(selectors.viewAttr) === action) || null;
  }

  function openExisting(id) {
    const button = findActionButton(id, CATEGORY_SELECTORS[category.value].viewAction, category.value);
    if (!button) {
      report("Der vorhandene Eintrag konnte nicht geöffnet werden. Aktualisiere die Liste und versuche es erneut.", true);
      return;
    }
    button.click();
    closeDialog();
  }

  function editExisting(id, fields, onlyEmpty = true) {
    const selectors = CATEGORY_SELECTORS[category.value];
    const button = [...$(selectors.cards).querySelectorAll(`[${selectors.viewAttr}]`)]
      .find((candidate) => candidate.dataset.id === id && candidate.getAttribute(selectors.viewAttr) === selectors.editAction);
    if (!button) {
      report("Der vorhandene Eintrag konnte nicht zum Bearbeiten geöffnet werden.", true);
      return;
    }
    button.click();
    const count = fillForm(fields, onlyEmpty);
    closeDialog();
    reportFormResult(`Bearbeite den vorhandenen Eintrag. ${count} Produktfelder wurden ${onlyEmpty ? "in bisher leere Felder übernommen" : "mit den geprüften Erkennungsdaten aktualisiert"}; persönliche Bestandsdaten blieben unverändert. Prüfe die Änderungen und speichere im Formular.`);
  }

  async function lookupBarcode(existingFields = {}) {
    const code = normalizeBarcode(barcode.value);
    if (!validBarcode(code)) {
      report("Barcode ungültig. Prüfe Länge und Prüfziffer (EAN/UPC) bzw. ISBN-10.", true);
      return;
    }
    barcode.value = code;
    updateSearchLink();
    report("Suche in echten Produktdatenbanken …");
    try {
      let metadata = null;
      let source = "";
      let imageUrl = "";
      try {
        const response = await fetch(`/api/products?barcode=${encodeURIComponent(code)}`, { headers: { Accept: "application/json" } });
        if (response.ok) {
          const result = await response.json();
          if (result.found && result.product) {
            metadata = result.product;
            source = result.source || "UPCitemdb";
          } else if (Array.isArray(result.items) && result.items[0]) {
            metadata = result.items[0];
            source = "UPCitemdb";
          } else if (result.error) {
            throw new Error(result.error);
          }
        } else if (response.status !== 404) {
          const result = await response.json().catch(() => ({}));
          throw new Error(result.error || `Produktsuche nicht erreichbar (HTTP ${response.status}).`);
        }
      } catch (error) {
        if (error instanceof TypeError) {
          report("Die Onlineabfrage ist nicht erreichbar. Prüfe die Internetverbindung; du kannst weiterhin manuell suchen oder Text einfügen.", true);
          return;
        }
        throw error;
      }
      let enrichmentWarning = "";
      if (category.value === "books" && (/^(?:978|979)\d{10}$/.test(code) || /^\d{9}[\dXx]$/.test(code))) {
        try {
          const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(`isbn:${code}`)}&maxResults=1`);
          if (!response.ok) throw new Error(`ISBN-Suche meldet HTTP ${response.status}.`);
          const result = await response.json();
          const volume = result.items?.[0]?.volumeInfo;
          if (volume) {
            metadata = {
              ...metadata,
              ...volume,
              title: volume.title || metadata?.title,
              authors: volume.authors || metadata?.authors,
              publishers: volume.publisher ? [volume.publisher] : metadata?.publishers,
              identifiers: volume.industryIdentifiers || [],
              pageCount: volume.pageCount || metadata?.pageCount
            };
            imageUrl = volume.imageLinks?.thumbnail || volume.imageLinks?.smallThumbnail || imageUrl;
            source = source ? `${source} + Google Books` : "Google Books";
          }
        } catch (error) {
          if (!metadata) throw error;
          console.error("Google Books enrichment failed.", error);
          enrichmentWarning = " Google Books konnte die ISBN nicht zusätzlich ergänzen; die Barcode-Daten bleiben verfügbar.";
        }
      }
      if (!metadata) {
        if (Object.keys(existingFields).length) {
          const duplicates = buildDuplicateLabels(duplicateMatches(category.value, existingFields, code), category.value);
          renderPreview(existingFields, "Texterkennung; keine Online-Ergänzung gefunden", duplicates);
          report("Kein Online-Treffer. Die lokal erkannten Angaben bleiben zur Prüfung erhalten.", false);
          return;
        }
        preview.classList.remove("hidden");
        preview.replaceChildren();
        const heading = document.createElement("h3");
        heading.textContent = "Kein passender Datensatz gefunden";
        const detail = document.createElement("p");
        detail.className = "muted";
        detail.textContent = "Es wurden keine Produktdaten vorgetäuscht. Öffne die Websuche oder füge gefundene Angaben zur Analyse ein.";
        preview.append(heading, detail);
        report("Kein Treffer in den verfügbaren Datenbanken. Die Google-Suche ist vorbereitet.", false);
        return;
      }
      imageUrl ||= metadata.image || metadata.images?.[0] || "";
      const fields = { ...makeFields(metadata, category.value), ...existingFields };
      const duplicates = buildDuplicateLabels(duplicateMatches(category.value, fields, code), category.value);
      renderPreview(fields, source, duplicates, imageUrl);
      report(`Treffer gefunden. Prüfe die erkannten Angaben und wähle eine Aktion.${enrichmentWarning}`, false);
    } catch (error) {
      console.error("Product lookup failed.", error);
      report(`Produktsuche fehlgeschlagen: ${error.message || "Unbekannter Fehler"}`, true);
    }
  }

  function parseText(text) {
    const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const find = (patterns) => {
      for (const line of lines) {
        for (const pattern of patterns) {
          const match = line.match(pattern);
          if (match?.[1]?.trim()) return match[1].trim();
        }
      }
      return "";
    };
    const metadata = {
      title: find([/^(?:produktname|produkt|titel|name|model|modell)\s*[:#-]\s*(.+)$/i]),
      brand: find([/^(?:hersteller|marke|brand|manufacturer)\s*[:#-]\s*(.+)$/i]),
      category: find([/^(?:kategorie|gruppe|category|type|typ)\s*[:#-]\s*(.+)$/i]),
      model: find([/^(?:modellnummer|modell|model)\s*[:#-]\s*(.+)$/i]),
      publisher: find([/^(?:verlag|publisher|herausgeber)\s*[:#-]\s*(.+)$/i]),
      authors: find([/^(?:autor(?:en)?|author(?:s)?)\s*[:#-]\s*(.+)$/i]),
      edition: find([/^(?:edition|ausgabe|edition)\s*[:#-]\s*(.+)$/i]),
      year: find([/^(?:erscheinungsjahr|jahr|release year|released)\s*[:#-]\s*(.+)$/i]),
      platform: find([/^(?:plattform|platform|system)\s*[:#-]\s*(.+)$/i]),
      color: find([/^(?:farbe|color|colour)\s*[:#-]\s*(.+)$/i]),
      colorHex: find([/^(?:farbcode|hex(?:-farbe)?)\s*[:#-]\s*(#[\da-f]{3}(?:[\da-f]{3})?)$/i]),
      materialType: find([/^(?:materialtyp|material)\s*[:#-]\s*(.+)$/i]),
      variant: find([/^(?:variante|variant)\s*[:#-]\s*(.+)$/i]),
      sku: find([/^(?:artikelnummer|sku|product number)\s*[:#-]\s*(.+)$/i]),
      netWeightG: find([/^(?:nettogewicht|net weight)\s*[:#-]\s*(\d+(?:[.,]\d+)?)\s*(?:g|kg)\b/i]),
      diameter: find([/^(?:durchmesser|diameter)\s*[:#-]\s*(1[.,]75|2[.,]85)\s*mm\b/i]),
      pages: find([/^(?:seiten|pages)\s*[:#-]\s*(\d+)\b/i]),
      description: find([/^(?:beschreibung|description)\s*[:#-]\s*(.+)$/i]),
      nozzleTemperatureC: find([/^(?:düsentemperatur|drucktemperatur|nozzle(?: temperature| temp)?)\s*[:#-]\s*(.+)$/i]),
      bedTemperatureC: find([/^(?:druckbett(?:temperatur)?|betttemperatur|bed(?: temperature| temp)?)\s*[:#-]\s*(.+)$/i]),
      printSpeedMmS: find([/^(?:druckgeschwindigkeit|print speed)\s*[:#-]\s*(.+)$/i]),
      dryingTempC: find([/^(?:trocknungstemperatur|trocknen bei|drying temperature)\s*[:#-]\s*(.+)$/i]),
      dryingDuration: find([/^(?:trocknungsdauer|trocknungszeit|drying duration)\s*[:#-]\s*(.+)$/i]),
      cooling: find([/^(?:kühlung|lüfter|cooling)\s*[:#-]\s*(.+)$/i]),
      bedSurface: find([/^(?:druckoberfläche|druckbett|bed surface)\s*[:#-]\s*(.+)$/i]),
      enclosure: find([/^(?:druckkammer|gehäuse|enclosure)\s*[:#-]\s*(.+)$/i]),
      hardenedNozzle: find([/^(?:gehärtete düse|gehärtete nozzle|hardened nozzle)\s*[:#-]\s*(.+)$/i]),
      abrasiveness: find([/^(?:abrasivität|abrasiv(?:ität)?|abrasiveness)\s*[:#-]\s*(.+)$/i]),
      shoreHardness: find([/^(?:shore(?:-härte)?|shore hardness)\s*[:#-]\s*(.+)$/i]),
      densityGcm3: find([/^(?:dichte|density)\s*[:#-]\s*(.+)$/i]),
      tensileStrengthMpa: find([/^(?:zugfestigkeit|tensile strength)\s*[:#-]\s*(.+)$/i]),
      heatDeflectionTempC: find([/^(?:wärmeformbeständigkeit|wärmeformbeständigkeitstemperatur|heat deflection temperature|hdt)\s*[:#-]\s*(.+)$/i]),
      moistureSensitivity: find([/^(?:feuchtigkeitsempfindlichkeit|feuchtigkeit|moisture sensitivity)\s*[:#-]\s*(.+)$/i]),
      manufacturerNotes: find([/^(?:herstellerhinweise|manufacturer notes)\s*[:#-]\s*(.+)$/i]),
      datasheetUrl: find([/^(?:datenblatt|datasheet)\s*[:#-]\s*(https?:\/\/\S+)$/i])
    };
    const detectedCode = text.match(/(?:ISBN(?:-1[03])?\s*[:#]?\s*)?((?:97[89])\d{10}|\d{13}|\d{12}|\d{8}|\d{9}[\dXx])/i)?.[1];
    const weightMatch = text.match(/^(?:nettogewicht|net weight)\s*[:#-]\s*(\d+(?:[.,]\d+)?)\s*(g|kg)\b/im);
    if (weightMatch) {
      const weight = Number(weightMatch[1].replace(",", "."));
      metadata.netWeightG = String(weight * (weightMatch[2].toLocaleLowerCase("en") === "kg" ? 1000 : 1));
    }
    if (detectedCode && !barcode.value) barcode.value = detectedCode;
    if (!metadata.title) metadata.title = lines.find((line) =>
      !/^(?:isbn|ean|upc)\b/i.test(line) && !/^[\p{L}][\p{L}\s-]{1,30}\s*[:#]\s*/u.test(line) && line.length > 2
    ) || "";
    if (category.value === "books" && metadata.authors) metadata.authors = metadata.authors.split(/[;,]/).map((value) => value.trim());
    if (metadata.netWeightG) metadata.netWeightG = metadata.netWeightG.replace(",", ".");
    if (metadata.diameter) metadata.diameter = metadata.diameter.replace(",", ".");
    return metadata;
  }

  async function analyzeText(text, source) {
    if (!text.trim()) return report("Bitte zuerst Text eingeben oder ein Bild auswählen.", true);
    const metadata = parseText(text);
    const fields = makeFields(metadata, category.value);
    let duplicates = [];
    try {
      duplicates = buildDuplicateLabels(duplicateMatches(category.value, fields, barcode.value.trim()), category.value);
    } catch (error) {
      console.error("Could not check inventory duplicates.", error);
      report(`Die erkannten Angaben liegen vor, aber der Duplikat-Abgleich schlug fehl: ${error.message}`, true);
      return;
    }
    renderPreview(fields, source, duplicates);
    report("Analyse abgeschlossen. Prüfe oder korrigiere die Angaben vor der Übernahme.", false);
    updateSearchLink();
    const code = barcode.value.trim();
    if (validBarcode(normalizeBarcode(code))) await lookupBarcode(fields);
  }

  function loadTesseract() {
    if (window.Tesseract) return Promise.resolve(window.Tesseract);
    if (!tessScriptPromise) {
      tessScriptPromise = new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/npm/tesseract.js@6/dist/tesseract.min.js";
        script.async = true;
        script.onload = () => window.Tesseract ? resolve(window.Tesseract) : reject(new Error("OCR-Bibliothek wurde geladen, ist aber nicht verfügbar."));
        script.onerror = () => reject(new Error("OCR-Bibliothek konnte nicht geladen werden. Prüfe die Internetverbindung."));
        document.head.append(script);
      }).catch((error) => {
        tessScriptPromise = null;
        throw error;
      });
    }
    return tessScriptPromise;
  }

  async function recognizeImage(file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return report("Bitte eine Bilddatei auswählen.", true);
    progress.classList.remove("hidden");
    progress.value = 0;
    report("OCR wird vorbereitet. Beim ersten Aufruf werden Bibliothek und Sprachdaten geladen …");
    let worker;
    try {
      const tesseract = await loadTesseract();
      worker = await tesseract.createWorker("deu+eng", 1, {
        workerPath: "https://cdn.jsdelivr.net/npm/tesseract.js@6/dist/worker.min.js",
        corePath: "https://cdn.jsdelivr.net/npm/tesseract.js-core@6/tesseract-core-simd-lstm.wasm.js",
        langPath: "https://tessdata.projectnaptha.com/4.0.0",
        logger: (event) => {
          if (event.status === "recognizing text" && Number.isFinite(event.progress)) progress.value = event.progress;
        }
      });
      const result = await worker.recognize(file);
      $("#recognition-text").value = result.data.text || "";
      if (!result.data.text?.trim()) return report("Im Bild wurde kein lesbarer Text erkannt. Verwende ein schärferes Bild oder gib die Angaben manuell ein.", true);
      await analyzeText(result.data.text, "OCR (lokale Texterkennung)");
    } catch (error) {
      console.error("Image text recognition failed.", error);
      report(`Texterkennung fehlgeschlagen: ${error.message || "Unbekannter Fehler"}`, true);
    } finally {
      progress.classList.add("hidden");
      if (worker) await worker.terminate();
    }
  }

  async function stopCamera() {
    scanning = false;
    $("#recognition-camera-stop").disabled = true;
    $("#recognition-camera-start").disabled = false;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      stream = null;
    }
    video.srcObject = null;
    video.classList.add("hidden");
  }

  async function startCamera() {
    if (!navigator.mediaDevices?.getUserMedia) return report("Kamerazugriff ist in diesem Browser nicht verfügbar. Öffne die App über HTTPS oder localhost und gib den Barcode manuell ein.", true);
    if (typeof BarcodeDetector === "undefined") return report("Dieser Browser unterstützt die Barcode-Erkennung nicht. Verwende einen USB-/Bluetooth-Scanner oder gib den Barcode manuell ein.", true);
    try {
      const supported = await BarcodeDetector.getSupportedFormats();
      const formats = ["ean_13", "ean_8", "upc_a", "upc_e"].filter((format) => supported.includes(format));
      if (!formats.length) return report("Dieser Browser kann kein unterstütztes EAN-/UPC-Format erkennen. Verwende die manuelle Eingabe.", true);
      detector = new BarcodeDetector({ formats });
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      video.srcObject = stream;
      video.classList.remove("hidden");
      await video.play();
      scanning = true;
      $("#recognition-camera-stop").disabled = false;
      $("#recognition-camera-start").disabled = true;
      report("Kamera aktiv. Richte sie auf einen EAN- oder UPC-Barcode.");
      while (scanning && stream) {
        if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
          const detected = await detector.detect(video);
          const code = detected.find((item) => item.rawValue)?.rawValue;
          if (code) {
            barcode.value = code;
            updateSearchLink();
            await stopCamera();
            await lookupBarcode();
            return;
          }
        }
        await new Promise((resolve) => setTimeout(resolve, 180));
      }
    } catch (error) {
      console.error("Barcode camera failed.", error);
      await stopCamera();
      const reason = error.name === "NotAllowedError" ? "Kameraberechtigung verweigert."
        : error.name === "NotFoundError" ? "Keine Kamera gefunden."
          : error.name === "NotReadableError" ? "Kamera wird bereits von einer anderen Anwendung verwendet."
            : `Kamera konnte nicht gestartet werden: ${error.message || error.name}`;
      report(`${reason} Du kannst den Barcode manuell eingeben.`, true);
    }
  }

  function closeDialog() {
    void stopCamera();
    if (dialog.open) dialog.close();
  }

  document.querySelectorAll("[data-recognition-category]").forEach((button) =>
    button.addEventListener("click", () => openDialog(button.dataset.recognitionCategory))
  );
  $("#recognition-close").addEventListener("click", closeDialog);
  dialog.addEventListener("cancel", () => void stopCamera());
  category.addEventListener("change", () => {
    updateSearchLink();
    if (!preview.classList.contains("hidden")) {
      preview.classList.add("hidden");
      preview.replaceChildren();
      lastResult = null;
      report("Kategorie geändert. Analysiere den Text erneut oder starte eine Produktsuche für die gewählte Kategorie.");
    }
  });
  barcode.addEventListener("input", updateSearchLink);
  $("#recognition-text").addEventListener("input", updateSearchLink);
  $("#recognition-lookup").addEventListener("click", () => void lookupBarcode());
  barcode.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      void lookupBarcode();
    }
  });
  $("#recognition-camera-start").addEventListener("click", () => void startCamera());
  $("#recognition-camera-stop").addEventListener("click", () => void stopCamera());
  $("#recognition-image").addEventListener("change", (event) => void recognizeImage(event.target.files?.[0]));
  $("#recognition-analyze-text").addEventListener("click", () => void analyzeText($("#recognition-text").value, "eingefügter Text"));
  webSearch.addEventListener("click", updateSearchLink);
})();
