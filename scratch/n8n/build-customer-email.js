// ═══════════════════════════════════════════════════════════════════════════════
// BUILD CUSTOMER EMAIL — bilingual (hu / en)
// ═══════════════════════════════════════════════════════════════════════════════
// Feeds the "Send email" node, which only references this node's `subject` and
// `html` output fields. One layout, two string tables — the HTML is never
// duplicated, so a design change lands in both languages at once.
// (Expression braces are deliberately not written in this comment: n8n's linter
//  reads them as a mis-prefixed expression and warns on an otherwise fine node.)
//
// Language comes straight from the webhook payload (`lang`). The normalizer
// hardcodes 'hu' and nothing consumes that field, so it is left untouched —
// it is the workflow's most load-bearing node and not worth destabilising.
// Anything that is not 'en' falls back to Hungarian.
// ═══════════════════════════════════════════════════════════════════════════════

const b = $('Normalize Payload - HU').first().json.body;

let EN = false;
try {
  const wh = $('Webhook').first().json;
  EN = (wh.body || wh).lang === 'en';
} catch (e) { /* keep Hungarian */ }
const L = (hu, en) => (EN ? en : hu);

// ── formatting ───────────────────────────────────────────────────────────────
const money = (n) => EN
  ? `${Number(n || 0).toLocaleString('en-GB')} HUF`
  : `${Number(n || 0).toLocaleString('hu-HU')} Ft`;

// ── item / upsell / condition names ──────────────────────────────────────────
// Keys match booking-config.js PRICING + UPSELLS ids. Previously the template
// derived a label from the raw id ("karpit_szofa" -> "Kárpit - szofa"), which
// read badly in Hungarian and would have been untranslatable in English.
const ITEMS = {
  karpit_szofa:        ['Szófa, heverő', 'Sofa / daybed'],
  karpit_l_kanape:     ['L-kanapé', 'L-shaped sofa'],
  karpit_u_kanape:     ['U-kanapé', 'U-shaped sofa'],
  karpit_fotel:        ['Fotel', 'Armchair'],
  karpit_ebedlo_szek:  ['Ebédlő szék', 'Dining chair'],
  karpit_irodai_szek:  ['Irodai szék', 'Office chair'],
  matrac_egyagyas_a:   ['Egyágyas matrac 90×200 cm (A oldal)', 'Single mattress 90×200 cm (side A)'],
  matrac_egyagyas_ab:  ['Egyágyas matrac 90×200 cm (A+B oldal)', 'Single mattress 90×200 cm (sides A+B)'],
  matrac_francia_a:    ['Franciaágy matrac 140/160/180×200 cm (A oldal)', 'Double mattress 140/160/180×200 cm (side A)'],
  matrac_francia_ab:   ['Franciaágy matrac 140/160/180×200 cm (A+B oldal)', 'Double mattress 140/160/180×200 cm (sides A+B)'],
  matrac_gyerek_a:     ['Gyerekmatrac 70×140 cm (A oldal)', "Children's mattress 70×140 cm (side A)"],
  matrac_gyerek_ab:    ['Gyerekmatrac 70×140 cm (A+B oldal)', "Children's mattress 70×140 cm (sides A+B)"],
  matrac_kisagy_a:     ['Kiságy matrac (A oldal)', 'Cot mattress (side A)'],
  matrac_kisagy_ab:    ['Kiságy matrac (A+B oldal)', 'Cot mattress (sides A+B)'],
};
const UPSELLS = {
  atkairtas:        ['Atkairtás', 'Dust mite treatment'],
  folteltavolitas:  ['Extra folteltávolítás', 'Extra stain removal'],
  impregnalas:      ['Impregnálás', 'Fabric protection'],
  szagtalanitas:    ['Szagtalanítás', 'Odour removal'],
  agyazhato:        ['Ágyazható felület tisztítása', 'Sofa bed surface cleaning'],
  nedves_tisztitas: ['Nedves folteltávolítás, fertőtlenítő mosás', 'Wet stain removal and sanitising wash'],
  agykeret:         ['Ágykeret, fejtámla tisztítás', 'Bed frame and headboard cleaning'],
};
const CONDITIONS = {
  Haziallat: ['Háziállat', 'Pets in the home'],
  Allergias: ['Allergiás', 'Allergy sufferer'],
  Dohanyzo:  ['Dohányzó', 'Smoker'],
};
const label = (map, id, fallback) => {
  const e = map[id];
  if (e) return L(e[0], e[1]);
  // Unknown id: keep it readable instead of printing a raw key.
  return String(fallback ?? id).replace(/^(karpit|matrac)_/, '').replace(/_/g, ' ');
};

