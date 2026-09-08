import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('./configurator.js', import.meta.url), 'utf8');
const context = vm.createContext({ Intl });
vm.runInContext(source, context);
const pricing = context.EcoMediterraneanPricing;
const item = (id, variant, quantity = 1, extra = {}) => ({ id, variant, quantity, ...extra });
const amount = (id, variant) => pricing.catalog.find(p => p.id === id).variants.find(v => v.id === variant).price;

test('every regional tariff matches all fourteen original pages', () => {
  for (const city of Object.keys(pricing.cities)) {
    const upholstery = readFileSync(new URL(`../../karpittisztitas-${city}.html`, import.meta.url), 'utf8');
    const mattress = readFileSync(new URL(`../../matractisztitas-${city}.html`, import.meta.url), 'utf8');
    const values = text => [...text.matchAll(/class="price-highlight">([^<]+)/g)].map(m => Number(m[1].replace(/[^0-9]/g, '')));
    assert.deepEqual(values(upholstery), [amount('sectional-sofa', 'l'), amount('sectional-sofa', 'u'), amount('straight-sofa', 'sofabed'), amount('armchair', 'standard'), amount('diningchair', 'standard'), amount('officechair', 'standard'), 3500, 4000, 4500, 5500], city);
    assert.deepEqual(values(mattress), [amount('mattress', 'single-a'), amount('mattress', 'double-a'), amount('mattress', 'queen-a'), amount('mattress', 'king-a'), amount('mattress', 'child-a'), 5000, 3500, 4000, 4500, 5500], city);
    const twoSides = [...mattress.matchAll(/Kétoldalas: ([0-9.]+) Ft/g)].map(m => Number(m[1].replaceAll('.', '')));
    assert.deepEqual(twoSides, ['single-ab', 'double-ab', 'queen-ab', 'king-ab', 'child-ab'].map(id => amount('mattress', id)), city + ' two sides');
  }
});

test('shared upholstery, travel, and extras agree with the production index calculator', () => {
  const original = readFileSync(new URL('../../release-support/booking-live.js', import.meta.url), 'utf8');
  const constants = original.slice(original.indexOf('const PRICING ='), original.indexOf('// ═', original.indexOf('const State =')));
  const originalContext = vm.createContext({});
  vm.runInContext(constants + '; globalThis.rates = {PRICING, UPSELLS, DISCOUNTS}', originalContext);
  const rates = originalContext.rates;
  for (const [id, variant, originalId] of [['sectional-sofa', 'l', 'l_kanape'], ['sectional-sofa', 'u', 'u_kanape'], ['straight-sofa', 'sofa', 'szofa'], ['armchair', 'standard', 'fotel'], ['diningchair', 'standard', 'ebedlo_szek'], ['officechair', 'standard', 'irodai_szek']]) assert.equal(amount(id, variant), rates.PRICING.karpit[originalId].price);
  for (const [id, zone] of Object.entries(pricing.travelZones)) assert.equal(zone.fee, rates.PRICING.travelZones[id].fee);
  assert.equal(pricing.extras.stain.price, rates.UPSELLS.karpit.folteltavolitas.price);
  assert.equal(pricing.extras.protection.price, rates.UPSELLS.karpit.impregnalas.price);
  assert.equal(pricing.extras.deodorizing.price, rates.UPSELLS.karpit.szagtalanitas.price);
  assert.equal(pricing.extras.wet.price, rates.UPSELLS.matrac.nedves_tisztitas.price);
  assert.equal(pricing.extras.frame.price, rates.UPSELLS.matrac.agykeret.price);
});

test('empty estimate never charges travel or orphan extras', () => {
  const result = pricing.calculate({ items: [], travelZone: '40km', extras: { wet: true, stain: true, protection: true } });
  assert.equal(result.total, 0);
  assert.equal(result.travelFee, 0);
  assert.equal(result.hasItems, false);
  assert.equal(result.minimumFee, null);
});

test('one armchair includes the selected travel fee with no discount', () => {
  const result = pricing.calculate({ items: [item('armchair', 'standard')], travelZone: 'belvaros' });
  assert.equal(result.total, 10000);
  assert.equal(result.discount, 0);
  assert.equal(result.travelIncluded, true);
});

test('three dining chairs apply the existing non-stacking five percent reduction after travel', () => {
  const result = pricing.calculate({ items: [item('diningchair', 'standard', 3)], travelZone: 'kulso' });
  assert.equal(result.subtotal, 14500);
  assert.equal(result.discount, 725);
  assert.equal(result.total, 13775);
});

