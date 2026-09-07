"""Derive release booking from original contracts; originals and demo stay untouched."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'release-support'
source = (ROOT / 'booking-config.js').read_text(encoding='utf-8-sig')

def replace_once(old, new):
    global source
    assert source.count(old) == 1, f'Original booking source changed near {old[:70]!r}'
    source = source.replace(old, new, 1)

# Use approved furniture images, native buttons and meaningful quantity labels.
source = source.replace('<button class="counter-btn" onclick="decrementItem', '<button type="button" class="counter-btn" aria-label="${item.name} mennyiségének csökkentése" onclick="decrementItem')
source = source.replace('<button class="counter-btn" onclick="incrementItem', '<button type="button" class="counter-btn" aria-label="${item.name} mennyiségének növelése" onclick="incrementItem')
replace_once('<div class="item-main">', '''${category === 'karpit' ? `<img class="item-photo" src="assets/${({szofa:'sofa',l_kanape:'living-room',u_kanape:'living-room',fotel:'armchair',ebedlo_szek:'dining',irodai_szek:'office'})[id]}-card.webp" alt="Generált enteriőrkép: ${item.name}" width="600" height="400" loading="lazy">` : ''}
            <div class="item-main">''')

# Clearing a region must clear its previous availability and appointment too.
replace_once('    State.city = select.value;', '''    State.city = select.value;
    if (!State.city) {
        document.getElementById('travelZoneWrap').style.display = 'none';
        document.getElementById('addressInputs').style.display = 'none';
        document.getElementById('calendarWrapper').style.display = 'none';
        if (typeof BookingCalendar !== 'undefined') BookingCalendar.setCity(null);
    }''')

# Keep ORIGINAL validation and payload construction, replace transmission/feedback.
start = source.index("    console.log('🏢 Large Order Request:', payload);")
end = source.index('// ═', source.index('function showLargeOrderSuccess', start))
source = source[:start] + '''    return sendLargeOrderRequest(payload);
}

''' + source[end:]
start = source.index("    console.log('📦 Booking data:', bookingData);")
end = source.index('// ═', source.index('function closeSuccessModal', start))
source = source[:start] + '''    return sendBookingRequest(bookingData);
}

''' + source[end:]

replace_once('async function submitBooking(event) {\n    event.preventDefault();', '''async function submitBooking(event) {
    event.preventDefault();
    if (BookingTransport.pending || BookingTransport.bookingSent) return false;
    if (!Object.values(State.selectedItems).some(item => item.count > 0) || State.isLargeOrder) {
        alert('Kérjük válasszon legalább egy tételt! Nagymegrendeléshez használja az árajánlatkérést.');
        return false;
    }
    if (!State.city) {
        alert('Kérjük válassza ki a régiót!');
        document.getElementById('citySelect').focus();
        return false;
    }
    if (typeof BookingCalendar === 'undefined' || !BookingCalendar.isValid() ||
        BookingCalendar.state.selectedCity !== State.city ||
        BookingCalendar.state.requiredDuration !== State.totalDuration) {
        alert(typeof BookingCalendar === 'undefined' ? 'Az időpontok nem tölthetők be. Hívjon: 06 70 240 8141' : BookingCalendar.getValidationMessage());
        document.getElementById('bookingCalendar').scrollIntoView({ behavior: 'smooth', block: 'center' });
        return false;
    }''')
replace_once('async function submitLargeOrder() {', '''async function submitLargeOrder() {
    if (BookingTransport.pending || BookingTransport.largeOrderSent) return false;
    if (!State.isLargeOrder || !Object.values(State.selectedItems).some(item => item.count > 0)) {
        alert('Kérjük állítsa össze a nagymegrendelés tételeit!');
        return false;
    }''')
replace_once("    if (!email.includes('@') || !email.includes('.')) {", "    if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) {")
replace_once('    // Összeállítjuk a megrendelés részleteit', '''    // Apply the ordinary booking's Hungarian-phone validation to quote requests too.
    if (!/^(\\+36|06)?[0-9]{9,10}$/.test(phone.replace(/[\\s\\-]/g, ''))) {
        alert('Kérjük adjon meg érvényes magyar telefonszámot!');
        document.getElementById('largeOrderPhone').focus();
        return false;
    }

    // Összeállítjuk a megrendelés részleteit''')
# No customer or request payload logs in shipped JS.
source = re.sub(r'^\s*console\.log\([^\n]*\);\n', '\n', source, flags=re.M)
source += '\n' + (OUT / 'booking-runtime.js').read_text(encoding='utf-8')
(OUT / 'booking-live.js').write_text(source, encoding='utf-8')
print('Built release-support/booking-live.js from original pricing, validation and payload builders.')