// ── content ──────────────────────────────────────────────────────────────────
const items = (b.itemsArray || []).map((it) => {
  const name = label(ITEMS, it.id);
  const extras = (it.upsells || []).map((u) => label(UPSELLS, u));
  const extraLine = extras.length
    ? `<br><span style="color:#666; font-size:0.9em; margin-left:20px;">↳ ${L('Extra', 'Extras')}: ${extras.join(', ')}</span>`
    : '';
  return `<div style="margin:10px 0; padding:12px; background:#fff; border-radius:5px; border-left:3px solid #00cc6a;"><strong>${it.count}x ${name}</strong>${extraLine}</div>`;
}).join('') || `<p style="color:#999;">${L('Nincs tétel', 'No items listed')}</p>`;

const upsells = (b.upsellsArray || []).length
  ? `<div style="margin-top:15px; padding-top:15px; border-top:1px solid #ddd;"><strong>✨ ${L('Extra szolgáltatások:', 'Extra services:')}</strong><br>`
    + (b.upsellsArray || []).map((u) =>
        `<span style="display:inline-block; margin:5px; padding:5px 10px; background:#fff; border-radius:15px; font-size:0.9em;">• ${label(UPSELLS, u.upsellType)}</span>`
      ).join('') + '</div>'
  : '';

const discount = b.discount > 0
  ? `<div style="text-align:right; margin-bottom:10px;"><span style="text-decoration:line-through; color:#999;">${L('Eredeti ár', 'Original price')}: ${money(b.totalPrice + b.discount)}</span><br><span style="color:#00cc6a; font-weight:bold;">🎉 ${L('Megtakarítás', 'You save')}: -${money(b.discount)}</span></div>`
  : '';

const arrival = b.isFirstSlot
  ? `<div style="background:#d4edda; padding:15px; border-radius:10px; border-left:4px solid #00cc6a; margin:20px 0;"><strong>✅ ${L('Napi első időpont', 'First appointment of the day')}</strong><br>${L('Pontosan a megbeszélt időpontban érkezünk!', 'We will arrive exactly at the agreed time.')}</div>`
  : `<div style="background:#fff3cd; padding:15px; border-radius:10px; border-left:4px solid #ffc107; margin:20px 0;"><strong>⚠️ ${L('Fontos tudnivaló az érkezési időről', 'Important note about the arrival time')}</strong><br><br>${L('Ez <strong>nem az első időpont</strong> a napi munkánkban. A tényleges érkezési idő <strong>±30 percet</strong> változhat a következők miatt:', 'This is <strong>not the first appointment</strong> of our day. The actual arrival time may vary by <strong>±30 minutes</strong> because of:')}<br>• ${L('Forgalmi helyzet', 'Traffic conditions')}<br>• ${L('Az előző munka időtartama', 'How long the previous job takes')}<br><br>📞 ${L('Telefonon értesítjük, amint úton vagyunk Önhöz!', 'We will call you as soon as we are on our way.')}</div>`;

const conds = (b.conditions || []).length
  ? `<div style="background:#e3f2fd; padding:15px; border-radius:10px; margin:20px 0;"><strong>ℹ️ ${L('Különleges körülmények:', 'Special circumstances:')}</strong> ${(b.conditions || []).map((c) => label(CONDITIONS, c)).join(', ')}</div>`
  : '';

const andante = (b.isKarpitBooking && b.andanteAccepted)
  ? `<div style="background:#000; padding:15px; border-radius:10px; margin:20px 0; border-left:4px solid #ff0000;"><h4 style="margin-top:0; color:#fc5f00;">⚠️⚠️⚠️ ${L('ANDANTE szövet tisztítása', 'Cleaning ANDANTE fabric')} ⚠️⚠️⚠️</h4><p style="font-size:0.95em;">${L('Ön elfogadta az <strong style="color:#fc5f00;">ANDANTE</strong> rendszer tisztításával kapcsolatos feltételeket. Amennyiben ANDANTE típusú szövetre foglalt időpontot, az időpontfoglalás értékének 50%-át köteles megtéríteni a helyszínen!', 'You accepted the terms covering the cleaning of <strong style="color:#fc5f00;">ANDANTE</strong> fabrics. If you booked for ANDANTE-type fabric, 50% of the booking value is payable on site.')}</p></div>`
  : '';

const prep = [
  L('Kérjük, gondoskodjon parkolási lehetőségről a lakás/ház közelében',
    'Please arrange parking near the property'),
  L('Távolítson el esetleges értékeket a tisztítandó bútorokról, a kanapét mozgassa el biztonságos távolságra a frissen festett faltól, kollégáink bútorok mozgatásából származó károkért felelősséget nem tudunk vállalni!',
    'Please remove any valuables from the furniture to be cleaned and move sofas a safe distance from freshly painted walls — we cannot accept liability for damage caused by moving furniture.'),
  L('Biztosítson áramforrást a gépek számára', 'Please provide a power supply for our machines'),
  L('Háziállat esetén kérjük elkülöníteni a munkaterülettől', 'Please keep pets away from the work area'),
].map((li) => `<li>${li}</li>`).join('');

