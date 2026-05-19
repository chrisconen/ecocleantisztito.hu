// ═══════════════════════════════════════════════════════════
// ECO CLEAN - KONFIGURATOR MIT N8N BOOKING INTEGRATION
// Version: 2.0.0 - CENTAUR TRIAD Edition
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
// INTERSECTION OBSERVER FOR SCROLL ANIMATIONS
// ═══════════════════════════════════════════════════════════
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('in-view');

            // Handle staggered animations for child elements
            const staggerChildren = entry.target.querySelectorAll('.stagger-child');
            staggerChildren.forEach((child, index) => {
                setTimeout(() => {
                    child.classList.add('in-view');
                }, index * 100);
            });
        }
    });
}, observerOptions);

// Observe all scroll-reveal elements
document.querySelectorAll('.scroll-reveal, .svg-animated, .process-line, .map-container').forEach(el => {
    observer.observe(el);
});

// ═══════════════════════════════════════════════════════════
// N8N BOOKING WEBHOOK CONFIGURATION
// ═══════════════════════════════════════════════════════════
const N8N_CONFIG = {
    webhookUrl: 'https://hub.centaur-lang.dev/webhook/booking-request',
    // Fallback email if n8n is unavailable
    fallbackEmail: 'chris.conen@gmail.com',
    // Country code for this instance (AT = Austria/Burgenland, HU = Hungary/Győr)
    country: 'AT',
    // Default zone for this website
    defaultZone: 'B'
};

// ═══════════════════════════════════════════════════════════
// CONFIGURATOR LOGIC
// ═══════════════════════════════════════════════════════════
const STEPS = [
    { id: 1, label: "Sind Sie Privat- oder Geschäftskunde?", chips: ["Privatkunde", "Geschäftskunde"] },
    { id: 2, label: "Was möchten Sie reinigen lassen?", chips: ["Polstermöbel", "Matratzen", "Beides"] },
    {
        id: 3, label: "Welche Möbelstücke? (Anzahl)", numbers: [
            { name: "L-Couch", price: 99, duration: 60, category: "polster" },
            { name: "U-Couch", price: 129, duration: 90, category: "polster" },
            { name: "Sofa", price: 79, duration: 45, category: "polster" },
            { name: "Sessel", price: 25, duration: 15, category: "polster" },
            { name: "Stuhl", price: 15, duration: 10, category: "polster" },
            { name: "Kindermatratze (Trocken)", price: 25, duration: 20, category: "matratze" },
            { name: "Kindermatratze (Nass)", price: 35, duration: 40, category: "matratze" },
            { name: "Matratze Einzel (Trocken)", price: 30, duration: 30, category: "matratze" },
            { name: "Matratze Einzel (Nass)", price: 60, duration: 45, category: "matratze" },
            { name: "Matratze Doppel (Trocken)", price: 50, duration: 45, category: "matratze" },
            { name: "Matratze Doppel (Nass)", price: 100, duration: 60, category: "matratze" }
        ]
    },
    { id: 4, label: "Besondere Umstände?", chips: ["Haustiere", "Kleinkinder", "Allergiker"], multi: true },
    { id: 5, label: "Wo befinden Sie sich?", select: true }
];

