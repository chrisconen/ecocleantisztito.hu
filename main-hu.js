// ═══════════════════════════════════════════════════════════
// ECO CLEAN GYŐR - MAGYAR KONFIGURÁTOR
// Version: 1.0.0 - CENTAUR TRIAD Edition
// Geo-Clustering Zone A - Győr és környéke
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
// N8N WEBHOOK KONFIGURÁCIÓ
// ═══════════════════════════════════════════════════════════
const N8N_CONFIG = {
    webhookUrl: 'https://hub.centaur-lang.dev/webhook/booking-request',
    availabilityUrl: 'https://hub.centaur-lang.dev/webhook/check-availability',
    fallbackEmail: 'chris.conen@gmail.com',
    country: 'HU',
    defaultZone: 'A',
    currency: 'HUF',
    currencySymbol: 'Ft'
};

// ═══════════════════════════════════════════════════════════
// SZOLGÁLTATÁSOK ÉS ÁRAK
// ═══════════════════════════════════════════════════════════

const SERVICES = {
    // ═══════════════════════════════════════════════════════
    // KÁRPITTISZTÍTÁS (Lakossági + Céges)
    // ═══════════════════════════════════════════════════════
    karpit: {
        name: "Kárpittisztítás",
        icon: "🛋️",
        category: "lakossagi",
        items: [
            { id: "szofa", name: "Szófa, heverő", price: 10500, duration: 60, atkairitas: 2500 },
            { id: "l_kanape", name: "L kanapé", price: 15000, duration: 90, atkairitas: 3500 },
            { id: "u_kanape", name: "U kanapé", price: 18000, duration: 120, atkairitas: 4500 },
            { id: "fotel", name: "Fotel", price: 5000, duration: 30, atkairitas: 2500 },
            { id: "ebedlo_szek", name: "Ebédlő szék", price: 1500, duration: 15, atkairitas: 0 },
            { id: "irodai_szek", name: "Irodai szék", price: 3000, duration: 20, atkairitas: 0 }
        ],
        warning: "⚠️ ANDANTE - bőrhatású szövet, impregnált kárpit tisztítását NEM vállaljuk!"
    },

    // ═══════════════════════════════════════════════════════
    // MATRACTISZTÍTÁS (Lakossági + Céges)
    // ═══════════════════════════════════════════════════════
    matrac: {
        name: "Matractisztítás",
        icon: "🛏️",
        category: "lakossagi",
        items: [
            { id: "egyagyas_a", name: "Egyágyas matrac (A oldal)", price: 8000, duration: 30, mosasFelar: 5000 },
            { id: "egyagyas_ab", name: "Egyágyas matrac (A+B oldal)", price: 13000, duration: 45, mosasFelar: 10000 },
            { id: "franciaagyas_a", name: "Franciaágy matrac (A oldal)", price: 12000, duration: 45, mosasFelar: 5000 },
            { id: "franciaagyas_ab", name: "Franciaágy matrac (A+B oldal)", price: 17000, duration: 60, mosasFelar: 10000 },
            { id: "gyerekmatrac", name: "Gyerekmatrac", price: 5000, duration: 20, mosasFelar: 5000 },
            { id: "kisagy_matrac", name: "Kiságy matrac", price: 4000, duration: 15, mosasFelar: 3000 },
            { id: "hotelmatrac", name: "Hotelmatrac (10+ db)", price: 6000, duration: 25, mosasFelar: 5000, minOrder: 10 }
        ],
        info: "📝 Száradási idő: 2-4 óra. Helyszíni tisztítás. Atkairítás tanúsítvány: Ingyenes!"
    },

    // ═══════════════════════════════════════════════════════
    // IPARI SZŐNYEGTISZTÍTÁS (Csak céges)
    // ═══════════════════════════════════════════════════════
    szonyeg: {
        name: "Ipari szőnyegtisztítás",
        icon: "🧹",
        category: "ceges",
        minOrder: 25000,
        items: [
            { id: "szonyegpadlo", name: "Szőnyegpadló", price: 800, unit: "m²", duration: 5 },
            { id: "futoszonyeg", name: "Futószőnyeg", price: 1500, unit: "fm", duration: 8 },
            { id: "irodaszonyeg", name: "Irodaszőnyeg", price: 900, unit: "m²", duration: 5 },
            { id: "hotelszonyeg", name: "Hotelszőnyeg", price: 750, unit: "m²", duration: 4 }
        ],
        info: "📝 Hétvégi munkavégzés felár nélkül! Rendszeres szerződés: Kedvezmény"
    },

    // ═══════════════════════════════════════════════════════
    // IPARI TAKARÍTÁS (Csak céges)
    // ═══════════════════════════════════════════════════════
    takaritas: {
        name: "Ipari takarítás",
        icon: "🏢",
        category: "ceges",
        minOrder: 30000,
        items: [
            { id: "irodatakaritas", name: "Irodatakarítás", price: 150, unit: "m²", duration: 3 },
            { id: "nagytakaritas", name: "Nagytakarítás", price: 350, unit: "m²", duration: 6 },
            { id: "epites_utani", name: "Építés utáni takarítás", price: 500, unit: "m²", duration: 8 },
            { id: "gyartakaritas", name: "Gyártakarítás", price: 200, unit: "m²", duration: 4 }
        ],
        info: "📝 Éjszakai munkavégzés lehetséges! Havi szerződés: Egyedi ár"
    },

    // ═══════════════════════════════════════════════════════
    // ABLAK- ÉS KIRAKATMOSÁS (Csak céges)
    // ═══════════════════════════════════════════════════════
    ablak: {
        name: "Ablak- és kirakatmosás",
        icon: "🪟",
        category: "ceges",
        minOrder: 20000,
        items: [
            { id: "kirakat", name: "Kirakat", price: 600, unit: "m²", duration: 10 },
            { id: "irodaablak", name: "Irodaablak", price: 800, unit: "db", duration: 8 },
            { id: "homlokzat", name: "Homlokzat", price: 1200, unit: "m²", duration: 15 }
        ],
        surcharges: [
            { id: "magasban", name: "Magasban (3m+)", type: "percent", value: 50 }
        ],
        info: "📝 Alpintechnika elérhető! Havi szerződés: Kedvezmény"
    }
};

