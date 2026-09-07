# Production booking integration

## Files and reproducibility

- Run `python release-support/booking-build.py` to derive `booking-live.js` from the unchanged original `booking-config.js` plus `booking-runtime.js`.
- Copy `booking-live.js` and `calendar-live.js` into the released page's `ui/` directory.
- Add `ui/calendar-live.css` after the approved `ui/design.css`. Calendar and result markup reuse the approved `demo-calendar`, `demo-calendar-grid`, `demo-slots`, and `demo-result` design classes. Original `booking-calendar.css` and `booking-response.css` are unnecessary.
- Furniture cards still use `assets/*-card.webp` relative to the document. Keep the approved image assets at that location.
- Original large-order panel CSS remains necessary (already imported by design.css).
- These files do not modify or replace the root production or demo source files.

## Required page/script adjustments

1. Preserve existing form IDs, field IDs, inline handlers, region values, travel-zone values and `#bookingCalendar`.
2. Replace the `booking-demo.js` script with `ui/booking-live.js`, and `calendar-demo.js` with `ui/calendar-live.js`. Keep them classic scripts, executed before `DOMContentLoaded`. Their current source-page order works; the booking initializer runs after both are loaded.
3. Remove `.demo-notice`, `.demo-calendar-note` and `#demoResult` markup.
4. In the derived copy of `demo/design.js`, remove the block beginning `const result=document.getElementById('demoResult');` through the line before `const andante=document.getElementById('andanteModal');`. That block defines `window.showDemoResult` and would otherwise dereference the removed dialog.
5. Replace the configStatus assignment `● DEMÓ` with `● Online foglalás`.
6. Retain the approved `updateSummary` wrapper, field labels, autocomplete, gallery, ANDANTE accessibility and initial furniture-selector setup.

The live result dialog needs no static markup. `showBookingResult()` creates native `dialog#bookingResult` with `aria-labelledby`, `aria-describedby`, a native close button and existing result styles. Every variable result string uses `textContent`; customer and server strings cannot become HTML. The dialog remains open until dismissed. There is no timed auto-close.

## Preserved backend contracts

| Operation | Method / endpoint | Body |
|---|---|---|
| Availability (read-only) | POST `https://hub.centaur-lang.dev/webhook/check-availability` | `city`, `startDate`, `endDate`, `requiredDuration` |
| Normal booking | POST `https://hub.centaur-lang.dev/webhook/booking-request-hu` | Original flat `bookingData` exactly; `customerType`, customer fields, `location`, `items`, `upsells`, `conditions`, `travelZone`, `city`, price/duration/discount, service/ANDANTE flags, `date`, slot fields, `timestamp` |
| Large-order request | POST `https://hub.centaur-lang.dev/webhook/large-order-request` | Original `type`, `source`, `timestamp`, `customer`, `location`, `order`, `totals`, `message` object |

All original pricing constants and calculations remain unchanged, including item extras, per-seat/per-side/per-item extras, travel fees, combo-vs-quantity discount precedence, rounding and the >480-minute large-order threshold. The booking workflow's local normalizer recomputes the actual slot end using duration; the original frontend `slotEndTime` window value is preserved.

Calendar slots come only from the server. The original `free`/`limited` day statuses, `fitsRequested`, `maxDuration`, `startMinutes`, first-slot flag, dynamic times and later-slot ±30-minute acceptance remain effective. No fabricated weekday or fallback slots exist. Calendar requests use local date keys (fixing the original UTC-date shift near local midnight), retain the one-day advance and two-month range, cancel superseded requests and discard stale responses. Region clearing and duration changes remove old selections. Unchanged duration does not erase a selected appointment.

## Verification evidence

- `node --test release-support/tests/booking-contract.test.mjs`: 16 tests pass, including 113 pricing/duration parity scenarios against the original code.
- Booking and large-order tests intercept every request in an isolated VM; no test can reach a real network endpoint.
- Success, rejected HTTP-200 response, unknown network outcome, duplicate clicks, invalid/missing appointment, region change/clear, stale availability races, changed duration, flexibility acceptance and safe result text are covered.
- Large-order email and phone validation matches normal booking, and the appointment-change action has a text-sized button rather than the square month-arrow style.
- `node --check` passes for both production scripts.
- `python release-support/tests/booking-browser.py`: local packaged-release smoke passes at 1440px and 390px. Both runs exercise visible travel-zone controls, later-slot flexibility, region change, ANDANTE acceptance, form submission, native success dialog and duplicate prevention. Each run intercepts exactly one booking write; no page errors. All external/write traffic is intercepted or blocked. Result screenshots are `tests/booking-result-1440.png` and `tests/booking-result-390.png` (the latter visually inspected).
- Read-only live probe: `python release-support/booking-probe.py` on 2026-09-07, city `gyor`, 2026-09-08 through 2026-09-15, duration 40 minutes.
- Browser-style preflight: HTTP 204, allowed origin `https://ecocleantisztito.hu`, allowed methods `OPTIONS, POST`, allowed header `content-type`.
- Browser-style availability POST: HTTP 200 JSON, allowed origin `*`, eight day entries with `limited`, `weekend`, `zone_blocked` states. Dynamic slot keys match the original contract.
- Sanitized evidence in `tests/booking-live-availability.json` passes the live calendar parser. It excludes `bookingInfo`, customer data, request metadata and backend identifiers.
- An initial Python-default User-Agent probe returned 403. Repeating with a browser User-Agent succeeded, including CORS. Browser testing should use normal browser requests.
- No normal booking or large-order request was sent to a live endpoint. Their actual end-to-end writes and notification delivery remain unverified.

## Trust boundaries and remaining assumptions

- Availability is a snapshot, not a reservation. The existing backend owns final schedule conflict checking and booking creation. The checked-in booking workflow includes a fresh calendar conflict check; its live deployment and concurrency/atomicity have not been verified by these frontend tests.
- Booking success requires HTTP success plus JSON `success: true`. The checked-in normal booking workflow uses that field and can also reject with HTTP 200. Large-order acknowledgement is tested against the same explicit success shape; its live response could not be verified without creating a real request.
- A network failure/timeout after POST does not prove the server rejected the request. The UI states that acknowledgement is unknown and asks the customer to telephone before resubmitting. It never retries POST automatically. Client-side duplicate prevention cannot provide server-side idempotency.
- The original request contract contains client-calculated totals. The checked-in backend normalizer forwards these totals. Server-side price recalculation, input validation, abuse controls and rate limits are not established by this frontend work and should not be claimed.
- Remote availability text is escaped and response shape checked before rendering. Production scripts no longer log customer payloads, and the success dialog does not interpolate personal data into HTML.
- No automatic email-delivery or 24-hour response claim is made by the new success dialog. The original large-order panel's existing service promise remains source content.
