'use strict';
const CATEGORIES = { spiele: 'Spiele', buecher: 'Bücher', geraete: 'Geräte', zubehoer: 'Zubehör', filamente: 'Filamente', kleinteile: 'Kleinteile', sonstiges: 'Sonstiges' };
const $ = id => document.getElementById(id);
let items = JSON.parse(localStorage.getItem('items') || '[]');
let syncKey = localStorage.getItem('syncKey') || '';
let filter = 'alle', current = null, selImg = '';

const save = () => localStorage.setItem('items', JSON.stringify(items));
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now() + '-' + Math.random().toString(16).slice(2));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const safeUrl = u => /^(https?:|data:image\/)/i.test(u) ? u : '';

function render() {
  $('cats').innerHTML = ['alle', ...Object.keys(CATEGORIES)].map(k =>
    `<button data-c="${k}" class="${k === filter ? 'on' : ''}">${k === 'alle' ? 'Alle' : CATEGORIES[k]}</button>`).join('');
  const q = $('search').value.toLowerCase();
  const list = items.filter(i => !i.deleted && (filter === 'alle' || i.category === filter) &&
    (!q || [i.name, i.code, i.description].join(' ').toLowerCase().includes(q)));
  $('grid').innerHTML = list.map(i => `<div class="item" data-id="${esc(i.id)}">${safeUrl(i.image) ? `<img src="${esc(safeUrl(i.image))}" alt="" loading="lazy">` : '<div class="ph"></div>'}<div><b>${esc(i.name)}</b><br><small>${esc(CATEGORIES[i.category] || '')} · ${esc(i.qty)}×</small></div></div>`).join('');
  $('status').textContent = list.length ? '' : 'Keine Artikel.';
}

function openItem(item) {
  current = item || { id: uid(), category: filter in CATEGORIES ? filter : 'sonstiges', qty: 1, images: [] };
  const f = $('itemForm');
  $('catSel').innerHTML = Object.entries(CATEGORIES).map(([k, v]) => `<option value="${k}">${v}</option>`).join('');
  f.code.value = current.code || ''; f.name.value = current.name || ''; f.description.value = current.description || '';
  f.qty.value = current.qty ?? 1; f.category.value = current.category;
  selImg = current.image || ''; current.images = current.images || (selImg ? [selImg] : []);
  $('delBtn').style.display = item ? '' : 'none';
  $('lookupMsg').textContent = ''; renderImgs(); updateGoogle();
  $('itemDlg').showModal();
}
function renderImgs() {
  $('imgs').innerHTML = current.images.filter(safeUrl).map(u => `<img src="${esc(u)}" class="${u === selImg ? 'sel' : ''}" data-u="${esc(u)}" alt="">`).join('');
}
function updateGoogle() {
  const q = $('itemForm').code.value || $('itemForm').name.value;
  $('googleLink').href = 'https://www.google.com/search?q=' + encodeURIComponent(q);
}

async function lookup(code) {
  const msg = $('lookupMsg'); msg.textContent = 'Suche…';
  try {
    const r = await (await fetch('/api/lookup?code=' + encodeURIComponent(code))).json();
    const f = $('itemForm');
    if (!f.name.value && r.title) f.name.value = r.title;
    if (!f.description.value && r.description) f.description.value = r.description;
    if (r.category && !current.name) f.category.value = r.category;
    for (const u of r.images || []) if (!current.images.includes(u)) current.images.push(u);
    if (!selImg && current.images.length) selImg = current.images[0];
    renderImgs();
    msg.textContent = r.source.length ? 'Gefunden bei: ' + r.source.join(', ') : 'Nichts gefunden – nutze den Google-Button oder trage manuell ein.';
  } catch { msg.textContent = 'Offline oder Fehler bei der Suche.'; }
}

// Scan: USB-Scanner (Tastatur) oder Kamera -> bestehenden Artikel öffnen oder neuen anlegen
function handleCode(code) {
  code = code.trim(); if (!code) return;
  const existing = items.find(i => !i.deleted && i.code === code);
  if (existing) { openItem(existing); return; }
  openItem(); $('itemForm').code.value = code; updateGoogle(); lookup(code);
}

