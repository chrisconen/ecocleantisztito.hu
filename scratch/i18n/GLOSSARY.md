# ECO Clean HU → EN translation glossary

Target register: **UK English**, professional service-business marketing copy.
Audience: expats, tourists and hospitality businesses around Lake Balaton /
western Hungary. Confident and concrete, never machine-literal.

## Service terms — use these exact renderings

| Hungarian | English |
|---|---|
| kárpittisztítás | upholstery cleaning |
| kárpitozott bútor | upholstered furniture |
| matractisztítás | mattress cleaning |
| szőnyegtisztítás | carpet & rug cleaning |
| ablaktisztítás | window cleaning |
| takarítás | cleaning services |
| mélytisztítás | deep cleaning |
| atkairtás / atkaírtás | dust mite treatment |
| atkamentesítés | dust mite removal |
| allergénmentesítés | allergen removal |
| fertőtlenítés | sanitising |
| impregnálás | fabric protection |
| szagtalanítás | odour removal |
| folteltávolítás | stain removal |
| extrakciós technológia | hot water extraction |
| vegyszermentes | chemical-free |
| bio-tisztítás | eco-friendly cleaning |
| helyszíni felmérés | on-site assessment |
| kiszállási díj | call-out fee |
| időpontfoglalás / foglalás | booking |
| ügyfél | customer |
| magánszemély | private customer |
| céges ügyfél | business customer |
| árajánlat | quote |
| garancia | guarantee |

## Items

| Hungarian | English |
|---|---|
| szófa, heverő | sofa / daybed |
| L-kanapé | L-shaped sofa |
| U-kanapé | U-shaped sofa |
| kanapé | sofa |
| fotel | armchair |
| ebédlő szék | dining chair |
| irodai szék | office chair |
| franciaágy matrac | double mattress |
| egyágyas matrac | single mattress |
| gyerekmatrac | children's mattress |
| kiságy matrac | cot mattress |
| A oldal / A+B oldal | side A / sides A+B |
| ágyazható | sofa bed |
| ágykeret | bed frame |
| párna | pillow |

## Segments

| Hungarian | English |
|---|---|
| borászat | winery |
| turistaház | guesthouse |
| szálláshely | accommodation |
| panzió | guesthouse |
| szálloda | hotel |
| étterem | restaurant |
| vendéglátóhely | hospitality venue |
| nyaraló | holiday home |
| apartman | apartment |

## Hard rules

1. **Never translate proper nouns.** City and place names stay Hungarian:
   Siófok, Balatonfüred, Hévíz, Keszthely, Győr, Sopron, Badacsony, Tapolca,
   Balaton, Kis-Balaton, Tihany, Zamárdi, Pápa, Tata, Veszprém, Szekszárd…
   Hungarian grammatical endings are dropped: "Siófokon" → "in Siófok",
   "a Balaton környékén" → "around Lake Balaton". "ECO Clean" never changes.
2. **Reviewer names stay as written** (Weszelenyi, Kovács Anna, initials like "ME").
3. **Numbers, prices, phone numbers and dates are copied verbatim.**
   `06 70 240 8141` and `+36 70 240 8141` stay exactly as they are.
   `Ft` becomes `HUF` (`18.000 Ft` → `18,000 HUF`). Hungarian thousands
   separators (`18.000`) become English ones (`18,000`).
4. **Emoji, arrows and symbols are preserved in place** (⭐ ✅ 🌿 ❓ ☎ – →).
5. **HTML entities are preserved verbatim** (`&nbsp;` `&amp;` `&#39;`).
6. **Placeholders are sacred.** `<0>`, `</0>`, `<3/>` are masked HTML tags.
   Every placeholder in the source must appear exactly once in the output, with
   matching open/close pairs. You may move them so the English reads naturally;
   you may never renumber, drop, add or nest them differently.
   `Hívja a <0>06 70 240 8141</0> számot` → `Call <0>06 70 240 8141</0>`
7. **Keep the string type.** A page `<title>` stays a title (keep it under ~60
   chars); a meta description stays one sentence under ~155 chars; a button
   label stays a short label; a keyword list stays a comma-separated list of
   English search keywords (translate the intent, do not transliterate).
8. **Do not add or remove information.** No new sentences, no explanatory notes,
   no "(in Hungary)" additions.
9. If a string is already English or is a meaningless fragment, return it unchanged.

## Tone examples

- `Prémium Kárpittisztítás Badacsony | ECO Clean - Vegyszermentes Mélytisztítás ⭐ 5.0`
  → `Premium Upholstery Cleaning in Badacsony | ECO Clean – Chemical-Free Deep Cleaning ⭐ 5.0`
- `Miért válassza az ECO Clean technológiát Balatonfűzfőn?`
  → `Why choose ECO Clean's technology in Balatonfűzfő?`
- `Ne hagyja, hogy a por átvegye az uralmat!`
  → `Don't let dust take over.`
- `INGYENES helyszíni felmérés!`
  → `FREE on-site assessment!`
