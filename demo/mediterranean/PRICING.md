# Mediterrán regionális árkalkulátor

Készült: 2026-09-08. A modul kizárólag helyi, tájékoztató számítás; nem rendel, nem küld hálózati kérést, nem tárol személyes adatot, és nem állítja, hogy a főoldalra átviszi a választásokat.

## Bekötés

```html
<div data-med-configurator data-city="kalocsa"
     data-assets="mediterranean/assets"
     data-booking-url="index.html#booking"></div>
<script src="mediterranean/configurator.js" defer></script>
```

A script minden `[data-med-configurator]` elemet automatikusan inicializál. Az `EcoMediterraneanPricing.mount(root)` kézzel is hívható, ismételt hívása nem duplikálja a felületet. A visszakapott objektum `getSelection()` és `getEstimate()` metódusokat ad. Az összeg változásakor a gyökér `med-config-change` eseményt küld, `detail` mezőjében a számítással. A katalógus és a díjadatok rekurzívan fagyasztottak.

```js
EcoMediterraneanPricing.calculate({
  city: 'kalocsa',
  travelZone: 'belvaros',
  items: [
    { id: 'sectional-sofa', variant: 'l', quantity: 1, mite: true, sleepSurface: false },
    { id: 'mattress', variant: 'queen-ab', quantity: 1 }
  ],
  extras: { stain: false, protection: false, deodorizing: false, wet: true, frame: false }
});
```

Visszatérés: `lines`, `serviceSubtotal`, `travelFee`, `subtotal`, `discountPercent`, `discount`, `total`, `counts`, `hasItems`, `travelIncluded`, `minimumFee`. A `minimumFee` null: a vizsgált forrásokban nincs minimum megrendelési díj, ezért nem vezettünk be egyet. A darabszám 0–99 közötti egész szám; hibás azonosító vagy darabszám kivételt okoz. A `city` tájékoztató érték, mert a hét város díjtáblája megegyezik. A kiválasztott régióhoz tartozó helyszínt az egyeztetés során szükséges pontosítani.

## Árak bizonyítéka és meglévő eltérések

- Mind a hét `karpittisztitas-{város}.html` forrás: L kanapé 17 500, U kanapé 22 500, kanapéágy 17 500, fotel 6 500, ebédlőszék 3 500, irodai szék 4 000 Ft-tól. Városok: Kalocsa, Baja, Kiskőrös, Szekszárd, Paks, Solt, Dunaföldvár.
- Ugyanezen hét `matractisztitas-{város}.html` forrás méret szerint egy/két oldal: 90×200 cm 8 000/12 000; 140×200 cm 10 000/15 000; 160×200 cm 12 000/16 000; 180×200 cm 13 000/18 000; gyerekmatrac 5 000/8 000 Ft-tól. Nedves foltkezelés +5 000 Ft/felület.
- A `release-support/booking-live.js` főoldali `PRICING` tartalmazza az általános szófa/heverő 15 500 Ft-os árát; ez bővíti a regionális választékot. A többi közös bútorára egyezik a regionális árakkal. E forrás az extrák és kedvezmények alapja is.
- Minden regionális oldalon és a főoldali kalkulátorban egyezik a kiszállás: városon belül 3 500, külváros 4 000, 10 km-es körzet 4 500, 20 km-es körzet 5 500 Ft. A főoldali `20km` és `40km` belső azonosítók örökölt elnevezések; a felirat a tényleges 10/20 km.
- A főoldal általános franciaágy kategóriája 12 000/17 000, a gyerekmatrac 5 000/7 000 Ft, tehát **nem egyezik** a regionális méret szerinti táblával. Az új modul a regionális pontos méreteket és árakat őrzi. A tulajdonos pontosítása szerint ezek a városok külön időpontegyeztetéssel működnek: a konfigurátor kizárólag e-mailes ajánlatkérést készít elő az `info@ecocleantisztito.hu` címre, nem vezet a főoldali foglalóhoz.
- A `karpittisztitas-matractisztitas.html` korábbi FAQ JSON-LD 5 000 Ft fotel és 10 500 Ft kanapé induló árat tartalmaz, ami ellentmond mind a hét részletes regionális díjtáblának és a főoldali aktuális kalkulátornak. E régi FAQ értékeket a modul nem használja; a lapot építő folyamatnak egységesítenie kell a metaadatot.

