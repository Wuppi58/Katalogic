"use strict";

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { URL } = require("node:url");

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 8000);
let lastProductLookupAt = 0;
const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json; charset=utf-8"
};
function respond(response, statusCode, contentType, body) {
  response.writeHead(statusCode, {
    "Content-Type": contentType,
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "no-store"
  });
  response.end(body);
}

async function lookupProduct(requestUrl, response) {
  const barcode = requestUrl.searchParams.get("barcode") || "";
  if (!/^(?:\d{8}|\d{12,14}|\d{9}[\dXx])$/.test(barcode)) {
    respond(response, 400, "application/json; charset=utf-8", JSON.stringify({ error: "Ungültiger Barcode." }));
    return;
  }
  const elapsed = Date.now() - lastProductLookupAt;
  if (lastProductLookupAt && elapsed < 10000) {
    const retryAfter = Math.ceil((10000 - elapsed) / 1000);
    respond(response, 429, "application/json; charset=utf-8", JSON.stringify({
      error: `Bitte warte ${retryAfter} Sekunden vor der nächsten UPCitemdb-Abfrage.`
    }));
    return;
  }
  lastProductLookupAt = Date.now();
  const lookupCode = barcode.toUpperCase();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const upstream = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(lookupCode)}`, {
      headers: { Accept: "application/json" },
      signal: controller.signal
    });
    if (upstream.status === 429) {
      const retryAfter = upstream.headers.get("Retry-After");
      respond(response, 429, "application/json; charset=utf-8", JSON.stringify({
        error: `UPCitemdb begrenzt weitere Anfragen${retryAfter ? ` (Retry-After: ${retryAfter})` : ""}. Nutze die Websuche oder versuche es später.`
      }));
      return;
    }
    if (!upstream.ok) {
      respond(response, 502, "application/json; charset=utf-8", JSON.stringify({ error: `Produktdatenquelle meldet HTTP ${upstream.status}.` }));
      return;
    }
    const result = await upstream.json();
    const item = Array.isArray(result.items) ? result.items[0] : null;
    if (!item) {
      respond(response, 200, "application/json; charset=utf-8", JSON.stringify({ found: false }));
      return;
    }
    respond(response, 200, "application/json; charset=utf-8", JSON.stringify({
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
    }));
  } catch (error) {
    const timedOut = error.name === "AbortError";
    respond(response, 502, "application/json; charset=utf-8", JSON.stringify({
      error: timedOut ? "Die Produktdatenquelle hat nicht rechtzeitig geantwortet." : "Die Produktdatenquelle ist momentan nicht erreichbar."
    }));
  } finally {
    clearTimeout(timeout);
  }
}

const server = http.createServer((request, response) => {
  if (request.method !== "GET") {
    respond(response, 405, "text/plain; charset=utf-8", "Method not allowed");
    return;
  }
  const requestUrl = new URL(request.url, `http://${request.headers.host || "localhost"}`);
  if (requestUrl.pathname === "/api/products") {
    void lookupProduct(requestUrl, response);
    return;
  }
  let filePath;
  try {
    const pathname = decodeURIComponent(requestUrl.pathname);
    filePath = path.resolve(ROOT, `.${pathname === "/" ? "/index.html" : pathname}`);
  } catch {
    respond(response, 400, "text/plain; charset=utf-8", "Invalid path");
    return;
  }
  if (filePath !== ROOT && !filePath.startsWith(`${ROOT}${path.sep}`)) {
    respond(response, 403, "text/plain; charset=utf-8", "Forbidden");
    return;
  }

  fs.stat(filePath, (statError, stat) => {
    if (statError || !stat.isFile()) {
      respond(response, 404, "text/plain; charset=utf-8", "Not found");
      return;
    }
    const contentType = MIME_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream";
    response.writeHead(200, {
      "Content-Type": contentType,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": filePath.endsWith("service-worker.js")
        ? "no-cache"
        : filePath.startsWith(path.join(ROOT, "vendor") + path.sep) ? "public, max-age=86400" : "no-store"
    });
    fs.createReadStream(filePath).pipe(response);
  });
});

server.listen(PORT, () => {
  console.log(`Katalogic is available at http://localhost:${PORT}`);
});
