// Builds adatvedelem.html (GDPR privacy notice) and aszf.html (terms) using the
// real header/footer from an existing page, so the chrome, nav and scripts stay
// identical to the rest of the site.
//
// Company registration details are NOT invented: they appear as [KITÖLTENDŐ]
// placeholders, because publishing a legal page with made-up numbers is worse
// than having none.
import { readFileSync, writeFileSync } from 'node:fs';

const TEMPLATE = 'karpittisztitas-siofok.html';
const src = readFileSync(TEMPLATE, 'utf8');
const nl = src.includes('\r\n') ? '\r\n' : '\n';
const lines = src.split(/\r?\n/);

const at = (re, from = 0) => {
    const i = lines.findIndex((l, n) => n >= from && re.test(l));
    if (i === -1) throw new Error(`anchor not found: ${re}`);
    return i;
};

const bodyStart = at(/<body/);
const firstSection = at(/<section class="subpage-hero"/);
const footerStart = at(/<footer/);
const bodyEnd = at(/<\/body>/);

const chromeTop = lines.slice(bodyStart, firstSection).join(nl);   // <body> + both navs
// The template already carries an injected language switcher pointing at ITS
// own English twin; strip it so i18n.mjs can inject the correct one for these
// pages instead of them silently linking to the Siófok page.
const chromeBottom = lines.slice(footerStart, bodyEnd + 2).join(nl)
    .replace(/\n?<!-- i18n language switch -->[\s\S]*?<\/style>\n?/, '\n');

const TODAY = '2026-09-16';
const P = '<span style="background:#fff3cd; padding:0 .3em; border-radius:3px;">[KITÖLTENDŐ]</span>';

const head = (title, desc, file) => `<!DOCTYPE html>
<html lang="hu" data-theme="dark">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <meta name="description" content="${desc}">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="https://ecocleantisztito.hu/${file}">
    <link rel="icon" href="favicon-32x32.png" type="image/png">
    <link rel="stylesheet" href="style.css">
    <link rel="stylesheet" href="subpage.css">
    <link rel="stylesheet" href="mobile.css">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
</head>
`;

const wrap = (h1, lead, body) => `
    <section class="subpage-hero" id="main-content">
        <div class="section-container">
            <h1>${h1}</h1>
            <p class="hero-subtitle">${lead}</p>
        </div>
    </section>

    <section class="section-container" style="max-width: 860px; margin: 0 auto; padding: 3rem 1.25rem; line-height: 1.75;">
${body}
        <p style="margin-top:3rem; font-size:.9em; opacity:.75;">Utolsó frissítés: ${TODAY}</p>
    </section>
`;

// ── company block shared by both documents ───────────────────────────────────
const company = `
        <h2>A szolgáltató adatai</h2>
        <ul>
            <li><strong>Név:</strong> ${P} (cégnév / egyéni vállalkozó neve)</li>
            <li><strong>Székhely:</strong> ${P}</li>
            <li><strong>Nyilvántartási / cégjegyzékszám:</strong> ${P}</li>
            <li><strong>Adószám:</strong> ${P}</li>
            <li><strong>Telefon:</strong> <a href="tel:+36702408141">+36 70 240 8141</a></li>
            <li><strong>E-mail:</strong> <a href="mailto:info@ecocleantisztito.hu">info@ecocleantisztito.hu</a></li>
            <li><strong>Weboldal:</strong> ecocleantisztito.hu</li>
            <li><strong>Tárhelyszolgáltató:</strong> GitHub, Inc. (GitHub Pages), 88 Colin P Kelly Jr Street, San Francisco, CA 94107, USA</li>
        </ul>`;