// ═══════════════════════════════════════════════════════════
// EXTRA SZOLGÁLTATÁSOK
// ═══════════════════════════════════════════════════════════
const EXTRAS = {
    szortelenites: {
        id: "szortelenites",
        name: "Szőrtelenítés (kutya/macska)",
        description: "Kirby G7 turbókefe - alapos szőreltávolítás",
        price: 2500,
        icon: "🐾",
        appliesTo: ["karpit"]
    },
    atkairitas: {
        id: "atkairitas",
        name: "Atkairítás + tanúsítvány",
        description: "Kirby G7 - allergiásoknak ajánlott, eredmény bemutatása",
        priceType: "perItem", // Ár a termék atkairitas mezőjéből jön
        icon: "🦠",
        appliesTo: ["karpit"]
    },
    matracMosas: {
        id: "matrac_mosas",
        name: "Fertőtlenítő mosás",
        description: "Nátrium-hipokloritos mélytisztítás erős szennyeződéshez",
        priceType: "perItem", // Ár a termék mosasFelar mezőjéből jön
        icon: "🧼",
        appliesTo: ["matrac"]
    }
};

// ═══════════════════════════════════════════════════════════
// KISZÁLLÁSI DÍJAK (Zóna alapú - távolság szerint)
// ═══════════════════════════════════════════════════════════
const KISZALLASI_DIJAK = {
    zona_a: { name: "Helyi (0-15 km)", price: 2500, description: "Győr belváros és közvetlen környéke" },
    zona_b: { name: "Közeli (15-30 km)", price: 3000, description: "Győr külvárosok, közeli települések" },
    zona_c: { name: "Közepes (30-50 km)", price: 3500, description: "Közepes távolságú városok" },
    zona_d: { name: "Távoli (50-70 km)", price: 4500, description: "Távolabbi nagyvárosok" },
    zona_e: { name: "Nagyon távoli (70+ km)", price: 5500, description: "Legmesszebb eső területek" },
    egyedi: { name: "Egyéb település", price: 0, description: "Egyedi ár - felvesszük a kapcsolatot" }
};

