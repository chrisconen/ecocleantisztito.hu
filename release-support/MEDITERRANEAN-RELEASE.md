# Mediterrán ECO Clean kiadás · 2026. szeptember 8.

A tulajdonos jóváhagyta az új 15 oldal GitHubra feltöltését és éles publikálását, az előző nyilvános változat cseréjével. Az érintett URL-ek változatlanok: hét város külön kárpit-/matracoldala és a `karpittisztitas-matractisztitas.html` közös oldal.

## Ellenőrzött csomag

- 142 oldal, 352 futási fájl, 17 023 414 bájt.
- 19 493 hivatkozás, 1902 közvetlen erőforrás és 134 stíluslap: nulla hiba.
- Pontosan 15 korábbi HTML változott; 9 új WebP és 3 új CSS/JS futási fájl került be. 22 elavult CSS-fájl törölve a kiadási csomagból.
- A főoldal, az éles foglaló és az összes többi megmaradó fájl hash-e az előző kiadással azonos.
- A tényleges kiadási csomagon 15 oldal × 8 szélesség = 120 böngészőnézet és 15 interakciós eset sikeres. Nulla JavaScript-hiba, hiányzó kép vagy rendeléskérés. 14 ár- és e-mailes ajánlatkérési teszt sikeres a regionális eredeti és a főoldali szabályok alapján.
- Független kiadási ellenőrzés: publikálásra alkalmas; a 32 eredeti referenciafotó-hivatkozás változatlan képeket használ.

Az új árösszesítő tájékoztató kalkuláció. A tulajdonos pontosítása alapján ezeken a településeken nincs online foglalás. Az összeállítás kizárólag az `info@ecocleantisztito.hu` címre előkészített e-mailként adható át; a látogató a saját levelezőjében küldi el. Másolható levélszöveg is elérhető. Az ECO Clean ezután egyezteti a végleges árat és az időpontot. A főoldali foglalóhoz nincs átvezetés. Valódi megrendelést vagy értesítéskézbesítést az ellenőrzés nem hozott létre.

## Visszaállítás és reprodukálhatóság

Előző revízió: `820bf469b131a308d8ea3b751b3ec4bfe0200fbf`.

Helyi mentés: `backups/ecoclean-before-mediterranean-820bf46.zip`. SHA-256: `584c29abe8afc35db9b3d3a99357403992345dbe1da8622327a70a3596878ff9`. A zip a korábbi kiadási fájlokat és az ellenőrzési manifestet tartalmazza; Git-kizárással védett és nem publikált.

A tizenöt stabil navigációs/referenciafotó-bemenet a `demo/mediterranean/baseline/` mappában van. A builder nem olvassa saját éles kimenetét bemenetként. A Git attribútumok megőrzik a jóváhagyott HTML/JSON pontos bájtjait. Az elavult csomagfájlok törlése csak korábbi manifestben szereplő, változatlan hash-ű, a `release/` mappán belüli fájlokra engedett.

A GitHub Pages workflow csak a `release/` tartalmát publikálja. Demók, régi bemenetek, kép-eredetik, promptok, tesztek, mentések és helyi konfiguráció nem kerülnek a webes artifactba.

Bizonyítékok: `release-manifest.json`, `release-verification.json`, `../demo/mediterranean/manifest.json`, `../demo/mediterranean/qa/release/verification.json`, `../demo/mediterranean/REVIEW.md`.

## E-mailes ajánlatkérés javítása

A tulajdonos pontosítása után mind a 15 élesítésre előkészített oldal ismét átment a 120 böngészőnézeten és a 15 kibővített interakciós próbán. A címzett, a városváltás, a tételek, a teljes összeg, az üres állapot tiltása, a törlés, a vágólap és a kézi másolás tartalékmegoldása ellenőrizve. Az automatikus vizsgálat az online foglalási linkek és naptárszkriptek visszakerülését is hibának tekinti. Független utóellenőrzés: GO, publikálást akadályozó hiba nélkül. A próbák nem küldtek levelet vagy rendelést.

## Sikeres élesítés

Publikálva: 2026. szeptember 8., 08:33:46 (Europe/Budapest). Commit: `b26fded784227770abfb7e16510bd760dd775c1a`. A csomagellenőrzés és az élesítés is sikeres: https://github.com/chrisconen/ecocleantisztito.hu/actions/runs/34195171852. Élő példa: https://ecocleantisztito.hu/karpittisztitas-kalocsa.html.

Az éles domainről mind a 352 csomagfájl ellenőrizve: 209 pontos bájtegyezés, 141 teljes HTML-hash-egyezés a korábban dokumentált Cloudflare e-mailvédelem visszaalakítása után, 1 ismert Cloudflare robots-kiegészítés és 1 nem publikus buildmarker. Nulla eltérés. Mind a 22 eltávolított CSS-fájl és 12 kizárt belső/korábbi útvonal 404-et ad. Az eredeti kiadás mentése megmaradt, nem nyilvános.

Az éles 15 oldal 120 böngészőnézete és 15 interakciós próbája hibamentes; az e-mailes ajánlatkérés, a másolás és a főoldali naptárkapcsolat hiánya is ellenőrizve. Valódi e-mailt vagy foglalást nem küldtünk. Részletes összesítés: `live-verification.json`; teljes helyi bizonyíték: `qa/live-assets.json` és `../demo/mediterranean/qa/live/verification.json`.
