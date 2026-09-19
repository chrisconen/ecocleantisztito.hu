import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const here = import.meta.dirname;
const map = 'https://maps.google.com/?cid=10581696163890001047';
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(path.join(here, file))).digest('hex').slice(0, 12);

export function applyGyorConversion({read, edit, tariff}) {
  for (const [file, en] of [['karpittisztitas-gyor.html', false], ['en/upholstery-cleaning-gyor.html', true]]) {
    const p = en ? '../' : '';
    const t = (hu, english) => en ? english : hu;
    const money = value => new Intl.NumberFormat('en-GB').format(value).replaceAll(',', ' ') + (en ? ' HUF' : ' Ft');
    const local = tariff.gyorCity.karpit;
    const price = id => money(local[id].price);
    const replace = (pattern, after) => {
      const matches = [...read(file).matchAll(pattern)];
      if (matches.length !== 1) throw Error('Expected one conversion target: ' + file + ' ' + pattern);
      edit(file, matches[0][0], typeof after === 'function' ? after(matches[0][0]) : after);
    };
    const pair = (before, after, alt, width, height, eager = false) => `<div class="gyor-photo-pair">${[[before, t('Előtte', 'Before')], [after, t('Utána', 'After')]].map(([src, label]) => `<figure><img src="${p}img/${src}" alt="${alt} – ${label.toLowerCase()}" width="${width}" height="${height}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async"><figcaption>${label}</figcaption></figure>`).join('')}</div>`;
    const lPair = eager => pair('karpittisztitas-elott-2.webp', 'karpittisztitas-utan-2.webp', t('Világos sarokkanapé ülőfelülete az ECO Clean saját referenciafotóján', 'Light corner sofa seats in an original ECO Clean reference photo'), 550, 413, eager);
    const button = (label, extra = '') => `<a class="gyor-button" href="#studio-kalkulator" ${extra}>${label}<span aria-hidden="true">→</span></a>`;
    const cta = t('Ár és szabad időpont', 'Price & availability');
    const scope = t('Győri városi alapárak, választható extrák nélkül. A környező települések díjait a kalkulátorban, a körzet kiválasztása után látod.', 'City base prices, before optional extras. For surrounding villages, select your travel zone in the calculator to see the applicable prices.');
    const hero = `<section class="gyor-hero" id="main-content"><div class="gyor-shell">
      <div class="gyor-hero-grid"><div class="gyor-hero-copy">
        <span class="gyor-eyebrow">${t('ECO Clean · Győr és környéke', 'ECO Clean · Győr and surroundings')}</span>
        <h1>${t('Kárpittisztítás Győrben.<br><em>Látható különbséggel.</em>', 'Upholstery cleaning in Győr.<br><em>See the difference.</em>')}</h1>
        <p class="gyor-lead">${t('A kedvenc helyed megérdemli a törődést. Kanapé, fotel és szék tisztítása az otthonodban — saját munkáink képeivel és előre kalkulálható árakkal.', 'Give your favourite place a little care. Sofa, armchair and chair cleaning in your home — with photos of our own work and prices you can calculate before booking.')}</p>
        <a class="gyor-rating-link" href="${map}" target="_blank" rel="noopener noreferrer"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m12 3 2.8 5.7 6.3.9-4.5 4.4 1.1 6.2-5.7-3-5.7 3 1.1-6.2L3.2 9.6l6-.9Z"></path></svg><span data-gyor-rating>${t('Google-vélemények · Kárpittisztítás ECO Clean', 'Google reviews · Kárpittisztítás ECO Clean')}</span><span aria-hidden="true">→</span></a>
        <div class="gyor-prices" aria-label="${t('Győri városi alapárak', 'Base prices within Győr city')}">${[
          ['szofa', t('Szófa, heverő', 'Sofa, daybed'), 1], ['l_kanape', t('L alakú kanapé', 'L-shaped sofa'), 0], ['ebedlo_szek', t('Ebédlőszék', 'Dining chair'), 3]
        ].map(([id, label, focus]) => `<a href="#studio-kalkulator" class="gyor-price" data-config-focus="${focus}"><span>${label}</span><strong>${price(id)}</strong><small>${t('alapár / db', 'base price / item')}</small></a>`).join('')}</div>
        <p class="gyor-travel"><strong>${t('Győr városhatárán belül 0 Ft a kiszállás.', 'Free travel within Győr city limits.')}</strong></p>
        <div class="gyor-actions">${button(cta)}<a class="gyor-phone" href="tel:+36702408141">${t('Inkább telefonálok', 'Prefer to call?')}</a></div>
        <p class="gyor-scope">${scope} ${t('Az elérhető időpontokat a megrendelőben választhatod ki.', 'Choose an available appointment in the booking form.')}</p>
      </div><div class="gyor-hero-proof"><div class="gyor-proof-top"><span>${t('Saját munkánk', 'Our own work')}</span><span>${t('Előtte → utána', 'Before → after')}</span></div>${lPair(true)}<h2>${t('Ugyanaz a kanapé.<br>Más összhatás.', 'The same sofa.<br>A different impression.')}</h2><p>${t('A foltos ülőfelület és a tisztítás utáni állapot egymás mellett. Nézd meg közelről, mit mutatnak a saját referenciafotóink.', 'The stained seats and their condition after cleaning, side by side. Take a closer look at our original reference photos.')}</p><a class="gyor-text-link" href="#gyor-referenciak">${t('Megnézem a többi munkát', 'See more of our work')} →</a></div></div>
      <div class="gyor-facts"><span><i aria-hidden="true"></i>${t('Helyszíni tisztítás · nem kell elszállítanod', 'Cleaned in your home · no transport needed')}</span><span><i aria-hidden="true"></i>${t('Nedves tisztítás után általában 6–12 óra száradás', 'Wet cleaning: usually 6–12 hours to dry')}</span><span><i aria-hidden="true"></i>${t('A végleges árat a munka előtt egyeztetjük', 'Final price agreed before work begins')}</span></div>
    </div></section>`;
    replace(/<section class="subpage-hero"[\s\S]*?<\/section>/g, hero);
    const stories = [
      {label:t('01 · Sarokkanapé', '01 · Corner sofa'), photos:lPair(false), title:t('A foltok mögött ott a kedvenc bútorod.', 'Your favourite sofa, beneath the stains.'), text:t('A világos ülőfelületen a sötétebb foltok rögtön magukra vonják a figyelmet. Az utána képen egyenletesebb, tisztább összhatás látszik. A képpár a kárpit állapotának változását mutatja; a tisztítás a szövet kopását nem javítja meg.', 'Dark marks immediately draw attention on light upholstery. The after photo shows a cleaner, more even appearance. The pair shows a change in the fabric’s condition; cleaning does not repair wear.'), id:'l_kanape', focus:0, name:t('L kanapé', 'L-shaped sofa')},
      {label:t('02 · Szófa', '02 · Sofa'), photos:pair('reference-sofa-before-12.jpg', 'reference-sofa-after-12.jpg', t('Szürke szófa az ECO Clean saját referenciafotóján', 'Grey sofa in an original ECO Clean reference photo'), 2048,1536), title:t('A részleteknél látszik a különbség.', 'The difference is in the details.'), text:t('Az ülőlap szélein és a varrások mellett jól követhető a változás. A tisztítás után kevésbé hangsúlyosak a sötét szennyeződések, jobban érvényesül a kárpit mintázata. A fotókon maradó nyomokat is megmutatjuk: az eredmény mindig az adott anyagtól és állapottól függ.', 'The change is visible along the seat edges and seams. After cleaning, dark marks are less prominent and the fabric’s pattern is clearer. Remaining marks are visible too: results depend on the individual fabric and its condition.'), id:'szofa', focus:1, name:t('Szófa, heverő', 'Sofa, daybed')},
      {label:t('03 · Ebédlőszék', '03 · Dining chair'), photos:pair('reference-chair-before-1.jpg', 'reference-chair-after-1.jpg', t('Sötét kárpitozott ülőlapú szék az ECO Clean saját referenciafotóján', 'Chair with a dark upholstered seat in an original ECO Clean reference photo'),1152,2048), title:t('Egy kis felület is sokat változhat.', 'A small surface can make a big difference.'), text:t('A sötét ülőlapot az előtte képen világos, foltos réteg borítja. A tisztítás után újra egységesebb a felület. Érdemes a székeket is számba venni, amikor a kanapé tisztítását tervezed — egy kiszállással több bútorról gondoskodhatunk.', 'The dark seat is covered with pale, patchy marks in the before photo. After cleaning, its appearance is more even. Consider your chairs when arranging sofa cleaning — several pieces can be cared for in one visit.'),id:'ebedlo_szek',focus:3,name:t('Ebédlőszék', 'Dining chair')}
    ];
    const references = `<section class="gyor-stories" id="gyor-referenciak"><div class="gyor-shell"><div class="gyor-section-head"><div><span class="gyor-eyebrow">${t('ECO Clean · Valódi referenciafotók', 'ECO Clean · Original reference photos')}</span><h2>${t('Nézd meg, mire képes<br>egy alapos tisztítás.', 'See what a thorough<br>clean can change.')}</h2></div><p>${t('Saját munkáink, eredeti felvételeken. A fotók eltérő fényben és nézőpontból készülhettek. Az alábbi árak a jelenlegi győri alapárak, nem a képeken szereplő munkák korabeli végösszegei.', 'Our own work, in original photographs. Lighting and camera angles may differ. The prices below are current Győr base prices, not the historic invoices for the pictured jobs.')}</p></div><div class="gyor-story-grid">${stories.map(s=>`<article class="gyor-story"><span class="gyor-story-number">${s.label}</span>${s.photos}<div class="gyor-story-body"><h3>${s.title}</h3><p>${s.text}</p><p class="gyor-story-price">${s.name}: <strong>${price(s.id)}</strong> ${t('/ db alapár', '/ item base price')}<br>${t('Győrben díjmentes kiszállással; extrák nélkül.', 'Free travel within Győr; before optional extras.')}</p><a class="gyor-text-link" href="#studio-kalkulator" data-config-focus="${s.focus}">${t('Kiszámolom a saját bútorom árát', 'Calculate the price for my furniture')} →</a></div></article>`).join('')}</div><div class="gyor-review-note"><p><strong>${t('A képek mellé az ügyfeleink tapasztalata.', 'Alongside the photos, hear from our customers.')}</strong><br>${t('A Kárpittisztítás ECO Clean meglévő Google-profilján elolvashatod a visszajelzéseket.', 'Read customer feedback on the existing Kárpittisztítás ECO Clean Google profile.')}</p><a class="gyor-text-link" href="${map}" target="_blank" rel="noopener noreferrer">${t('Vélemények a Google-on', 'Read reviews on Google')} →</a></div></div></section>`;
    // Remove the former fictional customer anecdote, keeping authentic comparison photos in the new section.
    replace(/<section class="ba-promo-section">[\s\S]*?<\/section>/g, '');
    const calculator = read(file).match(/<section class="med-section med-price-section" id="studio-kalkulator">[\s\S]*?<\/section>/)?.[0];
    if (!calculator) throw Error('Missing calculator ' + file);
    edit(file, calculator, '');
    const updatedCalculator = calculator.replace(t('Lásd a bútorokat.<br>Tervezd meg a tisztítást.', 'See the furniture.<br>Plan the cleaning.'), t('Először az ár.<br>Utána az időpont.', 'First the price.<br>Then the appointment.'));
    replace(/<nav class="studio-chapters"[\s\S]*?<\/nav>/g, `<nav class="studio-chapters" aria-label="${t('Ugrás az oldal témáihoz', 'Skip to page topics')}"><a href="#gyor-referenciak">${t('Valódi eredmények', 'Real results')}</a><a href="#studio-kalkulator">${t('Ár és időpont', 'Price & appointment')}</a><a href="#arak">${t('Részletes árlista', 'Full price list')}</a><a href="#studio-anyagok">${t('Anyagkalauz', 'Fabric guide')}</a><a href="#studio-kerdesek">${t('Gyakori kérdések', 'Questions')}</a></nav>${references}${updatedCalculator}`);
    // Retain both the live reviews component and all service-specific interactions.
    edit(file, 'class="eco-rollout eco-subpage eco-site eco-studio"', 'class="eco-rollout eco-subpage eco-site eco-studio eco-gyor-conversion"');
    replace(/<title>[\s\S]*?<\/title>/g, `<title>${t('Kárpittisztítás Győr – '+price('szofa')+'-tól | ECO Clean', 'Upholstery Cleaning Győr – from '+price('szofa')+' | ECO Clean')}</title>`);
    const desc = t('Kárpittisztítás Győrben: szófa '+price('szofa')+', L kanapé '+price('l_kanape')+' alapártól. Díjmentes kiszállás Győr városhatárán belül. Saját előtte–utána képek, online árkalkulátor és foglalás.', 'Upholstery cleaning in Győr: sofa from '+price('szofa')+', L-shaped sofa from '+price('l_kanape')+'. Free travel within Győr city limits. Original before-and-after photos and online booking.');
    replace(/<meta name="description" content="[^"]*">/g, `<meta name="description" content="${desc}">`);
    replace(/<meta property="og:description" content="[^"]*">/g, `<meta property="og:description" content="${desc}">`);
    replace(/<meta property="og:image" content="[^"]*">/g, '<meta property="og:image" content="https://ecocleantisztito.hu/img/karpittisztitas-utan-2.webp">');
    // Keep structured metadata in agreement with the new visible proposition.
    for (const script of [...read(file).matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]) {
      const data=JSON.parse(script[1]); let changed=false;
      if (data['@type']==='FAQPage') {
        const item=data.mainEntity?.[0];
        if(item) { item.name=t('Miért válaszd az ECO Clean kárpittisztítást Győrben?', 'Why choose ECO Clean upholstery cleaning in Győr?'); item.acceptedAnswer.text=t('Saját referenciafotóinkon megnézheted a tisztítás eredményét. Az online kalkulátorban előre kiszámolhatod a megadott bútorok tájékoztató árát. Győr városhatárán belül díjmentesen szállunk ki; a végleges árat és a várható eredményt a munka előtt egyeztetjük.', 'See cleaning results in our own reference photos and calculate an estimated price online. Travel is free within Győr city limits. We agree the final price and expected result before work begins.'); changed=true; }
      }
      if(data['@type']==='ImageObject') {data.name=t('ECO Clean – sarokkanapé tisztítás után', 'ECO Clean – corner sofa after cleaning');data.contentUrl='https://ecocleantisztito.hu/img/karpittisztitas-utan-2.webp';data.description=t('Saját referenciafotó a megtisztított világos sarokkanapéról.', 'Original reference photo of a light corner sofa after cleaning.');changed=true;}
      if(data.hasMap) {data.hasMap=map;data.description=desc;changed=true;}
      if(changed) edit(file,script[0],'<script type="application/ld+json">'+JSON.stringify(data,null,2)+'</script>');
    }
    edit(file, '</head>', `<link rel="stylesheet" href="${p}studio/gyor-conversion.css?v=${hash('conversion.css')}"></head>`);
    edit(file, '</body>', `<div class="gyor-mobile-booking"><span>${t('Győr városon belül', 'Within Győr city')}<strong>${t('0 Ft kiszállás', 'Free travel')}</strong></span>${button(cta)}</div><script src="${p}studio/gyor-conversion.js?v=${hash('conversion.js')}" defer></script></body>`);
  }
}
