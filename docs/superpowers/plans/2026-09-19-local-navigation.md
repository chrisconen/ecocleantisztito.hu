# Local city navigation implementation plan

**Goal:** Each city and surrounding area has its own service navigation; a Szombathely visitor is not sent to Tatabánya or another city's services.

**Architecture:** Reuse existing indexed city service URLs. The upholstery city landing page acts as local home. Generate plain links from pages that actually exist, in desktop/mobile menus, service continuation and footer. Preserve the central homepage city selector and same-city language alternates. Apply deterministic edits through the existing reversible overlay.

**Tech stack:** Node, jsdom source locations, existing CSS and mobile interaction scripts.

- [x] Generate local navigation for all 33 city groups and existing language variants in `release-support/content-clarity/local-navigation.mjs`.
- [x] Retain only existing local service targets; prevent links into another city even from legacy footer recommendations. Keep booking versus email-only region rules.
- [x] Verify every regional HTML link target, desktop/mobile menus, logo targets, local language switching and absence of cross-city service links.
- [x] Run representative desktop/mobile browser checks for Győr, Szombathely, Tatabánya and Paks, plus the unchanged central city selector.
- [ ] Publish only after pricing, navigation, link and package verification passes.

**Assumptions:** 'Independent city page' means local pages/navigation within the existing domain; no domain split, content duplication or URL migration was requested. Existing URLs and canonical metadata are preserved to avoid unnecessary search-index churn. Service availability comes from existing published pages, never invented locations.
