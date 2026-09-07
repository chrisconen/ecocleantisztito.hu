# ECO Clean production release implementation plan

> **For agentic workers:** Use subagent-driven-development to implement the bounded work below. User has authorized execution and eventual replacement/deployment after readiness checks.

**Goal:** Release the approved redesign at the existing URLs with working booking and a revised design for seven cities.

**Architecture:** Preserve the original source while constructing an independent `release/` package. Generate production HTML from the approved demo, restore the original backend contracts with guarded error handling, and include only runtime dependencies. Replace the deployed version only after verification and a recoverable backup.

**Tech Stack:** Static HTML/CSS/JavaScript, Node/JSDOM builders, Python Playwright, existing booking webhooks, GitHub Pages.

---

## 1. Booking integration

Files: `release-support/booking-live.js`, `release-support/calendar-live.js`, `release-support/tests/booking*`, integration notes.

- [x] Preserve source pricing and all booking payload fields; restore actual availability responses.
- [x] Reject missing or stale slots, invalid form state and unsuccessful HTTP-200 responses; avoid customer-data logging and unsafe success-message interpolation.
- [x] Exercise ordinary and large orders with intercepted requests, including failures and availability races. Never submit a real customer order as a test.

## 2. Seven-city redesign

Files: `demo/regional-redesign.css`, `demo/build_rollout.mjs`, `demo/qa/regional_redesign_probe.py`.

- [x] Add `eco-regional-redesign` and the scoped stylesheet only to upholstery/mattress pages for Kalocsa, Baja, Kiskőrös, Szekszárd, Paks, Solt and Dunaföldvár.
- [x] Match the approved ivory/sage visual direction, retain original texts and navigation, preserve all previously requested grid and image corrections.
- [x] Render all fourteen pages at desktop, tablet and mobile widths; inspect representative hero, pricing, comparison and health screenshots.

## 3. Standalone release

Files: `release-support/build-release.mjs`, `release-support/verify-release.mjs`, `release-support/RELEASE-AUDIT.md`, generated `release/`.

- [x] Remove preview notices, noindex tags and sample completion; map assets and scripts to package-local URLs.
- [x] Adapt homepage interactions to live booking and copy only verified runtime dependencies, CNAME, verification files, robots and sitemap.
- [x] Verify every generated page, local link, CSS dependency, canonical URL and sitemap entry; record hashes in a release manifest.
- [x] Investigate missing legal/service pages. Supply four service pages from existing generic source copy. Owner authorized publication without the unavailable legal documents on 2026-09-07; omit broken links and do not fabricate documents.

Commands:

```powershell
python demo/build_demo.py
node demo/build_rollout.mjs
node demo/verify_rollout.mjs
node release-support/build-release.mjs
node release-support/verify-release.mjs
python demo/qa/regional_redesign_probe.py
```

Expected: no changed original business copy except explicitly approved preview/live labels; no missing runtime dependencies; all booking requests intercepted during tests.

## 4. Review and deployment

- [x] Review requirements first, then implementation quality; resolve material findings.
- [x] Archive and hash the existing tracked production revision and record its Git commit.
- [x] Publish only the verified package and needed maintainable build sources, excluding credentials, caches, QA screenshots and obsolete public HTML.
- [x] Wait for the GitHub Pages build and verify live pages/assets, HTTPS behavior and read-only integration responses.

## Boundaries and failure modes

The existing server remains authoritative for availability and booking acceptance. Browser calculations preserve the source behavior and cannot establish server-side capacity guarantees. A build passing mock tests does not prove that the remote booking workflow will deliver notifications. Known limitations and owner decisions are recorded in the release status; document omissions are governed by the explicit publication policy.

Published https://ecocleantisztito.hu/ through successful Actions run `34127955341`, release commit `72ba0c43bd4bf0818630a5e2a96fcbaf3a1aeca9`. All 170 broken legal-document links were removed under the owner's authorization. Original build inputs and the hashed backup remain available locally. Detailed verification and HTTPS operational limitations: `release-support/RELEASE-STATUS.md`.
