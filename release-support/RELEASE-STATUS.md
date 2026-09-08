# ECO Clean aktuális kiadás — 2026. szeptember 8.

**Állapot: a mediterrán frissítés éles, sikeresen publikálva.** A 15 megújult kárpit-/matracoldal e-mailes ajánlatkérést használ az `info@ecocleantisztito.hu` címre; ezen városoknál nincs online foglalás vagy főoldali naptárkapcsolat. A főoldal saját foglalója változatlan.

352 kiadási fájl ellenőrizve az éles domainen, 120 regionális böngészőnézet és 15 interakciós próba: nulla hiba. A 22 régi CSS-fájl eltávolítva. Kiadási commit: `b26fded784227770abfb7e16510bd760dd775c1a`. Részletek, mentés és bizonyítékok: [MEDITERRANEAN-RELEASE.md](MEDITERRANEAN-RELEASE.md).

Az alábbi szeptember 7-i leírás a korábbi kiadás történeti feljegyzése; az aktuális csomagadatait a fenti dokumentum és a `live-verification.json` rögzíti.

# ECO Clean kiadás — 2026. szeptember 7.

**Állapot: éles, sikeresen publikálva 2026. szeptember 7-én, 15:32-kor (Europe/Budapest).** Nyilvános cím: https://ecocleantisztito.hu/. A tulajdonos engedélyezte a publikálást a hiányzó dokumentumok nélkül. A korábban 404-es adatvédelmi/ÁSZF-linkek kimaradtak a nyilvános láblécekből; üres jogi oldal és impresszum nem készült. A döntést a `publication-policy.json` rögzíti.

Előnézet: `http://127.0.0.1:8089/release/`. A csomag tényleges backendhez kapcsolódó kódot tartalmaz; kézi próbáláskor a beküldés valódi kérelmet küldhet. Az automatizált próbák minden rendeléskérést elfognak.

## Elkészült

- Mind a 138 eredeti oldal átkerült az önálló csomagba; az eredeti forrásfájlok hash-e változatlan. Az aloldali szövegek, menücímkék és szekciósorrend megmaradtak.
- Kalocsa, Baja, Kiskőrös, Szekszárd, Paks, Solt és Dunaföldvár összesen 14 kárpit-/matracoldala új, egységes regionális megjelenést kapott.
- Négy korábban hiányzó szőnyegtisztítási oldal készült meglévő általános szolgáltatási szövegekkel, kitalált helyi címek és díjak nélkül.
- A foglaló és naptár éles integrációja visszakerült. Az eredeti árak és payload-szerkezetek megmaradtak; javult a hibakezelés, az elavult időpontok kizárása és a nagymegrendelések adatellenőrzése.
- Canonical, sitemap, megosztási képek és alkalmazásikonok javítva. A csomagból eltűntek a demójelzések és a noindex tiltások.
- A 362 fájlos, körülbelül 14,85 MB-os csomag kizárólag futási függőségeket tartalmaz. Négy régi URL külön HTML-átirányítást kapott; a meglévő galéria-átirányítás megmaradt.
- A `.github/workflows/deploy-pages.yml` csak a `release/` tartalmát publikálja. A manifest és az ellenőrzési jelentés azonos csomagra kell vonatkozzon; a Git nem módosíthatja az ellenőrzött bájtokat.

## Ellenőrzések

- 137 tartalmi oldal × 6 kijelzőméret = 822 böngészőnézet: hero- és kártyarács-vizsgálat, nulla hiba.
- A 14 új regionális oldal × 10 méret = 140 nézet: nulla hiba; menük, billentyűzetes vezérlés és összehasonlító elemek ellenőrizve.
- 16 foglalási szerződésteszt, ezen belül 113 eredeti–új ár-/időtartam-összehasonlítás: mind sikeres.
- Hat teljes böngészős beküldési próba: normál foglalás és nagymegrendelés asztali/mobil nézetben, betelt időpont, hálózati bizonytalanság. Hat elfogott kérés, nulla valódi rendelés.
- A valódi időpont-lekérdezés és böngészős CORS-elővizsgálat sikeres. Valódi foglalás létrehozását, nagymegrendelési válaszát és értesítéskézbesítését nem próbáltuk ki.
- Független követelmény- és kódminőség-ellenőrzések lezárultak; a talált hibák javítva.
- A statikus ellenőrzés 142 oldal 19 004 hivatkozását, 1817 közvetlen erőforrását és 155 CSS-fájlját vizsgálja. A korábbi 170 hibás dokumentumhivatkozás eltávolítva; a többi eredeti tartalom megmaradt.

