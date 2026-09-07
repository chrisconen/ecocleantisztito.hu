# Build and publish the ECO Clean redesign

The public Pages artifact is `release/` only. Root HTML/CSS remain the original build inputs; the new styles and transforms are maintained in `demo/` and `release-support/`. Do not replace root inputs with generated release files. Local rollback archives are excluded from Git.

The existing build tools use Python and Node on Windows, with build-only packages in the temporary directory:

```powershell
npm install --prefix "$env:TEMP/ecoclean-demo-qa" jsdom@29.1.1 css-tree@3.2.1
python demo/build_demo.py
node demo/build_rollout.mjs
python release-support/booking-build.py
node release-support/build-supplemental.mjs
node release-support/build-release.mjs
node release-support/verify-release.mjs
node --test release-support/tests/booking-contract.test.mjs
python release-support/verify-package.py
```

Browser tests require Python Playwright/Chromium and a local HTTP preview at port 8089. `python release-support/qa/booking_ui.py` intercepts all booking submissions. Never test real order endpoints casually: they may create bookings and send notifications.

Preserve `release/**` bytes in Git using `.gitattributes`. After staging the exact release, workflow, manifest/report and maintenance sources, run `python release-support/verify-staged.py` before committing. It checks staged blob hashes against the verified manifest and rejects recognized private artifacts/credential signatures.

Push to `main` triggers `.github/workflows/deploy-pages.yml`. The job validates the exact prebuilt package with standard-library Python, uploads only `release/`, and deploys it through the `github-pages` environment. Wait for the run to succeed and verify the public content before declaring a release complete.

The owner authorized publication without the unavailable standalone privacy/terms/imprint documents. `publication-policy.json` lists these routes, and the builder removes their broken footer links. Other original content and existing service-condition sections remain intact.
