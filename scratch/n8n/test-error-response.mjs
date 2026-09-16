// Exercises the Build Error / Build Conflict Code nodes offline, both languages.
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';

const errCode = readFileSync('scratch/n8n/build-error-response.js', 'utf8');
const conCode = readFileSync('scratch/n8n/build-conflict-response.js', 'utf8');

function runErr(brain, language) {
    const ctx = vm.createContext({
        $: (name) => ({
            first: () => {
                if (name === 'The Brain (Logic)') return { json: brain };
                if (name === 'Webhook') {
                    if (language === null) throw new Error('node not executed');
                    return { json: { body: { lang: language } } };
                }
                throw new Error('unexpected node ' + name);
            },
        }),
    });
    return vm.runInContext(`(function(){${errCode}})()`, ctx)[0].json;
}

const brains = {
    OUT_OF_SERVICE_AREA: {
        error: 'OUT_OF_SERVICE_AREA', message: 'Ezt a címet nem tudtuk...',
        details: { requestedZone: 'UNKNOWN', reason: 'UNRECOGNIZED_OR_OUT_OF_AREA' },
        suggestion: { message: 'Kérjük, egyeztess...', action: 'CONTACT_SUPPORT' },
    },
    ZONE_INCOMPATIBLE: {
        error: 'ZONE_INCOMPATIBLE', message: 'Ez a nap már...',
        details: { dayZone: 'NYUGAT', dayZoneName: 'Nyugat-Dunántúl', requestedZone: 'DEL', requestedZoneName: 'Dél-Alföld' },
        suggestion: { message: 'Kérjük válasszon másik napot!', action: 'SHOW_ALTERNATIVE_DATES' },
    },
    ZONE_BALATON: {
        error: 'ZONE_INCOMPATIBLE', message: 'A Balaton régió...',
        details: { dayZone: 'BALATON', requestedZone: 'NYUGAT' },
        suggestion: { action: 'SHOW_ALTERNATIVE_DATES' },
    },
    DAY_FULL: {
        error: 'DAY_FULL', message: 'Sajnos ez a munka...',
        details: { earliestPossibleStart: '15:30', projectedFinish: '18:10', workEnd: '17:00' },
        suggestion: { action: 'SHOW_NEXT_AVAILABLE' },
    },
};

for (const [name, brain] of Object.entries(brains)) {
    const hu = runErr(brain, 'hu');
    const en = runErr(brain, 'en');
    assert.equal(hu.message, brain.message, `${name}: HU must pass The Brain's message through unchanged`);
    // Region names inside quotes are proper nouns and stay Hungarian by design,
    // so strip them before checking that the prose itself is English.
    const prose = en.message.replace(/"[^"]*"/g, '""');
    assert.ok(!/[áéíóöőúüű]/i.test(prose), `${name}: EN prose still has Hungarian: ${prose}`);
    assert.equal(en.error, brain.error);
    assert.equal(en.language, 'en');
    console.log(`  ${name.padEnd(20)} EN: ${en.message.slice(0, 95)}`);
}

// Interpolated details must actually appear.
assert.ok(runErr(brains.DAY_FULL, 'en').message.includes('15:30'));
assert.ok(runErr(brains.DAY_FULL, 'en').message.includes('18:10'));
assert.ok(runErr(brains.ZONE_INCOMPATIBLE, 'en').message.includes('Nyugat-Dunántúl'), 'zone names are proper nouns, kept');
assert.ok(runErr(brains.ZONE_BALATON, 'en').message.includes('Lake Balaton'));

// Unknown error code still yields English prose, not a Hungarian fallback.
const unknown = runErr({ error: 'SOMETHING_NEW', message: 'Valami hiba', details: {}, suggestion: {} }, 'en');
assert.equal(unknown.message, 'This appointment cannot be booked.');

// If Normalize never ran, the node must not throw — it falls back to Hungarian.
const noNormalize = runErr(brains.DAY_FULL, null);   // Webhook node unreachable
assert.equal(noNormalize.language, 'hu');
assert.equal(noNormalize.message, brains.DAY_FULL.message);

// ── conflict node ────────────────────────────────────────────────────────────
function runCon(language) {
    const ctx = vm.createContext({
        $: (name) => ({
            first: () => {
                if (name === 'Slot Still Free?') return { json: { conflictInfo: { x: 1 } } };
                return { json: { body: { lang: language } } };
            },
        }),
    });
    return vm.runInContext(`(function(){${conCode}})()`, ctx)[0].json;
}
assert.ok(/foglalt/.test(runCon('hu').message));
assert.equal(runCon('en').message, 'This time slot has just been taken. Please choose another one.');
assert.deepEqual(runCon('en').conflictInfo, { x: 1 });

console.log('✓ error + conflict responses: English for every branch, Hungarian unchanged, safe fallback');