const durationText = `${b.duration?.hours ?? 0}h ${b.duration?.minutes ?? 0}m (${b.duration?.totalMinutes ?? 0} ${L('perc', 'min')})`;
const punctual = b.isFirstSlot
  ? L(' ✅ (pontos érkezés)', ' ✅ (punctual arrival)')
  : L(' ⚠️ (±30 perc)', ' ⚠️ (±30 min)');

const subject = EN
  ? `✅ ECO Clean booking confirmed - ${b.date}`
  : `✅ ECO Clean megrendelés - ${b.date}`;

const html = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #1d5a02;">

  <div style="background: linear-gradient(135deg, #00cc6a 0%, #00a855 100%); padding: 30px; text-align: center;">
    <h1 style="color: #ffffff; margin: 0; font-size: 24px;">✅ ${L('Foglalás megerősítve!', 'Booking confirmed')}</h1>
  </div>

  <div style="padding: 30px;">
    <p style="font-size: 16px;">${L('Kedves', 'Dear')} <strong>${b.name}</strong>${L('!', ',')}</p>

    <p>${L('Köszönjük, hogy az ECO Clean szolgáltatásait választotta! Az Ön foglalásának részletei:', 'Thank you for choosing ECO Clean. Here are your booking details:')}</p>

    <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0;">
      <h3 style="margin-top: 0; color: #00cc6a;">📅 ${L('Időpont részletei', 'Appointment details')}</h3>
      <p><strong>${L('Dátum:', 'Date:')}</strong> ${b.date}</p>
      <p><strong>${L('Időpont:', 'Time:')}</strong> ${b.slotStartTime} - ${b.slotEndTime}${punctual}</p>
      <p><strong>${L('Helyszín:', 'Address:')}</strong> ${b.location}</p>
      <p><strong>${L('Becsült időtartam:', 'Estimated duration:')}</strong> ${durationText}</p>
    </div>

    <div style="background: #e8f5e9; padding: 20px; border-radius: 10px; margin: 20px 0;">
      <h3 style="margin-top: 0; color: #00cc6a;">🛋️ ${L('Megrendelt szolgáltatások', 'Services booked')}</h3>
      ${items}
      ${upsells}
      <hr style="border: none; border-top: 2px solid #00cc6a; margin: 20px 0;">
      ${discount}
      <p style="font-size: 22px; margin: 0; text-align: right;"><strong>${L('Végösszeg:', 'Total:')} ${money(b.totalPrice)}</strong></p>
    </div>

    ${arrival}
    ${conds}

    <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0; text-align: center;">
      <p style="margin: 0 0 10px 0;"><strong>${L('Kérdése van? Keressen minket bizalommal:', 'Any questions? Get in touch:')}</strong></p>
      <p style="margin: 5px 0; font-size: 18px;">📞 <a href="tel:+36702408141" style="color: #00cc6a; text-decoration: none;">+36 70 240 8141</a></p>
      <p style="margin: 5px 0;">📧 <a href="mailto:info@ecocleantisztito.hu" style="color: #00cc6a; text-decoration: none;">info@ecocleantisztito.hu</a></p>
    </div>

    <div style="background: #e8f5e9; padding: 15px; border-radius: 10px; margin: 20px 0;">
      <h4 style="margin-top: 0; color: #00cc6a;">💡 ${L('Felkészülés a tisztításra:', 'Preparing for the clean:')}</h4>
      <ul style="margin: 10px 0; padding-left: 20px; line-height: 1.8;">${prep}</ul>
    </div>

    ${andante}

    <p style="margin-top: 30px;">${L('Üdvözlettel,', 'Kind regards,')}<br><strong>${L('Az ECO Clean csapata', 'The ECO Clean team')}</strong></p>

    <p style="font-size: 0.85em; color: #666; margin-top: 20px;">
      <em>${L('Ez egy automatikus visszaigazoló email. Kérjük, ne válaszoljon rá közvetlenül. Kérdés esetén használja a fenti elérhetőségeket.', 'This is an automated confirmation. Please do not reply directly — use the contact details above if you have questions.')}</em>
    </p>
  </div>

  <div style="background: #1a1a2e; color: #999; padding: 20px; text-align: center; font-size: 12px;">
    <p style="margin: 0; color: #00ff88;">${L('ECO Clean Magyarország | Professzionális kárpit- és matractisztítás', 'ECO Clean Hungary | Professional upholstery and mattress cleaning')}</p>
    <p style="margin: 10px 0 0 0;"><a href="${EN ? 'https://ecocleantisztito.hu/en/index.html' : 'https://ecocleantisztito.hu'}" style="color: #00cc6a; text-decoration: none;">www.ecocleantisztito.hu</a></p>
    <p style="margin: 10px 0 0 0; font-size: 11px;">
      🌿 ${L('Környezetbarát tisztítószerek', 'Eco-friendly products')} | ⚡ ${L('Gyors száradás', 'Fast drying')} | 💯 ${L('100% elégedettségi garancia', '100% satisfaction guarantee')}
    </p>
  </div>

</div>`;

return [{ json: { subject, html, to: b.email, language: EN ? 'en' : 'hu' } }];
