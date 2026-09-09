# Online anyagfelismerés

Éles végpont: `https://ecocleantisztito.hu/api/material-health`.
Worker: `ecoclean-material-recognition`; privát R2: `ecoclean-materials`.
A `r2.dev` hozzáférés ki van kapcsolva; nincs nyilvános egyedi bucketdomain.

## Üzemeltetés

`wrangler deploy --config services/material-recognition/cloudflare/wrangler.json`
csak ezt a Workert és a szűk `/api/material-*` útvonalakat frissíti.
A titkokat a Wrangler meglévő környezete megőrzi.
`MATERIAL_PROVIDER` tulajdonosi beállítás: `gemini` vagy `openai`.
A rögzített modellek Gemini 2.5 Flash-Lite és GPT-5.6 Luna; nincs automatikus váltás.
A négy titok: GEMINI_API_KEY, OPENAI_API_KEY, TURNSTILE_SECRET_KEY, MATERIAL_SYNC_TOKEN.
Ezek nem kerülhetnek a Gitbe vagy a weboldal fájljai közé.

A Cloudflare `CSP header` válaszfejléc-szabályban a meglévő `script-src` és
`frame-src` listához hozzáadtuk a `https://challenges.cloudflare.com` címet.
A többi eredeti direktíva változatlan. A Turnstile `material-analysis` actiont
és az aktuális ECO Clean hostname-et a szerver ellenőrzi; az ügyfél nem küldhet
szolgáltatóválasztást. A szinkronkliens saját User-Agentet használ; az általános
Python User-Agentet a meglévő webhelyvédelem blokkolja.

## Adatút és hibák

A böngésző legfeljebb 1200 px-es JPEG-et készít. A Worker ellenőrzi a JPEG
szerkezetét és eltávolítja az APP/COM metaadatokat; teljes pixeldekódolást nem végez.
Csak hozzájárulással ment `photos/<uuid>.jpg` képet. A szinkron számára látható
`records/<uuid>.json` csak az elemzés végleges sikere vagy hibája után készül el.
Ha a szolgáltató hibázik, a hozzájárulással mentett kép letölthető, de az értékelés
hiányzik. Ha az archívum hibázik az elemzés előtt, nem indul fizetős kérés.
Megjegyzést, IP-t vagy kulcsot nem mentünk a képrekordba.

Tartós, tranzakciós korlát: 200 kérés/UTC-nap, 10/IP/UTC-óra, 4 párhuzamos kérés.
A 120 másodperces foglalások hiba esetén lejárnak; a napi keret nem áll vissza
újratelepítéskor. A keret próbálkozásokat számol, így szolgáltatói hiba is fogyasztja.
Nincs korlátlan automatikus újrapróbálás. A Cloudflare saját csomagkorlátai is érvényesek.

A privát szinkronkulcs jogosít a képek letöltésére, a referencia-készlet közzétételére
és az operátori próbaelemzésre. Az operátori próba ugyanazokat a kvótákat és mentési
szabályokat követi, csak a böngészős Turnstile-t nem igényli.
Ez a kulcs a saját gép bizalmi határa: elvesztésekor cserélni kell a Workerben és
a privát `sync-config.json` fájlban is. Végpontok: `material-admin/manifest`,
`material-admin/items/<UUID>`, `material-admin/references`, `material-admin/analyze`.

A referencia-készlet legfeljebb négy, kézzel ellenőrzött és aktivált kép.
Közzététel: `python services/material-recognition/sync.py --publish-references`.
Az üres aktív készlet közzététele kikapcsolja az összehasonlító képeket.
Egy helyi törlés nem töröl R2-ből; távoli törlés külön üzemeltetői művelet.

## Ellenőrzés

`node --test services/material-recognition/cloudflare/tests/*.test.mjs`
offline adapter-, jogosultsági, archívum- és kvótateszteket futtat.
`python services/material-recognition/cloudflare/smoke.py probe` csak állapotot és
jogosultságokat ellenőriz. A `smoke` és `luna` műveletek valódi szolgáltatói hívást
végeznek generált tesztképpel; ne futtasd automatikus tesztként.
A sikeres próba az integrációt igazolja, az anyagbecslés pontosságát nem.

A PC automatikus indítását és a kézi válogatást a szülőmappa README-je ismerteti.
