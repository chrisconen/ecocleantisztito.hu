# English site overlay (2026-09-16)

The site now serves an English version of the upholstery and mattress pages and
of the booking homepage, at `/en/`. This layer adds it to the already verified
release package without rebuilding it, so the reviewed widget, copy, Studio,
review, booking-extras and price layers below stay intact.

## Why it is a layer and not a root change

The first attempt put the English strings in the root `booking-config.js`. That
broke the booking-extras proof: `apply_changes()` locates each changed hunk in
the **published** runtime, and the copy layer has already rewritten that runtime
to informal Hungarian —

```
published: summary-empty">Válassz szolgáltatást a kezdéshez...
root:      summary-empty">Válasszon szolgáltatást a kezdéshez...
```

so a wrapper keyed on the formal string has nothing to match. English therefore
has to be derived from the published artifact, which is what this layer does.

## What it changes

Almost everything is **additive**, so no Hungarian byte below moves:

* `en/*.html` — 69 pages, generated from the published Hungarian pages by
  `scratch/i18n.mjs` (tag-masked translation; the translator never sees markup).
* `ui/booking-live-en.js` — the published runtime with display strings replaced
  at proven byte offsets by `scratch/build-en-runtime.mjs`. Prices, durations,
  endpoints and every logic value (`Kárpit`, `Magánszemély`, `Haziallat`, …) are
  byte-identical to the Hungarian runtime; amounts group as `en-GB`; both
  payloads carry `lang: 'en'`, which is what the n8n workflow branches on to
  pick the customer's confirmation language.

The only edits to existing artifacts are, per Hungarian page, the reciprocal
hreflang block and the language switcher, plus the new `sitemap.xml` entries.
`overlay.json` records the pinned parent manifest/report, and for every edited
page the exact inserted text with its before/after hashes.

Verification removes exactly those insertions, requires the result to equal the
pinned parent bytes, requires every added file to be genuinely new, re-checks
that the English runtime kept the Hungarian prices/endpoints/logic values, and
then runs the price proof against the restored package.

The historical baselines are immutable. Do not regenerate them to bypass a failure.

```powershell
node scratch/build-en-runtime.mjs
$env:I18N_SRC="release"; node scratch/i18n.mjs extract
node scratch/i18n.mjs verify
node scratch/i18n.mjs reinject
python release-support/english-overlay/build.py
python release-support/verify-english-overlay.py
node release-support/verify-release.mjs
python release-support/verify-package.py
node --test release-support/tests/booking-contract.test.mjs
node --test release-support/tests/booking-en-contract.test.mjs
```

**Order matters.** `build.py` inserts hreflang into the Hungarian pages, which
shifts every byte offset recorded by `extract`. Always `extract` and `reinject`
against pristine pages, then build the overlay. `scratch/i18n.mjs` now stores a
hash per source file and refuses to reinject against changed bytes, because
getting this wrong spliced translated text into the middle of `<link>` tags.

Re-running `build.py` is idempotent: it removes the recorded insertions first,
so a changed rule rebases instead of stacking a second set.

## Not included

`adatvedelem.html` and `aszf.html` stay out, per
`release-support/publication-policy.json`. The English pages therefore carry no
link to them either.
