"use strict";

(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const fields = {
    name: "#watch-name",
    type: "#watch-type",
    brand: "#watch-brand",
    model: "#watch-model",
    reference: "#watch-reference",
    serial: "#watch-serial",
    movement: "#watch-movement",
    caliber: "#watch-caliber",
    caseMaterial: "#watch-case",
    caseDiameter: "#watch-diameter",
    dialColor: "#watch-dial",
    crystal: "#watch-crystal",
    strap: "#watch-strap",
    waterResistance: "#watch-water-resistance",
    condition: "#watch-condition",
    functionality: "#watch-functionality",
    purchaseDate: "#watch-purchase-date",
    purchasePrice: "#watch-purchase-price",
    estimatedValue: "#watch-estimated-value",
    source: "#watch-source",
    location: "#watch-location",
    notes: "#watch-notes"
  };
  const templates = {
    "Armbanduhr": [
      ["powerReserve", "Gangreserve", "z. B. 70 Stunden"],
      ["accuracy", "Gangabweichung", "z. B. +5 s/Tag"],
      ["lugWidth", "Bandanstoß (mm)", "z. B. 20"],
      ["complications", "Komplikationen", "z. B. Chronograph, Datum"]
    ],
    "Taschenuhr": [
      ["winding", "Aufzug", "z. B. Schlüsselaufzug"],
      ["caseOpening", "Gehäusedeckel", "z. B. Sprungdeckel"],
      ["chain", "Kette", "Art und Material"],
      ["complications", "Komplikationen", "z. B. kleine Sekunde"]
    ],
    "Smartwatch": [
      ["operatingSystem", "Betriebssystem", "z. B. watchOS"],
      ["batteryLife", "Akkulaufzeit", "z. B. bis zu 36 Stunden"],
      ["connectivity", "Konnektivität", "z. B. GPS, LTE, Bluetooth"],
      ["compatibility", "Kompatibilität", "z. B. iOS / Android"]
    ],
    "Wanduhr": [
      ["clockwork", "Schlagwerk / Anzeige", "z. B. Westminster-Schlag"],
      ["dialDiameter", "Zifferblattdurchmesser (cm)", "z. B. 30"],
      ["mounting", "Aufhängung", "z. B. Wandhaken"],
      ["powerSource", "Energieversorgung", "z. B. 1 × AA"]
    ],
    "Tischuhr": [
      ["clockwork", "Schlagwerk / Anzeige", "z. B. Stundenschlag"],
      ["dimensions", "Maße", "z. B. 18 × 12 × 8 cm"],
      ["powerSource", "Energieversorgung", "z. B. mechanisch"],
      ["stand", "Aufstellung", "z. B. Tischfuß"]
    ],
    "Sonstige Uhr": [
      ["clockwork", "Werk / Antrieb", "z. B. Federwerk"],
      ["dimensions", "Maße", "z. B. 20 × 10 cm"],
      ["specialFeatures", "Besonderheiten", "Weitere Merkmale"]
    ]
  };
  const conditions = [
    "name", "brand", "model", "reference", "serial", "movement", "caliber", "caseMaterial",
    "caseDiameter", "dialColor", "crystal", "strap", "waterResistance", "condition",
    "functionality", "purchaseDate", "purchasePrice", "estimatedValue", "source", "location",
    "notes"
  ];
  let database;
  let loadWarning = "";
  let photosDraft = [];
  let photoProcessing = false;
  let selectedWatchId = "";

  function emptyDatabase() {
    return { watches: [], view: "grid" };
  }

  function loadDatabase() {
    try {
      const saved = window.KatalogicWatchStorage.load();
      return {
        watches: Array.isArray(saved.watches) ? saved.watches : [],
        view: saved.view === "list" ? "list" : "grid"
      };
    } catch (error) {
      console.error("Could not load saved watches.", error);
      loadWarning = "Gespeicherte Uhrendaten konnten nicht gelesen werden. Vorhandene Daten wurden nicht überschrieben.";
      return emptyDatabase();
    }
  }

  async function saveDatabase(next) {
    if (!await window.KatalogicWatchStorage.save(next)) {
      throw new Error("Die Uhrendaten konnten nicht gespeichert werden.");
    }
    database = next;
  }

  function report(element, message, isError = true) {
    element.textContent = message;
    element.classList.toggle("error", isError);
  }

  function renderTemplate(values = {}) {
    const type = $("#watch-type").value;
    const target = $("#watch-template-fields");
    target.replaceChildren();
    $("#watch-template-heading").textContent = `Vorlage: ${type}`;
    for (const [key, label, placeholder] of templates[type] || templates["Sonstige Uhr"]) {
      const wrapper = document.createElement("label");
      wrapper.textContent = label;
      const input = document.createElement("input");
      input.dataset.templateField = key;
      input.maxLength = 180;
      input.placeholder = placeholder;
      input.value = values[key] || "";
      wrapper.append(input);
      target.append(wrapper);
    }
  }

  function clearForm() {
    $("#watch-form").reset();
    $("#watch-id").value = "";
    $("#watch-type").value = "Armbanduhr";
    $("#watch-editor-heading").textContent = "Uhr hinzufügen";
    $("#watch-cancel").hidden = true;
    report($("#watch-form-message"), "", false);
    photosDraft = [];
    renderPhotoGallery();
    renderTemplate();
  }

  function editWatch(watch) {
    $("#watch-form").reset();
    $("#watch-id").value = watch.id;
    for (const [key, selector] of Object.entries(fields)) {
      if (key !== "type") $(selector).value = watch[key] || "";
    }
    $("#watch-type").value = watch.type || "Armbanduhr";
    photosDraft = Array.isArray(watch.photos) ? [...watch.photos] : [];
    renderTemplate(watch.templateData || {});
    renderPhotoGallery();
    $("#watch-editor-heading").textContent = "Uhr bearbeiten";
    $("#watch-cancel").hidden = false;
    report($("#watch-form-message"), "", false);
    $("#watch-editor").classList.remove("hidden");
    $("#watch-name").focus();
    $("#watch-editor").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function render() {
    const query = $("#watch-query").value.trim().toLocaleLowerCase("de");
    const type = $("#watch-filter-type").value;
    const sort = $("#watch-sort").value;
    const watches = database.watches
      .filter((watch) => (!type || watch.type === type) && (
        !query || [
          ...conditions.map((key) => watch[key]),
          watch.type,
          ...Object.values(watch.templateData || {})
        ].filter(Boolean).join(" ").toLocaleLowerCase("de").includes(query)
      ))
      .sort((a, b) => String(a[sort] || "").localeCompare(String(b[sort] || ""), "de", { numeric: true }));
    const cards = $("#watch-cards");
    cards.replaceChildren();
    report($("#watch-result-count"), `${watches.length} ${watches.length === 1 ? "Uhr" : "Uhren"}${query || type ? ` von ${database.watches.length}` : ""}`, false);
    if (!watches.length) {
      const empty = document.createElement("p");
      empty.className = "watch-empty-state";
      empty.textContent = query || type ? "Keine Uhren für diese Suche gefunden." : "Noch keine Uhren vorhanden. Lege oben den ersten Eintrag an.";
      cards.append(empty);
      $("#watch-detail").classList.add("hidden");
      return;
    }
    for (const watch of watches) {
      const card = document.createElement("article");
      card.className = "watch-card";
      if (watch.photos?.length) {
        const gallery = document.createElement("div");
        gallery.className = "watch-card-gallery";
        watch.photos.forEach((photo, index) => {
          const image = document.createElement("img");
          image.src = photo;
          image.alt = `${watch.name} – Bild ${index + 1}`;
          image.loading = "lazy";
          gallery.append(image);
        });
        card.append(gallery);
      }
      const heading = document.createElement("div");
      heading.className = "watch-card-heading";
      const title = document.createElement("h3");
      title.textContent = watch.name;
      const badge = document.createElement("span");
      badge.className = "watch-type-badge";
      badge.textContent = watch.type || "Uhr";
      heading.append(title, badge);
      const subtitle = document.createElement("p");
      subtitle.className = "watch-card-subtitle";
      subtitle.textContent = [watch.brand, watch.model, watch.reference ? `Ref. ${watch.reference}` : ""].filter(Boolean).join(" · ");
      const detailList = document.createElement("dl");
      detailList.className = "watch-card-details";
      const detailValues = [
        ["Werk / Antrieb", watch.movement],
        ["Kaliber", watch.caliber],
        ["Gehäuse", [watch.caseMaterial, watch.caseDiameter ? `${watch.caseDiameter} mm` : ""].filter(Boolean).join(" · ")],
        ["Zifferblatt", watch.dialColor],
        ["Glas", watch.crystal],
        ["Armband / Kette", watch.strap],
        ["Wasserdichtigkeit", watch.waterResistance],
        ["Zustand", watch.condition],
        ["Standort", watch.location],
        ...Object.entries(watch.templateData || {}).map(([key, value]) => [
          (templates[watch.type] || templates["Sonstige Uhr"]).find(([fieldKey]) => fieldKey === key)?.[1] || key,
          value
        ])
      ].filter(([, value]) => value);
      for (const [label, value] of detailValues.slice(0, 8)) {
        const term = document.createElement("dt");
        term.textContent = label;
        const description = document.createElement("dd");
        description.textContent = value;
        detailList.append(term, description);
      }
      const footer = document.createElement("div");
      footer.className = "watch-card-footer";
      const footerItems = [
        watch.purchaseDate ? ["Kaufdatum", watch.purchaseDate] : null,
        watch.purchasePrice ? ["Kaufpreis", `${watch.purchasePrice} €`] : null,
        watch.estimatedValue ? ["Wert", `${watch.estimatedValue} €`] : null
      ].filter(Boolean);
      footerItems.forEach(([label, value], index) => {
        if (index) footer.append(" · ");
        footer.append(`${label}: `);
        if (label === "Kaufpreis" || label === "Wert") {
          const amount = document.createElement("span");
          amount.className = "money-amount";
          amount.textContent = value;
          footer.append(amount);
        } else footer.append(value);
      });
      const actions = document.createElement("div");
      actions.className = "watch-card-actions";
      const details = document.createElement("button");
      details.type = "button";
      details.className = "button button-secondary";
      details.textContent = "Details";
      details.dataset.detailWatch = watch.id;
      const edit = document.createElement("button");
      edit.type = "button";
      edit.className = "button button-secondary";
      edit.textContent = "Bearbeiten";
      edit.dataset.editWatch = watch.id;
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "button button-quiet";
      remove.textContent = "Löschen";
      remove.dataset.deleteWatch = watch.id;
      card.append(heading, subtitle, detailList);
      if (footer.textContent) card.append(footer);
      actions.append(details, edit, remove);
      card.append(actions);
      cards.append(card);
    }
    if (selectedWatchId) {
      if (database.watches.some((watch) => watch.id === selectedWatchId)) renderDetail(selectedWatchId, false);
      else {
        selectedWatchId = "";
        $("#watch-detail").classList.add("hidden");
      }
    }
  }

  function renderDetail(id, scroll = true) {
    const watch = database.watches.find((entry) => entry.id === id);
    if (!watch) return;
    selectedWatchId = id;
    const detail = $("#watch-detail");
    detail.replaceChildren();
    const heading = document.createElement("div");
    heading.className = "watch-detail-heading";
    const titleGroup = document.createElement("div");
    const eyebrow = document.createElement("p");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = "UHRENDETAILS";
    const title = document.createElement("h3");
    title.textContent = watch.name;
    const subtitle = document.createElement("p");
    subtitle.className = "muted";
    subtitle.textContent = [watch.type, watch.brand, watch.model, watch.reference ? `Ref. ${watch.reference}` : ""].filter(Boolean).join(" · ");
    titleGroup.append(eyebrow, title, subtitle);
    const actions = document.createElement("div");
    actions.className = "watch-detail-actions";
    const edit = document.createElement("button");
    edit.type = "button";
    edit.className = "button button-secondary";
    edit.textContent = "Bearbeiten";
    edit.dataset.editWatch = watch.id;
    const close = document.createElement("button");
    close.type = "button";
    close.className = "icon-button";
    close.textContent = "×";
    close.setAttribute("aria-label", "Details schließen");
    close.dataset.closeWatchDetail = "";
    actions.append(edit, close);
    heading.append(titleGroup, actions);
    detail.append(heading);

    if (watch.photos?.length) {
      const gallery = document.createElement("div");
      gallery.className = "watch-detail-gallery";
      watch.photos.forEach((photo, index) => {
        const image = document.createElement("img");
        image.src = photo;
        image.alt = `${watch.name} – Bild ${index + 1}`;
        image.loading = "lazy";
        gallery.append(image);
      });
      detail.append(gallery);
    }

    const templateLabels = new Map((templates[watch.type] || templates["Sonstige Uhr"]).map(([key, label]) => [key, label]));
    const sections = [
      ["Stammdaten", [
        ["Uhrentyp", watch.type], ["Marke", watch.brand], ["Modell", watch.model],
        ["Referenznummer", watch.reference], ["Seriennummer", watch.serial]
      ]],
      ["Technische Daten", [
        ["Werk / Antrieb", watch.movement], ["Kaliber / Werk", watch.caliber],
        ["Gehäusematerial", watch.caseMaterial],
        ["Gehäusedurchmesser", watch.caseDiameter ? `${watch.caseDiameter} mm` : ""],
        ["Zifferblattfarbe", watch.dialColor], ["Glas", watch.crystal],
        ["Armband / Kette", watch.strap], ["Wasserdichtigkeit", watch.waterResistance],
        ...Object.entries(watch.templateData || {}).map(([key, value]) => [templateLabels.get(key) || key, value])
      ]],
      ["Zustand & Standort", [
        ["Zustand", watch.condition], ["Funktionsfähigkeit", watch.functionality],
        ["Lagerort", watch.location]
      ]],
      ["Kauf & Wert", [
        ["Kaufdatum", watch.purchaseDate],
        ["Kaufpreis", watch.purchasePrice ? `${watch.purchasePrice} €` : ""],
        ["Wertschätzung", watch.estimatedValue ? `${watch.estimatedValue} €` : ""],
        ["Händler / Bezugsquelle", watch.source]
      ]],
      ["Notizen", [["Notizen", watch.notes]]]
    ];
    const grid = document.createElement("div");
    grid.className = "watch-detail-grid";
    for (const [sectionTitle, values] of sections) {
      const entries = values.filter(([, value]) => value);
      if (!entries.length) continue;
      const section = document.createElement("section");
      section.className = "watch-detail-section";
      const heading = document.createElement("h4");
      heading.textContent = sectionTitle;
      const list = document.createElement("dl");
      for (const [label, value] of entries) {
        const term = document.createElement("dt");
        term.textContent = label;
        const description = document.createElement("dd");
        if (label === "Kaufpreis" || label === "Wertschätzung") {
          const amount = document.createElement("span");
          amount.className = "money-amount";
          amount.textContent = value;
          description.append(amount);
        } else description.textContent = value;
        list.append(term, description);
      }
      section.append(heading, list);
      grid.append(section);
    }
    detail.append(grid);
    detail.classList.remove("hidden");
    if (scroll) detail.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function resizePhoto(file) {
    if (!file.type.startsWith("image/")) throw new Error(`${file.name}: Bitte eine Bilddatei auswählen.`);
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

  function renderPhotoGallery() {
    const gallery = $("#watch-photo-gallery");
    gallery.replaceChildren();
    if (!photosDraft.length) {
      const empty = document.createElement("p");
      empty.className = "watch-empty-hint";
      empty.textContent = "Noch keine Bilder hinzugefügt.";
      gallery.append(empty);
      return;
    }
    photosDraft.forEach((photo, index) => {
      const figure = document.createElement("figure");
      figure.className = "watch-photo";
      const image = document.createElement("img");
      image.src = photo;
      image.alt = `Uhrbild ${index + 1}`;
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

  $("#watch-type").addEventListener("change", () => renderTemplate());
  $("#watch-create").addEventListener("click", () => {
    clearForm();
    $("#watch-editor").classList.remove("hidden");
    $("#watch-name").focus();
    $("#watch-editor").scrollIntoView({ behavior: "smooth", block: "start" });
  });
  $("#watch-editor-close").addEventListener("click", () => $("#watch-editor").classList.add("hidden"));
  $("#watch-cancel").addEventListener("click", clearForm);
  $("#watch-query").addEventListener("input", render);
  $("#watch-filter-type").addEventListener("change", render);
  $("#watch-sort").addEventListener("change", render);
  $("#watch-photos-input").addEventListener("change", async (event) => {
    const files = [...event.target.files];
    event.target.value = "";
    window.updateLocalizedFileInput?.(event.target);
    const remaining = 8 - photosDraft.length;
    if (remaining <= 0) return report($("#watch-form-message"), "Maximal acht Bilder je Uhr.");
    photoProcessing = true;
    try {
      for (const file of files.slice(0, remaining)) photosDraft.push(await resizePhoto(file));
      if (files.length > remaining) report($("#watch-form-message"), "Maximal acht Bilder je Uhr; weitere Bilder wurden ignoriert.", false);
      renderPhotoGallery();
    } catch (error) {
      console.error("Could not add watch photo.", error);
      report($("#watch-form-message"), error.message);
    } finally {
      photoProcessing = false;
    }
  });
  $("#watch-photo-gallery").addEventListener("click", (event) => {
    const button = event.target.closest("[data-remove-photo]");
    if (!button) return;
    photosDraft.splice(Number(button.dataset.removePhoto), 1);
    renderPhotoGallery();
  });
  $("#watch-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (photoProcessing) return report($("#watch-form-message"), "Warte bitte, bis die Bildverarbeitung abgeschlossen ist.");
    const id = $("#watch-id").value || crypto.randomUUID();
    const previous = database.watches.find((watch) => watch.id === id);
    const watch = Object.fromEntries(Object.entries(fields).map(([key, selector]) => [
      key, $(selector).value.trim()
    ]));
    watch.id = id;
    watch.updatedAt = new Date().toISOString();
    watch.photos = [...photosDraft];
    watch.templateData = Object.fromEntries([...$("#watch-template-fields").querySelectorAll("[data-template-field]")]
      .map((input) => [input.dataset.templateField, input.value.trim()]));
    const watches = previous
      ? database.watches.map((entry) => entry.id === id ? watch : entry)
      : [...database.watches, watch];
    try {
      await saveDatabase({ ...database, watches });
      $("#watch-editor").classList.add("hidden");
      clearForm();
      render();
      report($("#watch-result-count"), "Uhr gespeichert.", false);
    } catch (error) {
      console.error("Could not save watch.", error);
      report($("#watch-form-message"), `Uhr konnte nicht gespeichert werden: ${error.message}`);
    }
  });
  $("#watch-cards").addEventListener("click", async (event) => {
    const details = event.target.closest("[data-detail-watch]");
    if (details) {
      renderDetail(details.dataset.detailWatch);
      return;
    }
    const edit = event.target.closest("[data-edit-watch]");
    if (edit) {
      const watch = database.watches.find((entry) => entry.id === edit.dataset.editWatch);
      if (watch) editWatch(watch);
      return;
    }
    const remove = event.target.closest("[data-delete-watch]");
    if (!remove) return;
    const watch = database.watches.find((entry) => entry.id === remove.dataset.deleteWatch);
    if (!watch || !window.confirm(`„${watch.name}“ aus der Uhrensammlung löschen?`)) return;
    try {
      await saveDatabase({ ...database, watches: database.watches.filter((entry) => entry.id !== watch.id) });
      if (selectedWatchId === watch.id) {
        selectedWatchId = "";
        $("#watch-detail").classList.add("hidden");
      }
      render();
    } catch (error) {
      console.error("Could not delete watch.", error);
      report($("#watch-result-count"), `Uhr konnte nicht gelöscht werden: ${error.message}`);
    }
  });
  $("#watch-detail").addEventListener("click", (event) => {
    if (event.target.closest("[data-close-watch-detail]")) {
      selectedWatchId = "";
      $("#watch-detail").classList.add("hidden");
      return;
    }
    const edit = event.target.closest("[data-edit-watch]");
    if (edit) {
      const watch = database.watches.find((entry) => entry.id === edit.dataset.editWatch);
      if (watch) editWatch(watch);
    }
  });
  $("#library-search-results").addEventListener("click", (event) => {
    const button = event.target.closest("[data-open-watch]");
    if (!button) return;
    const watch = database.watches.find((entry) => entry.id === button.dataset.openWatch);
    if (!watch) return;
    $("#watch-query").value = watch.name;
    window.dispatchEvent(new CustomEvent("katalogic:show-view", { detail: "watches" }));
    render();
  });
  window.addEventListener("katalogic:watch-inventory-imported", () => {
    database = loadDatabase();
    $("#watch-editor").classList.add("hidden");
    render();
  });
  database = loadDatabase();
  renderTemplate();
  renderPhotoGallery();
  render();
  if (loadWarning) report($("#watch-result-count"), loadWarning);
})();
