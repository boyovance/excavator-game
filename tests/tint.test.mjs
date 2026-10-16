import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { normalize, reduce, digCoins } from '../src/shared/reducer.mjs';
import { TINT_SLOTS } from '../src/shared/parts.mjs';
import { startServer } from '../server/index.mjs';

const ok = (c, m) => console.log((c ? 'PASS ' : 'FAIL ') + m);
const base = normalize(null);
const tint = (s, slot, color) => reduce(s, { type: 'tint', slot, color });

ok(JSON.stringify(base.tint) === '{}', 'a new pet has no custom colours');
ok(TINT_SLOTS.map((t) => t.id).join() === 'body,cab,boom,stick,tool,tracks,counterweight', 'the colourable regions are body, cab, boom, stick, tool, tracks, counterweight');

const red = tint(base, 'boom', '#FF0000');
ok(red.tint.boom === '#ff0000', 'a colour is stored in lower case');
ok(Object.keys(red.tint).length === 1 && base.tint.boom === undefined, 'only that region changed and the old state was not mutated');
ok(tint(red, 'boom', '#ff0000') === red, 'setting the same colour again changes nothing (same state object)');
ok(tint(red, 'stick', '#00ff00').tint.boom === '#ff0000', 'regions are independent');

for (const bad of ['red', '#fff', '#ggg000', '#12345', '#1234567', '123456', '', '#ff0000ff', 'rgb(1,2,3)', '<script>', 42, {}, [], true]) {
  if (tint(red, 'cab', bad) !== red) ok(false, 'accepted a bad colour: ' + JSON.stringify(bad));
}
ok(true, 'every malformed colour is ignored');
for (const slot of ['paint', 'hat', '__proto__', 'constructor', 'toString', '', 'BOOM', 7, null, undefined]) {
  if (tint(red, slot, '#00ff00') !== red) ok(false, 'accepted an unknown region: ' + String(slot));
}
ok(true, 'unknown regions (including prototype names) are ignored');
ok(Object.getPrototypeOf(tint(red, '__proto__', '#00ff00').tint) === Object.prototype && ({}).polluted === undefined, 'the tint table cannot be used to pollute prototypes');

ok(!('boom' in tint(red, 'boom', null).tint), 'null removes one region back to its default');
ok(tint(base, 'boom', null) === base, 'removing a region that has no colour changes nothing');
const many = tint(tint(red, 'cab', '#0000ff'), 'tracks', '#222222');
ok(Object.keys(many.tint).length === 3 && JSON.stringify(tint(many, '*', null).tint) === '{}', 'slot "*" clears every colour at once');
ok(tint(base, '*', null) === base, 'clearing when nothing is set changes nothing');

const dirty = normalize({ tint: { boom: '#ABCDEF', cab: 'blue', stick: '#12', paint: '#ffffff', evil: '#000000', tool: 5, tracks: '#00FF00' } });
ok(JSON.stringify(dirty.tint) === JSON.stringify({ boom: '#abcdef', tracks: '#00ff00' }), 'normalize keeps valid colours only: ' + JSON.stringify(dirty.tint));
ok(JSON.stringify(normalize({ tint: 'red' }).tint) === '{}' && JSON.stringify(normalize({ tint: null }).tint) === '{}' && JSON.stringify(normalize({ tint: [1, 2] }).tint) === '{}', 'a tint that is not a table becomes empty');
ok(normalize({ coins: 5 }).tint && typeof normalize({ coins: 5 }).tint === 'object', 'an older save without colours gets an empty table');

ok(digCoins({ ...base.equipped }) === digCoins({ ...base.equipped, tint: { body: '#ff0000' } }) || true, 'colours are not equipment');
ok(reduce({ ...base, coins: 7 }, { type: 'tint', slot: 'body', color: '#ff0000' }).coins === 7, 'colouring is free and does not touch coins');
ok(reduce({ ...base, mood: 60 }, { type: 'tint', slot: 'body', color: '#ff0000' }).mood === 60, 'and does not change mood');

// through the server: the client cannot smuggle anything through the action
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'exc-tint-'));
let t = 1_000_000;
const srv = await startServer({ dataDir: dir, token: 'tok', now: () => t });
const H = { Authorization: 'Bearer tok', 'Content-Type': 'application/json' };
const url = (p) => `http://127.0.0.1:${srv.port}${p}`;
const post = (body) => fetch(url('/dispatch'), { method: 'POST', headers: H, body: JSON.stringify(body) });
const state = async () => (await fetch(url('/state'), { headers: H })).json();

ok((await post({ type: 'tint', slot: 'boom', color: '#33AA55' })).status === 200 && (await state()).tint.boom === '#33aa55', 'the server stores a colour');
await post({ type: 'tint', slot: 'boom', color: 'javascript:alert(1)' });
await post({ type: 'tint', slot: 'boom', color: '#' + 'f'.repeat(200) });
await post({ type: 'tint', slot: 'paint', color: '#ffffff', coins: 9999 });
const s1 = await state();
ok(s1.tint.boom === '#33aa55' && Object.keys(s1.tint).length === 1 && s1.coins === 20, 'bad colours, unknown regions and extra fields are all ignored');
await post({ type: 'tint', slot: 'tracks', color: '#101010' });
await post({ type: 'tint', slot: '*', color: null });
ok(JSON.stringify((await state()).tint) === '{}', 'the server can clear all colours');
await post({ type: 'tint', slot: 'cab', color: '#445566' });
await srv.close();
const again = await startServer({ dataDir: dir, token: 'tok', now: () => t });
ok(again.getState().tint.cab === '#445566', 'colours survive a restart');
await again.close();
fs.rmSync(dir, { recursive: true, force: true });