const DYNAMIC_CONTENT = {
    customerType: {
        "Privatkunde": { discount: 0, title: "Privatkunden-Service", desc: "Persönliche Betreuung für Ihr Zuhause", icon: "🏠" },
        "Geschäftskunde": { discount: 10, title: "Geschäftskunden-Vorteil", desc: "10% Rabatt auf alle Leistungen", icon: "🏢", badge: "-10%" }
    },
    serviceType: {
        "Polstermöbel": { title: "Polsterreinigung", desc: "Tiefenreinigung mit HEPA-Filterung", icon: "🛋️", features: ["HEPA-Filter", "Bio-Mittel"] },
        "Matratzen": { title: "Matratzenreinigung", desc: "UV-C Desinfektion und Tiefenreinigung", icon: "🛏️", features: ["UV-C", "Anti-Allergen"] },
        "Beides": { title: "Komplett-Reinigung", desc: "Das beste Ergebnis für Ihr Zuhause", icon: "✨", badge: "EMPFOHLEN", features: ["Alles inklusive"] }
    },
    conditions: {
        "Haustiere": { title: "Tierhaare & Gerüche", desc: "Spezialbehandlung für Tierhaare", icon: "🐾", badge: "+10%", surcharge: 10 },
        "Kleinkinder": { title: "Kindersicher", desc: "100% biologische Reinigung", icon: "👶", badge: "BIO", surcharge: 0 },
        "Allergiker": { title: "Anti-Allergen", desc: "99,9% Allergenentfernung", icon: "🌿", badge: "+10%", surcharge: 10 }
    },
    // ═══════════════════════════════════════════════════════════
    // MAGYARORSZÁG – BALATON RÉGIÓ + NYUGAT-DUNÁNTÚL
    // ═══════════════════════════════════════════════════════════
    locations: {
        // ── GYŐR-MOSON-SOPRON MEGYE ─────────────────────────────
        "gyor": { name: "Győr", info: "Győr-Moson-Sopron megye", zone: "GY", country: "HU", travelTime: 30 },
        "mosonmagyarovar": { name: "Mosonmagyaróvár", info: "Győr-Moson-Sopron megye", zone: "GY", country: "HU", travelTime: 50 },
        "csorna": { name: "Csorna", info: "Győr-Moson-Sopron megye", zone: "GY", country: "HU", travelTime: 45 },
        "kapuvar": { name: "Kapuvár", info: "Győr-Moson-Sopron megye", zone: "GY", country: "HU", travelTime: 55 },
        "sopron": { name: "Sopron", info: "Győr-Moson-Sopron megye", zone: "SO", country: "HU", travelTime: 70 },
        "fertod": { name: "Fertőd", info: "Győr-Moson-Sopron megye", zone: "SO", country: "HU", travelTime: 65 },
        // ── VAS MEGYE ───────────────────────────────────────────
        "szombathely": { name: "Szombathely", info: "Vas megye", zone: "VA", country: "HU", travelTime: 90 },
        "koszeg": { name: "Kőszeg", info: "Vas megye", zone: "VA", country: "HU", travelTime: 100 },
        "sarvar": { name: "Sárvár", info: "Vas megye", zone: "VA", country: "HU", travelTime: 80 },
        // ── VESZPRÉM MEGYE ──────────────────────────────────────
        "veszprem": { name: "Veszprém", info: "Veszprém megye", zone: "VE", country: "HU", travelTime: 110 },
        "papa": { name: "Pápa", info: "Veszprém megye", zone: "VE", country: "HU", travelTime: 90 },
        "ajka": { name: "Ajka", info: "Veszprém megye", zone: "VE", country: "HU", travelTime: 120 },
        // ── KOMÁROM-ESZTERGOM MEGYE ─────────────────────────────
        "tata": { name: "Tata", info: "Komárom-Esztergom megye", zone: "KE", country: "HU", travelTime: 100 },
        "tatabanya": { name: "Tatabánya", info: "Komárom-Esztergom megye", zone: "KE", country: "HU", travelTime: 95 },
        "komarom": { name: "Komárom", info: "Komárom-Esztergom megye", zone: "KE", country: "HU", travelTime: 110 },
        // ── BALATON ÉSZAKI PART ─────────────────────────────────
        "balatonfured": { name: "Balatonfüred", info: "Balaton északi part", zone: "BA", country: "HU", travelTime: 130 },
        "tihany": { name: "Tihany", info: "Balaton északi part", zone: "BA", country: "HU", travelTime: 135 },
        "balatonalmadi": { name: "Balatonalmádi", info: "Balaton északi part", zone: "BA", country: "HU", travelTime: 120 },
        "balatonfuzfo": { name: "Balatonfűzfő", info: "Balaton északi part", zone: "BA", country: "HU", travelTime: 115 },
        "balatonkenese": { name: "Balatonkenese", info: "Balaton északi part", zone: "BA", country: "HU", travelTime: 115 },
        "revfulop": { name: "Révfülöp", info: "Balaton északi part", zone: "BA", country: "HU", travelTime: 150 },
        "badacsony": { name: "Badacsony", info: "Balaton északi part", zone: "BA", country: "HU", travelTime: 160 },
        // ── BALATON DÉLI PART ───────────────────────────────────
        "siofok": { name: "Siófok", info: "Balaton déli part", zone: "BA", country: "HU", travelTime: 120 },
        "zamardi": { name: "Zamárdi", info: "Balaton déli part", zone: "BA", country: "HU", travelTime: 125 },
        "balatonszemes": { name: "Balatonszemes", info: "Balaton déli part", zone: "BA", country: "HU", travelTime: 135 },
        "balatonfoldvar": { name: "Balatonföldvár", info: "Balaton déli part", zone: "BA", country: "HU", travelTime: 130 },
        "balatonlelle": { name: "Balatonlelle", info: "Balaton déli part", zone: "BA", country: "HU", travelTime: 140 },
        "balatonboglar": { name: "Balatonboglár", info: "Balaton déli part", zone: "BA", country: "HU", travelTime: 145 },
        "fonyod": { name: "Fonyód", info: "Balaton déli part", zone: "BA", country: "HU", travelTime: 150 },
        // ── ZALA MEGYE ──────────────────────────────────────────
        "keszthely": { name: "Keszthely", info: "Zala megye / Balaton", zone: "ZA", country: "HU", travelTime: 165 },
        "heviz": { name: "Hévíz", info: "Zala megye", zone: "ZA", country: "HU", travelTime: 170 },
        "tapolca": { name: "Tapolca", info: "Veszprém megye", zone: "ZA", country: "HU", travelTime: 160 },
        // ── EGYÉB ───────────────────────────────────────────────
        "egyeb": { name: "Egyéb helyszín", info: "Email egyeztetés szükséges", zone: "HU", country: "HU", travelTime: 90 }
    }
};

const state = {
    customerType: null,
    serviceType: null,
    quantities: {},
    conditions: [],
    location: null,
    selectedDate: null,
    selectedSlot: null  // 🆕 ÚJ v3.1
};
let started = false;