// ═══════════════════════════════════════════════════════════
// ZONE A VÁROSOK - TELJES SZOLGÁLTATÁSI TERÜLET
// Nyugat-Dunántúl + Közép-Dunántúl
// ═══════════════════════════════════════════════════════════
const LOCATIONS = {
    // ═══════════════════════════════════════════════════════
    // ZÓNA A - HELYI (0-15 km) - 2.500 Ft
    // ═══════════════════════════════════════════════════════
    "gyor_belvaros": { 
        name: "Győr - Belváros", 
        zone: "A", 
        kiszallas: "zona_a",
        country: "HU",
        region: "Győr-Moson-Sopron"
    },
    "gyor_nadorvaros": { 
        name: "Győr - Nádorváros", 
        zone: "A", 
        kiszallas: "zona_a",
        country: "HU",
        region: "Győr-Moson-Sopron"
    },
    "gyor_sziget": { 
        name: "Győr - Sziget", 
        zone: "A", 
        kiszallas: "zona_a",
        country: "HU",
        region: "Győr-Moson-Sopron"
    },
    "gyor_adyvaros": { 
        name: "Győr - Adyváros", 
        zone: "A", 
        kiszallas: "zona_a",
        country: "HU",
        region: "Győr-Moson-Sopron"
    },

    // ═══════════════════════════════════════════════════════
    // ZÓNA B - KÖZELI (15-30 km) - 3.000 Ft
    // ═══════════════════════════════════════════════════════
    "gyor_menfocsanak": { 
        name: "Győr - Ménfőcsanak", 
        zone: "A", 
        kiszallas: "zona_b",
        country: "HU",
        region: "Győr-Moson-Sopron"
    },
    "gyor_szitasdomb": { 
        name: "Győr - Szitásdomb", 
        zone: "A", 
        kiszallas: "zona_b",
        country: "HU",
        region: "Győr-Moson-Sopron"
    },
    "gyor_revfalu": { 
        name: "Győr - Révfalu", 
        zone: "A", 
        kiszallas: "zona_b",
        country: "HU",
        region: "Győr-Moson-Sopron"
    },
    "gyor_szabadhegy": { 
        name: "Győr - Szabadhegy", 
        zone: "A", 
        kiszallas: "zona_b",
        country: "HU",
        region: "Győr-Moson-Sopron"
    },
    "gyor_gyarvaros": { 
        name: "Győr - Gyárváros", 
        zone: "A", 
        kiszallas: "zona_b",
        country: "HU",
        region: "Győr-Moson-Sopron"
    },
    "gyor_marcalvaros": { 
        name: "Győr - Marcalváros", 
        zone: "A", 
        kiszallas: "zona_b",
        country: "HU",
        region: "Győr-Moson-Sopron"
    },
    "gyor_egyeb": { 
        name: "Győr - Egyéb városrész", 
        zone: "A", 
        kiszallas: "zona_b",
        country: "HU",
        region: "Győr-Moson-Sopron"
    },
    "csorna": { 
        name: "Csorna", 
        zone: "A", 
        kiszallas: "zona_b",
        country: "HU",
        region: "Győr-Moson-Sopron"
    },
    "kapuvar": { 
        name: "Kapuvár", 
        zone: "A", 
        kiszallas: "zona_b",
        country: "HU",
        region: "Győr-Moson-Sopron"
    },
    "tet": { 
        name: "Tét", 
        zone: "A", 
        kiszallas: "zona_b",
        country: "HU",
        region: "Győr-Moson-Sopron"
    },
    "abda": { 
        name: "Ábda", 
        zone: "A", 
        kiszallas: "zona_b",
        country: "HU",
        region: "Győr-Moson-Sopron"
    },
    "bony": { 
        name: "Bőny", 
        zone: "A", 
        kiszallas: "zona_b",
        country: "HU",
        region: "Győr-Moson-Sopron"
    },
    "gyorujbarat": { 
        name: "Győrújbarát", 
        zone: "A", 
        kiszallas: "zona_b",
        country: "HU",
        region: "Győr-Moson-Sopron"
    },
    "nyul": { 
        name: "Nyúl", 
        zone: "A", 
        kiszallas: "zona_b",
        country: "HU",
        region: "Győr-Moson-Sopron"
    },
    "rabapatona": { 
        name: "Rábapatona", 
        zone: "A", 
        kiszallas: "zona_b",
        country: "HU",
        region: "Győr-Moson-Sopron"
    },

    // ═══════════════════════════════════════════════════════
    // ZÓNA C - KÖZEPES (30-50 km) - 3.500 Ft
    // ═══════════════════════════════════════════════════════
    "mosonmagyarovar": { 
        name: "Mosonmagyaróvár", 
        zone: "A", 
        kiszallas: "zona_c",
        country: "HU",
        region: "Győr-Moson-Sopron"
    },
    "pannonhalma": { 
        name: "Pannonhalma", 
        zone: "A", 
        kiszallas: "zona_c",
        country: "HU",
        region: "Győr-Moson-Sopron"
    },
    "papa": { 
        name: "Pápa", 
        zone: "A", 
        kiszallas: "zona_c",
        country: "HU",
        region: "Veszprém"
    },
    "fertod": { 
        name: "Fertőd", 
        zone: "A", 
        kiszallas: "zona_c",
        country: "HU",
        region: "Győr-Moson-Sopron"
    },
    "hegyeshalom": { 
        name: "Hegyeshalom", 
        zone: "A", 
        kiszallas: "zona_c",
        country: "HU",
        region: "Győr-Moson-Sopron"
    },
    "rajka": { 
        name: "Rajka", 
        zone: "A", 
        kiszallas: "zona_c",
        country: "HU",
        region: "Győr-Moson-Sopron"
    },
    "lebeny": { 
        name: "Lébény", 
        zone: "A", 
        kiszallas: "zona_c",
        country: "HU",
        region: "Győr-Moson-Sopron"
    },
    "zirc": { 
        name: "Zirc", 
        zone: "A", 
        kiszallas: "zona_c",
        country: "HU",
        region: "Veszprém"
    },

    // ═══════════════════════════════════════════════════════
    // ZÓNA D - TÁVOLI (50-70 km) - 4.500 Ft
    // ═══════════════════════════════════════════════════════
    "sopron": { 
        name: "Sopron", 
        zone: "A", 
        kiszallas: "zona_d",
        country: "HU",
        region: "Győr-Moson-Sopron"
    },
    "tata": { 
        name: "Tata", 
        zone: "A", 
        kiszallas: "zona_d",
        country: "HU",
        region: "Komárom-Esztergom"
    },
    "komarom": { 
        name: "Komárom", 
        zone: "A", 
        kiszallas: "zona_d",
        country: "HU",
        region: "Komárom-Esztergom"
    },
    "sarvar": { 
        name: "Sárvár", 
        zone: "A", 
        kiszallas: "zona_d",
        country: "HU",
        region: "Vas"
    },
    "celldomolk": { 
        name: "Celldömölk", 
        zone: "A", 
        kiszallas: "zona_d",
        country: "HU",
        region: "Vas"
    },
    "ajka": { 
        name: "Ajka", 
        zone: "A", 
        kiszallas: "zona_d",
        country: "HU",
        region: "Veszprém"
    },
    "koszeg": { 
        name: "Kőszeg", 
        zone: "A", 
        kiszallas: "zona_d",
        country: "HU",
        region: "Vas"
    },
    "oroszlany": { 
        name: "Oroszlány", 
        zone: "A", 
        kiszallas: "zona_d",
        country: "HU",
        region: "Komárom-Esztergom"
    },
    "dorog": { 
        name: "Dorog", 
        zone: "A", 
        kiszallas: "zona_d",
        country: "HU",
        region: "Komárom-Esztergom"
    },

    // ═══════════════════════════════════════════════════════
    // ZÓNA E - NAGYON TÁVOLI (70+ km) - 5.500 Ft
    // ═══════════════════════════════════════════════════════
    "szombathely": { 
        name: "Szombathely", 
        zone: "A", 
        kiszallas: "zona_e",
        country: "HU",
        region: "Vas"
    },
    "veszprem": { 
        name: "Veszprém", 
        zone: "A", 
        kiszallas: "zona_e",
        country: "HU",
        region: "Veszprém"
    },
    "tatabanya": { 
        name: "Tatabánya", 
        zone: "A", 
        kiszallas: "zona_e",
        country: "HU",
        region: "Komárom-Esztergom"
    },
    "szekesfehervar": { 
        name: "Székesfehérvár", 
        zone: "A", 
        kiszallas: "zona_e",
        country: "HU",
        region: "Fejér"
    },
    "esztergom": { 
        name: "Esztergom", 
        zone: "A", 
        kiszallas: "zona_e",
        country: "HU",
        region: "Komárom-Esztergom"
    },
    "varpalota": { 
        name: "Várpalota", 
        zone: "A", 
        kiszallas: "zona_e",
        country: "HU",
        region: "Veszprém"
    },

    // ═══════════════════════════════════════════════════════
    // EGYÉB - Nincs a listán
    // ═══════════════════════════════════════════════════════
    "egyeb": { 
        name: "Egyéb település (nem listázott)", 
        zone: "A", 
        kiszallas: "egyedi",
        country: "HU",
        region: "Egyéb",
        customPrice: true
    }
};

