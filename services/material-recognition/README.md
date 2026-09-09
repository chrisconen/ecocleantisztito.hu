# ECO Clean — képelemzés és privát anyagreferenciák

A `D:/youtube/karpit` prototípusból kialakított szolgáltatás. Az eredeti alkalmazást nem módosítja. A demó 35 fő-/kárpittisztítási oldalán ugyanaz a felület működik, a meglévő kalkulátor- és foglalási útvonalakkal.

## Indítás a saját gépen

Python 3.11+ és a `requirements.txt` szerinti Pillow szükséges. A szolgáltatót az üzemeltető választja ki; az ügyfél sem modellválasztót, sem modell-/szolgáltatónevet nem lát:

| Modell | Kiszolgálóoldali környezeti változó |
|---|---|
| Gemini 2.5 Flash-Lite (`gemini-2.5-flash-lite`) | `GEMINI_API_KEY` (vagy `GOOGLE_API_KEY`) |
| GPT-5.6 Luna (`gpt-5.6-luna`) | `OPENAI_API_KEY` |

A kulcsokat ne tedd HTML-be, Gitbe vagy a nyilvános webmappába. A `start-local.ps1` a jelenlegi folyamatból, hiány esetén a Windows felhasználói környezetéből olvassa őket; értéküket nem írja ki. Az Anthropic-kulcs nem szükséges. A korábbi Anthropic-adapter csak külön fejlesztői kompatibilitási lehetőségként maradt meg, a látogatói felületen nem jelenik meg.

```powershell
powershell -NoProfile -File services/material-recognition/start-local.ps1 -Provider gemini
```

Előnézet: <http://127.0.0.1:8096/demo/index.html#anyagfelismero>.

Lunához ugyanez `-Provider openai` paraméterrel indítható. A váltáshoz állítsd le a saját futó szolgáltatást és indítsd újra az új beállítással.

Közvetlen indítás: `python services/material-recognition/server.py --serve-demo --dev-cors`.
A `--dev-cors` kizárólag a régi 8089-es localhost demóból enged kéréseket. A kiszolgáló 127.0.0.1:8096 címen fut, és csak a kiválasztott nyilvános demófájlokat szolgálja ki. Egy foglalt portot nem vesz át más folyamattól.

## A fotók helye és válogatása

Alapmappa: **`E:\ECOCLEAN\anyag-referenciak`**, a webprojekt mappáján kívül. Állítható: `MATERIAL_ARCHIVE_DIR`. A projektmappán belüli célkönyvtárat a szolgáltatás elutasítja, mert a régi 8089-es egyszerű statikus szerver rejtett fájlokat is kiszolgál. A `.gitignore` önmagában nem hozzáférés-védelem.

- Az `inbox` a beérkezett, még nem ellenőrzött képek helye.
- A `references/andante` az Andante címkével jóváhagyott képek külön gyűjteménye.
- A `references/other` az egyéb vagy ismeretlen márkájú, ellenőrzött anyagreferenciák helye.
- Az `index.html` helyben, dupla kattintással nyitható képes katalógus. Nem kell és nem szabad nyilvánosan kiszolgálni.
- A kép mellé időpont, azonosító, képhash, szolgáltató/modell és hozzájárulási verzió kerül. A modell válasza külön, **nem ellenőrzött becslésként** szerepel. IP-cím, API-kulcs és látogatói megjegyzés nem kerül az archívumba.

Csak az adott fotóra külön, alapból üres jelölőnégyzettel adott hozzájárulás után történik mentés. A hozzájárulás a később szakember által jóváhagyott kép külső képfeldolgozó szolgáltatással végzett összehasonlítását is jelzi, technikai modellnevek nélkül. Nélküle az elemzés működik, de helyi fotómentés nincs. A böngészőből beküldött, legfeljebb 1200 képpontos JPEG kerül mentésre, újrakódolva és metaadatok nélkül; nem a telefon eredeti teljes felbontású fájlja.

