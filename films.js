"use strict";

(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const makeId = () => crypto.randomUUID();
  const now = () => new Date().toISOString();
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
  const CATEGORIES = [
    "Spielfilme", "Kurzfilme", "Dokumentationen", "Animationsfilme", "Anime", "Serien",
    "Miniserien", "TV-Filme", "Konzertfilme", "Stand-up und Comedy", "Lehr- und Schulfilme",
    "Sammlereditionen", "Filmreihen und Franchises", "Sonstige Videomedien"
  ];
  const CONDITIONS = ["Schlecht", "Gebraucht", "Gut", "Sehr gut", "Wie neu", "Neu und originalverpackt"];
  const FUNCTIONALITIES = ["Funktioniert einwandfrei", "Wiedergabe mit Einschränkungen", "Defekt", "Ungeprüft", "Nicht zutreffend"];
  const COMPLETENESS_VALUES = ["Vollständig", "Teilweise vollständig", "Fehlende Teile", "Ungeprüft"];
  const AGE_RATINGS = ["FSK 0", "FSK 6", "FSK 12", "FSK 16", "FSK 18", "Keine Jugendfreigabe", "Unbekannt"];
  const FORMATS = ["DVD", "Blu-ray", "3D-Blu-ray", "4K Ultra HD", "Digitaler Film", "Streaming", "VHS", "Sonstiges"];
  const FORMAT_FIELDS = {
    DVD: ["dvdStandard", "regionCode", "discCount", "aspectRatio", "audioFormats", "extras", "dvdCase", "dvdBooklet"],
    "Blu-ray": ["blurayVariant", "regionCode", "resolution", "aspectRatio", "hdr", "audioFormats", "discCount", "bonus", "packaging"],
    "3D-Blu-ray": ["regionCode", "resolution", "hdr", "audioFormats", "discCount", "bonus", "packaging"],
    "4K Ultra HD": ["hdr", "audioFormats", "discCount", "includedDiscs", "packaging"],
    "Digitaler Film": ["digitalAccess", "platform", "resolution", "audioLanguages", "digitalLocation", "accessAvailable"],
    Streaming: ["digitalAccess", "platform", "resolution", "audioLanguages", "accessAvailable"],
    VHS: ["tapeCondition", "aspectRatio", "audioFormats"]
  };
  const DETAIL_LABELS = {
    discCondition: "Disc-Zustand", scratches: "Kratzer vorhanden", caseCondition: "Hüllenzustand",
    booklet: "Booklet vorhanden", packagingComplete: "Verpackung vollständig", missingItems: "Fehlende Discs / Extras",
    dvdStandard: "DVD-Standard / Ausgabe", regionCode: "Regionalcode", discCount: "Anzahl Discs",
    aspectRatio: "Bildformat", audioFormats: "Tonformate", extras: "Extras",
    dvdCase: "Hülle vorhanden", dvdBooklet: "Booklet vorhanden", blurayVariant: "Blu-ray-Variante",
    resolution: "Auflösung", hdr: "HDR-Format / Unterstützung", bonus: "Bonusmaterial",
    packaging: "Verpackung / Edition", includedDiscs: "Enthaltene Blu-ray / Bonus-Disc",
    digitalAccess: "Digitaler Zugang", platform: "Plattform / Shop", audioLanguages: "Sprache / Tonspuren",
    digitalLocation: "Speicherort / Plattformverweis", accessAvailable: "Zugang verfügbar", tapeCondition: "Bandzustand"
  };
  const emptyDatabase = () => ({ entries: [], franchises: [], customOptions: {}, view: "grid" });
  let database;
  let activeCategory = "";
  let editorMode = "create";
  let detailsDraft = {};
  let photosDraft = [];
  let photoProcessing = false;
  let loadWarning = "";

  function normalizeDatabase(value) {
    const blank = emptyDatabase();
    return {
      entries: Array.isArray(value?.entries) ? value.entries : [],
      franchises: Array.isArray(value?.franchises) ? value.franchises : [],
      customOptions: value?.customOptions && typeof value.customOptions === "object" && !Array.isArray(value.customOptions) ? value.customOptions : blank.customOptions,
      view: value?.view === "list" ? "list" : "grid"
    };
  }

  function loadDatabase() {
    try {
      return normalizeDatabase(window.KatalogicFilmStorage.load());
    } catch (error) {
      console.error("Could not load saved films.", error);
      loadWarning = "Gespeicherte Filmdaten konnten nicht gelesen werden. Vorhandene Daten wurden nicht überschrieben.";
      return emptyDatabase();
    }
  }

  function saveDatabase(next) {
    window.KatalogicFilmStorage.save(next);
    database = normalizeDatabase(next);
  }

  function report(element, message, isError = true) {
    element.textContent = message;
    element.classList.toggle("error", isError);
  }

  function uniqueSorted(values) {
    return [...new Set(values.filter((value) => typeof value === "string" && value.trim()).map((value) => value.trim()))]
      .sort((a, b) => a.localeCompare(b, "de"));
  }

  function customValues(key) {
    return Array.isArray(database.customOptions[key]) ? database.customOptions[key] : [];
  }

  function addOption(select, value, label = value) {
    if (!value || [...select.options].some((option) => option.value === value)) return;
    select.add(new Option(label, value));
  }

  function fillCategory(selected = "") {
    const select = $("#film-category");
    const values = uniqueSorted([...CATEGORIES, ...customValues("categories"), ...database.entries.map((entry) => entry.category)]);
    select.replaceChildren(new Option("Kategorie auswählen", ""));
    for (const value of values) select.add(new Option(value, value));
    select.add(new Option("＋ Eigene Kategorie …", "__custom__"));
    select.value = selected && values.includes(selected) ? selected : selected ? "__custom__" : "";
    $("#film-custom-category").classList.toggle("hidden", select.value !== "__custom__");
    if (select.value === "__custom__") $("#film-custom-category").value = selected;
  }

  function fillRelated(selected = []) {
    const select = $("#film-related");
    const currentId = $("#film-id").value;
    select.replaceChildren(...database.entries.filter((entry) => entry.id !== currentId)
      .sort((a, b) => a.title.localeCompare(b.title, "de"))
      .map((entry) => {
        const option = new Option(`${entry.title}${entry.year ? ` (${entry.year})` : ""}`, entry.id);
        option.selected = selected.includes(entry.id);
        return option;
      }));
  }

  function fillDatalists() {
    const set = (selector, values) => $(selector).replaceChildren(...uniqueSorted(values).map((value) => new Option(value, value)));
    set("#film-genre-options", [...customValues("genres"), ...database.entries.map((entry) => entry.genre)]);
    set("#film-director-options", database.entries.flatMap((entry) => entry.directors || []));
    set("#film-publisher-options", database.entries.map((entry) => entry.publisher));
    set("#film-franchise-options", [...database.franchises.map((entry) => entry.name), ...database.entries.map((entry) => entry.franchise)]);
  }

  function fillFormOptions() {
    const definitions = [
      ["#film-condition", "conditions", CONDITIONS, (entry) => entry.condition],
      ["#film-functionality", "functionalities", FUNCTIONALITIES, (entry) => entry.functionality],
      ["#film-completeness", "completeness", COMPLETENESS_VALUES, (entry) => entry.completeness],
      ["#film-rating", "ratings", AGE_RATINGS, (entry) => entry.rating]
    ];
    for (const [selector, key, defaults, getValue] of definitions) {
      const select = $(selector);
      const selected = select.value;
      const options = uniqueSorted([...defaults, ...customValues(key), ...database.entries.map(getValue)]);
      select.replaceChildren(new Option("Nicht angegeben", ""));
      for (const option of options) select.add(new Option(option, option));
      if (options.includes(selected)) select.value = selected;
    }
  }

  function fillFilters() {
    const filters = [
      ["#film-filter-format", uniqueSorted([...FORMATS, ...database.entries.map((entry) => entry.format)]), "Alle Formate"],
      ["#film-filter-condition", uniqueSorted([...CONDITIONS, ...customValues("conditions"), ...database.entries.map((entry) => entry.condition)]), "Alle Zustände"],
      ["#film-filter-rating", uniqueSorted([...AGE_RATINGS, ...customValues("ratings"), ...database.entries.map((entry) => entry.rating)]), "Alle Freigaben"]
    ];
    for (const [selector, values, placeholder] of filters) {
      const select = $(selector);
      const previous = select.value;
      select.replaceChildren(new Option(placeholder, ""));
      for (const value of values.filter(Boolean)) select.add(new Option(value, value));
      if (values.includes(previous)) select.value = previous;
    }
  }

  function selectedCategory() {
    return $("#film-category").value === "__custom__" ? $("#film-custom-category").value.trim() : $("#film-category").value;
  }

  function updateFormatFields() {
    const format = $("#film-format").value;
    for (const panel of $$(".film-format-fields")) panel.classList.toggle("hidden", panel.dataset.filmFormat !== format);
  }

  function clearForm() {
    $("#film-form").reset();
    $("#film-id").value = "";
    $("#film-quantity").value = "1";
    $("#film-form-message").textContent = "";
    detailsDraft = {};
    photosDraft = [];
    fillCategory();
    fillRelated();
    updateFormatFields();
    renderPhotos();
  }

  function showEditor(mode, entry) {
    editorMode = mode;
    $("#film-detail").classList.add("hidden");
    $("#film-editor").classList.remove("hidden");
    $("#film-editor-heading").textContent = mode === "edit" ? "Medium bearbeiten" : mode === "duplicate" ? "Medium duplizieren" : "Medium hinzufügen";
    clearForm();
    const data = entry || {};
    $("#film-id").value = mode === "edit" && entry ? entry.id : makeId();
    const fields = {
      title: "film-title", originalTitle: "film-original-title", alternateTitle: "film-alternate-title",
      kind: "film-kind", genre: "film-genre", year: "film-year", releaseDate: "film-release-date",
      directors: "film-directors", cast: "film-cast", writers: "film-writers", producers: "film-producers",
      studio: "film-studio", publisher: "film-publisher", country: "film-country", language: "film-language",
      originalLanguage: "film-original-language", runtime: "film-runtime", rating: "film-rating",
      franchise: "film-franchise", part: "film-part", edition: "film-edition", barcode: "film-barcode",
      condition: "film-condition", functionality: "film-functionality", completeness: "film-completeness",
      seriesName: "film-series-name", seasonNumber: "film-season-number", episodeCount: "film-episode-count",
      episodeRuntime: "film-episode-runtime", seasonCompleteness: "film-season-completeness",
      seasonMedia: "film-season-media", boxName: "film-box-name", purchaseDate: "film-purchase-date",
      purchasePrice: "film-purchase-price", estimatedValue: "film-estimated-value", source: "film-source",
      location: "film-location", ratingScore: "film-rating-score", description: "film-description",
      synopsis: "film-synopsis", notes: "film-notes", quantity: "film-quantity"
    };
    for (const [key, selector] of Object.entries(fields)) {
      if (data[key] !== undefined && data[key] !== null) $( `#${selector}`).value = String(data[key]);
    }
    $("#film-category").value = data.category && [...$("#film-category").options].some((option) => option.value === data.category)
      ? data.category
      : data.category ? "__custom__" : "";
    $("#film-custom-category").classList.toggle("hidden", $("#film-category").value !== "__custom__");
    if ($("#film-category").value === "__custom__") $("#film-custom-category").value = data.category;
    $("#film-format").value = FORMATS.includes(data.format) ? data.format : "DVD";
    $("#film-runtime").value = data.runtime ?? "";
    $("#film-rating-score").value = data.ratingScore ?? "";
    $("#film-episodes").value = (data.episodes || []).join("\n");
    $("#film-custom-values").value = (data.customValues || []).join("; ");
    detailsDraft = { ...(data.details || {}) };
    for (const field of $$("[data-film-detail]")) field.value = detailsDraft[field.dataset.filmDetail] || "";
    photosDraft = Array.isArray(data.photos) ? [...data.photos] : [];
    fillRelated(mode === "duplicate" ? [] : data.relatedIds || []);
    updateFormatFields();
    renderPhotos();
  }

  function readDetails() {
    for (const field of $$(".film-section [data-film-detail]")) {
      const formatPanel = field.closest("[data-film-format]");
      if (formatPanel && formatPanel.dataset.filmFormat !== $("#film-format").value) continue;
      const value = field.value.trim();
      if (value) detailsDraft[field.dataset.filmDetail] = value;
      else delete detailsDraft[field.dataset.filmDetail];
    }
    return { ...detailsDraft };
  }

  function splitList(value) {
    const result = value.split(/[;\n]/).map((part) => part.trim()).filter(Boolean);
    return result.filter((value, index) => result.findIndex((candidate) =>
      candidate.toLocaleLowerCase("de") === value.toLocaleLowerCase("de")) === index);
  }

  function collectEntry() {
    const value = (selector) => $(selector).value.trim();
    const number = (selector) => $(selector).value === "" ? null : Number($(selector).value);
    return {
      id: $("#film-id").value || makeId(),
      title: value("#film-title"), originalTitle: value("#film-original-title"),
      alternateTitle: value("#film-alternate-title"), category: selectedCategory(),
      kind: value("#film-kind"), genre: value("#film-genre"), year: value("#film-year"),
      releaseDate: value("#film-release-date"), directors: splitList(value("#film-directors")),
      cast: splitList(value("#film-cast")), writers: splitList(value("#film-writers")),
      producers: splitList(value("#film-producers")), studio: value("#film-studio"),
      publisher: value("#film-publisher"), country: value("#film-country"),
      language: value("#film-language"), originalLanguage: value("#film-original-language"),
      runtime: number("#film-runtime"), rating: value("#film-rating"),
      franchise: value("#film-franchise"), part: value("#film-part"), edition: value("#film-edition"),
      barcode: value("#film-barcode"), format: value("#film-format"),
      condition: value("#film-condition"), functionality: value("#film-functionality"),
      completeness: value("#film-completeness"), quantity: Math.max(1, Number($("#film-quantity").value) || 1),
      seriesName: value("#film-series-name"), seasonNumber: number("#film-season-number"),
      episodeCount: number("#film-episode-count"), episodeRuntime: number("#film-episode-runtime"),
      seasonCompleteness: value("#film-season-completeness"), seasonMedia: value("#film-season-media"),
      episodes: $("#film-episodes").value.split(/\r?\n/).map((episode) => episode.trim()).filter(Boolean),
      boxName: value("#film-box-name"), purchaseDate: value("#film-purchase-date"),
      purchasePrice: number("#film-purchase-price"), estimatedValue: number("#film-estimated-value"),
      source: value("#film-source"), location: value("#film-location"), ratingScore: number("#film-rating-score"),
      description: value("#film-description"), synopsis: value("#film-synopsis"), notes: value("#film-notes"),
      customValues: splitList(value("#film-custom-values")), details: readDetails(),
      relatedIds: [...$("#film-related").selectedOptions].map((option) => option.value),
      photos: [...photosDraft], updatedAt: now()
    };
  }

  function registerOption(next, key, value) {
    if (!value) return;
    next.customOptions[key] = uniqueSorted([...(next.customOptions[key] || []), value]);
  }

  function saveEntry(event) {
    event.preventDefault();
    if (photoProcessing) return report($("#film-form-message"), "Warte bitte, bis die Bildverarbeitung abgeschlossen ist.");
    if (!$("#film-form").reportValidity()) return;
    const entry = collectEntry();
    if (!entry.title) return report($("#film-form-message"), "Bitte gib einen Titel ein.");
    if ([entry.purchasePrice, entry.estimatedValue].some((amount) => amount !== null && (!Number.isFinite(amount) || amount < 0))) {
      return report($("#film-form-message"), "Preis und Wert müssen gültige positive Beträge sein.");
    }
    if (entry.ratingScore !== null && (!Number.isInteger(entry.ratingScore) || entry.ratingScore < 1 || entry.ratingScore > 5)) {
      return report($("#film-form-message"), "Die Bewertung muss eine ganze Zahl von 1 bis 5 sein.");
    }
    const next = structuredClone(database);
    const old = next.entries.find((item) => item.id === entry.id);
    const wasEditing = Boolean(old);
    if (entry.franchise) {
      let franchise = next.franchises.find((item) => item.name.toLocaleLowerCase("de") === entry.franchise.toLocaleLowerCase("de"));
      if (!franchise) {
        franchise = { id: makeId(), name: entry.franchise };
        next.franchises.push(franchise);
      }
      entry.franchiseId = franchise.id;
    }
    for (const relatedId of old?.relatedIds || []) {
      if (!entry.relatedIds.includes(relatedId)) {
        const related = next.entries.find((item) => item.id === relatedId);
        if (related) related.relatedIds = (related.relatedIds || []).filter((id) => id !== entry.id);
      }
    }
    if (wasEditing) next.entries[next.entries.findIndex((item) => item.id === entry.id)] = entry;
    else next.entries.push(entry);
    for (const relatedId of entry.relatedIds) {
      const related = next.entries.find((item) => item.id === relatedId);
      if (related) related.relatedIds = [...new Set([...(related.relatedIds || []), entry.id])];
    }
    next.franchises = next.franchises.filter((franchise) => next.entries.some((item) => item.franchiseId === franchise.id));
    registerOption(next, "categories", CATEGORIES.includes(entry.category) ? "" : entry.category);
    registerOption(next, "genres", entry.genre);
    registerOption(next, "conditions", CONDITIONS.includes(entry.condition) ? "" : entry.condition);
    registerOption(next, "functionalities", FUNCTIONALITIES.includes(entry.functionality) ? "" : entry.functionality);
    registerOption(next, "completeness", COMPLETENESS_VALUES.includes(entry.completeness) ? "" : entry.completeness);
    registerOption(next, "ratings", AGE_RATINGS.includes(entry.rating) ? "" : entry.rating);
    if (!FORMATS.includes(entry.format)) registerOption(next, "formats", entry.format);
    try {
      saveDatabase(next);
    } catch (error) {
      console.error("Could not save film.", error);
      return report($("#film-form-message"), "Medium konnte nicht gespeichert werden. Prüfe den verfügbaren Speicherplatz.");
    }
    $("#film-editor").classList.add("hidden");
    $("#film-detail").classList.add("hidden");
    activeCategory = entry.category;
    renderAll();
    report($("#film-result-count"), wasEditing ? "Medium aktualisiert." : editorMode === "duplicate" ? "Medium als eigener Datensatz dupliziert." : "Medium gespeichert.", false);
  }

  function addOptionValue(key, selector) {
    const input = $(selector);
    const value = input.value.trim();
    if (!value) return report($("#film-result-count"), "Bitte gib zuerst einen Wert ein.");
    const next = structuredClone(database);
    registerOption(next, key, value);
    try {
      saveDatabase(next);
      input.value = "";
      renderAll();
      report($("#film-result-count"), "Auswahlwert ergänzt.", false);
    } catch (error) {
      console.error("Could not save custom film option.", error);
      report($("#film-result-count"), "Auswahlwert konnte nicht gespeichert werden.");
    }
  }

  function getFilteredEntries() {
    const query = $("#film-query").value.trim().toLocaleLowerCase("de");
    const yearFilter = $("#film-filter-year").value.trim();
    const franchiseNames = new Map(database.franchises.map((item) => [item.id, item.name]));
    const entries = database.entries.filter((entry) => {
      if (activeCategory && entry.category !== activeCategory) return false;
      if ($("#film-filter-format").value && entry.format !== $("#film-filter-format").value) return false;
      if ($("#film-filter-condition").value && entry.condition !== $("#film-filter-condition").value) return false;
      if ($("#film-filter-rating").value && entry.rating !== $("#film-filter-rating").value) return false;
      if ($("#film-filter-genre").value.trim() && !(entry.genre || "").toLocaleLowerCase("de").includes($("#film-filter-genre").value.trim().toLocaleLowerCase("de"))) return false;
      if (yearFilter && entry.year !== yearFilter) return false;
      if (query) {
        const relatedTitles = (entry.relatedIds || []).map((id) => database.entries.find((item) => item.id === id)?.title || "");
        const searchable = [
          entry.title, entry.originalTitle, entry.alternateTitle, entry.category, entry.kind, entry.genre,
          entry.year, entry.releaseDate, entry.directors, entry.cast, entry.writers, entry.producers,
          entry.studio, entry.publisher, entry.country, entry.language, entry.originalLanguage,
          entry.rating, franchiseNames.get(entry.franchiseId), entry.franchise, entry.part, entry.edition,
          entry.barcode, entry.format, entry.condition, entry.functionality, entry.completeness,
          entry.seriesName, entry.seasonNumber, entry.episodes, entry.boxName, entry.location,
          entry.source, entry.description, entry.synopsis, entry.notes, entry.customValues,
          ...relatedTitles, ...Object.values(entry.details || {})
        ].flat().filter(Boolean).join(" ").toLocaleLowerCase("de");
        if (!searchable.includes(query)) return false;
      }
      return true;
    });
    const key = $("#film-sort").value;
    const direction = $("#film-sort-direction").value === "desc" ? -1 : 1;
    return entries.sort((a, b) => {
      const first = key === "estimatedValue" ? a.estimatedValue ?? -1 : a[key] ?? "";
      const second = key === "estimatedValue" ? b.estimatedValue ?? -1 : b[key] ?? "";
      if (typeof first === "number" || typeof second === "number") return (Number(first) - Number(second)) * direction;
      return String(first).localeCompare(String(second), "de", { numeric: true }) * direction;
    });
  }

  function renderTabs() {
    const categories = uniqueSorted([...CATEGORIES, ...customValues("categories"), ...database.entries.map((entry) => entry.category)]);
    const tabs = $("#film-category-tabs");
    tabs.replaceChildren();
    const add = (label, value, count) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "film-category-tab";
      button.role = "tab";
      button.setAttribute("aria-selected", String(activeCategory === value));
      button.textContent = `${label} (${count})`;
      button.addEventListener("click", () => { activeCategory = value; renderTabs(); renderEntries(); });
      tabs.append(button);
    };
    add("Alle Medien", "", database.entries.length);
    for (const category of categories) add(category, category, database.entries.filter((entry) => entry.category === category).length);
  }

  function money(value) {
    return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(value);
  }

  function summary(entry) {
    return [
      entry.category, entry.kind, entry.format, entry.year,
      entry.directors?.length ? `Regie: ${entry.directors.join(", ")}` : "",
      entry.condition, entry.functionality, entry.completeness,
      `${entry.quantity || 1} ${entry.quantity === 1 ? "Exemplar" : "Exemplare"}`,
      entry.franchise, entry.part ? `Teil ${entry.part}` : "", entry.seriesName,
      entry.seasonNumber ? `Staffel ${entry.seasonNumber}` : "",
      entry.estimatedValue == null ? "" : `Wert ${money(entry.estimatedValue)}`
    ].filter(Boolean).join(" · ");
  }

  function renderEntries() {
    const container = $("#film-cards");
    container.replaceChildren();
    const entries = getFilteredEntries();
    report($("#film-result-count"), `${entries.length} von ${database.entries.length} Medien`, false);
    container.classList.toggle("is-list", database.view === "list");
    if (!entries.length) {
      const empty = document.createElement("div");
      empty.className = "film-empty-state";
      empty.innerHTML = `<span aria-hidden="true">▣</span><h3>${database.entries.length ? "Keine passenden Medien gefunden." : "Deine Filmsammlung ist noch leer."}</h3><p>${database.entries.length ? "Passe Suche oder Filter an." : "Füge deinen ersten Film oder eine Serie hinzu."}</p>`;
      container.append(empty);
      return;
    }
    for (const entry of entries) {
      const card = document.createElement("article");
      card.className = "film-card";
      if (entry.photos?.[0]) {
        const image = document.createElement("img");
        image.src = entry.photos[0];
        image.alt = `Cover oder Poster: ${entry.title}`;
        image.loading = "lazy";
        card.append(image);
      } else {
        const placeholder = document.createElement("div");
        placeholder.className = "film-card-placeholder";
        placeholder.textContent = "▣";
        placeholder.setAttribute("aria-hidden", "true");
        card.append(placeholder);
      }
      const content = document.createElement("div");
      content.className = "film-card-content";
      const titleGroup = document.createElement("div");
      titleGroup.className = "film-card-title";
      const title = document.createElement("h3");
      title.textContent = entry.title;
      const subtitle = document.createElement("p");
      subtitle.textContent = [entry.originalTitle, entry.year].filter(Boolean).join(" · ");
      titleGroup.append(title, subtitle);
      const meta = document.createElement("p");
      meta.className = "film-card-meta";
      meta.textContent = summary(entry);
      const actions = document.createElement("div");
      actions.className = "film-card-actions";
      for (const [action, label] of [["view", "Details"], ["edit", "Bearbeiten"], ["duplicate", "Duplizieren"], ["delete", "×"]]) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = action === "delete" ? "icon-button" : "button button-secondary";
        button.textContent = label;
        button.dataset.filmAction = action;
        button.dataset.id = entry.id;
        if (action === "delete") button.setAttribute("aria-label", `${entry.title} löschen`);
        actions.append(button);
      }
      content.append(titleGroup, meta, actions);
      card.append(content);
      container.append(card);
    }
  }

  function detailSection(title, values) {
    const rows = values.filter(([, value]) => value !== "" && value !== null && value !== undefined);
    if (!rows.length) return "";
    return `<section class="film-detail-section"><h4>${escapeHtml(title)}</h4><dl>${rows.map(([label, value]) => `<div class="film-detail-row"><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}</dl></section>`;
  }

  function renderDetail(id) {
    const entry = database.entries.find((item) => item.id === id);
    if (!entry) return;
    const photos = (entry.photos || []).map((photo, index) => `<figure><img src="${escapeHtml(photo)}" alt="${escapeHtml(entry.title)} – Bild ${index + 1}" loading="lazy"></figure>`).join("");
    const details = Object.entries(entry.details || {}).map(([key, value]) => [DETAIL_LABELS[key] || key, value]);
    const related = (entry.relatedIds || []).map((relatedId) => database.entries.find((item) => item.id === relatedId)?.title).filter(Boolean).join(", ");
    const box = [
      ["Teil einer Box / Sammlung", entry.boxName],
      ["Verwandte Medien", related]
    ];
    const detail = $("#film-detail");
    detail.innerHTML = `<div class="film-detail-heading"><div><p class="eyebrow">MEDIENDETAILS</p><h3 id="film-detail-heading">${escapeHtml(entry.title)}</h3><p class="muted">${escapeHtml([entry.category, entry.kind, entry.format, entry.year].filter(Boolean).join(" · "))}</p></div><div class="film-detail-actions"><button class="button button-secondary" type="button" data-film-detail-action="edit" data-id="${escapeHtml(entry.id)}">Bearbeiten</button><button class="button button-secondary" type="button" data-film-detail-action="duplicate" data-id="${escapeHtml(entry.id)}">Duplizieren</button><button class="button button-secondary" type="button" data-film-detail-action="delete" data-id="${escapeHtml(entry.id)}">Löschen</button><button class="icon-button" type="button" data-film-detail-action="close" aria-label="Details schließen">×</button></div></div>${photos ? `<div class="film-detail-gallery">${photos}</div>` : ""}<div class="film-detail-grid">${detailSection("Werk & Veröffentlichung", [
      ["Originaltitel", entry.originalTitle], ["Alternativtitel", entry.alternateTitle], ["Medienart", entry.kind],
      ["Genre", entry.genre], ["Erscheinungsjahr", entry.year], ["Veröffentlichungsdatum", entry.releaseDate],
      ["Regie", entry.directors?.join(", ")], ["Darsteller", entry.cast?.join(", ")],
      ["Drehbuch", entry.writers?.join(", ")], ["Produktion", entry.producers?.join(", ")],
      ["Produktionsstudio", entry.studio], ["Verleih / Publisher", entry.publisher], ["Herkunftsland", entry.country],
      ["Sprache", entry.language], ["Originalsprache", entry.originalLanguage],
      ["Laufzeit", entry.runtime ? `${entry.runtime} Minuten` : ""], ["Altersfreigabe", entry.rating],
      ["Filmreihe / Franchise", entry.franchise], ["Teilnummer", entry.part], ["Edition", entry.edition],
      ["EAN / Produktnummer", entry.barcode]
    ])}${detailSection("Ausgabe, Zustand & Wiedergabe", [
      ["Format", entry.format], ["Zustand", entry.condition], ["Wiedergabefunktion", entry.functionality],
      ["Vollständigkeit", entry.completeness], ["Anzahl Exemplare", entry.quantity], ...details
    ])}${detailSection("Serien & Staffeln", [
      ["Serienname", entry.seriesName], ["Staffelnummer", entry.seasonNumber],
      ["Episodenanzahl", entry.episodeCount], ["Episodentitel", entry.episodes?.join("; ")],
      ["Laufzeit pro Episode", entry.episodeRuntime ? `${entry.episodeRuntime} Minuten` : ""],
      ["Vollständigkeit der Staffel", entry.seasonCompleteness], ["Disc-Anzahl / digital", entry.seasonMedia]
    ])}${detailSection("Sammlung & verwandte Medien", box)}${detailSection("Kauf & Wert", [
      ["Kaufdatum", entry.purchaseDate], ["Kaufpreis", entry.purchasePrice == null ? "" : money(entry.purchasePrice)],
      ["Geschätzter Wert", entry.estimatedValue == null ? "" : money(entry.estimatedValue)],
      ["Kaufort", entry.source], ["Lager- / Regalplatz", entry.location], ["Bewertung", entry.ratingScore ? `${entry.ratingScore} / 5` : ""]
    ])}${detailSection("Beschreibung & Notizen", [
      ["Inhaltsangabe", entry.synopsis], ["Beschreibung", entry.description], ["Persönliche Notizen", entry.notes],
      ["Eigene Merkmale", entry.customValues?.join(", ")]
    ])}</div>`;
    detail.classList.remove("hidden");
    detail.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function deleteEntry(entry) {
    if (!window.confirm(`„${entry.title}“ endgültig aus der Filmsammlung löschen?`)) return;
    const next = structuredClone(database);
    next.entries = next.entries.filter((item) => item.id !== entry.id)
      .map((item) => ({ ...item, relatedIds: (item.relatedIds || []).filter((id) => id !== entry.id) }));
    next.franchises = next.franchises.filter((franchise) => next.entries.some((item) => item.franchiseId === franchise.id));
    try {
      saveDatabase(next);
      $("#film-detail").classList.add("hidden");
      renderAll();
      report($("#film-result-count"), "Medium gelöscht.", false);
    } catch (error) {
      console.error("Could not delete film.", error);
      report($("#film-result-count"), "Löschen fehlgeschlagen. Die Mediendaten wurden nicht geändert.");
    }
  }

  function renderAll() {
    fillDatalists();
    fillFormOptions();
    fillFilters();
    renderTabs();
    renderEntries();
  }

  function clearFilters() {
    for (const selector of ["#film-query", "#film-filter-genre", "#film-filter-year", "#film-filter-format", "#film-filter-condition", "#film-filter-rating"]) {
      $(selector).value = "";
    }
    $("#film-sort").value = "title";
    $("#film-sort-direction").value = "asc";
    activeCategory = "";
    renderAll();
  }

  async function resizePhoto(file) {
    if (!file.type.startsWith("image/")) throw new Error("Bitte eine Bilddatei auswählen.");
    if (file.size > 12 * 1024 * 1024) throw new Error("Das Bild ist größer als 12 MB.");
    const bitmap = await createImageBitmap(file);
    let maxDimension = Math.min(1400, Math.max(bitmap.width, bitmap.height));
    while (maxDimension >= 450) {
      const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext("2d");
      if (!context) {
        bitmap.close();
        throw new Error("Die Bildverarbeitung ist in diesem Browser nicht verfügbar.");
      }
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      for (const quality of [0.78, 0.62, 0.48, 0.34, 0.24]) {
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        if (dataUrl.length <= 200_000) {
          bitmap.close();
          return dataUrl;
        }
      }
      maxDimension = Math.floor(maxDimension * 0.8);
    }
    bitmap.close();
    throw new Error("Das Bild konnte nicht ausreichend verkleinert werden.");
  }

  function renderPhotos() {
    const gallery = $("#film-photo-gallery");
    gallery.replaceChildren();
    if (!photosDraft.length) {
      const empty = document.createElement("p");
      empty.className = "film-empty-hint";
      empty.textContent = "Noch keine Bilder hinzugefügt.";
      gallery.append(empty);
      return;
    }
    photosDraft.forEach((photo, index) => {
      const figure = document.createElement("figure");
      figure.className = "film-photo";
      const image = document.createElement("img");
      image.src = photo;
      image.alt = `Filmbild ${index + 1}`;
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "icon-button";
      remove.textContent = "×";
      remove.setAttribute("aria-label", `Bild ${index + 1} entfernen`);
      remove.dataset.removePhoto = String(index);
      figure.append(image, remove);
      gallery.append(figure);
    });
  }

  $("#film-create").addEventListener("click", () => showEditor("create"));
  $("#film-editor-close").addEventListener("click", () => $("#film-editor").classList.add("hidden"));
  $("#film-editor-cancel").addEventListener("click", () => $("#film-editor").classList.add("hidden"));
  $("#film-form").addEventListener("submit", saveEntry);
  $("#film-category").addEventListener("change", () => {
    const custom = $("#film-category").value === "__custom__";
    $("#film-custom-category").classList.toggle("hidden", !custom);
    if (!custom) $("#film-custom-category").value = "";
  });
  $("#film-format").addEventListener("change", updateFormatFields);
  $("#film-editor").addEventListener("input", (event) => {
    const field = event.target.closest("[data-film-detail]");
    if (!field) return;
    if (field.value.trim()) detailsDraft[field.dataset.filmDetail] = field.value.trim();
    else delete detailsDraft[field.dataset.filmDetail];
  });
  $("#film-editor").addEventListener("change", (event) => {
    const field = event.target.closest("[data-film-detail]");
    if (!field) return;
    if (field.value.trim()) detailsDraft[field.dataset.filmDetail] = field.value.trim();
    else delete detailsDraft[field.dataset.filmDetail];
  });
  $("#film-photos-input").addEventListener("change", async (event) => {
    const files = [...event.target.files];
    event.target.value = "";
    window.updateLocalizedFileInput?.(event.target);
    const remaining = 8 - photosDraft.length;
    if (remaining <= 0) return report($("#film-form-message"), "Maximal acht Bilder je Medium.");
    photoProcessing = true;
    try {
      for (const file of files.slice(0, remaining)) photosDraft.push(await resizePhoto(file));
      if (files.length > remaining) report($("#film-form-message"), "Maximal acht Bilder je Medium; weitere Bilder wurden ignoriert.", false);
      renderPhotos();
    } catch (error) {
      console.error("Could not add film photo.", error);
      report($("#film-form-message"), error.message);
    } finally {
      photoProcessing = false;
    }
  });
  $("#film-photo-gallery").addEventListener("click", (event) => {
    const button = event.target.closest("[data-remove-photo]");
    if (!button) return;
    photosDraft.splice(Number(button.dataset.removePhoto), 1);
    renderPhotos();
  });
  $("#film-cards").addEventListener("click", (event) => {
    const button = event.target.closest("[data-film-action]");
    if (!button) return;
    const entry = database.entries.find((item) => item.id === button.dataset.id);
    if (!entry) return;
    if (button.dataset.filmAction === "view") renderDetail(entry.id);
    if (button.dataset.filmAction === "edit") showEditor("edit", entry);
    if (button.dataset.filmAction === "duplicate") showEditor("duplicate", entry);
    if (button.dataset.filmAction === "delete") deleteEntry(entry);
  });
  $("#film-detail").addEventListener("click", (event) => {
    const button = event.target.closest("[data-film-detail-action]");
    if (!button) return;
    if (button.dataset.filmDetailAction === "close") {
      $("#film-detail").classList.add("hidden");
      return;
    }
    const entry = database.entries.find((item) => item.id === button.dataset.id);
    if (!entry) return;
    if (button.dataset.filmDetailAction === "edit") showEditor("edit", entry);
    if (button.dataset.filmDetailAction === "duplicate") showEditor("duplicate", entry);
    if (button.dataset.filmDetailAction === "delete") deleteEntry(entry);
  });
  for (const selector of [
    "#film-query", "#film-filter-format", "#film-filter-condition", "#film-filter-genre",
    "#film-filter-year", "#film-filter-rating", "#film-sort", "#film-sort-direction"
  ]) $(selector).addEventListener("input", renderEntries);
  $("#film-clear-filters").addEventListener("click", clearFilters);
  for (const [selector, view] of [["#film-view-grid", "grid"], ["#film-view-list", "list"]]) {
    $(selector).addEventListener("click", () => {
      database.view = view;
      $("#film-view-grid").setAttribute("aria-pressed", String(view === "grid"));
      $("#film-view-list").setAttribute("aria-pressed", String(view === "list"));
      renderEntries();
      try {
        saveDatabase(database);
      } catch (error) {
        console.error("Could not save film view preference.", error);
        report($("#film-result-count"), "Ansicht konnte nicht gespeichert werden.");
      }
    });
  }
  $("#film-save-category").addEventListener("click", () => addOptionValue("categories", "#film-add-category"));
  $("#film-save-genre").addEventListener("click", () => addOptionValue("genres", "#film-add-genre"));
  $("#film-save-condition").addEventListener("click", () => addOptionValue("conditions", "#film-add-condition"));
  $("#film-save-functionality").addEventListener("click", () => addOptionValue("functionalities", "#film-add-functionality"));
  $("#film-save-rating").addEventListener("click", () => addOptionValue("ratings", "#film-add-rating"));
  $("#film-save-completeness").addEventListener("click", () => addOptionValue("completeness", "#film-add-completeness"));
  $("#film-category-tabs").addEventListener("keydown", (event) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    const tabs = $$(".film-category-tab", $("#film-category-tabs"));
    const current = tabs.indexOf(document.activeElement);
    const direction = event.key === "ArrowRight" ? 1 : -1;
    tabs[(current + direction + tabs.length) % tabs.length]?.focus();
  });
  $("#library-search-results").addEventListener("click", (event) => {
    const button = event.target.closest("[data-open-film]");
    if (!button) return;
    const entry = database.entries.find((item) => item.id === button.dataset.openFilm);
    if (!entry) return;
    activeCategory = entry.category;
    renderAll();
    $('[data-view="films"]').click();
    renderDetail(entry.id);
  });
  window.addEventListener("katalogic:film-inventory-imported", () => {
    try {
      database = loadDatabase();
      activeCategory = "";
      $("#film-editor").classList.add("hidden");
      $("#film-detail").classList.add("hidden");
      renderAll();
    } catch (error) {
      console.error("Could not refresh imported films.", error);
      report($("#film-result-count"), "Importierte Filmdaten konnten nicht angezeigt werden.");
    }
  });

  database = loadDatabase();
  renderAll();
  $("#film-view-grid").setAttribute("aria-pressed", String(database.view === "grid"));
  $("#film-view-list").setAttribute("aria-pressed", String(database.view === "list"));
  if (loadWarning) report($("#film-result-count"), loadWarning);
})();
