(() => {
  const PALETTE = ["#4f8cff", "#34c38f", "#f5a524", "#e5566d", "#9b6bff", "#2bb5c9", "#c9a227", "#8a94a6"];
  const W = 1400;
  const PAD = 40;

  function active(items) {
    return (items || []).filter((item) => !item.archivedAt);
  }

  function count(values, limit = 8) {
    const map = new Map();
    for (const value of values) {
      const key = String(value || "").trim() || "Offen";
      map.set(key, (map.get(key) || 0) + 1);
    }
    const sorted = [...map.entries()].sort((a, b) => b[1] - a[1]);
    if (sorted.length <= limit) return sorted;
    const rest = sorted.slice(limit - 1).reduce((sum, [, value]) => sum + value, 0);
    return [...sorted.slice(0, limit - 1), ["Weitere", rest]];
  }

  function countWeighted(items, limit = 8) {
    const map = new Map();
    for (const item of items) {
      const key = String(item.category || "").trim() || "Offen";
      map.set(key, (map.get(key) || 0) + (Number(item.quantity) || 0));
    }
    const sorted = [...map.entries()].sort((a, b) => b[1] - a[1]);
    if (sorted.length <= limit) return sorted;
    const rest = sorted.slice(limit - 1).reduce((sum, [, value]) => sum + value, 0);
    return [...sorted.slice(0, limit - 1), ["Weitere", rest]];
  }

  function charts(state) {
    const devices = state.deviceInventory?.devices || [];
    const games = state.gameInventory?.games || [];
    const books = state.bookInventory?.books || [];
    const films = state.filmInventory?.entries || [];
    const products = state.filamentInventory?.products || [];
    const spools = (state.filamentInventory?.spools || []).filter((spool) => !spool.archivedAt);
    const parts = active(state.smallPartsInventory?.items);

    const grams = new Map();
    for (const spool of spools) {
      const product = products.find((candidate) => candidate.id === spool.productId) || {};
      const value = Number(spool.remainingG);
      if (!Number.isFinite(value)) continue;
      const key = product.materialType || "Material unbekannt";
      grams.set(key, (grams.get(key) || 0) + value);
    }

    return [
      {
        title: "Einträge pro Bereich",
        unit: "",
        data: [["Geräte", devices.length], ["Spiele", games.length], ["Bücher", books.length], ["Filme", films.length], ["Filamentrollen", spools.length], ["Kleinteile", parts.length]]
      },
      { title: "Spiele nach Plattform", unit: "", data: count(games.map((game) => game.platform)) },
      { title: "Geräte nach Kategorie", unit: "", data: count(devices.map((device) => device.category)) },
      { title: "Bücher nach Kategorie", unit: "", data: count(books.map((book) => book.category)) },
      { title: "Filme nach Format", unit: "", data: count(films.map((film) => film.format)) },
      { title: "Kleinteile nach Kategorie (Stückzahl)", unit: "", data: countWeighted(parts) },
      {
        title: "Filament-Restmenge nach Material",
        unit: " g",
        data: [...grams.entries()].sort((a, b) => b[1] - a[1]).map(([key, value]) => [key, Math.round(value)])
      }
    ];
  }

  function drawChart(ctx, chart, x, y, w, h) {
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#d9dee8";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 12);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#1c2433";
    ctx.font = "bold 20px Helvetica, Arial, sans-serif";
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    ctx.fillText(chart.title, x + 20, y + 18);

    if (!chart.data.length || chart.data.every(([, value]) => !value)) {
      ctx.fillStyle = "#6b7487";
      ctx.font = "16px Helvetica, Arial, sans-serif";
      ctx.fillText("Noch keine Daten vorhanden.", x + 20, y + 62);
      return;
    }

    const max = Math.max(...chart.data.map(([, value]) => value), 1);
    const labelW = 150;
    const valueW = 80;
    const top = y + 62;
    const rowH = Math.min(36, (h - 80) / chart.data.length);
    const barMax = w - 40 - labelW - valueW;
    chart.data.forEach(([label, value], index) => {
      const rowY = top + index * rowH;
      ctx.fillStyle = "#3b4559";
      ctx.font = "15px Helvetica, Arial, sans-serif";
      ctx.textBaseline = "middle";
      let text = label;
      while (ctx.measureText(text).width > labelW - 10 && text.length > 1) text = text.slice(0, -1);
      ctx.fillText(text === label ? text : `${text}…`, x + 20, rowY + rowH / 2);
      ctx.fillStyle = PALETTE[index % PALETTE.length];
      const barW = Math.max(value ? 3 : 0, (value / max) * barMax);
      ctx.beginPath();
      ctx.roundRect(x + 20 + labelW, rowY + 5, barW, rowH - 10, 4);
      ctx.fill();
      ctx.fillStyle = "#1c2433";
      ctx.fillText(`${value}${chart.unit}`, x + 20 + labelW + barW + 8, rowY + rowH / 2);
    });
  }

  function create(state) {
    const list = charts(state);
    const cellW = (W - PAD * 3) / 2;
    const cellH = 320;
    const headerH = 110;
    const H = headerH + Math.ceil(list.length / 2) * (cellH + PAD) + 10;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#f3f5f9";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#1c2433";
    ctx.font = "bold 34px Helvetica, Arial, sans-serif";
    ctx.textBaseline = "top";
    ctx.fillText("Katalogic – Diagramme", PAD, 32);
    const now = new Date();
    ctx.fillStyle = "#6b7487";
    ctx.font = "16px Helvetica, Arial, sans-serif";
    ctx.fillText(`Erstellt am ${now.toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })}`, PAD, 78);
    list.forEach((chart, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      drawChart(ctx, chart, PAD + col * (cellW + PAD), headerH + row * (cellH + PAD), cellW, cellH);
    });
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => (blob ? resolve({ blob, fileName: `katalogic-diagramme-${now.toISOString().slice(0, 10)}.png`, count: list.length }) : reject(new Error("Bild konnte nicht erzeugt werden."))), "image/png");
    });
  }

  window.KatalogicChartExport = { create };
})();
