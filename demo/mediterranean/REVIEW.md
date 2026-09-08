# Independent Mediterranean redesign review

**Workflow correction after this review:** the owner clarified that the seven cities have no online booking. The former homepage booking CTA described below is historical and has been removed. The current configurator prepares an email inquiry to `info@ecocleantisztito.hu`, with a copyable-text fallback and subsequent manual appointment confirmation. Updated regression tests and browser evidence cover this correction; the original review findings below are retained as history.

Date: 2026-09-08. Scope: the 15 generated demo pages, their builder, styles, interactions, icon set, Hungarian content and price configurator. The production artifact was outside this review's change scope.

## Result

PASS after correction of one P2 finding. No outstanding defect was identified in the checks below. This source and semantic review complements the separate browser visual and touch QA; it does not claim that review's results.

## Verified evidence

- All seven cities have both service pages; the combined `karpittisztitas-matractisztitas.html` page is also generated. Manifest source and output hashes match all 15 current files.
- All 32 retained before/after photo references (16 pairs) resolve to byte-identical original image files. Generated interiors are described as illustrations and separated from genuine cleaning references.
- All 945 header, mobile-menu and footer link occurrences match the original release pages. Their 750 local destination occurrences exist on disk. There are no missing current-page anchors or referenced local image/script assets in the generated pages.
- Generated page body text contains no emoji. Icons use a consistent original SVG set. The pages contain fresh Service and FAQ structured data, with no inherited executable inline scripts or unsupported medical guarantees; runtime scripts are the guarded shared navigation plus the two new modules.
- The health copy distinguishes allergens from visible dirt, qualifies allergy/asthma effects, explains eggs and shed skin cells, and avoids promising complete mite, egg or allergen removal. Historical illustrations are explicitly distinguished from cleaning results. This review assessed the published wording and source references, without independently repeating the medical literature research.
- Four-item process and assurance grids use four columns on wide screens and two on intermediate screens, with suitable narrow-screen rules; there is no three-plus-one grid rule. Six furniture and configurator cards use balanced three/two/one-column layouts.
- All 12 configurator contract tests pass, including comparison against original regional tariffs and production pricing constants. Regional mattress price differences from the homepage are disclosed next to the booking link.
- Independent JSDOM interaction checks pass: multiple mattress variants remain selected; side-based extras calculate correctly; removing one variant preserves another; reset returns the estimate to zero; comparison inputs update their reveal; arrow-key tabs change panels and focus; hotspot controls synchronize their pressed state and text. No JavaScript errors occurred in these checks.
- The estimator makes no outbound requests or customer-data writes. Its CTA targets `index.html#booking`; the interface states that selections must be entered again there. This is a local estimate, not a booking transaction.

## Corrected finding

**P2: incorrect intrinsic dimensions for generated images.** The original `image()` helper assigned every generated image `1672 × 1115`, which could cause the lazy-loaded mite illustrations to change height when their true 16:9 dimensions became available.

The builder now reads each asset's actual dimensions from `asset-manifest.json` and rejects unknown asset names. Reverification found that all 9 manifest dimensions match the actual WebP files, and all 180 generated image occurrences across the 15 rebuilt pages have the corresponding correct width and height attributes. The original photo preservation and navigation checks also pass after rebuilding.

## Limits

No live deployment, real order submission, email delivery, third-party source availability or backend behavior was exercised by this review. Native dialog rendering, touch-slider behavior and visual clipping remain covered by the separate browser QA run.