Válogatás a projektmappából:

```powershell
# A galéria frissítése és útvonalának kiírása
python services/material-recognition/archive.py gallery

# UUID: a katalógusban megjelenő tényleges képazonosító.
# Csak ellenőrzött anyagot/márkát írj be, ne másold át ellenőrzés nélkül az AI becslését.
python services/material-recognition/archive.py approve --id UUID --material "zsenília" --brand "Andante" --label "Ellenőrzött kanapészövet" --evidence "Gyártói címke és anyagminta ellenőrizve" --human-verified

# A jóváhagyás önmagában még nem kapcsolja be az összehasonlítást.
python services/material-recognition/archive.py activate --id UUID
python services/material-recognition/archive.py deactivate --id UUID

# Kivonás a referenciákból, beérkezett fotó megtartásával:
python services/material-recognition/archive.py reject --id UUID

# Csak ha valóban végleg törölni szeretnéd az adott képet és referenciáját:
python services/material-recognition/archive.py delete --id UUID
```

A katalógus sikeres mentés után automatikusan is frissül. A referenciaállományokat a CLI kezeli; pusztán képfájlok bemásolása nem aktivál referenciát. Egy időben legfeljebb négy ellenőrzött referencia aktív. A helyi API mindkét elemzője ugyanazokat az aktív képeket használja a következő kérésben, külön jelölve az ügyfél célképétől; az online API-hoz a készletet külön közzé kell tenni az alábbi paranccsal. Az új referenciákhoz nem kell szervert újraindítani. Ez összehasonlító kontextus, **nem modelltréning** és nem automatikus teljes könyvtári képkeresés. A referenciaképek növelik az adott hívás bemeneti tokenköltségét.

Az Andante márka, nem anyagkategória. Vizuális hasonlóság alapján a program nem igazol Andante-eredetet, szálösszetételt vagy tisztíthatóságot. W/S/WS/X csak a célképen olvasható kezelési címkéből származhat; referenciáról nem vehető át.

## Működés és korlátok

`GET /api/material-health` → `enabled`, `ready`, `collection_enabled`; nem fedi fel a szolgáltatót, modellnevet vagy kulcsot. A `ready` konfigurációs állapot: a kulcs jelenléte nem bizonyít egyenleget, modellhozzáférést vagy sikeres API-hívást. Hiányzó kulcsnál az üzemeltető által kiválasztott elemzés nem indítható. Alapértelmezés Gemini; nincs automatikus átváltás másik szolgáltatóra.

`POST /api/material-analyze`:

```json
{"image":"data:image/jpeg;base64,...","media_type":"image/jpeg","note":"Opcionális megjegyzés","archive_consent":false}
```

Egy kattintás pontosan egy kiválasztott szolgáltatói hívás. Nincs automatikus második modell vagy újrapróbálás. A sikeres válasz a korábbi 11 eredménymezőt és egy `_meta` objektumot tartalmaz: `archive_requested`, `archive_saved`, `reference_count`. A szolgáltató/modell kizárólag az üzemeltető privát fotótári rekordjában szerepel; a kliens `provider` mezőjét a szerver elutasítja. Ha a fotó megőrzése sikerült, de az elemző hibázott, a 502-es válasz ezt is jelzi. Ha a kért képmentés nem sikerül, szolgáltatói hívás nem indul. A modellek válaszai nem írhatnak fájlútvonalat, HTML-t, rendelést, árat vagy foglalást.

Feltöltés: 6 MiB kérés, 4 MiB képadat, legfeljebb 16 megapixel, 2000 karakter megjegyzés. A frontend JPG/PNG/WebP fájlból készít JPEG-et. A régi statikus GIF bemenet Geminihez közvetlenül nem használható. Sérült kép, animáció, hamis MIME, duplikált JSON-kulcs és idegen mező elutasítva.