// ═══════════════════════════════════════════════════════════
// KONFIGURÁTOR ÁLLAPOT
// ═══════════════════════════════════════════════════════════
const state = {
    customerType: null,        // 'maganszemely' | 'ceges'
    selectedServices: [],      // ['karpit', 'matrac', ...]
    quantities: {},            // { 'szofa': 2, 'fotel': 1, ... }
    extras: {                  // Extra szolgáltatások
        szortelenites: false,
        atkairitas: false,
        matracMosas: false
    },
    location: null,
    selectedDate: null,
    contact: {
        name: '',
        email: '',
        phone: '',
        message: ''
    }
};

// ═══════════════════════════════════════════════════════════
// KONFIGURÁTOR LÉPÉSEK
// ═══════════════════════════════════════════════════════════
const STEPS = [
    {
        id: 1,
        label: "Milyen ügyfél Ön?",
        type: "chips",
        options: [
            { value: "maganszemely", label: "Magánszemély", icon: "🏠" },
            { value: "ceges", label: "Céges ügyfél", icon: "🏢", badge: "Kedvezmény!" }
        ]
    },
    {
        id: 2,
        label: "Mit szeretne tisztíttatni?",
        type: "chips",
        multi: true,
        dynamic: true // Opciók a customerType alapján változnak
    },
    {
        id: 3,
        label: "Válassza ki a termékeket",
        type: "products",
        dynamic: true
    },
    {
        id: 4,
        label: "Extra szolgáltatások",
        type: "extras",
        dynamic: true
    },
    {
        id: 5,
        label: "Hol található?",
        type: "select",
        options: LOCATIONS
    },
    {
        id: 6,
        label: "Válasszon időpontot",
        type: "calendar"
    }
];

