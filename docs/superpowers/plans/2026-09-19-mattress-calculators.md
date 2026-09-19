# Mattress calculators implementation plan

**Goal:** Add an on-page mattress calculator to all 26 online-booking cities in HU/EN, preserving the seven southern inquiry-only cities and all current tariffs.
**Architecture:** New focused UI calls the unchanged `EcoStudioConfig.validate/calculate/encode` API. No new pricing logic, no customer writes. City, mattress variants, quantities, wet treatment, frames and travel zone transfer through the existing explicit booking import. The existing source page identity is already accepted by the shared API.
**Visual direction:** Existing cream/sage ECO Clean palette, serif headings, compact size/side selector and readable itemised estimate. Accessible native controls; mobile first.

- [x] Add scoped renderer/CSS and exact overlay adapter in `release-support/mattress-calculator/`; map public assets via the existing addition mechanism.
- [x] Insert calculator immediately after each classic mattress hero; point all local booking calls to it. Preserve original price grids and local navigation. Keep southern calculators and inquiry flow intact.
- [x] Verify all 66 pages and unchanged financial runtime hashes, HU/EN labels/anchors, multi-variant and mixed-side calculations, extras, travel-zone changes, item removal/reset and explicit transfer into the new form. All 54 automated checks pass.
- [x] Browser-check representative cities and breakpoints, including default Mattress service after import; block external writes. All 14 scenarios pass (320/390/1440 px). Independent review: no material findings. Full release gate: zero issues.
- [ ] Complete package/staged gates, publish and verify live artifacts.

Trust boundary: URL carts remain untrusted and are validated by the existing decoder and tariff compatibility check. No appointment is selected or sent automatically. Visible estimates derive solely from the published pricing API; surrounding Győr villages continue to use the standard tariff. An API loading failure shows a phone fallback rather than a fabricated price.
