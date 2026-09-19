// ═══════════════════════════════════════════════════════════════════════════════
// 🐴 ECO CLEAN HUNGARY - FULL CONFIGURATION v3.0
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// PRICING - ALAPÁRAK
// ═══════════════════════════════════════════════════════════════════════════════

const PRICING = {
    // KÁRPITTISZTÍTÁS (mélytisztítás)
    karpit: {
        "szofa": { name: "Sofa / daybed", price: 18000, duration: 40, atkaPrice: 4000, agyazhatoPrice: 6000 },
        "l_kanape": { name: "L-shaped sofa", price: 20000, duration: 50, atkaPrice: 4000, agyazhatoPrice: 6000 },
        "u_kanape": { name: "U-shaped sofa", price: 26000, duration: 60, atkaPrice: 6000, agyazhatoPrice: 6000 },
        "fotel": { name: "Armchair", price: 7500, duration: 20, atkaPrice: 0 },
        "ebedlo_szek": { name: "Dining chair", price: 4000, duration: 10, atkaPrice: 0 },
        "irodai_szek": { name: "Office chair", price: 4500, duration: 15, atkaPrice: 0 }
    },

    // MATRACTISZTÍTÁS (atkairtás)
    matrac: {
        "egyagyas_a": { name: "Single mattress 90×200 cm (side A)", price: 9000, duration: 25, sides: 1, wetPrice: 6000, framePrice: 6000 },
        "egyagyas_ab": { name: "Single mattress 90×200 cm (sides A+B)", price: 14000, duration: 40, sides: 2, wetPrice: 6000, framePrice: 6000 },
        "francia_a": { name: "Double mattress 140/160/180×200 cm (side A)", price: 14000, duration: 35, sides: 1, wetPrice: 6000, framePrice: 9000 },
        "francia_ab": { name: "Double mattress 140/160/180×200 cm (sides A+B)", price: 19500, duration: 55, sides: 2, wetPrice: 6000, framePrice: 9000 },
        "gyerek_a": { name: "Children's mattress 70×140 cm (side A)", price: 6000, duration: 15, sides: 1, wetPrice: 3500, framePrice: 4500 },
        "gyerek_ab": { name: "Children's mattress 70×140 cm (sides A+B)", price: 8000, duration: 25, sides: 2, wetPrice: 3500, framePrice: 4500 },
        "kisagy_a": { name: "Cot mattress (side A)", price: 4500, duration: 10, sides: 1, wetPrice: 3500, framePrice: 4500 },
        "kisagy_ab": { name: "Cot mattress (sides A+B)", price: 7000, duration: 20, sides: 2, wetPrice: 3500, framePrice: 4500 }
    },

    // KISZÁLLÁSI DÍJAK (egységes minden városra)
    travelZones: {
        "belvaros": { fee: 3500, label: "Town centre" },
        "kulso": { fee: 4000, label: "Outskirts" },
        "20km": { fee: 4500, label: "Up to 10 km" },
        "40km": { fee: 5500, label: "Up to 20 km" }
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// UPSELLS - EXTRA SZOLGÁLTATÁSOK
// ═══════════════════════════════════════════════════════════════════════════════

const UPSELLS = {
    // Kárpit upsells
    karpit: {
        "atkairtas": {
            name: "Dust mite treatment",
            description: "Dry dust mite removal — recommended for allergy sufferers",
            priceType: "perItem", // ár tételenként különböző
            icon: "🦠"
        },
        "folteltavolitas": {
            name: "Extra stain removal",
            description: "Treatment of heavy soiling and stains",
            price: 2500,
            priceType: "perSeat", // ülőhelyenként
            duration: 10,
            icon: "✨"
        },
        "impregnalas": {
            name: "Fabric protection",
            description: "A protective layer for easier future cleaning",
            price: 3500,
            priceType: "perItem", // bútoronként
            duration: 15,
            icon: "🛡️"
        },
        "szagtalanitas": {
            name: "Odour removal",
            description: "Removal of pet and tobacco odours",
            price: 3000,
            priceType: "perItem",
            duration: 10,
            icon: "🌸"
        }
    },

    // Matrac upsells
    matrac: {
        "nedves_tisztitas": {
            name: "Wet stain removal and sanitising wash",
            description: "Washing of the selected mattress sides",
            priceKey: "wetPrice",
            priceType: "perSide", // felületenként
            duration: 20,
            icon: "💧",
            note: "Drying usually takes 6–12 hours; use only when fully dry."
        },
        "agykeret": {
            name: "Bed frame and headboard cleaning",
            description: "Upholstery cleaning for bed frame and headboard",
            priceKey: "framePrice",
            priceType: "perItem",
            duration: 15,
            icon: "🛏️"
        }
    }
};

const PILLOW_CLEANING = {
    name: 'Pillow cleaning',
    description: 'Cleaning for pillows too large for a washing machine',
    price: 1200,
    duration: 5, // Becsült többletidő párnánként.
    itemIds: ['szofa', 'l_kanape', 'u_kanape']
};

// ═══════════════════════════════════════════════════════════════════════════════
// DISCOUNTS - KEDVEZMÉNYEK
// ═══════════════════════════════════════════════════════════════════════════════

const DISCOUNTS = {
    combo: { percent: 10, label: "Combo discount (upholstery + mattress)" },
    quantity3: { percent: 5, label: "3+ items discount" }
};

// ═══════════════════════════════════════════════════════════════════════════════
// NAGYMEGRENDELÉS KONFIGURÁCIÓ
// ═══════════════════════════════════════════════════════════════════════════════
const LARGE_ORDER = {
    threshold: 480, // 8 óra = 480 perc - ennél több = nagymegrendelés
    webhookUrl: 'https://hub.centaur-lang.dev/webhook/large-order-request'
};

// ═══════════════════════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════════════════════

const State = {
    customerType: 'Magánszemély',
    serviceType: null,
    selectedItems: {},      // { itemId: { count: 1, upsells: ['atkairtas'] } }
    globalUpsells: {},      // { upsellId: true }
    conditions: [],
    city: null,
    travelZone: null,
    totalPrice: 0,
    totalDuration: 0,
    discount: 0,
    isLargeOrder: false     // Nagymegrendelés flag
};

// ═══════════════════════════════════════════════════════════════════════════════
// HANDLERS
// ═══════════════════════════════════════════════════════════════════════════════

function handleCustomerType(button) {
    document.querySelectorAll('#customerType .config-btn').forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    State.customerType = button.dataset.value;
    updateSummary();
}

function handleServiceType(button) {
    document.querySelectorAll('#serviceType .config-btn').forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    State.serviceType = button.dataset.value;

    // Reset selections
    State.selectedItems = {};
    State.globalUpsells = {};

    // Show/hide ANDANTE checkbox based on service type
    const andanteRow = document.getElementById('andanteRow');
    if (andanteRow) {
        andanteRow.style.display = (State.serviceType === 'Kárpit' || State.serviceType === 'Mindkettő') ? 'block' : 'none';
        const checkbox = document.getElementById('andanteCheckbox');
        if (checkbox) {
            checkbox.checked = false;
            checkbox.disabled = true;
        }
    }

    // Show step 3 and populate
    document.getElementById('step3').style.display = 'block';
    populateItems();

    // Show remaining steps
    document.getElementById('step4').style.display = State.serviceType === 'Matrac' ? 'none' : 'block';
    document.getElementById('step5').style.display = 'block';
    document.getElementById('step6').style.display = 'block';

    updateSummary();
}

function handleCityChange(select) {
    State.city = select.value;
    if (!State.city) {
        document.getElementById('travelZoneWrap').style.display = 'none';
        document.getElementById('addressInputs').style.display = 'none';
        document.getElementById('calendarWrapper').style.display = 'none';
        if (typeof BookingCalendar !== 'undefined') BookingCalendar.setCity(null);
    }

    if (State.city) {
        document.getElementById('travelZoneWrap').style.display = 'block';
        document.getElementById('addressInputs').style.display = 'block';
        // REMOVED: Auto-fill city name - users may live in surrounding villages
        // document.getElementById('cityInput').value = select.options[select.selectedIndex].text;

        // Show calendar if we have items selected
        if (Object.keys(State.selectedItems).length > 0) {
            document.getElementById('calendarWrapper').style.display = 'block';
        }

        // Notify calendar
        if (typeof BookingCalendar !== 'undefined') {
            BookingCalendar.setCity(State.city);
        }
    }

    updateSummary();
}

function handleZoneChange(radio) {
    State.travelZone = radio.value;
    // Notify calendar to potentially re-check blocked zones
    if (typeof BookingCalendar !== 'undefined' && State.city) {
        BookingCalendar.setCity(State.city);
    }
    updateSummary();
}

function toggleCondition(button) {
    const value = button.dataset.value;
    const index = State.conditions.indexOf(value);

    if (index > -1) {
        State.conditions.splice(index, 1);
        button.classList.remove('active');
    } else {
        State.conditions.push(value);
        button.classList.add('active');
    }

    // Show recommendation notes
    updateConditionNote();
    updateSummary();
}

function updateConditionNote() {
    const note = document.getElementById('conditionNote');
    let text = '';

    if (State.conditions.includes('Haziallat')) {
        text += '💡 With pets in the home we recommend odour removal. ';
    }
    if (State.conditions.includes('Allergias')) {
        text += '💡 For allergy sufferers we recommend dust mite treatment on every item. ';
    }

    if (text) {
        note.textContent = text;
        note.style.display = 'block';
    } else {
        note.style.display = 'none';
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ITEM POPULATION
// ═══════════════════════════════════════════════════════════════════════════════

function populateItems() {
    const container = document.getElementById('itemSelection');
    container.innerHTML = '';

    const showKarpit = State.serviceType === 'Kárpit' || State.serviceType === 'Mindkettő';
    const showMatrac = State.serviceType === 'Matrac' || State.serviceType === 'Mindkettő';

    if (showKarpit) {
        container.innerHTML += '<div class="item-group-title">🛋️ Upholstery cleaning</div>';
        Object.entries(activePricing().karpit).forEach(([id, item]) => {
            container.innerHTML += createItemHTML('karpit', id, item);
        });
    }

    if (showMatrac) {
        container.innerHTML += '<div class="item-group-title" style="margin-top: 1.5rem;">🛏️ Mattress cleaning</div>';
        Object.entries(activePricing().matrac).forEach(([id, item]) => {
            container.innerHTML += createItemHTML('matrac', id, item);
        });
    }

    populateUpsells();
}

function createItemHTML(category, id, item) {
    const fullId = `${category}_${id}`;
    const hasAtka = category === 'karpit' && item.atkaPrice > 0;
    const hasAgyazhato = category === 'karpit' && item.agyazhatoPrice > 0;
    const hasPillows = category === 'karpit' && PILLOW_CLEANING.itemIds.includes(id);
    const hasMatrac = category === 'matrac';
    const hasItemUpsell = hasAtka || hasAgyazhato || hasPillows || hasMatrac;

    return `
        <div class="config-item" data-item-id="${fullId}">
            ${category === 'karpit' ? `<img class="item-photo" src="../assets/${({szofa:'sofa',l_kanape:'living-room',u_kanape:'living-room',fotel:'armchair',ebedlo_szek:'dining',irodai_szek:'office'})[id]}-card.webp" alt="Generated interior image: ${item.name}" width="600" height="400" loading="lazy">` : ''}
            <div class="item-main">
                <div class="item-info">
                    <span class="item-name">${item.name}</span>
                    <span class="item-price">${item.price.toLocaleString('en-GB')} HUF</span>
                </div>
                <div class="item-counter">
                    <button type="button" class="counter-btn" aria-label="${item.name} mennyiségének csökkentése" onclick="decrementItem('${fullId}')">−</button>
                    <span class="counter-value" id="count-${fullId}">0</span>
                    <button type="button" class="counter-btn" aria-label="${item.name} mennyiségének növelése" onclick="incrementItem('${fullId}', '${category}')">+</button>
                </div>
            </div>
            ${hasItemUpsell ? `
            <div class="item-upsell" id="upsell-${fullId}" style="display:none;">
                ${hasAtka ? `
                <label class="upsell-checkbox">
                    <input type="checkbox" onchange="toggleItemUpsell('${fullId}', 'atkairtas', ${item.atkaPrice})">
                    <span class="upsell-label">
                        <span class="upsell-icon">🦠</span>
                        <span class="upsell-text">+Dust mite treatment</span>
                        <span class="upsell-price">+${item.atkaPrice.toLocaleString('en-GB')} HUF</span>
                    </span>
                </label>
                ` : ''}
                ${hasAgyazhato ? `
                <label class="upsell-checkbox">
                    <input type="checkbox" onchange="toggleItemUpsell('${fullId}', 'agyazhato', ${item.agyazhatoPrice})">
                    <span class="upsell-label">
                        <span class="upsell-icon">🛏️</span>
                        <span class="upsell-text">+Sofa bed surface cleaning (pull-out / fold-down)</span>
                        <span class="upsell-price">+${item.agyazhatoPrice.toLocaleString('en-GB')} HUF</span>
                    </span>
                </label>
                ` : ''}
                ${hasMatrac ? Object.entries(UPSELLS.matrac).map(([upsellId, upsell]) => `
                <label class="upsell-checkbox mattress-extra">
                    <input type="checkbox" onchange="toggleItemUpsell('${fullId}', '${upsellId}')">
                    <span class="upsell-label">
                        <span class="upsell-icon">${upsell.icon}</span>
                        <span class="upsell-text">${upsell.name}
                            <small>${upsell.priceType === 'perSide' ? `${item.sides} oldal / matrac · ${upsell.note}` : 'Per bed, headboard included'}</small>
                        </span>
                        <span class="upsell-price">+${item[upsell.priceKey].toLocaleString('en-GB')} HUF/${upsell.priceType === 'perSide' ? 'oldal' : 'ágy'}</span>
                    </span>
                </label>`).join('') : ''}
                ${hasPillows ? `
                <div class="pillow-extra">
                    <label class="upsell-text" for="pillows-${fullId}">${PILLOW_CLEANING.name}
                        <small>${PILLOW_CLEANING.description}</small>
                        <small>Total quantity for the items selected here · ${activePillowPrice().toLocaleString('en-GB')} HUF each</small>
                    </label>
                    <input class="pillow-count" id="pillows-${fullId}" type="number" min="0" step="1" value="0" inputmode="numeric"
                        onchange="setPillowCount('${fullId}', this.value)">
                </div>` : ''}
            </div>
            ` : ''}
        </div>
    `;
}

function populateUpsells() {
    const container = document.getElementById('upsellOptions');
    container.innerHTML = '';

    const showKarpit = State.serviceType === 'Kárpit' || State.serviceType === 'Mindkettő';
    if (showKarpit) {
        container.innerHTML += '<div class="upsell-group-title">🛋️ Upholstery extras</div>';
        Object.entries(UPSELLS.karpit).forEach(([id, upsell]) => {
            if (id !== 'atkairtas') { // Atkairtás item-level
                container.innerHTML += createGlobalUpsellHTML('karpit', id, upsell);
            }
        });
    }

}

function createGlobalUpsellHTML(category, id, upsell) {
    const fullId = `${category}_${id}`;
    const priceText = upsell.priceType === 'perSeat' ? `+${upsell.price.toLocaleString('en-GB')} HUF/seat` :
        upsell.priceType === 'perSide' ? `+${upsell.price.toLocaleString('en-GB')} HUF/surface` :
            upsell.priceType === 'perItem' ? `+${upsell.price.toLocaleString('en-GB')} HUF each` :
                `+${upsell.price.toLocaleString('en-GB')} HUF`;

    return `
        <label class="global-upsell">
            <input type="checkbox" onchange="toggleGlobalUpsell('${fullId}', '${category}', '${id}')">
            <span class="global-upsell-card">
                <span class="global-upsell-icon">${upsell.icon}</span>
                <span class="global-upsell-info">
                    <span class="global-upsell-name">${upsell.name}</span>
                    <span class="global-upsell-desc">${upsell.description}</span>
                    ${upsell.note ? `<span class="global-upsell-note">⚠️ ${upsell.note}</span>` : ''}
                </span>
                <span class="global-upsell-price">${priceText}</span>
            </span>
        </label>
    `;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ITEM MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

function incrementItem(fullId, category) {
    if (!State.selectedItems[fullId]) {
        State.selectedItems[fullId] = { count: 0, upsells: [], category: category };
    }
    State.selectedItems[fullId].count++;

    document.getElementById(`count-${fullId}`).textContent = State.selectedItems[fullId].count;

    // Show item-level upsell if available
    const upsellEl = document.getElementById(`upsell-${fullId}`);
    if (upsellEl) {
        upsellEl.style.display = 'block';
    }

    // Show calendar if city is selected
    if (State.city) {
        document.getElementById('calendarWrapper').style.display = 'block';
    }

    // Always show form when items are selected
    document.getElementById('bookingFormWrapper').style.display = 'block';

    updateBadges();
    updateSummary();
}

function decrementItem(fullId) {
    if (!State.selectedItems[fullId] || State.selectedItems[fullId].count === 0) return;

    State.selectedItems[fullId].count--;

    if (State.selectedItems[fullId].count === 0) {
        delete State.selectedItems[fullId];
        // Hide item-level upsell
        const upsellEl = document.getElementById(`upsell-${fullId}`);
        if (upsellEl) {
            upsellEl.style.display = 'none';
            resetItemExtras(upsellEl);
        }
    }

    document.getElementById(`count-${fullId}`).textContent = State.selectedItems[fullId]?.count || 0;

    updateBadges();
    updateSummary();
}

function resetItemExtras(element) {
    element.querySelectorAll('input').forEach(input => {
        if (input.type === 'checkbox') input.checked = false;
        else if (input.type === 'number') input.value = '0';
    });
}

function setPillowCount(fullId, value) {
    const item = State.selectedItems[fullId];
    if (!item || item.category !== 'karpit' || !PILLOW_CLEANING.itemIds.includes(fullId.slice(7))) return;
    const number = Number(value);
    item.pillowCount = Number.isSafeInteger(number) && number > 0 ? number : 0;
    document.getElementById(`pillows-${fullId}`).value = item.pillowCount;
    updateSummary();
}

function getItemCleaningExtras(fullId, item) {
    const extras = [];
    const pricing = activePricing().matrac[fullId.slice(7)];
    if (fullId.startsWith('matrac_') && pricing) {
        item.upsells.forEach(id => {
            const extra = UPSELLS.matrac[id];
            if (!extra) return;
            const quantity = item.count * (extra.priceType === 'perSide' ? pricing.sides : 1);
            extras.push({ name: extra.name, quantity, unit: extra.priceType === 'perSide' ? 'side' : 'bed',
                unitPrice: pricing[extra.priceKey], total: pricing[extra.priceKey] * quantity, duration: extra.duration * quantity });
        });
    }
    if (fullId.startsWith('karpit_') && PILLOW_CLEANING.itemIds.includes(fullId.slice(7)) && item.pillowCount > 0) {
        extras.push({ name: PILLOW_CLEANING.description, quantity: item.pillowCount, unit: 'pcs',
            unitPrice: activePillowPrice(), total: activePillowPrice() * item.pillowCount, duration: PILLOW_CLEANING.duration * item.pillowCount });
    }
    return extras;
}

// Include readable details in the existing message field for booking recipients.
function bookingMessageWithExtras(message) {
    const lines = Object.entries(State.selectedItems).flatMap(([fullId, item]) => {
        const pricing = activePricing()[item.category]?.[fullId.slice(fullId.indexOf('_') + 1)];
        return getItemCleaningExtras(fullId, item).map(extra =>
            `${pricing.name}: ${extra.name} – ${extra.quantity} ${extra.unit} × ${extra.unitPrice} Ft = ${extra.total} HUF`);
    });
    return [message, lines.length ? `Selected additional cleaning (before discount):\n${lines.join('\n')}` : ''].filter(Boolean).join('\n\n') || null;
}

function toggleItemUpsell(fullId, upsellId, price) {
    if (!State.selectedItems[fullId]) return;

    const upsells = State.selectedItems[fullId].upsells;
    const index = upsells.indexOf(upsellId);

    if (index > -1) {
        upsells.splice(index, 1);
    } else {
        upsells.push(upsellId);
    }

    updateSummary();
}

function toggleGlobalUpsell(fullId, category, upsellId) {
    if (State.globalUpsells[fullId]) {
        delete State.globalUpsells[fullId];
    } else {
        State.globalUpsells[fullId] = { category, upsellId };
    }

    updateSummary();
}

// ═══════════════════════════════════════════════════════════════════════════════
// BADGES
// ═══════════════════════════════════════════════════════════════════════════════

function updateBadges() {
    // DISABLED - Badges removed as items are already shown in summary
    // const container = document.getElementById('selectedBadges');
    // const list = document.getElementById('badgesList');

    // const items = Object.entries(State.selectedItems).filter(([_, item]) => item.count > 0);

    // if (items.length === 0) {
    //     container.style.display = 'none';
    //     return;
    // }

    // container.style.display = 'block';
    // list.innerHTML = items.map(([fullId, item]) => {
    //     const separatorIndex = fullId.indexOf('_');
    //     const category = fullId.substring(0, separatorIndex);
    //     const id = fullId.substring(separatorIndex + 1);
    //     const pricing = category === 'karpit' ? activePricing().karpit[id] : activePricing().matrac[id];
    //     return `
    //         <span class="badge">
    //             ${item.count}x ${pricing?.name || id}
    //             <button class="badge-remove" onclick="removeItem('${fullId}')">&times;</button>
    //         </span>
    //     `;
    // }).join('');
}

function removeItem(fullId) {
    delete State.selectedItems[fullId];
    document.getElementById(`count-${fullId}`).textContent = '0';

    const upsellEl = document.getElementById(`upsell-${fullId}`);
    if (upsellEl) {
        upsellEl.style.display = 'none';
        resetItemExtras(upsellEl);
    }

    updateBadges();
    updateSummary();
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUMMARY CALCULATION
// ═══════════════════════════════════════════════════════════════════════════════


const GYOR_CITY_TARIFF = {"karpit":{"szofa":{"price":7900},"l_kanape":{"price":17900},"u_kanape":{"price":18900},"fotel":{"price":3900},"ebedlo_szek":{"price":2400},"irodai_szek":{"price":2400}},"matrac":{"egyagyas_a":{"price":4900,"wetPrice":1900,"framePrice":3900},"egyagyas_ab":{"price":5900,"wetPrice":1900,"framePrice":3900},"francia_a":{"price":6900,"wetPrice":1900,"framePrice":3900},"francia_ab":{"price":7900,"wetPrice":1900,"framePrice":3900},"gyerek_a":{"price":2900,"wetPrice":900,"framePrice":3900},"gyerek_ab":{"price":3900,"wetPrice":900,"framePrice":3900},"kisagy_a":{"price":2400,"wetPrice":900,"framePrice":3900},"kisagy_ab":{"price":3400,"wetPrice":900,"framePrice":3900}},"pillowPrice":400};
function isGyorCity(city=State.city,zone=State.travelZone){return city==='gyor'&&(zone==='belvaros'||zone==='kulso');}
function activePricing(city=State.city,zone=State.travelZone){
 if(!isGyorCity(city,zone))return PRICING;
 const merge=group=>Object.fromEntries(Object.entries(PRICING[group]).map(([id,p])=>[id,{...p,...GYOR_CITY_TARIFF[group][id]}]));
 return {...PRICING,karpit:merge('karpit'),matrac:merge('matrac'),travelZones:{...PRICING.travelZones,belvaros:{...PRICING.travelZones.belvaros,fee:0},kulso:{...PRICING.travelZones.kulso,fee:0}}};
}
function activePillowPrice(){return isGyorCity()?GYOR_CITY_TARIFF.pillowPrice:PILLOW_CLEANING.price;}
function refreshLocalPriceLabels(){
 const pricing=activePricing();
 document.querySelectorAll('[data-item-id]').forEach(card=>{
  const fullId=card.dataset.itemId,sep=fullId.indexOf('_'),p=pricing[fullId.slice(0,sep)]?.[fullId.slice(sep+1)];if(!p)return;
  const label=card.querySelector('.item-price');if(label)label.textContent=p.price.toLocaleString('en-GB')+' Ft';
  card.querySelectorAll('.upsell-checkbox').forEach(row=>{const input=row.querySelector('input'),out=row.querySelector('.upsell-price');if(!input||!out)return;
   const id=(input.getAttribute('onchange')||'').match(/,\s*'([^']+)'/)?.[1],extra=UPSELLS.matrac[id];
   const value=id==='atkairtas'?p.atkaPrice:id==='agyazhato'?p.agyazhatoPrice:extra?p[extra.priceKey]:undefined;
   if(value!==undefined)out.textContent='+'+value.toLocaleString('en-GB')+' Ft'+(extra?(extra.priceType==='perSide'?'/side':'/bed'):'');
  });
  const pillow=card.querySelector('.pillow-extra .upsell-text small:last-child');if(pillow)pillow.textContent='Total cushions for these items · '+activePillowPrice().toLocaleString('en-GB')+' Ft/item';
 });
 document.querySelectorAll('[name="travelZone"]').forEach(r=>{const out=r.closest('label')?.querySelector('.zone-price');if(out)out.textContent=activePricing(State.city,r.value).travelZones[r.value].fee.toLocaleString('en-GB')+' Ft';});
 const notice=document.getElementById('gyorLocalTariffNotice');if(notice)notice.textContent=isGyorCity()?'Győr city prices active · free travel within city limits.':'For Győr city prices, select Győr and a city zone in the address section. Other towns and surrounding villages use the standard tariff.';
}

function updateSummary() {
    refreshLocalPriceLabels();
    let subtotal = 0;
    let totalDuration = 0;
    let discount = 0;
    const details = [];

    let hasKarpit = false;
    let hasMatrac = false;
    let totalItems = 0;
    let totalSeats = 0;
    let totalSides = 0;

    // Calculate items
    Object.entries(State.selectedItems).forEach(([fullId, item]) => {
        if (item.count === 0) return;

        const separatorIndex = fullId.indexOf('_');
        const category = fullId.substring(0, separatorIndex);
        const id = fullId.substring(separatorIndex + 1);
        const pricing = category === 'karpit' ? activePricing().karpit[id] : activePricing().matrac[id];

        if (!pricing) return;

        const itemTotal = pricing.price * item.count;
        const itemDuration = pricing.duration * item.count;

        subtotal += itemTotal;
        totalDuration += itemDuration;
        totalItems += item.count;

        if (category === 'karpit') {
            hasKarpit = true;
            // Estimate seats: szófa=3, l_kanape=4, u_kanape=6, fotel=1, szék=1
            const seatMap = { szofa: 3, l_kanape: 4, u_kanape: 6, fotel: 1, ebedlo_szek: 1, irodai_szek: 1 };
            totalSeats += (seatMap[id] || 1) * item.count;
        }
        if (category === 'matrac') {
            hasMatrac = true;
            totalSides += (pricing.sides || 1) * item.count;
        }

        details.push({
            text: `${item.count}x ${pricing.name}`,
            price: itemTotal
        });

        // Item-level upsells (atkairtás, ágyazható felület)
        item.upsells.forEach(upsellId => {
            if (upsellId === 'atkairtas' && pricing.atkaPrice) {
                const atkaTotal = pricing.atkaPrice * item.count;
                subtotal += atkaTotal;
                totalDuration += 15 * item.count;
                details.push({
                    text: `  +Dust mite treatment (${item.count}x)`,
                    price: atkaTotal,
                    isUpsell: true
                });
            }
            if (upsellId === 'agyazhato' && pricing.agyazhatoPrice) {
                const agyTotal = pricing.agyazhatoPrice * item.count;
                subtotal += agyTotal;
                totalDuration += 20 * item.count;
                details.push({
                    text: `  +Sofa bed surface cleaning (${item.count}x)`,
                    price: agyTotal,
                    isUpsell: true
                });
            }
        });
        getItemCleaningExtras(fullId, item).forEach(extra => {
            subtotal += extra.total;
            totalDuration += extra.duration;
            details.push({ text: `  +${extra.name} (${extra.quantity} ${extra.unit})`, price: extra.total, isUpsell: true });
        });
    });

    // Calculate global upsells
    Object.entries(State.globalUpsells).forEach(([fullId, info]) => {
        if (info.category === 'matrac') return; // Matrac extrák kizárólag a kiválasztott kártyához tartoznak.
        const upsell = UPSELLS[info.category][info.upsellId];
        if (!upsell) return;

        let upsellTotal = 0;
        let upsellDuration = upsell.duration || 0;

        if (upsell.priceType === 'perSeat') {
            upsellTotal = upsell.price * totalSeats;
            upsellDuration *= Math.ceil(totalSeats / 2);
        } else if (upsell.priceType === 'perSide') {
            upsellTotal = upsell.price * totalSides;
            upsellDuration *= totalSides;
        } else if (upsell.priceType === 'perItem') {
            const relevantItems = Object.entries(State.selectedItems)
                .filter(([fid, _]) => fid.startsWith(info.category))
                .reduce((sum, [_, i]) => sum + i.count, 0);
            upsellTotal = upsell.price * relevantItems;
            upsellDuration *= relevantItems;
        } else {
            upsellTotal = upsell.price;
        }

        if (upsellTotal > 0) {
            subtotal += upsellTotal;
            totalDuration += upsellDuration;
            details.push({
                text: `${upsell.icon} ${upsell.name}`,
                price: upsellTotal,
                isUpsell: true
            });
        }
    });

    // Travel fee
    if (State.travelZone && subtotal > 0) {
        const zone = activePricing().travelZones[State.travelZone];
        if (zone) {
            subtotal += zone.fee;
            details.push({
                text: `🚗 Call-out (${zone.label})`,
                price: zone.fee,
                isTravel: true
            });
        }
    }

    // Calculate discounts
    let originalPrice = subtotal;

    // Combo discount
    if (hasKarpit && hasMatrac) {
        discount = Math.round(subtotal * DISCOUNTS.combo.percent / 100);
        details.push({
            text: `🎉 ${DISCOUNTS.combo.label}`,
            price: -discount,
            isDiscount: true
        });
    }
    // Quantity discount (only if no combo)
    else if (totalItems >= 3) {
        discount = Math.round(subtotal * DISCOUNTS.quantity3.percent / 100);
        details.push({
            text: `🎉 ${DISCOUNTS.quantity3.label}`,
            price: -discount,
            isDiscount: true
        });
    }

    const finalTotal = subtotal - discount;

    // Update UI
    State.totalPrice = finalTotal;
    State.totalDuration = totalDuration;
    State.discount = discount;

    document.getElementById('totalPrice').textContent = `${finalTotal.toLocaleString('en-GB')} HUF`;

    // Original price (if discount)
    const originalEl = document.getElementById('originalPrice');
    if (discount > 0) {
        originalEl.textContent = `${originalPrice.toLocaleString('en-GB')} HUF`;
        originalEl.style.display = 'block';
        document.getElementById('summaryDiscount').style.display = 'flex';
        document.getElementById('discountAmount').textContent = `-${discount.toLocaleString('en-GB')} HUF`;
    } else {
        originalEl.style.display = 'none';
        document.getElementById('summaryDiscount').style.display = 'none';
    }

    // Duration
    if (totalDuration > 0) {
        document.getElementById('summaryDuration').style.display = 'flex';
        const hours = Math.floor(totalDuration / 60);
        const mins = totalDuration % 60;
        document.getElementById('totalDuration').textContent =
            hours > 0 ? `${hours} h ${mins} min` : `${mins} min`;
    } else {
        document.getElementById('summaryDuration').style.display = 'none';
    }

    // Details
    const detailsEl = document.getElementById('summaryDetails');
    if (details.length === 0) {
        detailsEl.innerHTML = '<p class="summary-empty">Choose a service to get started…</p>';
    } else {
        detailsEl.innerHTML = details.map(d => `
            <div class="summary-item ${d.isUpsell ? 'is-upsell' : ''} ${d.isDiscount ? 'is-discount' : ''} ${d.isTravel ? 'is-travel' : ''}">
                <span>${d.text}</span>
                <span>${d.price >= 0 ? '' : ''}${d.price.toLocaleString('en-GB')} HUF</span>
            </div>
        `).join('');
    }

    // Update calendar duration
    if (typeof BookingCalendar !== 'undefined' && BookingCalendar.setRequiredDuration) {
        BookingCalendar.setRequiredDuration(totalDuration);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // NAGYMEGRENDELÉS DETEKTÁLÁS
    // ═══════════════════════════════════════════════════════════════════════════
    const wasLargeOrder = State.isLargeOrder;
    State.isLargeOrder = totalDuration > LARGE_ORDER.threshold;

    // Ha változott a státusz, frissítjük a UI-t
    if (wasLargeOrder !== State.isLargeOrder) {
        toggleLargeOrderMode(State.isLargeOrder);
    }

    // MINDIG frissítjük a panel értékeit, ha látható
    if (State.isLargeOrder) {
        updateLargeOrderPanelValues();
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// NAGYMEGRENDELÉS KEZELÉS
// ═══════════════════════════════════════════════════════════════════════════════

function toggleLargeOrderMode(isLarge) {
    const calendarWrapper = document.getElementById('calendarWrapper');
    const largeOrderPanel = document.getElementById('largeOrderPanel');

    if (isLarge) {
        // Elrejtjük a naptárat, mutatjuk az árajánlat panelt
        if (calendarWrapper) calendarWrapper.style.display = 'none';

        // Ha nincs még large order panel, létrehozzuk
        if (!largeOrderPanel) {
            createLargeOrderPanel();
        } else {
            largeOrderPanel.style.display = 'block';
            // FRISSÍTJÜK az értékeket!
            updateLargeOrderPanelValues();
        }

    } else {
        // Mutatjuk a naptárat, elrejtjük az árajánlat panelt
        if (calendarWrapper) calendarWrapper.style.display = 'block';
        if (largeOrderPanel) largeOrderPanel.style.display = 'none';
    }
}

function updateLargeOrderPanelValues() {
    const durationEl = document.getElementById('largeOrderDuration');
    const priceEl = document.getElementById('largeOrderPrice');

    if (durationEl) {
        durationEl.textContent = formatDuration(State.totalDuration);
    }
    if (priceEl) {
        priceEl.textContent = `${State.totalPrice.toLocaleString('en-GB')} HUF`;
    }
}

function createLargeOrderPanel() {
    const step6 = document.getElementById('step6');
    if (!step6) return;

    const panel = document.createElement('div');
    panel.id = 'largeOrderPanel';
    panel.className = 'large-order-panel';
    panel.innerHTML = `
        <div class="large-order-header"> <span class="large-order-icon">🏢</span> <h3>Large order — individual quote</h3> </div> <div class="large-order-info"> <p>Your order exceeds what we can complete in a single day.</p> <p>Estimated working time: <strong id="largeOrderDuration">${formatDuration(State.totalDuration)}</strong></p>
            <p>Estimated price: <strong id="largeOrderPrice">${State.totalPrice.toLocaleString('en-GB')} HUF</strong></p> <p class="large-order-note">📧 Send us your details and <strong>within 24 hours</strong> we will send a tailored quote with exact dates and any volume discount that applies.</p> </div> <div class="large-order-form"> <div class="form-row"> <label for="largeOrderName">Name / Company *</label> <input type="text" id="largeOrderName" required placeholder="Minta Géza Alapítvány"> </div> <div class="form-row"> <label for="largeOrderEmail">Email *</label> <input type="email" id="largeOrderEmail" required placeholder="info@example.com"> </div> <div class="form-row"> <label for="largeOrderPhone">Phone *</label> <input type="tel" id="largeOrderPhone" required placeholder="+36 30 123 4567"> </div> <div class="form-row"> <label for="largeOrderAddress">Address / Location</label> <input type="text" id="largeOrderAddress" placeholder="2890 Tata, Példa utca 1."> </div> <div class="form-row"> <label for="largeOrderMessage">Notes (preferred dates, etc.)</label> <textarea id="largeOrderMessage" rows="3" placeholder="Pl. Január második fele lenne ideális..."></textarea> </div> <button type="button" class="large-order-submit" onclick="submitLargeOrder()"> 📧 Request a quote </button> </div>
    `;

    // Beszúrjuk a calendar wrapper helyére
    const calendarWrapper = document.getElementById('calendarWrapper');
    if (calendarWrapper) {
        calendarWrapper.parentNode.insertBefore(panel, calendarWrapper.nextSibling);
    } else {
        step6.appendChild(panel);
    }
}

function formatDuration(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0 && mins > 0) {
        return `${hours} h ${mins} min`;
    } else if (hours > 0) {
        return `${hours} h`;
    } else {
        return `${mins} min`;
    }
}

async function submitLargeOrder() {
    if (BookingTransport.pending || BookingTransport.largeOrderSent) return false;
    if (!State.isLargeOrder || !Object.values(State.selectedItems).some(item => item.count > 0)) {
        alert('Please add the items for your large order.');
        return false;
    }
    const name = document.getElementById('largeOrderName')?.value.trim();
    const email = document.getElementById('largeOrderEmail')?.value.trim();
    const phone = document.getElementById('largeOrderPhone')?.value.trim();
    const address = document.getElementById('largeOrderAddress')?.value.trim();
    const message = document.getElementById('largeOrderMessage')?.value.trim();

    // Validáció
    if (!name || !email || !phone) {
        alert('Please fill in the required fields (Name, Email, Phone).');
        return;
    }

    // Email validáció
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        alert('Please enter a valid email address.');
        return;
    }

    // Apply the ordinary booking's Hungarian-phone validation to quote requests too.
    if (!/^(\+36|06)?[0-9]{9,10}$/.test(phone.replace(/[\s\-]/g, ''))) {
        alert('Kérjük adj meg érvényes magyar telefonszámot!');
        document.getElementById('largeOrderPhone').focus();
        return false;
    }

    // Összeállítjuk a megrendelés részleteit
    const itemDetails = [];
    Object.entries(State.selectedItems).forEach(([fullId, item]) => {
        if (item.count === 0) return;
        const separatorIndex = fullId.indexOf('_');
        const category = fullId.substring(0, separatorIndex);
        const id = fullId.substring(separatorIndex + 1);
        const pricing = category === 'karpit' ? activePricing().karpit[id] : activePricing().matrac[id];
        if (pricing) {
            itemDetails.push({
                name: pricing.name,
                count: item.count,
                unitPrice: pricing.price,
                total: pricing.price * item.count,
                upsells: item.upsells,
                cleaningExtras: getItemCleaningExtras(fullId, item)
            });
        }
    });

    const payload = {
        type: 'large_order',
        source: 'eco-clean-hungary',
        lang: 'en',
        timestamp: new Date().toISOString(),

        customer: {
            name: name,
            email: email,
            phone: phone,
            type: State.customerType
        },

        location: {
            address: address || 'Nem megadott',
            city: State.city,
            travelZone: State.travelZone
        },

        order: {
            items: itemDetails,
            globalUpsells: State.globalUpsells,
            conditions: State.conditions
        },

        totals: {
            estimatedPrice: State.totalPrice,
            estimatedDuration: State.totalDuration,
            discount: State.discount,
            currency: 'HUF'
        },

        message: bookingMessageWithExtras(message)
    };

    return sendLargeOrderRequest(payload);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ANDANTE MODAL
// ═══════════════════════════════════════════════════════════════════════════════

function openAndanteModal() {
    document.getElementById('andanteModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeAndanteModal(event) {
    if (event && event.target !== document.getElementById('andanteModal')) return;
    document.getElementById('andanteModal').style.display = 'none';
    document.body.style.overflow = '';
}

function confirmAndante() {
    const checkbox = document.getElementById('andanteCheckbox');
    checkbox.disabled = false;
    checkbox.checked = true;
    closeAndanteModal();
}

// ═══════════════════════════════════════════════════════════════════════════════
// BOOKING SUBMIT
// ═══════════════════════════════════════════════════════════════════════════════

async function submitBooking(event) {
    event.preventDefault();
    if (BookingTransport.pending || BookingTransport.bookingSent) return false;
    if (!Object.values(State.selectedItems).some(item => item.count > 0) || State.isLargeOrder) {
        alert('Kérjük válassz legalább egy tételt! Nagymegrendeléshez használd az árajánlatkérést.');
        return false;
    }
    if (!State.city) {
        alert('Kérjük válaszd ki a régiót!');
        document.getElementById('citySelect').focus();
        return false;
    }
    if (typeof BookingCalendar === 'undefined' || !BookingCalendar.isValid() ||
        BookingCalendar.state.selectedCity !== State.city ||
        BookingCalendar.state.requiredDuration !== State.totalDuration) {
        alert(typeof BookingCalendar === 'undefined' ? 'Az időpontok nem tölthetők be. Hívj: 06 70 240 8141' : BookingCalendar.getValidationMessage());
        document.getElementById('bookingCalendar').scrollIntoView({ behavior: 'smooth', block: 'center' });
        return false;
    }

    // Get form values
    const name = document.getElementById('nameInput').value.trim();
    const email = document.getElementById('emailInput').value.trim();
    const emailConfirm = document.getElementById('emailConfirmInput').value.trim();
    const phone = document.getElementById('phoneInput').value.trim();
    const message = document.getElementById('messageInput').value.trim();
    const street = document.getElementById('streetInput').value.trim();
    const plz = document.getElementById('plzInput').value.trim();
    const city = document.getElementById('cityInput').value.trim();

    // Validation: Required fields
    if (!name) {
        alert('❌ Kérjük add meg a neved!');
        document.getElementById('nameInput').focus();
        return false;
    }

    if (!email) {
        alert('❌ Kérjük add meg az e-mail címed!');
        document.getElementById('emailInput').focus();
        return false;
    }

    // Validation: Email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        alert('❌ Kérjük adj meg érvényes e-mail címet!');
        document.getElementById('emailInput').focus();
        return false;
    }

    if (!emailConfirm) {
        alert('❌ Kérjük erősítsd meg az e-mail címed!');
        document.getElementById('emailConfirmInput').focus();
        return false;
    }

    // Validation: Email match
    if (email !== emailConfirm) {
        alert('❌ Az e-mail címek nem egyeznek! Kérjük ellenőrizd.');
        document.getElementById('emailConfirmInput').focus();
        document.getElementById('emailConfirmInput').select();
        return false;
    }

    if (!phone) {
        alert('❌ Kérjük add meg a telefonszámod!');
        document.getElementById('phoneInput').focus();
        return false;
    }

    // Validation: Phone format (Hungarian phone numbers)
    const phoneRegex = /^(\+36|06)?[0-9]{9,10}$/;
    const cleanPhone = phone.replace(/[\s\-]/g, '');
    if (!phoneRegex.test(cleanPhone)) {
        alert('❌ Kérjük adj meg érvényes magyar telefonszámot! (pl. +36 30 123 4567 vagy 06 30 123 4567)');
        document.getElementById('phoneInput').focus();
        return false;
    }

    // Validation: Address fields
    if (!street || !plz || !city) {
        alert('❌ Kérjük töltsd ki a pontos címet (utca, irányítószám, város)!');
        if (!street) document.getElementById('streetInput').focus();
        else if (!plz) document.getElementById('plzInput').focus();
        else document.getElementById('cityInput').focus();
        return false;
    }

    // Validation: PLZ format (4 digits)
    if (!/^\d{4}$/.test(plz)) {
        alert('❌ Az irányítószám 4 számjegyből kell álljon!');
        document.getElementById('plzInput').focus();
        return false;
    }

    // Validation: ANDANTE checkbox (only when kárpit service is selected)
    const andanteRow = document.getElementById('andanteRow');
    if (andanteRow && andanteRow.style.display !== 'none') {
        const andanteCheckbox = document.getElementById('andanteCheckbox');
        if (!andanteCheckbox || !andanteCheckbox.checked) {
            andanteRow.classList.add('andante-row-error');
            andanteRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(function() {
                andanteRow.classList.remove('andante-row-error');
            }, 3000);
            openAndanteModal();
            return false;
        }
    }

    // Validation: Travel Zone (REQUIRED for pricing!)
    if (!State.travelZone) {
        alert('❌ Kérjük válaszd ki a kiszállási zónát!\\n\\nEz szükséges a pontos ár kiszámításához.');
        // Scroll to the travel zone section
        document.getElementById('travelZoneWrap').scrollIntoView({ behavior: 'smooth', block: 'center' });
        return false;
    }

    if(isGyorCity()&&!/^gy[oő]r(?:$|[\s,\-])/iu.test(city.trim())){
        alert("Győr city prices apply only to addresses within Győr. Please correct the town or travel zone.");
        document.getElementById('cityInput').focus();return false;
    }
    const fullAddress = `${street}, ${plz} ${city}, Magyarország`;

    // Get selected calendar slot data
    const selectedSlot = typeof BookingCalendar !== 'undefined' && BookingCalendar.getSelectedSlot ? BookingCalendar.getSelectedSlot() : null;
    const selectedDate = typeof BookingCalendar !== 'undefined' && BookingCalendar.getSelectedDate ? BookingCalendar.getSelectedDate() : null;

    // Determine if kárpit service is involved
    const isKarpitBooking = State.serviceType === 'Kárpit' || State.serviceType === 'Mindkettő';

    // Build booking data
    const bookingData = {
        customerType: State.customerType,
        name: name,
        email: email,
        phone: cleanPhone,
        message: bookingMessageWithExtras(message),
        location: fullAddress,
        items: State.selectedItems,
        upsells: State.globalUpsells,
        conditions: State.conditions,
        travelZone: State.travelZone,
        city: State.city,
        totalPrice: State.totalPrice,
        totalDuration: State.totalDuration,
        discount: State.discount,
        serviceType: State.serviceType,
        andanteAccepted: isKarpitBooking,
        isKarpitBooking: isKarpitBooking,
        // Calendar slot data
        date: selectedDate,
        slotStartTime: selectedSlot?.startTime || null,
        slotEndTime: selectedSlot?.endTime || null,
        isFirstSlot: selectedSlot?.isFirstSlot || false,
        lang: 'en',
        timestamp: new Date().toISOString()
    };

    return sendBookingRequest(bookingData);
}

// ═══════════════════════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', function () {


    if (typeof BookingCalendar !== 'undefined') {
        BookingCalendar.init('bookingCalendar', {
            availabilityEndpoint: 'https://hub.centaur-lang.dev/webhook/check-availability',
            bookingEndpoint: 'https://hub.centaur-lang.dev/webhook/booking-request',
            country: 'HU',
            currency: 'Ft',
            locale: 'hu-HU',
            language: 'hu'
        });
    }
});
/* Production transmission and accessible feedback. Never retry a POST automatically. */
const BookingTransport = { pending: false, bookingSent: false, largeOrderSent: false };

function showBookingResult({ title, message, detail = '', total = '', success = false }) {
    let dialog = document.getElementById('bookingResult');
    if (!dialog) {
        dialog = document.createElement('dialog');
        dialog.id = 'bookingResult';
        dialog.className = 'demo-result booking-result';
        dialog.setAttribute('aria-labelledby', 'bookingResultTitle');
        dialog.setAttribute('aria-describedby', 'bookingResultMessage');
        dialog.innerHTML = '<div class="result-mark" aria-hidden="true"></div><p class="hero-eyebrow">ECO CLEAN</p><h2 id="bookingResultTitle"></h2><p id="bookingResultMessage"></p><p id="bookingResultDetail"></p><p class="demo-result-total" id="bookingResultTotal"></p><form method="dialog"><button class="btn btn-primary">Vissza az oldalhoz</button></form>';
        document.body.appendChild(dialog);
    }
    dialog.querySelector('.result-mark').textContent = success ? '✓' : '!';
    document.getElementById('bookingResultTitle').textContent = title;
    document.getElementById('bookingResultMessage').textContent = message;
    document.getElementById('bookingResultDetail').textContent = detail;
    document.getElementById('bookingResultTotal').textContent = total;
    if (!dialog.open) dialog.showModal();
}

function bookingFailure(result) {
    const code = String(result?.error || result?.status || '');
    if (['CLUSTER_MISMATCH', 'ZONE_INCOMPATIBLE'].includes(code)) {
        return 'Ezen a napon nem érhető el a kiválasztott régió. Kérjük válassz másik napot.';
    }
    if (['FULLY_BOOKED', 'DAY_FULL', 'SLOT_CONFLICT', 'SLOT_TAKEN_ON_RECHECK'].includes(code)) {
        return 'Ez az időpont időközben betelt. Kérjük válassz másik időpontot a frissített naptárból.';
    }
    if (code === 'INVALID_DATE') return 'A kiválasztott dátum nem érvényes. Kérjük válassz jövőbeli időpontot.';
    return 'A kérés feldolgozása nem sikerült. Kérjük egyeztess velünk a 06 70 240 8141 telefonszámon.';
}

async function transmitBookingRequest(url, payload, button, kind) {
    if (BookingTransport.pending || BookingTransport[kind + 'Sent']) return false;
    BookingTransport.pending = true;
    const previous = button.innerHTML;
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    button.textContent = 'Küldés…';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: controller.signal
        });
        const result = await response.json();
        // The booking workflow may reject a request with HTTP 200.
        // A transport status alone never proves acceptance.
        if (!response.ok || result?.success !== true) {
            showBookingResult({ title: 'A kérés nem sikerült.', message: bookingFailure(result) });
            if (kind === 'booking' && typeof BookingCalendar !== 'undefined') {
                BookingCalendar.resetSelection();
                void BookingCalendar.fetchAvailability();
            }
            return false;
        }
        BookingTransport[kind + 'Sent'] = true;
        if (kind === 'booking') {
            showBookingResult({
                success: true,
                title: 'Foglalási kérelmed elküldve.',
                message: 'Köszönjük! Hamarosan felvesszük veled a kapcsolatot a megadott elérhetőségeiden.',
                detail: `Requested appointment: ${payload.date} · ${payload.slotStartTime}${payload.isFirstSlot ? '' : ' (±30 perc)'}. ${payload.isKarpitBooking ? 'ANDANTE vagy vízre érzékeny szövet esetén kérjük, még a kiszállás előtt egyeztess: 06 70 240 8141.' : ''}`,
                total: `Calculated total: ${payload.totalPrice.toLocaleString('en-GB')} Ft`
            });
            document.getElementById('bookingForm').reset();
            BookingCalendar.resetSelection();
            void BookingCalendar.fetchAvailability();
        } else {
            showBookingResult({
                success: true,
                title: 'Árajánlatkérése elküldve.',
                message: 'Köszönjük! Hamarosan felvesszük veled a kapcsolatot az egyedi árajánlattal és az időpont egyeztetésével.',
                total: `Estimated total: ${payload.totals.estimatedPrice.toLocaleString('en-GB')} Ft`
            });
        }
    } catch {
        // A dropped response does not tell us whether the server already processed it.
        showBookingResult({
            title: 'A visszaigazolás nem érkezett meg.',
            message: 'Nem tudtuk ellenőrizni, hogy megérkezett-e a kérés. Újraküldés előtt kérjük egyeztess velünk: 06 70 240 8141.'
        });
    } finally {
        clearTimeout(timeout);
        BookingTransport.pending = false;
        button.removeAttribute('aria-busy');
        button.disabled = BookingTransport[kind + 'Sent'];
        if (BookingTransport[kind + 'Sent']) button.textContent = 'Kérés elküldve';
        else button.innerHTML = previous;
    }
    return false;
}

function sendBookingRequest(payload) {
    return transmitBookingRequest('https://hub.centaur-lang.dev/webhook/booking-request-hu', payload, document.querySelector('.btn-submit'), 'booking');
}

function sendLargeOrderRequest(payload) {
    return transmitBookingRequest(LARGE_ORDER.webhookUrl, payload, document.querySelector('.large-order-submit'), 'largeOrder');
}