let stream = null, scanning = false;
async function startCam() {
  if (!('BarcodeDetector' in window)) { alert('Kamera-Scan wird von diesem Browser nicht unterstützt. Nutze Chrome/Android oder einen USB-Scanner.'); return; }
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
  } catch { alert('Kein Kamerazugriff.'); return; }
  const v = $('video'); v.srcObject = stream; await v.play(); $('camDlg').showModal();
  const det = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code'] });
  scanning = true;
  while (scanning) {
    try { const r = await det.detect(v); if (r.length) { stopCam(); handleCode(r[0].rawValue); break; } } catch {}
    await new Promise(r => setTimeout(r, 250));
  }
}
function stopCam() {
  scanning = false;
  if (stream) stream.getTracks().forEach(t => t.stop());
  stream = null; if ($('camDlg').open) $('camDlg').close();
}

async function sync() {
  if (!syncKey) return;
  $('status').textContent = 'Synchronisiere…';
  try {
    const r = await fetch('/api/sync/' + encodeURIComponent(syncKey), { method: 'POST', body: JSON.stringify({ items }) });
    if (!r.ok) throw new Error((await r.json()).error);
    items = (await r.json()).items; save(); render();
    $('status').textContent = 'Synchronisiert ' + new Date().toLocaleTimeString();
  } catch (e) { $('status').textContent = 'Sync fehlgeschlagen: ' + e.message; }
}

function resize(file) {
  return new Promise(res => {
    const img = new Image();
    img.onload = () => {
      const s = Math.min(1, 800 / Math.max(img.width, img.height)), c = document.createElement('canvas');
      c.width = img.width * s; c.height = img.height * s; c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      res(c.toDataURL('image/jpeg', 0.8));
    };
    img.src = URL.createObjectURL(file);
  });
}

$('scan').addEventListener('keydown', e => { if (e.key === 'Enter') { handleCode(e.target.value); e.target.value = ''; } });
$('addBtn').onclick = () => openItem();
$('camBtn').onclick = startCam;
$('camClose').onclick = stopCam;
$('camDlg').addEventListener('close', () => { scanning = false; });
$('search').oninput = render;
$('cats').onclick = e => { if (e.target.dataset.c) { filter = e.target.dataset.c; render(); } };
$('grid').onclick = e => { const c = e.target.closest('.item'); if (c) openItem(items.find(i => i.id === c.dataset.id)); };
$('lookupBtn').onclick = () => { const c = $('itemForm').code.value.trim(); if (c) lookup(c); else $('lookupMsg').textContent = 'Bitte Barcode eingeben.'; };
$('itemForm').addEventListener('input', updateGoogle);
$('imgs').onclick = e => { if (e.target.dataset.u) { selImg = e.target.dataset.u; renderImgs(); } };
$('file').onchange = async e => {
  if (!e.target.files[0]) return;
  const d = await resize(e.target.files[0]); current.images.push(d); selImg = d; renderImgs(); e.target.value = '';
};
$('itemForm').addEventListener('submit', e => {
  if (e.submitter && e.submitter.value !== 'save') return;
  const f = e.target;
  Object.assign(current, { code: f.code.value.trim(), name: f.name.value.trim(), description: f.description.value, category: f.category.value, qty: +f.qty.value || 0, image: selImg, images: current.images.filter(u => !u.startsWith('data:') || u === selImg), updatedAt: Date.now() });
  const i = items.findIndex(x => x.id === current.id);
  if (i >= 0) items[i] = current; else items.push(current);
  save(); render(); sync();
});
$('delBtn').onclick = () => {
  if (!confirm('Artikel löschen?')) return;
  const i = items.findIndex(x => x.id === current.id);
  if (i >= 0) items[i] = { id: current.id, deleted: true, updatedAt: Date.now() };
  save(); render(); $('itemDlg').close(); sync();
};
$('syncBtn').onclick = () => { $('syncKey').value = syncKey; $('syncDlg').showModal(); };
$('syncSave').onclick = e => {
  const k = $('syncKey').value.trim();
  if (k.length < 6) { e.preventDefault(); $('syncMsg').textContent = 'Mindestens 6 Zeichen.'; return; }
  syncKey = k; localStorage.setItem('syncKey', k); sync();
};

if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js');
window.addEventListener('online', sync);
render(); sync();