// ═══════════════════════════════════════════════════════════
// CALENDAR DATE SELECTION HANDLER
// ═══════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
    const calendarContainer = document.getElementById('bookingCalendar');
    if (calendarContainer) {
        calendarContainer.addEventListener('dateSelected', (event) => {
            // 🆕 TELJES SLOT ADATOK MENTÉSE (v3.1)
            state.selectedDate = event.detail.date;
            state.selectedSlot = event.detail.slot;  // 🆕 ÚJ!

            console.log('📅 Slot selected:', {
                date: state.selectedDate,
                slot: state.selectedSlot,
                startTime: state.selectedSlot?.startTime,
                isFirstSlot: event.detail.isFirstSlot,
                flexibilityAccepted: event.detail.flexibilityAccepted
            });

            // 🆕 NE HÍVD AZ updateSummary()-t! Az újrarendereli a naptárat!
            // updateSummary();  // ← TÖRÖLVE!

            // Update timing display ONLY
            const timingText = document.getElementById('timingText');
            if (timingText && event.detail.date && event.detail.slot) {
                const formattedDate = new Date(event.detail.date).toLocaleDateString('de-AT', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short'
                });

                // 🆕 HASZNÁLD A SLOT STARTTIME-OT!
                const slotTime = event.detail.slot.startTime;
                const timeInfo = event.detail.isFirstSlot
                    ? ` um ${slotTime}`
                    : ` ~${slotTime} (±30 Min)`;

                timingText.innerHTML = `📅 ${formattedDate}${timeInfo}`;
                document.getElementById('summaryTiming').style.display = 'flex';
            }
        });
    }

    // ═══════════════════════════════════════════════════════════
    // 🆕 AUTO-START CONFIGURATOR FROM URL PARAMETER
    // ═══════════════════════════════════════════════════════════
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('start') === 'true') {
        // Small delay to ensure page is fully loaded
        setTimeout(() => {
            startAnimation();
            // Remove parameter from URL without reload
            window.history.replaceState({}, document.title, window.location.pathname);
        }, 500);
    }
});

function typeWriter(el, text, speed = 35) {
    return new Promise(resolve => {
        el.innerHTML = '';
        let i = 0;
        function type() {
            if (i < text.length) {
                const char = document.createElement('span');
                char.className = 'typewriter-char';
                char.textContent = text[i];
                el.appendChild(char);
                setTimeout(() => char.classList.add('visible'), 10);
                i++;
                setTimeout(type, speed);
            } else { resolve(); }
        }
        type();
    });
}

const delay = ms => new Promise(r => setTimeout(r, ms));

function buildChips(containerId, items, stepId, multi = false) {
    const container = document.getElementById(containerId);
    items.forEach(text => {
        const chip = document.createElement('button');
        chip.className = 'config-chip';
        chip.textContent = text;
        chip.onclick = () => handleChipClick(chip, container, text, stepId, multi);
        container.appendChild(chip);
    });
}

function handleChipClick(chip, container, value, stepId, multi) {
    if (multi) {
        chip.classList.toggle('selected');
        if (chip.classList.contains('selected')) {
            if (!state.conditions.includes(value)) state.conditions.push(value);
        } else {
            state.conditions = state.conditions.filter(c => c !== value);
        }
    } else {
        container.querySelectorAll('.config-chip').forEach(c => c.classList.remove('selected'));
        chip.classList.add('selected');
        if (stepId === 1) state.customerType = value;
        if (stepId === 2) { state.serviceType = value; updateVisibleProducts(); }
    }
    updateSummary();
    updateHeroBadges();
}

function buildNumbers(containerId, items) {
    const container = document.getElementById(containerId);
    items.forEach(item => {
        state.quantities[item.name] = 0;
        const div = document.createElement('div');
        // Slug generation for class based targeting
        const slug = item.name.toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[()]/g, '') // Remove parenthesis
            .replace(/couch/g, 'couch')
            .replace(/ü/g, 'ue')
            .replace(/ö/g, 'oe')
            .replace(/ä/g, 'ae');

        div.className = `config-num-item config-item-${slug}`;
        div.dataset.category = item.category;
        div.innerHTML = `
                    <span class="config-num-label">${item.name}</span>
                    <div class="config-num-controls">
                        <button class="config-num-btn" onclick="changeQty('${item.name}', -1)">−</button>
                        <span class="config-num-value" id="qty-${item.name.replace(/\s/g, '-')}">0</span>
                        <button class="config-num-btn" onclick="changeQty('${item.name}', 1)">+</button>
                    </div>
                `;
        container.appendChild(div);
    });
}

function updateVisibleProducts() {
    const step3 = document.getElementById('step3');
    const items = document.querySelectorAll('#numbers3 .config-num-item');

    // Hide Step 3 entirely if no service type selected
    if (!state.serviceType) {
        if (step3) step3.style.display = 'none';
        items.forEach(item => item.style.display = 'none');
        return;
    }

    // Show Step 3
    if (step3) {
        step3.style.display = 'block';
        // Ensure visibility class is there if called after animation
        if (!step3.classList.contains('visible') && started) {
            step3.classList.add('visible');
            document.getElementById('num3').classList.add('visible');
        }
    }

    items.forEach(item => {
        const cat = item.dataset.category;
        let shouldShow = false;

        if (state.serviceType === 'Polstermöbel') shouldShow = (cat === 'polster');
        else if (state.serviceType === 'Matratzen') shouldShow = (cat === 'matratze');
        else shouldShow = true; // Beides or fallback

        item.style.display = shouldShow ? 'flex' : 'none';
        if (shouldShow && started) item.classList.add('visible');
    });
}

function changeQty(name, delta) {
    state.quantities[name] = Math.max(0, (state.quantities[name] || 0) + delta);
    document.getElementById(`qty-${name.replace(/\s/g, '-')}`).textContent = state.quantities[name];
    updateSummary();
    updateHeroBadges();

    // 🆕 FRISSÍTSD A NAPTÁR DURATION-T! (v3.1)
    if (typeof BookingCalendar !== 'undefined' && BookingCalendar.setRequiredDuration) {
        const products = STEPS[2].numbers;
        let totalDuration = 0;
        Object.entries(state.quantities).forEach(([n, qty]) => {
            if (qty > 0) {
                const product = products.find(p => p.name === n);
                if (product) {
                    totalDuration += product.duration * qty;
                }
            }
        });
        BookingCalendar.setRequiredDuration(totalDuration);
    }
}

