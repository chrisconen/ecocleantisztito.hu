# -*- coding: utf-8 -*-
import re
import os

# City data: (filename_slug, city_name, heading, intro, usecase_title, usecase_body, highlight)
cities = [
    (
        "gyor", "Győr",
        "Válassza a győri kárpittisztítást! Mutatjuk miért!",
        "Sokan gondolják, hogy a gépbérlés az olcsóbb megoldás - de aki banánnal fizet, az majmot kap. Egy profi kárpittisztítás nem csak felszínesen sikál, hanem a szövetek mélyéig hatol, és valódi eredményt ad.",
        "Amikor a gyerekek összefirkálják a kanapét...",
        """<p>Ismeri azt az érzést, amikor hazaér, és a <strong>világos kanapén filctoll nyomok</strong> és kiöntött szörp foltjai virítanak? A gyerekek kreativitása határtalan - sajnos a bútorok kárpitja kevésbé ellenálló.</p>
<p>Egy győri édesanya mesélte: "Három gyerek mellett hetente van valami baleset. <strong>Szörp, zsírkréta, nutella</strong> - amit el tud képzelni, az mind landolt már a kanapénkon."</p>
<p>A professzionális ECO Clean technológia nemcsak a felszíni foltokat távolítja el, hanem a <strong>szövetek mélyére ivódott szennyeződéseket</strong> is kioldja - vegyszermentesen, gyerekbarát módon.</p>
<p>Az eredmény? Egy olyan kanapé, amin <strong>bátran hempereghetnek a gyerekek</strong>, mert tudja, hogy pár hívással újra makulátlan lehet.</p>""",
        "Győrben az ECO Clean az intelligens választás: vegyszermentes, gyerekbiztos, és az eredmény magáért beszél. Ne kockáztasson bérelt géppel - bízza profikra!"
    ),
    (
        "sopron", "Sopron",
        "Miért a soproni profi kárpittisztítás?",
        "Tudjuk, csábító a 'majd kibérlek egy gépet és megcsinálom magam' gondolat. De gondoljon bele: aki olcsón vesz, az kétszer fizet - vagy ahogy a mondás tartja, aki banánnal fizet, majmot kap. A profi tisztítás első alkalommal tökéletes eredményt hoz.",
        "A sáros mancsú kedvenc és a szövetkanapé harca",
        """<p>Sopronban rengeteg kutyás család él, és nincs annál bosszantóbb, amikor a <strong>négylábú sáros mancsokkal ugrik fel a kanapéra</strong> egy esős séta után.</p>
<p>"A golden retrieverünk imádja a kanapét. Hiába a tiltás, amint hátat fordítunk, <strong>máris ott trónol a díszpárnákon</strong> - természetesen sáros mancsokkal" - mesélte egy soproni kutyatartó.</p>
<p>A kutyaszőr és sár kombinációja a szövet mélyébe ivódik, és <strong>háztartási módszerekkel szinte lehetetlen</strong> teljesen eltávolítani. Ráadásul a nedves kutya szag is megmarad.</p>
<p>Az ECO Clean technológia <strong>a szálak mélyéig</strong> tisztít, eltávolítja a szőrt, sarat és a szagokat is - mindezt vegyszermentesen, ami a kedvencnek is biztonságos.</p>""",
        "Sopronban a kutyás családok kedvence az ECO Clean: állat- és környezetbarát, mégis alapos. Ne kínlódjon bérelt géppel - hívjon minket, és élvezze az eredményt!"
    ),
    (
        "szombathely", "Szombathely",
        "Szombathelyen is ragyoghat a kanapéja!",
        "Gondolkodik a gépbérlésen? Ne tegye! A tapasztalat azt mutatja: aki banánnal fizet, majmot kap. A bérelt gép felszínesen dolgozik, míg a profi ECO Clean mélytisztítás valódi megújulást hoz.",
        "Tinédzser nassolás: chips, kóla és a világos kanapé",
        """<p>A szombathelyi családok jól ismerik a jelenetet: a <strong>tinédzser a kanapén nassolva</strong> nézi a sorozatot, és közben chips morzsák, kóla cseppek, szószfoltok gyűlnek a kárpiton.</p>
<p>"A fiam szerint a kanapé egyben asztal is. <strong>Pizza, nachos, energiaital</strong> - mindent ott fogyaszt. Mire észreveszem, már ragad az egész felület" - számolt be egy szombathelyi anyuka.</p>
<p>A zsíros, ragacsos foltok különösen makacs szennyeződések, amelyek <strong>házi szerekkel csak szétkenődnek</strong>, és idővel a szövet elszíneződik tőlük.</p>
<p>Az ECO Clean ipari technológiája <strong>a zsírfoltokat és ragacsos lerakódásokat</strong> is hatékonyan oldja - a kárpit újra friss és tiszta lesz, mintha most hozták volna a boltból.</p>""",
        "Szombathelyen az ECO Clean a tinédzserbiztos megoldás: hatékonyan távolítja el a makacs foltokat, és a kanapé újra reprezentatív lesz. Profi eredmény, profi kézből!"
    ),
    (
        "mosonmagyarovar", "Mosonmagyaróvár",
        "Mosonmagyaróváron is tündökölhet a bútora!",
        "Lehet, hogy a gépbérlés olcsóbbnak tűnik papíron - de valójában aki banánnal fizet, az bizony majmot kap. A profi kárpittisztítás egyszeri beruházás, ami hosszú távon megéri.",
        "Macskaszőr mindenhol: a cicás háztartás kihívásai",
        """<p>Mosonmagyaróváron sok család tart cicát, és aki macskával él, tudja: a <strong>szőr mindenhol ott van</strong>. A kanapén, a fotelben, a székeken - és a szövetbe bele is dolgozza magát.</p>
<p>"Két perzsa cicánk van, és hiába porszívózom naponta, a <strong>bútor szövete tele van szőrrel</strong>, ami a mélyébe ivódik. A szőrcsinálók munkája soha nem ér véget" - mondta egy helyi lakos.</p>
<p>A macskaszőr nemcsak esztétikai probléma: <strong>allergiát és atkákat</strong> is vonz, ami különösen a gyerekekre és idősekre veszélyes. A felszíni porszívózás nem elég!</p>
<p>Az ECO Clean mélytisztítás a <strong>szövet szerkezetébe beágyazódott szőrt és allergéneket</strong> is kiszívja - az eredmény egy valóban tiszta, higiénikus bútor.</p>""",
        "Mosonmagyaróváron a cicás háztartások legjobb barátja az ECO Clean: allergénmentes, szőrmentes kárpit egyetlen hívással. Ne bérelt géppel kísérletezzen!"
    ),
    (
        "papa", "Pápa",
        "Pápán is profi kárpittisztítás kell? Itt az ECO Clean!",
        "Aki olcsó megoldást keres és gépet bérel, annak egy tanács: aki banánnal fizet, az majmot kap. Az ECO Clean pápai szolgáltatása profi eredményt garantál, nem félmunkát.",
        "Amikor a férj utcai ruhában huppan le a kanapéra",
        """<p>Klasszikus pápai jelenet: a <strong>férj hazaér a munkából</strong> és egyenesen a kanapéra veti magát - utcai ruhában, cipőben, mindenestül.</p>
<p>"A párom autószerelő. Hiába szól, hogy <strong>mosson kezet és öltözzön át</strong>, mielőtt leül - előbb a kanapén köt ki, és utána jut eszébe. Az eredmény: olajos, poros foltok mindenhol" - meséli egy pápai feleség.</p>
<p>Az utcai szennyeződések - por, korom, olaj, verejték - <strong>mélyen a szövetbe ivódnak</strong> és idővel kellemetlen szagot is árasztanak. A felületi tisztítás ezt nem oldja meg.</p>
<p>Az ECO Clean <strong>a szövetek mélyéig</strong> hatol: eltávolítja az olajat, port, és felfrissíti a kárpit szagát is - mintha új bútort kapna.</p>""",
        "Pápán az ECO Clean a dolgos férjek kanapéjának megmentője: mélytisztítás, szagtalanítás, teljes megújulás. Ne bérelt géppel küzdjön - egy hívás és kész!"
    ),
    (
        "komarom", "Komárom",
        "Komáromi kárpittisztítás profi kézből!",
        "A gépbérlés csábító, de az eredmény gyakran csalódás - mert aki banánnal fizet, az bizony majmot kap. A komáromi ECO Clean szolgáltatás garantált minőséget hoz, már első alkalommal.",
        "Vendégek után: a kávéfolt, ami nem akar eltűnni",
        """<p>Komáromban a vendéglátás hagyomány - de a <strong>vendégek után maradt kávéfoltok</strong> a kanapén és foteleken már kevésbé kellemes hagyaték.</p>
<p>"Minden családi összejövetel után van egy-két új folt. <strong>Kávé, tea, bor</strong> - valaki mindig kibillenti a csészét. És a világos kanapén minden meglátszik" - panaszkodik egy komáromi háziasszony.</p>
<p>A kávéfolt különösen trükkös: a <strong>cserzőanyag beívódik a szövetbe</strong>, és háztartási szerekkel inkább szétkenődik, mint eltűnik. Idővel sötét foltok maradnak.</p>
<p>Az ECO Clean speciális technológiája a <strong>cserzőanyagot és festékanyagot is kioldja</strong> - a kárpit visszanyeri eredeti színét, mintha soha nem lett volna rajta folt.</p>""",
        "Komáromban a vendéglátó családok ECO Cleant választanak: kávé-, tea- és borfoltok eltávolítása profin, nyom nélkül. Hívjon minket a következő buli előtt!"
    ),
    (
        "tatabanya", "Tatabánya",
        "Tatabányai kárpittisztítás: így lesz újra tiszta!",
        "Sokan gondolják Tatabányán, hogy a bérelt gép megoldás. De tapasztalatból mondjuk: aki banánnal fizet, majmot kap. A profi ECO Clean mélytisztítás az, ami valóban működik.",
        "Baba reggelizik: pép, tej és maszat a kanapén",
        """<p>A tatabányai kismamák jól ismerik: a <strong>baba reggelizés közben</strong> mindent beterít - magát, a széket és természetesen a kanapét is.</p>
<p>"A kisfiam imád maga enni. Az eredmény: <strong>répapép a karfán, tej a párnán</strong>, banán a háttámlán. Naponta többször is. A kanapé lassan narancssárgává válik" - meséli egy tatabányai anyuka.</p>
<p>A babás foltok - tej, gyümölcs, pép - <strong>savassá és ragadóssá</strong> teszik a szövetet, ami idővel kellemetlen szagot is áraszt, és baktériumok táptalajává válik.</p>
<p>Az ECO Clean <strong>vegyszermentesen, babák számára is biztonságosan</strong> távolítja el a lerakódásokat - a bútor higiénikus és friss lesz, akár rögtön használhatja a kicsi is.</p>""",
        "Tatabányán a kisgyerekes családok ECO Cleant választanak: vegyszermentes, bababiztos, és az eredmény azonnali. Ne kockáztasson bérelt géppel a baba környezetében!"
    ),
    (
        "tata", "Tata",
        "Tatán is megújulhat a régi kedvenc bútor!",
        "A bérelt gép ígér, de nem teljesít - mert aki banánnal fizet, az bizony majmot kap. Tatán az ECO Clean az, ami a régi bútoroknak is új életet ad, profin és hatékonyan.",
        "Az öregedő bútor: szag és foltok évek alatt",
        """<p>Tatán sok családban vannak <strong>évtizedes bútorok</strong>, amelyekhez érzelmi kötődés fűzi a tulajdonost - de az idő nyomai már meglátszanak rajtuk.</p>
<p>"A nagymamámtól örökölt fotel a kedvencem, de <strong>évek óta egyre jobban szaglik</strong>, és a kárpitja foltos, fakult. Nem akarom lecserélni, de így sem maradhat" - mondta egy tatai lakos.</p>
<p>Az évek alatt felgyülemlett <strong>por, verejték, háztartási szagok és foltok</strong> a szövet mélyén ülnek - egyszerű szellőztetéssel és házi tisztítással nem orvosolhatók.</p>
<p>Az ECO Clean mélytisztítás a <strong>régi bútoroknak is visszaadja az életet</strong>: eltávolítja az évek szennyeződéseit, semlegesíti a szagokat, és a kárpit újra friss, élénk színű lesz.</p>""",
        "Tatán az ECO Clean a régi bútorok megmentője: mélytisztítás, szagmentesítés, színfelfrissítés. Mentse meg kedvenc bútorát - ne cserélje, tisztíttassa!"
    ),
    (
        "veszprem", "Veszprém",
        "Veszprémi kárpittisztítás az allergia ellen!",
        "A gépbérlés? Az sajnos félmegoldás - aki banánnal fizet, majmot kap. Veszprémben az ECO Clean profi mélytisztítás a valódi megoldás, különösen allergia esetén.",
        "Allergia és poratka: a láthatatlan ellenség a kanapéban",
        """<p>Veszprémben rengetegen küzdenek <strong>allergiával és asztmával</strong> - és sokan nem is tudják, hogy a kanapéjuk az egyik fő allergénforrás.</p>
<p>"A gyerekem folyamatosan tüsszögött és viszketett. Az allergológus mondta: <strong>a kanapéban milliónyi poratka él</strong>, ami a tüneteket okozza. Porszívózás nem elég" - mesélte egy veszprémi szülő.</p>
<p>A poratkák és allergének a <strong>kárpit szöveteinek mélyén</strong> szaporodnak, és egyszerű felszíni tisztítással nem távolíthatók el. Ez állandó allergén terhelést jelent a családnak.</p>
<p>Az ECO Clean ipari mélytisztítás <strong>bizonyítottan irtja a poratkákat</strong> - atkairtási tanúsítványt is adunk! A kárpit nemcsak tiszta, hanem egészséges is lesz.</p>""",
        "Veszprémben az ECO Clean az allergiások legjobb barátja: poratkamentesítés tanúsítvánnyal, vegyszermentes technológiával. A bérelt gép erre képtelen - hívjon profit!"
    ),
    (
        "balatonfured", "Balatonfüred",
        "Balatonfüreden is csilloghat a kárpit a szezon után!",
        "A nyári szezon után sokan gondolják: majd kibérelek egy gépet. De aki banánnal fizet, az majmot kap - a félmunka nem elég a szezon utáni alapos tisztításhoz.",
        "Szezon vége: a nyaraló bútorai segítséget kérnek",
        """<p>Balatonfüreden a nyári szezon után a <strong>nyaralók és apartmanok bútorai</strong> alaposan megviselik magukat - hónapok vendégforgalma után ez természetes.</p>
<p>"Minden szeptember ugyanaz: a <strong>kanapékon foltok, a foteleken naptejes csíkok</strong>, és az egész lakásban ott az izzadság szaga. A vendégek után általános felújítás kell" - mondja egy balatonfüredi apartman-tulajdonos.</p>
<p>A szezon alatti intenzív használat <strong>naptejet, izzadságot, homokot és ételmaradékot</strong> hagy a kárpiton - ezek együttesen rombolják a szövetet és kellemetlen szagot okoznak.</p>
<p>Az ECO Clean szezon végi mélytisztítása <strong>komplex megoldás</strong>: egy menetben eltávolítja az összes lerakódást, és a bútor kész a következő szezonra.</p>""",
        "Balatonfüreden a szálláskiadók ECO Cleant választanak szezon végén: gyors, alapos, és a bútor kész a következő évre. Ne bérelt géppel pepecseljen - hívjon minket!"
    ),
    (
        "tihany", "Tihany",
        "Tihanyi vendégház kárpitja is ragyoghat!",
        "A gépbérlés ígérete szép, de a valóság más - aki banánnal fizet, az majmot kap. Tihanyban a vendégházak bútorainak profi ECO Clean tisztítás kell, nem házi próbálkozás.",
        "Turisták után: a vendégház kárpitja megsínyli a forgalmat",
        """<p>Tihany Magyarország egyik legkedveltebb turisztikai célpontja - a <strong>vendégházak szinte egész évben fogadnak vendégeket</strong>, és a bútorok ennek megfelelően kopnak.</p>
<p>"A vendégház kanapéja és foteljei <strong>minden vendégváltásnál rosszabb állapotban</strong> vannak. Naptej, bor, étel - mindenki otthon érzi magát, ami jó, de a bútor bánja" - mondja egy tihanyi szálláskiadó.</p>
<p>A folyamatos vendégforgalom <strong>fokozott igénybevételt</strong> jelent a kárpitnak: a szövetek gyorsabban öregszenek, a foltok rétegesen rakódnak egymásra.</p>
<p>Az ECO Clean rendszeres mélytisztítással <strong>meghosszabbítja a bútorok élettartamát</strong> - a vendégek mindig tiszta, friss kárpittal találkoznak, ami a értékeléseken is meglátszik.</p>""",
        "Tihanyban a legjobb vendégházak ECO Cleannel dolgoznak: profi tisztítás, ami meghosszabbítja a bútorok életét és javítja a vendégértékeléseket!"
    ),
    (
        "balatonalmadi", "Balatonalmádi",
        "Balatonalmádiban is megújulhat a nyaraló bútora!",
        "Sokan próbálkoznak bérelt géppel - de az eredmény általában csalódás, mert aki banánnal fizet, bizony majmot kap. Balatonalmádiban az ECO Clean hozza azt a minőséget, amit vár.",
        "Családi nyaralás: a gyerekek és a bútor viszonya",
        """<p>Balatonalmádiban a családi nyaralók bútorai <strong>nyáron különösen sokat szenvednek</strong> - strandolás, fagyi, naptej és a gyerekek energiája együtt fejtik ki hatásukat.</p>
<p>"A nyaraló kanapéja augusztus végére <strong>felismerhetetlen</strong>. Fagyi csöpög, homokos fürdőruhában ülnek rá, és a naptej mindent bezsíroz. Évről évre ugyanez" - meséli egy almádi nyaralótulajdonos.</p>
<p>A nyári szennyeződések - <strong>naptej, homok, izzadság, jégkrém</strong> - különösen agresszíven támadják a szöveteket, és ha nem kezelik őket időben, maradandó kárt okoznak.</p>
<p>Az ECO Clean szezon végi tisztítással <strong>megmenti a nyaraló bútorait</strong>: eltávolítja a nyári rétegeket, és a bútor újra készen áll a következő szezonra.</p>""",
        "Balatonalmádiban a nyaralótulajdonosok ECO Cleanre bízzák bútoraikat: szezon végi mélytisztítás, ami megóvja a berendezést. Ne kísérletezzen bérelt géppel!"
    ),
    (
        "revfulop", "Révfülöp",
        "Révfülöpi Airbnb kárpit: profi tisztítás vendégváltáskor!",
        "A szálláskiadásban a minőség a lényeg - és aki banánnal fizet, az majmot kap. A bérelt gép nem hozza azt az eredményt, amit a vendégek (és az értékelések) megkövetelnek.",
        "Airbnb vendégváltás: a kanapé is vendégkész legyen",
        """<p>Révfülöpön egyre több szállás működik Airbnb-n - és a <strong>vendégváltás közötti időben</strong> a bútoroknak is meg kell újulniuk.</p>
<p>"Minden kijelentkezés után takarítunk, de a <strong>kanapé és fotel mélytisztítása</strong> más kérdés. A felszíni törlés nem elég, a vendégek észreveszik" - mondja egy révfülöpi szuperhost.</p>
<p>A gyakori vendégváltás <strong>folyamatos terhelést</strong> jelent a kárpitnak: különböző testápolók, parfümök, ételszagok és foltok rakódnak egymásra vendégről vendégre.</p>
<p>Az ECO Clean gyors, <strong>vendégváltás közötti mélytisztítást</strong> kínál: a bútor pár óra alatt száraz és friss - készen a következő vendégre, 5 csillagos élménnyel.</p>""",
        "Révfülöpön a szuperhost-ok ECO Cleant hívnak vendégváltáskor: gyors, profi, és a vendégek imádják. A bérelt gép lassú és félmunkát végez - válasszon profin!"
    ),
    (
        "badacsony", "Badacsony",
        "Badacsonyi borfolt a kanapén? Van megoldás!",
        "A borvidéken a borfolt mindennapos - de a megoldás nem a gépbérlés, mert aki banánnal fizet, az majmot kap. A badacsonyi ECO Clean tudja, hogyan kell borfoltat profin kezelni.",
        "Borvacsora után: vörösbor a világos kanapén",
        """<p>Badacsonyban a bor a kultúra része - és sajnos a <strong>vörösborfolt a kanapékon</strong> is rendszeres vendég, különösen egy kellemes borvacsora után.</p>
<p>"Minden összejövetel után rettegek: <strong>vajon ezúttal ki öntötte ki a borát</strong> a kanapéra? A fehér kárpiton a vörösbor olyan, mint egy rémálom" - meséli egy badacsonyi házigazda.</p>
<p>A vörösbor <strong>tanninja és festékanyaga</strong> az egyik legmakacsabb folt - házi módszerekkel (só, szóda) gyakran csak szétkenődik, és maradandó rózsaszín elszíneződést hagy.</p>
<p>Az ECO Clean speciális technológiája a <strong>borfoltot is hatékonyan kezeli</strong>: a tannint kioldja, a festéket semlegesíti, és a kárpit visszanyeri eredeti színét.</p>""",
        "Badacsonyban a borbarátok ECO Cleanben bíznak: vörösbor-folt eltávolítás profin, nyom nélkül. A bérelt gép a borfolttal nem boldogul - mi igen!"
    ),
    (
        "siofok", "Siófok",
        "Siófoki buli után is tiszta lehet a kanapé!",
        "A party utáni romokat bérelt géppel akarná eltüntetni? Aki banánnal fizet, majmot kap. Siófokon az ECO Clean az, ami a buli utáni káoszt is rendbe teszi - profin.",
        "Party éjszaka: koktél, sör és a kanapé reggelre",
        """<p>Siófok a bulik városa - és aki házibulit tart, tudja: <strong>reggelre a kanapé harcmezőre hasonlít</strong>. Koktélfoltok, sörcseppek, chips morzsák mindenhol.</p>
<p>"A szülinapi bulink után a <strong>kanapé ragadt, a fotel büdös volt sörtől</strong>, és valaki cigarettahamut is ejtett rá. Mint egy katasztrófa-film helyszín" - mesélte egy siófoki fiatal.</p>
<p>Az alkoholos italok, különösen a <strong>koktélok és bor</strong>, mélyen a szövetbe ivódnak és ragacsos, kellemetlen szagú réteget hagynak. A sör szaga napok alatt sem múlik.</p>
<p>Az ECO Clean a <strong>parti-kanapék specialistája</strong>: alkohol-, dohány- és ételszagot is eltávolít, a ragacsos foltokat feloldja - reggelre (na jó, délutánra) újra tiszta a tér.</p>""",
        "Siófokon a bulik után ECO Cleant hívnak az okos házigazdák: gyors regenerálás koktél-, sör- és egyéb partifoltokból. Bérelt gép erre nem megoldás!"
    ),
    (
        "zamardi", "Zamárdi",
        "Zamárdi fesztiválszezon után: kárpit-mentőakció!",
        "A fesztivál után ne bérelt géppel próbálkozzon - aki banánnal fizet, az sajnos majmot kap. Zamárdiban az ECO Clean profin kezeli a fesztiválszezon utáni kárpit-katasztrófákat.",
        "Fesztivál-szezon: a Sound-hétvége nyomai a bútoron",
        """<p>Zamárdiban a fesztiválszezon nem csak a várost, hanem <strong>a környékbeli lakások bútorait is megviseli</strong> - vendégek jönnek-mennek, és a kanapé mindent megjegyez.</p>
<p>"A fesztivál hétvégéjén kiadtuk a lakást. Mire visszakapom, a <strong>kanapé ragad, büdös, és olyan foltok vannak rajta</strong>, amiket nem akarok azonosítani" - mondja egy zamárdi lakástulajdonos.</p>
<p>A fesztiválszezon intenzív használata <strong>extrém szennyeződéseket</strong> hoz: alkohol, ételmaradék, sár, izzadság és egyéb váratlan foltok rétegesen rakódnak a kárpitra.</p>
<p>Az ECO Clean a <strong>fesztiválszezon utáni teljes kárpit-megújítást</strong> kínálja: mélytisztítás, szagtalanítás, fertőtlenítés - a bútor újra emberi környezetté válik.</p>""",
        "Zamárdiban a fesztiválszezon után ECO Clean kell: profi mélytisztítás, ami a legdurvább party-nyomokat is eltünteti. A bérelt gép ehhez kevés - bízza ránk!"
    ),
    (
        "balatonfoldvar", "Balatonföldvár",
        "Balatonföldváron a bérlők után is ragyog a bútor!",
        "A nyári bérlők után ne bérelt géppel kísérletezzen - az eredmény csalódás lesz, mert aki banánnal fizet, az majmot kap. Földváron az ECO Clean hozza a profi eredményt.",
        "Nyári bérlők: ismeretlen foltok a kanapén",
        """<p>Balatonföldváron sok lakás és nyaraló megy ki nyári bérletbe - és a <strong>bérlők után a bútorok állapota</strong> gyakran meglepetés a tulajdonosnak.</p>
<p>"Szeptember elején mindig izgulok, mit találok. A múlt évben a <strong>kanapén festékfolt, a fotelben égésnyom</strong>, és az egész lakás dohányszagú volt" - meséli egy földvári bérbeadó.</p>
<p>A bérlők általában nem vigyáznak úgy a bútorokra, mint a sajátjukra - <strong>a foltok, szagok és szennyeződések</strong> egy nyár alatt felgyűlnek és megülepednek.</p>
<p>Az ECO Clean a <strong>bérlők utáni teljes kárpit-felújítást</strong> végzi: mélytisztítás, szagtalanítás, és ahol szükséges, folttisztítás - a bútor újra kiadásra kész állapotba kerül.</p>""",
        "Balatonföldváron a bérbeadók ECO Cleannel készítik elő lakásukat az új szezonra: profi mélytisztítás, ami értéket óv. Bérelt gép helyett válasszon profin!"
    ),
    (
        "balatonlelle", "Balatonlelle",
        "Balatonlellén háziállatos vendégek után is tiszta a kárpit!",
        "Háziállatos vendégek után különösen fontos a profi tisztítás - a bérelt gép nem elég, mert aki banánnal fizet, az majmot kap. Lellén az ECO Clean a megoldás.",
        "Háziállatos vendégek: szőr és szag a kárpiton",
        """<p>Balatonlellén sok szállás fogad háziállattal érkező vendégeket - ami jó a forgalomnak, de a <strong>bútorok állapotát megsínyli</strong> a kutyák és macskák jelenléte.</p>
<p>"Állatbarát szállásunk van, ami népszerű, de <strong>minden kutyás vendég után a kanapé tele van szőrrel</strong>, és az a jellegzetes nedves kutya szag is megmarad" - mondja egy lellei szálláskiadó.</p>
<p>Az állati szőr, nyál és bőrzsír <strong>mélyen a szövetbe ivódik</strong>, és egyszerű porszívózással nem távolítható el. Az allergén vendégek számára ez komoly problémát jelent.</p>
<p>Az ECO Clean <strong>állatszőr-mentesítést és szagtalanítást</strong> is végez: a kárpit nemcsak szőrmentes, hanem szagmentes és allergénmentes is lesz - készen a következő vendégre.</p>""",
        "Balatonlellén az állatbarát szállások ECO Cleannel biztosítják a higiéniát: szőr, szag és allergén eltávolítása profin. A bérelt gép erre nem képes!"
    ),
    (
        "balatonboglar", "Balatonboglár",
        "Balatonbogláron a gyerektábor után is csillog a bútor!",
        "A gyerekek után a bútor alapos tisztítást igényel - de aki banánnal fizet, az majmot kap. Bérelt gép helyett Bogláron is az ECO Clean a profi megoldás.",
        "Nyári tábor: fagyizó, festékező gyerekek és a bútorok",
        """<p>Balatonbogláron nyaranta <strong>gyerektáborok és családi nyaralások</strong> zajlanak - a bútorok szempontjából ez intenzív igénybevételt jelent.</p>
<p>"A nyári táboros gyerekek után a <strong>közös tér kanapéi katasztrofálisan néznek ki</strong>: fagyi, festék, sár, ragasztó - ami egy kreatív gyerek kezébe kerül, az a bútoron végzi" - meséli egy boglárt szálláshely-üzemeltető.</p>
<p>A gyerekek által okozott szennyeződések <strong>rendkívül változatosak</strong>: vízfesték, filctoll, ételmaradék, ragasztó, homok - ezek együtt komplex tisztítási feladatot jelentenek.</p>
<p>Az ECO Clean a <strong>gyerekfoltok teljes skáláját</strong> kezeli: egy menetben eltávolítja az összes különböző szennyeződést, és a bútor újra biztonságosan használható.</p>""",
        "Balatonbogláron a gyerekprogramok után ECO Clean kell: minden típusú gyerekfolt eltávolítása egy menetben. A bérelt gép nem bír a sokféle szennyeződéssel - mi igen!"
    ),
    (
        "balatonfuzfo", "Balatonfüzfő",
        "Balatonfüzfőn a por ellen is van megoldás!",
        "Az ipari környezet pora mindenhová behatol - és a bérelt gép nem elég a mélytisztításhoz, mert aki banánnal fizet, az majmot kap. Füzfőn az ECO Clean a megoldás.",
        "Ipari por: a láthatatlan réteg a bútorokon",
        """<p>Balatonfüzfőn az ipari környezet miatt a <strong>levegőben több a por és szálló szennyeződés</strong>, ami a lakásokba is bejut és a bútorokon lerakódik.</p>
<p>"Hiába takarítok naponta, a <strong>bútorok kárpitja szürkés réteget kap</strong> pár hét alatt. A por a szövet mélyébe ivódik, és allergiát is okoz" - panaszkodik egy füzfői lakos.</p>
<p>Az ipari jellegű finom por <strong>a szövet rostjai közé hatol</strong>, és felszíni porszívózással nem távolítható el teljesen. Idővel a kárpit fakul és egészségtelenné válik.</p>
<p>Az ECO Clean ipari mélytisztítása <strong>a finom port is kiszívja a szövetek mélyéről</strong>: a kárpit visszanyeri színét, és a beltéri levegő minősége is javul.</p>""",
        "Balatonfüzfőn az ECO Clean az ipari por ellensége: mélytisztítás, ami a legfinomabb részecskéket is eltávolítja. Bérelt gép erre képtelen - hívjon profit!"
    ),
    (
        "balatonkenese", "Balatonkenese",
        "Balatonkenesén sáros cipő után is makulátlan a kanapé!",
        "Az esős idő után ne bérelt géppel próbálkozzon - aki banánnal fizet, majmot kap. Kenesén az ECO Clean az, ami a sáros bútort profin rendbe teszi.",
        "Esős nap: sáros cipővel a kanapéra",
        """<p>Balatonkenesén az esős, őszi-tavaszi időszakban a <strong>sáros cipők és csizmák</strong> rendszeres vendégek a lakásban - és sajnos a kanapén is.</p>
<p>"A gyerekek esőben is kint játszanak, és utána <strong>egyenesen a kanapéra ülnek sáros ruhában</strong>. A férjem sem jobb - a kertből jön be és leül. A kanapé barna" - mondja egy kenesei anyuka.</p>
<p>A sár száradás után <strong>kemény réteget képez a szöveten</strong>, ami koptatja a rostokat és fakítja a színt. A nedvesség ráadásul penészesedést is okozhat a párna belsejében.</p>
<p>Az ECO Clean a <strong>száraz sarat és a nedvesség okozta problémákat</strong> is kezeli: a kárpit nemcsak tiszta, hanem száraz és penészmentes is lesz.</p>""",
        "Balatonkenesén az ECO Clean a sáros bútorok megmentője: mélytisztítás, szárítás és penészmegelőzés egyben. A bérelt gép a sárral nem boldogul - mi igen!"
    ),
    (
        "balatonszemes", "Balatonszemes",
        "Balatonszemesen a homok sem marad a kárpitban!",
        "Strandolás után a bútor tele van homokkal - és a bérelt gép nem old meg semmit, mert aki banánnal fizet, az majmot kap. Szemesen az ECO Clean a profi választás.",
        "Strandolás után: homokos, naptejes bútor",
        """<p>Balatonszemesen a strand a mindennapok része - de a <strong>homok és naptej kombinációja</strong> a bútorokra nézve katasztrofális.</p>
<p>"Hiába a zuhanyzó, a <strong>homok mindig bejut a lakásba</strong>, és a kanapén ragad meg. A naptej meg bezsírozza a kárpitot. Nyár végére a kanapé olyan, mint egy strandszőnyeg" - meséli egy szemesi lakos.</p>
<p>A homokszemcsék a <strong>szövet rostjai közé ékelődnek</strong> és koptatják azokat, míg a naptej zsíros filmréteget képez, ami befogja a port és a szennyeződést.</p>
<p>Az ECO Clean <strong>a homokot és a zsíros lerakódást</strong> is hatékonyan eltávolítja: a kárpit visszanyeri puhaságát és eredeti tapintását.</p>""",
        "Balatonszemesen az ECO Clean a strand utáni bútor-mentő: homok és naptej eltávolítás profin. Bérelt gép a homokkal nem bír - mi tökéletesen igen!"
    ),
    (
        "fonyod", "Fonyód",
        "Fonyódon a nedves szag is eltűnik a kárpitból!",
        "A házi szárítás és bérelt gép kombinációja csak ront a helyzeten - mert aki banánnal fizet, az majmot kap. Fonyódon az ECO Clean a valódi megoldás a nedves bútor problémára.",
        "Mosógép melletti szárítás: a bútor állandóan párás",
        """<p>Fonyódon sok lakásban a <strong>mosógép és szárítás a nappali közelében</strong> történik, és a páratartalom a bútorokra is rátelepszik.</p>
<p>"A kis lakásban nincs más hely a szárításra, mint a nappali. A <strong>kanapé állandóan enyhén nedves tapintású</strong>, és olyan dohos szag van benne, amit semmilyen illatosítóval nem tudok elfedni" - meséli egy fonyódi lakos.</p>
<p>A tartósan nedves környezet <strong>penészgombák és baktériumok</strong> szaporodásának kedvez a kárpit belsejében - ez nemcsak szagproblémát, hanem egészségügyi kockázatot is jelent.</p>
<p>Az ECO Clean <strong>mélyszárítást és penészmentesítést</strong> is végez: a kárpit teljesen átszárad, a penész és baktériumok elpusztulnak, és a dohos szag végleg eltűnik.</p>""",
        "Fonyódon az ECO Clean a nedves bútorok specialistája: mélyszárítás, penészmentesítés, szagtalanítás. Bérelt gép a nedvességet csak rontja - bízza profikra!"
    ),
    (
        "keszthely", "Keszthely",
        "Keszthelyen az albérleti bútor is megújulhat!",
        "Egyetemistaként csábító a gépbérlés - de az eredmény csalódás, mert aki banánnal fizet, az majmot kap. Keszthelyen az ECO Clean jutányos áron ad profi eredményt.",
        "Egyetemista albérlet: évek kopása a bútoron",
        """<p>Keszthelyen az egyetemi élet miatt rengeteg albérlet működik - és az <strong>albérleti bútorok évek alatt jelentősen leromlanak</strong> a folyamatos bérlőváltástól.</p>
<p>"Az albérletem kanapéja ki tudja hány generáció diákot kiszolgált már. <strong>Foltos, szagos, és már a szín sem eredeti</strong> - de cserélni nem akarom, mert az alap jó" - mondja egy keszthelyi bérbeadó.</p>
<p>Az egyetemista életmód - <strong>pizzaestek, tanulás közbeni nassolás, alvás a kanapén</strong> - fokozottan igénybe veszi a bútorokat, és évek alatt a szennyeződés rétegesen rakódik.</p>
<p>Az ECO Clean <strong>a régi albérleti bútoroknak is visszaadja az életet</strong>: mélytisztítással eltávolítja az évek lerakódásait, és a bútor újra vonzó lesz az új bérlő számára.</p>""",
        "Keszthelyen az ECO Clean a bérbeadók titkos fegyvere: bérlőváltáskor mélytisztítás, ami felértékeli az albérletet. Bérelt gép évek koszával nem bír - hívjon profin!"
    ),
    (
        "heviz", "Hévíz",
        "Hévízen a wellness-turisták után is friss a kárpit!",
        "A szállodai és apartmanos bútoroknak profi kezelés kell - aki banánnal fizet, az majmot kap. Hévízen az ECO Clean a szálláskiadók igazi partnere.",
        "Wellness-turisták: krémes, olajos kárpit a szálláshelyen",
        """<p>Hévízen a <strong>wellness-turisták</strong> a gyógyvíz után krémekkel, olajokkal kenik be magukat - és utána leülnek a szálláshely kanapéjára.</p>
<p>"A vendégek a termálból jönnek, és <strong>az egész testük krémes, olajos</strong>. A kanapéra, fotelre úgy ülnek le - a kárpit zsíros foltokat kap, és az a gyógyvizes szag is beleivódik" - meséli egy hévízi szállás üzemeltetője.</p>
<p>A gyógykenőcsök és olajok <strong>rendkívül makacsul tapadnak</strong> a textilszövetekhez - a zsíros lerakódás idővel megkeményedik és sötét foltokat hagy.</p>
<p>Az ECO Clean <strong>a krém- és olajfoltokat is hatékonyan oldja</strong>: speciális technológiánk a zsíros lerakódásokat kiemeli a szövetből, és a kárpit újra friss, tiszta lesz.</p>""",
        "Hévízen a szálláshelyek ECO Cleannel tartják rendben bútoraikat: krém, olaj és gyógyvíz-szag eltávolítás profin. A bérelt gép a zsíros foltokkal nem bír!"
    ),
    (
        "tapolca", "Tapolca",
        "Tapolcán a régi bútor penésze is megszűnik!",
        "A régi ház pinceszaga és penésze ellen a bérelt gép tehetetlen - aki banánnal fizet, az majmot kap. Tapolcán az ECO Clean a megoldás a penészes, dohos kárpitre.",
        "Pince és régi ház: penészesedő kárpit a nedves falak mellett",
        """<p>Tapolcán a régi házak és pincés ingatlanok jellemzők - és a <strong>nedves falak mellett a bútorok kárpitja</strong> is hajlamos penészesedni.</p>
<p>"A régi házunkban a <strong>fal mellett álló kanapé hátoldalán penész nőtt</strong>. A szaga az egész szobát betölti, és a gyerekek köhögni kezdtek tőle" - mondja egy tapolcai család.</p>
<p>A penészgomba a kárpitszövetben <strong>egészségügyi kockázatot</strong> jelent: légúti problémákat, allergiát és bőrirritációt okozhat. A felszíni törlés nem oldja meg a problémát.</p>
<p>Az ECO Clean <strong>penészmentesítő mélytisztítása</strong> a gomba gyökeréig hatol: elpusztítja a penészt, eltávolítja a spórákat, és a kárpit újra egészséges, szagmentes lesz.</p>""",
        "Tapolcán az ECO Clean a penész ellensége: mélytisztítás és gombaölés, ami a régi házak bútorait is megmenti. Bérelt gép penésszel nem boldogul - mi igen!"
    ),
]

