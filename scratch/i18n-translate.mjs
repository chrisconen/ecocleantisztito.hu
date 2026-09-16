#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Batch translation driver. Splits scratch/i18n/strings.hu.json into small JSON
// batches, hands each to an external agent CLI (codex / opencode), validates the
// result and merges it into strings.en.json.
//
//   node scratch/i18n-translate.mjs --engine codex --jobs 4
//   node scratch/i18n-translate.mjs --engine codex --limit 1        # smoke test
//   node scratch/i18n-translate.mjs --engine opencode --model llamacpp-qwen38/qwen38
//
// Resumable: strings already present in strings.en.json are never re-sent, so a
// crashed or interrupted run is restarted by simply running the command again.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'scratch', 'i18n');
const BATCHES = join(OUT, 'batches');
const EN_PATH = join(OUT, 'strings.en.json');

const argv = process.argv.slice(2);
const arg = (name, def) => {
    const i = argv.indexOf(`--${name}`);
    return i === -1 ? def : argv[i + 1];
};
const ENGINE = arg('engine', 'codex');
const MODEL = arg('model', null);
const JOBS = Number(arg('jobs', 4));
const LIMIT = Number(arg('limit', Infinity));
const BUDGET = Number(arg('budget', 5000));   // chars of Hungarian per batch
const EFFORT = arg('effort', 'medium');       // translation needs no deep reasoning
const TIMEOUT = Number(arg('timeout', 900)) * 1000;

// codex writes files through PowerShell, which prepends a UTF-8 BOM. require()
// tolerates it but JSON.parse does not — without this strip, finished batches
// were silently discarded as "no usable output".
const readJson = (p) => JSON.parse(readFileSync(p, 'utf8').replace(/^﻿/, ''));

// ── placeholder integrity ────────────────────────────────────────────────────

const placeholders = (s) => (s.match(/<\/?\d+\/?>/g) || []).slice().sort().join(',');

function validate(hu, en) {
    if (typeof en !== 'string' || !en.trim()) return 'empty';
    if (placeholders(hu) !== placeholders(en)) return 'placeholder mismatch';
    // Catch whole Hungarian function words left untranslated. \b is ASCII-only,
    // so it finds "és" inside "cafés" and "meg" inside "Sümeg" — the boundary
    // must be Unicode-aware or correct translations get rejected.
    if (/(?<!\p{L})(és|vagy|hogy|nem|meg|már|című|amely|tisztítás|kárpit)(?!\p{L})/iu.test(en)) {
        return 'untranslated Hungarian';
    }
    return null;
}

// ── batching ─────────────────────────────────────────────────────────────────

function buildBatches() {
    const hu = readJson(join(OUT, 'strings.hu.json'));
    const done = existsSync(EN_PATH) ? readJson(EN_PATH) : {};
    const todo = Object.keys(hu).filter((k) => done[k] === undefined);

    // Longest first so one oversized string cannot straggle at the end of a run.
    todo.sort((a, b) => hu[b].length - hu[a].length);

    const batches = [];
    let cur = {}, size = 0;
    for (const k of todo) {
        cur[k] = hu[k];
        size += hu[k].length;
        if (size >= BUDGET) { batches.push(cur); cur = {}; size = 0; }
    }
    if (Object.keys(cur).length) batches.push(cur);
    return { hu, done, batches };
}

// ── engine invocation ────────────────────────────────────────────────────────

function promptFor(inFile, outFile) {
    return `You are a professional Hungarian-to-English marketing translator.

Read the JSON object in ${inFile}. Every value is a Hungarian user-visible string
from the ECO Clean cleaning-company website. Translate each value into English.

Follow scratch/i18n/GLOSSARY.md exactly — it is binding, especially the rules on
placeholders (<0> </0> <3/>), proper nouns, prices and emoji.

Write the result to ${outFile} as a JSON object with EXACTLY the same keys, where
each value is the English translation. Output valid UTF-8 JSON and nothing else —
no markdown fence, no commentary. Do not modify any other file.

Check before you finish: same number of keys as the input, and every placeholder
token from each source string present exactly once in its translation.`;
}