function handleLocationChange(select) {
    state.location = select.value;
    updateSummary();
    updateHeroBadges();

    // Show Step 6 (Address fields) when location is selected
    const step6 = document.getElementById('step6');
    if (step6) {
        if (state.location) {
            step6.style.display = 'block';
            step6.classList.add('visible');  // ✅ FONTOS: opacity: 1
        } else {
            step6.style.display = 'none';
            step6.classList.remove('visible');
        }
    }

    // ═══════════════════════════════════════════════════════════
    // TRIGGER CALENDAR UPDATE
    // ═══════════════════════════════════════════════════════════
    if (state.location && typeof BookingCalendar !== 'undefined') {
        const locationData = DYNAMIC_CONTENT.locations[state.location];
        if (locationData) {
            // Show calendar container if hidden
            const calendarWrapper = document.getElementById('calendarWrapper');
            if (calendarWrapper) {
                calendarWrapper.style.display = 'block';
                calendarWrapper.classList.add('visible');
            }

            // Update calendar with selected city
            BookingCalendar.setCity(locationData.name.split('/')[0]);
        }
    }
}

function updateSummary() {
    let baseTotal = 0, totalDuration = 0;
    const items = [], products = STEPS[2].numbers;

    Object.entries(state.quantities).forEach(([name, qty]) => {
        if (qty > 0) {
            const product = products.find(p => p.name === name);
            if (product) {
                baseTotal += product.price * qty;
                totalDuration += product.duration * qty;
                items.push(`${qty}× ${name}`);
            }
        }
    });

    let finalTotal = baseTotal;

    // 1. ÜGYFÉLTÍPUS KEDVEZMÉNY
    if (state.customerType === 'Geschäftskunde') {
        finalTotal = baseTotal * 0.9;
        document.getElementById('summaryDiscount').style.display = 'flex';
    } else {
        document.getElementById('summaryDiscount').style.display = 'none';
    }

    // 2. ÁLLAPOT FELÁR (conditions)
    let conditionSurcharge = 0;
    state.conditions.forEach(cond => {
        const data = DYNAMIC_CONTENT.conditions[cond];
        if (data?.surcharge) conditionSurcharge = Math.max(conditionSurcharge, data.surcharge);
    });
    if (conditionSurcharge > 0) finalTotal *= (1 + conditionSurcharge / 100);

    // 3. ANFAHRTSKOSTEN (fix 20€)
    const anfahrtskosten = 20;
    const anfahrtEl = document.getElementById('summaryAnfahrt');
    if (anfahrtEl) {
        anfahrtEl.style.display = 'flex';
        document.getElementById('anfahrtAmount').textContent = `+${anfahrtskosten}`;
    }

    // 4. VÉGÖSSZEG
    finalTotal += anfahrtskosten;

    // Eredmény megjelenítése (kerekítve)
    document.getElementById('totalPrice').textContent = Math.round(finalTotal);

    // 5. Időtartam
    const hours = Math.floor(totalDuration / 60), mins = totalDuration % 60;
    document.getElementById('totalDuration').textContent = hours > 0
        ? `${hours}h ${mins > 0 ? mins + 'min' : ''}`
        : `${mins} Min.`;

    // 6. Kiválasztott tételek
    document.getElementById('summaryItems').innerHTML = items.length
        ? items.map(i => `<span class="config-summary-item">${i}</span>`).join('')
        : '<span class="config-summary-item">Noch keine Auswahl</span>';

    // 7. Helyszín
    if (state.location && DYNAMIC_CONTENT.locations[state.location]) {
        document.getElementById('summaryLocation').style.display = 'flex';
        document.getElementById('locationText').innerHTML = `Standort: <strong>${DYNAMIC_CONTENT.locations[state.location].name}</strong>`;
    } else {
        document.getElementById('summaryLocation').style.display = 'none';
    }

    // 🆕 UPDATE CALENDAR WITH REQUIRED DURATION
    if (typeof BookingCalendar !== 'undefined' && BookingCalendar.setRequiredDuration) {
        BookingCalendar.setRequiredDuration(totalDuration);
    }
}

