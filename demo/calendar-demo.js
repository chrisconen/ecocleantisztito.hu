/* Local demonstration calendar. It never reads or writes a booking endpoint. */
const BookingCalendar = {
  state: { selectedCity:null, selectedDate:null, selectedSlot:null, requiredDuration:0, monthOffset:0 },
  init(id) { this.container=document.getElementById(id); this.render(); },
  key(date) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`; },
  resetSelection() { this.state.selectedDate=null; this.state.selectedSlot=null; },
  setCity(city) { this.state.selectedCity=city; this.resetSelection(); this.render(); },
  setRequiredDuration(minutes) {
    if (this.state.requiredDuration!==minutes) this.resetSelection();
    this.state.requiredDuration=minutes;
    this.render();
  },
  getSelectedDate() { return this.state.selectedDate; },
  getSelectedSlot() { return this.state.selectedSlot; },
  previousMonth() { this.state.monthOffset=Math.max(0,this.state.monthOffset-1); this.render(); },
  nextMonth() { this.state.monthOffset=Math.min(2,this.state.monthOffset+1); this.render(); },
  selectDate(key) { this.state.selectedDate=key; this.state.selectedSlot=null; this.render(); },
  selectSlot(hour) {
    const end=hour*60+this.state.requiredDuration;
    this.state.selectedSlot={startTime:`${String(hour).padStart(2,'0')}:00`,endTime:`${String(Math.floor(end/60)).padStart(2,'0')}:${String(end%60).padStart(2,'0')}`,isFirstSlot:hour===9};
    this.render();
    document.getElementById('bookingFormWrapper').style.display='block';
  },
  render() {
    if (!this.container) return;
    if (!this.state.selectedCity || !this.state.requiredDuration) {
      this.container.innerHTML='<p class="demo-date-confirmation">Kérjük először válassza ki a helyszínt és a tételeket.</p>';
      return;
    }
    const today=new Date(); today.setHours(0,0,0,0);
    const month=new Date(today.getFullYear(),today.getMonth()+this.state.monthOffset,1);
    const last=new Date(month.getFullYear(),month.getMonth()+1,0).getDate();
    const offset=(month.getDay()+6)%7;
    const title=new Intl.DateTimeFormat('hu-HU',{year:'numeric',month:'long'}).format(month);
    let days=['H','K','Sze','Cs','P','Szo','V'].map(d=>`<span class="calendar-weekday">${d}</span>`).join('');
    days+='<span aria-hidden="true"></span>'.repeat(offset);
    for(let day=1;day<=last;day++) {
      const date=new Date(month.getFullYear(),month.getMonth(),day);
      const key=this.key(date);
      const weekday=date.getDay();
      const isPast=date<today;
      const isWeekend=weekday===0||weekday===6;
      const status=isPast?'past':isWeekend?'full':(weekday===2||weekday===5)?'partial':'free';
      const unavailable=status==='past'||status==='full';
      const selected=key===this.state.selectedDate;
      const label=new Intl.DateTimeFormat('hu-HU',{year:'numeric',month:'long',day:'numeric'}).format(date);
      days+=`<button type="button" class="calendar-day calendar-day--${status}${selected?' selected':''}" ${unavailable?'disabled':''} aria-label="${label}${unavailable?' – nem választható':' – mintaidőpont'}" aria-pressed="${selected}" data-demo-date="${key}">${day}</button>`;
    }
    let slots='';
    if(this.state.selectedDate) {
      slots='<div class="demo-slots" role="group" aria-label="Mintaidőpont választása">'+[9,11,13].filter(h=>h*60+this.state.requiredDuration<=18*60).map(hour=>{
        const value=`${String(hour).padStart(2,'0')}:00`;
        const selected=this.state.selectedSlot?.startTime===value;
        return `<button type="button" data-demo-hour="${hour}" class="${selected?'selected':''}" aria-pressed="${selected}">${value}</button>`;
      }).join('')+'</div>';
      if(this.state.selectedSlot) slots+=`<p class="demo-date-confirmation" role="status">Mintaidőpont kiválasztva: ${this.state.selectedDate} · ${this.state.selectedSlot.startTime}–${this.state.selectedSlot.endTime}</p>`;
    }
    const legend='<div class="calendar-legend" role="list" aria-label="Színkódok"><span role="listitem"><i class="calendar-legend-swatch calendar-legend-swatch--free"></i>Szabad nap</span><span role="listitem"><i class="calendar-legend-swatch calendar-legend-swatch--partial"></i>Részben foglalt</span><span role="listitem"><i class="calendar-legend-swatch calendar-legend-swatch--full"></i>Foglalt</span></div>';
    this.container.innerHTML=`<div class="demo-calendar"><div class="demo-calendar-top"><button type="button" class="calendar-month-button" data-month="previous" aria-label="Előző hónap" ${this.state.monthOffset===0?'disabled':''}>←</button><strong aria-live="polite">${title}</strong><button type="button" class="calendar-month-button" data-month="next" aria-label="Következő hónap" ${this.state.monthOffset===2?'disabled':''}>→</button></div><div class="demo-calendar-grid">${days}</div>${slots}${legend}</div>`;
    this.container.querySelector('[data-month="previous"]').onclick=()=>this.previousMonth();
    this.container.querySelector('[data-month="next"]').onclick=()=>this.nextMonth();
    this.container.querySelectorAll('[data-demo-date]').forEach(button=>button.onclick=()=>this.selectDate(button.dataset.demoDate));
    this.container.querySelectorAll('[data-demo-hour]').forEach(button=>button.onclick=()=>this.selectSlot(Number(button.dataset.demoHour)));
  }
};
