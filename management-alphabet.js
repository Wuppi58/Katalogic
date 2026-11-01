"use strict";

(() => {
  const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const lists = [
    { id: "devices", container: "#device-cards", card: ".device-card", title: ".device-card-title h3" },
    { id: "games", container: "#game-cards", card: ".game-card", title: ".game-card-title h3" },
    { id: "books", container: "#book-cards", card: ".book-card", title: ".book-card-title h3" },
    { id: "films", container: "#film-cards", card: ".film-card", title: ".film-card-title h3" },
    { id: "filaments", container: "#filament-cards", card: ".filament-card", title: ".filament-card-heading h3" },
    { id: "small-parts", container: "#small-parts-list", card: ".small-parts-card", title: ".small-parts-card-title h3" },
    { id: "watches", container: "#watch-cards", card: ".watch-card", title: ".watch-card-heading h3" }
  ];
  const activeLetters = new Map();
  const controls = new Map();

  function initial(value) {
    const first = [...String(value || "").trim()][0] || "";
    if (/^[ßẞ]$/.test(first)) return "S";
    const normalized = first.toLocaleUpperCase("de").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return /^[A-Z]$/.test(normalized) ? normalized : "#";
  }

  function createControl(list) {
    const nav = document.createElement("nav");
    nav.className = "management-alphabet";
    nav.setAttribute("aria-label", "Nach Anfangsbuchstaben filtern");
    nav.dataset.alphabetFor = list.id;
    const summary = document.createElement("span");
    summary.className = "management-alphabet-summary";
    summary.setAttribute("aria-live", "polite");
    const buttons = document.createElement("div");
    buttons.className = "management-alphabet-buttons";
    const all = document.createElement("button");
    all.type = "button";
    all.className = "management-alphabet-button management-alphabet-all";
    all.dataset.letter = "";
    all.textContent = "Alle";
    all.setAttribute("aria-pressed", "true");
    buttons.append(all);
    for (const letter of LETTERS) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "management-alphabet-button";
      button.dataset.letter = letter;
      button.textContent = letter;
      button.setAttribute("aria-pressed", "false");
      buttons.append(button);
    }
    const other = document.createElement("button");
    other.type = "button";
    other.className = "management-alphabet-button";
    other.dataset.letter = "#";
    other.textContent = "#";
    other.setAttribute("aria-pressed", "false");
    buttons.append(other);
    nav.append(buttons, summary);
    nav.addEventListener("click", (event) => {
      const button = event.target.closest("[data-letter]");
      if (!button || button.disabled) return;
      activeLetters.set(list.id, button.dataset.letter);
      update(list);
    });
    list.containerElement.parentElement.insertBefore(nav, list.containerElement);
    controls.set(list.id, { nav, summary, buttons });
  }

  function update(list) {
    const { nav, summary, buttons } = controls.get(list.id);
    const cards = [...list.containerElement.children].filter((card) => card.matches(list.cardSelector));
    const initials = new Set(cards.map((card) => initial(card.querySelector(list.titleSelector)?.textContent)));
    let active = activeLetters.get(list.id) || "";
    if (active && !initials.has(active)) {
      active = "";
      activeLetters.set(list.id, active);
    }
    nav.hidden = cards.length === 0;
    for (const button of buttons.querySelectorAll("[data-letter]")) {
      const letter = button.dataset.letter;
      button.disabled = Boolean(letter) && !initials.has(letter);
      button.setAttribute("aria-pressed", String(letter === active));
    }
    let visible = 0;
    for (const card of cards) {
      const matches = !active || initial(card.querySelector(list.titleSelector)?.textContent) === active;
      card.classList.toggle("hidden", !matches);
      if (matches) visible += 1;
    }
    const label = list.view.dataset.managementLabel || "Einträge";
    summary.textContent = active
      ? `${visible} ${visible === 1 ? "Eintrag" : "Einträge"} mit „${active}“ von ${cards.length} ${label}`
      : `${cards.length} ${cards.length === 1 ? "Eintrag" : "Einträge"} · Buchstaben auswählen`;
  }

  for (const list of lists) {
    const container = document.querySelector(list.container);
    const view = container?.closest(".app-view[data-management-view]");
    if (!container || !view || !container.parentElement) continue;
    Object.assign(list, {
      containerElement: container,
      cardSelector: list.card,
      titleSelector: list.title,
      view
    });
    createControl(list);
    update(list);
    new MutationObserver(() => update(list)).observe(container, { childList: true });
  }
})();
