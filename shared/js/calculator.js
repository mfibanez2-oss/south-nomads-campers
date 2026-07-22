// Pricing calculator. Prices are fixed CLP-per-day rates (shared/data/pricing.json),
// matching the SumUp products created from that same table -- no live exchange-rate
// conversion, so what the site shows always matches what SumUp charges.
//
// Expected markup (see /en/campers/nomads-l.html for a full example):
// <div class="calculator" data-model="nomads-l" data-lang="en">
//   <select data-role="month"></select>
//   <div data-role="day-pills"></div>
//   <input type="number" data-role="day-custom">
//   <div data-role="result"></div>
// </div>

const MONTH_NAMES = {
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  es: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
};

const STRINGS = {
  en: {
    total: 'Total trip cost', deposit: 'Deposit due now (50%)', balance: 'Balance at pickup (50%)',
    pay: 'Pay Deposit Now', copy: 'Copy amount', copied: 'Copied!',
    perDay: (n) => `${n.toLocaleString('es-CL')} CLP/day`,
    productNote: (days) => `This product is priced per day — select quantity <strong>${days}</strong> at checkout, SumUp will total it automatically.`,
    fallbackNote: 'Copy the deposit amount above, then paste it into SumUp — this camper doesn\'t have a per-day product configured yet.'
  },
  es: {
    total: 'Costo total del viaje', deposit: 'Depósito a pagar ahora (50%)', balance: 'Saldo al retiro (50%)',
    pay: 'Pagar Depósito Ahora', copy: 'Copiar monto', copied: '¡Copiado!',
    perDay: (n) => `${n.toLocaleString('es-CL')} CLP/día`,
    productNote: (days) => `Este producto se cobra por día — selecciona cantidad <strong>${days}</strong> al pagar, SumUp calcula el total automáticamente.`,
    fallbackNote: 'Copia el monto del depósito de arriba y pégalo en SumUp — esta camper todavía no tiene un producto por día configurado.'
  }
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
  const sumupProduct = overThreshold ? band.sumup_product_over_threshold : band.sumup_product_under_threshold;
  const totalCLP = perDayCLP * days;
  const depositCLP = totalCLP * pricing.deposit_percent;
  const balanceCLP = totalCLP - depositCLP;
  return { season, perDayCLP, totalCLP, depositCLP, balanceCLP, sumupProduct };
}

function renderResult(container, quote, model, lang, days) {
  const t = STRINGS[lang];
  const payLink = quote.sumupProduct || model.sumup_link;
  const note = quote.sumupProduct ? t.productNote(days) : t.fallbackNote;
  container.innerHTML = `
    <div class="calc-line"><span>${t.perDay(quote.perDayCLP)}</span><span></span></div>
    <div class="calc-line total"><span>${t.total}</span><span>${fmtCLP(quote.totalCLP)}</span></div>
    <div class="calc-line deposit"><span>${t.deposit}</span><span id="calc-deposit-amount">${fmtCLP(quote.depositCLP)}</span></div>
    <div class="calc-line"><span>${t.balance}</span><span>${fmtCLP(quote.balanceCLP)}</span></div>
    <div class="calc-rate-note">${note}</div>
    <div class="calc-row" style="margin-top:16px; margin-bottom:0;">
      <a class="btn btn-primary btn-block" id="calc-pay-btn" href="${payLink}" target="_blank" rel="noopener">${t.pay}</a>
      <button class="copy-btn" id="calc-copy-btn" type="button">${t.copy}</button>
    </div>
  `;
  const copyBtn = container.querySelector('#calc-copy-btn');
  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(Math.round(quote.depositCLP).toString());
        copyBtn.textContent = t.copied;
        setTimeout(() => { copyBtn.textContent = t.copy; }, 1500);
      } catch (e) { /* clipboard unavailable, ignore */ }
    });
  }
}

async function initCalculator(el) {
  const modelKey = el.dataset.model;
  const lang = el.dataset.lang || 'en';

  const pricing = await fetch('shared/data/pricing.json').then((r) => r.json());
  const model = pricing.models[modelKey];
  if (!model) return;

  const monthSelect = el.querySelector('[data-role="month"]');
  const dayPillsWrap = el.querySelector('[data-role="day-pills"]');
  const dayCustom = el.querySelector('[data-role="day-custom"]');
  const resultEl = el.querySelector('[data-role="result"]');

  const now = new Date();
  MONTH_NAMES[lang].forEach((name, i) => {
    const opt = document.createElement('option');
    opt.value = String(i + 1);
    opt.textContent = name;
    if (i === now.getMonth()) opt.selected = true;
    monthSelect.appendChild(opt);
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

  function update() {
    const month1to12 = parseInt(monthSelect.value, 10);
    const quote = computeQuote({ modelKey, month1to12, days: selectedDays, pricing });
    renderResult(resultEl, quote, model, lang, selectedDays);
    const stickyPrice = document.querySelector('.sticky-bar [data-role="sticky-deposit"]');
    if (stickyPrice) stickyPrice.textContent = fmtCLP(quote.depositCLP);
  }

  update();
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.calculator[data-model]').forEach(initCalculator);
});