// The prompt goes to a file and argv carries only a short pointer to it: the CLIs
// are .cmd shims on Windows, so they need shell:true, and a multi-line prompt
// with quotes and emoji does not survive cmd.exe argument splitting.
function runEngine(inFile, outFile, promptFile) {
    writeFileSync(join(ROOT, promptFile), promptFor(inFile, outFile));
    const pointer = `Read the file ${promptFile} and do exactly what it says.`;
    const cmd = ENGINE === 'codex'
        ? `codex exec --sandbox workspace-write -c model_reasoning_effort="${EFFORT}"${MODEL ? ` --model ${MODEL}` : ''} "${pointer}"`
        : `opencode run${MODEL ? ` --model ${MODEL}` : ''} "${pointer}"`;

    // stdin MUST be closed: `codex exec` otherwise blocks forever on
    // "Reading additional input from stdin..." waiting for an EOF that an
    // inherited pipe never delivers.
    return new Promise((resolve) => {
        const p = spawn(cmd, { cwd: ROOT, shell: true, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
        let stdout = '', stderr = '';
        p.stdout.on('data', (d) => { stdout += d; });
        p.stderr.on('data', (d) => { stderr += d; });
        const kill = setTimeout(() => p.kill('SIGKILL'), TIMEOUT);
        p.on('close', (code) => { clearTimeout(kill); resolve({ err: code ? new Error(`exit ${code}`) : null, stdout, stderr }); });
        p.on('error', (e) => { clearTimeout(kill); resolve({ err: e, stdout, stderr }); });
    });
}

// ── main ─────────────────────────────────────────────────────────────────────

// Re-validates and merges every out-*.json already on disk. Batches whose output
// was written but never merged (e.g. discarded by the BOM parse bug) are
// recovered here without paying an LLM for the same work twice.
function runMerge() {
    const hu = readJson(join(OUT, 'strings.hu.json'));
    const merged = existsSync(EN_PATH) ? readJson(EN_PATH) : {};
    const before = Object.keys(merged).length;
    const rejected = [];
    let files = 0;

    for (const f of readdirSync(BATCHES).filter((f) => /^out-\w+\.json$/.test(f)).sort()) {
        const inFile = join(BATCHES, f.replace('out-', 'in-'));
        if (!existsSync(inFile)) continue;
        let batch, result;
        try { batch = readJson(inFile); result = readJson(join(BATCHES, f)); } catch { continue; }
        files++;
        for (const k of Object.keys(batch)) {
            if (merged[k] !== undefined) continue;
            const problem = validate(batch[k], result[k]);
            if (problem) rejected.push({ k, hu: batch[k], en: result[k] ?? null, problem });
            else merged[k] = result[k];
        }
    }
    writeFileSync(EN_PATH, JSON.stringify(merged, null, 2));
    writeFileSync(join(OUT, 'rejected.json'), JSON.stringify(rejected, null, 2));
    const now = Object.keys(merged).length;
    console.log(`merged ${files} batch file(s): ${before} -> ${now} strings (+${now - before})`);
    console.log(`still untranslated: ${Object.keys(hu).length - now}`);
    if (rejected.length) {
        const by = {};
        for (const r of rejected) by[r.problem] = (by[r.problem] || 0) + 1;
        console.log('rejected:', by);
        for (const r of rejected.slice(0, 6)) console.log(`   [${r.problem}] ${r.hu.slice(0, 60)}  ->  ${String(r.en).slice(0, 60)}`);
    }
}

async function main() {
    mkdirSync(BATCHES, { recursive: true });
    const { hu, done, batches } = buildBatches();
    const planned = batches.slice(0, LIMIT);
    console.log(`${Object.keys(hu).length} strings total, ${Object.keys(done).length} already translated`);
    console.log(`${batches.length} batch(es) to go; running ${planned.length} with engine=${ENGINE}${MODEL ? ` model=${MODEL}` : ''}, jobs=${JOBS}\n`);

    const merged = { ...done };
    const rejected = [];
    let next = 0, completed = 0;

    const worker = async () => {
        while (next < planned.length) {
            const idx = next++;
            const batch = planned[idx];
            // Name batches by content, not by position in this run: a second
            // run produces a different batch at index 0 and would otherwise
            // overwrite the first run's in-000 while leaving its out-000, so
            // --merge would pair mismatched files.
            const n = createHash('sha1').update(Object.keys(batch).join()).digest('hex').slice(0, 10);
            const inFile = `scratch/i18n/batches/in-${n}.json`;
            const outFile = `scratch/i18n/batches/out-${n}.json`;
            writeFileSync(join(ROOT, inFile), JSON.stringify(batch, null, 2));

            const { err, stderr } = await runEngine(inFile, outFile, `scratch/i18n/batches/prompt-${n}.md`);
            let result = null;
            try { result = readJson(join(ROOT, outFile)); } catch { /* handled below */ }

            if (!result) {
                console.log(`✗ batch ${idx}: no usable output${err ? ` (${String(err.message).split('\n')[0]})` : ''}`);
                if (stderr) console.log(`   ${stderr.split('\n').slice(0, 2).join(' ')}`);
                completed++;
                continue;
            }
            let ok = 0;
            for (const k of Object.keys(batch)) {
                const problem = validate(batch[k], result[k]);
                if (problem) rejected.push({ k, hu: batch[k], en: result[k], problem });
                else { merged[k] = result[k]; ok++; }
            }
            completed++;
            console.log(`✓ batch ${idx}: ${ok}/${Object.keys(batch).length} accepted   [${completed}/${planned.length}]`);
            writeFileSync(EN_PATH, JSON.stringify(merged, null, 2));   // checkpoint
        }
    };

    await Promise.all(Array.from({ length: Math.min(JOBS, planned.length) }, worker));

    writeFileSync(EN_PATH, JSON.stringify(merged, null, 2));
    writeFileSync(join(OUT, 'rejected.json'), JSON.stringify(rejected, null, 2));
    console.log(`\ntranslated: ${Object.keys(merged).length}/${Object.keys(hu).length}`);
    if (rejected.length) {
        console.log(`rejected:   ${rejected.length}  (see scratch/i18n/rejected.json)`);
        for (const r of rejected.slice(0, 5)) console.log(`   [${r.problem}] ${r.hu.slice(0, 70)}`);
    }
}

if (argv.includes('--merge')) runMerge(); else main();
