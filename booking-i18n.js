// ═══════════════════════════════════════════════════════════════════════════════
// ECO CLEAN — ENGLISH BOOKING STRINGS
// ═══════════════════════════════════════════════════════════════════════════════
// Load this BEFORE booking-config.js, on English pages only:
//
//   <script src="booking-i18n.js"></script>
//   <script src="booking-config.js"></script>
//
// Hungarian pages simply do not load it — T() then returns its Hungarian key and
// the site behaves exactly as it did before i18n existed.
//
// Keys are the Hungarian source strings. {name} / {n} / {price} / {msg}
// placeholders must survive translation; booking-config.js substitutes them.
// ═══════════════════════════════════════════════════════════════════════════════

window.BOOKING_LANG = 'en';

window.BOOKING_I18N = {
    // ── item names (PRICING) ────────────────────────────────────────────────
    'Szófa, heverő': 'Sofa / daybed',
    'L-kanapé': 'L-shaped sofa',
    'U-kanapé': 'U-shaped sofa',
    'Fotel': 'Armchair',
    'Ebédlő szék': 'Dining chair',
    'Irodai szék': 'Office chair',
    'Egyágyas matrac 90×200 cm (A oldal)': 'Single mattress 90×200 cm (side A)',
    'Egyágyas matrac 90×200 cm (A+B oldal)': 'Single mattress 90×200 cm (sides A+B)',
    'Franciaágy matrac 140/160/180×200 cm (A oldal)': 'Double mattress 140/160/180×200 cm (side A)',
    'Franciaágy matrac 140/160/180×200 cm (A+B oldal)': 'Double mattress 140/160/180×200 cm (sides A+B)',
    'Gyerekmatrac 70×140 cm (A oldal)': "Children's mattress 70×140 cm (side A)",
    'Gyerekmatrac 70×140 cm (A+B oldal)': "Children's mattress 70×140 cm (sides A+B)",
    'Kiságy matrac (A oldal)': 'Cot mattress (side A)',
    'Kiságy matrac (A+B oldal)': 'Cot mattress (sides A+B)',

    // ── travel zones ────────────────────────────────────────────────────────
    'Belváros': 'Town centre',
    'Külváros': 'Outskirts',
    '10 km-ig': 'Up to 10 km',
    '20 km-ig': 'Up to 20 km',

    // ── upsells (UPSELLS / PILLOW_CLEANING) ─────────────────────────────────
    'Atkairtás': 'Dust mite treatment',
    'Száraz atkamentesítés - ajánlott allergiásoknak': 'Dry dust mite removal — recommended for allergy sufferers',
    'Extra folteltávolítás': 'Extra stain removal',
    'Erős szennyeződések, foltok kezelése': 'Treatment of heavy soiling and stains',
    'Impregnálás': 'Fabric protection',
    'Védőréteg a könnyebb tisztításért': 'A protective layer for easier future cleaning',
    'Szagtalanítás': 'Odour removal',
    'Háziállat/dohányszag eltávolítása': 'Removal of pet and tobacco odours',
    'Nedves folteltávolítás, fertőtlenítő mosás': 'Wet stain removal and sanitising wash',
    'A kiválasztott matracoldalak mosása': 'Washing of the selected mattress sides',
    'Száradási idő: kb. 24 óra!': 'Drying time: approx. 24 hours!',
    'Ágykeret, fejtámla tisztítás': 'Bed frame and headboard cleaning',
    'Ágykeret, fejtámla kárpittisztítás': 'Upholstery cleaning for bed frame and headboard',
    'Párnák tisztítása': 'Pillow cleaning',
    'Mosógépben nem mosható méretű párnák tisztítása': 'Cleaning for pillows too large for a washing machine',

    // ── discounts ───────────────────────────────────────────────────────────
    'Kombi kedvezmény (kárpit+matrac)': 'Combo discount (upholstery + mattress)',
    '3+ bútor kedvezmény': '3+ items discount',

    // ── configurator UI ─────────────────────────────────────────────────────
    'Kárpittisztítás': 'Upholstery cleaning',
    'Matractisztítás': 'Mattress cleaning',
    'Kárpit extrák': 'Upholstery extras',
    'Ágyazható felület tisztítása (kihúzható / lenyitható)': 'Sofa bed surface cleaning (pull-out / fold-down)',
    'Ágyazható felület tisztítása': 'Sofa bed surface cleaning',
    'Ágyanként, fejtámlával együtt': 'Per bed, headboard included',
    '{n} oldal / matrac · {note}': '{n} side(s) per mattress · {note}',
    'Összes darabszám az itt kiválasztott bútorokhoz · {price}/db': 'Total quantity for the items selected here · {price} each',
    'Kiszállás': 'Call-out',
    'Válasszon szolgáltatást a kezdéshez...': 'Choose a service to get started…',
    'Háziállat esetén ajánljuk a szagtalanítást!': 'With pets in the home we recommend odour removal.',
    'Allergia esetén ajánljuk az atkairtást minden bútorra!': 'For allergy sufferers we recommend dust mite treatment on every item.',

    // ── units ───────────────────────────────────────────────────────────────
    'oldal': 'side',
    'ágy': 'bed',
    'db': 'item',
    'ülőhely': 'seat',
    'felület': 'surface',

    // ── durations ───────────────────────────────────────────────────────────
    '{h} óra {m} perc': '{h} h {m} min',
    '{h} óra': '{h} h',
    '{m} perc': '{m} min',

    // ── cart ────────────────────────────────────────────────────────────────
    'Kosár megnyitása: {n} bútor, {price}': 'Open cart: {n} item(s), {price}',
    '{n} bútor az összeállításodban': '{n} item(s) in your selection',
    'Még üres a kosarad': 'Your cart is still empty',
    'Kosár frissítve: {n} bútor, {price}.': 'Cart updated: {n} item(s), {price}.',

    // ── submit / success ────────────────────────────────────────────────────
    'Küldés...': 'Sending…',
    'Foglalás sikeresen elküldve!': 'Your booking has been sent.',
    'Köszönjük a bizalmát! Hamarosan felvesszük Önnel a kapcsolatot a megadott elérhetőségeken.':
        'Thank you for your trust. We will contact you shortly using the details you provided.',
    'ANDANTE bútor tisztítása?': 'Cleaning ANDANTE furniture?',
    'Kérjük, <strong>még a kiszállás előtt</strong> ellenőrizze bútora szövetének típusát! Ha az ANDANTE típusú vagy vízre érzékeny anyagból készült, kérjük, előzetesen egyeztessen munkatársunkkal a <strong>06 70 240 8141</strong>-es számon. Ellenkező esetben a kiszállás díjának 50%-a kapacitás-foglalási díjként felszámításra kerülhet.':
        'Please check your furniture\'s fabric type <strong>before our visit</strong>. If it is ANDANTE or another water-sensitive material, please speak to our team in advance on <strong>+36 70 240 8141</strong>. Otherwise 50% of the call-out fee may be charged as a capacity reservation fee.',
    'Bezárás': 'Close',

    // ── large order panel ───────────────────────────────────────────────────
    'Nagymegrendelés - Egyedi árajánlat': 'Large order — individual quote',
    'Az Ön megrendelése meghaladja az egy napos kapacitást!': 'Your order exceeds what we can complete in a single day.',
    'Becsült munkaidő:': 'Estimated working time:',
    'Becsült ár:': 'Estimated price:',
    'Kérjük küldje el az adatokat és <strong>24 órán belül</strong> személyre szabott árajánlatot küldünk a pontos időpontokkal és esetleges mennyiségi kedvezménnyel!':
        'Send us your details and <strong>within 24 hours</strong> we will send a tailored quote with exact dates and any volume discount that applies.',
    'Név / Cég *': 'Name / Company *',
    'E-mail *': 'Email *',
    'Telefon *': 'Phone *',
    'Cím / Helyszín': 'Address / Location',
    'Megjegyzés (preferált időszak, stb.)': 'Notes (preferred dates, etc.)',
    'Minta Géza Alapítvány': 'Example Foundation Ltd.',
    '2890 Tata, Példa utca 1.': '2890 Tata, Példa utca 1.',
    'Pl. Január második fele lenne ideális...': 'E.g. the second half of January would be ideal…',
    'Árajánlat kérése': 'Request a quote',
    'Árajánlat kérését megkaptuk.': 'We have received your quote request.',
    'Köszönjük, {name}!': 'Thank you, {name}!',
    '24 órán belül válaszolunk a <strong>{email}</strong> címre.': 'We will reply to <strong>{email}</strong> within 24 hours.',
    'Sürgős esetben hívjon:': 'For urgent enquiries call:',
    'Új megrendelés': 'New order',
    'Kérjük töltse ki a kötelező mezőket (Név, E-mail, Telefon)!': 'Please fill in the required fields (Name, Email, Phone).',
    'Kérjük adjon meg érvényes e-mail címet!': 'Please enter a valid email address.',
    'Hiba történt a küldés során. Kérjük próbálja újra, vagy hívjon minket: +36 20 912 3456':
        'Something went wrong while sending. Please try again, or call us on +36 20 912 3456.',

    // ── booking form validation ─────────────────────────────────────────────
    // Fallback used when the backend returns no message of its own.
    'Hiba történt a foglalás során': 'Something went wrong with your booking',
    '❌ Kérjük adja meg a nevét!': '❌ Please enter your name.',
    '❌ Kérjük adja meg az e-mail címét!': '❌ Please enter your email address.',
    '❌ Kérjük adjon meg érvényes e-mail címet!': '❌ Please enter a valid email address.',
    '❌ Kérjük erősítse meg az e-mail címét!': '❌ Please confirm your email address.',
    '❌ Az e-mail címek nem egyeznek! Kérjük ellenőrizze.': '❌ The email addresses do not match. Please check them.',
    '❌ Kérjük adja meg a telefonszámát!': '❌ Please enter your phone number.',
    '❌ Kérjük adjon meg érvényes magyar telefonszámot!\n(pl. +36 30 123 4567 vagy 06 30 123 4567)':
        '❌ Please enter a valid Hungarian phone number.\n(e.g. +36 30 123 4567 or 06 30 123 4567)',
    '❌ Kérjük töltse ki a pontos címet (utca, irányítószám, város)!': '❌ Please fill in the full address (street, postcode, town).',
    '❌ Az irányítószám 4 számjegyből kell álljon!': '❌ The postcode must be 4 digits.',
    // ponytail: the \\n in this key is a pre-existing escaping bug in the
    // Hungarian source (the alert shows a literal \n). Key kept byte-identical
    // so the lookup matches; fix the source string and this key together.
    '❌ Kérjük válassza ki a kiszállási zónát!\\n\\nEz szükséges a pontos ár kiszámításához.':
        '❌ Please select a call-out zone.\\n\\nThis is needed to calculate the exact price.',
    '❌ Időpont ütközés!\n\n{msg}\n\n💡 Kérjük válasszon másik napot a naptárból, vagy válasszon másik várost a legördülő menüből!':
        '❌ Scheduling conflict.\n\n{msg}\n\n💡 Please pick another day in the calendar, or choose a different town from the dropdown.',
    '❌ Ez a nap már betelt!\n\n{msg}\n\n💡 Kérjük válasszon másik időpontot a naptárból!':
        '❌ This day is fully booked.\n\n{msg}\n\n💡 Please choose another time in the calendar.',
    '❌ Érvénytelen időpont!\n\n{msg}\n\n💡 Kérjük válasszon egy jövőbeli dátumot!':
        '❌ Invalid appointment.\n\n{msg}\n\n💡 Please choose a future date.',
    '❌ Hiba történt a foglalás során!\n\n{msg}\n\n📞 Kérjük próbálja újra, vagy hívjon minket:\n06 70 240 8141':
        '❌ Something went wrong with your booking.\n\n{msg}\n\n📞 Please try again, or call us on:\n+36 70 240 8141',
    '❌ Hiba történt a foglalás küldése során.\n\nKérjük próbálja újra, vagy hívjon minket:\n📞 06 70 240 8141':
        '❌ Something went wrong while sending your booking.\n\nPlease try again, or call us on:\n📞 +36 70 240 8141',
};
