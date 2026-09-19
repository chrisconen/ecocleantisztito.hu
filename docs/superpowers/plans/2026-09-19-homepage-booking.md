# Homepage booking separation Implementation Plan

**Goal:** Remove the full booking form from HU/EN homepages without breaking city calculator handoffs or old booking links.
**Architecture:** Generate dedicated `megrendeles.html` and `en/booking.html` from the existing verified booking section and modal. Retain financial and calendar engines exactly. Home CTAs open local service discovery; legacy booking hashes redirect to the dedicated form preserving the encoded cart.
**Tech Stack:** Static HTML, existing JavaScript/CSS, exact replacement overlay, Python Playwright.

- [ ] Add `release-support/homepage-booking/page.mjs` to the end of the current overlay generator. Extract form/modal and booking-only enhancements; retain the existing calculation/runtime script order. Generate new pages and scoped support assets via the existing explicit asset mapping.
- [ ] Remove homepage booking DOM, calendar/cart/handoff dependencies. Guard the homepage enhancement script when there is no booking form; direct upholstery/mattress service cards to their existing city menus. Replace generic booking CTA with city discovery. Correct the homepage's outdated claim that every city's travel fee is identical.
- [ ] Update declared city handoff destinations and old HTML booking links to the dedicated language-specific form. Preserve legacy incoming homepage hashes with a small same-origin redirect. No financial calculations, customer writes or calendar configuration changes.
- [ ] Verify homepage has no booking UI or requests; inspect service navigation, new form mobile/desktop, HU/EN cart import, city prices/travel, selection/calendar and existing failure handling. External writes are intercepted locally.
- [ ] Run provenance/package/link checks, review changes, commit and publish. Compare deployed files against verified artifacts.

Boundary: the city calculators currently depend on the homepage form; deletion alone would break orders. The seven inquiry-only southern cities remain inquiry-only. All prices and fees remain unchanged. A language switch starts a fresh form, matching existing behavior; legacy encoded carts retain the original URL fragment.

Implementation and verification completed: all 52 Studio calculators point directly to the new form; all seven financial runtime hashes are unchanged; 51 automated tests and eight HU/EN responsive browser scenarios pass, including saved-cart redirects and local 15:00 selection. Full release gate: zero issues. Package gate: 456 files, zero errors. Reviewer findings about the old mega menu were resolved by using the existing responsive city-discovery section. Publishing remains the final step.