// ── adatvédelmi tájékoztató ──────────────────────────────────────────────────
const privacy = `
        <p>Ez a tájékoztató azt írja le, hogy az ECO Clean milyen személyes adatokat kezel
        az ecocleantisztito.hu weboldalon keresztül, milyen célból, meddig, és Önt milyen
        jogok illetik meg. Az adatkezelés az Európai Parlament és a Tanács (EU) 2016/679
        rendelete (GDPR) szerint történik.</p>
${company}

        <h2>Milyen adatokat kezelünk, és miért</h2>
        <h3>1. Online időpontfoglalás</h3>
        <p>A foglalási űrlap kitöltésekor a következő adatokat adja meg:</p>
        <ul>
            <li><strong>név</strong> – a megrendelés azonosításához és a kapcsolattartáshoz;</li>
            <li><strong>e-mail cím</strong> – a foglalás visszaigazolásához;</li>
            <li><strong>telefonszám</strong> – érkezés előtti egyeztetéshez, illetve ha a foglalással kapcsolatban kérdésünk merül fel;</li>
            <li><strong>cím (utca, irányítószám, város)</strong> – a szolgáltatás teljesítéséhez, mivel a tisztítás a helyszínen történik;</li>
            <li><strong>a kiválasztott szolgáltatások, tételek és extrák, valamint az Ön megjegyzése</strong> – az ajánlat és a munka összeállításához;</li>
            <li><strong>ügyféltípus</strong> (magánszemély vagy céges) – a számlázás módjához.</li>
        </ul>
        <p><strong>Az adatkezelés jogalapja:</strong> a szerződés teljesítése, illetve a szerződés
        megkötését megelőző lépések megtétele (GDPR 6. cikk (1) b) pont).</p>
        <p><strong>Megőrzési idő:</strong> a számviteli bizonylatokhoz kapcsolódó adatokat a
        számvitelről szóló 2000. évi C. törvény alapján 8 évig őrizzük. Az ezen túlmenő
        foglalási adatokat ${P} ideig tároljuk, azt követően töröljük.</p>

        <h3>2. Telefonos és e-mailes megkeresés</h3>
        <p>Ha telefonon vagy e-mailben keres minket, a megadott elérhetőségét és a megkeresés
        tartalmát a válaszadásig, illetve az ügy lezárásáig kezeljük.
        <strong>Jogalap:</strong> jogos érdek az ügyfélkommunikáció lebonyolítására
        (GDPR 6. cikk (1) f) pont).</p>

        <h2>Kinek továbbítjuk az adatokat</h2>
        <p>Az adatait nem adjuk el és nem adjuk át harmadik félnek marketing célból.
        A szolgáltatás működtetéséhez a következő adatfeldolgozókat vesszük igénybe:</p>
        <ul>
            <li><strong>Google Ireland Limited</strong> – a foglalás időpontja a munkanaptárunkba kerül (Google Calendar).</li>
            <li><strong>Az automatizálási és e-mail-küldő rendszerünk üzemeltetője</strong> (hub.centaur-lang.dev) – a foglalás feldolgozása és a visszaigazoló e-mail kiküldése.</li>
            <li><strong>GitHub, Inc.</strong> – a weboldal tárhelye.</li>
        </ul>
        <p>Hatósági megkeresés esetén jogszabályi kötelezettség alapján adatot szolgáltatunk.</p>

        <h2>Sütik (cookie-k)</h2>
        <p>A weboldal a működéshez szükséges technikai adatokat használ (például a választott
        világos/sötét megjelenés megjegyzése a böngészője tárolójában). Ezek nem alkalmasak
        az Ön azonosítására, és a böngészője beállításaiban bármikor törölhetők. ${P}
        <em>(Ha a jövőben analitikai vagy hirdetési sütit is használ az oldal, azt itt fel kell tüntetni,
        és hozzájárulást kell kérni hozzá.)</em></p>

        <h2>Az Ön jogai</h2>
        <p>Ön bármikor kérheti:</p>
        <ul>
            <li>tájékoztatását arról, hogy milyen adatait kezeljük (hozzáférés);</li>
            <li>a pontatlan adat helyesbítését;</li>
            <li>adatai törlését, ha az adatkezelésnek nincs más jogalapja;</li>
            <li>az adatkezelés korlátozását;</li>
            <li>adatai hordozható formában történő kiadását;</li>
            <li>tiltakozhat a jogos érdeken alapuló adatkezelés ellen.</li>
        </ul>
        <p>Kérését az <a href="mailto:info@ecocleantisztito.hu">info@ecocleantisztito.hu</a>
        címen jelezheti; legkésőbb 30 napon belül válaszolunk.</p>

        <h2>Jogorvoslat</h2>
        <p>Ha úgy érzi, hogy adatai kezelése sérti a jogait, panasszal fordulhat a
        <strong>Nemzeti Adatvédelmi és Információszabadság Hatósághoz</strong>
        (1055 Budapest, Falk Miksa utca 9-11., <a href="https://naih.hu" target="_blank" rel="noopener">naih.hu</a>),
        illetve bírósághoz is fordulhat.</p>`;

