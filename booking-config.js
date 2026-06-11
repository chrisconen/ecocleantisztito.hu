// ═══════════════════════════════════════════════════════════════════════════════
// 🐴 ECO CLEAN HUNGARY - FULL CONFIGURATION v3.0
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// PRICING - ALAPÁRAK
// ═══════════════════════════════════════════════════════════════════════════════

const PRICING = {
    // KÁRPITTISZTÍTÁS (mélytisztítás)
    karpit: {
        "szofa": { name: "Szófa, heverő", price: 10500, duration: 40, atkaPrice: 3500 },
        "l_kanape": { name: "L-kanapé", price: 15000, duration: 50, atkaPrice: 3500 },
        "u_kanape": { name: "U-kanapé", price: 18000, duration: 60, atkaPrice: 5000 },
        "fotel": { name: "Fotel", price: 5000, duration: 20, atkaPrice: 0 },
        "ebedlo_szek": { name: "Ebédlő szék", price: 1500, duration: 10, atkaPrice: 0 },
        "irodai_szek": { name: "Irodai szék", price: 3000, duration: 15, atkaPrice: 0 }
    },

    // MATRACTISZTÍTÁS (atkairtás)
    matrac: {
        "egyagyas_a": { name: "Egyágyas matrac (A oldal)", price: 8000, duration: 25, sides: 1 },
        "egyagyas_ab": { name: "Egyágyas matrac (A+B oldal)", price: 12000, duration: 40, sides: 2 },
        "francia_a": { name: "Franciaágy matrac (A oldal)", price: 12000, duration: 35, sides: 1 },
        "francia_ab": { name: "Franciaágy matrac (A+B oldal)", price: 17000, duration: 55, sides: 2 },
        "gyerek_a": { name: "Gyerekmatrac (A oldal)", price: 5000, duration: 15, sides: 1 },
        "gyerek_ab": { name: "Gyerekmatrac (A+B oldal)", price: 7000, duration: 25, sides: 2 },
        "kisagy_a": { name: "Kiságy matrac (A oldal)", price: 4000, duration: 10, sides: 1 },
        "kisagy_ab": { name: "Kiságy matrac (A+B oldal)", price: 6000, duration: 20, sides: 2 }
    },

    // KISZÁLLÁSI DÍJAK (egységes minden városra)
    travelZones: {
        "belvaros": { fee: 2500, label: "Belváros" },
        "kulso": { fee: 3000, label: "Külső városrész" },
        "20km": { fee: 3500, label: "20 km-en belül" },
        "40km": { fee: 6000, label: "40 km-en belül" }
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// UPSELLS - EXTRA SZOLGÁLTATÁSOK
// ═══════════════════════════════════════════════════════════════════════════════

const UPSELLS = {
    // Kárpit upsells
    karpit: {
        "atkairtas": {
            name: "Atkairtás",
            description: "Száraz atkamentesítés - ajánlott allergiásoknak",
            priceType: "perItem", // ár tételenként különböző
            icon: "🦠"
        },
        "folteltavolitas": {
            name: "Extra folteltávolítás",
            description: "Erős szennyeződések, foltok kezelése",
            price: 2000,
            priceType: "perSeat", // ülőhelyenként
            duration: 10,
            icon: "✨"
        },
        "impregnalas": {
            name: "Impregnálás",
            description: "Védőréteg a könnyebb tisztításért",
            price: 3000,
            priceType: "perItem", // bútoronként
            duration: 15,
            icon: "🛡️"
        },
        "szagtalanitas": {
            name: "Szagtalanítás",
            description: "Háziállat/dohányszag eltávolítása",
            price: 2500,
            priceType: "perItem",
            duration: 10,
            icon: "🌸"
        }
    },

    // Matrac upsells
    matrac: {
        "nedves_tisztitas": {
            name: "Nedves tisztítás + folteltávolítás",
            description: "Foltos matracokhoz - fertőtlenítő mosás",
            price: 5000,
            priceType: "perSide", // felületenként
            duration: 20,
            icon: "💧",
            note: "Száradási idő: kb. 24 óra!"
        },
        "agykeret": {
            name: "Ágykeret, fejtámla tisztítás",
            description: "Ágykeret, fejtámla kárpittisztítás",
            price: 3000,
            priceType: "perItem",
            duration: 15,
            icon: "🛏️"
        }
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// DISCOUNTS - KEDVEZMÉNYEK
// ═══════════════════════════════════════════════════════════════════════════════

const DISCOUNTS = {
    combo: { percent: 10, label: "Kombi kedvezmény (kárpit+matrac)" },
    quantity3: { percent: 5, label: "3+ bútor kedvezmény" }
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
    document.getElementById('step4').style.display = 'block';
    document.getElementById('step5').style.display = 'block';
    document.getElementById('step6').style.display = 'block';

    updateSummary();
}

function handleCityChange(select) {
    State.city = select.value;

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
        text += '💡 Háziállat esetén ajánljuk a szagtalanítást! ';
    }
    if (State.conditions.includes('Allergias')) {
        text += '💡 Allergia esetén ajánljuk az atkairtást minden bútorra! ';
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
        container.innerHTML += '<div class="item-group-title">🛋️ Kárpittisztítás</div>';
        Object.entries(PRICING.karpit).forEach(([id, item]) => {
            container.innerHTML += createItemHTML('karpit', id, item);
        });
    }

    if (showMatrac) {
        container.innerHTML += '<div class="item-group-title" style="margin-top: 1.5rem;">🛏️ Matractisztítás</div>';
        Object.entries(PRICING.matrac).forEach(([id, item]) => {
            container.innerHTML += createItemHTML('matrac', id, item);
        });
    }

    populateUpsells();
}

function createItemHTML(category, id, item) {
    const fullId = `${category}_${id}`;
    const hasAtka = category === 'karpit' && item.atkaPrice > 0;

    return `
        <div class="config-item" data-item-id="${fullId}">
            <div class="item-main">
                <div class="item-info">
                    <span class="item-name">${item.name}</span>
                    <span class="item-price">${item.price.toLocaleString('hu-HU')} Ft</span>
                </div>
                <div class="item-counter">
                    <button class="counter-btn" onclick="decrementItem('${fullId}')">−</button>
                    <span class="counter-value" id="count-${fullId}">0</span>
                    <button class="counter-btn" onclick="incrementItem('${fullId}', '${category}')">+</button>
                </div>
            </div>
            ${hasAtka ? `
            <div class="item-upsell" id="upsell-${fullId}" style="display:none;">
                <label class="upsell-checkbox">
                    <input type="checkbox" onchange="toggleItemUpsell('${fullId}', 'atkairtas', ${item.atkaPrice})">
                    <span class="upsell-label">
                        <span class="upsell-icon">🦠</span>
                        <span class="upsell-text">+Atkairtás</span>
                        <span class="upsell-price">+${item.atkaPrice.toLocaleString('hu-HU')} Ft</span>
                    </span>
                </label>
            </div>
            ` : ''}
        </div>
    `;
}

function populateUpsells() {
    const container = document.getElementById('upsellOptions');
    container.innerHTML = '';

    const showKarpit = State.serviceType === 'Kárpit' || State.serviceType === 'Mindkettő';
    const showMatrac = State.serviceType === 'Matrac' || State.serviceType === 'Mindkettő';

    if (showKarpit) {
        container.innerHTML += '<div class="upsell-group-title">🛋️ Kárpit extrák</div>';
        Object.entries(UPSELLS.karpit).forEach(([id, upsell]) => {
            if (id !== 'atkairtas') { // Atkairtás item-level
                container.innerHTML += createGlobalUpsellHTML('karpit', id, upsell);
            }
        });
    }

    if (showMatrac) {
        container.innerHTML += '<div class="upsell-group-title" style="margin-top: 1rem;">🛏️ Matrac extrák</div>';
        Object.entries(UPSELLS.matrac).forEach(([id, upsell]) => {
            container.innerHTML += createGlobalUpsellHTML('matrac', id, upsell);
        });
    }
}

function createGlobalUpsellHTML(category, id, upsell) {
    const fullId = `${category}_${id}`;
    const priceText = upsell.priceType === 'perSeat' ? `+${upsell.price.toLocaleString('hu-HU')} Ft/ülőhely` :
        upsell.priceType === 'perSide' ? `+${upsell.price.toLocaleString('hu-HU')} Ft/felület` :
            upsell.priceType === 'perItem' ? `+${upsell.price.toLocaleString('hu-HU')} Ft/db` :
                `+${upsell.price.toLocaleString('hu-HU')} Ft`;

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
            upsellEl.querySelector('input').checked = false;
        }
    }

    document.getElementById(`count-${fullId}`).textContent = State.selectedItems[fullId]?.count || 0;

    updateBadges();
    updateSummary();
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
    //     const pricing = category === 'karpit' ? PRICING.karpit[id] : PRICING.matrac[id];
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
        upsellEl.querySelector('input').checked = false;
    }

    updateBadges();
    updateSummary();
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUMMARY CALCULATION
// ═══════════════════════════════════════════════════════════════════════════════

function updateSummary() {
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
        const pricing = category === 'karpit' ? PRICING.karpit[id] : PRICING.matrac[id];

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

        // Item-level upsells (atkairtás)
        item.upsells.forEach(upsellId => {
            if (upsellId === 'atkairtas' && pricing.atkaPrice) {
                const atkaTotal = pricing.atkaPrice * item.count;
                subtotal += atkaTotal;
                totalDuration += 15 * item.count;
                details.push({
                    text: `  +Atkairtás (${item.count}x)`,
                    price: atkaTotal,
                    isUpsell: true
                });
            }
        });
    });

    // Calculate global upsells
    Object.entries(State.globalUpsells).forEach(([fullId, info]) => {
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
        const zone = PRICING.travelZones[State.travelZone];
        if (zone) {
            subtotal += zone.fee;
            details.push({
                text: `🚗 Kiszállás (${zone.label})`,
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

    document.getElementById('totalPrice').textContent = `${finalTotal.toLocaleString('hu-HU')} Ft`;

    // Original price (if discount)
    const originalEl = document.getElementById('originalPrice');
    if (discount > 0) {
        originalEl.textContent = `${originalPrice.toLocaleString('hu-HU')} Ft`;
        originalEl.style.display = 'block';
        document.getElementById('summaryDiscount').style.display = 'flex';
        document.getElementById('discountAmount').textContent = `-${discount.toLocaleString('hu-HU')} Ft`;
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
            hours > 0 ? `${hours} óra ${mins} perc` : `${mins} perc`;
    } else {
        document.getElementById('summaryDuration').style.display = 'none';
    }

    // Details
    const detailsEl = document.getElementById('summaryDetails');
    if (details.length === 0) {
        detailsEl.innerHTML = '<p class="summary-empty">Válasszon szolgáltatást a kezdéshez...</p>';
    } else {
        detailsEl.innerHTML = details.map(d => `
            <div class="summary-item ${d.isUpsell ? 'is-upsell' : ''} ${d.isDiscount ? 'is-discount' : ''} ${d.isTravel ? 'is-travel' : ''}">
                <span>${d.text}</span>
                <span>${d.price >= 0 ? '' : ''}${d.price.toLocaleString('hu-HU')} Ft</span>
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

        console.log('🏢 Nagymegrendelés mód aktiválva - idő:', State.totalDuration, 'perc, ár:', State.totalPrice);
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
        priceEl.textContent = `${State.totalPrice.toLocaleString('hu-HU')} Ft`;
    }
}

function createLargeOrderPanel() {
    const step6 = document.getElementById('step6');
    if (!step6) return;

    const panel = document.createElement('div');
    panel.id = 'largeOrderPanel';
    panel.className = 'large-order-panel';
    panel.innerHTML = `
        <div class="large-order-header">
            <span class="large-order-icon">🏢</span>
            <h3>Nagymegrendelés - Egyedi árajánlat</h3>
        </div>
        <div class="large-order-info">
            <p>Az Ön megrendelése meghaladja az egy napos kapacitást!</p>
            <p>Becsült munkaidő: <strong id="largeOrderDuration">${formatDuration(State.totalDuration)}</strong></p>
            <p>Becsült ár: <strong id="largeOrderPrice">${State.totalPrice.toLocaleString('hu-HU')} Ft</strong></p>
            <p class="large-order-note">📧 Kérjük küldje el az adatokat és <strong>24 órán belül</strong> személyre szabott árajánlatot küldünk a pontos időpontokkal és esetleges mennyiségi kedvezménnyel!</p>
        </div>
        <div class="large-order-form">
            <div class="form-row">
                <label for="largeOrderName">Név / Cég *</label>
                <input type="text" id="largeOrderName" required placeholder="Minta Géza Alapítvány">
            </div>
            <div class="form-row">
                <label for="largeOrderEmail">E-mail *</label>
                <input type="email" id="largeOrderEmail" required placeholder="info@example.com">
            </div>
            <div class="form-row">
                <label for="largeOrderPhone">Telefon *</label>
                <input type="tel" id="largeOrderPhone" required placeholder="+36 30 123 4567">
            </div>
            <div class="form-row">
                <label for="largeOrderAddress">Cím / Helyszín</label>
                <input type="text" id="largeOrderAddress" placeholder="2890 Tata, Példa utca 1.">
            </div>
            <div class="form-row">
                <label for="largeOrderMessage">Megjegyzés (preferált időszak, stb.)</label>
                <textarea id="largeOrderMessage" rows="3" placeholder="Pl. Január második fele lenne ideális..."></textarea>
            </div>
            <button type="button" class="large-order-submit" onclick="submitLargeOrder()">
                📧 Árajánlat kérése
            </button>
        </div>
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
        return `${hours} óra ${mins} perc`;
    } else if (hours > 0) {
        return `${hours} óra`;
    } else {
        return `${mins} perc`;
    }
}

async function submitLargeOrder() {
    const name = document.getElementById('largeOrderName')?.value.trim();
    const email = document.getElementById('largeOrderEmail')?.value.trim();
    const phone = document.getElementById('largeOrderPhone')?.value.trim();
    const address = document.getElementById('largeOrderAddress')?.value.trim();
    const message = document.getElementById('largeOrderMessage')?.value.trim();

    // Validáció
    if (!name || !email || !phone) {
        alert('Kérjük töltse ki a kötelező mezőket (Név, E-mail, Telefon)!');
        return;
    }

    // Email validáció
    if (!email.includes('@') || !email.includes('.')) {
        alert('Kérjük adjon meg érvényes e-mail címet!');
        return;
    }

    // Összeállítjuk a megrendelés részleteit
    const itemDetails = [];
    Object.entries(State.selectedItems).forEach(([fullId, item]) => {
        if (item.count === 0) return;
        const separatorIndex = fullId.indexOf('_');
        const category = fullId.substring(0, separatorIndex);
        const id = fullId.substring(separatorIndex + 1);
        const pricing = category === 'karpit' ? PRICING.karpit[id] : PRICING.matrac[id];
        if (pricing) {
            itemDetails.push({
                name: pricing.name,
                count: item.count,
                unitPrice: pricing.price,
                total: pricing.price * item.count,
                upsells: item.upsells
            });
        }
    });

    const payload = {
        type: 'large_order',
        source: 'eco-clean-hungary',
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

        message: message || null
    };

    console.log('🏢 Large Order Request:', payload);

    // Loading állapot
    const submitBtn = document.querySelector('.large-order-submit');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="loading-spinner"></span> Küldés...';

    try {
        const response = await fetch(LARGE_ORDER.webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (result.success || response.ok) {
            showLargeOrderSuccess(name, email);
        } else {
            throw new Error(result.message || 'Hiba történt');
        }
    } catch (error) {
        console.error('Nagymegrendelési hiba:', error);
        alert('Hiba történt a küldés során. Kérjük próbálja újra, vagy hívjon minket: +36 20 912 3456');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

function showLargeOrderSuccess(name, email) {
    const panel = document.getElementById('largeOrderPanel');
    if (panel) {
        panel.innerHTML = `
            <div class="large-order-success">
                <div class="success-icon">✅</div>
                <h3>Köszönjük, ${name}!</h3>
                <p>Árajánlat kérését megkaptuk.</p>
                <p>24 órán belül válaszolunk a <strong>${email}</strong> címre.</p>
                <p class="success-note">Sürgős esetben hívjon: <a href="tel:+36209123456">+36 20 912 3456</a></p>
                <button onclick="location.reload()" class="new-order-btn">Új megrendelés</button>
            </div>
        `;
    }
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
        alert('❌ Kérjük adja meg a nevét!');
        document.getElementById('nameInput').focus();
        return false;
    }

    if (!email) {
        alert('❌ Kérjük adja meg az e-mail címét!');
        document.getElementById('emailInput').focus();
        return false;
    }

    // Validation: Email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        alert('❌ Kérjük adjon meg érvényes e-mail címet!');
        document.getElementById('emailInput').focus();
        return false;
    }

    if (!emailConfirm) {
        alert('❌ Kérjük erősítse meg az e-mail címét!');
        document.getElementById('emailConfirmInput').focus();
        return false;
    }

    // Validation: Email match
    if (email !== emailConfirm) {
        alert('❌ Az e-mail címek nem egyeznek! Kérjük ellenőrizze.');
        document.getElementById('emailConfirmInput').focus();
        document.getElementById('emailConfirmInput').select();
        return false;
    }

    if (!phone) {
        alert('❌ Kérjük adja meg a telefonszámát!');
        document.getElementById('phoneInput').focus();
        return false;
    }

    // Validation: Phone format (Hungarian phone numbers)
    const phoneRegex = /^(\+36|06)?[0-9]{9,10}$/;
    const cleanPhone = phone.replace(/[\s\-]/g, '');
    if (!phoneRegex.test(cleanPhone)) {
        alert('❌ Kérjük adjon meg érvényes magyar telefonszámot!\n(pl. +36 30 123 4567 vagy 06 30 123 4567)');
        document.getElementById('phoneInput').focus();
        return false;
    }

    // Validation: Address fields
    if (!street || !plz || !city) {
        alert('❌ Kérjük töltse ki a pontos címet (utca, irányítószám, város)!');
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
        alert('❌ Kérjük válassza ki a kiszállási zónát!\\n\\nEz szükséges a pontos ár kiszámításához.');
        // Scroll to the travel zone section
        document.getElementById('travelZoneWrap').scrollIntoView({ behavior: 'smooth', block: 'center' });
        return false;
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
        message: message || null,
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
        timestamp: new Date().toISOString()
    };

    console.log('📦 Booking data:', bookingData);

    // Disable submit button and show loading state
    const submitBtn = document.querySelector('.btn-submit');
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>Küldés...</span>';

    // Backend-nek küldés
    try {
        const response = await fetch('https://hub.centaur-lang.dev/webhook/booking-request-hu', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(bookingData)
        });

        const result = await response.json();

        if (response.ok && result.success) {
            // Sikeres - premium success modal mutatása
            showSuccessModal(bookingData);

            // Űrlap törlése
            document.getElementById('bookingForm').reset();
        } else {
            // Szerver hibát adott vissza - részletes hibaüzenet
            const errorType = result.error || 'UNKNOWN';
            const errorMessage = result.message || 'Hiba történt a foglalás során';

            if (errorType === 'CLUSTER_MISMATCH' || errorMessage.includes('CLUSTER_MISMATCH')) {
                // Cluster konfliktus - specifikus hibaüzenet
                alert(`❌ Időpont ütközés!\n\n${errorMessage}\n\n💡 Kérjük válasszon másik napot a naptárból, vagy válasszon másik várost a legördülő menüből!`);
            } else if (errorType === 'FULLY_BOOKED' || errorMessage.includes('betelt')) {
                // Teljesen foglalt nap
                alert(`❌ Ez a nap már betelt!\n\n${errorMessage}\n\n💡 Kérjük válasszon másik időpontot a naptárból!`);
            } else if (errorType === 'INVALID_DATE' || errorMessage.includes('érvénytelen')) {
                // Érvénytelen dátum
                alert(`❌ Érvénytelen időpont!\n\n${errorMessage}\n\n💡 Kérjük válasszon egy jövőbeli dátumot!`);
            } else {
                // Általános hiba
                alert(`❌ Hiba történt a foglalás során!\n\n${errorMessage}\n\n📞 Kérjük próbálja újra, vagy hívjon minket:\n06 70 240 8141`);
            }

            throw new Error(errorMessage);
        }
    } catch (error) {
        console.error('Foglalási hiba:', error);
        alert('❌ Hiba történt a foglalás küldése során.\n\nKérjük próbálja újra, vagy hívjon minket:\n📞 06 70 240 8141');

        // Gomb újra engedélyezése
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;

        return false;
    }

    // Gomb újra engedélyezése siker után
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalBtnText;

    return false;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUCCESS MODAL
// ═══════════════════════════════════════════════════════════════════════════════

function showSuccessModal(bookingData) {
    // Create modal HTML
    const modalHTML = `
        <div class="success-modal-overlay" id="successModal">
            <div class="success-modal-content">
                <div class="success-checkmark">
                    <svg class="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
                        <circle class="checkmark-circle" cx="26" cy="26" r="25" fill="none"/>
                        <path class="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
                    </svg>
                </div>
                
                <h2 class="success-title">Foglalás sikeresen elküldve!</h2>
                
                <p class="success-message">
                    Köszönjük a bizalmát! Hamarosan felvesszük Önnel a kapcsolatot a megadott elérhetőségeken.
                </p>
                
                <div class="success-details">
                    <div class="success-detail-item">
                        <span class="detail-icon">📧</span>
                        <span class="detail-text">${bookingData.email}</span>
                    </div>
                    <div class="success-detail-item">
                        <span class="detail-icon">📞</span>
                        <span class="detail-text">${bookingData.phone}</span>
                    </div>
                    ${bookingData.date ? `
                    <div class="success-detail-item">
                        <span class="detail-icon">📅</span>
                        <span class="detail-text">${bookingData.date} ${bookingData.slotStartTime || ''}</span>
                    </div>
                    ` : ''}
                </div>
                
                ${bookingData.isKarpitBooking ? `
                <div class="success-andante-note">
                    <strong>⚠️ ANDANTE bútor tisztítása?</strong>
                    <p>Kérjük, <strong>még a kiszállás előtt</strong> ellenőrizze bútora szövetének típusát! Ha az ANDANTE típusú vagy vízre érzékeny anyagból készült, kérjük, előzetesen egyeztessen munkatársunkkal a <strong>06 70 240 8141</strong>-es számon. Ellenkező esetben a kiszállás díjának 50%-a kapacitás-foglalási díjként felszámításra kerülhet.</p>
                </div>
                ` : ''}
                <button class="success-close-btn" onclick="closeSuccessModal()">
                    Bezárás
                </button>
            </div>
        </div>
    `;

    // Insert modal into DOM
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Trigger animation
    setTimeout(() => {
        document.getElementById('successModal').classList.add('show');
    }, 10);

    // Auto-close after 8 seconds
    setTimeout(() => {
        closeSuccessModal();
    }, 8000);

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function closeSuccessModal() {
    const modal = document.getElementById('successModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.remove();
        }, 300);
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', function () {
    console.log('🐴 ECO Clean Magyarország Foglalási rendszer v3.0 inicializálva');

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