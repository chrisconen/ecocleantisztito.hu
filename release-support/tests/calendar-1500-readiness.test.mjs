import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Offline client contract only. These fixtures do not prove backend eligibility.
const date = new Date();
date.setDate(date.getDate() + 2);
const day = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const slot = (hour, overrides = {}) => ({ startMinutes: hour * 60,
    startTime: `${hour.toString().padStart(2, '0')}:00`, endTime: `${hour + 2}:00`,
    maxDuration: 100, fitsRequested: true, status: 'available', isFirstSlot: hour === 9, ...overrides });

for (const file of ['../calendar-live.js', '../../release/ui/calendar-live.js']) {
    const source = fs.readFileSync(new URL(file, import.meta.url), 'utf8');
    function calendar(city, slots) {
        const context = vm.createContext({ Date, Intl, console });
        const c = vm.runInContext(`${source}\nBookingCalendar`, context);
        Object.assign(c.state, { selectedCity: city, requiredDuration: 40,
            availabilityData: c.validateData({ success: true, days: [{ date: day, status: 'limited', slots }] }) });
        c.selectDate(day);
        return c;
    }

    test(`${file}: server-supplied 15:00 works for each requested city and retains arrival acceptance`, () => {
        for (const city of ['gyor', 'mosonmagyarovar', 'papa']) {
            const c = calendar(city, [slot(9), slot(11), slot(13), slot(15)]);
            assert.match(c.renderSlots(), /data-minutes="900"/);
            c.selectSlot(900);
            assert.equal(c.isValid(), false);
            c.toggleFlexibility();
            c.confirmSlot();
            assert.equal(c.isValid(), true);
            assert.equal(c.getSelectedDateDetails().startTime, '15:00');
            assert.equal(c.getSelectedDateDetails().city, city);
            assert.equal(c.state.view, 'confirmed');
        }
    });

    test(`${file}: no client-generated 15:00 when the server omits it`, () => {
        for (const city of ['gyor', 'mosonmagyarovar', 'papa', 'sopron', 'veszprem']) {
            const c = calendar(city, [slot(9), slot(11), slot(13)]);
            assert.doesNotMatch(c.renderSlots(), /data-minutes="900"/);
            c.selectSlot(900);
            assert.equal(c.getSelectedSlot(), null);
            assert.equal(c.isValid(), false);
        }
    });

    test(`${file}: booked or insufficient 15:00 is not selectable`, () => {
        for (const overrides of [{ status: 'booked' }, { fitsRequested: false }, { maxDuration: 39 }]) {
            const c = calendar('gyor', [slot(9), slot(15, overrides)]);
            c.selectSlot(900);
            assert.equal(c.getSelectedSlot(), null);
            assert.equal(c.isValid(), false);
        }
    });

    test(`${file}: earlier slots remain selectable`, () => {
        for (const hour of [9, 11, 13]) {
            const c = calendar('gyor', [slot(9), slot(11), slot(13), slot(15)]);
            c.selectSlot(hour * 60);
            if (hour !== 9) c.toggleFlexibility();
            c.confirmSlot();
            assert.equal(c.isValid(), true);
            assert.equal(c.getSelectedSlot().startMinutes, hour * 60);
        }
    });
}