# HTML template
def get_section_html(city_data):
    slug, city, heading, intro, usecase_title, usecase_body, highlight = city_data
    return f'''
    <section class="ba-promo-section">
        <div class="section-container">
            <div class="ba-section-header">
                <div class="section-label">Előtte / Utána</div>
                <h2>{heading}</h2>
                <p class="ba-intro">{intro}</p>
            </div>
            <div class="ba-promo-grid">
                <div class="ba-promo-text">
                    <h3 class="ba-usecase-title">{usecase_title}</h3>
                    <div class="ba-usecase-body">{usecase_body}</div>
                    <div class="ba-highlight-box">
                        <p>{highlight}</p>
                    </div>
                    <a href="tel:+36702408141" class="ba-cta-inline">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                        Hívjon most: 06 70 240 8141
                    </a>
                </div>
                <div class="ba-slider-wrapper">
                    <img src="img/k%C3%A1rpittiszt%C3%ADt%C3%A1s%20ut%C3%A1n.webp" alt="Kárpittisztítás után" class="ba-img-after" loading="lazy">
                    <img src="img/k%C3%A1rpittiszt%C3%ADt%C3%A1s%20el%C5%91tt.webp" alt="Kárpittisztítás előtt" class="ba-img-before" loading="lazy">
                    <div class="ba-slider-handle"></div>
                    <div class="ba-slider-knob"><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/><polyline points="9 18 15 12 9 6" transform="translate(6,0)"/></svg></div>
                    <span class="ba-label ba-label--before">Előtte</span>
                    <span class="ba-label ba-label--after">Utána</span>
                </div>
            </div>
        </div>
    </section>
'''