Alapból 200 kérés/UTC-nap, IP-nként 10/óra, négy párhuzamos elemzés. Állítható: `MATERIAL_DAILY_LIMIT`, `MATERIAL_IP_HOURLY_LIMIT`. Ezek memóriabeli, folyamatonkénti korlátok; újraindításkor nullázódnak. A foglalás után sikertelen kérések is fogyasztják a helyi keretet. Képgyűjtő alapkorlát: 2 GiB. A tár nem titkosított; a Windows-fiók hozzáférési jogosultságai és a saját biztonsági mentésed számítanak.

`MATERIAL_ENABLED=0` letiltja az elemzést; `MATERIAL_COLLECTION_ENABLED=0` letiltja a mentést és a referenciahasználatot. `MATERIAL_PROVIDER=gemini|openai` megadja az alapértelmezést. A modellazonosítók a két kért modellre vannak rögzítve.

## Online működés és tulajdonosi beállítások

Az online API-t a `cloudflare` mappa szerinti Cloudflare Worker kezeli az `ecocleantisztito.hu/api/material-*` útvonalakon. A GitHub Pages a weboldalt szolgálja ki; a Python-kód a saját PC-n a privát letöltést és válogatást végzi. A felhős elemzés és a hozzájárulással kért R2-mentés a PC kikapcsolt állapotában is működhet. A képek a következő sikeres PC-s szinkronizáláskor jelennek meg a helyi katalógusban.

A Worker tulajdonosi beállításai:

| Beállítás | Szerep |
|---|---|
| `MATERIAL_PROVIDER=gemini` vagy `openai` | Az online elemző választása; az ügyfél nem módosíthatja. |
| `GEMINI_API_KEY`, illetve `OPENAI_API_KEY` | A kiválasztott szolgáltató titkos kulcsa, Worker secretként. |
| `TURNSTILE_SITE_KEY` és `TURNSTILE_SECRET_KEY` | Látogatói botvédelem; a secret soha nem kerül a weboldalba. |
| `MATERIAL_SYNC_TOKEN` | Külön titkos jogosultság a PC-s letöltéshez és az ellenőrzött referenciák közzétételéhez. |
| `MATERIAL_PHOTOS` | Kötés a privát `ecoclean-materials` R2 buckethez. |
| `MATERIAL_QUOTA` | Tartós kéréskorlátot kezelő Durable Object. |

A modellválasztás a Worker `MATERIAL_PROVIDER` változójában történik; az új beállítás csak a megfelelő szolgáltatói kulccsal használható. Nincs automatikus másik modellre váltás. A publikus health-válasz konfigurációs készenlétet jelez, nem garantál rendelkezésre álló API-egyenleget vagy sikeres elemzést. Az online korlát 200 kérés/UTC-nap, 10/IP/óra és legfeljebb négy párhuzamos elemzés; a számlálók a Worker újratelepítésén túl is megmaradnak.

Az R2 publikus `r2.dev` hozzáférése le van tiltva. A képekhez nem publikus képlink, hanem hitelesített admin API tartozik. A `photos/<UUID>.jpg` képet a szolgáltatás a végleges `records/<UUID>.json` eredménnyel kapcsolja össze. A manifest csak lezárt elemzéseket mutat: az `annotation:null` véglegesen hiányzó eredményt jelent, nem folyamatban lévő elemzést. A hozzájárulás nélküli ügyfélképek nem kerülnek ebbe a képtárba.

### PC-s letöltés

A privát `E:\ECOCLEAN\anyag-referenciak\sync-config.json` konfiguráció `endpoint` és `token` mezőt tartalmaz. Az endpoint `https://ecocleantisztito.hu`, a token a Worker `MATERIAL_SYNC_TOKEN` értékével egyezik. A fájlt az üzemeltető kezeli; ne másold Gitbe, a webmappába, naplóba vagy parancssori argumentumba. A PC-s letöltőnek nincs szüksége Gemini-/OpenAI-kulcsra.

