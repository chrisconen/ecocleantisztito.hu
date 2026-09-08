# ECO Clean · Mediterrán kép- és ikonrendszer

2026-09-08. Módszer: **beépített image_gen**, kilenc kiválasztott generált kép; nincs CLI/API fallback. A felhasználó weboldalhoz kért képeket, ezért minden végleges kép a projektben is el van mentve. Az optimalizált kilenc WebP összesen 2 094 056 bájt. Az eredeti PNG-k változatlanul megmaradtak az `assets/originals/` mappában.

| Név | Weboldalhoz használt fájl | Teljes eredeti |
| --- | --- | --- |
| living | [WebP](assets/living.webp) | [Eredeti PNG](assets/originals/living.png) |
| sofa | [WebP](assets/sofa.webp) | [Eredeti PNG](assets/originals/sofa.png) |
| armchair | [WebP](assets/armchair.webp) | [Eredeti PNG](assets/originals/armchair.png) |
| dining | [WebP](assets/dining.webp) | [Eredeti PNG](assets/originals/dining.png) |
| office | [WebP](assets/office.webp) | [Eredeti PNG](assets/originals/office.png) |
| bedroom | [WebP](assets/bedroom.webp) | [Eredeti PNG](assets/originals/bedroom.png) |
| heritage | [WebP](assets/heritage.webp) | [Eredeti PNG](assets/originals/heritage.png) |
| mites-sofa | [WebP](assets/mites-sofa.webp) | [Eredeti PNG](assets/originals/mites-sofa.png) |
| mites-mattress | [WebP](assets/mites-mattress.webp) | [Eredeti PNG](assets/originals/mites-mattress.png) |

A `assets/icons/` mappában 24 saját SVG-ikon található; a rajzolatokat az `icons.mjs` tárolja. Ezek kódból készített vektorgrafikák, nem emojik és nem generált bitmapek. A weboldal dekoratív SVG-ként használja őket, az interaktív vezérlőknek külön szöveges hozzáférhetőségi neve van.

A bútorfotók generált hangulati enteriőrök. A történeti kép illusztratív rekonstrukció. Az atkás képek nagyított, nem méretarányos oktatóillusztrációk, nem mikroszkópos vizsgálati eredmények. A valódi tisztítási referenciákat a builder az eredeti kiadásból változtatás nélkül hivatkozza.

## Végleges promptkészlet

### living

Use case: photorealistic-natural. Asset: wide website hero for Hungarian ECO Clean premium upholstery care. Create an exceptionally realistic high-end architectural visualization, a warm lived-in Mediterranean-inspired contemporary Hungarian home living room, not a seaside resort. Dominant sculptural generous ivory linen sectional sofa fully visible from a slightly elevated wide 28mm architectural camera, soft peach-plaster walls, arched passage, warm oak, honed travertine coffee table, discreet olive-green cushion, pale clay ceramics, olive branch, sheer curtains, warm soft morning light and precise natural shadows. Furnishings plausible and tasteful, tangible weave on upholstery, refined interior magazine photography, restrained welcoming feminine-soft palette of oat, sand, cream, muted terracotta and sage. Sofa is the visual protagonist, rich spatial depth and impeccable composition. Wide 16:9 landscape. No people, no text, no logos, no watermark, no cleaning tools, no visible dirt. This is an inspiration interior, never a before-and-after evidence photograph.

### sofa

Use case: photorealistic-natural. Create an exquisite architectural interior visualization for ECO Clean upholstery care, editorial interior magazine photograph, believable contemporary Hungarian home with softly Mediterranean styling. Palette cream, warm sand, dusty clay, muted olive. Extremely realistic upholstery texture, tactile plaster and oak, natural sunlight with soft shadows, restrained elegant decoration. Furniture fully visible, no people, no lettering, no logos, no watermark, no cleaning tools or dirt. Landscape 4:3, composition with breathing room around the featured furniture; this is an inspiration interior. Main subject: a beautiful three-seater straight sofa in pale muted terracotta linen, gently rounded cushions, in a sophisticated light limestone living room with large window, a low oak coffee table and a single ceramic bowl, framed wall art and an olive green throw. The whole sofa including both arms and legs is visible; not a sectional.

### armchair

Use case: photorealistic-natural. Create an exquisite architectural interior visualization for ECO Clean upholstery care, editorial interior magazine photograph, believable contemporary Hungarian home with softly Mediterranean styling. Palette cream, warm sand, dusty clay, muted olive. Extremely realistic upholstery texture, tactile plaster and oak, natural sunlight with soft shadows, restrained elegant decoration. Furniture fully visible, no people, no lettering, no logos, no watermark, no cleaning tools or dirt. Landscape 4:3, composition with breathing room around the featured furniture; this is an inspiration interior. Main subject: a sculptural muted olive-green upholstered reading armchair with rounded back and separate ottoman, elegantly furnished reading nook with curved plaster wall, floor-to-ceiling curtain, oak bookcase, small travertine side table and ceramic cup. Armchair in three quarter view, cozy intimate high-end composition.

### dining

Use case: photorealistic-natural. Create an exquisite architectural interior visualization for ECO Clean upholstery care, editorial interior magazine photograph, believable contemporary Hungarian home with softly Mediterranean styling. Palette cream, warm sand, dusty clay, muted olive. Extremely realistic upholstery texture, tactile plaster and oak, natural sunlight with soft shadows, restrained elegant decoration. Furniture fully visible, no people, no lettering, no logos, no watermark, no cleaning tools or dirt. Landscape 4:3, composition with breathing room around the featured furniture; this is an inspiration interior. Main subject: four beautiful cream linen upholstered dining chairs with warm walnut timber frames around an oval travertine dining table. An exquisitely composed dining room with linen pendant light, pale peach limewash wall and large daylight window, handmade ceramics, minimal olive branches. Clearly readable chair fabric seats and upholstered backs. All near chairs fully visible.

