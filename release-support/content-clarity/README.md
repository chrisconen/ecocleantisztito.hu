# Pricing and booking clarity — 2026-09-19

## Later owner-authorized Győr city tariff and local navigation

`tariff.json.gyorCity` now overrides only addresses with city `gyor` and zone
`belvaros` or `kulso`. Those addresses have free travel. The original tariff is
retained for surrounding villages and every other city. Sofa/daybed 7,900 Ft;
L-sofa 17,900; U-sofa 18,900; armchair 3,900; chairs 2,400. Adult mattress wet
treatment is 1,900 Ft per side locally, child/cot 900; base prices are recorded
in the JSON. Dry + wet single mattress totals are 6,800/9,700 Ft and double
8,800/11,700 Ft (one/two sides). Local frames 3,900 and cushions 400 Ft.
Existing discounts, cleaning durations and unbenchmarked upholstery extras remain.

`gyor-local.mjs` derives visible cards, totals, payload item details and import
validation from the same scoped data. City/zone switching retains the basket
and restores the applicable tariff. Normal bookings reject a non-Győr address
name with a Győr city zone; this is a consistency check, not server enforcement.

`local-navigation.mjs` replaces cross-city menus with links to existing local
services across 33 city groups, including the Komárom city hub and language
variants. Central homepage discovery remains. No URL migration or canonical
change is made. Current navigation is checked separately from historical
retention, which uses the exactly restored parent.

Additional checks:

```powershell
node --test release-support/tests/local-navigation.test.mjs
python release-support/content-clarity/verify-browser.py
```

The browser check serves the local release, blocks external requests and all
non-GET requests, checks mobile and desktop navigation, and imports a basket
without sending a booking. Cost/margin data is unavailable: these prices reflect
the owner's competitive-pricing decision, not a proven profitability threshold.

The owner confirmed these values in the working session:

- Sofa and L-sofa mite treatment: 4,000 Ft per item. U-sofa remains 6,000 Ft.
- Double mattress wet treatment: 6,000 Ft per treated side. Single mattress remains 6,000 Ft; cot/child mattress remains 3,500 Ft.
- Wet-cleaning drying estimate: usually 6–12 hours, with use only after complete drying.
- ANDANTE/water-sensitive material found unsuitable on arrival: 50% of the cleaning price, capped at 30,000 Ft. Existing late-cancellation terms are separate.

`tariff.json` records the current booking tariff with those decisions. `prepare.mjs` derives corrected HU/EN runtime prices and the shared Studio catalog. It also corrects Studio's outdated extras and its handoff to the current item-level mattress-extra contract. Existing discount percentages, their calculation basis, travel fees, base durations and order endpoints remain unchanged.

Editorial changes cover the homepage and Győr upholstery/mattress pages in HU and EN, including their structured drying answers. Shared calculator changes apply wherever these scripts load; the remaining HTML edits only update script cache versions. Broader regional copy and the older Hungarian labels still present in the English Studio interface remain separate work.

## Build and verify

```powershell
node release-support/content-clarity/prepare.mjs
python release-support/content-clarity/build.py
node --test release-support/tests/content-clarity.test.mjs release-support/tests/booking-en-contract.test.mjs release-support/tests/calendar-1500-readiness.test.mjs
node release-support/verify-release.mjs
python release-support/verify-package.py
```

Run the last two commands sequentially: the first writes the verification report consumed by the second. Node tools require jsdom, css-tree, acorn and acorn-walk in `%TEMP%/ecoclean-demo-qa`.

The parent manifest/report are pinned. The top proof reverses exact byte edits, checks them against reviewed replacements, and runs the complete unmodified English/price/booking/review/Studio/copy/widget proof chain against the restored parent. Never regenerate historical baselines to bypass a failure. Full and earlier-layer builders are not the update path for this release.

## Initial release evidence

40 tests pass, including 1,000 Studio-to-booking price/duration combinations, four mixed baskets, explicit owner-price examples, actual DOM handoff, stale-tariff cart preservation, HU/EN parity and the 15:00 calendar regression. DOM tests prohibit network requests. All script references are checked against their current content hash, including an already-stale English cache key found during independent code review.

Chrome local-preview check: sofa + mite treatment + Győr centre = 25,500 Ft. The same amount appeared after clicking through and explicitly accepting the basket import. No contact data, order submission or acceptance of service conditions was entered. This does not verify real booking writes or email delivery.

The existing booking backend still receives client-calculated prices. This package verifies frontend consistency; it does not add independent backend price recalculation or atomic scheduling locks.

Rollback: revert this release commit and publish the previously verified package. Existing n8n 15:00 changes are independent and should remain in place.

## Local tariff and navigation validation

46 offline tests passed, including 1,000 calculator combinations and all 203 regional HTML pages. Browser QA passed 15 desktop/mobile checks including actual Győr-to-booking basket import; no booking was submitted. Independent pricing and navigation code reviews completed. Browser evidence: `docs/gyor-audit-2026-09-19/local-tariff-nav-qa/report.json`.
