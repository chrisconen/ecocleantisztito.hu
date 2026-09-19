# Pricing and booking clarity — 2026-09-19

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

## Evidence

40 tests pass, including 1,000 Studio-to-booking price/duration combinations, four mixed baskets, explicit owner-price examples, actual DOM handoff, stale-tariff cart preservation, HU/EN parity and the 15:00 calendar regression. DOM tests prohibit network requests. All script references are checked against their current content hash, including an already-stale English cache key found during independent code review.

Chrome local-preview check: sofa + mite treatment + Győr centre = 25,500 Ft. The same amount appeared after clicking through and explicitly accepting the basket import. No contact data, order submission or acceptance of service conditions was entered. This does not verify real booking writes or email delivery.

The existing booking backend still receives client-calculated prices. This package verifies frontend consistency; it does not add independent backend price recalculation or atomic scheduling locks.

Rollback: revert this release commit and publish the previously verified package. Existing n8n 15:00 changes are independent and should remain in place.