// ═══════════════════════════════════════════════════════════
// UPDATE HERO BADGES (Desktop + Mobile)
// ═══════════════════════════════════════════════════════════
function updateHeroBadges() {
    const heroBadges = document.getElementById('heroBadges');
    const mobileBadgeList = document.getElementById('mobileBadgeList');
    const mobileBadgeCount = document.getElementById('mobileBadgeCount');
    const mobileBadgeBar = document.getElementById('mobileBadgeBar');

    const badges = [];

    // Build badges array in CHRONOLOGICAL order (booking flow)
    // 1. Customer Type
    if (state.customerType && DYNAMIC_CONTENT.customerType[state.customerType]) {
        badges.push(DYNAMIC_CONTENT.customerType[state.customerType]);
    }

    // 2. Service Type
    if (state.serviceType && DYNAMIC_CONTENT.serviceType[state.serviceType]) {
        badges.push(DYNAMIC_CONTENT.serviceType[state.serviceType]);
    }

    // 3. Conditions (in order they were selected)
    state.conditions.forEach(cond => {
        if (DYNAMIC_CONTENT.conditions[cond]) {
            badges.push(DYNAMIC_CONTENT.conditions[cond]);
        }
    });

    // 4. Location
    if (state.location && DYNAMIC_CONTENT.locations[state.location]) {
        const loc = DYNAMIC_CONTENT.locations[state.location];
        badges.push({
            icon: "📍",
            title: loc.name,
            desc: `${loc.info} - 20€ Anfahrtskosten`
        });
    }

    // Update badge count
    if (mobileBadgeCount) {
        mobileBadgeCount.textContent = badges.length;
    }

    // Show/hide mobile badge bar
    if (mobileBadgeBar) {
        if (badges.length > 0) {
            mobileBadgeBar.classList.remove('hidden');
        } else {
            mobileBadgeBar.classList.add('hidden');
        }
    }

    // Render to DESKTOP (hero-badges) - OPTIMIZED: Only add NEW badges
    if (heroBadges) {
        // Get current badge titles to compare
        const existingBadges = Array.from(heroBadges.querySelectorAll('.hero-badge-item'))
            .map(el => el.dataset.badgeTitle);

        // Show container if we have badges
        if (badges.length > 0) {
            heroBadges.classList.add('visible');

            // Only add badges that don't exist yet
            badges.forEach((data, index) => {
                const badgeTitle = data.title;

                // Check if this badge already exists
                if (!existingBadges.includes(badgeTitle)) {
                    const badgeEl = createBadgeElement(data);
                    badgeEl.dataset.badgeTitle = badgeTitle; // Store title for comparison
                    heroBadges.appendChild(badgeEl);

                    // Immediate animation for new badge
                    setTimeout(() => {
                        badgeEl.classList.add('visible');
                    }, 50);
                }
            });

            // Remove badges that are no longer in the list
            const currentBadgeTitles = badges.map(b => b.title);
            Array.from(heroBadges.querySelectorAll('.hero-badge-item')).forEach(el => {
                if (!currentBadgeTitles.includes(el.dataset.badgeTitle)) {
                    el.remove();
                }
            });
        } else {
            heroBadges.classList.remove('visible');
            heroBadges.innerHTML = ''; // Clear all if no badges
        }
    }

    // Render to MOBILE (mobile-badge-list)
    if (mobileBadgeList) {
        mobileBadgeList.innerHTML = '';

        badges.forEach((data) => {
            const badgeEl = createMobileBadgeElement(data);
            mobileBadgeList.appendChild(badgeEl);
        });
    }
}

// Create desktop badge element
function createBadgeElement(data) {
    const div = document.createElement('div');
    div.className = 'hero-badge-item';

    const tag = data.badge ? `<div class="hero-badge-tag">${data.badge}</div>` : '';

    div.innerHTML = `
        <div class="hero-badge-icon">${data.icon}</div>
        <div class="hero-badge-content">
            <div class="hero-badge-title">${data.title}</div>
            <div class="hero-badge-desc">${data.desc}</div>
        </div>
        ${tag}
    `;

    return div;
}

// Create mobile badge element
function createMobileBadgeElement(data) {
    const div = document.createElement('div');
    div.className = 'mobile-badge-item';

    const tag = data.badge ? `<div class="mobile-badge-item-tag">${data.badge}</div>` : '';

    div.innerHTML = `
        <div class="mobile-badge-item-icon">${data.icon}</div>
        <div class="mobile-badge-item-content">
            <div class="mobile-badge-item-title">${data.title}</div>
            <div class="mobile-badge-item-desc">${data.desc}</div>
        </div>
        ${tag}
    `;

    return div;
}

// Toggle mobile badge bar expand/collapse
function toggleMobileBadges() {
    const mobileBadgeBar = document.getElementById('mobileBadgeBar');
    if (mobileBadgeBar) {
        mobileBadgeBar.classList.toggle('expanded');
    }
}