// ═══════════════════════════════════════════════════════════
// SEGÉDFUNKCIÓK
// ═══════════════════════════════════════════════════════════

function formatPrice(price) {
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " Ft";
}

function formatDuration(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
        return mins > 0 ? `${hours} óra ${mins} perc` : `${hours} óra`;
    }
    return `${mins} perc`;
}

// ═══════════════════════════════════════════════════════════
// ÁR KALKULÁCIÓ
// ═══════════════════════════════════════════════════════════

function calculateTotal() {
    let subtotal = 0;
    let totalDuration = 0;
    let breakdown = [];

    // Termékek ára
    Object.entries(state.quantities).forEach(([itemId, qty]) => {
        if (qty > 0) {
            // Find item in services
            for (const [serviceKey, service] of Object.entries(SERVICES)) {
                const item = service.items.find(i => i.id === itemId);
                if (item) {
                    const itemTotal = item.price * qty;
                    subtotal += itemTotal;
                    totalDuration += (item.duration || 30) * qty;
                    
                    breakdown.push({
                        name: item.name,
                        qty: qty,
                        unit: item.unit || 'db',
                        unitPrice: item.price,
                        total: itemTotal
                    });

                    // Atkairítás felár
                    if (state.extras.atkairitas && item.atkairitas > 0) {
                        const atkairitasTotal = item.atkairitas * qty;
                        subtotal += atkairitasTotal;
                        breakdown.push({
                            name: `↳ Atkairítás (${item.name})`,
                            qty: qty,
                            unitPrice: item.atkairitas,
                            total: atkairitasTotal,
                            isExtra: true
                        });
                    }

                    // Matrac mosás felár
                    if (state.extras.matracMosas && item.mosasFelar > 0) {
                        const mosasTotal = item.mosasFelar * qty;
                        subtotal += mosasTotal;
                        breakdown.push({
                            name: `↳ Fertőtlenítő mosás (${item.name})`,
                            qty: qty,
                            unitPrice: item.mosasFelar,
                            total: mosasTotal,
                            isExtra: true
                        });
                    }

                    break;
                }
            }
        }
    });

    // Szőrtelenítés (fix ár)
    if (state.extras.szortelenites) {
        const szortelenitesDij = EXTRAS.szortelenites.price;
        subtotal += szortelenitesDij;
        breakdown.push({
            name: "Szőrtelenítés (kutya/macska)",
            qty: 1,
            unitPrice: szortelenitesDij,
            total: szortelenitesDij,
            isExtra: true
        });
    }

    // Kiszállási díj
    let kiszallasiDij = 0;
    if (state.location && LOCATIONS[state.location]) {
        const locationData = LOCATIONS[state.location];
        kiszallasiDij = KISZALLASI_DIJAK[locationData.kiszallas]?.price || 0;
        breakdown.push({
            name: `Kiszállási díj (${KISZALLASI_DIJAK[locationData.kiszallas]?.name})`,
            qty: 1,
            unitPrice: kiszallasiDij,
            total: kiszallasiDij,
            isDelivery: true
        });
    }

    const total = subtotal + kiszallasiDij;

    return {
        subtotal,
        kiszallasiDij,
        total,
        totalDuration,
        breakdown
    };
}

// ═══════════════════════════════════════════════════════════
// UI RENDERELÉS
// ═══════════════════════════════════════════════════════════

function renderCustomerTypeStep(container) {
    container.innerHTML = `
        <div class="config-chips">
            <button class="config-chip ${state.customerType === 'maganszemely' ? 'selected' : ''}" 
                    onclick="selectCustomerType('maganszemely')">
                <span class="chip-icon">🏠</span>
                <span class="chip-label">Magánszemély</span>
            </button>
            <button class="config-chip ${state.customerType === 'ceges' ? 'selected' : ''}"
                    onclick="selectCustomerType('ceges')">
                <span class="chip-icon">🏢</span>
                <span class="chip-label">Céges ügyfél</span>
                <span class="chip-badge">Kedvezmény!</span>
            </button>
        </div>
    `;
}

function selectCustomerType(type) {
    state.customerType = type;
    state.selectedServices = [];
    state.quantities = {};
    updateUI();
}

function renderServiceSelectionStep(container) {
    if (!state.customerType) {
        container.innerHTML = '<p class="config-hint">Először válassza ki az ügyfél típust!</p>';
        return;
    }

    const availableServices = Object.entries(SERVICES).filter(([key, service]) => {
        if (state.customerType === 'maganszemely') {
            return service.category === 'lakossagi';
        }
        return true; // Céges mindent lát
    });

    container.innerHTML = `
        <div class="config-chips multi">
            ${availableServices.map(([key, service]) => `
                <button class="config-chip ${state.selectedServices.includes(key) ? 'selected' : ''}"
                        onclick="toggleService('${key}')">
                    <span class="chip-icon">${service.icon}</span>
                    <span class="chip-label">${service.name}</span>
                    ${service.minOrder ? `<span class="chip-min">Min: ${formatPrice(service.minOrder)}</span>` : ''}
                </button>
            `).join('')}
        </div>
    `;
}

