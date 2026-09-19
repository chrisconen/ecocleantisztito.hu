# Pricing and booking clarity implementation plan

**Goal:** Give customers the same price before and after transferring their selection to the booking form, and remove obsolete booking and drying statements.

**Architecture:** A reversible content overlay above the existing English overlay. Historical manifests and original build inputs remain immutable. A maintained tariff snapshot derives both booking runtimes and Studio prices. The proof reverses only recorded edits and runs the complete parent verification. Existing order endpoints remain unchanged.

**Confirmed owner decisions:** sofa/L-sofa mite treatment 4,000 Ft; double mattress wet cleaning 6,000 Ft per treated side; wet-cleaning drying estimate 6–12 hours; ANDANTE fee 50% of cleaning price, capped at 30,000 Ft.

## Tasks

- [x] Verify the existing package with `python release-support/verify-package.py`; inspect both calculators and the import adapter.
- [ ] Create `release-support/content-clarity/` tariff source, exact replacements, pinned parent manifest/report, build script and overlay record. Derive corrected prices without changing unrelated fees or discount rules.
- [ ] Update Studio per-item mattress extras and its transfer validation to match the current booking contract. Preserve the existing cart until all tariff checks pass.
- [ ] Replace outdated booking-channel copy on Győr HU/EN pages. Align wet-treatment drying statements and metadata with the owner's 6–12 hours. Retain the full-drying condition.
- [ ] Add the top overlay gate to `verify-package.py` and `verify-release.mjs`; verify the unchanged historical retention rules against restored parent content, while checking current markup and assets normally.
- [ ] Test HU/EN pricing parity and Studio→booking scenarios across items, sides, quantities, extras, discount boundaries and travel zones. Test no cart mutation on mismatched tariffs. No real order endpoint calls.
- [ ] Run `node --test release-support/tests/booking-contract.test.mjs release-support/tests/booking-en-contract.test.mjs release-support/tests/calendar-1500-readiness.test.mjs`, `node release-support/verify-release.mjs`, and `python release-support/verify-package.py`.
- [ ] Review the exact diff, verify the staged package, publish through the existing GitHub Pages workflow, and verify public artifacts. Use authenticated gh CLI for GitHub operations.

## Constraints

Shared calculator corrections affect all pages using those assets. Editorial changes start with the homepage and Győr HU/EN service pages. Do not submit test orders or touch customer data. Price validation here proves consistency across frontend calculators; it does not establish independent server-side price validation or transactional booking locking. A selected time is availability until the server responds successfully.