// ═══════════════════════════════════════════════════════════
// SUBMIT FORM WITH N8N WEBHOOK INTEGRATION
// ═══════════════════════════════════════════════════════════
function submitForm() {
    // Get contact field values
    const name = document.getElementById('contactName').value.trim();
    const email = document.getElementById('contactEmail').value.trim();
    const phone = document.getElementById('contactPhone').value.trim();
    const message = document.getElementById('contactMessage').value.trim();

    // Validate required fields
    let hasError = false;

    document.querySelectorAll('.config-input, .config-textarea').forEach(el => {
        el.classList.remove('error');
    });

    if (!name) {
        document.getElementById('contactName').classList.add('error');
        hasError = true;
    }

    if (!email || !isValidEmail(email)) {
        document.getElementById('contactEmail').classList.add('error');
        hasError = true;
    }

    if (!phone) {
        document.getElementById('contactPhone').classList.add('error');
        hasError = true;
    }

    // Validate email confirmation
    const emailConfirm = document.getElementById('contactEmailConfirm');
    if (emailConfirm) {
        const confirmEmail = emailConfirm.value.trim();

        if (!confirmEmail) {
            emailConfirm.classList.add('error');
            hasError = true;
        } else if (email !== confirmEmail) {
            emailConfirm.classList.add('error');
            alert('Die E-Mail Adressen stimmen nicht überein!');
            return;
        }
    }

    // Validate address fields (Step 6)
    if (state.location) {
        const streetInput = document.getElementById('street');
        const plzInput = document.getElementById('plz');
        const cityInput = document.getElementById('city');

        if (!streetInput?.value.trim()) {
            streetInput?.classList.add('error');
            hasError = true;
        }
        if (!plzInput?.value.trim()) {
            plzInput?.classList.add('error');
            hasError = true;
        }
        if (!cityInput?.value.trim()) {
            cityInput?.classList.add('error');
            hasError = true;
        }
    }

    if (hasError) {
        return;
    }

    // 🆕 SLOT VALIDÁCIÓ (v3.1)
    if (typeof BookingCalendar !== 'undefined') {
        if (!BookingCalendar.isValid()) {
            const errorMsg = BookingCalendar.getValidationMessage();
            alert(errorMsg || 'Bitte wählen Sie einen Termin aus.');
            return;
        }
    }

    // Check if any products selected
    const hasProducts = Object.values(state.quantities).some(qty => qty > 0);
    if (!hasProducts) {
        alert('Bitte wählen Sie mindestens ein Produkt aus.');
        return;
    }

    // ═══════════════════════════════════════════════════════════
    // BUILD SERVICES ARRAY FOR N8N
    // ═══════════════════════════════════════════════════════════
    const products = STEPS[2].numbers;
    const services = [];
    let totalDuration = 0;

    Object.entries(state.quantities).forEach(([itemName, qty]) => {
        if (qty > 0) {
            const product = products.find(p => p.name === itemName);
            if (product) {
                services.push({
                    name: itemName,
                    quantity: qty,
                    pricePerUnit: product.price,
                    totalPrice: product.price * qty,
                    duration: product.duration * qty,
                    category: product.category
                });
                totalDuration += product.duration * qty;
            }
        }
    });

    // ═══════════════════════════════════════════════════════════
    // GET LOCATION DATA WITH ZONE INFO + EXACT ADDRESS
    // ═══════════════════════════════════════════════════════════
    const locationData = state.location ? DYNAMIC_CONTENT.locations[state.location] : null;
    const cityName = locationData ? locationData.name.split('/')[0] : 'Nicht ausgewählt';
    const zone = locationData ? locationData.zone : N8N_CONFIG.defaultZone;
    const country = locationData ? locationData.country : N8N_CONFIG.country;

    // Get exact address from Step 6
    const street = document.getElementById('street')?.value.trim() || '';
    const plz = document.getElementById('plz')?.value.trim() || '';
    const city = document.getElementById('city')?.value.trim() || '';

    // Combine into full address
    const fullAddress = street && plz && city
        ? `${street}, ${plz} ${city}, Österreich`
        : cityName;

    // ═══════════════════════════════════════════════════════════
    // CREATE BOOKING PAYLOAD FOR N8N WEBHOOK
    // ═══════════════════════════════════════════════════════════
    const estimatedPrice = document.getElementById('totalPrice').textContent;

    const bookingPayload = {
        // Source identification
        source: 'eco-clean-burgenland',
        country: country,
        language: 'de',

        // Customer info
        customer: {
            name: name,
            email: email,
            phone: phone || null,
            type: state.customerType || 'Privatkunde',
            message: message || null
        },

        // Location & Zone (CRITICAL for Geo-Clustering)
        location: {
            address: fullAddress,  // Full address for Google Calendar
            street: street,
            plz: plz,
            city: city,
            region: cityName,
            zone: zone,
            country: country,
            travelTime: locationData ? locationData.travelTime : 60
        },

        // Services requested
        services: services,

        // Booking details
        booking: {
            serviceType: state.serviceType || 'Nicht ausgewählt',
            conditions: state.conditions,
            preferredDate: state.selectedDate || null,

            // 🆕 JAVÍTOTT SLOT ADATOK (v3.1)
            selectedSlot: state.selectedSlot ? {
                startTime: state.selectedSlot.startTime,
                maxDuration: state.selectedSlot.maxDuration,
                isFirstSlot: state.selectedSlot.isFirstSlot || false,
                isBaseSlot: state.selectedSlot.isBaseSlot || false
            } : null,

            // 🆕 KÖZVETLEN HOZZÁFÉRÉS
            slotStartTime: state.selectedSlot?.startTime || null,
            isFirstSlot: state.selectedSlot?.isFirstSlot || false,
            flexibilityAccepted: typeof BookingCalendar !== 'undefined'
                ? BookingCalendar.state?.flexibilityAccepted || false
                : false
        },

        // Calculated totals
        totals: {
            estimatedPrice: parseFloat(estimatedPrice),
            currency: 'EUR',
            estimatedDuration: totalDuration,
            itemCount: services.reduce((sum, s) => sum + s.quantity, 0)
        },

        // Metadata
        meta: {
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            referrer: document.referrer || null
        }
    };

    // Console log for debugging
    console.log('🐴 CENTAUR BOOKING PAYLOAD:', JSON.stringify(bookingPayload, null, 2));

    // Show loading state
    const btn = document.getElementById('submitBtn');
    btn.disabled = true;
    btn.querySelector('.cta-text').style.display = 'none';
    btn.querySelector('.cta-loading').style.display = 'inline';

    // ═══════════════════════════════════════════════════════════
    // SEND TO N8N WEBHOOK
    // ═══════════════════════════════════════════════════════════
    fetch(N8N_CONFIG.webhookUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify(bookingPayload)
    })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('✅ N8N Response:', data);

            if (data.available === true) {
                // SUCCESS - Booking slot available
                showBookingSuccess(data, bookingPayload);
            } else if (data.error === 'ZONE_MISMATCH') {
                // Zone mismatch - day reserved for different zone
                showZoneMismatchError(data);
            } else if (data.error === 'DAY_FULL') {
                // Day is full
                showDayFullError(data);
            } else if (data.error) {
                // Other error
                showBookingError(data);
            } else {
                // Unknown response, treat as success for now
                showBookingSuccess(data, bookingPayload);
            }
        })
        .catch(error => {
            console.error('❌ N8N Error:', error);
            // Fallback to FormSubmit if n8n fails
            fallbackToFormSubmit(bookingPayload);
        })
        .finally(() => {
            // Reset button state
            btn.disabled = false;
            btn.querySelector('.cta-text').style.display = 'inline';
            btn.querySelector('.cta-loading').style.display = 'none';
        });
}