// ── ÁSZF ─────────────────────────────────────────────────────────────────────
const terms = `
        <p>Jelen Általános Szerződési Feltételek (ÁSZF) az ECO Clean által nyújtott
        kárpit-, matrac-, szőnyeg- és egyéb tisztítási szolgáltatások megrendelésére
        vonatkoznak. A foglalás leadásával Ön elfogadja az alábbi feltételeket.</p>
${company}

        <h2>1. A szolgáltatás tárgya</h2>
        <p>Vegyszermentes, ipari extrakciós technológiával végzett kárpit-, matrac- és
        szőnyegtisztítás, atkamentesítés, valamint kapcsolódó kiegészítő szolgáltatások
        (folteltávolítás, impregnálás, szagtalanítás), a megrendelő által megadott helyszínen.</p>

        <h2>2. Megrendelés és visszaigazolás</h2>
        <p>Megrendelés a weboldal foglalási űrlapján, telefonon vagy e-mailben adható le.
        A szerződés akkor jön létre, amikor a megrendelést e-mailben visszaigazoljuk.
        A weboldalon feltüntetett árak tájékoztató jellegűek; a <strong>végleges árat a
        helyszíni felmérés után</strong> tudjuk megállapítani, mivel az a bútor méretétől,
        anyagától és szennyezettségétől függ.</p>

        <h2>3. Árak és fizetés</h2>
        <ul>
            <li>Az árak forintban értendők, és tartalmazzák az általános forgalmi adót. ${P} <em>(ha a szolgáltató alanyi adómentes, ezt itt kell jelezni)</em></li>
            <li>A kiszállási díj a megadott zóna szerint kerül felszámításra, és a foglalási összesítőben megjelenik.</li>
            <li>Fizetés a helyszínen, a munka elvégzése után ${P} <em>(készpénz / bankkártya / átutalás – a ténylegesen elfogadott módok)</em>.</li>
            <li>Céges megrendelés esetén számlát állítunk ki.</li>
        </ul>

        <h2>4. Lemondás és időpont-módosítás</h2>
        <p>A foglalt időpont <strong>legkésőbb 48 órával</strong> a kiszállás előtt díjmentesen
        lemondható vagy módosítható. Ennél későbbi lemondás, illetve ha kollégáink a
        helyszínen nem tudják megkezdeni a munkát a megrendelőnek felróható okból,
        kapacitás-foglalási díj számítható fel.</p>

        <h2>5. ANDANTE és vízre érzékeny anyagok</h2>
        <p>Az extrakciós tisztítás kizárólag szövetkárpit esetén alkalmazható. Az
        <strong>ANDANTE</strong> típusú, illetve más impregnált, „mosható" vagy víztaszító
        anyagok extrakciós technológiával nem tisztíthatók biztonságosan. Kérjük, a
        megrendelés előtt ellenőrizze bútora szövetének típusát.</p>
        <p>Ha a helyszínen derül ki, hogy a bútor a megrendelt technológiával nem tisztítható,
        a lefoglalt időpont és a kiszállás kiesése miatt a szolgáltatás díjának
        <strong>50%-a, legfeljebb 30.000 Ft</strong> kapacitás-foglalási díjként
        felszámításra kerülhet. Ezt a feltételt a foglalási űrlapon külön el kell fogadni.</p>

        <h2>6. A megrendelő közreműködési kötelezettsége</h2>
        <p>A munka megkezdéséhez kérjük biztosítani:</p>
        <ul>
            <li>parkolási lehetőséget a helyszín közelében;</li>
            <li>áramforrást a gépek számára;</li>
            <li>a tisztítandó bútor szabad megközelíthetőségét, az értéktárgyak eltávolítását;</li>
            <li>háziállat esetén annak elkülönítését a munkaterülettől.</li>
        </ul>
        <p>Bútorok mozgatásából eredő károkért felelősséget nem tudunk vállalni.</p>

        <h2>7. Érkezési idő</h2>
        <p>A nap első időpontjára foglalt munkát a megbeszélt időpontban kezdjük. Minden más
        időpont esetén az érkezés a forgalmi helyzet és az előző munka elhúzódása miatt
        <strong>±30 percet</strong> változhat; erről telefonon értesítjük Önt.</p>

        <h2>8. Garancia és szavatosság</h2>
        <p>A munkánkra garanciát vállalunk: ha az elvégzett tisztítás eredményével nem
        elégedett, kérjük, a teljesítést követő ${P} napon belül jelezze, és díjmentesen
        újratisztítjuk az érintett felületet. A bútor anyagából, korából vagy korábbi
        kezeléséből eredő, tisztítással nem megszüntethető elváltozásokért
        (pl. kifakult szövet, szerkezeti kopás) nem vállalunk felelősséget.</p>

        <h2>9. Panaszkezelés</h2>
        <p>Panaszát az <a href="mailto:info@ecocleantisztito.hu">info@ecocleantisztito.hu</a>
        címen vagy a <a href="tel:+36702408141">+36 70 240 8141</a> telefonszámon jelezheti.
        Fogyasztói jogvita esetén a lakóhelye szerint illetékes
        <strong>békéltető testülethez</strong> fordulhat.</p>

        <h2>10. Adatkezelés</h2>
        <p>Személyes adatai kezeléséről az <a href="adatvedelem.html">Adatkezelési tájékoztatóban</a>
        olvashat.</p>`;

