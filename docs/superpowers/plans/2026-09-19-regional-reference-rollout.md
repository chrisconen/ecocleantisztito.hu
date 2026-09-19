# Regional reference-led page rollout

**Goal:** Apply the approved Győr upholstery layout to the other 32 city pages in HU/EN while preserving all current tariffs, travel fees, contacts and booking/inquiry behavior.

**Architecture:** Reuse the rendered Győr hero and reference components via a separate regional adapter after the Győr overlay. Keep original page family styles, calculators, IDs, scripts, canonicals and city navigation. Snapshot financial/booking runtimes and existing calculator/price sections before editing.

**Boundaries:** 25 non-Győr Studio cities use the existing online booking handoff. Seven southern Mediterranean cities retain their distinct prices and inquiry-only flow. References are brand-wide original work, not claimed to have been photographed in each city. Free travel and Győr discounts do not propagate.

- [x] Pin the existing runtimes and original calculator/price sections in `rollout-baseline.json`.
- [x] Add `regional.mjs`, deriving the new headline prices from each actual calculator catalogue, localizing city names, maintaining chargeable travel and the existing inquiry/booking destination.
- [x] Adapt the shared mobile bar to target the existing calculator anchor for each family; preserve all calculator scripts byte-for-byte.
- [x] Verify all 64 new pages have the intended layout, original price sections, unchanged financial runtime hashes, correct language/contacts/anchors and no free-travel claim.
- [x] Browser-check representative Studio and Mediterranean pages at mobile/tablet/desktop sizes, both language handoffs and every travel-zone fee. All 32 regional cases and 15 Győr cases pass.
- [x] Run existing 46 checks plus 3 rollout checks, full release gate and independent review. All pass; the release gate reports zero issues.
- [ ] Verify staged package, publish to GitHub Pages and verify deployed city pages and scoped assets.

Assumptions: user authorizes the same upholstery layout across cities. Prices and travel are separate; headline numbers are service base prices. Southern pages' lack of online appointment booking is existing behavior; their CTA must say estimate/inquiry. Historical source retention remains verified against restored parent bytes; the rollout's own tests verify current behavior and unchanged financial content.