// ═══════════════════════════════════════════════════════════
// SUCCESS & ERROR HANDLERS
// ═══════════════════════════════════════════════════════════

function showBookingSuccess(data, payload) {
    const summary = document.getElementById('configSummary');

    // 🆕 HASZNÁLD A STATE-ET!
    const slotStartTime = state.selectedSlot?.startTime || '09:00';
    const duration = payload.totals?.estimatedDuration || 60;

    const [startH, startM] = slotStartTime.split(':').map(Number);
    const endMinutes = startH * 60 + startM + duration;
    const endH = Math.floor(endMinutes / 60);
    const endM = endMinutes % 60;
    const slotEndTime = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;

    const slotInfo = `
        <div class="booking-slot-info">
            <p><strong>📅 Termin:</strong> ${state.selectedDate}</p>
            <p><strong>🕐 Zeit:</strong> ${slotStartTime} - ${slotEndTime}</p>
        </div>
    `;

    summary.innerHTML = `
        <div class="config-success">
            <div class="config-success-icon">
                <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <h4 class="config-success-title">Anfrage erfolgreich gesendet!</h4>
            <p class="config-success-text">Vielen Dank, ${payload.customer.name}!</p>
            ${slotInfo}
            <p class="config-success-text">Wir melden uns innerhalb von 24 Stunden bei Ihnen.</p>
        </div>
    `;
}

function showZoneMismatchError(data) {
    const summary = document.getElementById('configSummary');
    summary.innerHTML = `
        <div class="config-error">
            <div class="config-error-icon">
                <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </div>
            <h4 class="config-error-title">Terminkonflikt</h4>
            <p class="config-error-text">${data.message || 'Der gewählte Tag ist bereits für eine andere Region reserviert.'}</p>
            <button class="config-retry-btn" onclick="location.reload()">
                Anderen Tag wählen
            </button>
        </div>
    `;
}

function showDayFullError(data) {
    const summary = document.getElementById('configSummary');
    summary.innerHTML = `
        <div class="config-error">
            <div class="config-error-icon">
                <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </div>
            <h4 class="config-error-title">Tag ausgebucht</h4>
            <p class="config-error-text">${data.message || 'Der gewählte Tag ist leider bereits voll ausgebucht.'}</p>
            ${data.suggestion ? `<p class="config-suggestion">${data.suggestion.message}</p>` : ''}
            <button class="config-retry-btn" onclick="location.reload()">
                Neuen Termin anfragen
            </button>
        </div>
    `;
}

function showBookingError(data) {
    const summary = document.getElementById('configSummary');
    summary.innerHTML = `
        <div class="config-error">
            <div class="config-error-icon">
                <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </div>
            <h4 class="config-error-title">Fehler aufgetreten</h4>
            <p class="config-error-text">${data.message || 'Bitte versuchen Sie es später erneut oder rufen Sie uns an.'}</p>
            <a href="tel:+4366499754216" class="config-phone-btn">
                📞 0664 9975 4216
            </a>
        </div>
    `;
}

// ═══════════════════════════════════════════════════════════
// FALLBACK TO FORMSUBMIT IF N8N FAILS
// ═══════════════════════════════════════════════════════════
function fallbackToFormSubmit(payload) {
    console.log('⚠️ Falling back to FormSubmit...');

    // Populate hidden form fields
    document.getElementById('form_name').value = payload.customer.name;
    document.getElementById('form_email').value = payload.customer.email;
    document.getElementById('form_phone').value = payload.customer.phone || 'Nicht angegeben';
    document.getElementById('form_message').value = payload.customer.message || 'Keine Nachricht';
    document.getElementById('form_customerType').value = payload.customer.type;
    document.getElementById('form_serviceType').value = payload.booking.serviceType;

    const itemsList = payload.services.map(s => `${s.quantity}× ${s.name}`).join(', ');
    document.getElementById('form_items').value = itemsList || 'Keine';
    document.getElementById('form_conditions').value = payload.booking.conditions.length > 0
        ? payload.booking.conditions.join(', ')
        : 'Keine';
    document.getElementById('form_location').value = payload.location.city;
    document.getElementById('form_price').value = `€${payload.totals.estimatedPrice}`;
    document.getElementById('form_duration').value = `${payload.totals.estimatedDuration} Min.`;

    // Submit via AJAX
    const formData = new FormData(document.getElementById('contactForm'));

    fetch(`https://formsubmit.co/ajax/${N8N_CONFIG.fallbackEmail}`, {
        method: 'POST',
        body: formData
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showSuccessMessage();
            } else {
                throw new Error('FormSubmit failed');
            }
        })
        .catch(error => {
            console.error('FormSubmit Error:', error);
            // Last resort: submit form normally
            document.getElementById('contactForm').submit();
        });
}