Extrák a főoldal alapján: kanapé/szófa száraz atkamentesítés +5 000 Ft/db, ágyazható felület +5 000 Ft/db; a külön regionális 17 500 Ft-os kanapéágy tételre a kalkulátor nem ad még egy ágyazható-felület díjat. Kárpit extra foltkezelés +2 000 Ft/ülőhely, impregnálás +3 000 Ft/bútor, szagtalanítás +2 500 Ft/bútor. Fix, főoldali extra-foltkezelési ülőhelyek: szófa 3, L 4, U 6, fotel/szék 1. Nincs kitalált ülőhelyenkénti alapár. Matrac nedves tisztítás +5 000 Ft/oldal, ágykeret-fejtámla +3 000 Ft/matrac. A főoldal számítási sorrendje szerint a 10%-os kárpit+matrac vagy alternatív 5%-os legalább-3-tétel kedvezmény a kiszállást tartalmazó részösszegre vonatkozik; nem halmozódnak.

Az ANDANTE tájékoztató az `index.html` meglévő feltételét közli: a helyszíni kiszállás díjának 50%-a, legfeljebb 30 000 Ft kapacitás-foglalási díjként felmerülhet. A feltételes díj nem kerül automatikusan a kalkulációba. A modul nem helyettesíti a szövet alkalmasságának helyszíni megítélését.

A kezelőfelület egységesen barátságos, egyes számú tegező hangnemben szól. A száraz atkamentesítés árlistatétel megjelenített neve „Száraz mélytisztítás”; a közös kiegészítő tájékoztató összekapcsolja a két elnevezést, és tisztázza, hogy a kezelés nem ígér teljes atka- vagy allergénmentességet. A díj és a számítás változatlan.

## CSS-szerződés

- `.med-config-layout`: két oszlop csak széles képernyőn; `.med-config-main` + `.med-config-summary`. Összesítő legfeljebb 330 px és csak 1200 px felett ragadós.
- `.med-config-products`: 3/2/1 oszlop. `.med-product`, `.med-product-image`, `.med-product-body`, `.med-product-description`, `.med-product-price`, `.med-product-type`, `.is-selected`.
- `.med-config-field` címke és select; `.med-config-quantity` két gombbal és outputtal; `.med-product-options` és `.med-config-check` checkbox-felirat párral. A felirat ne legyen levágva vagy egysorosra kényszerítve.
- `.med-config-extras` fieldset + legend; `.med-config-location`; `.med-config-andante` natív details/summary.
- `.med-config-eyebrow`, `.med-config-total`, `.med-config-summary-status`, `.med-config-breakdown`, `.med-config-line`, `.med-config-line-item/extra/travel/discount`, `.med-config-remove`, `.med-config-note`, `.med-config-actions`, `.med-config-button`, `.med-config-button-secondary`, `.med-config-reset`.
- A `[hidden]` attribútumot a CSS ne írja felül! A kanapéágy külön tarifájánál ez rejti a duplikáló extra mezőt.

## Ellenőrzés

`node --test demo/mediterranean/configurator.test.mjs`

A tesztek a valódi 14 regionális oldalból olvassák a tarifákat, és a működő főoldali kalkulátor konstansaihoz hasonlítják a közös díjakat. Külön ellenőrzik a kedvezmény sorrendjét, több méret megőrzését, oldalankénti extrákat, üres/hibás választásokat és a hálózati rendelésküldés hiányát. A teljes böngészős elrendezés-ellenőrzést a lap integrációja után kell futtatni.
