import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PARTS, SLOTS, fitsMachine, partById, siteById } from '../src/shared/parts.mjs';
import { normalize, reduce } from '../src/shared/reducer.mjs';
import { buyable, catalogParts, equipmentStats, partSources, previewEquipment } from '../src/shared/catalog.mjs';
import { startServer } from '../server/index.mjs';
const test = (name, fn) => { fn(); console.log('PASS ' + name); };
const base = normalize({ coins: 99999 });

test('all categories partition the full catalog, not just compatible parts', () => {
  assert.equal(SLOTS.flatMap(({ id }) => catalogParts(base, { slot: id })).length, PARTS.length);
  assert(catalogParts(base, { slot: 'bucket' }).some((p) => !fitsMachine(p, 'm_std')));
  assert(catalogParts(base, { slot: 'bucket', compatibleOnly: true }).every((p) => fitsMachine(p, 'm_std')));
});
test('owned, missing, shop and work filters match authoritative tables', () => {
  for (const { id: slot } of SLOTS) {
    const owned = catalogParts(base, { slot, filter: 'owned' });
    const missing = catalogParts(base, { slot, filter: 'missing' });
    assert(owned.every((p) => base.owned.includes(p.id)));
    assert(missing.every((p) => !base.owned.includes(p.id)));
    assert.equal(owned.length + missing.length, PARTS.filter((p) => p.slot === slot).length);
    assert(catalogParts(base, { slot, filter: 'shop' }).every((p) => buyable(p) && !base.owned.includes(p.id)));
    assert(catalogParts(base, { slot, filter: 'work' }).every((p) => !buyable(p)));
  }
});
test('search supports names, descriptions and empty results without mutating state', () => {
  assert(catalogParts(base, { slot: 'stick', query: ' 長小臂 ' }).some((p) => p.id === 'stick_long'));
  assert.equal(catalogParts(base, { slot: 'stick', query: 'no-such-part' }).length, 0);
  assert(catalogParts(base, { slot: 'stick', query: '搆得遠' }).some((p) => p.id === 'stick_long'));
});
test('all part sources point at live shop, default or loot entries', () => {
  assert(PARTS.every((p) => partSources(p, 'm_std').length > 0), 'Every collectible has an acquisition route');
  for (const p of PARTS) for (const source of partSources(p, 'm_std')) {
    if (source.kind === 'shop') assert(buyable(p) && p.price > 0);
    if (source.kind === 'initial') assert.equal(p.price, 0);
    if (source.kind === 'machine') assert(Object.values(partById(source.id).machine.defaults).includes(p.id));
    if (source.kind === 'site') {
      const site = siteById(source.id);
      assert((p.machine ? site.machineDrop.pool : site.loot).some(([id]) => id === p.id));
    }
  }
});
test('sources distinguish machine drops, bundled equipment and incompatible routes', () => {
  assert(partSources(partById('m_micro'), 'm_std').some((s) => s.id === 'yard' && s.available));
  assert(partSources(partById('boom_reach'), 'm_std').some((s) => s.kind === 'machine' && s.id === 'm_reach'));
  assert(partSources(partById('bucket_micro_trench'), 'm_std').some((s) => s.id === 'yard' && !s.available));
  assert(partSources(partById('bucket_micro_trench'), 'm_micro').some((s) => s.id === 'yard' && s.available));
});
test('preview never mutates progress or allows incompatible equipment', () => {
  const original = JSON.stringify(base);
  assert.equal(previewEquipment(base, 'bucket_micro_trench'), null);
  assert.equal(previewEquipment(base, 'invalid'), null);
  previewEquipment(base, 'm_mini'); previewEquipment(base, 'stick_long');
  assert.equal(JSON.stringify(base), original);
});
test('every buyable compatible part previews exactly what a purchase equips', () => {
  for (const p of PARTS.filter((p) => buyable(p) && !base.owned.includes(p.id) && fitsMachine(p, base.equipped.machine))) {
    assert.deepEqual(previewEquipment(base, p.id), reduce(base, { type: 'buy', id: p.id }).equipped, p.id);
  }
});
test('every owned compatible part previews exactly what equip does', () => {
  const all = normalize({ owned: PARTS.map((p) => p.id) });
  for (const p of PARTS.filter((p) => fitsMachine(p, all.equipped.machine))) {
    assert.deepEqual(previewEquipment(all, p.id), reduce(all, { type: 'equip', id: p.id }).equipped, p.id);
  }
});
test('returning machine preview restores remembered loadout, not default parts', () => {
  let s = reduce(base, { type: 'buy', id: 'stick_long' });
  s = reduce(s, { type: 'buy', id: 'm_mini' });
  const preview = previewEquipment(s, 'm_std');
  assert.equal(preview.stick, 'stick_long');
  assert.deepEqual(preview, reduce(s, { type: 'equip', id: 'm_std' }).equipped);
  assert.deepEqual(previewEquipment(s, 'm_mini'), s.equipped);
});
test('comparisons use real rounded coins, snapshot multipliers and low-durability speed', () => {
  const before = equipmentStats(base.equipped);
  const after = equipmentStats(previewEquipment(base, 'stick_long'));
  assert.equal(before.dig, 4); assert.equal(after.dig, 4); assert.equal(after.job, 1.15);
  assert.deepEqual(equipmentStats(previewEquipment(base, 'paint_blue')), before);
  assert.equal(equipmentStats(base.equipped, 10).speed, before.speed * 0.6);
});
test('equipment changes preserve active dispatch snapshot and dice', () => {
  const s = reduce(base, { type: 'startJob', site: 'yard', now: 1000 });
  assert.deepEqual(reduce(s, { type: 'buy', id: 'stick_long' }).jobs[0], s.jobs[0]);
});

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'exc-catalog-'));
const file = path.join(dir, 'state.json');
fs.writeFileSync(file, JSON.stringify(base));
let server;
const boot = async () => { server = await startServer({ dataDir: dir, token: 'catalog-test', onSaveError: () => {} }); };
const post = (action) => fetch(`http://127.0.0.1:${server.port}/dispatch`, { method: 'POST', headers: { Authorization: 'Bearer catalog-test', 'Content-Type': 'application/json' }, body: JSON.stringify(action) });
try {
  await boot();
  fs.mkdirSync(`${file}.tmp`);
  assert.equal((await post({ type: 'buy', id: 'stick_long' })).status, 503);
  assert.equal(server.getState().coins, base.coins);
  assert(!server.getState().owned.includes('stick_long'));
  fs.rmdirSync(`${file}.tmp`);
  const results = await Promise.all([post({ type: 'buy', id: 'stick_long' }), post({ type: 'buy', id: 'stick_long' })]);
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
  assert.equal(server.getState().coins, base.coins - partById('stick_long').price);
  assert.equal(JSON.parse(fs.readFileSync(file, 'utf8')).equipped.stick, 'stick_long');
  console.log('PASS purchase commits before success; failed saves and duplicate requests never double-charge');
  fs.mkdirSync(`${file}.tmp`);
  assert.equal((await post({ type: 'equip', id: 'stick_std' })).status, 503);
  assert.equal(server.getState().equipped.stick, 'stick_long');
  fs.rmdirSync(`${file}.tmp`);
  assert.equal((await post({ type: 'equip', id: 'bucket_micro_trench' })).status, 409);
  assert.equal((await post({ type: 'buy', id: 'acc_gps' })).status, 409);
  await server.close(); await boot();
  assert.equal(server.getState().equipped.stick, 'stick_long');
  assert.equal(server.getState().coins, base.coins - partById('stick_long').price);
  console.log('PASS equipment save failure retains original loadout, invalid purchases rejected, restart keeps ownership');
} finally {
  if (fs.existsSync(`${file}.tmp`) && fs.statSync(`${file}.tmp`).isDirectory()) fs.rmdirSync(`${file}.tmp`);
  await server?.close(); fs.rmSync(dir, { recursive: true, force: true });
}
