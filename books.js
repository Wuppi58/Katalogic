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
    "Romane", "Krimis und Thriller", "Fantasy", "Science-Fiction", "Horror", "Klassiker",
    "Sachbücher", "Fachbücher", "Technik und Informatik", "Geschichte", "Wissenschaft",
    "Biografien und Autobiografien", "Ratgeber", "Kochen und Backen", "Kunst und Fotografie",
    "Reisen", "Kinderbücher", "Jugendbücher", "Comics und Graphic Novels", "Manga",
    "Lexika und Nachschlagewerke", "Schulbücher und Lehrbücher", "Zeitschriften und Magazine",
    "Hörbücher", "E-Books", "Sonstige Bücher"
  ];
  const CONDITIONS = ["Schlecht", "Gebraucht", "Gut", "Sehr gut", "Wie neu", "Neu und originalverpackt"];
  const READING_STATUSES = ["Ungelesen", "Gerade am Lesen", "Gelesen", "Abgebrochen", "Möchte ich lesen", "Verliehen", "Nicht zutreffend"];
  const DETAIL_LABELS = {
    coverCondition: "Zustand Einband / Cover", pageCondition: "Zustand der Seiten",
    dustJacket: "Schutzumschlag", signed: "Signiert", dedication: "Widmung",
    limited: "Sammlerausgabe / limitiert", fileFormat: "Dateiformat", platform: "Plattform / Shop",
    acquisition: "Bezug", drm: "DRM-Status", digitalLocation: "Speicherort / Bibliotheksverweis",
    narrator: "Sprecher", runtimeMinutes: "Laufzeit (Minuten)", audioMedium: "Hörbuchmedium",
    audioParts: "Anzahl CDs / Dateien", audioVersion: "Fassung", issue: "Ausgabe",
    readingDirection: "Leserichtung", specialEdition: "Sonderausgabe"
  };
  const FORMAT_DETAILS = {
    "Gedrucktes Buch": ["coverCondition", "pageCondition", "dustJacket", "signed", "dedication", "limited"],
    "E-Book": ["fileFormat", "platform", "acquisition", "drm", "digitalLocation"],
    "Hörbuch": ["narrator", "runtimeMinutes", "audioMedium", "audioParts", "audioVersion"],
    "Comic": ["issue", "readingDirection", "specialEdition", "coverCondition", "pageCondition"],
    "Manga": ["issue", "readingDirection", "specialEdition", "coverCondition", "pageCondition"]
  };
  const emptyDatabase = () => ({ books: [], series: [], customOptions: {}, view: "grid" });
  let database;
  let activeCategory = "";
  let editorMode = "create";
  let photosDraft = [];
  let detailsDraft = {};
  let photoProcessing = false;
  let loadWarning = "";

  function normalizeDatabase(value) {
    const blank = emptyDatabase();
    return {
      books: Array.isArray(value?.books) ? value.books : [],
      series: Array.isArray(value?.series) ? value.series : [],
      customOptions: value?.customOptions && typeof value.customOptions === "object" && !Array.isArray(value.customOptions)
        ? value.customOptions
        : blank.customOptions,
      view: value?.view === "list" ? "list" : "grid"
    };
  }

  function loadDatabase() {
    try {
      return normalizeDatabase(window.KatalogicBookStorage.load());
    } catch (error) {
      console.error("Could not load saved books.", error);
      loadWarning = "Gespeicherte Buchdaten konnten nicht gelesen werden. Vorhandene Daten wurden nicht überschrieben.";
      return emptyDatabase();
    }
  }

  function saveDatabase(next) {
    window.KatalogicBookStorage.save(next);
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

  function fillOptions(select, values, placeholder, selected = "") {
    select.replaceChildren(new Option(placeholder, ""));
    for (const value of uniqueSorted(values)) select.add(new Option(value, value));
    if (selected && !values.includes(selected)) select.add(new Option(selected, selected));
    if (selected) select.value = selected;
  }

  function fillCategories(selected = "") {
    const values = uniqueSorted([...CATEGORIES, ...customValues("categories"), ...database.books.map((book) => book.category)]);
    const select = $("#book-category");
    select.replaceChildren(new Option("Kategorie auswählen", ""));
    for (const category of values) select.add(new Option(category, category));
    select.add(new Option("＋ Eigene Kategorie …", "__custom__"));
    select.value = selected && values.includes(selected) ? selected : selected ? "__custom__" : "";
    const input = $("#book-new-category");
    input.classList.toggle("hidden", select.value !== "__custom__");
    if (select.value === "__custom__") input.value = selected || input.value;
  }

  function seriesName(seriesId) {
    return database.series.find((series) => series.id === seriesId)?.name || "";
  }

  function fillSeries(selected = "") {
    const select = $("#book-series");
    select.replaceChildren(new Option("Keine Reihe", ""));
    for (const series of [...database.series].sort((a, b) => a.name.localeCompare(b.name, "de"))) {
      select.add(new Option(series.name, series.id));
    }
    select.add(new Option("＋ Neue Reihe …", "__new__"));
    if (selected) select.value = selected;
    $("#book-new-series").classList.toggle("hidden", select.value !== "__new__");
  }

  function fillDatalists() {
    const set = (selector, values) => {
      $(selector).replaceChildren(...uniqueSorted(values).map((value) => new Option(value, value)));
    };
    set("#book-author-options", database.books.flatMap((book) => book.authors || []));
    set("#book-publisher-options", database.books.map((book) => book.publisher));
    set("#book-genre-options", [...customValues("genres"), ...database.books.map((book) => book.genre)]);
    set("#book-language-options", database.books.map((book) => book.language));
    set("#book-subcategory-options", [...customValues("subcategories"), ...database.books.map((book) => book.subcategory)]);
  }

  function fillFilters() {
    const filters = [
      ["#book-filter-category", database.books.map((book) => book.category), "Alle Kategorien"],
      ["#book-filter-language", database.books.map((book) => book.language), "Alle Sprachen"],
      ["#book-filter-format", database.books.map((book) => book.format), "Alle Formate"],
      ["#book-filter-condition", CONDITIONS, "Alle Zustände"],
      ["#book-filter-reading-status", READING_STATUSES, "Alle Lesestatus"]
    ];
    for (const [selector, values, placeholder] of filters) {
      const select = $(selector);
      const previous = select.value;
      fillOptions(select, values, placeholder, values.includes(previous) ? previous : "");
    }
  }

  function fillRelatedBooks(selectedIds = []) {
    const select = $("#book-related");
    const currentId = $("#book-id").value;
    select.replaceChildren(...database.books
      .filter((book) => book.id !== currentId)
      .sort((a, b) => a.title.localeCompare(b.title, "de"))
      .map((book) => {
        const option = new Option(`${book.title}${book.authors?.length ? ` — ${book.authors.join(", ")}` : ""}`, book.id);
        option.selected = selectedIds.includes(book.id);
        return option;
      }));
  }

  function selectedCategory() {
    return $("#book-category").value === "__custom__" ? $("#book-new-category").value.trim() : $("#book-category").value;
  }

  function formatPanels() {
    const format = $("#book-format").value;
    for (const panel of $$(".book-format-fields")) panel.classList.toggle("hidden", panel.dataset.bookFormat !== format);
    for (const field of $$("[data-visible-formats]")) {
      field.classList.toggle("hidden", !field.dataset.visibleFormats.split("|").includes(format));
    }
  }

  function updateLoanVisibility() {
    $("#book-loan-fields").classList.toggle("hidden", $("#book-reading-status").value !== "Verliehen");
  }

  function validIsbn(value, length) {
    const cleaned = value.replace(/[-\s]/g, "").toUpperCase();
    if (length === 10) {
      if (!/^\d{9}[\dX]$/.test(cleaned)) return false;
      return [...cleaned].reduce((sum, digit, index) =>
        sum + (digit === "X" ? 10 : Number(digit)) * (10 - index), 0) % 11 === 0;
    }
    if (!/^\d{13}$/.test(cleaned)) return false;
    const sum = [...cleaned].reduce((total, digit, index) =>
      total + Number(digit) * (index % 2 ? 3 : 1), 0);
    return sum % 10 === 0;
  }

  function validateIsbn(input, length) {
    const value = input.value.trim();
    input.setCustomValidity(value && !validIsbn(value, length)
      ? `Bitte eine gültige ISBN-${length} eingeben oder das Feld leeren.`
      : "");
  }

  function clearForm() {
    $("#book-form").reset();
    $("#book-id").value = "";
    $("#book-title").value = "";
    $("#book-quantity").value = "1";
    $("#book-new-category").value = "";
    $("#book-new-series").value = "";
    $("#book-form-message").textContent = "";
    $("#book-isbn10").setCustomValidity("");
    $("#book-isbn13").setCustomValidity("");
    photosDraft = [];
    detailsDraft = {};
    fillCategories();
    fillSeries();
    fillRelatedBooks();
    formatPanels();
    updateLoanVisibility();
    renderPhotoGallery();
  }

  function showEditor(mode, book) {
    editorMode = mode;
    $("#book-detail").classList.add("hidden");
    $("#book-editor").classList.remove("hidden");
    $("#book-editor-heading").textContent = mode === "edit" ? "Buch bearbeiten" : mode === "duplicate" ? "Buch duplizieren" : "Buch hinzufügen";
    clearForm();
    const data = book || {};
    $("#book-id").value = mode === "edit" && book ? book.id : mode === "duplicate" ? makeId() : makeId();
    $("#book-title").value = data.title || "";
    $("#book-subtitle").value = data.subtitle || "";
    $("#book-authors").value = (data.authors || []).join("; ");
    $("#book-editor-name").value = data.editor || "";
    $("#book-publisher").value = data.publisher || "";
    $("#book-year").value = data.year || "";
    $("#book-publish-date").value = data.publishDate || "";
    $("#book-edition").value = data.edition || "";
    fillCategories(data.category || "");
    $("#book-subcategory").value = data.subcategory || "";
    $("#book-genre").value = data.genre || "";
    $("#book-format").value = data.format || "Gedrucktes Buch";
    $("#book-binding").value = data.binding || "";
    $("#book-isbn10").value = data.isbn10 || "";
    $("#book-isbn13").value = data.isbn13 || "";
    $("#book-ean").value = data.ean || "";
    $("#book-language").value = data.language || "";
    $("#book-original-language").value = data.originalLanguage || "";
    $("#book-pages").value = data.pages ?? "";
    $("#book-translator").value = data.translator || "";
    $("#book-illustrator").value = data.illustrator || "";
    fillSeries(data.seriesId || "");
    $("#book-volume").value = data.volume || "";
    $("#book-blurb").value = data.blurb || "";
    $("#book-notes").value = data.notes || "";
    $("#book-condition").value = data.condition || CONDITIONS[2];
    $("#book-reading-status").value = data.readingStatus || READING_STATUSES[0];
    $("#book-rating").value = data.rating ?? "";
    $("#book-quantity").value = String(data.quantity || 1);
    $("#book-location").value = data.location || "";
    $("#book-purchase-date").value = data.purchaseDate || "";
    $("#book-purchase-price").value = data.purchasePrice ?? "";
    $("#book-estimated-value").value = data.estimatedValue ?? "";
    $("#book-source").value = data.source || "";
    $("#book-review").value = data.review || "";
    $("#book-borrower").value = data.loan?.borrower || "";
    $("#book-loan-date").value = data.loan?.loanDate || "";
    $("#book-due-date").value = data.loan?.dueDate || "";
    $("#book-return-date").value = data.loan?.returnDate || "";
    detailsDraft = { ...(data.details || {}) };
    for (const field of $$("[data-detail]")) field.value = detailsDraft[field.dataset.detail] || "";
    photosDraft = Array.isArray(data.photos) ? [...data.photos] : [];
    fillRelatedBooks(mode === "duplicate" ? [] : data.relatedBookIds || []);
    formatPanels();
    updateLoanVisibility();
    renderPhotoGallery();
    $("#book-editor").scrollIntoView({ behavior: "smooth", block: "start" });
    $("#book-title").focus({ preventScroll: true });
  }

  function readDetails() {
    for (const field of $$(".book-format-fields:not(.hidden) [data-detail]")) {
      const value = field.value.trim();
      if (value) detailsDraft[field.dataset.detail] = value;
      else delete detailsDraft[field.dataset.detail];
    }
    return { ...detailsDraft };
  }

  function readAuthors() {
    const authors = $("#book-authors").value.split(/[;\n]/).map((author) => author.trim()).filter(Boolean);
    return authors.filter((author, index) => authors.findIndex((candidate) =>
      candidate.toLocaleLowerCase("de") === author.toLocaleLowerCase("de")) === index);
  }

  function collectBook() {
    const value = (selector) => $(selector).value.trim();
    const number = (selector) => $(selector).value === "" ? null : Number($(selector).value);
    return {
      id: $("#book-id").value || makeId(),
      title: value("#book-title"),
      subtitle: value("#book-subtitle"),
      authors: readAuthors(),
      editor: value("#book-editor-name"),
      publisher: value("#book-publisher"),
      year: value("#book-year"),
      publishDate: value("#book-publish-date"),
      edition: value("#book-edition"),
      seriesId: $("#book-series").value === "__new__" ? "" : $("#book-series").value,
      newSeriesName: $("#book-series").value === "__new__" ? value("#book-new-series") : "",
      volume: value("#book-volume"),
      category: selectedCategory(),
      subcategory: value("#book-subcategory"),
      genre: value("#book-genre"),
      format: value("#book-format"),
      binding: value("#book-binding"),
      isbn10: value("#book-isbn10"),
      isbn13: value("#book-isbn13"),
      ean: value("#book-ean"),
      language: value("#book-language"),
      originalLanguage: value("#book-original-language"),
      pages: number("#book-pages"),
      translator: value("#book-translator"),
      illustrator: value("#book-illustrator"),
      blurb: value("#book-blurb"),
      notes: value("#book-notes"),
      condition: value("#book-condition"),
      readingStatus: value("#book-reading-status"),
      rating: number("#book-rating"),
      quantity: Math.max(1, Number($("#book-quantity").value) || 1),
      location: value("#book-location"),
      purchaseDate: value("#book-purchase-date"),
      purchasePrice: number("#book-purchase-price"),
      estimatedValue: number("#book-estimated-value"),
      source: value("#book-source"),
      review: value("#book-review"),
      loan: {
        borrower: value("#book-borrower"),
        loanDate: value("#book-loan-date"),
        dueDate: value("#book-due-date"),
        returnDate: value("#book-return-date")
      },
      relatedBookIds: [...$("#book-related").selectedOptions].map((option) => option.value),
      details: readDetails(),
      photos: [...photosDraft],
      updatedAt: now()
    };
  }

  function registerOption(next, key, value) {
    if (!value) return;
    next.customOptions[key] = uniqueSorted([...(next.customOptions[key] || []), value]);
  }

  function submitBook(event) {
    event.preventDefault();
    if (photoProcessing) return report($("#book-form-message"), "Warte bitte, bis die Bildverarbeitung abgeschlossen ist.");
    validateIsbn($("#book-isbn10"), 10);
    validateIsbn($("#book-isbn13"), 13);
    if (!$("#book-form").reportValidity()) return;
    const book = collectBook();
    if (!book.title) return report($("#book-form-message"), "Bitte gib einen Buchtitel ein.");
    if ([book.purchasePrice, book.estimatedValue].some((amount) => amount !== null && (!Number.isFinite(amount) || amount < 0))) {
      return report($("#book-form-message"), "Kaufpreis und Wert müssen gültige positive Beträge sein.");
    }
    if (book.rating !== null && (!Number.isInteger(book.rating) || book.rating < 1 || book.rating > 5)) {
      return report($("#book-form-message"), "Die Bewertung muss eine ganze Zahl von 1 bis 5 sein.");
    }
    const next = structuredClone(database);
    const prior = next.books.find((entry) => entry.id === book.id);
    const wasEditing = Boolean(prior);
    if (book.newSeriesName) {
      let series = next.series.find((entry) => entry.name.toLocaleLowerCase("de") === book.newSeriesName.toLocaleLowerCase("de"));
      if (!series) {
        series = { id: makeId(), name: book.newSeriesName };
        next.series.push(series);
      }
      book.seriesId = series.id;
    }
    delete book.newSeriesName;
    for (const relatedId of prior?.relatedBookIds || []) {
      if (!book.relatedBookIds.includes(relatedId)) {
        const related = next.books.find((entry) => entry.id === relatedId);
        if (related) related.relatedBookIds = (related.relatedBookIds || []).filter((id) => id !== book.id);
      }
    }
    if (wasEditing) next.books[next.books.findIndex((entry) => entry.id === book.id)] = book;
    else next.books.push(book);
    for (const relatedId of book.relatedBookIds) {
      const related = next.books.find((entry) => entry.id === relatedId);
      if (related) related.relatedBookIds = [...new Set([...(related.relatedBookIds || []), book.id])];
    }
    next.series = next.series.filter((series) => next.books.some((entry) => entry.seriesId === series.id));
    registerOption(next, "categories", CATEGORIES.includes(book.category) ? "" : book.category);
    registerOption(next, "subcategories", book.subcategory);
    registerOption(next, "genres", book.genre);
    try {
      saveDatabase(next);
    } catch (error) {
      console.error("Could not save book.", error);
      return report($("#book-form-message"), "Buch konnte nicht gespeichert werden. Prüfe den verfügbaren Speicherplatz.");
    }
    $("#book-editor").classList.add("hidden");
    $("#book-detail").classList.add("hidden");
    activeCategory = book.category;
    renderAll();
    report($("#book-result-count"), wasEditing ? "Buch aktualisiert." : editorMode === "duplicate" ? "Buch als eigener Datensatz dupliziert." : "Buch gespeichert.", false);
  }

  function addCustomOption(key, inputSelector) {
    const input = $(inputSelector);
    const value = input.value.trim();
    if (!value) return report($("#book-result-count"), "Bitte gib zuerst einen Wert ein.");
    const next = structuredClone(database);
    registerOption(next, key, value);
    try {
      saveDatabase(next);
      input.value = "";
      renderAll();
      report($("#book-result-count"), "Auswahlwert ergänzt.", false);
    } catch (error) {
      console.error("Could not save custom book option.", error);
      report($("#book-result-count"), "Auswahlwert konnte nicht gespeichert werden.");
    }
  }

  function filteredBooks() {
    const query = $("#book-query").value.trim().toLocaleLowerCase("de");
    const filters = {
      category: $("#book-filter-category").value,
      genre: $("#book-filter-genre").value.trim().toLocaleLowerCase("de"),
      language: $("#book-filter-language").value,
      format: $("#book-filter-format").value,
      condition: $("#book-filter-condition").value,
      readingStatus: $("#book-filter-reading-status").value
    };
    const seriesById = new Map(database.series.map((series) => [series.id, series.name]));
    const matches = database.books.filter((book) => {
      if (activeCategory && book.category !== activeCategory) return false;
      if (filters.category && book.category !== filters.category) return false;
      if (filters.genre && !(book.genre || "").toLocaleLowerCase("de").includes(filters.genre)) return false;
      if (filters.language && book.language !== filters.language) return false;
      if (filters.format && book.format !== filters.format) return false;
      if (filters.condition && book.condition !== filters.condition) return false;
      if (filters.readingStatus && book.readingStatus !== filters.readingStatus) return false;
      if (query) {
        const relatedTitles = (book.relatedBookIds || []).map((id) => database.books.find((related) => related.id === id)?.title || "");
        const searchable = [
          book.title, book.subtitle, ...(book.authors || []), book.editor, book.publisher, book.year,
          book.edition, seriesById.get(book.seriesId), book.volume, book.category, book.subcategory,
          book.genre, book.isbn10, book.isbn13, book.ean, book.language, book.originalLanguage,
          book.translator, book.illustrator, book.blurb, book.notes, book.location, book.source,
          book.condition, book.readingStatus, book.review, ...relatedTitles,
          ...Object.values(book.details || {}), ...Object.values(book.loan || {})
        ].filter(Boolean).join(" ").toLocaleLowerCase("de");
        if (!searchable.includes(query)) return false;
      }
      return true;
    });
    const sortKey = $("#book-sort").value;
    const direction = $("#book-sort-direction").value === "desc" ? -1 : 1;
    return matches.sort((a, b) => {
      let first = a[sortKey] ?? "";
      let second = b[sortKey] ?? "";
      if (sortKey === "author") {
        first = a.authors?.[0] || "";
        second = b.authors?.[0] || "";
      }
      if (sortKey === "estimatedValue") {
        first = a.estimatedValue ?? -1;
        second = b.estimatedValue ?? -1;
      }
      if (typeof first === "number" || typeof second === "number") return (Number(first) - Number(second)) * direction;
      return String(first).localeCompare(String(second), "de", { numeric: true }) * direction;
    });
  }

  function renderTabs() {
    const categories = uniqueSorted([...CATEGORIES, ...customValues("categories"), ...database.books.map((book) => book.category)]);
    const container = $("#book-category-tabs");
    container.replaceChildren();
    const addTab = (label, value, count) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "book-category-tab";
      button.role = "tab";
      button.setAttribute("aria-selected", String(activeCategory === value));
      button.textContent = `${label} (${count})`;
      button.addEventListener("click", () => {
        activeCategory = value;
        renderTabs();
        renderBooks();
      });
      container.append(button);
    };
    addTab("Alle Bücher", "", database.books.length);
    for (const category of categories) addTab(category, category, database.books.filter((book) => book.category === category).length);
  }

  function money(value) {
    return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(value);
  }

  function summary(book) {
    return [
      book.category, book.format, book.authors?.join(", "), book.publisher,
      book.year, book.condition, book.readingStatus,
      `${book.quantity || 1} ${book.quantity === 1 ? "Exemplar" : "Exemplare"}`,
      book.location, book.estimatedValue == null ? "" : `Wert ${money(book.estimatedValue)}`,
      book.readingStatus === "Verliehen" && book.loan?.borrower ? `Verliehen an ${book.loan.borrower}` : ""
    ].filter(Boolean).join(" · ");
  }

  function renderBooks() {
    const container = $("#book-cards");
    container.replaceChildren();
    const books = filteredBooks();
    report($("#book-result-count"), `${books.length} von ${database.books.length} Büchern`, false);
    container.classList.toggle("is-list", database.view === "list");
    if (!books.length) {
      const empty = document.createElement("div");
      empty.className = "book-empty-state";
      empty.innerHTML = `<span aria-hidden="true">▤</span><h3>${database.books.length ? "Keine passenden Bücher gefunden." : "Deine Bibliothek ist noch leer."}</h3><p>${database.books.length ? "Passe Suche oder Filter an." : "Füge dein erstes Buch, E-Book oder Hörbuch hinzu."}</p>`;
      container.append(empty);
      return;
    }
    for (const book of books) {
      const card = document.createElement("article");
      card.className = "book-card";
      if (book.photos?.[0]) {
        const image = document.createElement("img");
        image.src = book.photos[0];
        image.alt = `Cover: ${book.title}`;
        image.loading = "lazy";
        card.append(image);
      } else {
        const placeholder = document.createElement("div");
        placeholder.className = "book-card-placeholder";
        placeholder.textContent = "▤";
        placeholder.setAttribute("aria-hidden", "true");
        card.append(placeholder);
      }
      const content = document.createElement("div");
      content.className = "book-card-content";
      const heading = document.createElement("div");
      heading.className = "book-card-title";
      const title = document.createElement("h3");
      title.textContent = book.title;
      const subtitle = document.createElement("p");
      subtitle.textContent = [book.subtitle, book.authors?.join(", ")].filter(Boolean).join(" · ");
      heading.append(title, subtitle);
      const meta = document.createElement("p");
      meta.className = "book-card-meta";
      meta.textContent = summary(book);
      const actions = document.createElement("div");
      actions.className = "book-card-actions";
      for (const [action, label] of [["view", "Details"], ["edit", "Bearbeiten"], ["duplicate", "Duplizieren"], ["delete", "×"]]) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = action === "delete" ? "icon-button" : "button button-secondary";
        button.textContent = label;
        button.dataset.bookAction = action;
        button.dataset.id = book.id;
        if (action === "delete") button.setAttribute("aria-label", `${book.title} löschen`);
        actions.append(button);
      }
      content.append(heading, meta, actions);
      card.append(content);
      container.append(card);
    }
  }

  function detailSection(title, values) {
    const rows = values.filter(([, value]) => value !== "" && value !== null && value !== undefined);
    if (!rows.length) return "";
    return `<section class="book-detail-section"><h4>${escapeHtml(title)}</h4><dl>${rows.map(([label, value]) => `<div class="book-detail-row"><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}</dl></section>`;
  }

  function renderDetail(bookId) {
    const book = database.books.find((entry) => entry.id === bookId);
    if (!book) return;
    const photos = (book.photos || []).map((photo, index) => `<figure><img src="${escapeHtml(photo)}" alt="${escapeHtml(book.title)} – Bild ${index + 1}" loading="lazy"></figure>`).join("");
    const visibleDetails = new Set(FORMAT_DETAILS[book.format] || []);
    const details = Object.entries(book.details || {})
      .filter(([key]) => !DETAIL_LABELS[key] || visibleDetails.has(key))
      .map(([key, value]) => [DETAIL_LABELS[key] || key, value]);
    const loan = [
      ["Verliehen an", book.loan?.borrower], ["Verliehen am", book.loan?.loanDate],
      ["Rückgabe erwartet am", book.loan?.dueDate], ["Zurückgegeben am", book.loan?.returnDate]
    ];
    const related = (book.relatedBookIds || []).map((id) => database.books.find((entry) => entry.id === id)?.title).filter(Boolean).join(", ");
    const data = $("#book-detail");
    data.innerHTML = `<div class="book-detail-heading"><div><p class="eyebrow">BUCHDETAILS</p><h3 id="book-detail-heading">${escapeHtml(book.title)}</h3><p class="muted">${escapeHtml([book.authors?.join(", "), book.category, book.format].filter(Boolean).join(" · "))}</p></div><div class="book-detail-actions"><button class="button button-secondary" type="button" data-book-detail-action="edit" data-id="${escapeHtml(book.id)}">Bearbeiten</button><button class="button button-secondary" type="button" data-book-detail-action="duplicate" data-id="${escapeHtml(book.id)}">Duplizieren</button><button class="button button-secondary" type="button" data-book-detail-action="delete" data-id="${escapeHtml(book.id)}">Löschen</button><button class="icon-button" type="button" data-book-detail-action="close" aria-label="Details schließen">×</button></div></div>${photos ? `<div class="book-detail-gallery">${photos}</div>` : ""}<div class="book-detail-grid">${detailSection("Werk & Ausgabe", [
      ["Untertitel", book.subtitle], ["Autor(en)", book.authors?.join(", ")], ["Herausgeber", book.editor],
      ["Verlag", book.publisher], ["Erscheinungsjahr", book.year], ["Erscheinungsdatum", book.publishDate],
      ["Auflage", book.edition], ["Reihe / Serie", seriesName(book.seriesId)], ["Bandnummer", book.volume],
      ["Kategorie", book.category], ["Unterkategorie", book.subcategory], ["Genre", book.genre],
      ["Format", book.format], ["Einbandart", book.format === "Gedrucktes Buch" ? book.binding : ""], ["ISBN-10", book.isbn10],
      ["ISBN-13", book.isbn13], ["EAN", book.ean], ["Sprache", book.language],
      ["Originalsprache", book.originalLanguage],
      ["Seitenzahl", ["Gedrucktes Buch", "Comic", "Manga"].includes(book.format) ? book.pages : ""],
      ["Übersetzer", book.translator],
      ["Illustrator", book.illustrator], ["Verwandte Werke", related]
    ])}${detailSection("Sammlung & Lesestatus", [
      ["Zustand", book.condition], ["Lesestatus", book.readingStatus], ["Bewertung", book.rating ? `${book.rating} / 5` : ""],
      ["Exemplare", book.quantity], ["Standort", book.location]
    ])}${detailSection("Kauf & Wert", [
      ["Kaufdatum", book.purchaseDate], ["Kaufpreis", book.purchasePrice == null ? "" : money(book.purchasePrice)],
      ["Geschätzter Wert", book.estimatedValue == null ? "" : money(book.estimatedValue)], ["Kaufort / Händler", book.source]
    ])}${detailSection("Formatdetails", details)}${detailSection("Ausleihe", loan)}${detailSection("Klappentext & persönliche Notizen", [
      ["Klappentext", book.blurb], ["Eigene Notizen", book.notes], ["Rezension", book.review]
    ])}</div>`;
    data.classList.remove("hidden");
    data.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function deleteBook(book) {
    if (!window.confirm(`„${book.title}“ endgültig aus der Bibliothek löschen?`)) return;
    const next = structuredClone(database);
    next.books = next.books
      .filter((entry) => entry.id !== book.id)
      .map((entry) => ({ ...entry, relatedBookIds: (entry.relatedBookIds || []).filter((id) => id !== book.id) }));
    next.series = next.series.filter((series) => next.books.some((entry) => entry.seriesId === series.id));
    try {
      saveDatabase(next);
      $("#book-detail").classList.add("hidden");
      renderAll();
      report($("#book-result-count"), "Buch gelöscht.", false);
    } catch (error) {
      console.error("Could not delete book.", error);
      report($("#book-result-count"), "Löschen fehlgeschlagen. Die Buchdaten wurden nicht geändert.");
    }
  }

  function renderAll() {
    fillDatalists();
    fillFilters();
    renderTabs();
    renderBooks();
  }

  function clearFilters() {
    for (const selector of ["#book-query", "#book-filter-genre"]) $(selector).value = "";
    for (const selector of ["#book-filter-category", "#book-filter-language", "#book-filter-format", "#book-filter-condition", "#book-filter-reading-status"]) {
      $(selector).value = "";
    }
    $("#book-sort").value = "title";
    $("#book-sort-direction").value = "asc";
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

  function renderPhotoGallery() {
    const gallery = $("#book-photo-gallery");
    gallery.replaceChildren();
    if (!photosDraft.length) {
      const empty = document.createElement("p");
      empty.className = "book-empty-hint";
      empty.textContent = "Noch keine Bilder hinzugefügt.";
      gallery.append(empty);
      return;
    }
    photosDraft.forEach((photo, index) => {
      const figure = document.createElement("figure");
      figure.className = "book-photo";
      const image = document.createElement("img");
      image.src = photo;
      image.alt = `Buchbild ${index + 1}`;
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

  $("#book-create").addEventListener("click", () => showEditor("create"));
  $("#book-editor-close").addEventListener("click", () => $("#book-editor").classList.add("hidden"));
  $("#book-editor-cancel").addEventListener("click", () => $("#book-editor").classList.add("hidden"));
  $("#book-form").addEventListener("submit", submitBook);
  $("#book-category").addEventListener("change", () => {
    const custom = $("#book-category").value === "__custom__";
    $("#book-new-category").classList.toggle("hidden", !custom);
    if (!custom) $("#book-new-category").value = "";
  });
  $("#book-series").addEventListener("change", () => {
    const isNew = $("#book-series").value === "__new__";
    $("#book-new-series").classList.toggle("hidden", !isNew);
    if (!isNew) $("#book-new-series").value = "";
  });
  $("#book-format").addEventListener("change", formatPanels);
  function updateDetailDraft(event) {
    const field = event.target.closest("[data-detail]");
    if (!field) return;
    const value = field.value.trim();
    if (value) detailsDraft[field.dataset.detail] = value;
    else delete detailsDraft[field.dataset.detail];
  }
  $("#book-editor").addEventListener("input", updateDetailDraft);
  $("#book-editor").addEventListener("change", updateDetailDraft);
  $("#book-reading-status").addEventListener("change", updateLoanVisibility);
  for (const [selector, length] of [["#book-isbn10", 10], ["#book-isbn13", 13]]) {
    $(selector).addEventListener("input", (event) => validateIsbn(event.currentTarget, length));
    $(selector).addEventListener("blur", (event) => validateIsbn(event.currentTarget, length));
  }
  $("#book-photos-input").addEventListener("change", async (event) => {
    const files = [...event.target.files];
    event.target.value = "";
    window.updateLocalizedFileInput?.(event.target);
    const remaining = 8 - photosDraft.length;
    if (remaining <= 0) return report($("#book-form-message"), "Maximal acht Bilder je Buch.");
    photoProcessing = true;
    try {
      for (const file of files.slice(0, remaining)) photosDraft.push(await resizePhoto(file));
      if (files.length > remaining) report($("#book-form-message"), "Maximal acht Bilder je Buch; weitere Bilder wurden ignoriert.", false);
      renderPhotoGallery();
    } catch (error) {
      console.error("Could not add book photo.", error);
      report($("#book-form-message"), error.message);
    } finally {
      photoProcessing = false;
    }
  });
  $("#book-photo-gallery").addEventListener("click", (event) => {
    const button = event.target.closest("[data-remove-photo]");
    if (!button) return;
    photosDraft.splice(Number(button.dataset.removePhoto), 1);
    renderPhotoGallery();
  });
  $("#book-cards").addEventListener("click", (event) => {
    const button = event.target.closest("[data-book-action]");
    if (!button) return;
    const book = database.books.find((entry) => entry.id === button.dataset.id);
    if (!book) return;
    if (button.dataset.bookAction === "view") renderDetail(book.id);
    if (button.dataset.bookAction === "edit") showEditor("edit", book);
    if (button.dataset.bookAction === "duplicate") showEditor("duplicate", book);
    if (button.dataset.bookAction === "delete") deleteBook(book);
  });
  $("#book-detail").addEventListener("click", (event) => {
    const button = event.target.closest("[data-book-detail-action]");
    if (!button) return;
    if (button.dataset.bookDetailAction === "close") {
      $("#book-detail").classList.add("hidden");
      return;
    }
    const book = database.books.find((entry) => entry.id === button.dataset.id);
    if (!book) return;
    if (button.dataset.bookDetailAction === "edit") showEditor("edit", book);
    if (button.dataset.bookDetailAction === "duplicate") showEditor("duplicate", book);
    if (button.dataset.bookDetailAction === "delete") deleteBook(book);
  });
  $("#book-category-tabs").addEventListener("keydown", (event) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    const tabs = $$(".book-category-tab", $("#book-category-tabs"));
    const current = tabs.indexOf(document.activeElement);
    const offset = event.key === "ArrowRight" ? 1 : -1;
    tabs[(current + offset + tabs.length) % tabs.length]?.focus();
  });
  for (const selector of [
    "#book-query", "#book-filter-category", "#book-filter-genre", "#book-filter-language",
    "#book-filter-format", "#book-filter-condition", "#book-filter-reading-status",
    "#book-sort", "#book-sort-direction"
  ]) $(selector).addEventListener("input", renderBooks);
  $("#book-clear-filters").addEventListener("click", clearFilters);
  for (const [buttonSelector, view] of [["#book-view-grid", "grid"], ["#book-view-list", "list"]]) {
    $(buttonSelector).addEventListener("click", () => {
      database.view = view;
      $("#book-view-grid").setAttribute("aria-pressed", String(view === "grid"));
      $("#book-view-list").setAttribute("aria-pressed", String(view === "list"));
      renderBooks();
      try {
        saveDatabase(database);
      } catch (error) {
        console.error("Could not save book view preference.", error);
        report($("#book-result-count"), "Ansicht konnte nicht gespeichert werden.");
      }
    });
  }
  $("#book-save-category").addEventListener("click", () => addCustomOption("categories", "#book-add-category"));
  $("#book-save-genre").addEventListener("click", () => addCustomOption("genres", "#book-add-genre"));
  $("#library-search-results").addEventListener("click", (event) => {
    const button = event.target.closest("[data-open-book]");
    if (!button) return;
    const book = database.books.find((entry) => entry.id === button.dataset.openBook);
    if (!book) return;
    activeCategory = book.category;
    renderAll();
    $('[data-view="books"]').click();
    renderDetail(book.id);
  });
  window.addEventListener("katalogic:book-inventory-imported", () => {
    try {
      database = loadDatabase();
      activeCategory = "";
      $("#book-editor").classList.add("hidden");
      $("#book-detail").classList.add("hidden");
      renderAll();
    } catch (error) {
      console.error("Could not refresh imported books.", error);
      report($("#book-result-count"), "Importierte Buchdaten konnten nicht angezeigt werden.");
    }
  });

  database = loadDatabase();
  fillOptions($("#book-condition"), CONDITIONS, "", CONDITIONS[2]);
  fillOptions($("#book-reading-status"), READING_STATUSES, "", READING_STATUSES[0]);
  renderAll();
  $("#book-view-grid").setAttribute("aria-pressed", String(database.view === "grid"));
  $("#book-view-list").setAttribute("aria-pressed", String(database.view === "list"));
  if (loadWarning) report($("#book-result-count"), loadWarning);
})();
