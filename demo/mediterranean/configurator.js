/* ECO Clean regional estimate. No network requests or booking writes. */
(function (global) {
  'use strict';

  const catalog = [
    { id: 'sectional-sofa', label: 'Sarokkanapé', image: 'living.webp', description: 'A közös esték tágas, kényelmes helye.', variants: [
      { id: 'l', label: 'L alakú kanapé', price: 17500, seats: 4 },
      { id: 'u', label: 'U alakú kanapé', price: 22500, seats: 6 }
    ] },
    { id: 'straight-sofa', label: 'Szófa és kanapéágy', image: 'sofa.webp', description: 'Mindennapi pihenéshez, vendégváráshoz.', variants: [
      { id: 'sofa', label: 'Szófa, heverő', price: 15500, seats: 3 },
      { id: 'sofabed', label: 'Kanapéágy', price: 17500, seats: 3 }
    ] },
    { id: 'armchair', label: 'Fotel', image: 'armchair.webp', description: 'A kedvenc olvasósarok puha középpontja.', variants: [
      { id: 'standard', label: 'Kárpitozott fotel', price: 6500, seats: 1 }
    ] },
    { id: 'diningchair', label: 'Ebédlőszék', image: 'dining.webp', description: 'Szebb teríték, ápolt kárpit, közös étkezések.', variants: [
      { id: 'standard', label: 'Kárpitozott ebédlőszék', price: 3500, seats: 1 }
    ] },
    { id: 'officechair', label: 'Irodai szék', image: 'office.webp', description: 'Frissebb munkakörnyezet, otthon és az irodában.', variants: [
      { id: 'standard', label: 'Kárpitozott irodai szék', price: 4000, seats: 1 }
    ] },
    { id: 'mattress', label: 'Matrac', image: 'bedroom.webp', description: 'A pihenés alapja, gondosan ápolva.', variants: [
      { id: 'single-a', label: '90 × 200 cm · egy oldal', price: 8000, sides: 1 },
      { id: 'single-ab', label: '90 × 200 cm · két oldal', price: 12000, sides: 2 },
      { id: 'double-a', label: '140 × 200 cm · egy oldal', price: 10000, sides: 1 },
      { id: 'double-ab', label: '140 × 200 cm · két oldal', price: 15000, sides: 2 },
      { id: 'queen-a', label: '160 × 200 cm · egy oldal', price: 12000, sides: 1 },
      { id: 'queen-ab', label: '160 × 200 cm · két oldal', price: 16000, sides: 2 },
      { id: 'king-a', label: '180 × 200 cm · egy oldal', price: 13000, sides: 1 },
      { id: 'king-ab', label: '180 × 200 cm · két oldal', price: 18000, sides: 2 },
      { id: 'child-a', label: 'Gyerekmatrac · egy oldal', price: 5000, sides: 1 },
      { id: 'child-ab', label: 'Gyerekmatrac · két oldal', price: 8000, sides: 2 }
    ] }
  ];
  const cities = { kalocsa: 'Kalocsa', baja: 'Baja', kiskoros: 'Kiskőrös', szekszard: 'Szekszárd', paks: 'Paks', solt: 'Solt', dunafoldvar: 'Dunaföldvár' };
  const travelZones = {
    belvaros: { label: 'Városon belül', fee: 3500 },
    kulso: { label: 'Külváros', fee: 4000 },
    '20km': { label: 'A város 10 km-es körzetében', fee: 4500 },
    '40km': { label: 'A város 20 km-es körzetében', fee: 5500 }
  };
  const extras = {
    stain: { label: 'Extra folteltávolítás a kárpiton', price: 2000, unit: 'ülőhely', category: 'upholstery', basis: 'seats' },
    protection: { label: 'Impregnálás', price: 3000, unit: 'bútor', category: 'upholstery', basis: 'upholstery' },
    deodorizing: { label: 'Szagtalanítás', price: 2500, unit: 'bútor', category: 'upholstery', basis: 'upholstery' },
    wet: { label: 'Matrac nedves tisztítása és foltkezelése', price: 5000, unit: 'oldal', category: 'mattress', basis: 'sides' },
    frame: { label: 'Ágykeret, fejtámla tisztítása', price: 3000, unit: 'matrac', category: 'mattress', basis: 'mattresses' }
  };
  function freezeDeep(value) {
    Object.values(value).forEach(v => { if (v && typeof v === 'object') freezeDeep(v); });
    return Object.freeze(value);
  }
  [catalog, cities, travelZones, extras].forEach(freezeDeep);
  const money = amount => new Intl.NumberFormat('hu-HU').format(amount) + ' Ft';
  const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  function calculate(selection = {}) {
    const lines = [];
    const counts = { upholstery: 0, mattresses: 0, seats: 0, sides: 0 };
    let subtotal = 0;
    const add = (label, amount, kind, key) => { subtotal += amount; lines.push({ label, amount, kind, key }); };
    for (const item of selection.items || []) {
      if (!Number.isSafeInteger(item.quantity) || item.quantity < 0 || item.quantity > 99) throw new RangeError('A darabszám 0 és 99 közötti egész szám lehet.');
      const product = catalog.find(p => p.id === item.id);
      const variant = product?.variants.find(v => v.id === item.variant);
      if (!variant) throw new RangeError('Ismeretlen bútortípus vagy méret.');
      if (!item.quantity) continue;
      const key = product.id + ':' + variant.id;
      add(item.quantity + ' × ' + (product.id === 'mattress' ? 'Matrac · ' : '') + variant.label, variant.price * item.quantity, 'item', key);
      if (variant.sides) {
        counts.mattresses += item.quantity;
        counts.sides += variant.sides * item.quantity;
      } else {
        counts.upholstery += item.quantity;
        counts.seats += variant.seats * item.quantity;
      }
      if (product.id === 'sectional-sofa' || product.id === 'straight-sofa') {
        if (item.mite) add('Száraz mélytisztítás · ' + variant.label + ' (' + item.quantity + ' db)', 5000 * item.quantity, 'extra', key);
        if (item.sleepSurface && variant.id !== 'sofabed') add('Ágyazható felület · ' + variant.label + ' (' + item.quantity + ' db)', 5000 * item.quantity, 'extra', key);
      }
    }
    for (const [id, extra] of Object.entries(extras)) {
      if (selection.extras?.[id] && counts[extra.basis]) {
        const units = counts[extra.basis];
        add(extra.label + ' (' + units + ' ' + extra.unit + ')', extra.price * units, 'extra', id);
      }
    }
    const serviceSubtotal = subtotal;
    const hasItems = counts.upholstery + counts.mattresses > 0;
    if (selection.travelZone && !travelZones[selection.travelZone]) throw new RangeError('Ismeretlen kiszállási körzet.');
    const travelFee = hasItems && selection.travelZone ? travelZones[selection.travelZone].fee : 0;
    if (travelFee) add('Kiszállás · ' + travelZones[selection.travelZone].label, travelFee, 'travel', selection.travelZone);
    // Keep the existing index calculation order: travel is included, discounts do not stack.
    const discountPercent = counts.upholstery && counts.mattresses ? 10 : counts.upholstery + counts.mattresses >= 3 ? 5 : 0;
    const discount = Math.round(subtotal * discountPercent / 100);
    if (discount) lines.push({ label: discountPercent === 10 ? 'Kárpit + matrac kedvezmény · 10%' : 'Legalább 3 bútor kedvezménye · 5%', amount: -discount, kind: 'discount' });
    return { lines, serviceSubtotal, travelFee, subtotal, discountPercent, discount, total: subtotal - discount, counts, hasItems, travelIncluded: hasItems && !!selection.travelZone, minimumFee: null };
  }

  function createInquiry(selection = {}) {
    const result = calculate(selection);
    if (!result.hasItems || !Object.hasOwn(cities, selection.city)) return null;
    const recipient = 'info@ecocleantisztito.hu';
    const subject = 'ECO Clean · Ajánlatkérés – ' + cities[selection.city];
    const body = [
      'Kedves ECO Clean!', '',
      'Az alábbi összeállításhoz szeretnék ajánlatot és időpontegyeztetést kérni.',
      'Település: ' + cities[selection.city],
      'Kiszállási körzet: ' + (travelZones[selection.travelZone]?.label || 'még nincs kiválasztva'), '',
      ...result.lines.map(line => line.label + ': ' + money(line.amount)), '',
      'Tájékoztató végösszeg: ' + money(result.total) + (result.travelIncluded ? ' (kiszállással együtt)' : ' (kiszállás nélkül)'),
      'A végleges árat és az időpontot külön egyeztetjük. Ez ajánlatkérés, nem időpontfoglalás.', '',
      'Név: ', 'Telefonszám: ', 'Tisztítás helyszíne: ', 'Megjegyzés / megfelelő időszak: ', '',
      'Köszönöm!'
    ].join('\r\n');
    return { recipient, subject, body, href: 'mailto:' + recipient + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body) };
  }

  let instanceCount = 0;
  function mount(root) {
    if (!root || root.nodeType !== 1) throw new TypeError('A konfigurátorhoz egy DOM-elem szükséges.');
    if (root.ecoMediterraneanConfigurator) return root.ecoMediterraneanConfigurator;
    const prefix = 'med-config-' + (++instanceCount);
    const assets = (root.dataset.assets || 'mediterranean/assets').replace(/\/$/, '');
    const state = { items: [], extras: {}, travelZone: '', city: cities[root.dataset.city] ? root.dataset.city : '' };
    const choices = Object.fromEntries(catalog.map(p => [p.id, p.variants[0].id]));
    root.classList.add('med-config');
    root.innerHTML = `<div class="med-config-layout"><div class="med-config-main"><div class="med-config-products">${catalog.map(product => `
      <article class="med-product" data-product="${product.id}">
        <img class="med-product-image" src="${escape(assets + '/' + product.image)}" alt="${escape(product.label)} egy mediterrán hangulatú, tervezett enteriőrben – generált illusztráció" width="960" height="720" loading="lazy" decoding="async">
        <div class="med-product-body"><h3>${product.label}</h3><p class="med-product-description">${product.description}</p>
        <p class="med-product-price" data-unit-price>${money(product.variants[0].price)}-tól / db</p>
        ${product.variants.length > 1 ? `<label class="med-config-field" for="${prefix}-${product.id}"><span>${product.id === 'mattress' ? 'Méret és tisztítandó oldalak' : 'Bútor kialakítása'}</span><select id="${prefix}-${product.id}" data-variant>${product.variants.map(v => `<option value="${v.id}">${v.label}</option>`).join('')}</select></label>` : `<p class="med-product-type">${product.variants[0].label}</p>`}
        <div class="med-config-quantity"><button type="button" data-delta="-1" aria-label="${product.label}: darabszám csökkentése" disabled>−</button><output aria-label="${product.label}: kiválasztott darabszám" data-count>0 db</output><button type="button" data-delta="1" aria-label="${product.label}: darabszám növelése">+</button></div>
        ${product.id.includes('sofa') ? `<div class="med-product-options"><label class="med-config-check"><input type="checkbox" data-item-extra="mite"><span>Száraz mélytisztítás<br><small>+ ${money(5000)} / db</small></span></label><label class="med-config-check" data-sleep-option><input type="checkbox" data-item-extra="sleepSurface"><span>Ágyazható felület tisztítása<br><small>+ ${money(5000)} / db</small></span></label></div>` : ''}
        </div></article>`).join('')}</div>
      <p class="med-config-note">Többféle matrac vagy kanapé? Válaszd ki a típust és a darabszámot, majd válts a következőre. A korábbi tételek az összesítőben megmaradnak. Egyedi méretet telefonon egyeztetünk.</p>
      <fieldset class="med-config-extras"><legend>Kiegészítő gondoskodás</legend><p class="med-config-note">A kijelölt kiegészítést minden érintett bútorra számoljuk. A szükséges kezelést a szövet és az állapot alapján egyeztetjük. A száraz mélytisztítás az árlistában száraz atkamentesítésként szerepel; az eljárás nem jelent garantált teljes atka- vagy allergénmentességet.</p>${Object.entries(extras).map(([id, extra]) => `<label class="med-config-check"><input type="checkbox" data-extra="${id}"><span>${extra.label}<small>+ ${money(extra.price)} / ${extra.unit}</small></span></label>`).join('')}<p class="med-config-note">A foltkezelés ülőhelyszámai a főoldali kalkulátor szerint: szófa 3, L kanapé 4, U kanapé 6, fotel és szék 1. Nedves matractisztításnál a száradás körülbelül 24 óra.</p></fieldset>
      <div class="med-config-location"><label class="med-config-field" for="${prefix}-city"><span>Hol segíthetünk?</span><select id="${prefix}-city" data-city-select><option value="">Válassz várost</option>${Object.entries(cities).map(([id, name]) => `<option value="${id}"${state.city === id ? ' selected' : ''}>${name}</option>`).join('')}</select></label><label class="med-config-field" for="${prefix}-zone"><span>Kiszállási körzet</span><select id="${prefix}-zone" data-zone><option value="">Válassz körzetet</option>${Object.entries(travelZones).map(([id, zone]) => `<option value="${id}">${zone.label} · ${money(zone.fee)}</option>`).join('')}</select></label></div>
      <details class="med-config-andante"><summary>ANDANTE és vízre érzékeny kárpitok</summary><p>A megfelelő tisztítási eljárást a kárpit anyaga határozza meg. Az ANDANTE bútorok egy részének speciális, impregnált vagy vízre érzékeny szövete nem tisztítható biztonságosan vizes extrakcióval. Kérünk, előzetesen ellenőrizd a tisztítási címkét, és egyeztesd velünk az anyagot.</p><p>A meglévő foglalási tájékoztató szerint ANDANTE vagy vízre érzékeny bútoranyag esetén a helyszíni kiszállás díjának 50%-a, legfeljebb 30 000 Ft kapacitás-foglalási díjként felszámításra kerülhet. Ez feltételes díj; a kalkuláció nem adja automatikusan a végösszeghez.</p></details>
      </div><aside class="med-config-summary" aria-label="Árkalkuláció összesítő"><span class="med-config-eyebrow">Az összeállításod</span><output class="med-config-total" aria-live="polite" aria-atomic="true">0 Ft</output><p class="med-config-summary-status"></p><ul class="med-config-breakdown"></ul><p class="med-config-note">Tájékoztató kalkuláció a közzétett induló árakból. A végleges árat a bútor mérete, anyaga és állapota alapján, a munka előtt egyeztetjük.</p><p class="med-config-note med-config-contact-note">Ezeken a településeken nincs online időpontfoglalás. Küldd el az összeállításodat e-mailben; felvesszük veled a kapcsolatot az ár és az időpont egyeztetéséhez.</p><div class="med-config-actions"><a class="med-config-button" data-email-inquiry role="link" aria-disabled="true" tabindex="-1">Ajánlatkérés e-mailben</a><a class="med-config-button med-config-button-secondary" href="tel:+36702408141">Egyeztetek telefonon</a></div><p class="med-config-note" data-email-help aria-live="polite"></p><details class="med-email-fallback"><summary>Másolható levélszöveg</summary><p class="med-config-note">Ha nem nyílik meg a leveleződ, másold a szöveget egy új levélbe. Címzett: <a href="mailto:info@ecocleantisztito.hu">info@ecocleantisztito.hu</a>.</p><label class="med-config-field" for="${prefix}-email"><span>Az ajánlatkérés szövege</span><textarea id="${prefix}-email" data-email-text readonly rows="8"></textarea></label><button class="med-config-button med-config-button-secondary" type="button" data-copy-inquiry disabled>Levélszöveg másolása</button><p class="med-config-note" data-copy-status role="status"></p></details><button class="med-config-reset" type="button" data-reset>Összeállítás törlése</button></aside></div>`;

    function currentItem(productId) {
      return state.items.find(item => item.id === productId && item.variant === choices[productId]);
    }
    function ensureItem(productId) {
      let item = currentItem(productId);
      if (!item) { item = { id: productId, variant: choices[productId], quantity: 0 }; state.items.push(item); }
      return item;
    }
    function update() {
      const result = calculate(state);
      const inquiry = createInquiry(state);
      const emailLink = root.querySelector('[data-email-inquiry]');
      emailLink.setAttribute('aria-disabled', String(!inquiry));
      emailLink.tabIndex = inquiry ? 0 : -1;
      if (inquiry) emailLink.href = inquiry.href;
      else emailLink.removeAttribute('href');
      root.querySelector('[data-email-text]').value = inquiry ? 'Címzett: ' + inquiry.recipient + '\r\nTárgy: ' + inquiry.subject + '\r\n\r\n' + inquiry.body : '';
      root.querySelector('[data-copy-inquiry]').disabled = !inquiry;
      root.querySelector('[data-copy-status]').textContent = '';
      root.querySelector('[data-email-help]').textContent = !result.hasItems ? 'Az ajánlatkéréshez válassz legalább egy bútort és egy települést.' : !inquiry ? 'Az ajánlatkéréshez válaszd ki a települést.' : 'A gomb a saját leveleződet nyitja meg az info@ecocleantisztito.hu címre előkészített levéllel. Írd hozzá a nevedet, telefonszámodat és a helyszínt, majd küldd el a leveleződből. Az oldal önmagában nem küld üzenetet és nem foglal időpontot.';
      root.querySelector('.med-config-total').textContent = money(result.total);
      root.querySelector('.med-config-summary-status').textContent = !result.hasItems ? 'Válaszd ki a bútorokat a kalkulációhoz.' : result.travelIncluded ? 'Kiszállással együtt · tájékoztató összeg' : 'Kiszállás nélkül · válassz körzetet';
      const list = root.querySelector('.med-config-breakdown');
      list.replaceChildren();
      result.lines.forEach(line => {
        const li = root.ownerDocument.createElement('li');
        li.className = 'med-config-line med-config-line-' + line.kind;
        const label = root.ownerDocument.createElement('span'); label.textContent = line.label;
        const price = root.ownerDocument.createElement('strong'); price.textContent = money(line.amount);
        li.append(label, price);
        if (line.kind === 'item') {
          const remove = root.ownerDocument.createElement('button'); remove.type = 'button'; remove.className = 'med-config-remove'; remove.dataset.remove = line.key; remove.setAttribute('aria-label', line.label + ' eltávolítása'); remove.textContent = 'Eltávolítás'; li.append(remove);
        }
        list.append(li);
      });
      for (const product of catalog) {
        const card = root.querySelector(`[data-product="${product.id}"]`);
        const item = currentItem(product.id);
        const count = item?.quantity || 0;
        const variant = product.variants.find(v => v.id === choices[product.id]);
        card.classList.toggle('is-selected', state.items.some(i => i.id === product.id && i.quantity > 0));
        card.querySelector('[data-count]').textContent = count + ' db';
        card.querySelector('[data-delta="-1"]').disabled = count === 0;
        card.querySelector('[data-delta="1"]').disabled = count === 99;
        card.querySelector('[data-unit-price]').textContent = money(variant.price) + '-tól / db';
        card.querySelectorAll('[data-item-extra]').forEach(input => { input.checked = !!item?.[input.dataset.itemExtra]; input.disabled = !count; });
        const sleepOption = card.querySelector('[data-sleep-option]');
        if (sleepOption) sleepOption.hidden = variant.id === 'sofabed';
      }
      root.dispatchEvent(new CustomEvent('med-config-change', { detail: result, bubbles: true }));
      return result;
    }
    root.addEventListener('click', async event => {
      if (event.target.closest('[data-email-inquiry][aria-disabled="true"]')) event.preventDefault();
      const button = event.target.closest('button');
      if (!button || !root.contains(button)) return;
      if (button.hasAttribute('data-copy-inquiry')) {
        const field = root.querySelector('[data-email-text]');
        const status = root.querySelector('[data-copy-status]');
        try {
          await global.navigator.clipboard.writeText(field.value);
          status.textContent = 'A levélszöveget másoltuk. Illeszd be a leveleződbe, egészítsd ki az elérhetőségeddel, majd küldd el.';
        } catch {
          field.focus(); field.select();
          status.textContent = 'Jelöltük a levélszöveget. Másold ki a készüléked másolás parancsával, majd illeszd be a leveleződbe.';
        }
      } else if (button.hasAttribute('data-delta')) {
        const item = ensureItem(button.closest('[data-product]').dataset.product);
        item.quantity = Math.min(99, Math.max(0, item.quantity + Number(button.dataset.delta)));
        update();
      } else if (button.dataset.remove) {
        state.items = state.items.filter(i => i.id + ':' + i.variant !== button.dataset.remove);
        update();
        root.querySelector('.med-config-reset').focus();
      } else if (button.hasAttribute('data-reset')) {
        state.items = []; state.extras = {};
        root.querySelectorAll('[data-extra]').forEach(input => { input.checked = false; });
        update();
      }
    });
    root.addEventListener('change', event => {
      const input = event.target;
      if (input.hasAttribute('data-variant')) choices[input.closest('[data-product]').dataset.product] = input.value;
      else if (input.hasAttribute('data-item-extra')) ensureItem(input.closest('[data-product]').dataset.product)[input.dataset.itemExtra] = input.checked;
      else if (input.hasAttribute('data-extra')) state.extras[input.dataset.extra] = input.checked;
      else if (input.hasAttribute('data-zone')) state.travelZone = input.value;
      else if (input.hasAttribute('data-city-select')) state.city = input.value;
      else return;
      update();
    });
    const instance = { getSelection: () => JSON.parse(JSON.stringify(state)), getEstimate: () => calculate(state) };
    root.ecoMediterraneanConfigurator = instance;
    update();
    return instance;
  }

  global.EcoMediterraneanPricing = Object.freeze({ catalog, cities, travelZones, extras, calculate, createInquiry, mount, formatMoney: money });
  if (typeof document !== 'undefined') {
    const start = () => document.querySelectorAll('[data-med-configurator]').forEach(mount);
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
    else start();
  }
})(typeof window !== 'undefined' ? window : globalThis);
