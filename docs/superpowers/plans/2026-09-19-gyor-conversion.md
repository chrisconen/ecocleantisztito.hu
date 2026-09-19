# Győr reference-led booking page implementation plan

> **For agentic workers:** Execute the bounded tasks inline in this session; preserve the existing verified release pipeline.

**Goal:** Improve the Hungarian and English Győr upholstery pages with authentic before/after photographs, visible local prices, existing Google reputation and a clear calculator-to-booking route.

**Architecture:** Add a scoped conversion module to the reversible content-clarity overlay. Copy four owner-provided JPEGs and two scoped UI assets with explicit source hashes. Preserve city tariff rules, existing URLs, booking logic and all other cities.

**Tech Stack:** Static HTML/CSS, progressive JavaScript, existing Node/Python build and Playwright.

## Evidence and boundaries

- Owner says discovery continues but orders fell; price sensitivity is a hypothesis, not a measured cause.
- Owner authorizes use of the original img photographs and writing accompanying copy. No invented customers, locations, causes, job durations or historical prices. Current prices are explicitly current tariff examples, not invoices for the pictured jobs.
- Cleaning product names and formulations remain private.
- Existing reviews endpoint identifies Kárpittisztítás ECO Clean, rating 5 and 212 total, updated 2026-09-19. This is aggregate reputation, not 212 five-star reviews. Use the endpoint's exact business CID and live summary, with a neutral link fallback.
- Visually checked original pairs: karpittisztitas-elott-2/utan-2; kanapé before/after 12; szék before/after 1. Do not use the visually reversed unnumbered upholstery WebP pair.
- No review solicitation, customer messages, fabricated availability, new analytics vendor or ad spending in this change.

## Tasks

- [x] Add `release-support/gyor-conversion/page.mjs`, `conversion.css`, `conversion.js`, `assets.json`. The page module edits only the HU/EN Győr upholstery pages; the CSS is scoped to `eco-gyor-conversion`; native side-by-side images work without JS. Current prices derive from tariff.json. Reviews use the already configured endpoint, validate business identity/numeric values, and never turn an unavailable source into invented proof.
- [x] Integrate the module in `release-support/content-clarity/prepare.mjs` before versioning. Extend `build.py` and `verify-content-clarity-overlay.py` to hash and verify explicit added sources, reject path escapes/collisions, and keep the untouched historical parent proof.
- [x] Replace the large generated hero and old fictional reference story with authentic images and precise copy. Move the existing calculator directly after the new evidence/review section. Keep all pre-existing functional section IDs. Use a mobile booking bar that yields to navigation and the calculator.
- [x] Adjust only historical hero/photo retention to check the restored parent in `release-support/studio/verify-content.mjs`; verify the new current photo mapping in the conversion checks.
- [x] Run `node release-support/content-clarity/prepare.mjs`, then `python release-support/content-clarity/build.py`.
- [x] Run Playwright at 320, 390, 768 and 1440 px in HU/EN: no overflow; exact image pairs; free city scope; CTA/calculator handoff 7900; keyboard and mobile menu; review success, malformed data and unavailable fallback; no third-party writes.
- [x] Run existing tariff/navigation tests and the full release/package gates. Record the final state and release evidence.

## Failure modes and long-term maintenance

Live rating/count must remain separate from individual review claims. A failed review request leaves a working Google link. City prices must never be implied for surrounding villages. Existing photos vary in light/angle, so comparisons are side by side rather than falsely aligned sliders. The existing aggregate data source is a trust boundary: validate the business identifier before using it. Four lazy JPEGs add about 1.1 MB below the first screen; hero uses existing small WebPs. Keep local tariff values generated from the authoritative tariff file.

## Verification and release status

Implemented and visually checked both language pages at 320/390/768/1440 px. All 46 existing checks, 15 browser flows, three asset-boundary checks and the full release gate pass. Independent review findings were fixed and re-reviewed. Browser tests block external writes. Publication is the remaining release step.
