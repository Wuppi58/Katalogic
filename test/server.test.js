'use strict';
const test = require('node:test');
const assert = require('node:assert');
const os = require('os'), fs = require('fs'), path = require('path');
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'kat-'));
const { server, merge } = require('../server');

test('merge: neuere Version gewinnt', () => {
  const r = merge([{ id: 'a', updatedAt: 1, name: 'alt' }], [{ id: 'a', updatedAt: 2, name: 'neu' }, { id: 'b', updatedAt: 1 }]);
  assert.strictEqual(r.find(i => i.id === 'a').name, 'neu');
  assert.strictEqual(r.length, 2);
});

test('sync per Schlüssel', async () => {
  await new Promise(r => server.listen(0, r));
  const base = `http://localhost:${server.address().port}`;
  const post = await fetch(base + '/api/sync/geheim123', { method: 'POST', body: JSON.stringify({ items: [{ id: 'x', updatedAt: 5 }] }) });
  assert.strictEqual((await post.json()).items.length, 1);
  const get = await (await fetch(base + '/api/sync/geheim123')).json();
  assert.strictEqual(get.items[0].id, 'x');
  const other = await (await fetch(base + '/api/sync/anderer-key')).json();
  assert.strictEqual(other.items.length, 0);
  assert.strictEqual((await fetch(base + '/api/sync/abc')).status, 400);
  assert.strictEqual((await fetch(base + '/../server.js')).status, 404);
  server.close();
});
