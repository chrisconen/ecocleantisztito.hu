# Studio online calculation and booking handoff

2026-09-09. `configurator.js` uses the exact existing main booking catalog and calculation order. Its six illustrated groups expose 14 main item IDs, the existing five global extras, sofa-level dry cleaning and bed surface extras, four travel zones, 10% mixed-service discount or 5% quantity discount, and the existing >480-minute large-order rule. No new tariff or automatic appointment is introduced.

The online tariff is intentionally separate from the excluded seven-city Mediterranean e-mail estimator. Their files must stay unchanged. Only the 26 requested supported city slugs are accepted. Unknown cities, `egyeb`, mismatched source pages, unsupported products, amounts, personal details, appointment dates and acceptance flags cannot be imported.

The older Győr copy's 3500-HUF sofa/L-sofa mite extra differs from the main online tariff of 5000 HUF. At the owner's explicit request, the comparison notice is removed from the customer interface. The calculator and import still use the existing online tariff. Hotel mattress quantities/rates remain individual quotes: they are not represented by an approximate regular mattress SKU.

## Wiring

On eligible city pages, include `studio/configurator.js` and a container:

```html
<div data-studio-configurator data-city="gyor"
     data-source-page="karpittisztitas-gyor.html"
     data-assets="studio/assets" data-booking-url="index.html"></div>
```

On the maintained homepage, load these **classic scripts after `design.js` / production `ui/site.js`**:

```html
<script src="studio/configurator.js"></script>
<script src="studio/booking-handoff.js"></script>
```

The first script exposes a local price/validation API; it mounts only `[data-studio-configurator]`, so the homepage's existing configurator is untouched. The second reads `#booking?eco-config=...`, displays an explicit review panel and waits for the visitor's click before replacing items or contacting calendar availability. Cancel keeps the existing basket. Successful import or rejection removes the payload from the fragment. There is no auto-booking, personal-data transfer, consent acceptance or appointment selection. Existing contact inputs survive import; existing appointment and ANDANTE acknowledgement do not.

Reuse the Mediterranean `med-config-*`, `med-product-*`, `med-config-check`, `med-config-field`, `med-config-line`, `med-email-fallback` styles. Keep `.studio-handoff` padding/margins, readable list spacing and focus treatment on the homepage. The mattress card explains its base treatment and links to the separate wet-cleaning extra; the link does not select an extra or change a price. Sofa-level dry treatment is labelled `Atkairtás`. Maintain button `type="button"`. Support reduced motion in the parent stylesheet. Image map defaults use the supplied descriptive WebP filenames; optional `data-image-map` JSON supports logical keys and either filenames or `{file,alt}` objects. L/U options share the illustrative sarokkanapé view; the U option's default alt deliberately says generic sarokkanapé, not a falsely depicted U shape.

Tests: `node --test demo/studio/configurator.test.mjs` (requires the existing `%TEMP%/ecoclean-demo-qa` jsdom install). Includes 114 cases against actual `release-support/booking-live.js`, strict fragment validation, all 26 allowed and seven excluded cities, explicit replacement/cancel, checkbox and amount synchronization, mixed variants and large orders. jsdom intercepts/forbids fetch; no real POST is made. Keep the original main booking contract tests as a separate regression gate.

The production builder must copy these runtime files and put the receiver after the main site script. It must not reuse the Mediterranean region booking rejection rule on these online-enabled pages. Publish only after browser verification of the homepage import flow, with availability POST locally mocked and all booking/quote writes blocked.

## Verified preview flow

`python demo/studio/verify-booking.py` passed on the generated preview on 2026-09-09: Győr upholstery and mattress pages at 390px and 1440px, four complete source-to-homepage flows. Each case checks reset, product variants, extras, travel, explicit review/import, existing contact preservation, exact main basket/checkbox/amount/duration agreement, cancel, and nine malformed/excluded payload rejections. Result: zero issues, zero JavaScript errors, zero missing local assets, zero actual writes. Upholstery fixture: 68 400 HUF / 235 min; mattress fixture: 39 500 HUF / 140 min. No appointment or ANDANTE acknowledgement was selected. The preview calendar is intentionally local; no availability request occurred. Screenshots and machine report are in ignored `qa/booking-verification.json` and `qa/booking-*.png`.

The test helper deliberately starts a fresh page between fragment scenarios: changing only an existing page's fragment must not silently re-import a new cart. The actual source-to-homepage link is clicked normally. Product image metadata can supply `{file,alt,width,height}`; initial and variant-update renders use its real dimensions.

After the homepage handoff wiring moved into the deterministic Studio builder, all four browser flows and all eight Node tests were repeated successfully. Each browser case now additionally imports a 600-minute / 217 075 HUF order and verifies that the existing individual-quote panel is visible while the calendar and normal booking form are hidden. A locally simulated +1 HUF main-tariff drift is rejected before any change to the existing armchair basket or contact name. The report binds the run to SHA-256 hashes of the actual preview homepage, configurator and handoff runtime; no runtime changes were needed for this rerun. Results remain zero issues and zero real writes.
