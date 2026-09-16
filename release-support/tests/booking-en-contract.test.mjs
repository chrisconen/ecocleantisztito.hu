// The English booking runtime must behave EXACTLY like the Hungarian one:
// same prices, same durations, same payload shape, same endpoint — differing
// only in the display strings and the `lang` flag the n8n workflow branches on.
//
// This reuses the Hungarian contract harness by running it against the English
// build, so a mistranslated logic value (serviceType, customerType, condition
// keys) fails here instead of in production.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const hu = fs.readFileSync(new URL('../../release/ui/booking-live.js', import.meta.url), 'utf8');
const en = fs.readFileSync(new URL('../../release/ui/booking-live-en.js', import.meta.url), 'utf8');

const constants = (source, name) => {
    const m = source.match(new RegExp(`const ${name} = (\\{[\\s\\S]*?\\n\\});`));
    assert.ok(m, `${name} not found`);
    return new Function(`return ${m[1]}`)();
};

test('English runtime parses and is a single evaluable program', () => {
    assert.doesNotThrow(() => new Function(en));
});

test('every price, duration and side count is identical to the Hungarian runtime', () => {
    const a = constants(hu, 'PRICING'), b = constants(en, 'PRICING');
    assert.deepEqual(Object.keys(a), Object.keys(b));
    for (const group of ['karpit', 'matrac']) {
        assert.deepEqual(Object.keys(a[group]), Object.keys(b[group]), `${group} item ids drifted`);
        for (const id of Object.keys(a[group])) {
            const x = a[group][id], y = b[group][id];
            for (const field of ['price', 'duration', 'sides', 'atkaPrice', 'agyazhatoPrice', 'wetPrice', 'framePrice']) {
                assert.equal(y[field], x[field], `${group}.${id}.${field} changed`);
            }
            assert.notEqual(y.name, undefined);
        }
    }
    for (const zone of Object.keys(a.travelZones)) {
        assert.equal(b.travelZones[zone].fee, a.travelZones[zone].fee, `travel fee ${zone} changed`);
    }
});

test('discounts and pillow pricing are unchanged', () => {
    for (const name of ['DISCOUNTS', 'PILLOW_CLEANING', 'LARGE_ORDER']) {
        const a = constants(hu, name), b = constants(en, name);
        for (const key of Object.keys(a)) {
            const x = a[key], y = b[key];
            if (typeof x === 'object' && x !== null) {
                for (const f of ['percent', 'price', 'duration', 'threshold']) {
                    if (x[f] !== undefined) assert.equal(y[f], x[f], `${name}.${key}.${f} changed`);
                }
            } else if (typeof x !== 'string') {
                assert.deepEqual(y, x, `${name}.${key} changed`);
            }
        }
    }
});

test('service, customer and condition keys are NOT translated', () => {
    // These are compared against in code; translating them breaks the flow.
    for (const value of ["'Kárpit'", "'Matrac'", "'Mindkettő'", "'Magánszemély'", "'Haziallat'", "'Allergias'"]) {
        assert.ok(en.includes(value), `logic value ${value} was translated away`);
        assert.equal(
            (en.match(new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length,
            (hu.match(new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length,
            `occurrences of ${value} changed`);
    }
});

test('endpoints are unchanged — the backend branches on lang, not on the URL', () => {
    for (const url of hu.match(/https:\/\/[^\s'"`]+/g) || []) {
        assert.ok(en.includes(url), `endpoint ${url} missing from the English runtime`);
    }
});

test('both payloads carry lang: en', () => {
    assert.equal((en.match(/lang: 'en'/g) || []).length, 2);
    assert.equal((hu.match(/lang: 'en'/g) || []).length, 0, 'Hungarian runtime must not be tagged');
});

test('amounts are grouped for an English reader', () => {
    assert.ok(!en.includes("toLocaleString('hu-HU')"), 'hu-HU grouping left in the English runtime');
    assert.ok(en.includes("toLocaleString('en-GB')"));
});

test('item labels are actually English', () => {
    const b = constants(en, 'PRICING');
    assert.equal(b.karpit.szofa.name, 'Sofa / daybed');
    assert.equal(b.matrac.francia_ab.name, 'Double mattress 140/160/180×200 cm (sides A+B)');
    assert.equal(b.travelZones.belvaros.label, 'Town centre');
});
