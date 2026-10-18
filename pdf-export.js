(() => {
  "use strict";

  const PAGE = { width: 595, height: 842, margin: 42 };
  const WIN_ANSI_EXTRA = { 0x20ac: 0x80, 0x2013: 0x96, 0x2014: 0x97, 0x2018: 0x91, 0x2019: 0x92, 0x201c: 0x93, 0x201d: 0x94, 0x201e: 0x84, 0x201a: 0x82, 0x2022: 0x95, 0x2026: 0x85 };
  const measureContext = document.createElement("canvas").getContext("2d");

  function toWinAnsi(text) {
    let out = "";
    for (const char of String(text ?? "").replace(/\s+/g, " ")) {
      const code = char.codePointAt(0);
      if (code >= 32 && code < 127) out += char;
      else if (code >= 160 && code <= 255) out += char;
      else if (WIN_ANSI_EXTRA[code]) out += String.fromCharCode(WIN_ANSI_EXTRA[code]);
      else out += "?";
    }
    return out;
  }

  function escapePdf(text) {
    return text.replace(/[\\()]/g, (char) => `\\${char}`);
  }

  function textWidth(text, size, bold) {
    measureContext.font = `${bold ? "bold " : ""}${size}px Arial, Helvetica, sans-serif`;
    return measureContext.measureText(text).width;
  }

  function wrap(text, size, maxWidth, bold = false) {
    const words = toWinAnsi(text).split(" ").filter(Boolean);
    const lines = [];
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (line && textWidth(candidate, size, bold) > maxWidth) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    if (line) lines.push(line);
    return lines.length ? lines : [""];
  }

  class Document {
    constructor() {
      this.pages = [[]];
      this.y = PAGE.height - PAGE.margin;
    }

    get contentWidth() {
      return PAGE.width - PAGE.margin * 2;
    }

    ensure(height) {
      if (this.y - height < PAGE.margin + 16) {
        this.pages.push([]);
        this.y = PAGE.height - PAGE.margin;
      }
    }

    text(value, { size = 10, bold = false, gray = 0, indent = 0, lead = 1.3 } = {}) {
      for (const line of wrap(value, size, this.contentWidth - indent, bold)) {
        this.ensure(size * lead);
        this.y -= size * lead;
        this.pages.at(-1).push(`BT /${bold ? "F2" : "F1"} ${size} Tf ${gray} g ${PAGE.margin + indent} ${this.y.toFixed(2)} Td (${escapePdf(line)}) Tj ET`);
      }
    }

    space(height) {
      this.y -= height;
    }

    rule() {
      this.ensure(6);
      this.y -= 3;
      this.pages.at(-1).push(`0.8 G 0.6 w ${PAGE.margin} ${this.y.toFixed(2)} m ${PAGE.width - PAGE.margin} ${this.y.toFixed(2)} l S`);
      this.y -= 3;
    }

    build(footer) {
      const objects = [];
      const add = (body) => objects.push(body) && objects.length;
      add("<< /Type /Catalog /Pages 2 0 R >>");
      add("");
      add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
      add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
      const pageIds = [];
      this.pages.forEach((commands, index) => {
        const label = escapePdf(toWinAnsi(`${footer} · Seite ${index + 1} von ${this.pages.length}`));
        const stream = [...commands, `BT /F1 8 Tf 0.5 g ${PAGE.margin} 26 Td (${label}) Tj ET`].join("\n");
        const contentId = objects.length + 2;
        pageIds.push(add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE.width} ${PAGE.height}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`));
        add(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
      });
      objects[1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;
      let pdf = "%PDF-1.4\n";
      const offsets = [];
      objects.forEach((body, index) => {
        offsets.push(pdf.length);
        pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
      });
      const xref = pdf.length;
      pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
      pdf += offsets.map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("");
      pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
      const bytes = new Uint8Array(pdf.length);
      for (let index = 0; index < pdf.length; index += 1) bytes[index] = pdf.charCodeAt(index) & 0xff;
      return new Blob([bytes], { type: "application/pdf" });
    }
  }

  const clean = (value) => (value === undefined || value === null ? "" : String(value).trim());
  const join = (parts, separator = " · ") => parts.map(clean).filter(Boolean).join(separator);
  const euro = (value) => (clean(value) && Number.isFinite(Number(value)) ? `${Number(value).toFixed(2).replace(".", ",")} €` : "");

  function sections(state) {
    const spools = state.filamentInventory?.spools || [];
    const products = state.filamentInventory?.products || [];
    const locations = state.smallPartsInventory?.locations || [];
    const locationName = (id) => locations.find((location) => location.id === id)?.name || "";
    return [
      {
        title: "Katalogeinträge",
        rows: (state.records || []).filter((record) => !record.deletedAt).map((record) => ({
          name: record.name, detail: join([record.category, record.location, record.barcode])
        }))
      },
      {
        title: "Geräte",
        rows: (state.deviceInventory?.devices || []).map((device) => ({
          name: device.name,
          detail: join([device.manufacturer, device.model, device.category, device.location, device.quantity > 1 ? `${device.quantity}×` : "", device.condition])
        }))
      },
      {
        title: "Spiele",
        rows: (state.gameInventory?.games || []).map((game) => ({
          name: game.name,
          detail: join([game.platform, game.publisher, game.category, game.condition, game.location, game.quantity > 1 ? `${game.quantity}×` : ""])
        }))
      },
      {
        title: "Bücher",
        rows: (state.bookInventory?.books || []).map((book) => ({
          name: book.title,
          detail: join([Array.isArray(book.authors) ? book.authors.join(", ") : book.authors, book.publisher, book.year, book.format, book.isbn13 || book.isbn10])
        }))
      },
      {
        title: "Filme",
        rows: (state.filmInventory?.entries || []).map((film) => ({
          name: film.title,
          detail: join([film.format, film.year || film.releaseYear, film.publisher, film.edition, film.location, film.quantity > 1 ? `${film.quantity}×` : ""])
        }))
      },
      {
        title: "Filamentrollen",
        rows: spools.map((spool) => {
          const product = products.find((candidate) => candidate.id === spool.productId) || {};
          const remaining = clean(spool.remainingG) ? `Rest ${spool.remainingG} g` : "";
          return {
            name: join([product.manufacturer, product.name], " "),
            detail: join([product.materialType, product.color, product.diameter ? `${product.diameter} mm` : "", remaining, spool.location])
          };
        })
      },
      {
        title: "Kleinteile",
        rows: (state.smallPartsInventory?.items || []).filter((item) => !item.archivedAt).map((item) => ({
          name: item.name,
          detail: join([`${item.quantity} ${item.unit || "Stück"}`, item.category, item.manufacturer, item.partNumber, locationName(item.locationId), item.barcode])
        }))
      }
    ];
  }

  function createPdf(state) {
    const doc = new Document();
    const now = new Date();
    const dateLabel = now.toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" });
    const data = sections(state);
    doc.text("Katalogic – Bestandsübersicht", { size: 20, bold: true });
    doc.text(`Erstellt am ${dateLabel}`, { size: 10, gray: 0.4 });
    doc.space(8);
    doc.rule();
    for (const section of data) doc.text(`${section.title}: ${section.rows.length}`, { size: 11 });
    doc.space(6);
    for (const section of data) {
      if (!section.rows.length) continue;
      doc.space(10);
      doc.ensure(40);
      doc.text(`${section.title} (${section.rows.length})`, { size: 14, bold: true });
      doc.rule();
      for (const row of section.rows) {
        doc.ensure(28);
        doc.text(row.name || "(ohne Namen)", { size: 10, bold: true });
        if (row.detail) doc.text(row.detail, { size: 9, gray: 0.35, indent: 10 });
        doc.space(3);
      }
    }
    return {
      blob: doc.build("Katalogic"),
      total: data.reduce((sum, section) => sum + section.rows.length, 0),
      fileName: `katalogic-bestand-${now.toISOString().slice(0, 10)}.pdf`
    };
  }

  window.KatalogicPdfExport = { create: createPdf };
})();
