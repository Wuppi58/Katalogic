(() => {
  function update(input) {
    const status = input.nextElementSibling?.querySelector(".localized-file-name");
    if (!status) return;
    const files = [...input.files];
    status.textContent = files.length === 0
      ? "Keine Datei ausgewählt"
      : files.length === 1 ? files[0].name : `${files.length} Dateien ausgewählt`;
  }

  window.updateLocalizedFileInput = update;

  document.querySelectorAll('input[type="file"]:not(.hidden)').forEach((input, index) => {
    const id = input.id || `localized-file-input-${index + 1}`;
    input.id = id;
    input.classList.add("localized-file-input");

    const picker = document.createElement("span");
    picker.className = "localized-file-picker";

    const button = document.createElement("span");
    button.className = "button button-secondary localized-file-button";
    button.textContent = "Datei auswählen";

    const name = document.createElement("span");
    name.className = "localized-file-name";
    name.id = `${id}-status`;
    name.setAttribute("aria-live", "polite");

    picker.append(button, name);
    input.after(picker);
    input.setAttribute("aria-describedby", [input.getAttribute("aria-describedby"), name.id].filter(Boolean).join(" "));
    update(input);

    input.addEventListener("change", () => update(input));
    input.form?.addEventListener("reset", () => setTimeout(() => update(input), 0));
  });
})();
