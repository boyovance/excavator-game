import { DEFAULT_SETTINGS, mergeSettings, normalizeSettings, sanitizePatch, isQuiet, CHATTER_FACTOR } from '../src/shared/settings.mjs';

const ok = (c, m) => console.log((c ? 'PASS ' : 'FAIL ') + m);
const at = (h, m) => new Date(2026, 0, 1, h, m);

ok(JSON.stringify(normalizeSettings(null)) === JSON.stringify(DEFAULT_SETTINGS), 'null -> defaults');
ok(normalizeSettings({ skin: 'flat', scale: 4 }).skin === 'flat' && normalizeSettings({ skin: 'flat', scale: 4 }).chatter === 'normal', 'old settings.json (skin/scale only) still loads');

const bad = sanitizePatch({ skin: 42, scale: 99, autoStart: 'yes', chatter: 'shout', notify: 1, petVisible: null, quiet: { enabled: 'x', from: '25:00', to: '7pm' }, evil: true, __proto__: { x: 1 } });
ok(Object.keys(bad).length === 0, 'malformed fields all dropped: ' + JSON.stringify(bad));
ok(!('evil' in sanitizePatch({ evil: 1 })), 'unknown keys dropped');
ok(sanitizePatch({ chatter: 'toString' }).chatter === undefined && sanitizePatch({ chatter: 'constructor' }).chatter === undefined, 'prototype names are not valid chatter values');
ok(sanitizePatch({ skin: 'x'.repeat(65) }).skin === undefined && sanitizePatch({ skin: '' }).skin === undefined, 'skin id length bounded');

const merged = mergeSettings(DEFAULT_SETTINGS, { quiet: { enabled: true } });
ok(merged.quiet.enabled === true && merged.quiet.from === '23:00' && merged.quiet.to === '07:00', 'quiet patch merges field-by-field');
ok(mergeSettings(merged, { quiet: { from: '22:30' } }).quiet.enabled === true, 'later partial quiet patch keeps other fields');
ok(DEFAULT_SETTINGS.quiet.enabled === false, 'merge does not mutate defaults');
ok(mergeSettings(DEFAULT_SETTINGS, { autoStartSupported: true }).autoStartSupported === undefined, 'read-only field cannot be set by a patch');

ok(sanitizePatch({ display: '12345' }).display === '12345' && sanitizePatch({ display: 'primary' }).display === 'primary', 'display accepts primary or numeric id');
ok(sanitizePatch({ display: '../x' }).display === undefined && sanitizePatch({ display: '12ab' }).display === undefined && sanitizePatch({ display: 7 }).display === undefined, 'display rejects anything else');
ok(DEFAULT_SETTINGS.display === 'primary', 'display defaults to primary');

ok(DEFAULT_SETTINGS.jobMode === 'stay', 'jobMode defaults to staying on the desktop');
ok(sanitizePatch({ jobMode: 'away' }).jobMode === 'away' && sanitizePatch({ jobMode: 'stay' }).jobMode === 'stay', 'jobMode accepts stay and away');
ok(sanitizePatch({ jobMode: 'vanish' }).jobMode === undefined && sanitizePatch({ jobMode: 1 }).jobMode === undefined, 'jobMode rejects anything else');
ok(normalizeSettings({ skin: 'pixel', scale: 3 }).jobMode === 'stay', 'old settings files gain the default jobMode');

ok(DEFAULT_SETTINGS.onboarding === 'welcome', 'new installs start at the welcome step');
ok(['welcome', 'poke', 'garage', 'job', 'done'].every((s) => sanitizePatch({ onboarding: s }).onboarding === s), 'every guide step is accepted');
ok(sanitizePatch({ onboarding: 'finished' }).onboarding === undefined && sanitizePatch({ onboarding: true }).onboarding === undefined && sanitizePatch({ onboarding: 'toString' }).onboarding === undefined, 'unknown guide steps are rejected');

const night = { quiet: { enabled: true, from: '23:00', to: '07:00' } };
ok(isQuiet(night, at(23, 0)) && isQuiet(night, at(3, 30)) && isQuiet(night, at(6, 59)), 'overnight window active at 23:00, 03:30, 06:59');
ok(!isQuiet(night, at(7, 0)) && !isQuiet(night, at(12, 0)) && !isQuiet(night, at(22, 59)), 'overnight window inactive at 07:00, noon, 22:59');
const day = { quiet: { enabled: true, from: '09:00', to: '17:30' } };
ok(isQuiet(day, at(9, 0)) && isQuiet(day, at(17, 29)) && !isQuiet(day, at(17, 30)) && !isQuiet(day, at(8, 59)), 'same-day window boundaries');
ok(!isQuiet({ quiet: { enabled: false, from: '00:00', to: '23:59' } }, at(12, 0)), 'disabled -> never quiet');
ok(!isQuiet({ quiet: { enabled: true, from: '10:00', to: '10:00' } }, at(10, 0)), 'empty window -> never quiet');
ok(CHATTER_FACTOR.off === 0 && CHATTER_FACTOR.low > CHATTER_FACTOR.normal && CHATTER_FACTOR.normal > CHATTER_FACTOR.high, 'chatter factors ordered');
