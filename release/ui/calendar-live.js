/* Production calendar: original check-availability v3 request and slot contracts.
 * The server owns availability, zone compatibility and fitting-slot decisions.
 * Only server-provided slots can be selected. No sample or fallback availability.
 */
const BookingCalendar = {
    config: {
        availabilityEndpoint: 'https://hub.centaur-lang.dev/webhook/check-availability',
        monthsToShow: 2,
        minAdvanceDays: 1,
        language: 'hu'
    },
    state: {
        currentMonth: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        selectedCity: null, selectedDate: null, selectedSlot: null,
        requiredDuration: 0, flexibilityAccepted: false, availabilityData: null,
        isLoading: false, error: null, view: 'calendar', fetchedAt: null
    },
    requestNumber: 0,
    controller: null,
    init(id, options = {}) {
        this.container = document.getElementById(id);
        Object.assign(this.config, options);
        this.state.currentMonth = this.today();
        this.state.currentMonth.setDate(1);
        this.render();
    },
    today() {
        const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Budapest', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
        const part = type => Number(parts.find(item => item.type === type).value);
        return new Date(part('year'), part('month') - 1, part('day'));
    },
    text(hu, en) {
        return document.documentElement.lang.toLowerCase().startsWith('en') ? en : hu;
    },
    key(date) {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    },
    escape(value) {
        return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
    },
    resetSelection() {
        this.state.selectedDate = null;
        this.state.selectedSlot = null;
        this.state.flexibilityAccepted = false;
        this.state.view = 'calendar';
    },
    setRequiredDuration(minutes) {
        const duration = Number.isFinite(minutes) && minutes >= 0 ? minutes : 0;
        if (this.state.requiredDuration === duration) return;
        this.state.requiredDuration = duration;
        this.resetSelection();
        return this.fetchAvailability();
    },
    async setCity(city) {
        this.state.selectedCity = city || null;
        this.resetSelection();
        return this.fetchAvailability();
    },
    validateData(data) {
        if (!data || data.success === false || !Array.isArray(data.days)) throw new Error('Invalid availability response');
        const statuses = ['free', 'limited', 'zone_blocked', 'full', 'unavailable', 'past', 'weekend', 'not_enough_time', 'unknown'];
        for (const day of data.days) {
            if (!day || !/^\d{4}-\d{2}-\d{2}$/.test(day.date) || !statuses.includes(day.status)) throw new Error('Invalid availability day');
            if (['free', 'limited'].includes(day.status) && !Array.isArray(day.slots)) throw new Error('Missing slots');
            if (day.slots != null && !Array.isArray(day.slots)) throw new Error('Invalid slots');
            for (const slot of day.slots || []) {
                if (!slot || !Number.isFinite(slot.startMinutes) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(slot.startTime) ||
                    (slot.endTime != null && !/^([01]\d|2[0-3]):[0-5]\d$/.test(slot.endTime)) ||
                    typeof slot.fitsRequested !== 'boolean' || typeof slot.isFirstSlot !== 'boolean') throw new Error('Invalid slot');
                if (slot.status !== 'booked' && (!Number.isFinite(slot.maxDuration) || slot.maxDuration < 0)) throw new Error('Invalid duration');
            }
        }
        return data;
    },
    async fetchAvailability() {
        const request = ++this.requestNumber;
        this.controller?.abort();
        this.resetSelection();
        this.state.availabilityData = null;
        this.state.error = null;
        this.state.fetchedAt = null;
        if (!this.state.selectedCity || !this.state.requiredDuration) {
            this.state.isLoading = false;
            this.render();
            return false;
        }
        const city = this.state.selectedCity;
        const duration = this.state.requiredDuration;
        this.state.isLoading = true;
        this.render();
        const startDate = this.today();
        startDate.setDate(startDate.getDate() + this.config.minAdvanceDays);
        const endDate = this.today();
        endDate.setDate(1);
        endDate.setMonth(endDate.getMonth() + this.config.monthsToShow);
        const controller = new AbortController();
        this.controller = controller;
        const timeout = setTimeout(() => controller.abort(), 15000);
        try {
            const response = await fetch(this.config.availabilityEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ city, startDate: this.key(startDate), endDate: this.key(endDate), requiredDuration: duration }),
                signal: controller.signal
            });
            if (!response.ok) throw new Error('Availability request failed');
            const data = this.validateData(await response.json());
            if (request !== this.requestNumber) return false;
            this.state.availabilityData = data;
            this.state.fetchedAt = Date.now();
            return true;
        } catch {
            if (request !== this.requestNumber) return false;
            this.state.error = this.text('A szabad időpontok jelenleg nem tölthetők be. Próbáld újra, vagy hívj minket: 06 70 240 8141.', 'Available appointments cannot be loaded right now. Try again or call us: 06 70 240 8141.');
            return false;
        } finally {
            clearTimeout(timeout);
            if (request === this.requestNumber) {
                this.state.isLoading = false;
                this.render();
            }
        }
    },
    getDayStatus(date) {
        return this.state.availabilityData?.days.find(day => day.date === date) || null;
    },
    isSelectableDate(date) {
        const min = this.today();
        min.setDate(min.getDate() + this.config.minAdvanceDays);
        const day = this.getDayStatus(date);
        return !this.state.isLoading && !this.state.error && date >= this.key(min) &&
            ['free', 'limited'].includes(day?.status) && day.slots.some(slot => this.slotFits(slot));
    },
    slotFits(slot) {
        return slot.status !== 'booked' && slot.fitsRequested === true && slot.maxDuration >= this.state.requiredDuration;
    },
    selectDate(date) {
        if (!this.isSelectableDate(date)) return;
        this.resetSelection();
        this.state.selectedDate = date;
        this.state.view = 'slots';
        this.render();
    },
    selectSlot(startMinutes) {
        if (!this.isSelectableDate(this.state.selectedDate)) return;
        const slot = this.getDayStatus(this.state.selectedDate)?.slots.find(item => item.startMinutes === startMinutes);
        if (!slot || !this.slotFits(slot)) return;
        this.state.selectedSlot = slot;
        this.state.flexibilityAccepted = slot.isFirstSlot;
        this.render();
        if (slot.isFirstSlot) this.dispatchSelectionEvent();
    },
    toggleFlexibility() {
        this.state.flexibilityAccepted = !this.state.flexibilityAccepted;
        this.render();
    },
    confirmSlot() {
        if (!this.isValid()) return;
        this.state.view = 'confirmed';
        this.render();
        this.dispatchSelectionEvent();
    },
    backToCalendar() {
        this.resetSelection();
        this.render();
    },
    previousMonth() { this.changeMonth(-1); },
    nextMonth() { this.changeMonth(1); },
    changeMonth(offset) {
        const date = this.state.currentMonth;
        const next = new Date(date.getFullYear(), date.getMonth() + offset, 1);
        const today = this.today();
        const first = new Date(today.getFullYear(), today.getMonth(), 1);
        const last = new Date(today.getFullYear(), today.getMonth() + this.config.monthsToShow, 1);
        if (next < first || next > last) return;
        this.state.currentMonth = next;
        this.render();
    },
    dispatchSelectionEvent() {
        if (!this.isValid() || !this.container) return;
        this.container.dispatchEvent(new CustomEvent('dateSelected', { detail: {
            date: this.state.selectedDate,
            slot: this.state.selectedSlot,
            isFirstSlot: this.state.selectedSlot.isFirstSlot,
            flexibilityAccepted: this.state.flexibilityAccepted,
            requiredDuration: this.state.requiredDuration
        } }));
    },
    formatDuration(minutes) {
        const hours = Math.floor(minutes / 60), rest = minutes % 60;
        if (document.documentElement.lang.toLowerCase().startsWith('en')) return hours ? `${hours} h${rest ? ` ${rest} min` : ''}` : `${rest} min`;
        return hours ? `${hours} óra${rest ? ` ${rest} perc` : ''}` : `${rest} perc`;
    },
    calculateExpectedArrival(time) {
        const [hours, minutes] = time.split(':').map(Number);
        const format = value => `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
        return `${format(hours * 60 + minutes - 30)}–${format(hours * 60 + minutes + 30)}`;
    },
    getSelectedDate() { return this.state.selectedDate; },
    getSelectedSlot() { return this.state.selectedSlot; },
    getSelectedDateDetails() {
        if (!this.isValid()) return null;
        return { date: this.state.selectedDate, slot: this.state.selectedSlot, startTime: this.state.selectedSlot.startTime,
            maxDuration: this.state.selectedSlot.maxDuration, isFirstSlot: this.state.selectedSlot.isFirstSlot,
            flexibilityAccepted: this.state.flexibilityAccepted, city: this.state.selectedCity, requiredDuration: this.state.requiredDuration };
    },
    isValid() {
        if (!this.state.selectedDate || !this.state.selectedSlot || !this.isSelectableDate(this.state.selectedDate)) return false;
        const current = this.getDayStatus(this.state.selectedDate)?.slots.find(slot => slot.startMinutes === this.state.selectedSlot.startMinutes);
        return Boolean(current && current === this.state.selectedSlot && this.slotFits(current) &&
            (current.isFirstSlot || this.state.flexibilityAccepted));
    },
    getValidationMessage() {
        if (this.state.error) return this.state.error;
        if (this.state.isLoading) return this.text('Kérjük várd meg a szabad időpontok betöltését.', 'Please wait for available appointments to load.');
        if (!this.state.selectedDate || !this.state.selectedSlot) return this.text('Kérjük válassz szabad dátumot és időpontot a naptárból.', 'Please select an available date and time from the calendar.');
        if (!this.state.selectedSlot.isFirstSlot && !this.state.flexibilityAccepted) return this.text('Kérjük fogadd el az érkezési idő ±30 perces rugalmasságát.', 'Please accept the ±30-minute arrival window.');
        return this.text('Az időpont már nem érvényes. Kérjük válassz újra a naptárból.', 'This appointment is no longer valid. Please select another from the calendar.');
    },
    render() {
        if (!this.container) return;
        this.container.setAttribute('aria-busy', String(this.state.isLoading));
        const active = document.activeElement;
        const focusedKey = this.container.contains(active) ? active.dataset?.calendarKey : null;
        if (!this.state.selectedCity || !this.state.requiredDuration) {
            this.container.innerHTML = this.text('<p class="demo-date-confirmation" role="status">Kérjük először válaszd ki a helyszínt és a tételeket.</p>', '<p class="demo-date-confirmation" role="status">Please select a location and items first.</p>');
        } else if (this.state.isLoading) {
            this.container.innerHTML = this.text('<p class="demo-date-confirmation" role="status">Szabad időpontok betöltése…</p>', '<p class="demo-date-confirmation" role="status">Loading available appointments…</p>');
        } else if (this.state.error) {
            this.container.innerHTML = `<div class="calendar-feedback" role="alert"><p>${this.escape(this.state.error)}</p><button type="button" class="btn btn-primary" data-calendar-action="retry" data-calendar-key="retry">${this.text('Újrapróbálás', 'Retry')}</button></div>`;
        } else {
            this.container.innerHTML = this.renderCalendar();
        }
        this.container.querySelectorAll('[data-calendar-action]').forEach(button => {
            button.onclick = () => {
                const action = button.dataset.calendarAction;
                if (action === 'retry') void this.fetchAvailability();
                else if (action === 'previous') this.previousMonth();
                else if (action === 'next') this.nextMonth();
                else if (action === 'date') this.selectDate(button.dataset.date);
                else if (action === 'slot') this.selectSlot(Number(button.dataset.minutes));
                else if (action === 'back') this.backToCalendar();
                else if (action === 'confirm') this.confirmSlot();
            };
        });
        const flexibility = this.container.querySelector('[data-calendar-flexibility]');
        if (flexibility) flexibility.onchange = () => this.toggleFlexibility();
        if (focusedKey) this.container.querySelectorAll('[data-calendar-key]').forEach(button => {
            if (button.dataset.calendarKey === focusedKey) button.focus({ preventScroll: true });
        });
    },
    renderCalendar() {
        const date = this.state.currentMonth;
        const year = date.getFullYear(), month = date.getMonth();
        const today = this.today();
        const firstMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastMonth = new Date(today.getFullYear(), today.getMonth() + this.config.monthsToShow, 1);
        const title = new Intl.DateTimeFormat(this.text('hu-HU', 'en-GB'), { year: 'numeric', month: 'long' }).format(date);
        let days = this.text(['H', 'K', 'Sze', 'Cs', 'P', 'Szo', 'V'], ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']).map(day => `<span class="calendar-weekday">${day}</span>`).join('');
        days += '<span aria-hidden="true"></span>'.repeat((date.getDay() + 6) % 7);
        const labels = this.text({ free: 'Szabad', limited: 'Részben szabad', zone_blocked: 'Másik zóna', full: 'Betelt', unavailable: 'Nem elérhető', past: 'Elmúlt', weekend: 'Nem elérhető', not_enough_time: 'Nincs elég idő', unknown: 'Nem elérhető' }, { free: 'Available', limited: 'Partly available', zone_blocked: 'Other zone', full: 'Fully booked', unavailable: 'Unavailable', past: 'Past', weekend: 'Unavailable', not_enough_time: 'Not enough time', unknown: 'Unavailable' });
        for (let day = 1; day <= new Date(year, month + 1, 0).getDate(); day++) {
            const key = this.key(new Date(year, month, day));
            const status = this.getDayStatus(key);
            const available = this.isSelectableDate(key);
            const selected = this.state.selectedDate === key;
            const label = `${key} – ${available ? labels[status.status] : this.text('Nem választható', 'Unavailable')}${status?.message && !document.documentElement.lang.toLowerCase().startsWith('en') ? `: ${status.message}` : ''}`;
            days += `<button type="button" class="calendar-day ${this.escape(status?.status || 'unknown')}${selected ? ' selected' : ''}" ${available ? '' : 'disabled'} aria-pressed="${selected}" aria-label="${this.escape(label)}" data-calendar-action="date" data-calendar-key="${key}" data-date="${key}">${day}</button>`;
        }
        const available = this.state.availabilityData?.days.some(day => this.isSelectableDate(day.date));
        const legend = this.text('<div class="calendar-legend" role="list" aria-label="Színkódok"><span role="listitem"><i class="calendar-legend-swatch calendar-legend-swatch--free"></i>Szabad nap</span><span role="listitem"><i class="calendar-legend-swatch calendar-legend-swatch--limited"></i>Részben foglalt</span><span role="listitem"><i class="calendar-legend-swatch calendar-legend-swatch--full"></i>Foglalt</span></div>', '<div class="calendar-legend" role="list" aria-label="Colour key"><span role="listitem"><i class="calendar-legend-swatch calendar-legend-swatch--free"></i>Available day</span><span role="listitem"><i class="calendar-legend-swatch calendar-legend-swatch--limited"></i>Partly booked</span><span role="listitem"><i class="calendar-legend-swatch calendar-legend-swatch--full"></i>Booked</span></div>');
        return `<div class="demo-calendar live-calendar"><p class="calendar-duration">${this.text('Szükséges idő:', 'Required time:')} ${this.formatDuration(this.state.requiredDuration)}</p><div class="demo-calendar-top"><button type="button" class="calendar-month-button" data-calendar-action="previous" data-calendar-key="previous" aria-label="${this.text('Előző hónap', 'Previous month')}" ${date <= firstMonth ? 'disabled' : ''}>←</button><strong aria-live="polite">${title}</strong><button type="button" class="calendar-month-button" data-calendar-action="next" data-calendar-key="next" aria-label="${this.text('Következő hónap', 'Next month')}" ${date >= lastMonth ? 'disabled' : ''}>→</button></div><div class="demo-calendar-grid">${days}</div>${!available ? this.text('<p role="status" class="demo-date-confirmation">A vizsgált időszakban nincs megfelelő szabad időpont. Egyeztetés: <a href="tel:+36702408141">06 70 240 8141</a>.</p>', '<p role="status" class="demo-date-confirmation">No suitable appointments are available in this period. Call us: <a href="tel:+36702408141">06 70 240 8141</a>.</p>') : ''}${this.renderSlots()}${legend}</div>`;
    },
    renderSlots() {
        if (!this.state.selectedDate) return '';
        const day = this.getDayStatus(this.state.selectedDate);
        if (!day) return '';
        const selected = this.state.selectedSlot;
        if (this.state.view === 'confirmed' && this.isValid()) {
            return `<div class="calendar-confirmed"><p class="demo-date-confirmation" role="status">${this.text('Kiválasztott időpont:', 'Selected appointment:')} ${this.state.selectedDate} · ${selected.startTime}${selected.isFirstSlot ? '' : this.text(' (±30 perc)', ' (±30 min)')}</p><button type="button" class="calendar-change-button" data-calendar-action="back" data-calendar-key="back">${this.text('Időpont módosítása', 'Change appointment')}</button></div>`;
        }
        const slots = day.slots.map(slot => {
            const fits = this.slotFits(slot);
            const isSelected = selected?.startMinutes === slot.startMinutes;
            const label = slot.status === 'booked' ? this.text('Foglalt', 'Booked') : !fits ? this.text('Nincs elég idő', 'Not enough time') : slot.isFirstSlot ? this.text('Első időpont', 'First appointment') : this.text('Érkezés ±30 perc', 'Arrival ±30 min');
            return `<button type="button" class="${isSelected ? 'selected' : ''}" data-calendar-action="slot" data-calendar-key="slot-${slot.startMinutes}" data-minutes="${slot.startMinutes}" ${fits ? '' : 'disabled'} aria-pressed="${isSelected}"><span>${slot.startTime}${slot.endTime ? `–${slot.endTime}` : ''}</span><small>${label}</small></button>`;
        }).join('');
        let html = `<p class="demo-date-confirmation">${this.state.selectedDate} · ${this.text('Válassz időpontot:', 'Choose a time:')}</p><div class="demo-slots live-slots" role="group" aria-label="${this.text('Szabad időpontok', 'Available appointments')}">${slots}</div>`;
        if (selected) {
            if (!selected.isFirstSlot) html += `<div class="calendar-flexibility"><p>${this.text('Az érkezési idő ±30 perccel eltérhet. Várható érkezés:', 'Arrival may vary by ±30 minutes. Expected arrival:')} ${this.calculateExpectedArrival(selected.startTime)}.</p><label><input type="checkbox" data-calendar-flexibility data-calendar-key="flexibility" ${this.state.flexibilityAccepted ? 'checked' : ''}> ${this.text('Megértettem és elfogadom a ±30 perc rugalmasságot.', 'I understand and accept the ±30-minute arrival window.')}</label></div>`;
            html += `<button type="button" class="btn btn-primary calendar-confirm" data-calendar-action="confirm" data-calendar-key="confirm" ${this.isValid() ? '' : 'disabled'}>${this.text('Időpont kiválasztása:', 'Select appointment:')} ${selected.startTime}</button>`;
        }
        return html;
    }
};
