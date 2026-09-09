# Informal Hungarian copy

The owner requires informal Hungarian (tegezés) throughout the site's own copy.
Address the visitor in the second person singular. FAQ questions addressed to
the ECO Clean team use second person plural. Preserve verbatim customer quotes.

The wording was delegated to the authenticated Claude CLI. `claude-map-*.json`
contains its exact before/after decisions. The small grammatical corrections
from Meridian's review are separately recorded in `editorial-review.json`.
The runner screens rendered HTML, accessible labels, metadata, JSON-LD and
JavaScript UI strings. Its temporary corpora and provider receipts remain local.

`build.mjs --write` applies reviewed wording by source range to the verified
release. `overlay.json` records original UTF-8 byte positions and both file
hashes. It never rewrites whole DOM documents. Changed local JavaScript assets
receive content-derived cache versions. Prices, numbers, routes, form IDs,
HTML structure and JavaScript logic are independently checked.

The copy layer follows the existing material-widget layer. Verification first
reverses only copy edits, checks the exact parent manifest/report, then runs the
original widget proof against the restored bytes. The historical baselines are
immutable. Do not replace them with a newly generated report to bypass a failure.

```powershell
node release-support/copy-tone/build.mjs --write
node release-support/copy-tone/extract.mjs --final
node release-support/verify-release.mjs
python release-support/verify-package.py
python demo/material-recognition/verify_copy_tone.py --final-corpus release-support/copy-tone/final-corpus.json
python release-support/verify-staged.py
```

Local Node tooling additionally requires `acorn` and `acorn-walk` in the existing
temporary QA package directory. CI uses dependency-free Python verification.

Future full/demo/widget rebuilds must deliberately rebase this copy layer onto
their newly reviewed release and reapply the wording maps before publishing.
The full-release and widget builders stop while this layer is active, preventing
an accidental restoration of the old mixed address forms. Original root/demo
inputs are not silently replaced with production output.

The residual scan is an editorial aid: third-person grammar (for example
"a családod töltse a nyarat") and quoted reviews are not formal address.
Browser checks mock write endpoints; they do not send orders or upload photos.