```powershell
# Egyszeri letöltés és a helyi index.html frissítése:
python services/material-recognition/sync.py --once

# Előtérben ismétlődő letöltés, ha kézzel szeretnéd futtatni:
python services/material-recognition/sync.py --watch --interval 300
```

A letöltő ellenőrzi a hozzájárulási rekordot, UUID-t, SHA-256 képhash-t, JPEG-formátumot és méretet. Hiba után a következő kör újrapróbálható. A már letöltött képeket és a kézi jóváhagyást nem írja felül. A `.sync-receipts` bizonylatai miatt a PC-ről később törölt képet sem tölti vissza automatikusan. A bizonylatokat ne töröld rutinból. A PC-s törlés önmagában nem törli az eredeti R2-példányt; a felhős megőrzés és törlés külön üzemeltetői feladat.

### Automatikus indítás Windows-bejelentkezéskor

Az alábbi telepítő csak regisztrálja az aktuális felhasználó feladatát. Nem indít elemzést, nem tesz közzé referenciát, nem kér rendszergazdai jogosultságot vagy jelszót, és jogosultsági hiba esetén megáll. Másik automatikus indítási módszerre nem vált át. A képtárnak, a privát konfigurációnak, Python 3.11+-nak és a Pillow-függőségnek már rendelkezésre kell állnia.

```powershell
powershell -NoProfile -File services/material-recognition/install-sync.ps1

# Első indítás most; később az adott felhasználó bejelentkezésekor indul:
Start-ScheduledTask -TaskName 'ECOClean-Material-Photo-Sync'

# Feladat és utolsó kilépési eredmény:
Get-ScheduledTask -TaskName 'ECOClean-Material-Photo-Sync'
Get-ScheduledTaskInfo -TaskName 'ECOClean-Material-Photo-Sync'

# Titkot nem tartalmazó részletes szinkronállapot:
Get-Content -Encoding utf8 -LiteralPath 'E:\ECOCLEAN\anyag-referenciak\sync-status.json'

# Leállítás szükség esetén:
Stop-ScheduledTask -TaskName 'ECOClean-Material-Photo-Sync'
```

A feladat `pythonw.exe` használatával ablak nélkül, 300 másodperces lekérdezési időközzel fut. Egyszerre egy példány dolgozhat; egy ismételt kézi indítás nem indít párhuzamos letöltőt. Az adott Windows-fióknak bejelentkezve kell maradnia. A PC alvása, kikapcsolása vagy kijelentkezés alatt nincs helyi letöltés; az online Worker ettől külön működik.

A `sync-status.json` mezői: `state` (`starting`, `syncing`, `ok`, `error`, `stopped`), `updated_utc`, utolsó kísérlet/siker/hiba UTC-ideje, `counts`, `interval_seconds` és folyamat-azonosító. A `counts` a legutóbbi sikeres kör összesítése. Az `error_code` rögzített kategória: `configuration`, `network_or_protocol`, `archive` vagy `unexpected`; nem tartalmaz titkot vagy szolgáltatói válaszszöveget. A `sync-events.log` legfeljebb 128 KiB, két forgatott példánnyal. A háttérfutó nem naplózza a képet, tokent, fejlécet vagy kivétel tartalmát.

Régi állapotidő vagy hiányzó státuszfájl esetén ellenőrizd a Windows-feladat állapotát és `LastTaskResult` értékét is. A kényszerített leállítás nem feltétlenül tud új állapotfájlt írni. Megtelt vagy nem írható képtár esetén a napló/státusz frissítése is meghiúsulhat; a rejtett folyamat ilyenkor nem nulla kilépési kódot ad. A konfiguráció a következő körben újra beolvasásra kerül, így a szinkrontoken cseréjéhez nem kell szolgáltatói kulcsot a PC-re másolni.

### Ellenőrzött referenciák online közzététele

Az `archive.py approve` és `activate` csak a helyi készletet változtatja meg. Az online rendszerhez külön, tudatos lépés szükséges:

