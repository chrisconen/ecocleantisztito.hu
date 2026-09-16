// AXR workflow fix: Respond Error template-bug es rossz-forras kerulese.
// A valasz-objektum osszeallitasa itt tortenik JS-ben, a Respond Error
// node csak tovabbitja a $json-t. A Brain elutasitasi return-jei
// adjak az ertekeket; ha valami hianyzik (pl. fallback ag), ertelmes
// default keletkezik.
//
// i18n: The Brain keeps producing Hungarian prose — it owns the booking logic
// and is not worth destabilising. Every rejection branch also returns a machine
// `error` code plus structured `details`, so the English wording is rebuilt here
// from those instead of translating the Hungarian sentence.

const brain = $('The Brain (Logic)').first().json;

// Language comes straight from the webhook payload: the normalizer does not
// carry it, and nothing downstream consumes its hardcoded 'hu'.
let language = 'hu';
try {
  const wh = $('Webhook').first().json;
  language = ((wh.body || wh).lang === 'en') ? 'en' : 'hu';
} catch (e) { /* keep hu */ }
const EN = language === 'en';

const d = brain.details || {};
const EN_MESSAGES = {
  OUT_OF_SERVICE_AREA: () =>
    'We could not match this address to a service zone, or it falls outside the area we cover. Please contact us directly.',
  ZONE_INCOMPATIBLE: () =>
    d.dayZone === 'BALATON' || d.requestedZone === 'BALATON'
      ? 'Because the Lake Balaton region is so large, we can only combine it with other bookings around the lake on the same day. Please choose another day.'
      : `This day is already reserved for the "${d.dayZoneName || d.dayZone}" region. Your location ("${d.requestedZoneName || d.requestedZone}") is too far away to combine into the same day.`,
  DAY_FULL: () =>
    `Unfortunately this job no longer fits into the day. The earliest possible start would be ${d.earliestPossibleStart}, but the work would run until ${d.projectedFinish} (we finish at ${d.workEnd}).`,
};

const EN_SUGGESTIONS = {
  CONTACT_SUPPORT: 'Please contact us directly, or give us a more precise address including the postcode.',
  SHOW_ALTERNATIVE_DATES: 'Please choose another day.',
  SHOW_NEXT_AVAILABLE: 'Please choose another day.',
};

const errorCode = brain.error || 'unknown_error';
const suggestion = brain.suggestion || {};

const message = EN
  ? (EN_MESSAGES[errorCode] ? EN_MESSAGES[errorCode]() : 'This appointment cannot be booked.')
  : (brain.message || 'Az időpont nem foglalható.');

const suggestionOut = EN
  ? { ...suggestion, message: EN_SUGGESTIONS[suggestion.action] || 'Please choose another day.' }
  : suggestion;

return [{
  json: {
    available: false,
    error: errorCode,
    message: message,
    language: language,
    details: d,
    suggestion: suggestionOut
  }
}];
