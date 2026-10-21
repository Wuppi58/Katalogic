"use strict";

(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const storage = window.KatalogicSmallPartsStorage;
  if (!storage) return;

  const form = $("#small-parts-item-form");
  const cameraPanel = $("#small-parts-camera-panel");
  const video = $("#small-parts-camera-video");
  let data = storage.load();
  let editingId = "";
  let editImages = [];
  let cameraStream = null;
  let detector = null;
  let cameraFrame = 0;

  const uuid = () => crypto.randomUUID();
  const now = () => new Date().toISOString();
  const number = (selector) => {
    const value = $(selector).value.trim();
    return value === "" ? null : Number(value);
  };
  const uniqueCode = (prefix, rows) => {
    let code;
    do {
      code = `${prefix}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    } while (rows.some((row) => row.barcode === code));
    return code;
  };

  function save() {
    try {
      storage.save(data);
      render();
    } catch (error) {
      data = storage.load();
      $("#small-parts-form-message").textContent = `Speichern fehlgeschlagen: ${error.message}`;
      $("#small-parts-form-message").classList.add("error");
      throw error;
    }
  }

  function locationName(id) {
    const location = data.locations.find((entry) => entry.id === id);
    if (!location) return "Kein Lagerort";
    const parent = location.parentId ? locationName(location.parentId) : "";
    return [parent, location.name].filter(Boolean).join(" / ");
  }

  function isInLocationBranch(locationId, ancestorId) {
    let current = data.locations.find((entry) => entry.id === locationId);
    while (current) {
      if (current.id === ancestorId) return true;
      current = data.locations.find((entry) => entry.id === current.parentId);
    }
    return false;
  }

  function stockStatus(item) {
    if (item.archivedAt) return "archived";
    if (item.reorderLevel === null || item.reorderLevel === undefined) return "unknown";
    return item.quantity <= item.reorderLevel ? "low" : "ok";
  }

  function renderLocations() {
    const selected = $("#small-parts-location-select").value;
    const parent = $("#small-parts-location-parent").value;
    const sorted = [...data.locations].sort((a, b) =>
      locationName(a.id).localeCompare(locationName(b.id), "de"));
    const options = [new Option("Kein Lagerort festgelegt", "")];
    const parentOptions = [new Option("Keiner (oberste Ebene)", "")];
    for (const location of sorted) {
      const label = locationName(location.id);
      options.push(new Option(label, location.id));
      parentOptions.push(new Option(label, location.id));
    }
    $("#small-parts-location-select").replaceChildren(...options);
    $("#small-parts-location-parent").replaceChildren(...parentOptions);
    $("#small-parts-location-select").value = selected;
    $("#small-parts-location-parent").value = parent;
    const list = $("#small-parts-locations");
    list.replaceChildren();
    for (const location of sorted) {
      const row = document.createElement("article");
      row.className = "small-parts-location-row";
      const name = document.createElement("strong");
      name.textContent = locationName(location.id);
      const code = document.createElement("span");
      code.textContent = location.barcode;
      const edit = action("Umbenennen", () => renameLocation(location));
      const printQr = action("QR-Etikett", () => printLabel(location.barcode, locationName(location.id), "qr"));
      const printCode128 = action("Code-128-Etikett", () => printLabel(location.barcode, locationName(location.id), "code128"));
      const remove = action("Löschen", () => removeLocation(location));
      row.append(name, code, edit, printQr, printCode128, remove);
      list.append(row);
    }
  }

  function renderSummary() {
    const groups = new Map();
    for (const item of data.items.filter((entry) => !entry.archivedAt)) {
      groups.set(item.unit, (groups.get(item.unit) || 0) + item.quantity);
    }
    const low = data.items.filter((item) => stockStatus(item) === "low").length;
    const parts = [
      ["Aktive Artikel", data.items.filter((item) => !item.archivedAt).length],
      ["Nachbestellen", low],
      ["Lagerorte", data.locations.length],
      ["Mengen gesamt", [...groups].map(([unit, quantity]) => `${quantity} ${unit}`).join(" · ") || "0"]
    ];
    const summary = $("#small-parts-summary");
    summary.replaceChildren(...parts.map(([label, value]) => {
      const card = document.createElement("div");
      card.className = "small-parts-summary-card";
      const title = document.createElement("span");
      title.textContent = label;
      const amount = document.createElement("strong");
      amount.textContent = String(value);
      card.append(title, amount);
      return card;
    }));
  }

  function render() {
    const query = $("#small-parts-search").value.trim().toLocaleLowerCase("de");
    const category = $("#small-parts-filter-category").value;
    const selectedLocation = $("#small-parts-filter-location").value;
    const status = $("#small-parts-filter-status").value;
    const sort = $("#small-parts-sort").value;
    const categories = [...new Set(data.items.map((item) => item.category).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, "de"));
    const previous = $("#small-parts-filter-category").value;
    $("#small-parts-filter-category").replaceChildren(
      new Option("Alle Kategorien", ""),
      ...categories.map((value) => new Option(value, value))
    );
    $("#small-parts-filter-category").value = categories.includes(previous) ? previous : "";
    const locationFilter = $("#small-parts-filter-location");
    const previousLocation = locationFilter.value;
    locationFilter.replaceChildren(
      new Option("Alle Lagerorte", ""),
      ...[...data.locations].sort((a, b) => locationName(a.id).localeCompare(locationName(b.id), "de"))
        .map((location) => new Option(locationName(location.id), location.id))
    );
    locationFilter.value = data.locations.some((location) => location.id === previousLocation) ? previousLocation : "";
    $("#small-parts-category-options").replaceChildren(...categories.map((value) => new Option(value, value)));
    renderLocations();
    renderSummary();

    let items = data.items.filter((item) => {
      const matchesCategory = !category || item.category === category;
      const matchesLocation = !selectedLocation || isInLocationBranch(item.locationId, selectedLocation);
      const matchesStatus = !status || stockStatus(item) === status;
      const searchable = [
        item.name, item.category, item.manufacturer, item.partNumber, item.barcode,
        item.description, item.notes, item.unit, locationName(item.locationId)
      ].filter(Boolean).join(" ").toLocaleLowerCase("de");
      return matchesCategory && matchesLocation && matchesStatus && searchable.includes(query);
    });
    items.sort((a, b) => sort === "quantity" ? a.quantity - b.quantity
      : sort === "category" ? (a.category || "").localeCompare(b.category || "", "de")
        : sort === "updated" ? (b.updatedAt || "").localeCompare(a.updatedAt || "")
          : a.name.localeCompare(b.name, "de"));
    const list = $("#small-parts-list");
    list.replaceChildren();
    if (!items.length) {
      const empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = "Keine passenden Kleinteile gefunden. Lege den ersten Artikel an oder ändere die Filter.";
      list.append(empty);
    }
    for (const item of items) list.append(renderItem(item));
  }

  function action(label, handler, extraClass = "") {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `button button-secondary ${extraClass}`.trim();
    button.textContent = label;
    button.addEventListener("click", handler);
    return button;
  }

  function renderItem(item) {
    const card = document.createElement("article");
    card.className = `card small-parts-card status-${stockStatus(item)}`;
    const title = document.createElement("div");
    title.className = "small-parts-card-title";
    const name = document.createElement("h3");
    name.textContent = item.name;
    const badge = document.createElement("span");
    badge.className = `small-parts-status status-${stockStatus(item)}`;
    badge.textContent = ({
      low: "Nachbestellen", ok: "Ausreichend", unknown: "Mindestbestand offen", archived: "Archiviert"
    })[stockStatus(item)];
    title.append(name, badge);
    if (item.images?.length) {
      const gallery = document.createElement("div");
      gallery.className = "small-parts-image-preview";
      for (const [index, src] of item.images.entries()) {
        const image = document.createElement("img");
        image.src = src;
        image.alt = `${item.name}, Foto ${index + 1}`;
        image.loading = "lazy";
        gallery.append(image);
      }
      card.append(gallery);
    }
    const facts = document.createElement("p");
    facts.className = "small-parts-facts";
    facts.textContent = [
      item.category, item.manufacturer, item.partNumber ? `Art.-Nr. ${item.partNumber}` : "",
      `Bestand: ${item.quantity} ${item.unit}`,
      item.reorderLevel === null ? "Mindestbestand nicht festgelegt" : `Mindestbestand: ${item.reorderLevel} ${item.unit}`,
      locationName(item.locationId), `Kennung: ${item.barcode}`
    ].filter(Boolean).join(" · ");
    const actions = document.createElement("div");
    actions.className = "button-row small-parts-actions";
    const details = action("Details / Historie", () => openDetails(item.id));
    details.dataset.smallPartAction = "view";
    details.dataset.id = item.id;
    const edit = action("Bearbeiten", () => editItem(item.id));
    edit.dataset.smallPartAction = "edit";
    edit.dataset.id = item.id;
    actions.append(
      details,
      action("Buchen", () => openBooking(item.id)),
      edit,
      action("Duplizieren", () => duplicateItem(item.id)),
      action(item.archivedAt ? "Wiederherstellen" : "Archivieren", () => toggleArchive(item.id)),
      action("QR-Etikett", () => printLabel(item.barcode, item.name, "qr")),
      action("Code-128-Etikett", () => printLabel(item.barcode, item.name, "code128")),
      action("Löschen", () => deleteItem(item.id))
    );
    card.append(title, facts, actions);
    return card;
  }

  function openDetails(id) {
    const item = data.items.find((entry) => entry.id === id);
    if (!item) return;
    const panel = $("#small-parts-detail");
    panel.replaceChildren();
    panel.classList.remove("hidden");
    const heading = document.createElement("h3");
    heading.textContent = `Buchungshistorie: ${item.name}`;
    const copy = document.createElement("p");
    copy.textContent = `${item.quantity} ${item.unit} verfügbar · ${locationName(item.locationId)}`;
    const table = document.createElement("table");
    table.className = "small-parts-history";
    const head = document.createElement("thead");
    const headRow = document.createElement("tr");
    for (const label of ["Datum", "Art", "Änderung", "Bestand danach", "Projekt / Notiz"]) {
      const th = document.createElement("th");
      th.textContent = label;
      headRow.append(th);
    }
    head.append(headRow);
    const body = document.createElement("tbody");
    for (const movement of [...item.movements].reverse()) {
      const tr = document.createElement("tr");
      const kind = { in: "Zugang", out: "Verbrauch / Abgang", adjustment: "Bestandskorrektur" }[movement.kind];
      for (const text of [
        new Date(movement.date).toLocaleString("de-DE"),
        kind,
        `${movement.delta > 0 ? "+" : ""}${movement.delta} ${item.unit}`,
        `${movement.quantityAfter} ${item.unit}`,
        [movement.project, movement.note].filter(Boolean).join(" · ")
      ]) {
        const td = document.createElement("td");
        td.textContent = text;
        tr.append(td);
      }
      body.append(tr);
    }
    table.append(head, body);
    const close = action("Schließen", () => panel.classList.add("hidden"));
    panel.append(heading, copy, table, close);
    panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function openBooking(id) {
    const item = data.items.find((entry) => entry.id === id);
    if (!item) return;
    const dialog = $("#small-parts-booking-dialog");
    $("#small-parts-booking-item").textContent = `${item.name} · aktuell ${item.quantity} ${item.unit}`;
    $("#small-parts-booking-id").value = id;
    $("#small-parts-booking-unit").textContent = item.unit;
    $("#small-parts-booking-form").reset();
    $("#small-parts-booking-id").value = id;
    $("#small-parts-booking-date").value = new Date().toISOString().slice(0, 10);
    $("#small-parts-booking-message").textContent = "";
    dialog.showModal();
  }

  function openEditor(item = null) {
    form.reset();
    editingId = item?.id || "";
    editImages = [...(item?.images || [])];
    $("#small-parts-item-id").value = editingId;
    $("#small-parts-name").value = item?.name || "";
    $("#small-parts-category").value = item?.category || "";
    $("#small-parts-manufacturer").value = item?.manufacturer || "";
    $("#small-parts-part-number").value = item?.partNumber || "";
    $("#small-parts-barcode").value = item?.barcode || "";
    $("#small-parts-unit").value = item?.unit || "Stück";
    $("#small-parts-quantity").value = item?.quantity ?? 0;
    $("#small-parts-reorder").value = item?.reorderLevel ?? "";
    $("#small-parts-location-select").value = item?.locationId || "";
    $("#small-parts-description").value = item?.description || "";
    $("#small-parts-notes").value = item?.notes || "";
    $("#small-parts-editor-heading").textContent = item ? "Kleinteil bearbeiten" : "Kleinteil hinzufügen";
    $("#small-parts-cancel").hidden = !item;
    $("#small-parts-images").value = "";
    window.updateLocalizedFileInput?.($("#small-parts-images"));
    $("#small-parts-form-message").textContent = "";
    renderImagePreview();
    $("#small-parts-name").focus();
    $("#small-parts-editor-heading").scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function editItem(id) {
    const item = data.items.find((entry) => entry.id === id);
    if (item) openEditor(item);
  }

  function duplicateItem(id) {
    const item = data.items.find((entry) => entry.id === id);
    if (!item) return;
    const copy = structuredClone(item);
    copy.id = uuid();
    copy.name = `${item.name} (Kopie)`;
    copy.barcode = uniqueCode("KP", data.items);
    copy.quantity = 0;
    copy.movements = [];
    copy.createdAt = now();
    copy.updatedAt = now();
    copy.archivedAt = "";
    data.items.push(copy);
    save();
    openEditor(copy);
  }

  function toggleArchive(id) {
    const item = data.items.find((entry) => entry.id === id);
    if (!item) return;
    item.archivedAt = item.archivedAt ? "" : now();
    item.updatedAt = now();
    save();
  }

  function deleteItem(id) {
    const item = data.items.find((entry) => entry.id === id);
    if (!item || !window.confirm(`„${item.name}“ samt Buchungshistorie wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`)) return;
    data.items = data.items.filter((entry) => entry.id !== id);
    save();
    $("#small-parts-detail").classList.add("hidden");
  }

  function movement(item, kind, delta, date, project, note) {
    const result = item.quantity + delta;
    if (!Number.isFinite(delta) || delta === 0 || result < 0) {
      throw new Error(`Der Bestand darf nicht negativ werden. Aktuell verfügbar: ${item.quantity} ${item.unit}.`);
    }
    item.quantity = result;
    item.updatedAt = now();
    item.movements.push({
      id: uuid(), kind, delta, date: new Date(`${date || new Date().toISOString().slice(0, 10)}T12:00:00`).toISOString(),
      project: project.trim(), note: note.trim(), quantityAfter: result
    });
  }

  async function resizeImage(file) {
    if (!file.type.startsWith("image/")) throw new Error("Bitte nur Bilddateien auswählen.");
    let bitmap;
    try {
      bitmap = await createImageBitmap(file);
    } catch (error) {
      console.warn(`Could not decode small-parts image "${file.name}".`, error);
      throw new Error(`Das Bild „${file.name}“ konnte nicht geöffnet werden. Prüfe Dateiformat und Bilddatei.`);
    }
    const ratio = Math.min(1, 1000 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
    canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Bild konnte nicht verarbeitet werden.");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    for (const quality of [0.78, 0.66, 0.54, 0.42]) {
      const url = canvas.toDataURL("image/jpeg", quality);
      if (url.length <= 390_000) return url;
    }
    throw new Error(`Das Bild „${file.name}“ ist zu groß, um es lokal zu speichern.`);
  }

  function renderImagePreview() {
    const box = $("#small-parts-image-preview");
    box.replaceChildren();
    editImages.forEach((src, index) => {
      const wrap = document.createElement("div");
      const image = document.createElement("img");
      image.src = src;
      image.alt = `Foto ${index + 1}`;
      const remove = action("Entfernen", () => {
        editImages.splice(index, 1);
        renderImagePreview();
      });
      wrap.append(image, remove);
      box.append(wrap);
    });
  }

  function renderCode(value, caption, format) {
    const api = window.KatalogicBarcodeTools;
    if (!api) throw new Error("Barcodegenerator ist nicht verfügbar.");
    return api.svgFor(format, value, caption);
  }

  function printLabel(value, caption, format) {
    try {
      const svg = renderCode(value, caption, format);
      const popup = window.open("", "_blank", "width=520,height=520");
      if (!popup) throw new Error("Druckfenster wurde blockiert. Erlaube Pop-ups und versuche es erneut.");
      popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Etikett</title><style>body{font:16px Arial,sans-serif;text-align:center;padding:20px}svg{max-width:100%;height:auto} @media print{button{display:none}}</style></head><body>${svg.outerHTML}<button onclick="window.print()">Drucken</button></body></html>`);
      popup.document.close();
    } catch (error) {
      window.alert(`Etikett konnte nicht erstellt werden: ${error.message}`);
    }
  }

  function renameLocation(location) {
    const name = window.prompt("Neuer Lagerortname", location.name);
    if (name === null || !name.trim()) return;
    location.name = name.trim();
    save();
  }

  function removeLocation(location) {
    if (data.items.some((item) => item.locationId === location.id) ||
        data.locations.some((entry) => entry.parentId === location.id)) {
      window.alert("Dieser Lagerort wird noch verwendet. Weise zuerst Artikel und untergeordnete Lagerorte um.");
      return;
    }
    if (!window.confirm(`Lagerort „${locationName(location.id)}“ löschen?`)) return;
    data.locations = data.locations.filter((entry) => entry.id !== location.id);
    save();
  }

  function scanValue(value) {
    const code = value.trim();
    if (!code) return;
    const item = data.items.find((entry) => entry.barcode.toLocaleLowerCase("de") === code.toLocaleLowerCase("de") ||
      entry.id.toLocaleLowerCase("de") === code.toLocaleLowerCase("de"));
    if (item) {
      $("#small-parts-search").value = item.name;
      $("#small-parts-filter-category").value = "";
      $("#small-parts-filter-location").value = "";
      $("#small-parts-filter-status").value = "";
      render();
      openDetails(item.id);
      $("#small-parts-scan-input").value = "";
      return;
    }
    const location = data.locations.find((entry) => entry.barcode.toLocaleLowerCase("de") === code.toLocaleLowerCase("de") ||
      entry.id.toLocaleLowerCase("de") === code.toLocaleLowerCase("de"));
    if (location) {
      $("#small-parts-search").value = location.name;
      $("#small-parts-filter-category").value = "";
      $("#small-parts-filter-location").value = "";
      $("#small-parts-filter-status").value = "";
      render();
      $("#small-parts-form-message").textContent = `Lagerort gefunden: ${locationName(location.id)}. Zugehörige Artikel werden gefiltert angezeigt.`;
      return;
    }
    $("#small-parts-form-message").textContent = `Kennung „${code}“ ist kein interner Kleinteil- oder Lagerortcode.`;
    $("#small-parts-barcode").value = code;
    $("#small-parts-name").focus();
    $("#small-parts-scan-input").value = "";
  }

  async function scanFrame() {
    if (!detector || !cameraStream) return;
    try {
      const results = await detector.detect(video);
      if (results.length) {
        await stopCamera();
        scanValue(results[0].rawValue);
        $("#small-parts-camera-message").textContent = `Code erkannt: ${results[0].rawValue}`;
        return;
      }
    } catch (error) {
      console.error("Small-parts barcode detection failed.", error);
      $("#small-parts-camera-message").textContent = "Code konnte nicht gelesen werden. Halte ihn ruhig und gut beleuchtet.";
    }
    cameraFrame = requestAnimationFrame(scanFrame);
  }

  async function stopCamera() {
    if (cameraFrame) cancelAnimationFrame(cameraFrame);
    cameraFrame = 0;
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      cameraStream = null;
    }
    video.srcObject = null;
  }

  async function startCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      $("#small-parts-camera-message").textContent = "Kamerazugriff ist nicht verfügbar. Nutze HTTPS oder localhost und prüfe die Berechtigung.";
      cameraPanel.classList.remove("hidden");
      return;
    }
    if (!("BarcodeDetector" in window)) {
      $("#small-parts-camera-message").textContent = "Dieser Browser hat keinen BarcodeDetector. Verwende einen USB-/Bluetooth-Scanner oder trage die Kennung oben ein.";
      cameraPanel.classList.remove("hidden");
      return;
    }
    try {
      const supported = await BarcodeDetector.getSupportedFormats();
      const formats = ["qr_code", "code_128", "ean_13", "ean_8", "upc_a", "upc_e"]
        .filter((format) => supported.includes(format));
      if (!formats.length) throw new Error("Dieser Browser unterstützt kein geeignetes Barcodeformat.");
      detector = new BarcodeDetector({ formats });
      cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } } });
      video.srcObject = cameraStream;
      await video.play();
      cameraPanel.classList.remove("hidden");
      $("#small-parts-camera-message").textContent = "Richte die Kamera auf einen Kleinteil- oder Lagerortcode.";
      cameraFrame = requestAnimationFrame(scanFrame);
    } catch (error) {
      await stopCamera();
      cameraPanel.classList.remove("hidden");
      $("#small-parts-camera-message").textContent = error.name === "NotAllowedError"
        ? "Kameraberechtigung verweigert. Erlaube den Kamerazugriff in den Browsereinstellungen."
        : `Kamera konnte nicht gestartet werden: ${error.message}`;
    }
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const message = $("#small-parts-form-message");
    try {
      const files = [...$("#small-parts-images").files];
      if (editImages.length + files.length > 8) throw new Error("Es sind höchstens acht Bilder pro Artikel möglich.");
      const images = [...editImages, ...await Promise.all(files.map(resizeImage))];
      const item = {
        id: editingId || uuid(),
        name: $("#small-parts-name").value.trim(),
        category: $("#small-parts-category").value.trim(),
        manufacturer: $("#small-parts-manufacturer").value.trim(),
        partNumber: $("#small-parts-part-number").value.trim(),
        barcode: $("#small-parts-barcode").value.trim(),
        unit: $("#small-parts-unit").value.trim(),
        quantity: number("#small-parts-quantity"),
        reorderLevel: number("#small-parts-reorder"),
        locationId: $("#small-parts-location-select").value,
        description: $("#small-parts-description").value.trim(),
        notes: $("#small-parts-notes").value.trim(),
        images,
        movements: [],
        createdAt: now(),
        updatedAt: now(),
        archivedAt: ""
      };
      if (!item.barcode) item.barcode = uniqueCode("KP", data.items);
      const current = data.items.find((entry) => entry.id === editingId);
      if (current) {
        if (data.items.some((entry) => entry.id !== current.id && entry.barcode === item.barcode)) {
          throw new Error("Diese interne Kennung ist bereits vergeben.");
        }
        item.createdAt = current.createdAt;
        item.movements = current.movements;
        item.archivedAt = current.archivedAt;
        if (item.quantity !== current.quantity) {
          if (!window.confirm(`Bestand von ${current.quantity} auf ${item.quantity} ${item.unit} korrigieren? Diese Änderung wird in der Historie verbucht.`)) return;
          const delta = item.quantity - current.quantity;
          item.movements.push({
            id: uuid(), kind: "adjustment", delta, date: now(), project: "", note: "Bestandskorrektur über Artikelbearbeitung",
            quantityAfter: item.quantity
          });
        }
        data.items = data.items.map((entry) => entry.id === editingId ? item : entry);
      } else {
        if (data.items.some((entry) => entry.barcode === item.barcode)) throw new Error("Diese interne Kennung ist bereits vergeben.");
        if (item.quantity > 0) item.movements.push({
          id: uuid(), kind: "adjustment", delta: item.quantity, date: now(), project: "", note: "Eröffnungsbestand",
          quantityAfter: item.quantity
        });
        data.items.push(item);
      }
      save();
      form.reset();
      editingId = "";
      editImages = [];
      $("#small-parts-editor-heading").textContent = "Kleinteil hinzufügen";
      $("#small-parts-cancel").hidden = true;
      $("#small-parts-unit").value = "Stück";
      renderImagePreview();
      message.textContent = `„${item.name}“ gespeichert. Interne Kennung: ${item.barcode}`;
    } catch (error) {
      console.error("Could not save small-parts item.", error);
      message.textContent = `Speichern fehlgeschlagen: ${error.message}`;
      message.classList.add("error");
    }
  });

  $("#small-parts-location-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const name = $("#small-parts-location-name").value.trim();
    const id = uuid();
    const code = $("#small-parts-location-code").value.trim() || uniqueCode("LOC", data.locations);
    if (data.locations.some((location) => location.barcode === code)) {
      window.alert("Diese Lagerort-Kennung ist bereits vergeben.");
      return;
    }
    data.locations.push({
      id, name, parentId: $("#small-parts-location-parent").value,
      barcode: code, notes: $("#small-parts-location-notes").value.trim()
    });
    event.currentTarget.reset();
    save();
  });

  $("#small-parts-booking-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const item = data.items.find((entry) => entry.id === $("#small-parts-booking-id").value);
    if (!item) return;
    const kind = $("#small-parts-booking-kind").value;
    const quantity = Number($("#small-parts-booking-quantity").value);
    const delta = kind === "in" ? quantity : kind === "out" ? -quantity : quantity - item.quantity;
    const typeLabel = { in: "Zugang buchen", out: "Verbrauch / Abgang buchen", adjustment: "Bestand korrigieren" }[kind];
    if (!window.confirm(`${typeLabel}: Bestand von ${item.quantity} auf ${item.quantity + delta} ${item.unit} ändern?`)) return;
    try {
      movement(item, kind, delta, $("#small-parts-booking-date").value,
        $("#small-parts-booking-project").value, $("#small-parts-booking-note").value);
      save();
      $("#small-parts-booking-dialog").close();
      openDetails(item.id);
    } catch (error) {
      $("#small-parts-booking-message").textContent = error.message;
      $("#small-parts-booking-message").classList.add("error");
    }
  });

  $("#small-parts-booking-kind").addEventListener("change", (event) => {
    $("#small-parts-booking-quantity-label").firstChild.textContent =
      event.target.value === "adjustment" ? "Neuer Gesamtbestand" : "Menge";
    $("#small-parts-booking-quantity").min = event.target.value === "adjustment" ? "0" : "0.000001";
  });
  $("#small-parts-images").addEventListener("change", async (event) => {
    try {
      const files = [...event.target.files];
      if (editImages.length + files.length > 8) throw new Error("Es sind höchstens acht Bilder pro Artikel möglich.");
      editImages.push(...await Promise.all(files.map(resizeImage)));
      renderImagePreview();
      event.target.value = "";
      window.updateLocalizedFileInput?.(event.target);
      $("#small-parts-form-message").textContent = "";
    } catch (error) {
      $("#small-parts-form-message").textContent = error.message;
      $("#small-parts-form-message").classList.add("error");
      event.target.value = "";
      window.updateLocalizedFileInput?.(event.target);
    }
  });
  $("#small-parts-cancel").addEventListener("click", () => {
    form.reset();
    editingId = "";
    editImages = [];
    $("#small-parts-editor-heading").textContent = "Kleinteil hinzufügen";
    $("#small-parts-cancel").hidden = true;
    $("#small-parts-unit").value = "Stück";
    renderImagePreview();
  });
  $("#small-parts-search").addEventListener("input", render);
  $("#small-parts-filter-category").addEventListener("change", render);
  $("#small-parts-filter-location").addEventListener("change", render);
  $("#small-parts-filter-status").addEventListener("change", render);
  $("#small-parts-sort").addEventListener("change", render);
  $("#small-parts-scan-input").addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      scanValue(event.currentTarget.value);
    }
  });
  $("#small-parts-camera-start").addEventListener("click", () => void startCamera());
  $("#small-parts-camera-stop").addEventListener("click", () => void stopCamera());
  $("#small-parts-create").addEventListener("click", () => openEditor());
  $("[data-small-parts-booking-close]").addEventListener("click", () => $("#small-parts-booking-dialog").close());
  window.addEventListener("katalogic:small-parts-inventory-imported", () => {
    data = storage.load();
    render();
  });
  render();
})();
