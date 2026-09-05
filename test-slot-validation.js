// Ellenorzi, hogy a naptar isValid() gate-je pontosan azokat az allapotokat utasitja el,
// amelyeket a backend (Normalize Payload - HU) hianyzo idopontkent dob vissza.
// Futtatas: node test-slot-validation.js
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const ctx = { console, alert: () => {}, document: undefined };
vm.createContext(ctx);
const src = fs.readFileSync('booking-calendar.js', 'utf8') + '\nBookingCalendar;';
const cal = vm.runInContext(src, ctx);
cal.lang = cal.i18n.hu;
cal.config.language = 'hu';

// 1. Semmi kivalasztva -> ez volt a 2026-09-05-i hibas foglalas (date:null, slotStartTime:null)
assert.strictEqual(cal.isValid(), false, 'ures allapot nem lehet ervenyes');
assert.ok(cal.getValidationMessage(), 'kell hibauzenet');

// 2. Csak datum, slot nelkul
cal.state.selectedDate = '2026-09-15';
assert.strictEqual(cal.isValid(), false, 'slot nelkul nem ervenyes');

// 3. Elso slot -> ervenyes, flexibilitas nem kell
cal.state.selectedSlot = { startTime: '09:00', isFirstSlot: true };
cal.state.flexibilityAccepted = true;
assert.strictEqual(cal.isValid(), true, 'elso slot ervenyes');

// 4. Kesobbi slot elfogadott flexibilitas nelkul -> nem ervenyes
cal.state.selectedSlot = { startTime: '11:00', isFirstSlot: false };
cal.state.flexibilityAccepted = false;
assert.strictEqual(cal.isValid(), false, '+-30 perc elfogadasa nelkul nem ervenyes');

// 5. Kesobbi slot elfogadott flexibilitassal -> ervenyes (a 09-03-i sikeres foglalas esete)
cal.state.flexibilityAccepted = true;
assert.strictEqual(cal.isValid(), true, 'elfogadott flexibilitassal ervenyes');

console.log('OK - slot validacio rendben');