const build = (file, title, desc, h1, lead, body) => {
    const html = head(title, desc, file) + nl + chromeTop + nl
        + wrap(h1, lead, body) + nl + chromeBottom + nl;
    writeFileSync(file, html);
    const o = (html.match(/<div\b/g) || []).length, c = (html.match(/<\/div>/g) || []).length;
    console.log(`wrote ${file}  (${html.length} bytes, div ${o}/${c}${o === c ? ' ✓' : ' ✗ IMBALANCED'})`);
};

build('adatvedelem.html',
    'Adatkezelési tájékoztató | ECO Clean',
    'Hogyan kezeli az ECO Clean a foglalás során megadott személyes adatokat: milyen adatok, milyen célból, meddig, és milyen jogai vannak.',
    'Adatkezelési tájékoztató',
    'Milyen adatokat kezelünk, miért, meddig — és milyen jogok illetik meg Önt.',
    privacy);

build('aszf.html',
    'Általános Szerződési Feltételek | ECO Clean',
    'Az ECO Clean tisztítási szolgáltatásainak általános szerződési feltételei: megrendelés, árak, lemondás, garancia.',
    'Általános Szerződési Feltételek',
    'A megrendelés, a fizetés, a lemondás és a garancia feltételei.',
    terms);

console.log('\nNOTE: [KITÖLTENDŐ] placeholders must be completed before this is legally usable.');