function showSuccessMessage() {
    const summary = document.getElementById('configSummary');
    summary.innerHTML = `
        <div class="config-success">
            <div class="config-success-icon">
                <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <h4 class="config-success-title">Anfrage erfolgreich gesendet!</h4>
            <p class="config-success-text">Vielen Dank! Wir melden uns innerhalb von 24 Stunden bei Ihnen.</p>
        </div>
    `;
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ═══════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════
function init() {
    buildChips('chips1', STEPS[0].chips, 1);
    buildChips('chips2', STEPS[1].chips, 2);
    buildNumbers('numbers3', STEPS[2].numbers);
    buildChips('chips4', STEPS[3].chips, 4, true);
    buildChips('chips6', STEPS[5].chips, 6);

    // Initialize visibility (Hide Step 3 initially)
    updateVisibleProducts();

    console.log('🐴 ECO Clean Konfigurator v2.0.0 - CENTAUR TRIAD Edition');
    console.log('🔗 n8n Webhook:', N8N_CONFIG.webhookUrl);
}

// Wait for DOM to be fully loaded before initializing
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    // DOM already loaded
    init();
}

// ═══════════════════════════════════════════════════════════
// ANIMATION LOGIC
// ═══════════════════════════════════════════════════════════

function startAnimation() {
    if (started) {
        // Already started, do nothing
        return;
    }
    started = true;

    // 1. Activate Button
    const btn = document.getElementById('startBtn');
    btn.classList.add('active');
    btn.innerHTML = 'Konfigurator aktiv <span style="color:var(--color-accent)">●</span>';

    // 2. Show Configurator & Hide Hero Image
    const config = document.getElementById('configurator');
    const panel = document.getElementById('configPanel');
    const heroImage = document.getElementById('heroImage');

    // Fade out hero image
    if (heroImage) {
        heroImage.style.opacity = '0';
        setTimeout(() => {
            heroImage.style.display = 'none';
        }, 500);
    }

    config.classList.add('active');
    panel.classList.add('active');

    // 3. Show Header Immediately
    setTimeout(() => {
        document.getElementById('configHeader').classList.add('visible');
        document.getElementById('configIcon').classList.add('visible');

        const title = document.getElementById('configTitle');
        title.textContent = 'Preis-Konfigurator';

        document.getElementById('configBadge').classList.add('visible');
        document.getElementById('badgeText').textContent = 'LIVE';
    }, 300);

    // 4. Show All Steps Quickly
    let delayCounter = 500;
    STEPS.forEach((step, index) => {
        // Skip Step 3 - it appears only after category selection
        if (step.id === 3) return;

        setTimeout(() => {
            const stepEl = document.getElementById(`step${step.id}`);
            if (!stepEl) return;

            stepEl.classList.add('visible');

            // Show Label
            const label = document.getElementById(`label${step.id}`);
            if (label && step.label) {
                label.textContent = step.label;
                label.classList.add('visible');
            }

            // Show Number
            const num = document.getElementById(`num${step.id}`);
            if (num) num.classList.add('visible');

            // Show Items
            const internalElements = stepEl.querySelectorAll('.config-chip, .config-num-item, .config-select-wrap');
            internalElements.forEach((el, i) => {
                setTimeout(() => {
                    el.classList.add('visible');
                }, i * 50);
            });

        }, delayCounter);
        delayCounter += 200; // Much faster - 200ms between steps
    });

    // 5. Show Summary
    setTimeout(() => {
        document.getElementById('configSummary').classList.add('visible');
    }, delayCounter + 100);
}

// Kept for backward compatibility
async function animateStep(index) { return; }

function scrollToConfigurator() {
    startAnimation();
}

// ═══════════════════════════════════════════════════════════
// ENSURE START BUTTON WORKS
// ═══════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', function () {
    const startBtn = document.getElementById('startBtn');
    if (startBtn) {
        startBtn.addEventListener('click', function (e) {
            e.preventDefault();
            startAnimation();
        });
    }

    // ═══════════════════════════════════════════════════════════
    // EMAIL CONFIRMATION VALIDATION (Real-time)
    // ═══════════════════════════════════════════════════════════
    const emailInput = document.getElementById('contactEmail');
    const emailConfirm = document.getElementById('contactEmailConfirm');
    const emailConfirmError = document.getElementById('emailConfirmError');

    if (emailInput && emailConfirm && emailConfirmError) {
        // Validate on email confirmation input
        emailConfirm.addEventListener('input', function () {
            const email = emailInput.value.trim();
            const confirmEmail = emailConfirm.value.trim();

            // Only validate if confirmation field has content
            if (confirmEmail.length > 0) {
                if (email !== confirmEmail) {
                    // Mismatch - show error
                    emailConfirm.classList.remove('success');
                    emailConfirm.classList.add('error');
                    emailConfirmError.style.display = 'block';
                } else {
                    // Match - show success
                    emailConfirm.classList.remove('error');
                    emailConfirm.classList.add('success');
                    emailConfirmError.style.display = 'none';
                }
            } else {
                // Empty - reset
                emailConfirm.classList.remove('error', 'success');
                emailConfirmError.style.display = 'none';
            }
        });

        // Also validate when original email changes
        emailInput.addEventListener('input', function () {
            const email = emailInput.value.trim();
            const confirmEmail = emailConfirm.value.trim();

            // Only validate if confirmation field has content
            if (confirmEmail.length > 0) {
                if (email !== confirmEmail) {
                    emailConfirm.classList.remove('success');
                    emailConfirm.classList.add('error');
                    emailConfirmError.style.display = 'block';
                } else {
                    emailConfirm.classList.remove('error');
                    emailConfirm.classList.add('success');
                    emailConfirmError.style.display = 'none';
                }
            }
        });
    }
});