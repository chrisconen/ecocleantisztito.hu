// Expression body for the "Create Booking" node's description field.
// Kept as a self-contained IIFE so the fix touches ONE node parameter and needs
// no rewiring of the booking path — that path owns booking correctness and is
// not worth destabilising for an admin-facing cosmetic fix.
//
// Fixes: raw ids ("Kárpit: szofa"), HTML tags rendered literally in a plain-text
// calendar field, untranslated condition keys, unseparated price, raw zone code.
// Also surfaces the customer's language so whoever calls them knows to speak English.
//
// ponytail: the id->name map is duplicated from Build Customer Email. It is
// static product data that changes only when a service is added; sharing it
// would mean a new node on the critical booking path.
(() => {
  const b = $('Normalize Payload - HU').first().json.body;
  let lang = 'hu';
  try { const wh = $('Webhook').first().json; lang = ((wh.body || wh).lang === 'en') ? 'en' : 'hu'; } catch (e) {}

  const ITEMS = {
    karpit_szofa: 'Szófa, heverő', karpit_l_kanape: 'L-kanapé', karpit_u_kanape: 'U-kanapé',
    karpit_fotel: 'Fotel', karpit_ebedlo_szek: 'Ebédlő szék', karpit_irodai_szek: 'Irodai szék',
    matrac_egyagyas_a: 'Egyágyas matrac 90×200 cm (A oldal)',
    matrac_egyagyas_ab: 'Egyágyas matrac 90×200 cm (A+B oldal)',
    matrac_francia_a: 'Franciaágy matrac 140/160/180×200 cm (A oldal)',
    matrac_francia_ab: 'Franciaágy matrac 140/160/180×200 cm (A+B oldal)',
    matrac_gyerek_a: 'Gyerekmatrac 70×140 cm (A oldal)',
    matrac_gyerek_ab: 'Gyerekmatrac 70×140 cm (A+B oldal)',
    matrac_kisagy_a: 'Kiságy matrac (A oldal)', matrac_kisagy_ab: 'Kiságy matrac (A+B oldal)',
  };
  const UPSELLS = {
    atkairtas: 'Atkairtás', folteltavolitas: 'Extra folteltávolítás', impregnalas: 'Impregnálás',
    szagtalanitas: 'Szagtalanítás', agyazhato: 'Ágyazható felület tisztítása',
    nedves_tisztitas: 'Nedves folteltávolítás, fertőtlenítő mosás', agykeret: 'Ágykeret, fejtámla tisztítás',
  };
  const CONDITIONS = { Haziallat: 'Háziállat', Allergias: 'Allergiás', Dohanyzo: 'Dohányzó' };
  const ZONES = { belvaros: 'Belváros', kulso: 'Külváros', '20km': '10 km-ig', '40km': '20 km-ig' };
  const name = (map, id) => map[id] || String(id).replace(/^(karpit|matrac)_/, '').replace(/_/g, ' ');

  const ft = (n) => Number(n || 0).toLocaleString('hu-HU') + ' Ft';

  const items = (b.itemsArray || []).map((it) => {
    const extras = (it.upsells || []).map((u) => name(UPSELLS, u));
    return `• ${it.count}x ${name(ITEMS, it.id)}`
      + (extras.length ? `\n   ↳ Extra: ${extras.join(', ')}` : '');
  }).join('\n') || '• (nincs tétel adat)';

  const globalUpsells = (b.upsellsArray || []).map((u) => name(UPSELLS, u.upsellType));
  const conditions = (b.conditions || []).map((c) => name(CONDITIONS, c));

  const lines = [
    `👤 Ügyfél: ${b.name}`,
    `📧 Email: ${b.email}`,
    `📞 Tel: ${b.phone}`,
    lang === 'en' ? '🌐 AZ ÜGYFÉL ANGOLUL FOGLALT — angol nyelvű kapcsolattartás!' : null,
    '',
    `💰 Ár: ${ft(b.totalPrice)}` + (b.discount > 0 ? `  (kedvezmény: -${ft(b.discount)})` : ''),
    `🗺️ Zóna: ${ZONES[b.travelZone] || b.travelZone || '—'}`,
    `⏱️ Időtartam: ${b.duration?.hours ?? 0}h ${b.duration?.minutes ?? 0}m (${b.duration?.totalMinutes ?? 0} perc)`,
    b.isFirstSlot ? '✅ Napi első időpont (pontos érkezés)' : '⚠️ Nem az első időpont (±30 perc)',
    '',
    '🛋️ MEGRENDELT TÉTELEK:',
    items,
    globalUpsells.length ? `\n✨ Extra szolgáltatások: ${globalUpsells.join(', ')}` : null,
    conditions.length ? `⚠️ Körülmények: ${conditions.join(', ')}` : null,
    (b.isKarpitBooking && b.andanteAccepted) ? '⚠️ ANDANTE feltételeket elfogadta' : null,
    b.message ? `\n📝 Megjegyzés:\n${b.message}` : null,
    '',
    '---',
    `Ügyfél típusa: ${b.customerType || 'N/A'}`,
  ];
  return lines.filter((l) => l !== null).join('\n');
})()
