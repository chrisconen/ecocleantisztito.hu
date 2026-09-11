# Price increase overlay (2026-09-11)

The owner raised every upholstery and mattress cleaning price by 15%, rounded to
the nearest 500 Ft. Travel fees, machine rental, parking and capacity-reservation
amounts are not cleaning prices and did not move.

The root inputs (`booking-config.js`, the upholstery/mattress pages) carry the new
prices. This layer applies the same increase to the already verified release
package without rebuilding it, so the reviewed widget, copy, Studio, review and
booking-extras layers below stay intact.

`price_rule.py` is the single deterministic rule, shared by the builder and the
proof. `overlay.json` records the pinned parent manifest/report and, per page,
the before/after hashes plus every edit as a byte offset in the published file.
Verification reverses only those offsets, checks the exact parent hashes, re-derives
the rule from the restored bytes, rejects any other difference, and then runs the
original booking-extras proof against the restored package.

The Studio content-retention check normalizes price amounts (`verify-content.mjs`),
the same way it normalizes reviewed brand spelling: the amounts themselves are
proven here, so that check keeps proving the surrounding wording survived.

The historical baselines are immutable. Do not regenerate them to bypass a failure.

```powershell
python release-support/price-overlay/build.py
python release-support/verify-price-overlay.py
node release-support/verify-release.mjs
python release-support/verify-package.py
node --test release-support/tests/booking-contract.test.mjs
python release-support/verify-staged.py
```

Re-running `build.py` is idempotent: it recovers the parent bytes from the recorded
edits, so a changed rule rebases instead of stacking a second increase.
