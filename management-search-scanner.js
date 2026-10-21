(() => {
  let currentScanner = null;
  const supportedFormats = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "qr_code", "data_matrix"];

  function setMessage(message, text, isError = false) {
    message.textContent = text;
    message.classList.toggle("error", isError);
  }

  async function stopScanner(scanner, hidePanel = true) {
    scanner.running = false;
    if (scanner.stream) {
      scanner.stream.getTracks().forEach((track) => track.stop());
      scanner.stream = null;
    }
    scanner.video.srcObject = null;
    if (hidePanel) scanner.panel.classList.add("hidden");
    if (currentScanner === scanner) currentScanner = null;
  }

  async function startScanner(button) {
    if (currentScanner) await stopScanner(currentScanner);

    const input = document.getElementById(button.dataset.searchScanner);
    const panel = [...document.querySelectorAll("[data-search-scanner-panel]")]
      .find((element) => element.dataset.searchScannerPanel === input?.id);
    if (!input || !panel) throw new Error("Suchfeld oder Scannerfenster wurde nicht gefunden.");

    const video = panel.querySelector("video");
    const message = panel.querySelector(".form-message");
    const scanner = { input, panel, video, message, stream: null, running: true };
    currentScanner = scanner;
    panel.classList.remove("hidden");

    if (!("BarcodeDetector" in window) || !navigator.mediaDevices?.getUserMedia) {
      setMessage(message, "Dieser Browser unterstützt keinen Kamera-Barcode-Scanner. Gib den Barcode ins Suchfeld ein oder nutze einen USB-/Bluetooth-Scanner.");
      scanner.running = false;
      currentScanner = null;
      return;
    }

    try {
      const formats = (await BarcodeDetector.getSupportedFormats()).filter((format) => supportedFormats.includes(format));
      if (!formats.length) throw new Error("Dieser Browser unterstützt kein geeignetes Barcodeformat.");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false
      });
      if (!scanner.running) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      scanner.stream = stream;
      video.srcObject = stream;
      await video.play();
      const detector = new BarcodeDetector({ formats });
      setMessage(message, "Halte den Barcode in den Kamerarahmen …", false);

      while (scanner.running && scanner.stream) {
        const hits = await detector.detect(video);
        if (!scanner.running || !scanner.stream) return;
        if (hits[0]?.rawValue) {
          input.value = hits[0].rawValue;
          input.dispatchEvent(new Event("input", { bubbles: true }));
          await stopScanner(scanner);
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 220));
      }
    } catch (error) {
      if (!scanner.running) return;
      console.error("Management search barcode scanner failed.", error);
      await stopScanner(scanner, false);
      setMessage(message, error.name === "NotAllowedError"
        ? "Kamerazugriff wurde verweigert. Erlaube den Zugriff oder gib den Barcode direkt ein."
        : `Scanner konnte nicht gestartet werden: ${error.message}`);
      panel.classList.remove("hidden");
    }
  }

  document.querySelectorAll("[data-search-scanner]").forEach((button) => {
    button.addEventListener("click", () => {
      void startScanner(button).catch((error) => {
        console.error("Management search barcode scanner could not start.", error);
      });
    });
  });

  document.querySelectorAll("[data-search-scanner-stop]").forEach((button) => {
    button.addEventListener("click", () => {
      const panel = button.closest("[data-search-scanner-panel]");
      if (currentScanner?.panel === panel) void stopScanner(currentScanner);
      else panel?.classList.add("hidden");
    });
  });

  window.addEventListener("pagehide", () => {
    if (currentScanner) void stopScanner(currentScanner);
  });
})();
