'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PUBLIC = path.join(__dirname, 'public');
const DATA = process.env.DATA_DIR || path.join(__dirname, 'data');
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json', '.json': 'application/json'
};

const keyFile = key => path.join(DATA, crypto.createHash('sha256').update(key).digest('hex') + '.json');

// Merge nach "last write wins" pro Artikel; gelöschte Artikel bleiben als Tombstone (deleted:true)
function merge(a, b) {
  const map = new Map();
  for (const it of [...a, ...b]) {
    if (!it || typeof it.id !== 'string') continue;
    const cur = map.get(it.id);
    if (!cur || (it.updatedAt || 0) > (cur.updatedAt || 0)) map.set(it.id, it);
  }
  return [...map.values()];
}

function readBody(req, limit = 20 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', c => { size += c.length; if (size > limit) { reject(new Error('too large')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function send(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(obj));
}

async function getJson(url, headers = {}) {
  const r = await fetch(url, { headers: { 'User-Agent': 'Katalogic/1.0', ...headers }, signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
}

// Produktdaten für einen Barcode aus mehreren Quellen zusammensuchen
async function lookup(code) {
  const result = { code, title: '', description: '', images: [], category: '', source: [] };
  const add = (src, d) => {
    result.source.push(src);
    if (!result.title && d.title) result.title = d.title;
    if (!result.description && d.description) result.description = d.description;
    if (!result.category && d.category) result.category = d.category;
    for (const i of d.images || []) if (i && !result.images.includes(i)) result.images.push(i);
  };
  const tasks = [];
  if (/^(97[89])\d{10}$/.test(code)) {
    tasks.push(getJson(`https://openlibrary.org/api/books?bibkeys=ISBN:${code}&format=json&jscmd=data`).then(j => {
      const b = j['ISBN:' + code]; if (!b) return;
      add('Open Library', {
        title: [b.title, b.subtitle].filter(Boolean).join(' – '),
        description: [(b.authors || []).map(a => a.name).join(', '), b.publishers && b.publishers.map(p => p.name).join(', '), b.publish_date, b.number_of_pages && b.number_of_pages + ' Seiten'].filter(Boolean).join(' · '),
        category: 'buecher',
        images: b.cover ? [b.cover.large, b.cover.medium].filter(Boolean) : []
      });
    }).catch(() => {}));
  }
  tasks.push(getJson(`https://world.openfoodfacts.org/api/v2/product/${code}.json`).then(j => {
    if (j.status !== 1) return; const p = j.product;
    add('Open Food Facts', {
      title: [p.product_name, p.brands].filter(Boolean).join(' – '),
      description: [p.quantity, p.categories].filter(Boolean).join(' · '),
      images: [p.image_front_url, p.image_url].filter(Boolean)
    });
  }).catch(() => {}));
  tasks.push(getJson(`https://api.upcitemdb.com/prod/trial/lookup?upc=${code}`).then(j => {
    const i = (j.items || [])[0]; if (!i) return;
    add('UPCitemdb', { title: i.title, description: [i.brand, i.model, i.description].filter(Boolean).join(' · '), images: i.images || [] });
  }).catch(() => {}));
  // Optional: Google Custom Search (Bildersuche), benötigt GOOGLE_API_KEY und GOOGLE_CX
  const { GOOGLE_API_KEY: gk, GOOGLE_CX: cx } = process.env;
  if (gk && cx) {
    tasks.push(getJson(`https://www.googleapis.com/customsearch/v1?key=${gk}&cx=${cx}&q=${encodeURIComponent(code)}&num=5`).then(async j => {
      const it = j.items || [];
      add('Google', { title: it[0] && it[0].title, description: it[0] && it[0].snippet, images: [] });
      const img = await getJson(`https://www.googleapis.com/customsearch/v1?key=${gk}&cx=${cx}&q=${encodeURIComponent(result.title || code)}&searchType=image&num=6`);
      add('Google Bilder', { images: (img.items || []).map(x => x.link) });
    }).catch(() => {}));
  }
  await Promise.all(tasks);
  return result;
}

async function handler(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const p = decodeURIComponent(url.pathname);

  let m;
  if ((m = p.match(/^\/api\/sync\/([^/]+)$/))) {
    const key = m[1];
    if (key.length < 6 || key.length > 200) return send(res, 400, { error: 'Schlüssel muss 6–200 Zeichen lang sein' });
    const file = keyFile(key);
    let stored = [];
    try { stored = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { /* neu */ }
    if (req.method === 'GET') return send(res, 200, { items: stored });
    if (req.method === 'POST') {
      let body;
      try { body = JSON.parse(await readBody(req)); } catch { return send(res, 400, { error: 'Ungültiges JSON' }); }
      if (!Array.isArray(body.items)) return send(res, 400, { error: 'items fehlt' });
      const merged = merge(stored, body.items);
      fs.mkdirSync(DATA, { recursive: true });
      fs.writeFileSync(file, JSON.stringify(merged));
      return send(res, 200, { items: merged });
    }
    return send(res, 405, { error: 'Methode nicht erlaubt' });
  }

  if (p === '/api/lookup' && req.method === 'GET') {
    const code = (url.searchParams.get('code') || '').replace(/[^0-9A-Za-z-]/g, '');
    if (!code) return send(res, 400, { error: 'code fehlt' });
    return send(res, 200, await lookup(code));
  }

  if (req.method !== 'GET') return send(res, 405, { error: 'Methode nicht erlaubt' });
  const rel = p === '/' ? '/index.html' : p;
  const file = path.normalize(path.join(PUBLIC, rel));
  if (!file.startsWith(PUBLIC + path.sep)) return send(res, 403, { error: 'verboten' });
  fs.readFile(file, (err, buf) => {
    if (err) return send(res, 404, { error: 'nicht gefunden' });
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(buf);
  });
}

const server = http.createServer((req, res) => {
  handler(req, res).catch(() => { if (!res.headersSent) send(res, 500, { error: 'Serverfehler' }); });
});

if (require.main === module) {
  const port = process.env.PORT || 3000;
  server.listen(port, () => console.log(`Katalogic läuft auf http://localhost:${port}`));
}
module.exports = { server, merge };