Bizonyítékok: `release-manifest.json`, `release-verification.json`, `qa/layout-audit.json`, `qa/booking-ui.json`, `tests/booking-contract.test.mjs`, `booking-integration.md`, `../demo/qa/regional-redesign-audit.json`, `supplemental-notes.md`.

## Mentés és élesítés

Az éles előző forrásrevizió: `173e4d1ad866528b9eda116da3b920e30ad3d394`.

Helyi mentés: `backups/ecoclean-before-redesign-173e4d1.zip`; SHA-256: `1447d6951fd1c4f38275f4cee238af8a0505d754814ef85959d72ede3cb625ee`. A mentés és a helyi konfigurációs fájl Git-kizárást kapott.

A kiadás commitja: `72ba0c43bd4bf0818630a5e2a96fcbaf3a1aeca9`. A főágra küldött csomag a GitHub Pages Actions-alapú publikálásával váltotta fel a régi nyilvános webverziót. A csomagellenőrzés és a deploy egyaránt sikeres: https://github.com/chrisconen/ecocleantisztito.hu/actions/runs/34127955341. A deploy befejezése: `2026-09-07T13:32:57Z`.

Az eredeti buildbemenetek és a helyi mentés megmaradtak a reprodukálhatósághoz és visszaállításhoz. A workflow kizárólag a `release/` csomagot teszi közzé; a források, demó és mentés URL-jei nem részei a nyilvános weboldalnak.

## Éles ellenőrzés és üzemeltetési határok

- A 362 csomagtétel éles ellenőrzése hibamentes: 219 válasz bájtra egyezik; 141 HTML a Cloudflare e-mail-védelmének pontos visszaalakítása után egyezik; a `robots.txt` az azonosított, hash-sel rögzített Cloudflare-kiegészítés eltávolítása után egyezik. A `.nojekyll` nem nyilvános buildjelölő, 404-es válasza elvárt. Más eltérést az ellenőrző nem fogad el.
- Mind a nyolc vizsgált kizárt útvonal 404-et ad: demó, csomagkönyvtár, belső manifest, mentés, helyi konfiguráció és a három hiányzó dokumentum. Részletes helyi bizonyíték: `qa/live-assets.json`; verziózott összesítés: `live-verification.json`.
- Az éles normál foglaló és nagymegrendelő 1440 és 390 pixeles nézetben is végigpróbálva: négy sikeres böngészős eset, négy elfogott rendeléskérés, nulla valódi rendelés, nulla JavaScript-hiba. A sikeres válaszok tesztválaszok; a szerveroldali rendeléslétrehozás és értesítéskézbesítés továbbra sem kipróbált.
- A publikus HTTPS a meglévő Cloudflare-proxyn keresztül érvényes tanúsítvánnyal működik. DNS- vagy Cloudflare SSL-beállítás nem változott.
- A közvetlen GitHub Pages eredeti szerver tanúsítványa 2026. szeptember 6-án lejárt (`bad_authz`); ezt a külön üzemeltetési hibát a jelenleg működő nyilvános Cloudflare-tanúsítvány nem javítja meg. A proxy kikapcsolása vagy a szigorúbb eredeti szerverellenőrzés bekapcsolása előtt rendezni kell az eredeti szerver tanúsítványát.
- A HTTP-címre érkező böngészőt a HTML-ben lévő JavaScript HTTPS-re irányítja, az útvonal és paraméterek megőrzésével. Ez nem szerveroldali HTTP 301; a Cloudflare-szabályokhoz nincs rendelkezésre álló hozzáférés ebben a munkamenetben.

```powershell
python release-support/booking-build.py
node release-support/build-supplemental.mjs
node release-support/build-release.mjs
node release-support/verify-release.mjs
node --test release-support/tests/booking-contract.test.mjs
python release-support/qa/booking_ui.py
python release-support/verify-package.py
python release-support/verify-live.py
python release-support/qa/booking_ui.py --live normal large
```

A kiadási ellenőrzés továbbra is minden csomagfájlt, hivatkozást és SHA-256 hash-t vizsgál. A dokumentumok kihagyásának engedélyezése nem lazítja a többi ellenőrzést.
