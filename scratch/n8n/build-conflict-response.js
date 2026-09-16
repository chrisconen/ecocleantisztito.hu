// AXR workflow fix: Respond Conflict template-bug kerulese.
// A valasz-objektum osszeallitasa itt tortenik JS-ben, a Respond
// Conflict node csak tovabbitja a $json-t. Igy fuggetlen vagyunk
// az n8n template-engine viselkedesetol.

const conflictInfo = $('Slot Still Free?').first().json.conflictInfo || {};

// Language comes straight from the webhook payload: the normalizer does not
// carry it, and nothing downstream consumes its hardcoded 'hu'.
let language = 'hu';
try {
  const wh = $('Webhook').first().json;
  language = ((wh.body || wh).lang === 'en') ? 'en' : 'hu';
} catch (e) { /* keep hu */ }

return [{
  json: {
    success: false,
    error: "SLOT_CONFLICT",
    message: language === 'en'
      ? "This time slot has just been taken. Please choose another one."
      : "Ez az időpont foglalt, kérjük válasszon másik időpontot!",
    language: language,
    conflictInfo: conflictInfo
  }
}];