### office

Use case: photorealistic-natural. Premium editorial architectural visualization for ECO Clean textile care. Contemporary Hungarian residential interior with a refined soft Mediterranean sensibility, warm ivory, linen, sand, pale terracotta and muted olive palette, precise natural daylight, believable proportions and high-end architectural materials, extraordinary lifelike fabric weave and detail. Landscape 4:3, uncluttered but richly furnished. No people, text, watermark, logos or cleaning equipment. Furniture must be fully visible. Feature one elegant modern ergonomic upholstered home-office swivel chair, warm greige fabric seat and back, matte graphite five-star caster base, sculpted arms, at a slim warm oak desk. Soft plaster wall, floor-to-ceiling sheer curtain, minimal shelves with architecture books and beautiful ceramics, one olive plant. Chair slightly turned toward viewer and not obscured by desk. Sophisticated creative home studio, welcoming and functional.

### bedroom

Use case: photorealistic-natural. Premium editorial architectural visualization for ECO Clean textile care. Contemporary Hungarian residential interior with a refined soft Mediterranean sensibility, warm ivory, linen, sand, pale terracotta and muted olive palette, precise natural daylight, believable proportions and high-end architectural materials, extraordinary lifelike fabric weave and detail. Landscape 4:3, uncluttered but richly furnished. No people, text, watermark, logos or cleaning equipment. Furniture must be fully visible. Feature a luxurious low upholstered bed with a clearly visible cream quilted mattress; the duvet neatly folded at the foot exposes most of the pristine mattress surface. Soft rounded linen headboard, oak bedside tables, ceramic lamps, limewashed sand walls, gentle arch niche, natural linen curtains. Spacious airy bedroom, view from front corner with entire bed and mattress perimeter fully visible, morning sunshine, wellness without hotel clichés.

### heritage

Use case: historical-scene. Photorealistic respectful recreation of an authentic well-kept Hungarian family living room around 1982 in a socialist-era apartment. Eye-level architectural photograph, landscape 16:9. Honey-brown modular veneer wall unit with glass display cabinet and books, rust and ochre patterned upholstered sofa and armchair, lace sheer curtain, patterned rug, varnished wood coffee table, small CRT television, modest houseplants, parquet floor. Furnished with pride and cared for; comfortably used, not dirty, not poor caricature, not ruined. Natural window daylight, soft film-like warm tones, documentary believability, balanced wide composition showing all furniture. No people, no propaganda, no logos, no text, no watermark. Image will be clearly labelled an illustrative reconstruction, not an archival photo.

Végső szerkesztés:

Edit this generated historical Hungarian living-room illustration. Remove ONLY the white English label 'Illustrative reconstruction' in the bottom left and reconstruct the sofa upholstery behind it seamlessly. Keep everything else exactly unchanged: furnishings, composition, camera, lighting, warm colors and image dimensions. No text anywhere in image. The website will supply its own Hungarian disclosure outside the image.

### mites-sofa

Use case: scientific-educational. Create a refined educational 3D illustration for a premium Hungarian upholstery cleaning website. Soft Mediterranean cream, sand and muted olive palette on warm ivory background, realistic materials, gentle editorial light, landscape 16:9. Scientifically inspired dust mites: tiny translucent pearl oval bodies with eight short legs, no human features, no insect antennae, not ticks, not bedbugs; a few pale ovoid eggs and small dust/skin particles in magnified woven fibers. They should be natural and restrained, not frightening or grotesque. No red, no blood, no skin wounds, no infestation horror, no people, no typography, no labels, no logos. Composition has a furnished object on the left and a generously sized circular magnified view of its textile fibers on the right, softly joined by a fine optical line, with plenty of blank breathing room. The enlarged detail is explicitly illustrative, not a literal scale depiction. Main object: a complete beautiful light oatmeal linen sofa, three-quarter view, faint warm living-room floor grounding. The magnified lens concept relates to the sofa's upholstered armrest and headrest. Show a few mites and eggs nestled between beige woven upholstery threads in the right magnified view, with very subtle skin flakes. Luxurious architectural material quality and intelligible clean educational composition.

### mites-mattress

Use case: scientific-educational. Create a refined educational 3D illustration for a premium Hungarian upholstery cleaning website. Soft Mediterranean cream, sand and muted olive palette on warm ivory background, realistic materials, gentle editorial light, landscape 16:9. Scientifically inspired dust mites: tiny translucent pearl oval bodies with eight short legs, no human features, no insect antennae, not ticks, not bedbugs; a few pale ovoid eggs and small dust/skin particles in magnified woven fibers. They should be natural and restrained, not frightening or grotesque. No red, no blood, no skin wounds, no infestation horror, no people, no typography, no labels, no logos. Composition has a furnished object on the left and a generously sized circular magnified view of its textile fibers on the right, softly joined by a fine optical line, with plenty of blank breathing room. The enlarged detail is explicitly illustrative, not a literal scale depiction. Main object: a complete cream quilted mattress on a low elegant oak platform, three-quarter view with a small lifted layer revealing the textile padding. The right magnified view shows a few mites and eggs among cream mattress fibers, tiny skin flakes and dust. Calm bedroom-context education, not a laboratory micrograph. Luxurious architectural material quality and intelligible clean educational composition.
