// "Get a Quote" widget — Camperworld-style lead-capture form: live price
// estimate (reusing the season/threshold logic from the old calculator.js)
// plus camper type, real pickup/drop-off dates, hubs, and contact info. All
// fields are required except comments, specifically so every lead that
// reaches Josefina/Rodrigo has enough real info to call back and close the
// booking — no more "+1"-only phone numbers. Submitting fires an automatic
// email to the business (via the south-nomads-booking-api Worker's /contact
// endpoint) in addition to the WhatsApp/mailto action, so a lead always
// reaches the inbox even if the visitor's own device has no mail client
// configured. No calendar, no automatic availability check, no card
// payment — those are intentionally out of scope for this flow; the booking
// engine backend stays built and ready for whenever that's wanted again.
(function () {

const WHATSAPP_NUMBER = '56923761438';
const OWNER_EMAIL = 'josefina@southnomadscampers.com';
const WORKER_BASE_URL = location.hostname === 'localhost'
  ? 'http://localhost:8787'
  : 'https://south-nomads-booking-api.workers.dev'; // replace with the real *.workers.dev URL after `wrangler deploy`

const MONTH_NAMES = {
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  es: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
};

const MODEL_NAMES = { 'nomads-l': 'Nomads L', 'nomads-m': 'Nomads M' };

const STRINGS = {
  en: {
    total: 'Total trip cost', deposit: 'Deposit due (50%)', balance: 'Balance at pickup (50%)',
    perDay: (n) => `${n.toLocaleString('es-CL')} CLP/day`,
    camperLabel: 'Camper type', pickupDateLabel: 'Pickup date', dropoffDateLabel: 'Drop-off date',
    pickupLabel: 'Pickup location', dropoffLabel: 'Drop-off location',
    nameLabel: 'Full name', emailLabel: 'Email', phoneLabel: 'Phone (with country code)',
    commentsLabel: 'Tell us about your trip (optional)',
    ageLicense: "I am at least 25 years old and I possess a valid driver's license",
    sendWhatsapp: 'Send by WhatsApp', sendEmail: 'Send by Email',
    missingName: 'your full name', missingEmail: 'a valid email address',
    missingPhone: 'a complete phone number (with country and area code, not just a country code)',
    missingDates: 'valid pickup and drop-off dates (drop-off after pickup)',
    missingAge: 'the age/license confirmation',
    fillRequired: (items) => `Please fill in: ${items.join(', ')}.`,
    hubFeeNote: (n) => (n > 0 ? `+ ${n.toLocaleString('es-CL')} CLP` : 'Free'),
    msgIntro: (model) => `Hi! I'd like a quote for the ${model}.`,
    msgDates: (start, end) => `Dates: ${start} to ${end}`,
    msgPickup: (v) => `Pickup: ${v}`,
    msgDropoff: (v) => `Drop-off: ${v}`,
    msgTotal: (v) => `Estimated total: ${v}`,
    msgDeposit: (v) => `Estimated deposit (50%): ${v}`,
    msgName: (v) => `Name: ${v}`,
    msgEmail: (v) => `Email: ${v}`,
    msgPhone: (v) => `Phone: ${v}`,
    msgComments: (v) => `Comments: ${v}`,
    emailSubject: (model) => `Quote request — ${model}`,
  },
  es: {
    total: 'Costo total del viaje', deposit: 'Depósito a pagar (50%)', balance: 'Saldo al retiro (50%)',
    perDay: (n) => `${n.toLocaleString('es-CL')} CLP/día`,
    camperLabel: 'Tipo de camper', pickupDateLabel: 'Fecha de retiro', dropoffDateLabel: 'Fecha de devolución',
    pickupLabel: 'Lugar de retiro', dropoffLabel: 'Lugar de devolución',
    nameLabel: 'Nombre completo', emailLabel: 'Email', phoneLabel: 'Teléfono (con código de país)',
    commentsLabel: 'Contanos sobre tu viaje (opcional)',
    ageLicense: 'Tengo al menos 25 años y poseo una licencia de conducir vigente',
    sendWhatsapp: 'Enviar por WhatsApp', sendEmail: 'Enviar por Email',
    missingName: 'tu nombre completo', missingEmail: 'un email válido',
    missingPhone: 'un teléfono completo (con código de país y área, no solo el código de país)',
    missingDates: 'fechas de retiro y devolución válidas (devolución después del retiro)',
    missingAge: 'la confirmación de edad/licencia',
    fillRequired: (items) => `Por favor completa: ${items.join(', ')}.`,
    hubFeeNote: (n) => (n > 0 ? `+ $${n.toLocaleString('es-CL')} CLP` : 'Gratis'),
    msgIntro: (model) => `¡Hola! Quiero cotizar la ${model}.`,
    msgDates: (start, end) => `Fechas: ${start} a ${end}`,
    msgPickup: (v) => `Retiro: ${v}`,
    msgDropoff: (v) => `Devolución: ${v}`,
    msgTotal: (v) => `Total estimado: ${v}`,
    msgDeposit: (v) => `Depósito estimado (50%): ${v}`,
    msgName: (v) => `Nombre: ${v}`,
    msgEmail: (v) => `Email: ${v}`,
    msgPhone: (v) => `Teléfono: ${v}`,
    msgComments: (v) => `Comentarios: ${v}`,
    emailSubject: (model) => `Solicitud de cotización — ${model}`,
  },
};

function fmtCLP(n) {
  return '$' + Math.round(n).toLocaleString('es-CL') + ' CLP';
}

function pad(n) {
  return String(n).padStart(2, '0');
}

function todayISO() {
  const t = new Date();
  return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`;
}

function daysBetweenISO(startISO, endISO) {
  const start = new Date(startISO + 'T00:00:00Z');
  const end = new Date(endISO + 'T00:00:00Z');
  return Math.round((end - start) / 86400000);
}

function seasonForMonth(month1to12, pricing) {
  for (const [key, season] of Object.entries(pricing.seasons)) {
    if (season.months.includes(month1to12)) return key;
  }
  return 'mid';
}

function computeQuote({ modelKey, startISO, days, pricing }) {
  const model = pricing.models[modelKey];
  const month1to12 = parseInt(startISO.slice(5, 7), 10);
  const season = seasonForMonth(month1to12, pricing);
  const band = model.rates[season];
  const overThreshold = days >= pricing.long_trip_threshold_days;
  const perDayCLP = overThreshold ? band.over_threshold_clp_per_day : band.under_threshold_clp_per_day;
  const totalCLP = perDayCLP * days;
  const depositCLP = totalCLP * pricing.deposit_percent;
  const balanceCLP = totalCLP - depositCLP;
  return { season, perDayCLP, totalCLP, depositCLP, balanceCLP, days };
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Rejects inputs like "+1" or "+56" — requires enough digits for a real,
// complete phone number (country code + area code + subscriber number).
function isCompletePhone(phone) {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 8;
}

async function initQuoteForm(el) {
  const defaultModelKey = el.dataset.model;
  const lang = el.dataset.lang || 'en';
  const t = STRINGS[lang];

  const [pricing, hubs] = await Promise.all([
    fetch('shared/data/pricing.json').then((r) => r.json()),
    fetch('shared/data/hubs.json').then((r) => r.json()),
  ]);
  if (!pricing.models[defaultModelKey]) return;

  const camperSelect = el.querySelector('[data-role="camper-type"]');
  const pickupDateInput = el.querySelector('[data-role="pickup-date"]');
  const dropoffDateInput = el.querySelector('[data-role="dropoff-date"]');
  const pickupSelect = el.querySelector('[data-role="pickup-hub"]');
  const dropoffSelect = el.querySelector('[data-role="dropoff-hub"]');
  const resultEl = el.querySelector('[data-role="result"]');
  const nameInput = el.querySelector('[data-role="cust-name"]');
  const emailInput = el.querySelector('[data-role="cust-email"]');
  const phoneInput = el.querySelector('[data-role="cust-phone"]');
  const commentsInput = el.querySelector('[data-role="cust-comments"]');
  const ageCheckbox = el.querySelector('[data-role="age-license"]');
  const whatsappBtn = el.querySelector('[data-role="send-whatsapp"]');
  const emailBtn = el.querySelector('[data-role="send-email"]');

  Object.entries(MODEL_NAMES).forEach(([key, name]) => {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = name;
    if (key === defaultModelKey) opt.selected = true;
    camperSelect.appendChild(opt);
  });

  Object.entries(hubs.hubs).forEach(([key, hub]) => {
    const label = (lang === 'es' ? hub.label_es : hub.label_en) + ` (${t.hubFeeNote(hub.fee_clp)})`;
    [pickupSelect, dropoffSelect].forEach((select) => {
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = label;
      select.appendChild(opt);
    });
  });

  pickupDateInput.min = todayISO();
  pickupDateInput.addEventListener('change', () => {
    if (pickupDateInput.value) {
      const nextDay = new Date(pickupDateInput.value + 'T00:00:00Z');
      nextDay.setUTCDate(nextDay.getUTCDate() + 1);
      dropoffDateInput.min = nextDay.toISOString().slice(0, 10);
    }
    update();
  });
  dropoffDateInput.addEventListener('change', update);
  camperSelect.addEventListener('change', update);
  pickupSelect.addEventListener('change', update);
  dropoffSelect.addEventListener('change', update);

  function currentTrip() {
    const startISO = pickupDateInput.value;
    const endISO = dropoffDateInput.value;
    if (!startISO || !endISO) return null;
    const days = daysBetweenISO(startISO, endISO);
    if (days < 1) return null;
    return { startISO, endISO, days };
  }

  function update() {
    const trip = currentTrip();
    if (!trip) {
      resultEl.innerHTML = '';
      return;
    }
    const quote = computeQuote({ modelKey: camperSelect.value, startISO: trip.startISO, days: trip.days, pricing });
    const hubFee = hubs.hubs[pickupSelect.value].fee_clp + hubs.hubs[dropoffSelect.value].fee_clp;
    const totalWithHub = quote.totalCLP + hubFee;
    const depositWithHub = totalWithHub * pricing.deposit_percent;
    const balanceWithHub = totalWithHub - depositWithHub;

    resultEl.innerHTML = `
      <div class="calc-line"><span>${t.perDay(quote.perDayCLP)}</span><span></span></div>
      <div class="calc-line total"><span>${t.total}</span><span>${fmtCLP(totalWithHub)}</span></div>
      <div class="calc-line deposit"><span>${t.deposit}</span><span>${fmtCLP(depositWithHub)}</span></div>
      <div class="calc-line"><span>${t.balance}</span><span>${fmtCLP(balanceWithHub)}</span></div>
    `;

    const stickyPrice = document.querySelector('.sticky-bar [data-role="sticky-deposit"]');
    if (stickyPrice) stickyPrice.textContent = fmtCLP(depositWithHub);
  }

  function buildDetails() {
    const trip = currentTrip();
    const modelName = MODEL_NAMES[camperSelect.value];
    const pickupLabel = lang === 'es' ? hubs.hubs[pickupSelect.value].label_es : hubs.hubs[pickupSelect.value].label_en;
    const dropoffLabel = lang === 'es' ? hubs.hubs[dropoffSelect.value].label_es : hubs.hubs[dropoffSelect.value].label_en;
    const lines = [
      t.msgIntro(modelName),
      t.msgDates(trip.startISO, trip.endISO),
      t.msgPickup(pickupLabel),
      t.msgDropoff(dropoffLabel),
    ];
    if (trip) {
      const quote = computeQuote({ modelKey: camperSelect.value, startISO: trip.startISO, days: trip.days, pricing });
      const hubFee = hubs.hubs[pickupSelect.value].fee_clp + hubs.hubs[dropoffSelect.value].fee_clp;
      const totalWithHub = quote.totalCLP + hubFee;
      const depositWithHub = totalWithHub * pricing.deposit_percent;
      lines.push(t.msgTotal(fmtCLP(totalWithHub)), t.msgDeposit(fmtCLP(depositWithHub)));
    }
    lines.push(t.msgName(nameInput.value.trim()), t.msgEmail(emailInput.value.trim()), t.msgPhone(phoneInput.value.trim()));
    if (commentsInput.value.trim()) lines.push(t.msgComments(commentsInput.value.trim()));
    return { modelName, message: lines.join('\n') };
  }

  function validate() {
    const missing = [];
    if (!nameInput.value.trim()) missing.push(t.missingName);
    if (!isValidEmail(emailInput.value.trim())) missing.push(t.missingEmail);
    if (!isCompletePhone(phoneInput.value.trim())) missing.push(t.missingPhone);
    if (!currentTrip()) missing.push(t.missingDates);
    if (!ageCheckbox.checked) missing.push(t.missingAge);
    if (missing.length) {
      alert(t.fillRequired(missing));
      return false;
    }
    return true;
  }

  // Fire-and-forget: always try to get a reliable copy of the lead to the
  // business inbox, regardless of whether the visitor's own WhatsApp/mail
  // client actually completes sending afterward.
  function notifyOwners(modelName, message) {
    fetch(`${WORKER_BASE_URL}/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: nameInput.value.trim(),
        email: emailInput.value.trim(),
        phone: phoneInput.value.trim(),
        camper: modelName,
        message,
      }),
    }).catch(() => { /* best-effort only — WhatsApp/mailto is the visible fallback */ });
  }

  whatsappBtn.addEventListener('click', () => {
    if (!validate()) return;
    const { modelName, message } = buildDetails();
    notifyOwners(modelName, message);
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, '_blank', 'noopener');
  });

  emailBtn.addEventListener('click', () => {
    if (!validate()) return;
    const { modelName, message } = buildDetails();
    notifyOwners(modelName, message);
    const subject = t.emailSubject(modelName);
    window.location.href = `mailto:${OWNER_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
  });

  update();
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.quote-form[data-model]').forEach(initQuoteForm);
});

})();
