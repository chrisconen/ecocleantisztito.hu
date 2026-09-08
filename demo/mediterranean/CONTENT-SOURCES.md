# Mediterranean redesign — editorial evidence

Reviewed: 2026-09-08. Scope: the seven named cities (Kalocsa, Baja, Kiskőrös, Szekszárd, Paks, Solt, Dunaföldvár), their upholstery/mattress landing pages, and the common combined landing page. The user's `pska` is interpreted as Paks, consistent with the preceding conversation.

## Deliverable and schema

`content.hu.json` contains 1,360 Hungarian editorial words, including titles, captions and nine FAQ answers. No emoji, invented prices, local addresses, results, certifications or health guarantees are introduced.

- `hero`, `interiors`, `furniture`, `value`, `soil`, `mites`, `care`, `process`, `configurator`, `comparison`, `faq`, `closing`: independently renderable section data.
- `*.paragraphs[]`: `{text, sourceIds?}`. `care.items[]` and `faq[]` can also carry `sourceIds`.
- `sources[]`: `{id, label, url}`. Resolve each `sourceIds` entry to its source object and show a discreet linked citation next to the applicable paragraph/answer. Do not present only an unrelated site-wide source list.
- `{cityLocative}` in hero body: replace from `cities[].locative`. The common page should use a non-local sentence or replace it with the verified service region, rather than leaving the token visible.
- `furniture.items[].id`: editorial IDs, not assumed production pricing IDs. Map deliberately to the existing index configurator's supported products and prices. Copy must follow actual implemented flow: if the regional configurator cannot transfer selection into booking, change its CTA/note and FAQ accordingly.

All new prose is original. Sources inform limited factual claims; no direct quotations are used. Source-derived copy stays below 200 words per source even counting repeated FAQ explanations.

## Evidence mapping

| Claim or advice | Source | Scope and limit |
| --- | --- | --- |
| Mites may live in mattresses and upholstery, eat shed skin scales, and may remain present in a clean home. Complete elimination cannot be promised. | [NIEHS — Dust Mites and Cockroaches](https://www.niehs.nih.gov/health/topics/agents/allergens/dustmites) | Used for `mites` paragraphs 1 and 3, FAQ on allergy. We do not infer that the pictured customer's furniture contains mites or quantify infestation. |
| Mite feces/body fragments contain allergens; sensitive people can experience allergy or asthma symptoms. Their life cycle includes eggs, and warmth/humidity affect development. | [University of Kentucky, Department of Entomology — House Dust Mites, revised November 2024](https://entomology.ca.uky.edu/sites/entomology.ca.uky.edu/files/ef646_0.pdf) | Used for `mites` paragraph 2 and FAQ on eggs. No exaggerated population counts, no automatic disease causation, no guaranteed egg removal. |
| Weekly bedding washing supports exposure management; care labels still govern home laundering. | [AAAAI dust mite practice parameter](https://www.aaaai.org/Aaaai/media/Media-Library-PDFs/Allergist%20Resources/Statements%20and%20Practice%20Parameters/Dustmite-2013.pdf) | The parameter distinguishes mite killing from allergen removal and says high temperature is not necessary for the weekly-washing recommendation. Copy avoids universally prescribing 60°C or changing hot-water systems. |
| Around 40–50% relative humidity and a hygrometer are practical indoor-allergy guidance. | [AAAAI — Humidifiers and Indoor Allergies](https://www.aaaai.org/tools-for-the-public/conditions-library/allergies/humidifiers-and-indoor-allergies) | Used for the care card. A target range is guidance, not a guarantee or a universal treatment prescription. |
| Material-specific care, regular cleaning, suitable vacuuming and concealed spot tests support textile upkeep. | [Kvadrat — How to clean upholstery](https://www.kvadrat.dk/en/upholstery-textiles/how-to-clean-upholstery) | Used for value preservation, home-care and delicate-fabric FAQ. The manufacturer's guidance is a basis for care, not evidence that ECO Clean is certified by or works for Kvadrat. |
| Do not rub fabrics, prior treatment matters, dye transfer may be permanent, and upholstery must dry completely before use. | [Muuto — Materials & Care, Textiles section](https://professionals.muuto.com/faq/product-information/materials-and-care/) | Informs drying copy and limits around soiling/colour change. Avoids promising a fixed drying time for every fabric. The exact drying time also depends on the service method and local conditions. |

## Editorial judgments and assumptions

The old-home versus contemporary-home narrative is an illustrative contrast, not a statistical or museum reconstruction claim. The copy names recognisable furnishing elements and treats older furniture respectfully. It does not claim that most Hungarian homes are designed by interior designers, or that contemporary homes are inherently cleaner, healthier or more valuable.

The descriptions of headrest, armrest and seat-edge soiling are practical, conditional explanations, not laboratory diagnoses. Body oils, hair contact, cosmetics and household dust can contribute to a deposit; the colour alone cannot establish its contents or health risk. The text explicitly distinguishes removable dirt from abrasion, dye transfer and permanent colour change.

The regular-cleaning narrative describes care and removal of dust/soil. It does not represent this service as disinfection, pest extermination, guaranteed allergen elimination or medical treatment. Persistent allergy/asthma symptoms are directed to an allergist in one short, relevant sentence.

## Image and interaction requirements

- Keep original before/after photographs as actual work examples; use their original pairs and honest labels.
- Generated old/current interiors must be labelled as mood visualisations. They must never be paired under a before/after-cleaning claim.
- The mite illustration is a magnified explanatory visual, not a microscope capture, evidence of a customer's infestation or a diagnostic finding. Show an unobtrusive caption saying so. Depict household dust mites with restrained scale cues; do not use tick/bedbug-like imagery or a horror treatment.
- The generated furniture illustrations identify categories, not exact customer products or guaranteed material compatibility.
- The configurator must retain verified source prices, quantities and units. Do not derive pricing from the image shape or editorial furniture IDs.
- Any existing unverified medical guarantees elsewhere in retained source text should be reviewed separately before claiming the whole page uses this evidence standard.

## Validation

The JSON parsed successfully with Python's standard JSON parser. It includes six source records, all reference IDs resolve, seven city records and nine FAQ items. Root implementation still needs to verify paragraph citation rendering, city substitution, actual configurator behavior and visual distinction between generated illustrations and retained before/after evidence.
