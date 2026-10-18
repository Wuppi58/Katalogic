"use strict";

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff"
};
let lastLookupAt = 0;

function reply(statusCode, body) {
  return { statusCode, headers: JSON_HEADERS, body: JSON.stringify(body) };
}

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") return reply(405, { error: "Methode nicht erlaubt." });
  const barcode = (event.queryStringParameters && event.queryStringParameters.barcode) || "";
  if (!/^(?:\d{8}|\d{12,14}|\d{9}[\dXx])$/.test(barcode)) return reply(400, { error: "Ungültiger Barcode." });

  const elapsed = Date.now() - lastLookupAt;
  if (lastLookupAt && elapsed < 10000) {
    return reply(429, { error: `Bitte warte ${Math.ceil((10000 - elapsed) / 1000)} Sekunden vor der nächsten UPCitemdb-Abfrage.` });
  }
  lastLookupAt = Date.now();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const upstream = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(barcode.toUpperCase())}`, {
      headers: { Accept: "application/json" },
      signal: controller.signal
    });
    if (upstream.status === 429) {
      const retryAfter = upstream.headers.get("Retry-After");
      return reply(429, { error: `UPCitemdb begrenzt weitere Anfragen${retryAfter ? ` (Retry-After: ${retryAfter})` : ""}. Nutze die Websuche oder versuche es später.` });
    }
    if (!upstream.ok) return reply(502, { error: `Produktdatenquelle meldet HTTP ${upstream.status}.` });
    const result = await upstream.json();
    const item = Array.isArray(result.items) ? result.items[0] : null;
    if (!item) return reply(200, { found: false });
    return reply(200, {
      found: true,
      source: "UPCitemdb",
      product: {
        title: item.title || "",
        brand: item.brand || "",
        model: item.model || "",
        category: item.category || "",
        description: item.description || "",
        publisher: item.publisher || "",
        isbn: item.isbn || "",
        sku: item.sku || "",
        ean: item.ean || "",
        upc: item.upc || "",
        images: Array.isArray(item.images) ? item.images.slice(0, 3) : []
      }
    });
  } catch (error) {
    return reply(502, {
      error: error.name === "AbortError"
        ? "Die Produktdatenquelle hat nicht rechtzeitig geantwortet."
        : "Die Produktdatenquelle ist momentan nicht erreichbar."
    });
  } finally {
    clearTimeout(timeout);
  }
};
