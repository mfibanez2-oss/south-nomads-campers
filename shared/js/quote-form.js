// "Get a Quote" widget — Camperworld-style lead-capture form: live price
// estimate (reusing the season/threshold logic from the old calculator.js)
// plus pickup/dropoff, contact info, and an age/license confirmation, ending
// in "Send by WhatsApp" / "Send by Email" instead of a payment step. No
// calendar, no automatic availability check, no card payment — those are
// intentionally out of scope for this flow; the booking engine backend
// (south-nomads-booking-api) stays built and ready for whenever that's
// wanted again.
(function () {

const WHATSAPP_NUMBER = '56923761438';
const OWNER_EMAIL = 'josefina@southnomadscampers.com';

const MONTH_NAMES = {
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  es: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
};

const STRINGS = {
  en: {
    total: 'Total trip cost', deposit: 'Deposit due (50%)', balance: 'Balance at pickup (50%)',
    perDay: (n) => `${n.toLocaleString('es-CL')} CLP/day`,
    flexible: 'My dates are flexible',
    pickupLabel: 'Pickup location', dropoffLabel: 'Drop-off location',
    nameLabel: 'Full name', emailLabel: 'Email', phoneLabel: 'Phone (WhatsApp)',
    ageLicense: "I am at least 25 years old and I possess a valid driver's license",
    sendWhatsapp: 'Send by WhatsApp', sendEmail: 'Send by Email',
    fillRequired: 'Please fill in your name, a valid email, and confirm the age/license checkbox.',
    hubFeeNote: (n) => (n > 0 ? `+ ${n.toLocaleString('es-CL')} CLP` : 'Free'),
    msgIntro: (model) => `Hi! I'd like a quote for the ${model}.`,
    msgDates: (month, days, flexible) => flexible ? `Dates: flexible, around ${month}` : `Dates: ${days} days, traveling in ${month}`,
    msgPickup: (v) => `Pickup: ${v}`,
    msgDropoff: (v) => `Drop-off: ${v}`,
    msgTotal: (v) => `Estimated total: ${v}`,
    msgDeposit: (v) => `Estimated deposit (50%): ${v}`,
    msgName: (v) => `Name: ${v}`,
    msgEmail: (v) => `Email: ${v}`,
    msgPhone: (v) => `Phone: ${v}`,
    emailSubject: (model) => `Quote request — ${model}`,
  },
  es: {
    total: 'Costo total del viaje', deposit: 'Depósito a pagar (50%)', balance: 'Saldo al retiro (50%)',
    perDay: (n) => `${n.toLocaleString('es-CL')} CLP/día`,
    flexible: 'Mis fechas son flexibles',
    pickupLabel: 'Lugar de retiro', dropoffLabel: 'Lugar de devolución',
    nameLabel: 'Nombre completo', emailLabel: 'Email', phoneLabel: 'Teléfono (WhatsApp)',
    ageLicense: 'Tengo al menos 25 años y poseo una licencia de conducir vigente',
    sendWhatsapp: 'Enviar por WhatsApp', sendEmail: 'Enviar por Email',
    fillRequired: 'Por favor completa tu nombre, un email válido, y confirma el checkbox de edad/licencia.',
    hubFeeNote: (n) => (n > 0 ? `+ $${n.toLocaleString('es-CL')} CLP` : 'Gratis'),
    msgIntro: (model) => `¡Hola! Quiero cotizar la ${model}.`,
    msgDates: (month, days, flexible) => flexible ? `Fechas: flexibles, alrededor de ${month}` : `Fechas: ${days} días, viajando en ${month}`,
    msgPickup: (v) => `Retiro: ${v}`,
    msgDropoff: (v) => `Devolución: ${v}`,
    msgTotal: (v) => `Total estimado: ${v}`,
    msgDeposit: (v) => `Depósito estimado (50%): ${v}`,
    msgName: (v) => `Nombre: ${v}`,
    msgEmail: (v) => `Email: ${v}`,
    msgPhone: (v) => `Teléfono: ${v}`,
    emailSubject: (model) => `Solicitud de cotización — ${model}`,
  },
};

function fmtCLP(n) {
  return '$' + Math.round(n).toLocaleString('es-CL') + ' CLP';
}

function seasonForMonth(month1to12, pricing) {
  for (const [key, season] of Object.entries(pricing.seasons)) {
    if (season.months.includes(month1to12)) return key;
  }
  return 'mid';
}

function computeQuote({ modelKey, month1to12, days, pricing }) {
  const model = pricing.models[modelKey];
  const season = seasonForMonth(month1to12, pricing);
  const band = model.rates[season];
  const overThreshold = days >= pricing.long_trip_threshold_days;
  const perDayCLP = overThreshold ? band.over_threshold_clp_per_day : band.under_threshold_clp_per_day;
  const totalCLP = perDayCLP * days;
  const depositCLP = totalCLP * pricing.deposit_percent;
  const balanceCLP = totalCLP - depositCLP;
  return { season, perDayCLP, totalCLP, depositCLP, balanceCLP };
}

async function initQuoteForm(el) {
  const modelKey = el.dataset.model;
  const modelName = el.dataset.modelName || modelKey;
  const lang = el.dataset.lang || 'en';
  const t = STRINGS[lang];

  const [pricing, hubs] = await Promise.all([
    fetch('shared/data/pricing.json').then((r) => r.json()),
    fetch('shared/data/hubs.json').then((r) => r.json()),
  ]);
  const model = pricing.models[modelKey];
  if (!model) return;

  const monthSelect = el.querySelector('[data-role="month"]');
  const dayPillsWrap = el.querySelector('[data-role="day-pills"]');
  const dayCustom = el.querySelector('[data-role="day-custom"]');
  const flexibleCheckbox = el.querySelector('[data-role="dates-flexible"]');
  const pickupSelect = el.querySelector('[data-role="pickup-hub"]');
  const dropoffSelect = el.querySelector('[data-role="dropoff-hub"]');
  const resultEl = el.querySelector('[data-role="result"]');
  const nameInput = el.querySelector('[data-role="cust-name"]');
  const emailInput = el.querySelector('[data-role="cust-email"]');
  const phoneInput = el.querySelector('[data-role="cust-phone"]');
  const ageCheckbox = el.querySelector('[data-role="age-license"]');
  const whatsappBtn = el.querySelector('[data-role="send-whatsapp"]');
  const emailBtn = el.querySelector('[data-role="send-email"]');

  const now = new Date();
  MONTH_NAMES[lang].forEach((name, i) => {
    const opt = document.createElement('option');
    opt.value = String(i + 1);
    opt.textContent = name;
    if (i === now.getMonth()) opt.selected = true;
    monthSelect.appendChild(opt);
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

  let selectedDays = pricing.day_presets.includes(14) ? 14 : pricing.day_presets[0];
  pricing.day_presets.forEach((d) => {
    const pill = document.createElement('button');
    pill.type = 'button';
    pill.className = 'pill-option' + (d === selectedDays ? ' active' : '');
    pill.textContent = String(d);
    pill.addEventListener('click', () => {
      selectedDays = d;
      dayCustom.value = '';
      dayPillsWrap.querySelectorAll('.pill-option').forEach((p) => p.classList.remove('active'));
      pill.classList.add('active');
      update();
    });
    dayPillsWrap.appendChild(pill);
  });

  dayCustom.addEventListener('input', () => {
    const n = parseInt(dayCustom.value, 10);
    if (n > 0) {
      selectedDays = n;
      dayPillsWrap.querySelectorAll('.pill-option').forEach((p) => p.classList.remove('active'));
      update();
    }
  });

  monthSelect.addEventListener('change', update);
  flexibleCheckbox.addEventListener('change', update);
  pickupSelect.addEventListener('change', update);
  dropoffSelect.addEventListener('change', update);

  function update() {
    const isFlexible = flexibleCheckbox.checked;
    dayPillsWrap.style.opacity = isFlexible ? '0.4' : '1';
    dayCustom.disabled = isFlexible;
    dayPillsWrap.querySelectorAll('.pill-option').forEach((p) => (p.disabled = isFlexible));

    const month1to12 = parseInt(monthSelect.value, 10);
    const quote = computeQuote({ modelKey, month1to12, days: selectedDays, pricing });
    const hubFee = hubs.hubs[pickupSelect.value].fee_clp + hubs.hubs[dropoffSelect.value].fee_clp;
    const totalWithHub = quote.totalCLP + hubFee;
    const depositWithHub = totalWithHub * pricing.deposit_percent;
    const balanceWithHub = totalWithHub - depositWithHub;

    resultEl.innerHTML = isFlexible
      ? `<div class="calc-rate-note">${t.perDay(quote.perDayCLP)} — ${t.flexible.toLowerCase()}</div>`
      : `
        <div class="calc-line"><span>${t.perDay(quote.perDayCLP)}</span><span></span></div>
        <div class="calc-line total"><span>${t.total}</span><span>${fmtCLP(totalWithHub)}</span></div>
        <div class="calc-line deposit"><span>${t.deposit}</span><span>${fmtCLP(depositWithHub)}</span></div>
        <div class="calc-line"><span>${t.balance}</span><span>${fmtCLP(balanceWithHub)}</span></div>
      `;

    const stickyPrice = document.querySelector('.sticky-bar [data-role="sticky-deposit"]');
    if (stickyPrice) stickyPrice.textContent = isFlexible ? t.perDay(quote.perDayCLP) : fmtCLP(depositWithHub);
  }

  function buildMessage() {
    const month1to12 = parseInt(monthSelect.value, 10);
    const monthName = MONTH_NAMES[lang][month1to12 - 1];
    const isFlexible = flexibleCheckbox.checked;
    const quote = computeQuote({ modelKey, month1to12, days: selectedDays, pricing });
    const hubFee = hubs.hubs[pickupSelect.value].fee_clp + hubs.hubs[dropoffSelect.value].fee_clp;
    const totalWithHub = quote.totalCLP + hubFee;
    const depositWithHub = totalWithHub * pricing.deposit_percent;
    const pickupLabel = lang === 'es' ? hubs.hubs[pickupSelect.value].label_es : hubs.hubs[pickupSelect.value].label_en;
    const dropoffLabel = lang === 'es' ? hubs.hubs[dropoffSelect.value].label_es : hubs.hubs[dropoffSelect.value].label_en;

    const lines = [
      t.msgIntro(modelName),
      t.msgDates(monthName, selectedDays, isFlexible),
      t.msgPickup(pickupLabel),
      t.msgDropoff(dropoffLabel),
    ];
    if (!isFlexible) {
      lines.push(t.msgTotal(fmtCLP(totalWithHub)), t.msgDeposit(fmtCLP(depositWithHub)));
    }
    lines.push(t.msgName(nameInput.value.trim()), t.msgEmail(emailInput.value.trim()));
    if (phoneInput.value.trim()) lines.push(t.msgPhone(phoneInput.value.trim()));
    return lines.join('\n');
  }

  function validate() {
    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!name || !emailValid || !ageCheckbox.checked) {
      alert(t.fillRequired);
      return false;
    }
    return true;
  }

  whatsappBtn.addEventListener('click', () => {
    if (!validate()) return;
    const message = buildMessage();
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, '_blank', 'noopener');
  });

  emailBtn.addEventListener('click', () => {
    if (!validate()) return;
    const message = buildMessage();
    const subject = t.emailSubject(modelName);
    window.location.href = `mailto:${OWNER_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
  });

  update();
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.quote-form[data-model]').forEach(initQuoteForm);
});

})();
