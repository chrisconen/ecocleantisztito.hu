# Napi szövetellenőrzés

Munkanap elején és végén indítsd a privát mappa **Ellenorzes inditasa.cmd**
fájlját. Lekéri az új kéréseket, majd megnyitja a helyi listát. Sikertelen
lekérésnél hibával leáll: a régi helyi lista nem bizonyítja, hogy online nincs
új kérés. A háttérletöltés továbbra is ötpercenként fut, ha a gép működik.

1. A legrégebbi megválaszolatlan kéréssel kezdj. Előbb a fotót vizsgáld,
   aztán vesd össze az előzetes, nem ellenőrzött becsléssel.
2. A megfelelő válaszvázlatot nyisd meg, ellenőrizd a címzettet és a szöveget,
   majd küldd el a saját leveleződben. A program nem küld helyetted levelet.
3. Az indító ablakában válaszd a kérés sorszámát és a döntést. Írd le röviden,
   mi alapján döntöttél; csak az elküldött válasz után írd be: **ELKÜLDTEM**.
4. A döntés és az időpont a kérés mappájában megmarad. A lezárt kérés a lista
   alján, lenyitható csoportban található. Nem írjuk felül a korábbi döntést.
5. Ha további képet kértél, a leveleződben figyeld a válaszokat. A bejövő
   válaszlevelek feldolgozása nincs automatizálva.

A tényleges ellenőrzést és válaszküldést az üzemeltető végzi. Nincs nyilvános
válaszidő-ígéret: azt csak fenntartható napi kapacitás mellett érdemes vállalni.

## Ellenőrzött minták gyűjtése

Az `ellenorzott-probak/index.html` privát kontrolltárban találod a mintákat és a
gyűjtési tervet. Az első fotó a tulajdonos saját lakókocsiszövete. Az adatlap
jelzi, hogy az elvárt besorolás tulajdonosi megállapításon alapul; nem állít
igazolt márkát, szálösszetételt vagy laboratóriumi vizsgálatot.

Első cél: 12 különböző, ismert eredetű bútor képe: 4 jól szövött textil,
4 igazolt NovaLife, 4 nehéz kontroll (velúros, mikroszálas, bevonatos, rossz fotó).
Ez munkaterv, nem pontossági garancia. Egy bútor négy kivágása egy minta marad.

- Készíts egy közeli és egy teljes felületet mutató képet természetes fényben.
- NovaLife-nál legyen dokumentálva az eredeti anyagmegnevezés/címke és kapcsolata
  a lefényképezett bútorral. Más Andante-anyagot ne jelölj NovaLife-nak.
- Az elvárt eredmény és az ellenőrzés alapja maradjon külön a program becslésétől.
- Saját fotót a `validation_samples.py add` paranccsal lehet felvenni, a
  `--photo`, `--expected`, `--label`, `--evidence`, `--owner-permission` mezőkkel.
  Ez tulajdonosi használati engedély, nem kitalált ügyfél-hozzájárulás.
- Ügyfélfotónál az e-mailes ellenőrzési hozzájárulás nem elég referenciahasználathoz.
  A külön referencia-hozzájárulással bekerült képeket a meglévő privát
  `index.html` katalógus és az `archive.py approve` munkafolyamat kezeli.
- A kontrollminták nem aktív referenciák. A tényleges összehasonlítás továbbra is
  a három jóváhagyott gyártói NovaLife-képet kapja; módosítása külön, ellenőrzött
  közzététel. A kontrollkép aktiválása a saját tesztjét torzítaná.

Módosított felismerésnél ugyanazon kontrollkészleten hasonlítsuk össze a téves
átengedést, a szövött textil téves visszatartását és a bizonytalan válaszokat.
Új képek nélkül nem állíthatunk javuló pontosságot.

## Technikai határok

Minden kép, e-mail és döntési adat a projekten kívüli privát tárban marad.
A helyi oldal pillanatkép, az e-mailes válasz küldése emberi művelet. A döntési
napló a kezelő nyilatkozatát rögzíti; nem igazolja SMTP-kézbesítés megtörténtét.
A kontrollimport nem hív külső szolgáltatót és nem módosít aktív referenciákat.
