"use strict";

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { URL } = require("node:url");

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 8000);
const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json; charset=utf-8"
};
const requestWindows = new Map();

function isRateLimited(address) {
  const now = Date.now();
  const windowStart = now - 60_000;
  const recent = (requestWindows.get(address) || []).filter((timestamp) => timestamp > windowStart);
  if (recent.length >= 30) {
    requestWindows.set(address, recent);
    return true;
  }
  recent.push(now);
  requestWindows.set(address, recent);
  return false;
}

function respond(response, statusCode, contentType, body) {
  response.writeHead(statusCode, {
    "Content-Type": contentType,
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "no-store"
  });
  response.end(body);
}

async function handleProductSearch(requestUrl, response) {
  const barcode = requestUrl.searchParams.get("barcode") || "";
  const query = requestUrl.searchParams.get("query") || "";
  if (Boolean(barcode) === Boolean(query)) {
    respond(response, 400, "application/json; charset=utf-8", JSON.stringify({ error: "Provide exactly one barcode or query." }));
    return;
  }
  const serpApiKey = process.env.SERPAPI_API_KEY;
  const endpoint = serpApiKey
    ? new URL("https://serpapi.com/search.json")
    : new URL(barcode
      ? "https://api.upcitemdb.com/prod/trial/lookup"
      : "https://api.upcitemdb.com/prod/trial/search");
  if (serpApiKey) {
    endpoint.searchParams.set("engine", "google_shopping");
    endpoint.searchParams.set("q", barcode || query.slice(0, 120));
    endpoint.searchParams.set("hl", "de");
    endpoint.searchParams.set("gl", "de");
    endpoint.searchParams.set("api_key", serpApiKey);
  } else {
    endpoint.searchParams.set(barcode ? "upc" : "s", barcode || query.slice(0, 120));
    if (query) {
      endpoint.searchParams.set("match_mode", "0");
      endpoint.searchParams.set("type", "product");
    }
  }
  try {
    const upstream = await fetch(endpoint, {
      headers: { Accept: "application/json", "User-Agent": "Katalogic/1.0" },
      signal: AbortSignal.timeout(12_000)
    });
    const data = await upstream.json();
    if (!upstream.ok) {
      console.error(`${serpApiKey ? "Google Shopping" : "UPCitemdb"} lookup returned HTTP ${upstream.status}.`);
      respond(response, upstream.status, "application/json; charset=utf-8", JSON.stringify({
        error: "Product lookup provider returned an error."
      }));
      return;
    }
    if (serpApiKey) {
      const items = (Array.isArray(data.shopping_results) ? data.shopping_results : []).slice(0, 8).map((item) => ({
        title: item.title || "",
        description: [item.source, item.price, item.rating ? `Bewertung: ${item.rating}` : ""].filter(Boolean).join(" · "),
        brand: item.source || "",
        ean: barcode,
        images: item.thumbnail ? [item.thumbnail] : [],
        product_link: item.product_link || item.link || "",
        provider: "Google Shopping"
      }));
      respond(response, 200, "application/json; charset=utf-8", JSON.stringify({ code: "OK", items }));
      return;
    }
    respond(response, 200, "application/json; charset=utf-8", JSON.stringify(data));
  } catch (error) {
    console.error("Product lookup failed.", error);
    respond(response, 502, "application/json; charset=utf-8", JSON.stringify({ error: "Product lookup provider is unavailable." }));
  }
}

const server = http.createServer(async (request, response) => {
  if (request.method !== "GET") {
    respond(response, 405, "text/plain; charset=utf-8", "Method not allowed");
    return;
  }
  const requestUrl = new URL(request.url, `http://${request.headers.host || "localhost"}`);
  if (request.method === "GET" && requestUrl.pathname === "/api/search-provider") {
    respond(response, 200, "application/json; charset=utf-8", JSON.stringify({
      provider: process.env.SERPAPI_API_KEY ? "google-shopping" : "upcitemdb"
    }));
    return;
  }
  if (requestUrl.pathname === "/api/products") {
    if (isRateLimited(request.socket.remoteAddress || "unknown")) {
      respond(response, 429, "application/json; charset=utf-8", JSON.stringify({ error: "Too many product searches. Try again shortly." }));
      return;
    }
    await handleProductSearch(requestUrl, response);
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
