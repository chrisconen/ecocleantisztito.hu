# ECO Clean kiadás — 2026. szeptember 7.

**Állapot: a tulajdonos engedélyezte a publikálást a hiányzó dokumentumok nélkül.** A korábban 404-es adatvédelmi/ÁSZF-linkek kimaradnak a nyilvános láblécekből; üres jogi oldal és impresszum nem készül. A dokumentumhiány többé nem kiadási feltétel. A döntést a `publication-policy.json` rögzíti.

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

A GitHub Pages jelenleg továbbra is a régi `main:/` forrást szolgálja ki. Nem történt push, publikálás, Pages-konfigurációváltás vagy régi forrás törlése.

A kiadás sorrendje: csomag újraépítése és teljes ellenőrzése; csak az ellenőrzött fájlok Git-be vétele; Pages átállítása Actions-alapú kiadásra; workflow futtatása; élő URL-ek, HTTPS, fájlok és naptár olvasó ellenőrzése. A régi webverziót az új artifact váltja fel. Az eredeti buildbemeneteket és a mentést helyben meg kell őrizni a reprodukálhatósághoz és visszaállításhoz.

```powershell
python release-support/booking-build.py
node release-support/build-supplemental.mjs
node release-support/build-release.mjs
node release-support/verify-release.mjs
node --test release-support/tests/booking-contract.test.mjs
python release-support/qa/booking_ui.py
python release-support/verify-package.py
```

A kiadási ellenőrzés továbbra is minden csomagfájlt, hivatkozást és SHA-256 hash-t vizsgál. A dokumentumok kihagyásának engedélyezése nem lazítja a többi ellenőrzést.
