/* Matractisztítás cégeknek: interakciók. Adat csak akkor hagyja el a böngészőt, ha a látogató elküldi az ajánlatkérést. */
document.documentElement.classList.add('hx-js');
document.addEventListener('DOMContentLoaded', () => {
  const reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;
  const MAIL = 'info@ecocleantisztito.hu';
  const ENDPOINT = 'https://hub.centaur-lang.dev/webhook/b2b-ajanlatkeres-hu';
  const fmt = (v, dec) => v.toLocaleString('hu-HU', { minimumFractionDigits: dec, maximumFractionDigits: dec });

  // Megjelenés görgetéskor
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
  }), { rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('.hx-reveal').forEach(el => io.observe(el));

  // Számláló (a HTML-ben álló érték a végérték)
  const cio = new IntersectionObserver(entries => entries.forEach(e => {
    if (!e.isIntersecting) return;
    cio.unobserve(e.target);
    const el = e.target, end = Number(el.dataset.count), dec = Number(el.dataset.dec || 0), t0 = performance.now();
    const tick = t => {
      const k = Math.min(1, (t - t0) / 1400);
      el.textContent = fmt(end * (1 - Math.pow(1 - k, 3)), dec);
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }), { threshold: 0.6 });
  if (!reduce) document.querySelectorAll('[data-count]').forEach(el => cio.observe(el));

  // Fülek (szálláshelytípusok)
  document.querySelectorAll('[data-tabs]').forEach(root => {
    const tabs = [...root.querySelectorAll('[role=tab]')];
    const select = tab => tabs.forEach(t => {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
    });
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => select(t));
      t.addEventListener('keydown', e => {
        const d = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
        if (!d) return;
        e.preventDefault();
        const next = tabs[(i + d + tabs.length) % tabs.length];
        select(next); next.focus();
      });
    });
  });

  // Jogi háttér szűrése
  document.querySelectorAll('[data-law-filter]').forEach(bar => {
    const cards = document.querySelectorAll('[data-for]');
    bar.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b) return;
      bar.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      const k = b.dataset.key;
      cards.forEach(c => c.classList.toggle('is-dim', k !== 'all' && !c.dataset.for.split(' ').includes(k)));
    });
  });

  // Tanúsítvány-előnézet (mindig MINTA vízjellel)
  const d = new Date();
  const today = `${d.getFullYear()}. ${String(d.getMonth() + 1).padStart(2, '0')}. ${String(d.getDate()).padStart(2, '0')}.`;
  document.querySelectorAll('[data-cert-date]').forEach(n => { n.textContent = today; });
  const certNames = document.querySelectorAll('[data-cert-name]');
  const certInputs = document.querySelectorAll('[data-cert-input]');
  const setName = (value, source) => {
    const v = value.trim().slice(0, 60);
    certNames.forEach(n => {
      n.textContent = v || n.dataset.default;
      const len = (v || n.dataset.default).length;
      n.style.fontSize = Math.min(4.2, 4.2 * 24 / Math.max(24, len)).toFixed(2) + 'cqi';
    });
    certInputs.forEach(i => { if (i !== source) i.value = value; });
  };
  certInputs.forEach(i => i.addEventListener('input', () => setName(i.value, i)));
  if (!reduce) document.querySelectorAll('[data-tilt]').forEach(paper => {
    const stage = paper.parentElement;
    stage.addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse') return;
      const r = paper.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      paper.style.setProperty('--ry', (x * 9).toFixed(2) + 'deg');
      paper.style.setProperty('--rx', (-y * 7).toFixed(2) + 'deg');
      paper.style.setProperty('--sheen', (120 - (x + 0.5) * 140).toFixed(0) + '%');
    });
    stage.addEventListener('pointerleave', () => { paper.style.setProperty('--ry', '0deg'); paper.style.setProperty('--rx', '0deg'); });
  });

  // Tanúsítvány nagyban
  const certDialog = document.querySelector('.hx-dialog');
  document.querySelectorAll('[data-open-cert]').forEach(b => b.addEventListener('click', () => certDialog?.showModal()));
  certDialog?.addEventListener('click', e => { if (e.target === certDialog || e.target.closest('[data-close]')) certDialog.close(); });

  // Munkafolyamat: haladásjelző görgetéskor
  const steps = [...document.querySelectorAll('.hx-step')];
  const bar = document.querySelector('.hx-progress');
  if (steps.length && bar) {
    const now = document.querySelector('[data-step-now]');
    let ticking = false;
    const update = () => {
      ticking = false;
      const list = steps[0].parentElement.getBoundingClientRect();
      const mid = innerHeight * 0.55;
      bar.style.setProperty('--p', Math.min(1, Math.max(0, (mid - list.top) / list.height)).toFixed(3));
      let cur = 0;
      steps.forEach((s, i) => { if (s.getBoundingClientRect().top < mid) cur = i; });
      steps.forEach((s, i) => s.classList.toggle('is-active', i === cur));
      if (now) now.textContent = String(cur + 1).padStart(2, '0');
    };
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    update();
  }

  // Magyarország-térkép
  document.querySelectorAll('[data-map]').forEach(root => {
    const data = JSON.parse(root.querySelector('script[type="application/json"]').textContent);
    const links = [...root.querySelectorAll('svg path[data-key]')];
    const card = root.querySelector('[data-map-card]');
    const f = k => card.querySelector(`[data-f="${k}"]`);
    const show = key => {
      const r = data[key];
      if (!r) return;
      links.forEach(a => a.classList.toggle('is-on', a.dataset.key === key));
      root.querySelectorAll('svg text').forEach(t => t.classList.toggle('is-on', t.dataset.key === key));
      f('name').textContent = r.name;
      f('text').textContent = r.text;
      f('places').replaceChildren(...r.places.map(p => Object.assign(document.createElement('li'), { textContent: p })));
      f('link').href = r.href;
      f('link').firstChild.textContent = r.cta + ' ';
    };
    links.forEach(a => {
      a.addEventListener('mouseenter', () => show(a.dataset.key));
      a.addEventListener('focus', () => show(a.dataset.key));
      a.addEventListener('click', () => { location.href = a.dataset.href; });
      a.addEventListener('keydown', e => { if (e.key === 'Enter') location.href = a.dataset.href; });
    });
  });

  // Ajánlatkérő → n8n („ECO Clean - B2B ajánlatkérés HU”); a levelezőprogramos út tartalék marad.
  const form = document.querySelector('[data-plan]');
  if (form) {
    const q = s => form.querySelector(s);
    const range = q('[name=menge-range]'), qty = q('[name=menge]'), dbl = q('[name=doppel]'), county = q('[name=varmegye]');
    const sum = document.querySelector('[data-summary]');
    const sf = k => sum.querySelector(`[data-s="${k}"]`);
    const send = sum.querySelector('[data-send]');
    const mailto = sum.querySelector('[data-mailto]');
    const checked = name => [...form.querySelectorAll(`[name="${name}"]:checked`)].map(i => i.value);
    const minimum = () => Number(county.selectedOptions[0]?.dataset.min || form.dataset.min || 10);
    range.addEventListener('input', () => { qty.value = range.value; });
    qty.addEventListener('input', () => { range.value = Math.max(Number(range.min), Math.min(Number(range.max), Number(qty.value) || 0)); });
    let body = '';
    const update = () => {
      const MIN = minimum();
      const n = Math.max(0, Math.floor(Number(qty.value) || 0));
      const dn = Math.min(n, Math.max(0, Math.floor(Number(dbl.value) || 0)));
      const ok = n >= MIN;
      const type = checked('art')[0] || '—';
      const region = county.value;
      const ort = q('[name=ort]').value.trim();
      const months = checked('honap');
      const extras = checked('extra');
      const house = q('[name=haz]').value.trim();
      sf('n').textContent = n;
      sf('type').textContent = type;
      sf('where').textContent = [ort, region].filter(Boolean).join(', ') || '—';
      sf('when').textContent = months.length ? months.join(', ') : 'rugalmas';
      sf('dbl').textContent = dn ? `${dn} franciaágy · ${n - dn} egyszemélyes` : `${n} egyszemélyes/vegyes`;
      sf('extra').textContent = extras.length ? extras.length + ' kiválasztva' : 'nincs';
      const min = q('[data-min-note]');
      min.classList.toggle('ok', ok);
      min.textContent = ok ? `✓ Elérted a minimumot – ${n} matrac` : `${region ? region + ': ' : ''}${MIN} matractól vállaljuk objektumonként – még ${MIN - n} hiányzik.`;
      body = [
        'Ajánlatkérés: céges matractisztítás tanúsítvánnyal', '',
        `Szálláshely: ${house || '—'}`,
        `Típus: ${type}`,
        `Vármegye / település: ${[region, ort].filter(Boolean).join(', ') || '—'}`,
        `Matracok száma: ${n}${dn ? ` (ebből ${dn} franciaágy)` : ''}`,
        `Kiegészítők: ${extras.length ? extras.join('; ') : 'nincs'}`,
        `Időszak: ${months.length ? months.join(', ') : 'rugalmas'}`,
        '',
        `Kapcsolattartó: ${q('[name=person]').value.trim() || '—'}`,
        `E-mail: ${q('[name=email]').value.trim() || '—'}`,
        `Telefon: ${q('[name=tel]').value.trim() || '—'}`,
        '', `Üzenet: ${q('[name=uzenet]').value.trim() || '—'}`,
        '', `(Küldve innen: ${location.href.split('#')[0]})`
      ].join('\n');
      const subject = `Ajánlatkérés matractisztítás: ${house || type} – ${n} matrac${region ? ', ' + region : ''}`;
      mailto.href = `mailto:${MAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      send.setAttribute('aria-disabled', String(!ok));
    };
    form.addEventListener('input', update);
    form.addEventListener('change', update);
    const status = sum.querySelector('[data-status]');
    const done = sum.querySelector('[data-done]');
    form.addEventListener('submit', async e => {
      e.preventDefault();
      if (send.getAttribute('aria-disabled') === 'true' || send.disabled) return;
      const email = q('[name=email]').value.trim(), tel = q('[name=tel]').value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) && tel.replace(/\D/g, '').length < 6) {
        status.textContent = 'Adj meg e-mail-címet vagy telefonszámot, hogy válaszolni tudjunk.';
        q(email ? '[name=email]' : '[name=tel]').focus();
        return;
      }
      const payload = {
        haz: q('[name=haz]').value, art: checked('art')[0] || '', varmegye: county.value, telepules: q('[name=ort]').value,
        menge: Number(qty.value) || 0, doppel: Number(dbl.value) || 0, extras: checked('extra'), honapok: checked('honap'),
        person: q('[name=person]').value, email, tel, uzenet: q('[name=uzenet]').value,
        oldal: location.href.split('#')[0], website: q('[name=website]').value
      };
      send.disabled = true;
      status.textContent = 'Küldés …';
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 15000);
      try {
        const res = await fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: ctrl.signal });
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error('rejected');
        status.textContent = '';
        done.hidden = false;
        send.hidden = true;
        done.focus();
      } catch {
        send.disabled = false;
        status.textContent = 'A küldés most nem sikerült. Használd a „Küldés levelezőprogrammal” lehetőséget, vagy hívj minket.';
      } finally {
        clearTimeout(timer);
      }
    });
    sum.querySelector('[data-copy]').addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(body);
        status.textContent = `Kimásolva. Küldd el a(z) ${MAIL} címre.`;
      } catch {
        status.textContent = `A másolás nem sikerült – írj nekünk: ${MAIL}`;
      }
    });
    update();
  }
});
