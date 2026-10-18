"use strict";

(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const makeId = () => crypto.randomUUID();
  const today = () => new Date().toISOString().slice(0, 10);
  const MATERIAL_TYPES = [
    "PLA", "PLA+", "Matte PLA", "Silk PLA", "PLA mit Holzfüllung", "PLA mit Metallfüllung",
    "PETG", "PETG-CF", "ABS", "ASA", "TPU", "TPE", "PA/Nylon", "PA-CF", "PC", "PVA",
    "HIPS", "Supportmaterial", "Carbonfaserverstärktes Filament", "Glasfaserverstärktes Filament",
    "Metallverbundfilament", "Holzverbundfilament", "Recyclingfilament", "Sonstige Spezialmaterialien"
  ];
  const HUMIDITY = ["Unbekannt", "Trocken", "Möglicherweise feucht", "Muss getrocknet werden"];
  const TEXT_PRODUCT_FIELDS = {
    manufacturer: "filament-manufacturer",
    name: "filament-product-name",
    materialType: "filament-material-type",
    variant: "filament-variant",
    color: "filament-color",
    manufacturerColor: "filament-manufacturer-color",
    colorHex: "filament-color-hex",
    sku: "filament-sku",
    spoolType: "filament-spool-type",
    spoolMaterial: "filament-spool-material",
    manufacturedDate: "filament-manufactured-date",
    shelfLife: "filament-shelf-life"
  };
  const NUMBER_PRODUCT_FIELDS = {
    netWeightG: "filament-net-weight",
    emptySpoolWeightG: "filament-empty-spool-weight",
    fullWeightG: "filament-full-weight",
    spoolDiameterMm: "filament-spool-diameter",
    spoolWidthMm: "filament-spool-width"
  };
  const TEXT_SPOOL_FIELDS = {
    lotNumber: "filament-lot",
    purchaseDate: "filament-purchase-date",
    dealer: "filament-dealer",
    location: "filament-location",
    container: "filament-container",
    storageStatus: "filament-storage-status",
    lastDriedDate: "filament-last-dried",
    humidityStatus: "filament-humidity",
    notes: "filament-notes",
    state: "filament-state",
    printerLink: "filament-printer-link",
    profileLink: "filament-profile-link"
  };
  const NUMBER_SPOOL_FIELDS = {
    originalNetWeightG: "filament-original-weight",
    remainingG: "filament-remaining-weight",
    weighedTotalG: "filament-weighed-total",
    lowStockThresholdG: "filament-low-threshold",
    purchasePrice: "filament-purchase-price",
    dryingTemperatureC: "filament-drying-temp",
    dryingDurationHours: "filament-drying-duration",
    humidityPercent: "filament-humidity-percent"
  };
  const emptyInventory = () => ({ products: [], spools: [], profiles: [], amsUnits: [], customOptions: {}, view: "grid" });
  let inventory;
  let editorMode = "create";
  let activeSpoolId = "";
  let productPhotoDraft = "";
  let spoolPhotoDraft = "";
  let photoProcessing = false;
  let loadWarning = "";

  function normalizeInventory(value) {
    const blank = emptyInventory();
    return {
      products: Array.isArray(value?.products) ? value.products : [],
      spools: Array.isArray(value?.spools) ? value.spools : [],
      profiles: Array.isArray(value?.profiles) ? value.profiles : [],
      amsUnits: Array.isArray(value?.amsUnits) ? value.amsUnits : [],
      customOptions: value?.customOptions && typeof value.customOptions === "object" && !Array.isArray(value.customOptions)
        ? value.customOptions
        : blank.customOptions,
      view: value?.view === "list" ? "list" : "grid"
    };
  }

  function loadInventory() {
    try {
      return normalizeInventory(window.KatalogicFilamentStorage.load());
    } catch (error) {
      console.error("Could not load saved filament inventory.", error);
      loadWarning = "Gespeicherte Filamentdaten konnten nicht gelesen werden. Vorhandene Daten wurden nicht überschrieben.";
      return emptyInventory();
    }
  }

  function saveInventory(next) {
    window.KatalogicFilamentStorage.save(next);
    inventory = normalizeInventory(next);
  }

  function status(message, error = true) {
    $("#filament-status").textContent = message;
    $("#filament-status").classList.toggle("error", error);
  }

  function uniqueSorted(values) {
    return [...new Set(values.filter((value) => typeof value === "string" && value.trim()).map((value) => value.trim()))]
      .sort((first, second) => first.localeCompare(second, "de"));
  }

  function options(key) {
    return Array.isArray(inventory.customOptions[key]) ? inventory.customOptions[key] : [];
  }

  function productFor(spool) {
    return inventory.products.find((product) => product.id === spool.productId);
  }

  function fillMaterialTypes(selected = "") {
    const select = $("#filament-material-type");
    const values = uniqueSorted([...MATERIAL_TYPES, ...options("materialTypes"), ...inventory.products.map((product) => product.materialType)]);
    select.replaceChildren(new Option("Materialtyp auswählen", ""));
    for (const value of values) select.add(new Option(value, value));
    select.add(new Option("＋ Eigener Materialtyp …", "__custom__"));
    if (selected && values.includes(selected)) select.value = selected;
    else if (selected) {
      select.add(new Option(selected, selected));
      select.value = selected;
    } else select.value = "";
  }

  function fillProductSelect(selected = "") {
    const select = $("#filament-product-select");
    select.replaceChildren(new Option("Neues Produkt anlegen …", ""));
    const sorted = [...inventory.products].sort((a, b) =>
      `${a.manufacturer} ${a.name} ${a.color}`.localeCompare(`${b.manufacturer} ${b.name} ${b.color}`, "de"));
    for (const product of sorted) {
      const spoolCount = inventory.spools.filter((spool) => spool.productId === product.id).length;
      select.add(new Option(`${product.manufacturer ? `${product.manufacturer} · ` : ""}${product.name} · ${product.materialType || "Material unbekannt"} · ${product.color || "Farbe unbekannt"} (${spoolCount} Rollen)`, product.id));
    }
    select.value = selected;
  }

  function fillDatalists() {
    const manufacturerNames = uniqueSorted([...options("manufacturers"), ...inventory.products.map((product) => product.manufacturer)]);
    $("#filament-manufacturer-options").replaceChildren(...manufacturerNames.map((name) => new Option(name, name)));
    $("#filament-profile-options").replaceChildren(...inventory.profiles.map((profile) => new Option(profile.name, profile.name)));
  }

  function fillFilters() {
    const material = $("#filament-filter-type");
    const currentMaterial = material.value;
    const types = uniqueSorted([...MATERIAL_TYPES, ...options("materialTypes"), ...inventory.products.map((product) => product.materialType)]);
    material.replaceChildren(new Option("Alle Materialtypen", ""));
    types.filter(Boolean).forEach((type) => material.add(new Option(type, type)));
    material.value = types.includes(currentMaterial) ? currentMaterial : "";

    const diameter = $("#filament-filter-diameter");
    const currentDiameter = diameter.value;
    const diameters = uniqueSorted(inventory.products.map((product) => product.diameter));
    diameter.replaceChildren(new Option("Alle Durchmesser", ""));
    diameters.forEach((value) => diameter.add(new Option(`${value} mm`, value)));
    diameter.value = diameters.includes(currentDiameter) ? currentDiameter : "";

    const humidity = $("#filament-filter-humidity");
    const currentHumidity = humidity.value;
    const statuses = uniqueSorted([...HUMIDITY, ...options("humidityStatuses"), ...inventory.spools.map((spool) => spool.humidityStatus)]);
    humidity.replaceChildren(new Option("Alle Feuchtigkeitswerte", ""));
    statuses.forEach((value) => humidity.add(new Option(value, value)));
    humidity.value = statuses.includes(currentHumidity) ? currentHumidity : "";
  }

  function fillFormOptions() {
    const humidity = $("#filament-humidity");
    const selected = humidity.value;
    const values = uniqueSorted([...HUMIDITY, ...options("humidityStatuses"), ...inventory.spools.map((spool) => spool.humidityStatus)]);
    humidity.replaceChildren(new Option("Unbekannt", "Unbekannt"));
    for (const value of values.filter((item) => item !== "Unbekannt")) humidity.add(new Option(value, value));
    if (values.includes(selected)) humidity.value = selected;
  }

  function fillFormFromProduct(product = null) {
    for (const [key, id] of Object.entries(TEXT_PRODUCT_FIELDS)) {
      const value = product?.[key] ?? "";
      if (key === "materialType") continue;
      $(`#${id}`).value = value;
    }
    fillMaterialTypes(product?.materialType || "");
    for (const [key, id] of Object.entries(NUMBER_PRODUCT_FIELDS)) {
      $(`#${id}`).value = product?.[key] ?? "";
    }
    for (const [key, input] of Object.entries(Object.fromEntries($$("[data-filament-tech]").map((field) => [field.dataset.filamentTech, field])))) {
      input.value = product?.technical?.[key] ?? "";
    }
    productPhotoDraft = product?.photo || "";
    $("#filament-custom-tech").value = (product?.customTechnical || [])
      .map((entry) => `${entry.key} | ${entry.value} | ${entry.unit || ""}`.trim())
      .join("\n");
    syncDiameterFields(product?.diameter || "1.75");
    updateMaterialHints();
    renderPhotos();
  }

  function syncDiameterFields(diameter) {
    const known = ["1.75", "2.85"].includes(String(diameter));
    $("#filament-diameter").value = known ? String(diameter) : "custom";
    $("#filament-custom-diameter-wrap").classList.toggle("hidden", known);
    $("#filament-custom-diameter").value = known ? "" : diameter || "";
  }

  function syncProductChoice() {
    const product = inventory.products.find((entry) => entry.id === $("#filament-product-select").value);
    fillProductFromSelection(product || null);
  }

  function fillProductFromSelection(product) {
    fillFormFromProduct(product);
    updateUnitPrice();
  }

  function updateMaterialHints() {
    const material = $("#filament-material-type").value.toLocaleLowerCase("de");
    const hints = $("#filament-material-hints");
    const warnings = [];
    const reinforced = /carbon|cf|glasfaser|metallfüll|holzfüll|verbund/.test(material);
    const flexible = /tpu|tpe/.test(material);
    const moistureSensitive = /pa\/nylon|pa-cf|nylon|tpu|tpe|pva|pc/.test(material);
    for (const [key, shouldShow] of [
      ["abrasiveness", reinforced],
      ["shoreHardness", flexible],
      ["hardenedNozzle", reinforced],
      ["dryingTempC", moistureSensitive],
      ["dryingDuration", moistureSensitive],
      ["moistureSensitivity", moistureSensitive]
    ]) {
      const field = $(`[data-filament-tech="${key}"]`);
      if (field) field.closest("label").classList.toggle("hidden", !shouldShow);
    }
    if (reinforced) {
      warnings.push("Füllstoffe können je nach Zusammensetzung abrasiv sein. Prüfe das Datenblatt zur Düsenwahl; für dieses Material wurde keine Eigenschaft vorausgefüllt.");
    }
    if (moistureSensitive) {
      warnings.push("Für diese Materialgruppe können Trocknung und Feuchtigkeit relevant sein. Folge den Herstellerangaben; der Feuchtigkeitsstatus bleibt unbekannt, bis du ihn selbst erfasst.");
    }
    hints.replaceChildren(...warnings.map((message) => {
      const paragraph = document.createElement("p");
      paragraph.textContent = message;
      return paragraph;
    }));
  }

  function activeProductFields() {
    const diameter = $("#filament-diameter").value === "custom"
      ? $("#filament-custom-diameter").value.trim()
      : $("#filament-diameter").value;
    const product = {};
    for (const [key, id] of Object.entries(TEXT_PRODUCT_FIELDS)) product[key] = $(`#${id}`).value.trim();
    product.materialType = $("#filament-material-type").value === "__custom__"
      ? ($("#filament-material-type-custom")?.value.trim() || "")
      : $("#filament-material-type").value;
    product.diameter = diameter;
    for (const [key, id] of Object.entries(NUMBER_PRODUCT_FIELDS)) {
      const raw = $(`#${id}`).value;
      product[key] = raw === "" ? null : Number(raw);
    }
    product.technical = Object.fromEntries($$("[data-filament-tech]")
      .map((field) => [field.dataset.filamentTech, field.value.trim()])
      .filter(([, value]) => value));
    product.photo = productPhotoDraft;
    product.customTechnical = $("#filament-custom-tech").value.split(/\r?\n/)
      .map((line) => line.split("|").map((part) => part.trim()))
      .filter(([key, value]) => key && value)
      .map(([key, value, unit = ""]) => ({ key, value, unit }));
    return product;
  }

  function readSpoolFields() {
    const spool = {};
    for (const [key, id] of Object.entries(TEXT_SPOOL_FIELDS)) spool[key] = $(`#${id}`).value.trim();
    for (const [key, id] of Object.entries(NUMBER_SPOOL_FIELDS)) {
      const raw = $(`#${id}`).value;
      spool[key] = raw === "" ? null : Number(raw);
    }
    spool.spoolPhoto = spoolPhotoDraft;
    return spool;
  }

  function writeSpoolFields(spool) {
    for (const [key, id] of Object.entries(TEXT_SPOOL_FIELDS)) {
      $(`#${id}`).value = spool?.[key] ?? (key === "humidityStatus" ? "Unbekannt" : key === "state" ? "unknown" : "");
    }
    for (const [key, id] of Object.entries(NUMBER_SPOOL_FIELDS)) {
      $(`#${id}`).value = spool?.[key] ?? (key === "lowStockThresholdG" ? "100" : "");
    }
    spoolPhotoDraft = spool?.spoolPhoto || "";
    renderPhotos();
    updateUnitPrice();
  }

  function clearEditor() {
    $("#filament-form").reset();
    $("#filament-spool-id").value = "";
    $("#filament-low-threshold").value = "100";
    $("#filament-state").value = "unknown";
    $("#filament-humidity").value = "Unbekannt";
    $("#filament-form-message").textContent = "";
    productPhotoDraft = "";
    spoolPhotoDraft = "";
    fillProductSelect();
    fillFormFromProduct();
    writeSpoolFields();
    $("#filament-product-select").value = "";
    $("#filament-custom-diameter-wrap").classList.add("hidden");
    renderPhotos();
  }

  function openEditor(mode = "create", spool = null) {
    editorMode = mode;
    $("#filament-detail").classList.add("hidden");
    $("#filament-editor").classList.remove("hidden");
    $("#filament-editor-heading").textContent = mode === "edit" ? "Rolle bearbeiten" : mode === "duplicate" ? "Rolle duplizieren" : "Rolle hinzufügen";
    clearEditor();
    if (!spool) return;
    const product = productFor(spool);
    fillProductSelect(product?.id || "");
    fillProductFromSelection(product || null);
    writeSpoolFields(spool);
    $("#filament-spool-id").value = mode === "edit" ? spool.id : makeId();
    if (mode === "duplicate") {
      $("#filament-lot").value = "";
      $("#filament-purchase-date").value = "";
      $("#filament-purchase-price").value = "";
      $("#filament-remaining-weight").value = "";
      $("#filament-original-weight").value = product?.netWeightG ?? "";
      $("#filament-weighed-total").value = "";
      $("#filament-state").value = "unknown";
      $("#filament-last-dried").value = "";
      $("#filament-notes").value = "";
      $("#filament-humidity").value = "Unbekannt";
      spoolPhotoDraft = "";
      renderPhotos();
    }
  }

  function productIdentity(product) {
    return [product.manufacturer, product.name, product.materialType, product.variant, product.color, product.diameter]
      .map((value) => String(value || "").trim().toLocaleLowerCase("de")).join("\u0000");
  }

  function productFromForm(existingId) {
    const formProduct = activeProductFields();
    const existing = inventory.products.find((product) => product.id === existingId);
    if (existing) return { ...existing, ...formProduct, id: existing.id };
    const identity = productIdentity(formProduct);
    const shared = identity.replace(/\u0000/g, "")
      ? inventory.products.find((product) => productIdentity(product) === identity)
      : null;
    if (shared) return { ...shared, ...formProduct, id: shared.id };
    return { ...formProduct, id: makeId(), createdAt: today() };
  }

  function updateUnitPrice() {
    const price = Number($("#filament-purchase-price").value);
    const weight = Number($("#filament-net-weight").value);
    $("#filament-unit-price").value = price >= 0 && weight > 0 ? `${(price * 1000 / weight).toFixed(2)} €/kg` : "";
  }

  function saveSpool(event) {
    event.preventDefault();
    if (photoProcessing) {
      $("#filament-form-message").textContent = "Warte bitte, bis die Bildverarbeitung abgeschlossen ist.";
      return;
    }
    if (!$("#filament-form").reportValidity()) return;
    const next = structuredClone(inventory);
    const spoolId = $("#filament-spool-id").value || makeId();
    const selectedProductId = $("#filament-product-select").value;
    const product = productFromForm(selectedProductId);
    if (!product.name.trim()) {
      $("#filament-product-name").focus();
      $("#filament-form-message").textContent = "Bitte einen Produktnamen eingeben.";
      return;
    }
    const oldSpool = next.spools.find((spool) => spool.id === spoolId);
    const originalNetWeightG = $("#filament-original-weight").value === ""
      ? product.netWeightG
      : Number($("#filament-original-weight").value);
    const remainingG = $("#filament-remaining-weight").value === ""
      ? (oldSpool?.remainingG ?? null)
      : Number($("#filament-remaining-weight").value);
    if (originalNetWeightG != null && remainingG != null && remainingG > originalNetWeightG) {
      $("#filament-form-message").textContent = "Die Restmenge kann nicht größer als die ursprüngliche Nettomenge sein.";
      return;
    }
    const spool = {
      ...readSpoolFields(),
      id: spoolId,
      productId: product.id,
      originalNetWeightG,
      remainingG,
      consumptions: oldSpool?.consumptions || [],
      createdAt: oldSpool?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const previousProductId = oldSpool?.productId;
    const productIndex = next.products.findIndex((item) => item.id === product.id);
    if (productIndex >= 0) next.products[productIndex] = product;
    else next.products.push(product);
    const spoolIndex = next.spools.findIndex((item) => item.id === spoolId);
    if (spoolIndex >= 0) next.spools[spoolIndex] = spool;
    else next.spools.push(spool);
    const unusedProductId = previousProductId && previousProductId !== product.id ? previousProductId : "";
    if (unusedProductId && !next.spools.some((item) => item.productId === unusedProductId)) {
      next.products = next.products.filter((item) => item.id !== unusedProductId);
    }
    addCustomOption(next, "manufacturers", product.manufacturer);
    addCustomOption(next, "materialTypes", product.materialType);
    try {
      saveInventory(next);
    } catch (error) {
      console.error("Could not save filament spool.", error);
      $("#filament-form-message").textContent = "Rolle konnte nicht gespeichert werden. Prüfe den verfügbaren Speicherplatz.";
      return;
    }
    $("#filament-editor").classList.add("hidden");
    activeSpoolId = spool.id;
    renderAll();
    status(editorMode === "edit" ? "Filamentrolle aktualisiert." : editorMode === "duplicate" ? "Rolle als eigener Spulendatensatz angelegt." : "Filamentrolle gespeichert.", false);
  }

  function addCustomOption(target, key, value) {
    if (!value) return;
    const current = Array.isArray(target.customOptions[key]) ? target.customOptions[key] : [];
    target.customOptions[key] = uniqueSorted([...current, value]);
  }

  function addCustomValue(key, selector) {
    const input = $(selector);
    const value = input.value.trim();
    if (!value) {
      status("Bitte gib zuerst einen Wert ein.");
      return;
    }
    const next = structuredClone(inventory);
    addCustomOption(next, key, value);
    try {
      saveInventory(next);
      input.value = "";
      renderAll();
      status("Auswahlwert ergänzt.", false);
    } catch (error) {
      console.error("Could not save custom filament value.", error);
      status("Auswahlwert konnte nicht gespeichert werden.");
    }
  }

  function money(value) {
    return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(value);
  }

  function unitPrice(spool, product) {
    if (spool.purchasePrice == null || !spool.originalNetWeightG) return null;
    return spool.purchasePrice * 1000 / spool.originalNetWeightG;
  }

  function estimatedRemainingValue(spool, product) {
    const price = unitPrice(spool, product);
    if (price == null || spool.remainingG == null) return null;
    return price * spool.remainingG / 1000;
  }

  function isLow(spool) {
    return spool.remainingG != null && spool.lowStockThresholdG != null &&
      spool.remainingG > 0 && spool.remainingG <= spool.lowStockThresholdG && spool.state !== "archived";
  }

  function remainingPercent(spool) {
    if (!spool.originalNetWeightG || spool.remainingG == null) return null;
    return Math.max(0, Math.min(100, spool.remainingG / spool.originalNetWeightG * 100));
  }

  function getFilteredSpools() {
    const query = $("#filament-query").value.trim().toLocaleLowerCase("de");
    const type = $("#filament-filter-type").value;
    const color = $("#filament-filter-color").value.trim().toLocaleLowerCase("de");
    const diameter = $("#filament-filter-diameter").value;
    const location = $("#filament-filter-location").value.trim().toLocaleLowerCase("de");
    const humidity = $("#filament-filter-humidity").value;
    const remainingFilter = $("#filament-filter-remaining").value;
    const spools = inventory.spools.filter((spool) => {
      const product = productFor(spool);
      if (!product) return false;
      if (type && product.materialType !== type) return false;
      if (color && !`${product.color} ${product.manufacturerColor}`.toLocaleLowerCase("de").includes(color)) return false;
      if (diameter && product.diameter !== diameter) return false;
      if (location && !`${spool.location} ${spool.container}`.toLocaleLowerCase("de").includes(location)) return false;
      if (humidity && spool.humidityStatus !== humidity) return false;
      if (remainingFilter === "low" && !isLow(spool)) return false;
      if (remainingFilter === "open" && spool.state !== "open") return false;
      if (remainingFilter === "full" && spool.state !== "full") return false;
      if (remainingFilter === "empty" && spool.state !== "empty") return false;
      if (remainingFilter === "archived" && spool.state !== "archived") return false;
      if (query) {
        const searchable = [
          product.manufacturer, product.name, product.materialType, product.variant, product.color,
          product.manufacturerColor, product.sku, product.diameter, spool.id, spool.lotNumber,
          spool.location, spool.container, spool.state, spool.humidityStatus, spool.notes,
          spool.printerLink, spool.profileLink
        ].filter(Boolean).join(" ").toLocaleLowerCase("de");
        if (!searchable.includes(query)) return false;
      }
      return true;
    });
    const sortBy = $("#filament-sort").value;
    const direction = $("#filament-sort-direction").value === "desc" ? -1 : 1;
    return spools.sort((first, second) => {
      const firstProduct = productFor(first);
      const secondProduct = productFor(second);
      let firstValue;
      let secondValue;
      if (sortBy === "manufacturer") {
        firstValue = firstProduct?.manufacturer || "";
        secondValue = secondProduct?.manufacturer || "";
      } else if (sortBy === "unitPrice") {
        firstValue = unitPrice(first, firstProduct) ?? -1;
        secondValue = unitPrice(second, secondProduct) ?? -1;
      } else {
        firstValue = first[sortBy] ?? "";
        secondValue = second[sortBy] ?? "";
      }
      if (typeof firstValue === "number" || typeof secondValue === "number") {
        return (Number(firstValue) - Number(secondValue)) * direction;
      }
      return String(firstValue).localeCompare(String(secondValue), "de", { numeric: true }) * direction;
    });
  }

  function renderOverview() {
    const live = inventory.spools.filter((spool) => spool.state !== "archived" && spool.state !== "empty");
    const grams = live.reduce((sum, spool) => sum + (spool.remainingG || 0), 0);
    const value = live.reduce((sum, spool) => sum + (estimatedRemainingValue(spool, productFor(spool)) || 0), 0);
    const lows = live.filter(isLow).length;
    $("#filament-total-weight").textContent = `${new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 }).format(grams)} g`;
    $("#filament-total-value").textContent = money(value);
    $("#filament-count").textContent = `${live.length} / ${lows}`;
    const groups = new Map();
    for (const spool of live) {
      const product = productFor(spool);
      if (!product) continue;
      const key = `${product.materialType || "Material unbekannt"}\u0000${product.color || "Farbe unbekannt"}`;
      const group = groups.get(key) || { material: product.materialType || "Material unbekannt", color: product.color || "Farbe unbekannt", grams: 0, spools: 0 };
      group.grams += spool.remainingG || 0;
      group.spools++;
      groups.set(key, group);
    }
    const container = $("#filament-material-summary");
    container.replaceChildren();
    for (const group of [...groups.values()].sort((a, b) => `${a.material} ${a.color}`.localeCompare(`${b.material} ${b.color}`, "de"))) {
      const item = document.createElement("div");
      item.className = "filament-summary-item card";
      const swatch = document.createElement("span");
      swatch.className = "filament-color-swatch";
      swatch.style.backgroundColor = inventory.products.find((product) => product.materialType === group.material && product.color === group.color)?.colorHex || "#808080";
      swatch.setAttribute("aria-label", `Farbe ${group.color}`);
      const label = document.createElement("span");
      label.textContent = `${group.material} · ${group.color}`;
      const amount = document.createElement("strong");
      amount.textContent = `${group.grams} g · ${group.spools} ${group.spools === 1 ? "Rolle" : "Rollen"}`;
      item.append(swatch, label, amount);
      container.append(item);
    }
  }

  function renderWarnings() {
    const warnings = inventory.spools.filter(isLow).map((spool) => {
      const product = productFor(spool);
      return `${product?.name || product?.materialType || "Filament"} (${product?.color || "Farbe unbekannt"}): noch ${spool.remainingG} g`;
    });
    const region = $("#filament-warnings");
    region.replaceChildren();
    if (warnings.length) {
      const box = document.createElement("div");
      box.className = "filament-warning";
      const title = document.createElement("strong");
      title.textContent = "Niedriger Filamentbestand";
      const list = document.createElement("ul");
      for (const warning of warnings) {
        const item = document.createElement("li");
        item.textContent = warning;
        list.append(item);
      }
      box.append(title, list);
      region.append(box);
    }
  }

  function cardFor(spool) {
    const product = productFor(spool);
    const card = document.createElement("article");
    card.className = "filament-card";
    if (spool.spoolPhoto || product.photo) {
      const image = document.createElement("img");
      image.src = spool.spoolPhoto || product.photo;
      image.alt = `Foto der Filamentrolle ${product.name}`;
      image.loading = "lazy";
      card.append(image);
    }
    const content = document.createElement("div");
    content.className = "filament-card-content";
    const header = document.createElement("div");
    header.className = "filament-card-heading";
    const swatch = document.createElement("span");
    swatch.className = "filament-color-swatch filament-card-swatch";
    swatch.style.backgroundColor = product.colorHex || "#808080";
    swatch.setAttribute("aria-label", `Materialfarbe ${product.color || "unbekannt"}`);
    const titleBlock = document.createElement("div");
    const title = document.createElement("h3");
    title.textContent = product.name || product.materialType || "Filamentrolle";
    const subtitle = document.createElement("p");
    subtitle.textContent = [product.manufacturer, product.materialType, product.variant, product.color].filter(Boolean).join(" · ");
    titleBlock.append(title, subtitle);
    header.append(swatch, titleBlock);
    const percent = remainingPercent(spool);
    const meter = document.createElement("div");
    meter.className = "filament-meter";
    meter.setAttribute("role", "meter");
    meter.setAttribute("aria-valuemin", "0");
    meter.setAttribute("aria-valuemax", "100");
    meter.setAttribute("aria-valuenow", percent == null ? "0" : String(Math.round(percent)));
    const fill = document.createElement("span");
    fill.style.width = `${percent ?? 0}%`;
    fill.style.backgroundColor = product.colorHex || "var(--green)";
    meter.append(fill);
    const quantity = document.createElement("strong");
    quantity.className = "filament-remaining";
    quantity.textContent = `${spool.remainingG == null ? "Unbekannt" : `${spool.remainingG} g`}${percent == null ? "" : ` · ${Math.round(percent)} %`}`;
    const details = document.createElement("p");
    details.className = "filament-card-meta";
    details.textContent = [
      product.diameter ? `${product.diameter} mm` : "",
      spool.location ? `Ort: ${spool.location}` : "",
      spool.lotNumber ? `Lot: ${spool.lotNumber}` : "",
      spool.humidityStatus && spool.humidityStatus !== "Unbekannt" ? spool.humidityStatus : "Feuchtigkeit unbekannt",
      ({ unknown: "Bestand unbekannt", full: "Voll", open: "Angebrochen", empty: "Leer", archived: "Archiviert" })[spool.state] || "Status unbekannt"
    ].filter(Boolean).join(" · ");
    const actions = document.createElement("div");
    actions.className = "filament-card-actions";
    for (const [action, label] of [["view", "Details"], ["edit", "Bearbeiten"], ["duplicate", "Duplizieren"], ["delete", "Löschen"]]) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = action === "delete" ? "button button-quiet" : "button button-secondary";
      button.textContent = label;
      button.dataset.filamentAction = action;
      button.dataset.id = spool.id;
      actions.append(button);
    }
    if (isLow(spool)) {
      const low = document.createElement("span");
      low.className = "filament-low-badge";
      low.textContent = "Niedriger Bestand";
      content.append(header, low);
    } else content.append(header);
    content.append(meter, quantity, details, actions);
    card.append(content);
    return card;
  }

  function renderSpools() {
    const target = $("#filament-cards");
    const spools = getFilteredSpools();
    target.replaceChildren();
    target.classList.toggle("is-list", inventory.view === "list");
    $("#filament-view-grid").setAttribute("aria-pressed", String(inventory.view === "grid"));
    $("#filament-view-list").setAttribute("aria-pressed", String(inventory.view === "list"));
    $("#filament-result-count").textContent = `${spools.length} von ${inventory.spools.length} Rollen`;
    if (!spools.length) {
      const empty = document.createElement("div");
      empty.className = "filament-empty card";
      empty.innerHTML = "<strong>Keine passenden Rollen gefunden.</strong><span>Füge eine Rolle hinzu oder passe die Filter an.</span>";
      target.append(empty);
      return;
    }
    for (const spool of spools) target.append(cardFor(spool));
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[character]);
  }

  function fieldRows(rows) {
    const available = rows.filter(([, value]) => value !== "" && value !== null && value !== undefined);
    if (!available.length) return "";
    return `<dl>${available.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}</dl>`;
  }

  function section(title, rows) {
    const fields = fieldRows(rows);
    return fields ? `<section class="filament-detail-section"><h4>${escapeHtml(title)}</h4>${fields}</section>` : "";
  }

  function spoolStateLabel(state) {
    return ({
      unknown: "Unbekannt",
      full: "Voll",
      open: "Angebrochen",
      empty: "Leer",
      archived: "Archiviert"
    })[state] || state || "Unbekannt";
  }

  function renderDetail(spoolId) {
    const spool = inventory.spools.find((entry) => entry.id === spoolId);
    const product = productFor(spool);
    if (!spool || !product) return;
    activeSpoolId = spoolId;
    const photos = [
      product.photo ? `<figure><img src="${escapeHtml(product.photo)}" alt="Produktfoto: ${escapeHtml(product.name)}" loading="lazy"><figcaption>Produktfoto</figcaption></figure>` : "",
      spool.spoolPhoto ? `<figure><img src="${escapeHtml(spool.spoolPhoto)}" alt="Foto dieser Filamentrolle" loading="lazy"><figcaption>Rollenfoto</figcaption></figure>` : ""
    ].join("");
    const technical = Object.entries(product.technical || {}).map(([key, value]) => [key, value]);
    const customTech = (product.customTechnical || []).map((entry) => [`${entry.key}${entry.unit ? ` (${entry.unit})` : ""}`, entry.value]);
    const consumptions = [...(spool.consumptions || [])].sort((a, b) => b.date.localeCompare(a.date));
    const history = consumptions.length
      ? `<ul class="filament-consumption-history">${consumptions.map((entry) => `<li><span>${escapeHtml(entry.date)} · ${entry.grams} g${entry.project ? ` · ${escapeHtml(entry.project)}` : ""}</span><button class="button button-quiet" type="button" data-undo-consumption="${escapeHtml(entry.id)}">Buchung rückgängig</button></li>`).join("")}</ul>`
      : "<p class=\"muted\">Noch keine Verbrauchsbuchungen.</p>";
    const formProfiles = inventory.profiles.map((profile) => {
      const matching = [profile.manufacturer, profile.materialType, profile.variant].every((part) => !part || [
        product.manufacturer, product.materialType, product.variant
      ].includes(part));
      return matching ? profile : null;
    }).filter(Boolean);
    const profileInfo = formProfiles.map((profile) => `${profile.name}${profile.printer ? ` (${profile.printer})` : ""}`).join(", ");
    const detail = $("#filament-detail");
    detail.innerHTML = `<div class="filament-detail-heading"><div><p class="eyebrow">ROLLENDETAILS</p><h3 id="filament-detail-heading">${escapeHtml(product.name)}</h3><p class="muted">${escapeHtml([product.manufacturer, product.materialType, product.variant, product.color].filter(Boolean).join(" · "))}</p></div><div class="filament-detail-actions"><button class="button button-secondary" type="button" data-spool-action="edit" data-id="${escapeHtml(spool.id)}">Bearbeiten</button><button class="button button-secondary" type="button" data-spool-action="duplicate" data-id="${escapeHtml(spool.id)}">Duplizieren</button><button class="button button-secondary" type="button" data-spool-action="delete" data-id="${escapeHtml(spool.id)}">Löschen</button><button class="icon-button" type="button" data-spool-action="close" aria-label="Details schließen">×</button></div></div><div class="filament-state-actions"><button class="button button-quiet" type="button" data-set-spool-state="empty">Als leer markieren</button><button class="button button-quiet" type="button" data-set-spool-state="archived">Archivieren</button><button class="button button-quiet" type="button" data-set-spool-state="open">Als angebrochen markieren</button></div>${photos ? `<div class="filament-detail-gallery">${photos}</div>` : ""}<div class="filament-detail-grid">${section("Produkt", [
      ["Hersteller", product.manufacturer], ["Produkt", product.name], ["Materialtyp", product.materialType],
      ["Variante", product.variant], ["Farbe", product.color], ["Hersteller-Farbname", product.manufacturerColor],
      ["Farbcode", product.colorHex], ["Artikelnummer", product.sku], ["Durchmesser", product.diameter ? `${product.diameter} mm` : ""],
      ["Nettogewicht", product.netWeightG == null ? "" : `${product.netWeightG} g`],
      ["Leere Spule", product.emptySpoolWeightG == null ? "" : `${product.emptySpoolWeightG} g`],
      ["Volle Rolle gesamt", product.fullWeightG == null ? "" : `${product.fullWeightG} g`],
      ["Spulentyp", product.spoolType], ["Spulenmaterial", product.spoolMaterial],
      ["Spulendurchmesser", product.spoolDiameterMm == null ? "" : `${product.spoolDiameterMm} mm`],
      ["Spulenbreite", product.spoolWidthMm == null ? "" : `${product.spoolWidthMm} mm`],
      ["Herstellungsdatum", product.manufacturedDate], ["Lagerfrist", product.shelfLife],
      ...technical, ...customTech
    ])}${section("Rolle & Bestand", [
      ["Kennung", spool.id], ["Chargen- / Lotnummer", spool.lotNumber],
      ["Ursprüngliches Nettogewicht", spool.originalNetWeightG == null ? "" : `${spool.originalNetWeightG} g`],
      ["Aktuelle Restmenge", spool.remainingG == null ? "" : `${spool.remainingG} g`],
      ["Restanteil", remainingPercent(spool) == null ? "" : `${Math.round(remainingPercent(spool))} %`],
      ["Gewogenes Gesamtgewicht", spool.weighedTotalG == null ? "" : `${spool.weighedTotalG} g`],
      ["Status", spoolStateLabel(spool.state)], ["Warnschwelle", spool.lowStockThresholdG == null ? "" : `${spool.lowStockThresholdG} g`],
      ["Kaufdatum", spool.purchaseDate], ["Kaufpreis", spool.purchasePrice == null ? "" : money(spool.purchasePrice)],
      ["Preis pro kg", unitPrice(spool, product) == null ? "" : `${money(unitPrice(spool, product))} / kg`],
      ["Restwert-Schätzung", estimatedRemainingValue(spool, product) == null ? "" : money(estimatedRemainingValue(spool, product))],
      ["Händler", spool.dealer], ["Lagerort", spool.location], ["Behälter", spool.container],
      ["Lagerungsstatus", spool.storageStatus], ["Feuchtigkeitsstatus", spool.humidityStatus || "Unbekannt"],
      ["Manuell gemessene Luftfeuchtigkeit", spool.humidityPercent == null ? "" : `${spool.humidityPercent} %`],
      ["Letzte Trocknung", spool.lastDriedDate],
      ["Trocknung", spool.dryingTemperatureC == null ? "" : `${spool.dryingTemperatureC} °C`],
      ["Trocknungsdauer", spool.dryingDurationHours == null ? "" : `${spool.dryingDurationHours} Stunden`],
      ["Drucker", spool.printerLink], ["Persönliches Profil", spool.profileLink || profileInfo],
      ["Notizen", spool.notes]
    ])}</div><section class="filament-consumption-section"><h4>Verbrauch buchen</h4><p>Die Restmenge wird erst nach deiner Bestätigung reduziert. Die Buchung lässt sich einzeln rückgängig machen.</p><form class="filament-consumption-form" data-consumption-form="${escapeHtml(spool.id)}"><label>Verbrauch (g)<input name="grams" type="number" min="1" max="${Math.max(1, spool.remainingG || 100000)}" step="1" required></label><label>Datum<input name="date" type="date" value="${today()}" required></label><label>Projekt (optional)<input name="project" maxlength="180"></label><button class="button button-primary" type="submit">Verbrauch buchen</button></form><h4>Verbrauchshistorie</h4>${history}</section>`;
    detail.classList.remove("hidden");
    detail.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function renderProfiles() {
    const container = $("#filament-profiles");
    container.replaceChildren();
    for (const profile of inventory.profiles) {
      const item = document.createElement("article");
      item.className = "filament-profile-item";
      const info = document.createElement("div");
      const title = document.createElement("strong");
      title.textContent = profile.name;
      const text = document.createElement("p");
      text.textContent = [profile.manufacturer, profile.materialType, profile.variant, profile.printer, ...Object.entries(profile.settings || {}).map(([key, value]) => `${key}: ${value}`), profile.notes].filter(Boolean).join(" · ");
      info.append(title, text);
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "button button-quiet";
      remove.textContent = "Profil löschen";
      remove.dataset.deleteProfile = profile.id;
      item.append(info, remove);
      container.append(item);
    }
  }

  function amsSlotCount(model, customCount = 4) {
    if (model === "AMS HT") return 1;
    if (model === "Benutzerdefiniert") return customCount;
    return 4;
  }

  function renderAms() {
    const container = $("#filament-ams-list");
    container.replaceChildren();
    const globallyAssigned = new Set(inventory.amsUnits.flatMap((unit) => unit.slots).filter(Boolean));
    if (!inventory.amsUnits.length) {
      const empty = document.createElement("p");
      empty.className = "filament-ams-empty";
      empty.textContent = "Noch kein AMS eingerichtet. Wähle ein Modell und ordne es einem Drucker zu.";
      container.append(empty);
      return;
    }
    for (const unit of inventory.amsUnits) {
      const card = document.createElement("article");
      card.className = "filament-ams-unit";
      const heading = document.createElement("div");
      heading.className = "filament-ams-unit-heading";
      const title = document.createElement("div");
      title.innerHTML = `<span class="filament-ams-icon" aria-hidden="true">▤</span><div><h4>${escapeHtml(unit.name || unit.model)}</h4><p>${escapeHtml(unit.model)}${unit.printer ? ` · ${escapeHtml(unit.printer)}` : ""} · ${unit.slots.length} ${unit.slots.length === 1 ? "Slot" : "Slots"}</p></div>`;
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "button button-quiet";
      remove.textContent = "AMS entfernen";
      remove.dataset.removeAms = unit.id;
      heading.append(title, remove);
      const labels = document.createElement("form");
      labels.className = "filament-ams-label-form";
      labels.dataset.amsLabelForm = unit.id;
      labels.innerHTML = `<label>Beschriftung<input name="name" maxlength="100" value="${escapeHtml(unit.name)}" required></label><label>Drucker-Zuordnung<input name="printer" maxlength="120" value="${escapeHtml(unit.printer)}" placeholder="Druckername oder Standort"></label><button class="button button-secondary" type="submit">Zuordnung speichern</button>`;
      const slots = document.createElement("div");
      slots.className = "filament-ams-slots";
      unit.slots.forEach((spoolId, index) => {
        const assigned = inventory.spools.find((spool) => spool.id === spoolId);
        const product = assigned ? productFor(assigned) : null;
        const slot = document.createElement("section");
        slot.className = "filament-ams-slot";
        const slotHeading = document.createElement("div");
        slotHeading.className = "filament-ams-slot-heading";
        const swatch = document.createElement("span");
        swatch.className = "filament-color-swatch";
        swatch.style.backgroundColor = product?.colorHex || "#808080";
        swatch.setAttribute("aria-label", `Slot ${index + 1}: ${product?.color || "Farbe nicht ausgewählt"}`);
        const slotTitle = document.createElement("h5");
        slotTitle.textContent = `Slot ${index + 1}`;
        slotHeading.append(swatch, slotTitle);
        const selectLabel = document.createElement("label");
        selectLabel.textContent = "Filamentrolle";
        const select = document.createElement("select");
        select.dataset.amsSlot = unit.id;
        select.dataset.slotIndex = String(index);
        select.add(new Option("Nicht belegt", ""));
        const availableSpools = inventory.spools.filter((spool) =>
          spool.id === spoolId ||
          (!globallyAssigned.has(spool.id) && spool.state !== "archived")
        );
        availableSpools.sort((first, second) => {
          const firstProduct = productFor(first);
          const secondProduct = productFor(second);
          return `${firstProduct?.manufacturer || ""} ${firstProduct?.name || ""} ${firstProduct?.color || ""}`
            .localeCompare(`${secondProduct?.manufacturer || ""} ${secondProduct?.name || ""} ${secondProduct?.color || ""}`, "de");
        });
        for (const spool of availableSpools) {
          const spoolProduct = productFor(spool);
          if (!spoolProduct) continue;
          const label = [
            spoolProduct.manufacturer,
            spoolProduct.name,
            spoolProduct.materialType,
            spoolProduct.color,
            spool.remainingG == null ? "Rest unbekannt" : `${spool.remainingG} g`
          ].filter(Boolean).join(" · ");
          select.add(new Option(label, spool.id));
        }
        select.value = spoolId || "";
        selectLabel.append(select);
        slot.append(slotHeading, selectLabel);
        if (assigned && product) {
          const stock = document.createElement("p");
          stock.className = "filament-ams-stock";
          stock.textContent = `${product.materialType || "Material unbekannt"} · ${product.color || "Farbe unbekannt"} · ${assigned.remainingG == null ? "Restmenge unbekannt" : `${assigned.remainingG} g vorhanden`}`;
          slot.append(stock);
          if (assigned.remainingG != null && assigned.remainingG > 0 && assigned.state !== "archived") {
            const consumption = document.createElement("form");
            consumption.className = "filament-ams-consumption";
            consumption.dataset.consumptionForm = assigned.id;
            consumption.innerHTML = `<label>Verbrauch (g)<input name="grams" type="number" min="1" max="${Math.max(1, assigned.remainingG)}" step="1" required></label><input name="date" type="hidden" value="${today()}"><input name="project" type="hidden" value="${escapeHtml(`${unit.name || unit.model} · Slot ${index + 1}${unit.printer ? ` · ${unit.printer}` : ""}`)}"><button class="button button-secondary" type="submit">Verbrauch buchen</button>`;
            slot.append(consumption);
          } else {
            const note = document.createElement("p");
            note.className = "filament-ams-note";
            note.textContent = assigned.remainingG == null
              ? "Erfasse zuerst die Restmenge in den Rollendetails, bevor du Verbrauch buchst."
              : "Diese Rolle hat keinen buchbaren Restbestand.";
            slot.append(note);
          }
        } else {
          const emptySlot = document.createElement("p");
          emptySlot.className = "filament-ams-note";
          emptySlot.textContent = "Wähle eine vorhandene Rolle aus deinem Filamentbestand.";
          slot.append(emptySlot);
        }
        slots.append(slot);
      });
      card.append(heading, labels, slots);
      container.append(card);
    }
  }

  function renderAll() {
    fillDatalists();
    fillFilters();
    fillFormOptions();
    renderOverview();
    renderWarnings();
    renderAms();
    renderSpools();
    renderProfiles();
  }

  function changeState(spool, newState) {
    const next = structuredClone(inventory);
    const target = next.spools.find((entry) => entry.id === spool.id);
    if (!target) return;
    target.state = newState;
    if (newState === "empty") {
      target.remainingG = 0;
      target.weighedTotalG = null;
    }
    target.updatedAt = new Date().toISOString();
    try {
      saveInventory(next);
      renderAll();
      if (activeSpoolId) renderDetail(activeSpoolId);
      status(newState === "empty" ? "Rolle als leer markiert." : newState === "archived" ? "Rolle archiviert." : "Rolle aktualisiert.", false);
    } catch (error) {
      console.error("Could not update filament spool state.", error);
      status("Rollenstatus konnte nicht gespeichert werden.");
    }
  }

  function deleteSpool(spool) {
    if (!window.confirm(`Filamentrolle „${productFor(spool)?.name || "ohne Namen"}“ (${spool.id.slice(0, 8)}) endgültig löschen? Die Verbrauchshistorie dieser Rolle wird ebenfalls entfernt.`)) return;
    const next = structuredClone(inventory);
    next.spools = next.spools.filter((entry) => entry.id !== spool.id);
    next.products = next.products.filter((product) => next.spools.some((entry) => entry.productId === product.id));
    next.amsUnits = next.amsUnits.map((unit) => ({
      ...unit,
      slots: unit.slots.map((assignedId) => assignedId === spool.id ? null : assignedId)
    }));
    try {
      saveInventory(next);
      activeSpoolId = "";
      $("#filament-detail").classList.add("hidden");
      renderAll();
      status("Filamentrolle gelöscht.", false);
    } catch (error) {
      console.error("Could not delete filament spool.", error);
      status("Löschen fehlgeschlagen. Die Rolle wurde nicht geändert.");
    }
  }

  function bookConsumption(event) {
    event.preventDefault();
    const form = event.target.closest("[data-consumption-form]");
    if (!form) return;
    const spool = inventory.spools.find((entry) => entry.id === form.dataset.consumptionForm);
    if (!spool) return;
    const formData = new FormData(form);
    const grams = Number(formData.get("grams"));
    const date = String(formData.get("date") || "");
    const project = String(formData.get("project") || "").trim();
    if (!Number.isFinite(grams) || grams <= 0 || (spool.remainingG != null && grams > spool.remainingG)) {
      status("Verbrauchsmenge muss positiv sein und darf die Restmenge nicht überschreiten.");
      return;
    }
    const product = productFor(spool);
    const confirmation = `Verbrauch von ${grams} g${project ? ` für „${project}“` : ""} am ${date} von „${product?.name || "Filament"}“ buchen?`;
    if (!window.confirm(confirmation)) return;
    const next = structuredClone(inventory);
    const target = next.spools.find((entry) => entry.id === spool.id);
    target.remainingG = target.remainingG == null ? null : Math.max(0, target.remainingG - grams);
    target.state = target.remainingG === 0 ? "empty" : "open";
    target.consumptions = [...(target.consumptions || []), { id: makeId(), date, grams, project }];
    target.updatedAt = new Date().toISOString();
    try {
      saveInventory(next);
      renderAll();
      renderDetail(target.id);
      status("Verbrauch bestätigt und gebucht.", false);
    } catch (error) {
      console.error("Could not book filament consumption.", error);
      status("Verbrauch konnte nicht gespeichert werden; Restmenge blieb unverändert.");
    }
  }

  function undoConsumption(event) {
    const button = event.target.closest("[data-undo-consumption]");
    if (!button) return;
    const spool = inventory.spools.find((entry) => entry.id === activeSpoolId);
    const item = spool?.consumptions?.find((entry) => entry.id === button.dataset.undoConsumption);
    if (!spool || !item) return;
    if (!window.confirm(`Verbrauchsbuchung über ${item.grams} g vom ${item.date} rückgängig machen? Die Menge wird der Rolle wieder gutgeschrieben.`)) return;
    const next = structuredClone(inventory);
    const target = next.spools.find((entry) => entry.id === spool.id);
    target.consumptions = target.consumptions.filter((entry) => entry.id !== item.id);
    if (target.remainingG != null) target.remainingG += item.grams;
    target.state = target.remainingG === 0 ? "empty" : "open";
    target.updatedAt = new Date().toISOString();
    try {
      saveInventory(next);
      renderAll();
      renderDetail(target.id);
      status("Verbrauchsbuchung rückgängig gemacht.", false);
    } catch (error) {
      console.error("Could not reverse filament consumption.", error);
      status("Buchung konnte nicht rückgängig gemacht werden.");
    }
  }

  function calculateRemainingFromWeight() {
    if (!$("#filament-weighed-total").value || !$("#filament-empty-spool-weight").value) {
      $("#filament-form-message").textContent = "Bitte trage sowohl das gewogene Gesamtgewicht als auch das bekannte Leergewicht der Spule ein.";
      return;
    }
    const total = Number($("#filament-weighed-total").value);
    const empty = Number($("#filament-empty-spool-weight").value);
    if (!Number.isFinite(total) || !Number.isFinite(empty) || total < empty) {
      $("#filament-form-message").textContent = "Trage ein gültiges Gesamtgewicht und ein bekanntes Spulengewicht ein; Gesamtgewicht muss mindestens so hoch sein wie das Leergewicht.";
      return;
    }
    const remaining = Math.round(total - empty);
    const original = Number($("#filament-original-weight").value || $("#filament-net-weight").value);
    if (original > 0 && remaining > original) {
      $("#filament-form-message").textContent = `Das berechnete Nettogewicht (${remaining} g) ist größer als die bekannte ursprüngliche Menge (${original} g). Bitte prüfe die Gewichte.`;
      return;
    }
    $("#filament-remaining-weight").value = String(remaining);
    $("#filament-state").value = remaining === 0 ? "empty" : original > 0 && remaining < original ? "open" : "full";
    $("#filament-form-message").textContent = "Restmenge aus Gesamtgewicht minus Leergewicht der Spule berechnet. Bitte Wert prüfen und speichern.";
  }

  function renderPhotos() {
    for (const [selector, photo, kind] of [
      ["#filament-product-photo-preview", productPhotoDraft, "Produktfoto"],
      ["#filament-spool-photo-preview", spoolPhotoDraft, "Rollenfoto"]
    ]) {
      const gallery = $(selector);
      gallery.replaceChildren();
      if (!photo) continue;
      const figure = document.createElement("figure");
      const image = document.createElement("img");
      image.src = photo;
      image.alt = kind;
      const caption = document.createElement("figcaption");
      caption.textContent = kind;
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "icon-button";
      remove.textContent = "×";
      remove.setAttribute("aria-label", `${kind} entfernen`);
      remove.dataset.removeFilamentPhoto = kind === "Produktfoto" ? "product" : "spool";
      figure.append(image, caption, remove);
      gallery.append(figure);
    }
  }

  async function resizePhoto(file) {
    if (!file.type.startsWith("image/")) throw new Error("Bitte eine Bilddatei auswählen.");
    if (file.size > 12 * 1024 * 1024) throw new Error("Das Bild ist größer als 12 MB.");
    const bitmap = await createImageBitmap(file);
    let dimension = Math.min(1400, Math.max(bitmap.width, bitmap.height));
    try {
      while (dimension >= 400) {
        const scale = Math.min(1, dimension / Math.max(bitmap.width, bitmap.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(bitmap.width * scale));
        canvas.height = Math.max(1, Math.round(bitmap.height * scale));
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Die Bildverarbeitung ist in diesem Browser nicht verfügbar.");
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        for (const quality of [0.78, 0.62, 0.48, 0.34, 0.24]) {
          const image = canvas.toDataURL("image/jpeg", quality);
          if (image.length <= 200_000) return image;
        }
        dimension = Math.floor(dimension * 0.8);
      }
    } finally {
      bitmap.close();
    }
    throw new Error("Das Bild konnte nicht ausreichend verkleinert werden.");
  }

  function saveProfile(event) {
    event.preventDefault();
    const name = $("#filament-profile-name").value.trim();
    if (!name) return;
    const settings = Object.fromEntries($("#filament-profile-settings").value.split(/[;\n]/)
      .map((line) => line.split(":").map((part) => part.trim()))
      .filter(([key, value]) => key && value));
    const profile = {
      id: makeId(),
      name,
      manufacturer: $("#filament-profile-manufacturer").value.trim(),
      materialType: $("#filament-profile-type").value.trim(),
      variant: $("#filament-profile-variant").value.trim(),
      printer: $("#filament-profile-printer").value.trim(),
      settings,
      notes: $("#filament-profile-notes").value.trim()
    };
    const next = structuredClone(inventory);
    next.profiles.push(profile);
    try {
      saveInventory(next);
      $("#filament-profile-form").reset();
      renderAll();
      status("Persönliches Druckprofil gespeichert.", false);
    } catch (error) {
      console.error("Could not save filament profile.", error);
      status("Druckprofil konnte nicht gespeichert werden.");
    }
  }

  function addAms(event) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const model = $("#filament-ams-model").value;
    const slotCount = amsSlotCount(model, Number($("#filament-ams-custom-slots").value));
    if (!Number.isInteger(slotCount) || slotCount < 1 || slotCount > 16) {
      status("Die Anzahl der AMS-Slots muss zwischen 1 und 16 liegen.");
      return;
    }
    const name = $("#filament-ams-name").value.trim() || model;
    const printer = $("#filament-ams-printer").value.trim();
    const next = structuredClone(inventory);
    next.amsUnits.push({
      id: makeId(),
      model,
      name,
      printer,
      slots: Array(slotCount).fill(null)
    });
    try {
      saveInventory(next);
      form.reset();
      $("#filament-ams-model").value = "AMS 2 Pro";
      $("#filament-ams-custom-slots-wrap").classList.add("hidden");
      $("#filament-ams-custom-slots").value = "4";
      renderAll();
      status(`${name} wurde hinzugefügt.`, false);
    } catch (error) {
      console.error("Could not save filament AMS.", error);
      status("AMS konnte nicht gespeichert werden.");
    }
  }

  function saveAmsLabels(event) {
    event.preventDefault();
    const form = event.target.closest("[data-ams-label-form]");
    if (!form || !form.reportValidity()) return;
    const unit = inventory.amsUnits.find((entry) => entry.id === form.dataset.amsLabelForm);
    if (!unit) return;
    const data = new FormData(form);
    const name = String(data.get("name") || "").trim();
    if (!name) {
      status("Bitte gib eine Beschriftung für das AMS ein.");
      return;
    }
    const next = structuredClone(inventory);
    const target = next.amsUnits.find((entry) => entry.id === unit.id);
    target.name = name;
    target.printer = String(data.get("printer") || "").trim();
    try {
      saveInventory(next);
      renderAll();
      status("AMS-Beschriftung und Drucker-Zuordnung gespeichert.", false);
    } catch (error) {
      console.error("Could not update filament AMS labels.", error);
      status("AMS-Zuordnung konnte nicht gespeichert werden.");
    }
  }

  function assignAmsSlot(event) {
    const select = event.target.closest("[data-ams-slot]");
    if (!select) return;
    const unit = inventory.amsUnits.find((entry) => entry.id === select.dataset.amsSlot);
    const slotIndex = Number(select.dataset.slotIndex);
    if (!unit || !Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex >= unit.slots.length) return;
    const spoolId = select.value || null;
    if (spoolId && inventory.amsUnits.some((entry) =>
      entry.slots.some((assignedId, index) =>
        assignedId === spoolId && (entry.id !== unit.id || index !== slotIndex)))) {
      status("Diese Rolle ist bereits einem anderen AMS-Slot zugeordnet.");
      renderAms();
      return;
    }
    const next = structuredClone(inventory);
    const target = next.amsUnits.find((entry) => entry.id === unit.id);
    target.slots[slotIndex] = spoolId;
    try {
      saveInventory(next);
      renderAll();
      status(spoolId ? "Filamentrolle dem AMS-Slot zugeordnet." : "AMS-Slot geleert.", false);
    } catch (error) {
      console.error("Could not assign filament to AMS slot.", error);
      status("AMS-Slot konnte nicht gespeichert werden.");
    }
  }

  function removeAms(event) {
    const button = event.target.closest("[data-remove-ams]");
    if (!button) return;
    const unit = inventory.amsUnits.find((entry) => entry.id === button.dataset.removeAms);
    if (!unit || !window.confirm(`„${unit.name || unit.model}“ entfernen? Die Filamentrollen und deren Verbrauchshistorie bleiben erhalten.`)) return;
    const next = structuredClone(inventory);
    next.amsUnits = next.amsUnits.filter((entry) => entry.id !== unit.id);
    try {
      saveInventory(next);
      renderAll();
      status("AMS entfernt. Die Rollen bleiben im Bestand.", false);
    } catch (error) {
      console.error("Could not remove filament AMS.", error);
      status("AMS konnte nicht entfernt werden.");
    }
  }

  $("#filament-create").addEventListener("click", () => openEditor());
  $("#filament-form").addEventListener("submit", saveSpool);
  $("#filament-editor-close").addEventListener("click", () => $("#filament-editor").classList.add("hidden"));
  $("#filament-editor-cancel").addEventListener("click", () => $("#filament-editor").classList.add("hidden"));
  $("#filament-product-select").addEventListener("change", syncProductChoice);
  $("#filament-material-type").addEventListener("change", () => {
    if ($("#filament-material-type").value === "__custom__") {
      const value = window.prompt("Eigener Materialtyp:");
      if (!value?.trim()) $("#filament-material-type").value = "";
      else {
        const custom = value.trim();
        const select = $("#filament-material-type");
        select.add(new Option(custom, custom, true, true));
      }
    }
    updateMaterialHints();
  });
  $("#filament-diameter").addEventListener("change", () => {
    $("#filament-custom-diameter-wrap").classList.toggle("hidden", $("#filament-diameter").value !== "custom");
    if ($("#filament-diameter").value !== "custom") $("#filament-custom-diameter").value = "";
  });
  $("#filament-calculate-weight").addEventListener("click", calculateRemainingFromWeight);
  for (const selector of ["#filament-net-weight", "#filament-purchase-price"]) {
    $(selector).addEventListener("input", updateUnitPrice);
  }
  for (const [selector, kind] of [["#filament-product-photo-input", "product"], ["#filament-spool-photo-input", "spool"]]) {
    $(selector).addEventListener("change", async (event) => {
      const file = event.target.files[0];
      event.target.value = "";
      if (!file) return;
      photoProcessing = true;
      try {
        const photo = await resizePhoto(file);
        if (kind === "product") productPhotoDraft = photo;
        else spoolPhotoDraft = photo;
        renderPhotos();
      } catch (error) {
        console.error("Could not add filament photo.", error);
        $("#filament-form-message").textContent = error.message;
      } finally {
        photoProcessing = false;
      }
    });
  }
  for (const selector of ["#filament-product-photo-preview", "#filament-spool-photo-preview"]) {
    $(selector).addEventListener("click", (event) => {
      const button = event.target.closest("[data-remove-filament-photo]");
      if (!button) return;
      if (button.dataset.removeFilamentPhoto === "product") productPhotoDraft = "";
      else spoolPhotoDraft = "";
      renderPhotos();
    });
  }
  $("#filament-cards").addEventListener("click", (event) => {
    const button = event.target.closest("[data-filament-action]");
    if (!button) return;
    const spool = inventory.spools.find((entry) => entry.id === button.dataset.id);
    if (!spool) return;
    if (button.dataset.filamentAction === "view") renderDetail(spool.id);
    if (button.dataset.filamentAction === "edit") openEditor("edit", spool);
    if (button.dataset.filamentAction === "duplicate") openEditor("duplicate", spool);
    if (button.dataset.filamentAction === "delete") deleteSpool(spool);
  });
  $("#filament-detail").addEventListener("click", (event) => {
    const stateButton = event.target.closest("[data-set-spool-state]");
    if (stateButton) {
      const spool = inventory.spools.find((entry) => entry.id === activeSpoolId);
      if (spool) changeState(spool, stateButton.dataset.setSpoolState);
      return;
    }
    const undoButton = event.target.closest("[data-undo-consumption]");
    if (undoButton) {
      undoConsumption(event);
      return;
    }
    const button = event.target.closest("[data-spool-action]");
    if (!button) return;
    if (button.dataset.spoolAction === "close") {
      $("#filament-detail").classList.add("hidden");
      activeSpoolId = "";
      return;
    }
    const spool = inventory.spools.find((entry) => entry.id === button.dataset.id);
    if (!spool) return;
    if (button.dataset.spoolAction === "edit") openEditor("edit", spool);
    if (button.dataset.spoolAction === "duplicate") openEditor("duplicate", spool);
    if (button.dataset.spoolAction === "delete") deleteSpool(spool);
  });
  $("#filament-detail").addEventListener("submit", bookConsumption);
  for (const selector of [
    "#filament-query", "#filament-filter-type", "#filament-filter-color", "#filament-filter-diameter",
    "#filament-filter-remaining", "#filament-filter-location", "#filament-filter-humidity",
    "#filament-sort", "#filament-sort-direction"
  ]) $(selector).addEventListener("input", renderSpools);
  $("#filament-clear-filters").addEventListener("click", () => {
    for (const selector of ["#filament-query", "#filament-filter-type", "#filament-filter-color", "#filament-filter-diameter", "#filament-filter-remaining", "#filament-filter-location", "#filament-filter-humidity"]) $(selector).value = "";
    $("#filament-sort").value = "remainingG";
    $("#filament-sort-direction").value = "asc";
    renderSpools();
  });
  for (const [selector, view] of [["#filament-view-grid", "grid"], ["#filament-view-list", "list"]]) {
    $(selector).addEventListener("click", () => {
      const next = structuredClone(inventory);
      next.view = view;
      try {
        saveInventory(next);
        renderSpools();
      } catch (error) {
        console.error("Could not save filament view preference.", error);
        status("Ansicht konnte nicht gespeichert werden.");
      }
    });
  }
  $("#filament-save-type").addEventListener("click", () => addCustomValue("materialTypes", "#filament-add-type"));
  $("#filament-save-manufacturer").addEventListener("click", () => addCustomValue("manufacturers", "#filament-add-manufacturer"));
  $("#filament-profile-form").addEventListener("submit", saveProfile);
  $("#filament-ams-add-form").addEventListener("submit", addAms);
  $("#filament-ams-model").addEventListener("change", () => {
    const custom = $("#filament-ams-model").value === "Benutzerdefiniert";
    $("#filament-ams-custom-slots-wrap").classList.toggle("hidden", !custom);
  });
  $("#filament-ams-list").addEventListener("click", removeAms);
  $("#filament-ams-list").addEventListener("change", assignAmsSlot);
  $("#filament-ams-list").addEventListener("submit", (event) => {
    if (event.target.closest("[data-ams-label-form]")) saveAmsLabels(event);
    else if (event.target.closest("[data-consumption-form]")) bookConsumption(event);
  });
  $("#filament-profiles").addEventListener("click", (event) => {
    const button = event.target.closest("[data-delete-profile]");
    if (!button || !window.confirm("Dieses persönliche Druckprofil löschen? Die bereits gespeicherten Druckdaten an Rollen bleiben unverändert.")) return;
    const next = structuredClone(inventory);
    next.profiles = next.profiles.filter((profile) => profile.id !== button.dataset.deleteProfile);
    try {
      saveInventory(next);
      renderAll();
      status("Druckprofil gelöscht.", false);
    } catch (error) {
      console.error("Could not delete filament profile.", error);
      status("Druckprofil konnte nicht gelöscht werden.");
    }
  });
  $("#filament-material-summary").addEventListener("click", (event) => {
    const item = event.target.closest(".filament-summary-item");
    if (!item) return;
    const label = item.querySelector("span:not(.filament-color-swatch)")?.textContent || "";
    const [material, color] = label.split(" · ");
    $("#filament-filter-type").value = material;
    $("#filament-filter-color").value = color === "Farbe unbekannt" ? "" : color;
    renderSpools();
  });
  $("#library-search-results").addEventListener("click", (event) => {
    const button = event.target.closest("[data-open-filament]");
    if (!button) return;
    const spool = inventory.spools.find((entry) => entry.id === button.dataset.openFilament);
    if (!spool) return;
    $('[data-view="filaments"]').click();
    renderDetail(spool.id);
  });
  window.addEventListener("katalogic:filament-inventory-imported", () => {
    inventory = loadInventory();
    $("#filament-editor").classList.add("hidden");
    $("#filament-detail").classList.add("hidden");
    renderAll();
  });
  window.addEventListener("katalogic:filament-candidate", (event) => {
    openEditor();
    const candidate = event.detail || {};
    $("#filament-product-name").value = candidate.name || "";
    $("#filament-sku").value = candidate.barcode || "";
    $("#filament-manufacturer").value = candidate.brand || "";
    $("#filament-form-message").textContent = "Produkttreffer übernommen. Unbekannte Material- und Rollendaten bleiben leer; bitte Angaben prüfen.";
  });

  inventory = loadInventory();
  fillMaterialTypes();
  renderAll();
  if (loadWarning) status(loadWarning);
})();
