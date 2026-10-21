"use strict";

(() => {
  const LEGACY_STORAGE_KEY = "katalogic-device-inventory-v1";
  const PHOTO_LIMIT = 10;
  const PHOTO_MAX_SIZE = 450 * 1024;
  const makeModels = (value) => value.split("|");
  const catalog = {
    "Konsolen": {
      "Heimkonsole": {
        Sony: makeModels("PlayStation 5|PlayStation 4|PlayStation 3|PlayStation 2|PlayStation"),
        Microsoft: makeModels("Xbox Series X|Xbox Series S|Xbox One X|Xbox One|Xbox 360|Xbox"),
        Nintendo: makeModels("Nintendo Switch|Wii U|Wii|GameCube|Nintendo 64|Super Nintendo|NES"),
        Sega: makeModels("Dreamcast|Saturn|Mega Drive|Master System"),
        Atari: makeModels("Atari 2600|Atari 5200|Atari 7800|Atari Jaguar"),
        Valve: makeModels("Steam Machine")
      },
      "Handheld-Konsole": {
        Nintendo: makeModels("Nintendo Switch Lite|Nintendo Switch OLED|Game Boy Advance|Game Boy Color|Game Boy|Nintendo DS|Nintendo 3DS"),
        Sony: makeModels("PlayStation Vita|PSP"),
        Valve: makeModels("Steam Deck|Steam Deck OLED"),
        ASUS: makeModels("ROG Ally|ROG Ally X"),
        Lenovo: makeModels("Legion Go"),
        Microsoft: makeModels("ROG Xbox Ally")
      },
      "Retro-Konsole": {
        Nintendo: makeModels("NES Classic Mini|SNES Classic Mini"),
        Sega: makeModels("Mega Drive Mini|Mega Drive Mini 2"),
        Atari: makeModels("Atari 2600+|Atari Flashback"),
        Sony: makeModels("PlayStation Classic"),
        Analogue: makeModels("Analogue Pocket|Analogue Duo")
      },
      "Arcade-Konsole": { Arcade: makeModels("Arcade-Automat|Bartop-Automat") }
    },
    "Computer": {
      "Desktop-PC": {
        Apple: makeModels("Mac mini|Mac Studio|Mac Pro"),
        Dell: makeModels("OptiPlex|Precision Tower"),
        HP: makeModels("ProDesk|EliteDesk|Z Workstation"),
        Lenovo: makeModels("ThinkCentre|ThinkStation"),
        ASUS: makeModels("ExpertCenter|ROG Desktop"),
        "Eigenbau": makeModels("Eigenbau-PC")
      },
      "Gaming-PC": { Alienware: makeModels("Aurora"), ASUS: makeModels("ROG G Series"), MSI: makeModels("Aegis|Infinite"), "Eigenbau": makeModels("Eigenbau-Gaming-PC") },
      "Office-PC": { Dell: makeModels("OptiPlex"), HP: makeModels("ProDesk|EliteDesk"), Lenovo: makeModels("ThinkCentre"), Fujitsu: makeModels("Esprimo") },
      "Laptop": { Apple: makeModels("MacBook Air|MacBook Pro"), Dell: makeModels("XPS|Latitude|Inspiron"), Lenovo: makeModels("ThinkPad|IdeaPad|Yoga"), HP: makeModels("EliteBook|ProBook|Pavilion"), ASUS: makeModels("Zenbook|Vivobook|ROG Zephyrus"), Acer: makeModels("Swift|Aspire|Predator") },
      "Mini-PC": { Apple: makeModels("Mac mini"), Minisforum: makeModels("UM Series|MS Series"), Intel: makeModels("NUC"), ASUS: makeModels("NUC|PN Series"), Lenovo: makeModels("ThinkCentre Tiny") },
      "Workstation": { Dell: makeModels("Precision"), HP: makeModels("Z Workstation"), Lenovo: makeModels("ThinkStation"), Apple: makeModels("Mac Studio|Mac Pro") },
      "Server": { Dell: makeModels("PowerEdge"), HPE: makeModels("ProLiant"), Lenovo: makeModels("ThinkSystem"), Synology: makeModels("RackStation"), QNAP: makeModels("Rackmount NAS") }
    },
    "TV und Video": {
      "Fernseher": { Samsung: makeModels("The Frame|Neo QLED|OLED S Series|Crystal UHD"), LG: makeModels("OLED C Series|OLED G Series|QNED"), Sony: makeModels("BRAVIA XR|BRAVIA"), Philips: makeModels("OLED|The One"), Panasonic: makeModels("MZ Series|LZ Series"), TCL: makeModels("C Series|P Series") },
      "Monitor": { Dell: makeModels("UltraSharp|Alienware"), LG: makeModels("UltraGear|UltraFine"), Samsung: makeModels("Odyssey|ViewFinity"), ASUS: makeModels("ROG Swift|ProArt"), BenQ: makeModels("PD Series|EX Series"), AOC: makeModels("AGON|Gaming") },
      "Beamer / Projektor": { Epson: makeModels("EH Series|EB Series"), BenQ: makeModels("TK Series|W Series"), Sony: makeModels("VPL Series"), XGIMI: makeModels("Horizon|MoGo"), Anker: makeModels("Nebula Cosmos|Nebula Capsule") },
      "Streaminggerät": { Apple: makeModels("Apple TV 4K"), Google: makeModels("Chromecast|Google TV Streamer"), Amazon: makeModels("Fire TV Stick|Fire TV Cube"), NVIDIA: makeModels("Shield TV"), Roku: makeModels("Roku Streaming Stick") }
    },
    "Audio": {
      "Kopfhörer": { Sony: makeModels("WH-1000XM5|WH-1000XM4|WF-1000XM5"), Bose: makeModels("QuietComfort Ultra|QuietComfort"), Sennheiser: makeModels("Momentum|HD 600"), Apple: makeModels("AirPods Max|AirPods Pro"), JBL: makeModels("Tour One|Live") },
      "Headset": { Logitech: makeModels("G Pro X|G733"), SteelSeries: makeModels("Arctis Nova Pro|Arctis 7"), HyperX: makeModels("Cloud III|Cloud Alpha"), Razer: makeModels("BlackShark|Kraken"), Sony: makeModels("INZONE H Series") },
      "Lautsprecher": { Sonos: makeModels("Era 100|Era 300|One"), JBL: makeModels("Charge|Flip|PartyBox"), Bose: makeModels("SoundLink|Home Speaker"), KEF: makeModels("LSX|LS50"), Marshall: makeModels("Acton|Stanmore") },
      "Soundbar": { Sonos: makeModels("Arc|Beam|Ray"), Samsung: makeModels("Q Series"), LG: makeModels("S Series"), Bose: makeModels("Smart Ultra Soundbar"), Sony: makeModels("HT Series") },
      "Verstärker / Receiver": { Denon: makeModels("AVR-X Series"), Yamaha: makeModels("RX-V Series|A-S Series"), Marantz: makeModels("Cinema Series"), Onkyo: makeModels("TX-NR Series"), "Cambridge Audio": makeModels("CXA Series") },
      "Mischpult": { Yamaha: makeModels("MG Series|DM3"), Behringer: makeModels("Xenyx|X Air"), AllenHeath: makeModels("ZED|Qu Series"), Mackie: makeModels("Mix Series") },
      "Plattenspieler": { ProJect: makeModels("Debut|Primary"), AudioTechnica: makeModels("AT-LP120|AT-LP60"), Technics: makeModels("SL-1200"), Rega: makeModels("Planar 1|Planar 3") }
    },
    "Mobilgeräte": {
      "Smartphone": { Apple: makeModels("iPhone 17|iPhone 16|iPhone 15|iPhone SE"), Samsung: makeModels("Galaxy S Series|Galaxy Z Fold|Galaxy Z Flip|Galaxy A Series"), Google: makeModels("Pixel 10|Pixel 9|Pixel 8"), Xiaomi: makeModels("Xiaomi Series|Redmi|POCO"), Fairphone: makeModels("Fairphone 6|Fairphone 5"), Motorola: makeModels("Edge|Razr|Moto G") },
      "Tablet": { Apple: makeModels("iPad Pro|iPad Air|iPad|iPad mini"), Samsung: makeModels("Galaxy Tab S|Galaxy Tab A"), Lenovo: makeModels("Tab P Series|Yoga Tab"), Microsoft: makeModels("Surface Pro|Surface Go"), Xiaomi: makeModels("Pad Series") },
      "Smartwatch": { Apple: makeModels("Apple Watch Ultra|Apple Watch Series|Apple Watch SE"), Samsung: makeModels("Galaxy Watch Ultra|Galaxy Watch"), Google: makeModels("Pixel Watch"), Garmin: makeModels("Fenix|Forerunner|Venu"), Huawei: makeModels("Watch GT|Watch Fit") },
      "Fitness-Tracker": { Fitbit: makeModels("Charge|Inspire|Luxe"), Garmin: makeModels("Vivosmart"), Xiaomi: makeModels("Smart Band"), Samsung: makeModels("Galaxy Fit") }
    },
    "Foto und Video": {
      "Kamera": { Canon: makeModels("EOS R5|EOS R6|EOS R50|PowerShot"), Nikon: makeModels("Z8|Z6|Z5|Z fc"), Sony: makeModels("Alpha 7|Alpha 6000|ZV-E10"), Fujifilm: makeModels("X-T5|X-S20|GFX"), Panasonic: makeModels("Lumix S|Lumix G"), OMSystem: makeModels("OM-1|PEN") },
      "Objektiv": { Canon: makeModels("RF 24-70mm|RF 50mm|EF Series"), Nikon: makeModels("NIKKOR Z|NIKKOR F"), Sony: makeModels("FE 24-70mm|E 18-135mm"), Sigma: makeModels("Art|Contemporary|Sports"), Tamron: makeModels("Di III Series"), Fujifilm: makeModels("XF Series|GF Series") },
      "Camcorder": { Sony: makeModels("Handycam|Cinema Line"), Canon: makeModels("XA Series|XF Series"), Panasonic: makeModels("HC Series|AG Series") },
      "Actionkamera": { GoPro: makeModels("HERO 13|HERO 12|MAX"), DJI: makeModels("Osmo Action 5|Osmo Action 4"), Insta360: makeModels("Ace Pro|X Series") },
      "Drohne": { DJI: makeModels("Mavic 4|Mavic 3|Mini 4|Air 3"), Autel: makeModels("EVO Lite|EVO II"), Parrot: makeModels("ANAFI") }
    },
    "Haushaltsgeräte": {
      "Kühlschrank": { Bosch: makeModels("Serie 4|Serie 6|Serie 8"), Siemens: makeModels("iQ500|iQ700"), Liebherr: makeModels("Pure|Plus|Prime"), Samsung: makeModels("Bespoke"), LG: makeModels("Instaview") },
      "Waschmaschine": { Bosch: makeModels("Serie 6|Serie 8"), Miele: makeModels("W1"), Siemens: makeModels("iQ500|iQ700"), Samsung: makeModels("Bespoke AI"), AEG: makeModels("9000 Series") },
      "Trockner": { Bosch: makeModels("Serie 6|Serie 8"), Miele: makeModels("T1"), Siemens: makeModels("iQ500|iQ700"), AEG: makeModels("9000 Series") },
      "Geschirrspüler": { Bosch: makeModels("Serie 4|Serie 6|Serie 8"), Miele: makeModels("G Series"), Siemens: makeModels("iQ500|iQ700"), AEG: makeModels("9000 Series") },
      "Staubsauger": { Dyson: makeModels("V15|V12|Gen5detect"), Miele: makeModels("Complete C3|Triflex"), Bosch: makeModels("Unlimited|ProAnimal"), Vorwerk: makeModels("Kobold") },
      "Saugroboter": { Roborock: makeModels("S8|Qrevo|Q Series"), iRobot: makeModels("Roomba j Series|Roomba Combo"), Ecovacs: makeModels("Deebot X Series"), Dreame: makeModels("L Series|X Series") },
      "Kaffeemaschine": { DeLonghi: makeModels("Magnifica|Dinamica|Eletta"), Jura: makeModels("E Series|S Series|Z Series"), Siemens: makeModels("EQ.6|EQ.9"), Sage: makeModels("Barista Express|Barista Pro"), Nespresso: makeModels("Vertuo|Original") },
      "Weitere Haushaltsgeräte": { Bosch: makeModels("Serie 4|Serie 6|Serie 8"), Miele: makeModels("Classic|Premium"), Philips: makeModels("Series 5000|Series 7000"), Samsung: makeModels("Bespoke"), AEG: makeModels("7000 Series") }
    },
    "Netzwerkgeräte": {
      "Router": { AVM: makeModels("FRITZ!Box 5690 Pro|FRITZ!Box 7590 AX|FRITZ!Box 7530 AX"), TPLink: makeModels("Archer|Deco"), ASUS: makeModels("RT-AX|ROG Rapture"), Ubiquiti: makeModels("UniFi Dream Router") },
      "Modem": { AVM: makeModels("FRITZ!Box Cable"), Netgear: makeModels("Nighthawk CM"), Arris: makeModels("SURFboard") },
      "Switch": { TPLink: makeModels("Omada|TL-SG"), Netgear: makeModels("ProSAFE|Smart Managed"), Ubiquiti: makeModels("UniFi Switch"), Cisco: makeModels("Catalyst|CBS") },
      "Access Point": { Ubiquiti: makeModels("UniFi U7|UniFi U6"), TPLink: makeModels("Omada EAP"), Netgear: makeModels("WAX Series"), Aruba: makeModels("Instant On") },
      "NAS-System": { Synology: makeModels("DiskStation Plus|DiskStation XS|BeeStation"), QNAP: makeModels("TS Series|TVS Series"), TerraMaster: makeModels("F Series"), Asustor: makeModels("Lockerstor") },
      "Server": { Dell: makeModels("PowerEdge"), HPE: makeModels("ProLiant"), Lenovo: makeModels("ThinkSystem"), Supermicro: makeModels("SuperServer") }
    },
    "Werkstattgeräte": {
      "Bohrmaschine": { Bosch: makeModels("Professional GSB|UniversalImpact"), Makita: makeModels("DHP Series"), DeWalt: makeModels("DCD Series"), Metabo: makeModels("SB Series") },
      "Akkuschrauber": { Bosch: makeModels("Professional GSR|IXO"), Makita: makeModels("DDF Series"), DeWalt: makeModels("DCD Series"), Milwaukee: makeModels("M18|M12"), Festool: makeModels("T Series") },
      "Messgerät": { Bosch: makeModels("GLM|GLL"), Fluke: makeModels("87V|117"), Testo: makeModels("Smart Probes"), Leica: makeModels("Disto") },
      "Weitere Werkzeuge": { Bosch: makeModels("Professional"), Makita: makeModels("LXT"), DeWalt: makeModels("XR"), Milwaukee: makeModels("M18"), Einhell: makeModels("Power X-Change") }
    },
    "Sonstige Geräte": {
      "Freier Gerätetyp": { "Andere Hersteller": makeModels("Eigenes Modell") }
    }
  };

  const TECH_FIELDS = {
    "Konsolen": ["Generation", "Speicherkapazität", "Laufwerk", "Edition", "Anschlüsse", "Unterstützte Medien"],
    "Computer": ["Prozessor", "Grafikkarte", "Arbeitsspeicher", "Speicherlaufwerke", "Betriebssystem", "Anschlüsse"],
    "TV und Video": ["Bildschirmgröße", "Auflösung", "Bildwiederholrate", "Displaytechnik", "Anschlüsse"],
    "Audio": ["Leistung", "Anschlussarten", "Kanäle", "Funkstandards", "Audioformate"],
    "Mobilgeräte": ["Speicher", "Arbeitsspeicher", "Displaygröße", "Betriebssystem", "Akkukapazität"],
    "Foto und Video": ["Sensor", "Auflösung", "Objektivanschluss", "Aufnahmeformate", "Auslösungen"],
    "Haushaltsgeräte": ["Energieeffizienzklasse", "Leistung", "Fassungsvermögen", "Abmessungen"],
    "Netzwerkgeräte": ["WLAN-Standard", "Netzwerkgeschwindigkeit", "Anschlüsse", "Funktionen"],
    "Werkstattgeräte": ["Spannung", "Leistung", "Drehmoment", "Messbereich", "Anschlüsse"],
    "Sonstige Geräte": ["Technische Daten"]
  };
  const CONDITIONS = ["Schlecht", "Gut", "Sehr gut", "Wie neu"];
  const FUNCTIONS = ["Voll funktionsfähig", "Teilweise funktionsfähig", "Defekt", "Ungetestet"];
  const ORIGINS = ["Originalzubehör", "Drittanbieter"];
  const CABLE_TYPES = ["Stromkabel", "HDMI", "USB-A", "USB-C", "DisplayPort", "Netzwerkkabel", "Proprietäres Anschlusskabel", "Sonstiges"];
  const CONTROLLER_TYPES = ["Originalcontroller", "Drittanbietercontroller", "Gamepad", "Lenkrad", "Joystick", "Fernbedienung", "Tastatur / Maus", "Sonstiges Steuergerät"];
  const ACCESSORY_TYPES = ["Netzteil", "Ladestation", "Adapter", "Standfuß", "Halterung", "Tasche", "Schutzhülle", "Speicherkarte", "Externes Laufwerk", "Akku / Batterie", "Originalverpackung", "Sonstiges Zubehör"];
  const REQUIRED = [
    ["category", "Hauptkategorie"], ["type", "Gerätetyp"], ["manufacturer", "Hersteller"],
    ["model", "Modellreihe"], ["serial", "Seriennummer"], ["inventory", "Inventarnummer"],
    ["location", "Standort"], ["condition", "Optischer Zustand"], ["functionality", "Funktionsfähigkeit"]
  ];
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const html = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
  const safePhoto = (value) => typeof value === "string" && /^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(value) ? value : "";
  const id = () => crypto.randomUUID();
  const isoNow = () => new Date().toISOString();
  let loadWarning = "";
  let database = loadDatabase();
  let currentPhotos = [];
  let editorMode = "create";

  function emptyDatabase() {
    return { devices: [], cables: [], controllers: [], accessories: [], photos: [], checks: [], customCatalog: {}, requiredFields: [] };
  }

  function loadDatabase() {
    try {
      let saved = window.KatalogicDeviceStorage.load();
      if (!saved.devices.length) {
        const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
        if (legacy) {
          const parsedLegacy = JSON.parse(legacy);
          if (Array.isArray(parsedLegacy.devices) && Array.isArray(parsedLegacy.cables) &&
              Array.isArray(parsedLegacy.controllers) && Array.isArray(parsedLegacy.accessories) &&
              Array.isArray(parsedLegacy.photos) && Array.isArray(parsedLegacy.checks)) {
            window.KatalogicDeviceStorage.save(parsedLegacy);
            saved = window.KatalogicDeviceStorage.load();
          }
        }
      }
      const blank = emptyDatabase();
      for (const key of Object.keys(blank)) {
        if (key === "customCatalog") blank[key] = saved[key] && typeof saved[key] === "object" ? saved[key] : {};
        else if (key === "requiredFields") blank[key] = Array.isArray(saved[key]) ? saved[key].filter((field) => REQUIRED.some(([value]) => value === field)) : [];
        else blank[key] = Array.isArray(saved[key]) ? saved[key] : [];
      }
      return blank;
    } catch (error) {
      console.error("Could not load Katalogic device inventory.", error);
      loadWarning = "Gespeicherte Gerätedaten konnten nicht gelesen werden. Bisherige Daten wurden nicht überschrieben.";
      return emptyDatabase();
    }
  }

  function saveDatabase(next) {
    window.KatalogicDeviceStorage.save(next);
    database = next;
  }

  function report(element, message, isError = true) {
    element.textContent = message;
    element.classList.toggle("error", isError);
  }

  function option(value, label = value) {
    return new Option(label, value);
  }

  function addSelectOptions(select, values, placeholder) {
    const previous = select.value;
    select.replaceChildren(option("", placeholder), ...values.map((value) => option(value)), option("__custom__", "＋ Eigenen Eintrag …"));
    if ([...select.options].some((entry) => entry.value === previous)) select.value = previous;
  }

  function setHierarchyValue(selector, value) {
    const select = $(selector);
    if (value && ![...select.options].some((entry) => entry.value === value)) select.add(option(value));
    select.value = value || "";
  }

  function catalogBranch(category, type, manufacturer) {
    return database.customCatalog?.[category]?.[type]?.[manufacturer] || [];
  }

  function allCategories() {
    return [...new Set([...Object.keys(catalog), ...Object.keys(database.customCatalog || {})])].sort((a, b) => a.localeCompare(b, "de"));
  }

  function allTypes(category) {
    return [...new Set([...Object.keys(catalog[category] || {}), ...Object.keys(database.customCatalog?.[category] || {})])].sort((a, b) => a.localeCompare(b, "de"));
  }

  function allManufacturers(category, type) {
    return [...new Set([
      ...Object.keys(catalog[category]?.[type] || {}),
      ...Object.keys(database.customCatalog?.[category]?.[type] || {})
    ])].sort((a, b) => a.localeCompare(b, "de"));
  }

  function allModels(category, type, manufacturer) {
    return [...new Set([
      ...(catalog[category]?.[type]?.[manufacturer] || []),
      ...catalogBranch(category, type, manufacturer)
    ])].sort((a, b) => a.localeCompare(b, "de"));
  }

  function fillHierarchy() {
    addSelectOptions($("#device-category"), allCategories(), "Kategorie auswählen");
    const category = selectedValue("device-category");
    addSelectOptions($("#device-type"), allTypes(category), "Gerätetyp auswählen");
    const type = selectedValue("device-type");
    addSelectOptions($("#device-manufacturer"), allManufacturers(category, type), "Hersteller auswählen");
    const manufacturer = selectedValue("device-manufacturer");
    addSelectOptions($("#device-model"), allModels(category, type, manufacturer), "Modellreihe auswählen");
    updateCustomInputs();
    renderTechnicalFields();
  }

  function updateCustomInputs() {
    for (const input of $$("[data-custom-for]")) {
      const select = $(`#${input.dataset.customFor}`);
      input.classList.toggle("hidden", select.value !== "__custom__");
      if (select.value !== "__custom__") input.value = "";
    }
  }

  function selectedValue(selectId) {
    const select = $(`#${selectId}`);
    if (select.value === "__custom__") return $(`[data-custom-for="${selectId}"]`).value.trim();
    return select.value;
  }

  function preserveTechDraft() {
    for (const input of $$("#device-tech-fields input")) databaseTechDraft[input.dataset.tech] = input.value;
  }

  const databaseTechDraft = {};

  function renderTechnicalFields(values = databaseTechDraft) {
    const category = selectedValue("device-category");
    const container = $("#device-tech-fields");
    if (!container) return;
    container.replaceChildren();
    for (const label of TECH_FIELDS[category] || []) {
      const wrapper = document.createElement("label");
      wrapper.textContent = label;
      const input = document.createElement("input");
      input.dataset.tech = label;
      input.maxLength = 160;
      input.value = values[label] || "";
      input.placeholder = label;
      wrapper.append(input);
      container.append(wrapper);
      databaseTechDraft[label] = input.value;
    }
  }

  function renderCustomTech(values = []) {
    const container = $("#device-custom-tech-list");
    container.replaceChildren();
    for (const entry of values) addTechRow(entry);
  }

  function addTechRow(entry = {}) {
    const row = document.createElement("div");
    row.className = "device-repeat-row device-tech-row";
    row.innerHTML = `<label>Feldname<input data-field="key" maxlength="80" value="${html(entry.key)}" placeholder="z. B. Firmware"></label><label>Wert<input data-field="value" maxlength="200" value="${html(entry.value)}" placeholder="Wert"></label><button class="icon-button device-row-remove" type="button" aria-label="Technisches Feld entfernen">×</button>`;
    $("#device-custom-tech-list").append(row);
  }

  function createChildRow(kind, entry = {}) {
    const specs = {
      cable: {
        target: "#device-cables", title: entry.type || "Kabel",
        fields: [
          ["type", "Kabeltyp", "select", CABLE_TYPES], ["manufacturer", "Hersteller", "text"],
          ["origin", "Herkunft", "select", ORIGINS], ["quantity", "Anzahl", "number"],
          ["condition", "Zustand", "select", CONDITIONS], ["functionality", "Funktionsfähigkeit", "select", FUNCTIONS],
          ["notes", "Notizen", "text"]
        ]
      },
      controller: {
        target: "#device-controllers", title: entry.type || "Steuergerät",
        fields: [
          ["type", "Zubehörtyp", "select", CONTROLLER_TYPES], ["manufacturer", "Hersteller", "text"],
          ["model", "Modell", "text"], ["origin", "Herkunft", "select", ORIGINS],
          ["quantity", "Anzahl", "number"], ["color", "Farbe", "text"],
          ["condition", "Zustand", "select", CONDITIONS], ["functionality", "Funktionsfähigkeit", "select", FUNCTIONS],
          ["serial", "Seriennummer", "text"], ["connection", "Verbindung", "select", ["Kabelgebunden", "Kabellos", "Bluetooth", "Funk", "USB", "Sonstiges"]],
          ["battery", "Akkuzustand", "text"], ["notes", "Notizen", "text"]
        ]
      },
      accessory: {
        target: "#device-accessories", title: entry.name || "Zubehör",
        fields: [
          ["name", "Name", "text"], ["type", "Typ", "select", ACCESSORY_TYPES],
          ["manufacturer", "Hersteller", "text"], ["quantity", "Anzahl", "number"],
          ["condition", "Zustand", "select", CONDITIONS], ["functionality", "Funktionsfähigkeit", "select", FUNCTIONS],
          ["origin", "Herkunft", "select", ORIGINS], ["notes", "Notizen", "text"]
        ]
      }
    };
    const spec = specs[kind];
    const row = document.createElement("div");
    row.className = `device-repeat-row device-${kind}-row`;
    row.dataset.kind = kind;
    if (entry.id) row.dataset.id = entry.id;
    const head = document.createElement("div");
    head.className = "device-repeat-heading";
    head.innerHTML = `<strong>${html(spec.title)}</strong><button class="icon-button device-row-remove" type="button" aria-label="${kind === "accessory" ? "Zubehör" : kind === "cable" ? "Kabel" : "Steuergerät"} entfernen">×</button>`;
    const fields = document.createElement("div");
    fields.className = "device-child-grid";
    for (const [key, label, type, values] of spec.fields) {
      const wrapper = document.createElement("label");
      wrapper.textContent = label;
      let input;
      if (type === "select") {
        input = document.createElement("select");
        input.append(option("", "Bitte auswählen"), ...values.map((value) => option(value)));
      } else {
        input = document.createElement("input");
        input.type = type;
        input.maxLength = 500;
        if (type === "number") {
          input.min = "1";
          input.step = "1";
          input.value = String(entry[key] ?? 1);
        }
      }
      input.dataset.field = key;
      if (type !== "number") input.value = entry[key] || "";
      wrapper.append(input);
      fields.append(wrapper);
    }
    if (kind === "accessory") {
      const linked = document.createElement("label");
      linked.className = "device-accessory-links";
      linked.textContent = "Gerätezuordnung";
      const select = document.createElement("select");
      select.multiple = true;
      select.dataset.field = "deviceIds";
      select.size = Math.min(4, Math.max(2, database.devices.length));
      for (const device of database.devices) {
        const item = option(device.id, `${device.name}${device.isSample ? " (Beispiel)" : ""}`);
        item.selected = (entry.deviceIds || [$("#device-id").value]).includes(device.id);
        select.append(item);
      }
      linked.append(select);
      fields.append(linked);
    }
    row.append(head, fields);
    $(spec.target).append(row);
  }

  function readChildRows(selector) {
    return $$(selector).map((row) => {
      const entry = { id: row.dataset.id || id() };
      for (const input of $$("[data-field]", row)) {
        entry[input.dataset.field] = input.multiple
          ? [...input.selectedOptions].map((item) => item.value)
          : input.type === "number" ? Math.max(1, Number(input.value) || 1) : input.value.trim();
      }
      return entry;
    });
  }

  function paintChildRows(deviceId, duplicate = false) {
    const linked = (rows, predicate) => rows.filter(predicate);
    $("#device-cables").replaceChildren();
    $("#device-controllers").replaceChildren();
    $("#device-accessories").replaceChildren();
    linked(database.cables, (row) => row.deviceId === deviceId).forEach((row) => createChildRow("cable", duplicate ? { ...row, id: id() } : row));
    linked(database.controllers, (row) => row.deviceId === deviceId).forEach((row) => createChildRow("controller", duplicate ? { ...row, id: id() } : row));
    linked(database.accessories, (row) => (row.deviceIds || []).includes(deviceId)).forEach((row) =>
      createChildRow("accessory", duplicate ? { ...row, id: id(), deviceIds: [] } : row)
    );
  }

  function showEditor(mode, device) {
    editorMode = mode;
    $("#device-detail").classList.add("hidden");
    $("#device-editor").classList.remove("hidden");
    $("#device-editor-heading").textContent = mode === "edit" ? "Gerät bearbeiten" : mode === "duplicate" ? "Gerät duplizieren" : "Gerät hinzufügen";
    $("#device-form").reset();
    $("#device-id").value = mode === "edit" && device ? device.id : mode === "duplicate" ? id() : "";
    currentPhotos = device
      ? database.photos.filter((photo) => photo.deviceId === device.id).map((photo) => ({
          ...photo,
          id: mode === "duplicate" ? id() : photo.id,
          deviceId: mode === "duplicate" ? $("#device-id").value : photo.deviceId
        }))
      : [];
    Object.keys(databaseTechDraft).forEach((key) => delete databaseTechDraft[key]);
    const defaults = {
      category: "", type: "", manufacturer: "", model: "", variant: "", serial: "", inventory: "", color: "",
      releaseYear: "", quantity: 1, purchaseDate: "", purchasePrice: "", source: "", estimatedValue: "", location: "", owner: "",
      condition: "Sehr gut", functionality: "Ungetestet", packaging: "", receipt: "", notes: "",
      defects: "", repairs: "", inspectionDate: "", conditionNotes: "", remote: ""
    };
    const data = device || defaults;
    Object.assign(databaseTechDraft, data.technical || {});
    fillHierarchy();
    setHierarchyValue("#device-category", data.category);
    fillHierarchy();
    setHierarchyValue("#device-type", data.type);
    fillHierarchy();
    setHierarchyValue("#device-manufacturer", data.manufacturer);
    fillHierarchy();
    setHierarchyValue("#device-model", data.model);
    $("#device-name").value = mode === "duplicate" ? `${data.name} (Kopie)` : data.name || "";
    $("#device-variant").value = data.variant || "";
    $("#device-serial").value = mode === "duplicate" ? "" : data.serial || "";
    $("#device-inventory").value = mode === "duplicate" ? "" : data.inventory || "";
    $("#device-color").value = data.color || "";
    $("#device-release-year").value = data.releaseYear || "";
    $("#device-quantity").value = data.quantity || 1;
    $("#device-purchase-date").value = data.purchaseDate || "";
    $("#device-purchase-price").value = data.purchasePrice ?? "";
    $("#device-source").value = data.source || "";
    $("#device-estimated-value").value = data.estimatedValue ?? "";
    $("#device-location").value = data.location || "";
    $("#device-owner").value = data.owner || "";
    $("#device-condition").value = data.condition || "Sehr gut";
    $("#device-function").value = data.functionality || "Ungetestet";
    $("#device-packaging").value = data.packaging || "";
    $("#device-receipt").value = data.receipt || "";
    $("#device-notes").value = data.notes || "";
    const latestCheck = device ? database.checks.filter((check) => check.deviceId === device.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] : null;
    $("#device-defects").value = latestCheck?.defects || "";
    $("#device-repairs").value = latestCheck?.repairs || "";
    $("#device-inspection-date").value = latestCheck?.inspectionDate || "";
    $("#device-condition-notes").value = latestCheck?.notes || "";
    $("#device-remote").value = data.remote || "";
    renderTechnicalFields(data.technical || {});
    renderCustomTech(data.customTechnical || []);
    $("#device-photo-gallery").replaceChildren();
    renderPhotoGallery();
    paintChildRows(mode !== "create" && device ? device.id : "", mode === "duplicate");
    report($("#device-form-message"), "", false);
    updateRequiredMarkers();
    $("#device-editor").scrollIntoView({ behavior: "smooth", block: "start" });
    $("#device-name").focus({ preventScroll: true });
  }

  function updateRequiredMarkers() {
    for (const [field, label] of REQUIRED) {
      const input = $(`#device-${field === "functionality" ? "function" : field}`);
      if (input) input.required = database.requiredFields.includes(field);
      const wrapper = input?.closest("label");
      if (wrapper) wrapper.dataset.required = String(input.required);
    }
  }

  function renderPhotoGallery() {
    const gallery = $("#device-photo-gallery");
    gallery.replaceChildren();
    if (!currentPhotos.length) {
      const empty = document.createElement("p");
      empty.className = "device-empty-hint";
      empty.textContent = "Noch keine Gerätfotos hinzugefügt.";
      gallery.append(empty);
      return;
    }
    currentPhotos.forEach((photo, index) => {
      const card = document.createElement("figure");
      card.className = "device-photo";
      const image = document.createElement("img");
      image.src = safePhoto(photo.dataUrl);
      image.alt = photo.kind;
      const caption = document.createElement("figcaption");
      caption.textContent = photo.kind;
      const remove = document.createElement("button");
      remove.className = "icon-button";
      remove.type = "button";
      remove.dataset.removePhoto = String(index);
      remove.setAttribute("aria-label", "Foto entfernen");
      remove.textContent = "×";
      card.append(image, caption, remove);
      gallery.append(card);
    });
  }

  async function resizePhoto(file) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error(`${file.name}: Bitte JPEG, PNG oder WebP verwenden.`);
    if (file.size > 12 * 1024 * 1024) throw new Error(`${file.name}: Das Foto darf höchstens 12 MB groß sein.`);
    const bitmap = await createImageBitmap(file);
    try {
      let scale = Math.min(1, 1400 / Math.max(bitmap.width, bitmap.height));
      let quality = 0.82;
      for (let attempt = 0; attempt < 10; attempt += 1) {
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(bitmap.width * scale));
        canvas.height = Math.max(1, Math.round(bitmap.height * scale));
        canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
        if (!blob) throw new Error(`${file.name}: Foto konnte nicht verarbeitet werden.`);
        if (blob.size <= PHOTO_MAX_SIZE) {
          return await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.addEventListener("load", () => resolve(reader.result), { once: true });
            reader.addEventListener("error", () => reject(new Error(`${file.name}: Foto konnte nicht gelesen werden.`)), { once: true });
            reader.readAsDataURL(blob);
          });
        }
        if (quality > 0.5) quality -= 0.08;
        else scale *= 0.75;
      }
      throw new Error(`${file.name}: Foto konnte nicht ausreichend verkleinert werden.`);
    } finally {
      bitmap.close();
    }
  }

  function getChildRows(selector, kind, deviceId) {
    return readChildRows(selector).map((row) => {
      if (kind !== "accessory") return { ...row, deviceId };
      const original = database.accessories.find((entry) => entry.id === row.id);
      const selectedIds = row.deviceIds.filter(Boolean);
      if (!selectedIds.includes(deviceId)) selectedIds.push(deviceId);
      const retainedIds = (original?.deviceIds || []).filter((linkedId) => linkedId !== deviceId && database.devices.some((entry) => entry.id === linkedId));
      return { ...row, deviceIds: [...new Set([...selectedIds, ...retainedIds])] };
    });
  }

  function collectDevice() {
    const technical = { ...databaseTechDraft };
    for (const input of $$("#device-tech-fields input")) {
      if (input.value.trim()) technical[input.dataset.tech] = input.value.trim();
      else delete technical[input.dataset.tech];
    }
    const customTechnical = $$("#device-custom-tech-list .device-tech-row").map((row) => ({
      key: $("[data-field='key']", row).value.trim(),
      value: $("[data-field='value']", row).value.trim()
    })).filter((entry) => entry.key && entry.value);
    return {
      id: $("#device-id").value || id(),
      name: $("#device-name").value.trim(),
      category: selectedValue("device-category"),
      type: selectedValue("device-type"),
      manufacturer: selectedValue("device-manufacturer"),
      model: selectedValue("device-model"),
      variant: $("#device-variant").value.trim(),
      serial: $("#device-serial").value.trim(),
      inventory: $("#device-inventory").value.trim(),
      color: $("#device-color").value.trim(),
      releaseYear: $("#device-release-year").value.trim(),
      quantity: Math.max(1, Number($("#device-quantity").value) || 1),
      purchaseDate: $("#device-purchase-date").value,
      purchasePrice: $("#device-purchase-price").value === "" ? null : Number($("#device-purchase-price").value),
      source: $("#device-source").value.trim(),
      estimatedValue: $("#device-estimated-value").value === "" ? null : Number($("#device-estimated-value").value),
      location: $("#device-location").value.trim(),
      owner: $("#device-owner").value.trim(),
      condition: $("#device-condition").value,
      functionality: $("#device-function").value,
      packaging: $("#device-packaging").value,
      receipt: $("#device-receipt").value,
      notes: $("#device-notes").value.trim(),
      remote: $("#device-remote").value,
      technical,
      customTechnical,
      isSample: false,
      updatedAt: isoNow()
    };
  }

  function addCatalogValue(next, device) {
    const { category, type, manufacturer, model } = device;
    if (!category || !type || !manufacturer || !model) return;
    if ([category, type, manufacturer, model].some((value) => ["__proto__", "constructor", "prototype"].includes(value.toLocaleLowerCase("en")))) return;
    next.customCatalog[category] ||= {};
    next.customCatalog[category][type] ||= {};
    next.customCatalog[category][type][manufacturer] ||= [];
    const knownModels = [...(catalog[category]?.[type]?.[manufacturer] || []), ...next.customCatalog[category][type][manufacturer]];
    if (!knownModels.includes(model)) next.customCatalog[category][type][manufacturer].push(model);
  }

  function submitDevice(event) {
    event.preventDefault();
    const form = $("#device-form");
    if (!form.reportValidity()) return;
    const device = collectDevice();
    if (!device.name) return report($("#device-form-message"), "Bitte gib einen Gerätenamen ein.");
    if ($("#device-category").value === "__custom__" && !device.category) return report($("#device-form-message"), "Bitte gib eine eigene Hauptkategorie ein.");
    if (database.requiredFields.some((field) => !String(device[field] ?? "").trim())) {
      const missing = REQUIRED.find(([field]) => database.requiredFields.includes(field) && !String(device[field] ?? "").trim());
      return report($("#device-form-message"), `Bitte fülle das Pflichtfeld „${missing?.[1] || "Angabe"}“ aus.`);
    }
    const existing = database.devices.find((item) => item.id === device.id);
    const next = structuredClone(database);
    const index = next.devices.findIndex((item) => item.id === device.id);
    if (index >= 0) next.devices[index] = device;
    else next.devices.push(device);
    addCatalogValue(next, device);
    next.cables = next.cables.filter((item) => item.deviceId !== device.id);
    next.controllers = next.controllers.filter((item) => item.deviceId !== device.id);
    next.accessories = next.accessories.map((item) => ({ ...item, deviceIds: (item.deviceIds || []).filter((linkedId) => linkedId !== device.id) })).filter((item) => item.deviceIds.length);
    const cables = getChildRows("#device-cables .device-cable-row", "cable", device.id);
    const controllers = getChildRows("#device-controllers .device-controller-row", "controller", device.id);
    const accessories = getChildRows("#device-accessories .device-accessory-row", "accessory", device.id);
    next.cables.push(...cables);
    next.controllers.push(...controllers);
    for (const accessory of accessories) {
      const duplicate = next.accessories.findIndex((item) => item.id === accessory.id);
      if (duplicate >= 0) next.accessories[duplicate] = accessory;
      else next.accessories.push(accessory);
    }
    next.photos = next.photos.filter((photo) => photo.deviceId !== device.id);
    next.photos.push(...currentPhotos.map((photo) => ({ ...photo, deviceId: device.id })));
    const check = {
      id: id(), deviceId: device.id, defects: $("#device-defects").value.trim(),
      repairs: $("#device-repairs").value.trim(), inspectionDate: $("#device-inspection-date").value,
      notes: $("#device-condition-notes").value.trim(), createdAt: isoNow()
    };
    if (check.defects || check.repairs || check.inspectionDate || check.notes) {
      const latest = next.checks.filter((row) => row.deviceId === device.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
      if (!latest || ["defects", "repairs", "inspectionDate", "notes"].some((key) => latest[key] !== check[key])) next.checks.push(check);
    }
    try {
      saveDatabase(next);
    } catch (error) {
      console.error("Could not save device.", error);
      return report($("#device-form-message"), "Gerät konnte nicht gespeichert werden. Prüfe den verfügbaren Gerätespeicher.");
    }
    $("#device-editor").classList.add("hidden");
    report($("#device-result-count"), existing ? "Gerät aktualisiert." : editorMode === "duplicate" ? "Gerät wurde als eigener Datensatz dupliziert." : "Gerät gespeichert.", false);
    renderDevices();
  }

  function renderFilters() {
    const setup = (selector, values, label) => {
      const select = $(selector);
      const old = select.value;
      select.replaceChildren(option("", label), ...values.map((value) => option(value)));
      if (values.includes(old)) select.value = old;
    };
    setup("#device-filter-category", [...new Set(database.devices.map((row) => row.category).filter(Boolean))].sort(), "Alle Kategorien");
    setup("#device-filter-type", [...new Set(database.devices.map((row) => row.type).filter(Boolean))].sort(), "Alle Gerätetypen");
    setup("#device-filter-condition", CONDITIONS, "Alle Zustände");
    setup("#device-filter-function", FUNCTIONS, "Alle Funktionsstände");
  }

  function deviceHasAccessory(deviceId) {
    return database.cables.some((item) => item.deviceId === deviceId) ||
      database.controllers.some((item) => item.deviceId === deviceId) ||
      database.accessories.some((item) => (item.deviceIds || []).includes(deviceId));
  }

  function passesFilters(device) {
    const query = $("#device-query").value.trim().toLocaleLowerCase("de");
    const searchable = [
      device.name, device.inventory, device.serial, device.category, device.type, device.manufacturer,
      device.model, device.variant, device.location, device.owner, device.notes, device.source,
      device.releaseYear, device.condition, device.functionality, ...Object.values(device.technical || {}),
      ...(device.customTechnical || []).flatMap((row) => [row.key, row.value])
    ].join(" ").toLocaleLowerCase("de");
    if (query && !searchable.includes(query)) return false;
    if ($("#device-filter-category").value && device.category !== $("#device-filter-category").value) return false;
    if ($("#device-filter-type").value && device.type !== $("#device-filter-type").value) return false;
    if ($("#device-filter-condition").value && device.condition !== $("#device-filter-condition").value) return false;
    if ($("#device-filter-function").value && device.functionality !== $("#device-filter-function").value) return false;
    if ($("#device-filter-location").value && !device.location?.toLocaleLowerCase("de").includes($("#device-filter-location").value.toLocaleLowerCase("de"))) return false;
    if ($("#device-filter-accessory").value === "yes" && !deviceHasAccessory(device.id)) return false;
    if ($("#device-filter-accessory").value === "no" && deviceHasAccessory(device.id)) return false;
    const origin = $("#device-filter-origin").value;
    if (origin) {
      const linked = [...database.cables.filter((row) => row.deviceId === device.id), ...database.controllers.filter((row) => row.deviceId === device.id), ...database.accessories.filter((row) => (row.deviceIds || []).includes(device.id))];
      if (!linked.some((row) => row.origin === (origin === "original" ? "Originalzubehör" : "Drittanbieter"))) return false;
    }
    const minPrice = $("#device-filter-price-min").value;
    const maxPrice = $("#device-filter-price-max").value;
    if (minPrice !== "" && (device.purchasePrice == null || device.purchasePrice < Number(minPrice))) return false;
    if (maxPrice !== "" && (device.purchasePrice == null || device.purchasePrice > Number(maxPrice))) return false;
    const from = $("#device-filter-date-min").value;
    const to = $("#device-filter-date-max").value;
    if (from && (!device.purchaseDate || device.purchaseDate < from)) return false;
    if (to && (!device.purchaseDate || device.purchaseDate > to)) return false;
    return true;
  }

  function sortedDevices() {
    const sortKey = $("#device-sort").value;
    const direction = $("#device-sort-direction").value === "desc" ? -1 : 1;
    const conditionOrder = ["Schlecht", "Gut", "Sehr gut", "Wie neu"];
    return database.devices.filter(passesFilters).sort((a, b) => {
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

  function renderDevices() {
    renderFilters();
    const container = $("#device-cards");
    container.replaceChildren();
    const records = sortedDevices();
    $("#device-result-count").textContent = `${records.length} von ${database.devices.length} Geräten`;
    for (const device of records) {
      const card = document.createElement("article");
      card.className = "device-card";
      const photo = database.photos.find((item) => item.deviceId === device.id && safePhoto(item.dataUrl));
      const image = photo ? `<img src="${safePhoto(photo.dataUrl)}" alt="${html(device.name)}">` : `<div class="device-card-placeholder" aria-hidden="true">▣</div>`;
      const sample = device.isSample ? `<span class="device-sample-badge">BEISPIEL</span>` : "";
      card.innerHTML = `${image}<div class="device-card-content"><div class="device-card-title"><div><h3>${html(device.name)}</h3><p>${html([device.manufacturer, device.model, device.variant, device.releaseYear].filter(Boolean).join(" · ") || "Hersteller / Modell nicht angegeben")}</p></div>${sample}</div><div class="device-card-meta"><span>${html([device.category, device.type].filter(Boolean).join(" · ") || "Kategorie offen")}</span><span>${html(device.condition || "Zustand offen")} · ${html(device.functionality || "Ungetestet")}</span><span>${html(device.location || "Kein Standort")}</span><span>Anzahl: ${html(device.quantity || 1)}</span>${device.estimatedValue != null ? `<span>Wert: ${html(money(device.estimatedValue))}</span>` : ""}</div><div class="device-card-actions"><button class="button button-secondary" data-action="view" data-id="${html(device.id)}" type="button">Details</button><button class="icon-button" data-action="edit" data-id="${html(device.id)}" type="button" aria-label="Gerät bearbeiten">✎</button><button class="icon-button" data-action="duplicate" data-id="${html(device.id)}" type="button" aria-label="Gerät duplizieren">⧉</button><button class="icon-button" data-action="delete" data-id="${html(device.id)}" type="button" aria-label="Gerät löschen">×</button></div></div>`;
      container.append(card);
    }
    if (!records.length) {
      const empty = document.createElement("div");
      empty.className = "device-empty-state";
      empty.innerHTML = `<span aria-hidden="true">▣</span><h3>${database.devices.length ? "Keine passenden Geräte" : "Noch keine Geräte erfasst"}</h3><p>${database.devices.length ? "Passe deine Suche oder Filter an." : "Lege dein erstes Gerät an oder lade klar gekennzeichnete Beispieldaten."}</p>`;
      container.append(empty);
    }
  }

  function money(value) {
    return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(Number(value) || 0);
  }

  function detailRow(label, value) {
    return value === undefined || value === null || value === "" ? "" : `<div class="device-detail-row"><dt>${html(label)}</dt><dd>${html(value)}</dd></div>`;
  }

  function detailSection(title, rows) {
    const content = rows.filter(Boolean).join("");
    return content ? `<section class="device-detail-section"><h4>${html(title)}</h4><dl>${content}</dl></section>` : "";
  }

  function renderDetail(deviceId) {
    const device = database.devices.find((row) => row.id === deviceId);
    if (!device) return;
    const photos = database.photos.filter((row) => row.deviceId === deviceId && safePhoto(row.dataUrl));
    const photoMarkup = photos.map((photo) => `<figure><img src="${safePhoto(photo.dataUrl)}" alt="${html(photo.kind)}"><figcaption>${html(photo.kind)}</figcaption></figure>`).join("");
    const technical = Object.entries(device.technical || {}).map(([key, value]) => detailRow(key, value));
    for (const entry of device.customTechnical || []) technical.push(detailRow(entry.key, entry.value));
    const checkRows = database.checks.filter((row) => row.deviceId === deviceId).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((row) => `<article class="device-check-entry">${detailRow("Prüfdatum", row.inspectionDate)}${detailRow("Mängel", row.defects)}${detailRow("Reparaturen", row.repairs)}${detailRow("Besonderheiten", row.notes)}</article>`).join("");
      const cables = database.cables.filter((row) => row.deviceId === deviceId);
    const controllers = database.controllers.filter((row) => row.deviceId === deviceId);
    const accessories = database.accessories.filter((row) => (row.deviceIds || []).includes(deviceId));
    const actions = `<button class="button button-primary" data-detail-action="edit" data-id="${html(device.id)}" type="button">Bearbeiten</button><button class="button button-secondary" data-detail-action="duplicate" data-id="${html(device.id)}" type="button">Duplizieren</button><button class="button button-secondary" data-detail-action="delete" data-id="${html(device.id)}" type="button">Löschen</button><button class="button button-quiet" data-detail-action="close" type="button">Schließen</button>`;
    $("#device-detail").innerHTML = `<div class="device-detail-heading"><div><p class="eyebrow">GERÄTEDETAILS${device.isSample ? " · BEISPIEL" : ""}</p><h3 id="device-detail-heading">${html(device.name)}</h3><p class="muted">${html([device.category, device.type, device.manufacturer, device.model, device.variant].filter(Boolean).join(" · "))}</p></div><div class="button-row">${actions}</div></div>${photoMarkup ? `<div class="device-detail-gallery">${photoMarkup}</div>` : ""}<div class="device-detail-grid">${detailSection("Grunddaten", [detailRow("Geräte-ID", device.id), detailRow("Inventarnummer", device.inventory), detailRow("Seriennummer", device.serial), detailRow("Farbe", device.color), detailRow("Erscheinungsjahr", device.releaseYear), detailRow("Anzahl eigenständiger Geräte", device.quantity), detailRow("Besitzer / Zuordnung", device.owner), detailRow("Standort", device.location), detailRow("Optischer Zustand", device.condition), detailRow("Funktionsfähigkeit", device.functionality), detailRow("Originalverpackung", device.packaging), detailRow("Kaufbeleg", device.receipt)])}${detailSection("Kauf & Wert", [detailRow("Kaufdatum", device.purchaseDate), detailRow("Kaufpreis", device.purchasePrice == null ? "" : money(device.purchasePrice)), detailRow("Bezugsquelle", device.source), detailRow("Wertschätzung", device.estimatedValue == null ? "" : money(device.estimatedValue))])}${detailSection("Technische Daten", technical)}${detailSection("Notizen", [detailRow("Notizen", device.notes)])}${detailSection("Kabel & Stromversorgung", cables.map((row) => detailRow(row.type, [row.manufacturer, row.origin, `Anzahl: ${row.quantity}`, row.condition, row.functionality, row.notes].filter(Boolean).join(" · "))))}${detailSection("Controller & Steuergeräte", controllers.map((row) => detailRow(row.type, [row.manufacturer, row.model, row.origin, `Anzahl: ${row.quantity}`, row.color, row.condition, row.functionality, row.connection, row.battery, row.serial, row.notes].filter(Boolean).join(" · "))).concat(detailRow("Fernbedienung vorhanden", device.remote)))}${detailSection("Weiteres Zubehör", accessories.map((row) => detailRow(row.name || row.type, [row.type, row.manufacturer, row.origin, `Anzahl: ${row.quantity}`, row.condition, row.functionality, row.notes].filter(Boolean).join(" · "))))}${checkRows ? `<section class="device-detail-section"><h4>Prüfungen & Reparaturen</h4>${checkRows}</section>` : ""}</div>`;
    $("#device-detail").classList.remove("hidden");
    $("#device-detail").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function addSamples() {
    if (database.devices.some((device) => device.isSample)) {
      report($("#device-result-count"), "Beispieldaten sind bereits vorhanden.", false);
      return;
    }
    const samples = [
      { id: id(), name: "Wohnzimmer-Konsole", category: "Konsolen", type: "Heimkonsole", manufacturer: "Sony", model: "PlayStation 5", variant: "Slim / Digital Edition", serial: "BEISPIEL-PS5", inventory: "DEMO-001", color: "Weiß", quantity: 1, purchaseDate: "", purchasePrice: 449, source: "Beispielhändler", estimatedValue: 350, location: "Wohnzimmer", owner: "Beispiel", condition: "Sehr gut", functionality: "Voll funktionsfähig", packaging: "Ja", receipt: "Ja", notes: "Gekennzeichnete Beispieldaten.", technical: { Generation: "9. Generation", Speicherkapazität: "1 TB", Laufwerk: "Digital" }, customTechnical: [], isSample: true, updatedAt: isoNow() },
      { id: id(), name: "Arbeitslaptop", category: "Computer", type: "Laptop", manufacturer: "Lenovo", model: "ThinkPad", variant: "T14", serial: "BEISPIEL-LAPTOP", inventory: "DEMO-002", color: "Schwarz", quantity: 1, purchaseDate: "", purchasePrice: 1199, source: "", estimatedValue: 700, location: "Büro", owner: "Beispiel", condition: "Gut", functionality: "Voll funktionsfähig", packaging: "Nein", receipt: "", notes: "Gekennzeichnete Beispieldaten.", technical: { Prozessor: "Beispielprozessor", Arbeitsspeicher: "32 GB", Betriebssystem: "Beispiel-OS" }, customTechnical: [], isSample: true, updatedAt: isoNow() },
      { id: id(), name: "Kompaktkamera", category: "Foto und Video", type: "Kamera", manufacturer: "Sony", model: "Alpha 6000", variant: "Beispielausführung", serial: "", inventory: "DEMO-003", color: "Silber", quantity: 1, purchaseDate: "", purchasePrice: 599, source: "", estimatedValue: 250, location: "Schrank", owner: "Beispiel", condition: "Wie neu", functionality: "Ungetestet", packaging: "", receipt: "", notes: "Gekennzeichnete Beispieldaten.", technical: { Sensor: "APS-C", Auflösung: "24 MP" }, customTechnical: [], isSample: true, updatedAt: isoNow() }
    ];
    const next = structuredClone(database);
    next.devices.push(...samples);
    next.cables.push({ id: id(), deviceId: samples[0].id, type: "Stromkabel", manufacturer: "Beispiel", origin: "Originalzubehör", quantity: 1, condition: "Sehr gut", functionality: "Voll funktionsfähig", notes: "Beispielkabel." });
    next.controllers.push({ id: id(), deviceId: samples[0].id, type: "Originalcontroller", manufacturer: "Sony", model: "DualSense", origin: "Originalzubehör", quantity: 1, color: "Weiß", condition: "Sehr gut", functionality: "Voll funktionsfähig", connection: "Kabellos", battery: "", serial: "", notes: "Beispielzubehör." });
    next.accessories.push({ id: id(), deviceIds: [samples[1].id], name: "USB-C-Netzteil", type: "Netzteil", manufacturer: "Beispiel", quantity: 1, condition: "Gut", functionality: "Voll funktionsfähig", origin: "Drittanbieter", notes: "Gekennzeichnetes Beispielzubehör." });
    try {
      saveDatabase(next);
      renderDevices();
      report($("#device-result-count"), "Drei gekennzeichnete Beispieldatensätze geladen.", false);
    } catch (error) {
      console.error("Could not add sample device records.", error);
      report($("#device-result-count"), "Beispieldaten konnten nicht gespeichert werden.");
    }
  }

  function duplicateDevice(device) {
    const next = structuredClone(database);
    const copy = structuredClone(device);
    const oldId = copy.id;
    copy.id = id();
    copy.name = `${copy.name} (Kopie)`;
    copy.serial = "";
    copy.inventory = "";
    copy.isSample = false;
    copy.updatedAt = isoNow();
    next.devices.push(copy);
    for (const table of ["photos", "cables", "controllers", "checks"]) {
      const rows = database[table].filter((row) => row.deviceId === oldId).map((row) => ({ ...structuredClone(row), id: id(), deviceId: copy.id }));
      next[table].push(...rows);
    }
    for (const item of database.accessories.filter((row) => (row.deviceIds || []).includes(oldId))) {
      next.accessories.push({ ...structuredClone(item), id: id(), deviceIds: [copy.id] });
    }
    try {
      saveDatabase(next);
      renderDevices();
      renderDetail(copy.id);
      report($("#device-result-count"), "Gerät mit eigenem Datensatz dupliziert.", false);
    } catch (error) {
      console.error("Could not duplicate device.", error);
      report($("#device-result-count"), "Duplizieren fehlgeschlagen. Prüfe den verfügbaren Gerätespeicher.");
    }
  }

  function deleteDevice(device) {
    if (!window.confirm(`„${device.name}“ und alle zugehörigen Gerätedaten endgültig löschen?`)) return;
    const next = structuredClone(database);
    next.devices = next.devices.filter((row) => row.id !== device.id);
    for (const table of ["photos", "cables", "controllers", "checks"]) next[table] = next[table].filter((row) => row.deviceId !== device.id);
    next.accessories = next.accessories.map((row) => ({ ...row, deviceIds: (row.deviceIds || []).filter((linkedId) => linkedId !== device.id) })).filter((row) => row.deviceIds.length);
    try {
      saveDatabase(next);
      $("#device-detail").classList.add("hidden");
      renderDevices();
      report($("#device-result-count"), "Gerät und ausschließlich zugeordnete Daten gelöscht.", false);
    } catch (error) {
      console.error("Could not delete device.", error);
      report($("#device-result-count"), "Löschen fehlgeschlagen. Die Gerätedaten wurden nicht geändert.");
    }
  }

  function renderRequiredFields() {
    const container = $("#device-required-fields");
    container.replaceChildren();
    for (const [field, label] of REQUIRED) {
      const wrapper = document.createElement("label");
      wrapper.className = "device-required-option";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.checked = database.requiredFields.includes(field);
      input.dataset.requiredField = field;
      const text = document.createElement("span");
      text.textContent = label;
      wrapper.append(input, text);
      container.append(wrapper);
    }
  }

  function clearFilters() {
    for (const selector of ["#device-query", "#device-filter-location", "#device-filter-price-min", "#device-filter-price-max", "#device-filter-date-min", "#device-filter-date-max"]) $(selector).value = "";
    for (const selector of ["#device-filter-category", "#device-filter-type", "#device-filter-condition", "#device-filter-function", "#device-filter-accessory", "#device-filter-origin"]) $(selector).value = "";
    $("#device-sort").value = "name";
    $("#device-sort-direction").value = "asc";
    renderDevices();
  }

  $("#device-category").addEventListener("change", () => {
    preserveTechDraft();
    fillHierarchy();
  });
  for (const selector of ["#device-type", "#device-manufacturer", "#device-model"]) {
    $(selector).addEventListener("change", fillHierarchy);
  }
  $("#device-add-tech").addEventListener("click", () => addTechRow());
  $("#device-add-cable").addEventListener("click", () => createChildRow("cable"));
  $("#device-add-controller").addEventListener("click", () => createChildRow("controller"));
  $("#device-add-accessory").addEventListener("click", () => createChildRow("accessory"));
  $("#device-form").addEventListener("submit", submitDevice);
  $("#device-form").addEventListener("input", (event) => {
    if (event.target.matches("[data-custom-for]")) fillHierarchy();
  });
  $("#device-create").addEventListener("click", () => showEditor("create"));
  $("#device-editor-close").addEventListener("click", () => $("#device-editor").classList.add("hidden"));
  $("#device-editor-cancel").addEventListener("click", () => $("#device-editor").classList.add("hidden"));
  $("#device-samples").addEventListener("click", addSamples);
  $("#device-clear-filters").addEventListener("click", clearFilters);
  $("#device-photos-input").addEventListener("change", async (event) => {
    const files = [...event.target.files];
    event.target.value = "";
    window.updateLocalizedFileInput?.(event.target);
    const remaining = PHOTO_LIMIT - currentPhotos.length;
    if (files.length > remaining) report($("#device-form-message"), `Es sind maximal ${PHOTO_LIMIT} Fotos je Gerät möglich. Es werden nur ${remaining} weitere verarbeitet.`, false);
    try {
      for (const file of files.slice(0, remaining)) {
        const dataUrl = await resizePhoto(file);
        currentPhotos.push({ id: id(), deviceId: $("#device-id").value, kind: $("#device-photo-kind").value, dataUrl, createdAt: isoNow() });
      }
      renderPhotoGallery();
    } catch (error) {
      console.error("Could not add device photo.", error);
      report($("#device-form-message"), error.message);
    }
  });
  $("#device-photo-gallery").addEventListener("click", (event) => {
    const button = event.target.closest("[data-remove-photo]");
    if (!button) return;
    currentPhotos.splice(Number(button.dataset.removePhoto), 1);
    renderPhotoGallery();
  });
  $("#device-custom-tech-list").addEventListener("click", (event) => {
    if (event.target.closest(".device-row-remove")) event.target.closest(".device-tech-row").remove();
  });
  for (const selector of ["#device-cables", "#device-controllers", "#device-accessories"]) {
    $(selector).addEventListener("click", (event) => {
      if (event.target.closest(".device-row-remove")) event.target.closest(".device-repeat-row").remove();
    });
  }
  $("#device-cards").addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const device = database.devices.find((row) => row.id === button.dataset.id);
    if (!device) return;
    if (button.dataset.action === "view") renderDetail(device.id);
    if (button.dataset.action === "edit") showEditor("edit", device);
    if (button.dataset.action === "duplicate") showEditor("duplicate", device);
    if (button.dataset.action === "delete") deleteDevice(device);
  });
  $("#device-detail").addEventListener("click", (event) => {
    const button = event.target.closest("[data-detail-action]");
    if (!button) return;
    const device = database.devices.find((row) => row.id === button.dataset.id);
    if (button.dataset.detailAction === "close") $("#device-detail").classList.add("hidden");
    if (!device) return;
    if (button.dataset.detailAction === "edit") showEditor("edit", device);
    if (button.dataset.detailAction === "duplicate") showEditor("duplicate", device);
    if (button.dataset.detailAction === "delete") deleteDevice(device);
  });
  $("#library-search-results").addEventListener("click", (event) => {
    const button = event.target.closest("[data-open-device]");
    if (!button) return;
    const device = database.devices.find((row) => row.id === button.dataset.openDevice);
    if (!device) return;
    $('[data-view="devices"]').click();
    renderDetail(device.id);
  });
  $("#device-required-fields").addEventListener("change", (event) => {
    if (!event.target.matches("[data-required-field]")) return;
    const next = structuredClone(database);
    const field = event.target.dataset.requiredField;
    next.requiredFields = event.target.checked
      ? [...new Set([...next.requiredFields, field])]
      : next.requiredFields.filter((value) => value !== field);
    try {
      saveDatabase(next);
      updateRequiredMarkers();
    } catch (error) {
      console.error("Could not save required device fields.", error);
      event.target.checked = !event.target.checked;
      report($("#device-result-count"), "Pflichtfeld-Einstellung konnte nicht gespeichert werden.");
    }
  });
  window.addEventListener("katalogic:device-inventory-imported", () => {
    try {
      database = loadDatabase();
      currentPhotos = [];
      $("#device-editor").classList.add("hidden");
      $("#device-detail").classList.add("hidden");
      renderRequiredFields();
      renderDevices();
    } catch (error) {
      console.error("Could not refresh imported device inventory.", error);
      report($("#device-result-count"), "Importierte Gerätedaten konnten nicht angezeigt werden.");
    }
  });
  for (const selector of [
    "#device-query", "#device-filter-category", "#device-filter-type", "#device-filter-condition", "#device-filter-function",
    "#device-filter-accessory", "#device-filter-origin", "#device-filter-location", "#device-filter-price-min",
    "#device-filter-price-max", "#device-filter-date-min", "#device-filter-date-max", "#device-sort", "#device-sort-direction"
  ]) $(selector).addEventListener("input", renderDevices);
  $("#device-filter-category").addEventListener("change", renderDevices);
  $("#device-filter-type").addEventListener("change", renderDevices);

  renderRequiredFields();
  renderDevices();
  if (loadWarning) report($("#device-result-count"), loadWarning);
})();
