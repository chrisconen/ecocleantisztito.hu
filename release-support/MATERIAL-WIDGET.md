# Photo-based material estimate: widget-only release overlay

The approved production pages remain the baseline. This change adds one isolated widget to the homepage, 33 upholstery city pages and the combined upholstery/mattress page. It does not publish the 52-page Studio redesign.

## Scope and routes

- Homepage: existing `#booking`.
- Other 34 pages: existing `#arak`.
- Kalocsa, Baja, Kiskőrös, Szekszárd, Paks, Solt, Dunaföldvár and the combined Mediterranean page retain their existing email inquiry flow. No calendar link is added.
- Runtime assets: `material-recognition/app.js`, `design.css`, `assets/fotel-bukle-olvasosarok.webp`. The photograph has its own source copy under `demo/material-recognition/assets/`; no uncommitted Studio asset is needed.

## Rebuild and verification

The builder uses the repository's existing Node/JSDOM QA setup (`%TEMP%/ecoclean-demo-qa/node_modules`) and the archived production inventory. It defaults to read-only planning.

```text
node demo/material-recognition/build-release-widget.mjs
node demo/material-recognition/build-release-widget.mjs --write
node release-support/verify-release.mjs
python release-support/verify-package.py
python release-support/test_widget_overlay.py
```

The original release manifest, its exact successful verification report and its approved Mediterranean manifest are archived in `material-widget-baseline/`. `material-widget-overlay.json` binds their hashes. All non-widget files must retain their original hashes. Removing the three owned marker blocks from each affected HTML document must restore its exact original bytes. The full verifier additionally compares the parsed original visible text, preventing markup comments from accidentally changing HTML parsing. The final manifest and verification report bind the shipped bytes.

The insertion points use JSDOM's actual element end-tag locations, not searches for strings such as `</head>` that may also occur inside old comments. The builder can be rerun without duplicating the widget.

## Public flow

The customer chooses a photo and starts one analysis. Provider and model selection remain entirely server-side. The optional private-reference consent starts unchecked and resets when a new photograph is selected. The privacy copy describes private cloud storage and possible synchronization to the owner's computer; no automatic training or public photo publication is claimed.

When health supplies `turnstile_site_key`, the client loads Cloudflare's script only after the explicit analysis action, renders a managed/compact challenge with `action: material-analysis`, and sends the resulting token as `turnstile_token`. Every attempt resets/removes the widget; retries require a new token. A failed script, failed challenge or cancelled action cannot post the image. Without a configured key, the existing local-demo mock flow remains usable. Photos and samples remain accessible if processing is unavailable.

Reference: [Cloudflare explicit rendering](https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/), [widget configuration](https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/widget-configurations/). Server-side verification is the Worker’s responsibility and is outside this frontend test boundary.

## Verification evidence

- Existing frontend unit tests: 7 passed.
- Offline provenance tests: 6 passed, including modified original HTML, unrelated assets, forged baseline proof, regional-link changes and approval metadata changes.
- Full release verifier: 142 HTML pages, 19,528 links, 2,007 asset references, 135 CSS files; zero issues.
- CI package gate: 355 files; zero errors.
- Release Turnstile browser tests: 12 responsive views across homepage/Győr/Kalocsa, nine intercepted mock POSTs, 15 reset cycles; zero issues. Includes success, failure, expiration, cancelled/stale callback, 503, blocked challenge script, no-key compatibility and unavailable service.
- All 35 release widgets: 210 default/sample views. No widget text overflow. The only document-width finding is the pre-existing Mosonmagyaróvár page at 320px: both the original baseline and widget version measure 359px. This unrelated original-page issue is preserved and is not represented as a new regression.
- Browser tests intercept all processing and challenge requests: zero live provider or live Turnstile calls. Live deployment and credentials are checked separately by the coordinating agent.

Browser evidence is under `demo/material-recognition/qa/`; release screenshots use `release-*-turnstile-{320,390,768,1440}.png`. Those contain a clearly marked local challenge placeholder, not a real Cloudflare challenge.
