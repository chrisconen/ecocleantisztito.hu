# ECO Clean · Mediterrán szolgáltatási oldalak

Elkészült a jóváhagyott, 15 oldalas mediterrán változat: Kalocsa, Baja, Kiskőrös, Szekszárd, Paks, Solt és Dunaföldvár külön kárpit- és matractisztítási oldala, továbbá a közös `karpittisztitas-matractisztitas.html`. A tulajdonos 2026. szeptember 8-án engedélyezte a GitHubra feltöltést és az előző nyilvános változat cseréjét. Kiadási állapot: [MEDITERRANEAN-RELEASE.md](../../release-support/MEDITERRANEAN-RELEASE.md).

## Megtekintés

- Közös oldal: http://127.0.0.1:8089/demo/karpittisztitas-matractisztitas.html
- Kárpittisztítás: http://127.0.0.1:8089/demo/karpittisztitas-kalocsa.html
- Matractisztítás: http://127.0.0.1:8089/demo/matractisztitas-kalocsa.html

Mind a hét város elérhető a megőrzött navigációból és az új területi linkekből. A fájlok a meglévő demóneveken készülnek; például `demo/karpittisztitas-baja.html` és `demo/matractisztitas-paks.html`.

## Mit tartalmaz

- Lágy mészkő-, len-, olíva- és terrakottaszínek; nagy, olvasható szerkesztőségi tipográfia.
- Kilenc új arch-viz és oktatóillusztráció, hatféle bútor külön berendezett térben, saját SVG-ikonok.
- Húzható múlt/mai otthon összevetés és megőrzött, eredeti előtte–utána fotók. A matracfotók és az atkás képek eredeti képaránnyal jelennek meg.
- Hat képes bútorkategória, méret- és mennyiségválasztás, regionális matracárak, extrák, kiszállás és a főoldalon meglévő kedvezményszabályok.
- Kattintható szennyeződési pontok, billentyűzettel kezelhető képtáblák, nagyítóablak, kérdés-válaszok és visszafogott mozgás csökkentettmozgás-támogatással.
- Megőrzött fejléc, mobilmenü, lábléc és ügyfélvélemények. 945 navigációs hivatkozás változatlan.

## Ellenőrzés

2026-09-08: 15 oldal × 8 szélesség = **120 böngészőnézet, nulla hiba**. Szélességek: 320, 390, 680, 768, 1024, 1200, 1440, 1920 pixel. Mind a 15 oldalon az árösszesítés, utazási díj, vegyes kedvezmény, törlés, csúszka, atkás fülek, képnagyítás, jelölők és mobil/asztali menük végigpróbálva. 14 számítási és e-mailes ajánlatkérési teszt sikeres. Az e-mail címzettje, a teljes összesítő, a városváltás, az üres állapot, a másolás és a sikertelen vágólapművelet tartalékmegoldása is ellenőrizve mind a 15 oldalon. Nulla kimenő rendeléskérés. A független ellenőrzés jelentése: [REVIEW.md](REVIEW.md).

A `qa/verification.json` tartalmazza a részletes helyi böngészős bizonyítékot és a `qa/` mappa a képernyőképeket. Egy rejtett ugróhivatkozás megjelent a Chromium teljes elemet átfogó képernyőképén; külön valós viewport-próba igazolta, hogy fókusz nélkül a nézeten kívül van (`top:-100px`). A billentyűzettel elérhető ugróhivatkozást nem távolítottuk el.

## Újraépítés

```powershell
node demo/mediterranean/build.mjs
node release-support/build-release.mjs
node release-support/verify-release.mjs
node --test demo/mediterranean/configurator.test.mjs
python demo/mediterranean/verify.py --release
python release-support/verify-package.py
```

A Node/JSDOM függőséget a projekt meglévő `%TEMP%/ecoclean-demo-qa` környezete adja; a böngészős ellenőrzés Python Playwrightot használ. A képek a projektben vannak, újraépítéshez nem kell újból generálni őket. A `prepare_assets.py` kizárólag képoptimalizálást végez az eltárolt generált eredetikből, új képet nem készít.

**Építési sorrend:** ha a régebbi `demo/build_rollout.mjs` is lefut, utána futtasd a `demo/mediterranean/build.mjs` parancsot, mert a régi rollout felülírja az érintett demófájlokat. A mediterrán builder a `baseline/` mappában rögzített tizenöt korábbi oldalból olvassa a navigációt és a valódi referenciafotókat; nem használja fel újra a saját éles kimenetét. A `manifest.json` a 15 jóváhagyott kimenet és a stabil bemenetek hash-eit rögzíti. A kiadási builder és ellenőrzők ezt a jóváhagyási alapot is vizsgálják; a teljes szövegegyezési ellenőrzés megmaradt.

## Tartalmi és működési határok

Ezeken a településeken nincs online foglalás és nincs kapcsolat a főoldali naptárral. Az összeállító az `info@ecocleantisztito.hu` címre előkészített e-mailben adja át a tételeket, extrákat, várost, kiszállást, kedvezményt és tájékoztató végösszeget. A látogató a saját levelezőjében egészíti ki és küldi el a levelet. Másolható szöveg és kézi másolási tartalékmegoldás is elérhető. Üres összeállítás vagy hiányzó város esetén az ajánlatkérési gomb inaktív. Az ECO Clean ezután egyezteti az árat és az időpontot; a weboldal nem ígér elküldést vagy lefoglalt időpontot. A regionális méret szerinti árak megmaradtak.

Az egészségügyi szöveg általános ismeretterjesztés; nem állít teljes atka-, pete- vagy allergénmentességet, és nem ígér allergiagyógyítást. A megadott források közvetlenül a megfelelő bekezdések mellett szerepelnek. A régi/mai lakberendezési összevetés nem lakásállomány-statisztika és nem tisztítási referencia.

Árazási bizonyíték: [PRICING.md](PRICING.md). Szövegforrások: [CONTENT-SOURCES.md](CONTENT-SOURCES.md). Képfájlok, eredetik és teljes promptok: [ASSETS.md](ASSETS.md).