test('mixed furniture and mattresses select ten percent instead of stacking discounts', () => {
  const result = pricing.calculate({ items: [item('armchair', 'standard'), item('mattress', 'queen-ab', 2)], travelZone: '20km' });
  assert.equal(result.subtotal, 43000);
  assert.equal(result.discountPercent, 10);
  assert.equal(result.total, 38700);
});

test('mattress wet treatment is charged for each selected side of every selected mattress', () => {
  const result = pricing.calculate({ items: [item('mattress', 'king-ab', 2), item('mattress', 'single-a')], extras: { wet: true, frame: true } });
  assert.equal(result.counts.sides, 5);
  assert.equal(result.serviceSubtotal, 78000); // 44k base + 25k wet + 9k frames.
  assert.equal(result.total, 74100);
});

test('sofa extras use existing fixed seat counts and optional surfaces separately', () => {
  const result = pricing.calculate({ items: [item('sectional-sofa', 'l', 1, { mite: true, sleepSurface: true })], extras: { stain: true, protection: true, deodorizing: true } });
  assert.equal(result.total, 41000); // 17.5k + 5k + 5k + 4×2k + 3k + 2.5k.
  assert.equal(result.counts.seats, 4);
});

test('regional sofa-bed tariff is not charged a second sleeping-surface add-on', () => {
  assert.equal(pricing.calculate({ items: [item('straight-sofa', 'sofabed', 1, { sleepSurface: true })] }).total, 17500);
});

test('different sizes remain distinct line items and input state is unchanged', () => {
  const selection = { items: [item('mattress', 'child-ab'), item('mattress', 'double-a')], extras: {} };
  const before = JSON.stringify(selection);
  const result = pricing.calculate(selection);
  assert.equal(result.lines.filter(line => line.kind === 'item').length, 2);
  assert.equal(result.total, 18000);
  assert.equal(JSON.stringify(selection), before);
});

test('malformed selections cannot yield NaN, negative totals, or unknown tariffs', () => {
  for (const quantity of [-1, 0.5, 100, NaN, Infinity, '2']) assert.throws(() => pricing.calculate({ items: [item('armchair', 'standard', quantity)] }));
  assert.throws(() => pricing.calculate({ items: [item('unknown', 'standard')] }));
  assert.throws(() => pricing.calculate({ travelZone: 'unknown' }));
});

test('the estimate module has no outbound requests or unsupported storage transfer', () => {
  assert.equal(/\b(?:fetch|XMLHttpRequest|sendBeacon|sessionStorage|localStorage)\b/.test(source), false);
  assert.doesNotMatch(source, /index\.html#booking|data-booking-url|bookingUrl/);
  assert.match(source, /tel:\+36702408141/);
});

test('email inquiry preserves city, variants, extras, travel, discount and estimate', () => {
  const selection = {city:'kiskoros', items:[item('armchair','standard'),item('mattress','king-ab')],travelZone:'belvaros',extras:{wet:true}};
  const inquiry = pricing.createInquiry(selection);
  assert.equal(inquiry.recipient, 'info@ecocleantisztito.hu');
  assert.match(inquiry.subject, /Kiskőrös/);
  for (const line of pricing.calculate(selection).lines) assert.ok(inquiry.body.includes(line.label + ': ' + pricing.formatMoney(line.amount)));
  assert.ok(inquiry.body.includes(pricing.formatMoney(34200)));
  assert.match(inquiry.body, /nem időpontfoglalás/);
  const url = new URL(inquiry.href);
  assert.equal(url.protocol,'mailto:');
  assert.equal(url.pathname,inquiry.recipient);
  assert.equal(url.searchParams.get('subject'),inquiry.subject);
  assert.equal(url.searchParams.get('body'),inquiry.body);
});

test('email inquiry requires furniture and a supported city; missing travel is explicit', () => {
  assert.equal(pricing.createInquiry({city:'baja',items:[]}),null);
  assert.equal(pricing.createInquiry({items:[item('armchair','standard')]}),null);
  assert.equal(pricing.createInquiry({city:'unknown',items:[item('armchair','standard')]}),null);
  const inquiry=pricing.createInquiry({city:'baja',items:[item('armchair','standard')]});
  assert.match(inquiry.body,/Kiszállási körzet: még nincs kiválasztva/);
  assert.match(inquiry.body,/kiszállás nélkül/);
  assert.match(inquiry.body,/Telefonszám:/);
});