function toggleService(serviceKey) {
    const index = state.selectedServices.indexOf(serviceKey);
    if (index > -1) {
        state.selectedServices.splice(index, 1);
    } else {
        state.selectedServices.push(serviceKey);
    }
    updateUI();
}

function renderProductsStep(container) {
    if (state.selectedServices.length === 0) {
        container.innerHTML = '<p class="config-hint">Először válassza ki a szolgáltatás típusokat!</p>';
        return;
    }

    let html = '';

    state.selectedServices.forEach(serviceKey => {
        const service = SERVICES[serviceKey];
        if (!service) return;

        html += `
            <div class="product-category">
                <h4 class="product-category-title">${service.icon} ${service.name}</h4>
                ${service.warning ? `<div class="product-warning">${service.warning}</div>` : ''}
                <div class="product-list">
                    ${service.items.map(item => {
                        const qty = state.quantities[item.id] || 0;
                        return `
                            <div class="product-item">
                                <div class="product-info">
                                    <span class="product-name">${item.name}</span>
                                    <span class="product-price">${formatPrice(item.price)}${item.unit ? '/' + item.unit : ''}</span>
                                </div>
                                <div class="product-controls">
                                    <button class="qty-btn" onclick="changeQuantity('${item.id}', -1)">−</button>
                                    <span class="qty-value">${qty}</span>
                                    <button class="qty-btn" onclick="changeQuantity('${item.id}', 1)">+</button>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
                ${service.info ? `<div class="product-info-note">${service.info}</div>` : ''}
            </div>
        `;
    });

    container.innerHTML = html;
}

function changeQuantity(itemId, delta) {
    const current = state.quantities[itemId] || 0;
    state.quantities[itemId] = Math.max(0, current + delta);
    updateUI();
}

function renderExtrasStep(container) {
    const hasKarpit = state.selectedServices.includes('karpit');
    const hasMatrac = state.selectedServices.includes('matrac');
    const hasAnyProducts = Object.values(state.quantities).some(q => q > 0);

    if (!hasAnyProducts) {
        container.innerHTML = '<p class="config-hint">Először válasszon termékeket!</p>';
        return;
    }

    let html = '<div class="extras-list">';

    // Szőrtelenítés (csak kárpithoz)
    if (hasKarpit) {
        html += `
            <label class="extra-item">
                <input type="checkbox" 
                       ${state.extras.szortelenites ? 'checked' : ''}
                       onchange="toggleExtra('szortelenites')">
                <div class="extra-content">
                    <span class="extra-icon">🐾</span>
                    <div class="extra-info">
                        <span class="extra-name">Szőrtelenítés (kutya/macska)</span>
                        <span class="extra-desc">Kirby G7 turbókefe - alapos szőreltávolítás</span>
                    </div>
                    <span class="extra-price">+${formatPrice(EXTRAS.szortelenites.price)}</span>
                </div>
            </label>
        `;

        html += `
            <label class="extra-item">
                <input type="checkbox" 
                       ${state.extras.atkairitas ? 'checked' : ''}
                       onchange="toggleExtra('atkairitas')">
                <div class="extra-content">
                    <span class="extra-icon">🦠</span>
                    <div class="extra-info">
                        <span class="extra-name">Atkairítás + tanúsítvány</span>
                        <span class="extra-desc">Kirby G7 - allergiásoknak, eredmény bemutatása</span>
                    </div>
                    <span class="extra-price">+termékfüggő</span>
                </div>
            </label>
        `;
    }

    // Matrac mosás (csak matrachoz)
    if (hasMatrac) {
        html += `
            <label class="extra-item">
                <input type="checkbox" 
                       ${state.extras.matracMosas ? 'checked' : ''}
                       onchange="toggleExtra('matracMosas')">
                <div class="extra-content">
                    <span class="extra-icon">🧼</span>
                    <div class="extra-info">
                        <span class="extra-name">Fertőtlenítő mosás</span>
                        <span class="extra-desc">Nátrium-hipokloritos mélytisztítás (vér, vizelet, stb.)</span>
                    </div>
                    <span class="extra-price">+5.000 Ft/oldal</span>
                </div>
            </label>
        `;
    }

    html += '</div>';
    container.innerHTML = html;
}

function toggleExtra(extraKey) {
    state.extras[extraKey] = !state.extras[extraKey];
    updateUI();
}

function renderLocationStep(container) {
    // Csoportosítás régió és zóna szerint
    const locationGroups = {
        'Győr - Belváros': [],
        'Győr - Városrészek': [],
        'Győr-Moson-Sopron megye': [],
        'Veszprém megye': [],
        'Komárom-Esztergom megye': [],
        'Vas megye': [],
        'Fejér megye': [],
        'Egyéb': []
    };

    Object.entries(LOCATIONS).forEach(([key, loc]) => {
        const kiszallasInfo = KISZALLASI_DIJAK[loc.kiszallas];
        const priceText = loc.customPrice ? 'Egyedi ár' : formatPrice(kiszallasInfo?.price || 0);
        const entry = { key, ...loc, priceText };

        if (loc.name.includes('Győr - Belváros') || loc.name.includes('Nádorváros') || 
            loc.name.includes('Sziget') || loc.name.includes('Adyváros')) {
            locationGroups['Győr - Belváros'].push(entry);
        } else if (loc.name.startsWith('Győr -')) {
            locationGroups['Győr - Városrészek'].push(entry);
        } else if (loc.region === 'Győr-Moson-Sopron') {
            locationGroups['Győr-Moson-Sopron megye'].push(entry);
        } else if (loc.region === 'Veszprém') {
            locationGroups['Veszprém megye'].push(entry);
        } else if (loc.region === 'Komárom-Esztergom') {
            locationGroups['Komárom-Esztergom megye'].push(entry);
        } else if (loc.region === 'Vas') {
            locationGroups['Vas megye'].push(entry);
        } else if (loc.region === 'Fejér') {
            locationGroups['Fejér megye'].push(entry);
        } else {
            locationGroups['Egyéb'].push(entry);
        }
    });

    container.innerHTML = `
        <select class="config-select" onchange="selectLocation(this.value)">
            <option value="">Válasszon települést...</option>
            ${Object.entries(locationGroups)
                .filter(([group, locations]) => locations.length > 0)
                .map(([group, locations]) => `
                <optgroup label="📍 ${group}">
                    ${locations.map(loc => `
                        <option value="${loc.key}" ${state.location === loc.key ? 'selected' : ''}>
                            ${loc.name} (${loc.priceText} kiszállás)
                        </option>
                    `).join('')}
                </optgroup>
            `).join('')}
        </select>
        
        <div class="location-zones-info">
            <p class="zones-title">💡 Kiszállási díjaink:</p>
            <div class="zones-grid">
                <span class="zone-item zona-a">0-15 km: ${formatPrice(2500)}</span>
                <span class="zone-item zona-b">15-30 km: ${formatPrice(3000)}</span>
                <span class="zone-item zona-c">30-50 km: ${formatPrice(3500)}</span>
                <span class="zone-item zona-d">50-70 km: ${formatPrice(4500)}</span>
                <span class="zone-item zona-e">70+ km: ${formatPrice(5500)}</span>
            </div>
        </div>
    `;
}

function selectLocation(locationKey) {
    state.location = locationKey;
    
    // Trigger calendar update
    if (locationKey && typeof BookingCalendar !== 'undefined') {
        const locationData = LOCATIONS[locationKey];
        if (locationData) {
            const calendarWrapper = document.getElementById('calendarWrapper');
            if (calendarWrapper) {
                calendarWrapper.style.display = 'block';
            }
            BookingCalendar.setCity(locationData.name);
        }
    }
    
    updateUI();
}

function renderSummary() {
    const calc = calculateTotal();
    const summaryContainer = document.getElementById('configSummary');
    
    if (!summaryContainer) return;

    let breakdownHtml = calc.breakdown.map(item => `
        <div class="summary-item ${item.isExtra ? 'extra' : ''} ${item.isDelivery ? 'delivery' : ''}">
            <span class="summary-item-name">
                ${item.qty > 1 ? `${item.qty}× ` : ''}${item.name}
            </span>
            <span class="summary-item-price">${formatPrice(item.total)}</span>
        </div>
    `).join('');

    summaryContainer.innerHTML = `
        <div class="summary-header">
            <span class="summary-title">Összesítés</span>
            <span class="summary-duration">⏱️ ${formatDuration(calc.totalDuration)}</span>
        </div>
        <div class="summary-breakdown">
            ${breakdownHtml || '<p class="summary-empty">Még nincs kiválasztva termék</p>'}
        </div>
        <div class="summary-total">
            <span>Összesen:</span>
            <span class="summary-total-price">${formatPrice(calc.total)}</span>
        </div>
        ${state.selectedDate ? `
            <div class="summary-date">
                📅 Kiválasztott időpont: <strong>${new Date(state.selectedDate).toLocaleDateString('hu-HU', { 
                    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' 
                })}</strong>
            </div>
        ` : ''}
    `;
}

function updateUI() {
    // Render each step
    const step1 = document.getElementById('step1Content');
    const step2 = document.getElementById('step2Content');
    const step3 = document.getElementById('step3Content');
    const step4 = document.getElementById('step4Content');
    const step5 = document.getElementById('step5Content');

    if (step1) renderCustomerTypeStep(step1);
    if (step2) renderServiceSelectionStep(step2);
    if (step3) renderProductsStep(step3);
    if (step4) renderExtrasStep(step4);
    if (step5) renderLocationStep(step5);

    renderSummary();
}

// ═══════════════════════════════════════════════════════════
// FORM SUBMISSION
// ═══════════════════════════════════════════════════════════

async function submitBooking() {
    // Validation
    const name = document.getElementById('contactName')?.value.trim();
    const email = document.getElementById('contactEmail')?.value.trim();
    const phone = document.getElementById('contactPhone')?.value.trim();

    if (!name || !email) {
        alert('Kérjük adja meg a nevét és email címét!');
        return;
    }

    if (!state.location) {
        alert('Kérjük válasszon települést!');
        return;
    }

    const hasProducts = Object.values(state.quantities).some(q => q > 0);
    if (!hasProducts) {
        alert('Kérjük válasszon legalább egy terméket!');
        return;
    }

    // Build payload
    const calc = calculateTotal();
    const locationData = LOCATIONS[state.location];

    const payload = {
        source: 'eco-clean-gyor',
        country: 'HU',
        language: 'hu',
        
        customer: {
            name: name,
            email: email,
            phone: phone || null,
            type: state.customerType,
            message: document.getElementById('contactMessage')?.value.trim() || null
        },
        
        location: {
            city: locationData?.name || state.location,
            zone: 'A',
            country: 'HU',
            kiszallasZone: locationData?.kiszallas
        },
        
        services: state.selectedServices,
        items: state.quantities,
        extras: state.extras,
        
        booking: {
            preferredDate: state.selectedDate,
            selectedSlot: state.selectedDate && typeof BookingCalendar !== 'undefined' 
                ? BookingCalendar.getSelectedDateDetails()?.status?.availableSlots?.[0] 
                : null
        },
        
        totals: {
            subtotal: calc.subtotal,
            kiszallasiDij: calc.kiszallasiDij,
            total: calc.total,
            currency: 'HUF',
            estimatedDuration: calc.totalDuration
        },
        
        breakdown: calc.breakdown,
        
        meta: {
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent
        }
    };

    console.log('🐴 ECO Clean Győr - Booking Payload:', payload);

    // Show loading
    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="loading-spinner"></span> Küldés...';
    }

    try {
        const response = await fetch(N8N_CONFIG.webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        
        if (data.available) {
            showSuccess(data, payload);
        } else {
            showError(data);
        }
    } catch (error) {
        console.error('Booking error:', error);
        showError({ message: 'Hiba történt a küldés során. Kérjük próbálja újra!' });
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Időpont foglalása';
        }
    }
}

function showSuccess(data, payload) {
    const summaryContainer = document.getElementById('configSummary');
    if (summaryContainer) {
        summaryContainer.innerHTML = `
            <div class="booking-success">
                <div class="success-icon">✅</div>
                <h3>Sikeres foglalás!</h3>
                <p>Köszönjük, ${payload.customer.name}!</p>
                ${data.slot ? `
                    <div class="success-slot">
                        <p><strong>📅 Időpont:</strong> ${data.slot.date}</p>
                        <p><strong>⏰ Kezdés:</strong> ${data.slot.startTime}</p>
                    </div>
                ` : ''}
                <p>Hamarosan felvesszük Önnel a kapcsolatot!</p>
            </div>
        `;
    }
}

function showError(data) {
    const summaryContainer = document.getElementById('configSummary');
    if (summaryContainer) {
        summaryContainer.innerHTML = `
            <div class="booking-error">
                <div class="error-icon">❌</div>
                <h3>Hiba történt</h3>
                <p>${data.message || 'Kérjük próbálja újra később!'}</p>
                ${data.suggestion ? `<p class="error-suggestion">${data.suggestion.message}</p>` : ''}
                <button class="retry-btn" onclick="location.reload()">Újrapróbálás</button>
                <a href="tel:+36209123456" class="phone-btn">📞 Telefonos foglalás</a>
            </div>
        `;
    }
}

// ═══════════════════════════════════════════════════════════
// CALENDAR EVENT LISTENER
// ═══════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
    const calendarContainer = document.getElementById('bookingCalendar');
    if (calendarContainer) {
        calendarContainer.addEventListener('dateSelected', (event) => {
            state.selectedDate = event.detail.date;
            console.log('📅 Dátum kiválasztva:', state.selectedDate);
            updateUI();
        });
    }

    // Initialize UI
    updateUI();
    
    console.log('🐴 ECO Clean Győr Konfigurátor v1.0.0 - CENTAUR TRIAD Edition');
});
