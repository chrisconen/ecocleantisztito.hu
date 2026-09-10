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
        this.render();
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
        const startDate = new Date();
        startDate.setDate(startDate.getDate() + this.config.minAdvanceDays);
        const endDate = new Date();
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
            this.state.error = 'A szabad időpontok jelenleg nem tölthetők be. Próbáld újra, vagy hívj minket: 06 70 240 8141.';
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
        const min = new Date();
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
        const today = new Date();
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
        if (this.state.isLoading) return 'Kérjük várd meg a szabad időpontok betöltését.';
        if (!this.state.selectedDate || !this.state.selectedSlot) return 'Kérjük válassz szabad dátumot és időpontot a naptárból.';
        if (!this.state.selectedSlot.isFirstSlot && !this.state.flexibilityAccepted) return 'Kérjük fogadd el az érkezési idő ±30 perces rugalmasságát.';
        return 'Az időpont már nem érvényes. Kérjük válassz újra a naptárból.';
    },
    render() {
        if (!this.container) return;
        this.container.setAttribute('aria-busy', String(this.state.isLoading));
        const active = document.activeElement;
        const focusedKey = this.container.contains(active) ? active.dataset?.calendarKey : null;
        if (!this.state.selectedCity || !this.state.requiredDuration) {
            this.container.innerHTML = '<p class="demo-date-confirmation" role="status">Kérjük először válaszd ki a helyszínt és a tételeket.</p>';
        } else if (this.state.isLoading) {
            this.container.innerHTML = '<p class="demo-date-confirmation" role="status">Szabad időpontok betöltése…</p>';
        } else if (this.state.error) {
            this.container.innerHTML = `<div class="calendar-feedback" role="alert"><p>${this.escape(this.state.error)}</p><button type="button" class="btn btn-primary" data-calendar-action="retry" data-calendar-key="retry">Újrapróbálás</button></div>`;
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
        const today = new Date();
        const firstMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastMonth = new Date(today.getFullYear(), today.getMonth() + this.config.monthsToShow, 1);
        const title = new Intl.DateTimeFormat('hu-HU', { year: 'numeric', month: 'long' }).format(date);
        let days = ['H', 'K', 'Sze', 'Cs', 'P', 'Szo', 'V'].map(day => `<span class="calendar-weekday">${day}</span>`).join('');
        days += '<span aria-hidden="true"></span>'.repeat((date.getDay() + 6) % 7);
        const labels = { free: 'Szabad', limited: 'Részben szabad', zone_blocked: 'Másik zóna', full: 'Betelt', unavailable: 'Nem elérhető', past: 'Elmúlt', weekend: 'Nem elérhető', not_enough_time: 'Nincs elég idő', unknown: 'Nem elérhető' };
        for (let day = 1; day <= new Date(year, month + 1, 0).getDate(); day++) {
            const key = this.key(new Date(year, month, day));
            const status = this.getDayStatus(key);
            const available = this.isSelectableDate(key);
            const selected = this.state.selectedDate === key;
            const label = `${key} – ${available ? labels[status.status] : 'Nem választható'}${status?.message ? `: ${status.message}` : ''}`;
            days += `<button type="button" class="calendar-day ${this.escape(status?.status || 'unknown')}${selected ? ' selected' : ''}" ${available ? '' : 'disabled'} aria-pressed="${selected}" aria-label="${this.escape(label)}" data-calendar-action="date" data-calendar-key="${key}" data-date="${key}">${day}</button>`;
        }
        const available = this.state.availabilityData?.days.some(day => this.isSelectableDate(day.date));
        return `<div class="demo-calendar live-calendar"><p class="calendar-duration">Szükséges idő: ${this.formatDuration(this.state.requiredDuration)}</p><div class="demo-calendar-top"><button type="button" class="calendar-month-button" data-calendar-action="previous" data-calendar-key="previous" aria-label="Előző hónap" ${date <= firstMonth ? 'disabled' : ''}>←</button><strong aria-live="polite">${title}</strong><button type="button" class="calendar-month-button" data-calendar-action="next" data-calendar-key="next" aria-label="Következő hónap" ${date >= lastMonth ? 'disabled' : ''}>→</button></div><div class="demo-calendar-grid">${days}</div>${!available ? '<p role="status" class="demo-date-confirmation">A vizsgált időszakban nincs megfelelő szabad időpont. Egyeztetés: <a href="tel:+36702408141">06 70 240 8141</a>.</p>' : ''}${this.renderSlots()}</div>`;
    },
    renderSlots() {
        if (!this.state.selectedDate) return '';
        const day = this.getDayStatus(this.state.selectedDate);
        if (!day) return '';
        const selected = this.state.selectedSlot;
        if (this.state.view === 'confirmed' && this.isValid()) {
            return `<div class="calendar-confirmed"><p class="demo-date-confirmation" role="status">Kiválasztott időpont: ${this.state.selectedDate} · ${selected.startTime}${selected.isFirstSlot ? '' : ' (±30 perc)'}</p><button type="button" class="calendar-change-button" data-calendar-action="back" data-calendar-key="back">Időpont módosítása</button></div>`;
        }
        const slots = day.slots.map(slot => {
            const fits = this.slotFits(slot);
            const isSelected = selected?.startMinutes === slot.startMinutes;
            const label = slot.status === 'booked' ? 'Foglalt' : !fits ? 'Nincs elég idő' : slot.isFirstSlot ? 'Első időpont' : 'Érkezés ±30 perc';
            return `<button type="button" class="${isSelected ? 'selected' : ''}" data-calendar-action="slot" data-calendar-key="slot-${slot.startMinutes}" data-minutes="${slot.startMinutes}" ${fits ? '' : 'disabled'} aria-pressed="${isSelected}"><span>${slot.startTime}${slot.endTime ? `–${slot.endTime}` : ''}</span><small>${label}</small></button>`;
        }).join('');
        let html = `<p class="demo-date-confirmation">${this.state.selectedDate} · Válassz időpontot:</p><div class="demo-slots live-slots" role="group" aria-label="Szabad időpontok">${slots}</div>`;
        if (selected) {
            if (!selected.isFirstSlot) html += `<div class="calendar-flexibility"><p>Az érkezési idő ±30 perccel eltérhet. Várható érkezés: ${this.calculateExpectedArrival(selected.startTime)}.</p><label><input type="checkbox" data-calendar-flexibility data-calendar-key="flexibility" ${this.state.flexibilityAccepted ? 'checked' : ''}> Megértettem és elfogadom a ±30 perc rugalmasságot.</label></div>`;
            html += `<button type="button" class="btn btn-primary calendar-confirm" data-calendar-action="confirm" data-calendar-key="confirm" ${this.isValid() ? '' : 'disabled'}>Időpont kiválasztása: ${selected.startTime}</button>`;
        }
        return html;
    }
};