```powershell
python services/material-recognition/sync.py --publish-references
```

Ez kizárólag a legfeljebb négy, ember által jóváhagyott és aktivált referencia aktuális készletét küldi a Workernek. A háttérfeladat soha nem futtatja ezt a műveletet. Az üres helyi készlet közzététele kiüríti az online aktív készletet is. Helyi deaktiválás vagy törlés után újra közzé kell tenni a készletet, hogy a változás az online elemzőnél is érvényesüljön. A referenciasnapshot a felhőben a PC kikapcsolása után is használható.

A helyi 2 GiB korlát nem felhős R2-kvóta vagy megőrzési határidő. A két tároló kapacitását, jogosultságait és mentését külön kell kezelni. Sem a képhash, sem az AI-becslés nem igazolja önmagában a márkát, anyagot, ügyfél-hozzájárulást vagy tisztíthatóságot; az eredet hitelesítését a hozzáférési határ, az anyagigazolást a dokumentált emberi ellenőrzés biztosítja.

## Ellenőrzés

### NovaLife előzetes szűrés

A widget 35 éles oldalon érhető el: a főoldalon és a 34 kárpittisztítási oldalon.
Az árak környékén megjelenő CTA az adott oldal saját `#anyagfelismero` részére visz.
A nyolc mediterrán oldal továbbra is e-mailes ajánlatkérést használ.

A régi 11 válaszmező mellé a `novalife: {status, reason}` objektum került.
Lehetséges státuszok: `likely_other`, `possible_novalife`, `label_novalife`, `uncertain`.
A hiányzó régi mező a felületen bizonytalannak számít. A címkés jelzés előzetes
kiolvasás; a fotó, a megjegyzés és a szolgáltatói válasz nem hiteles anyagigazolás.
Csak a `likely_other` állapot kínál visszautat a helyi árkalkulátorhoz/foglalóhoz;
a többi telefonos egyeztetést és új fotót kínál. Egyik sem ad tisztítási engedélyt.
A fotó alapján a víztaszítás, impregnálás és pontos szálösszetétel nem igazolható.

Gyártói háttér: [ANDANTE bevonóanyagok](https://andante.hu/bevono-anyagok/),
[2024-es kezelési útmutató](https://andante.hu/wp-content/uploads/2024/05/HKU-Magyar-5.7-KanizsaTrend-2024-04-15-javitott.pdf).
Az ANDANTE márka és a NovaLife anyagcsalád külön fogalom; nem minden ANDANTE bútor NovaLife.
A prompt a NovaLife külön kezelési előírásaira hivatkozik, nem általános víztilalomra.

Kézi, fizetős integrációs próba: `python services/material-recognition/cloudflare/verify_novalife_live.py`.
Három gyártói katalógusmintát tölt le memóriába és elemez, archiválás és referencia-aktiválás nélkül.
A 2026-09-09-i pilot eredménye két `possible_novalife` és egy `uncertain`; nincs `likely_other`.
Ez kis mintás működési próba, nem pontosságmérés. Ellenőrzött valódi NovaLife- és
nem NovaLife-fotókból álló, külön tesztkészlet szükséges a téves kizárás és a
felesleges bizonytalanság arányának méréséhez. Egyetlen ügyfélfotóra ne hangoljuk a szűrést.

```powershell
python -m unittest discover -s services/material-recognition -p "test_*.py" -v
node --test demo/material-recognition/provider.test.mjs
python demo/material-recognition/verify.py --quick
```

Az egység- és HTTP-tesztek generált képekkel, helyettesített szolgáltatóval dolgoznak, nem költenek API-egyenleget. A `smoke_provider.py --provider gemini` külön, valódi szolgáltatói hívás, csak a demó generált enteriőrképével; nem anyagfelismerési pontossági mérés. Az OpenAI éles működése csak érvényes kulccsal tesztelhető.
