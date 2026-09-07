# Supplemental carpet service pages

Four routes were already linked but absent from the original project and live site: Balatonboglár, Balatonfűzfő, Balatonkenese, Balatonszemes. These pages use the approved classic pastel service layout and existing business contact details. They contain service information and telephone/email links, with no form submission code.

## Build and integration

Run `node release-support/build-supplemental.mjs`. It uses the existing `jsdom` dependency in `%TEMP%/ecoclean-demo-qa`. Copy the four HTML files from `release-support/supplemental/` into the final release root, replacing the earlier missing-source placeholders. Copy `release-support/supplemental.css` to `release/ui/supplemental.css` and include it in the release manifest.

Required dependencies already used by the approved pages: `ui/rollout/styles-szonyegtisztitas-gyor.css`, `ui/design.css`, `ui/subpages.css`, `ui/navigation.js`, `ui/rollout.js`, `assets/business-lounge.webp`, and `icon.ico`. URLs are final root-relative-in-directory URLs; there is no preview base tag or demo dependency. Canonicals point to the four final `https://ecocleantisztito.hu/` routes.

The shared desktop carpet `menuData.cities` in `ui/navigation.js` should include the four new city names. The supplemental pages already add them to the matching north/south mobile carpet groups. Native buttons are used for navigation triggers so existing shared click listeners also support keyboard activation.

## Content provenance

- `demo/szonyegtisztitas-gyor.html`: approved header, full mobile/desktop menu shell, footer, classic CSS references and editorial hero composition. Its existing generated `assets/business-lounge.webp` image remains labeled as a generated interior illustration, not a client result photo.
- Original `szonyegtisztitas-gyor.html`, `.subpage-hero-desc`: the second sentence is copied verbatim: “Irodák, hotelek, bankok szőnyegpadlóinak professzionális tisztítása.” The first sentence is adapted only to the known target city and omits “és környékén”.
- Original `szonyegtisztitas-gyor.html`, `.pricing .section-description`: copied verbatim as the quotation note: “Minden ár az állapottól függően változhat. Pontos árajánlatért hívjon!”
- Original `szonyegtisztitas-gyor.html`, `.cta-container > p`: copied verbatim: “Hívjon most és kérjen ingyenes árajánlatot ipari szőnyegtisztítás szolgáltatásunkra!” Telephone and email are unchanged.
- Original `szonyegtisztitas-balatonalmadi.html`, four `.industry-card` headings: copied verbatim. Descriptions for hotels and offices retain the first sentence verbatim and omit express availability / weekend surcharge terms. Restaurant and rental accommodation descriptions are copied verbatim. No local business names or place-specific paragraphs are transferred.
- Original `szonyegtisztitas-balatonalmadi.html`, `.process-step` 1–4: headings copied verbatim. Steps 1 and 3 retain full original paragraphs. Step 2 retains only “Pontos m² alapú kalkuláció.” Step 4 retains only “Extrakciós gépparkkal végzett mélytisztítás.” The 24-hour quote deadline and the fifth step’s drying/next-day availability claims are omitted.
- New connective text is limited to section headings (“Tiszta szőnyegek, gondozott üzleti terek.”), navigation labels and the localized title/contact label. It makes no new technical or local factual claims.

## Assumptions and boundaries

These routes represent service enquiries for the four known cities already present in the site's linked coverage. The original generic business carpet service offering is assumed applicable; actual scheduling and quotation remain telephone/email enquiries. No local office address, postcode, geo-coordinate, rating, review, exact price, discount, travel charge or guarantee is introduced. Structured data uses `Service` with the existing organization/contact details and city as `areaServed`; it does not assert a local branch.

The shared scripts and external font host remain the same trust boundaries as the approved site. These pages introduce no third-party customer-data endpoint, secret, backend write or live submission. Their only additional presentation dependency is the small scoped stylesheet. Rebuilds deliberately fail if the source service card/process structure changes, so changed upstream copy requires review instead of silently publishing malformed content.

## Verification

Local Chromium checks passed for all four routes at 1440, 390 and 320 px (12 cases), with no page JavaScript errors, no page or title overflow, one `main` and `h1`, four sector cards and four process steps, and no form. Balatonboglár additionally passed at 1024 and 768 px; all fragment links resolve and the hero image loads. Desktop menu activation with Enter, closing with Escape and focus return passed. Mobile submenu expansion, visibility of the new city route, Escape closing and the collapsed accessibility state passed. Desktop and mobile screenshots were visually inspected. Browser-only request interception supplied the supplemental HTML/CSS at final release URLs; no source page or real form was submitted.