def patch_file(filepath, section_html):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Add CSS link after style.css
    if 'before-after-slider.css' not in content:
        content = content.replace(
            '<link rel="stylesheet" href="style.css">',
            '<link rel="stylesheet" href="style.css">\n    <link rel="stylesheet" href="before-after-slider.css">'
        )

    # 2. Add JS before </body>
    if 'before-after-slider.js' not in content:
        content = content.replace(
            '</body>',
            '    <script src="before-after-slider.js"></script>\n</body>'
        )

    # 3. Insert section after the section-divider that follows id="arak" section, before <section class="why-us">
    if 'ba-promo-section' not in content:
        # Find the pattern: </section>\n\n    <div class="section-divider"></div>\n\n    <section class="why-us">
        # We need the FIRST section-divider that appears after the arak section closes, followed by why-us
        # Pattern: after id="arak" section ends (</section>), find next section-divider, insert before next <section class="why-us">
        pattern = r'(<div class="section-divider"></div>\s*\n)(\s*(?:<!--[^>]*-->\s*\n\s*)?<section class="why-us">)'

        # Find id="arak" position first
        arak_pos = content.find('id="arak"')
        if arak_pos == -1:
            print(f"  WARNING: id='arak' not found in {filepath}")
            return False

        # Find the first section-divider + why-us pattern AFTER arak
        match = re.search(pattern, content[arak_pos:])
        if match:
            insert_pos = arak_pos + match.start() + len(match.group(1))
            content = content[:insert_pos] + section_html + '\n    ' + content[insert_pos:]
        else:
            print(f"  WARNING: Could not find insertion point in {filepath}")
            return False

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    return True

def main():
    base_dir = r'G:\ECOCLEAN\NEW'
    success_count = 0

    for city_data in cities:
        slug = city_data[0]
        filename = f'karpittisztitas-{slug}.html'
        filepath = os.path.join(base_dir, filename)

        if not os.path.exists(filepath):
            print(f"  SKIP: {filename} not found")
            continue

        section_html = get_section_html(city_data)

        if patch_file(filepath, section_html):
            print(f"  OK: {filename}")
            success_count += 1
        else:
            print(f"  FAIL: {filename}")

    print(f"\nDone: {success_count}/{len(cities)} files patched successfully.")

if __name__ == '__main__':
    main()
