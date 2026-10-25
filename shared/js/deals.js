// Renders the Deals page from shared/data/deals.json into
// <div data-deals data-lang="en"></div>
//
// - A deal (or one of its date options) with status "sold" is shown as booked.
// - A deal whose pickup date has passed (Chile time) is hidden.
// - "I want this Deal" opens WhatsApp with a pre-filled message naming the deal and dates.

function fmtNumber(n, sep) {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, sep);
}

const DEALS_UI = {
  en: {
    save: 'You save',
    days: 'days',
    total: (n) => `total for ${n} days`,
    pickup: 'Pick-up',
    dropoff: 'Drop-off',
    startDay: 'Start day',
    endDay: 'End day',
    chooseDates: 'Choose your dates',
    more: 'More details',
    booked: 'Booked',
    soldOut: 'Sold out',
    spots: (n) => `${n} ${n === 1 ? 'spot' : 'spots'}`,
    button: 'I want this Deal',
    empty: 'There are no open Deals right now. New ones appear here when dates open up.',
    money: (n) => `CLP ${fmtNumber(n, ',')}`,
    waIntro: 'Hi South Nomads Campers! I want this Deal:',
    waOutro: 'Is it still available?',
    year: (label) => `${label}, 2026`,
    locale: 'en-US',
  },
  es: {
    save: 'Ahorro',
    days: 'días',
    total: (n) => `total por ${n} días`,
    pickup: 'Retiro',
    dropoff: 'Entrega',
    startDay: 'Día de inicio',
    endDay: 'Día de término',
    chooseDates: 'Elige tus fechas',
    more: 'Ver más detalles',
    booked: 'Reservado',
    soldOut: 'Agotado',
    spots: (n) => `${n} ${n === 1 ? 'cupo' : 'cupos'}`,
    button: 'Quiero este Deal',
    empty: 'No hay Deals abiertos por ahora. Cuando se liberen nuevas fechas, las publicaremos aquí.',
    money: (n) => `$${fmtNumber(n, '.')} CLP`,
    waIntro: 'Hola South Nomads Campers! Quiero este Deal:',
    waOutro: '¿Sigue disponible?',
    year: (label) => `${label} de 2026`,
    locale: 'es-CL',
  },
};

// Today's date in Chile as YYYY-MM-DD, so a deal does not disappear early or late for
// visitors in other time zones.
function todayInChile() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date());
}

// "2026-11-16" -> "Mon, Nov 16, 2026" / "lun, 16 nov 2026"
function fmtDay(ui, iso) {
  return new Intl.DateTimeFormat(ui.locale, {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
  }).format(new Date(`${iso}T00:00:00Z`));
}

function waLink(number, text) {
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}

function dealMessage(ui, t, deal, opt) {
  const dates = opt ? ui.year(opt.t.dates) : t.dates;
  const price = opt ? opt.deal_clp : deal.deal_clp;
  const ref = opt ? `${deal.id}/${opt.id}` : deal.id;
  return `${ui.waIntro} ${t.wa_what}, ${dates}, ${ui.money(price)}. ${ui.waOutro} (Ref: ${ref})`;
}

function renderDeal(deal, lang, number, today) {
  const ui = DEALS_UI[lang];
  const t = deal[lang];

  // Options with a pickup date in the past are dropped; the deal is hidden if nothing is left.
  let options = null;
  if (deal.options) {
    options = deal.options
      .filter((o) => o.pickup_date >= today)
      .map((o) => ({ ...o, t: o[lang] }));
    if (!options.length) return '';
  } else if (deal.pickup_date < today) {
    return '';
  }

  const soldCount = options ? options.filter((o) => o.status === 'sold').length : 0;
  const soldOut = options ? soldCount === options.length : deal.status === 'sold';
  const first = options ? options.find((o) => o.status !== 'sold') : null;
  // The dates shown in the summary rows: the deal's own, or the selected option's.
  const shown = options ? (first || options[0]) : deal;

  let tag = t.tag;
  if (options && deal.spots_total && !soldOut) {
    // Each sale takes one of the spots; a sold option means one spot is already gone.
    tag += ` · ${ui.spots(soldCount ? deal.spots_total - 1 : deal.spots_total)}`;
  }

  let priceBlock = '';
  if (options) {
    priceBlock = `
      <p class="deal-choose">${ui.chooseDates}</p>
      <div class="deal-options" role="radiogroup">
        ${options.map((o) => {
          const sold = o.status === 'sold';
          const inputId = `${deal.id}-${o.id}`;
          const saving = o.normal_clp - o.deal_clp;
          const prices = `
            <span class="opt-prices">
              <s>${ui.money(o.normal_clp)}</s>
              <strong>${ui.money(o.deal_clp)}</strong>
            </span>`;
          if (sold) {
            return `
        <div class="deal-option is-sold">
          <span class="opt-main"><span class="deal-booked">${ui.booked}</span><span class="opt-dates">${o.t.dates}</span><span class="opt-days">${o.days} ${ui.days}</span></span>
          ${prices}
        </div>`;
          }
          return `
        <label class="deal-option${o === first ? ' is-selected' : ''}" for="${inputId}">
          <input type="radio" id="${inputId}" name="${deal.id}" value="${o.id}"${o === first ? ' checked' : ''}>
          <span class="opt-main"><span class="opt-dates">${o.t.dates}</span><span class="opt-days">${o.days} ${ui.days}</span></span>
          ${prices}
          <small class="opt-save">${ui.save} ${ui.money(saving)}</small>
        </label>`;
        }).join('')}
      </div>`;
  } else {
    const saving = deal.normal_clp - deal.deal_clp;
    priceBlock = `
      <div class="deal-price">
        <span class="normal">${ui.money(deal.normal_clp)}</span>
        <span class="now">${ui.money(deal.deal_clp)}</span>
      </div>
      <p class="deal-total">${ui.total(deal.days)} · ${ui.save.toLowerCase()} ${ui.money(saving)}${t.saving_note ? ` · ${t.saving_note}` : ''}</p>`;
  }

  const rows = `
      <dl class="deal-rows">
        <div><dt>${ui.pickup}</dt><dd>${t.pickup}</dd></div>
        <div><dt>${ui.dropoff}</dt><dd>${t.dropoff}</dd></div>
        <div><dt>${ui.startDay}</dt><dd data-start>${fmtDay(ui, shown.pickup_date)}</dd></div>
        <div><dt>${ui.endDay}</dt><dd data-end>${fmtDay(ui, shown.dropoff_date)}</dd></div>
      </dl>`;

  const button = soldOut
    ? `<span class="btn btn-primary is-disabled" aria-disabled="true">${ui.soldOut}</span>`
    : `<a class="btn btn-primary" href="${waLink(number, dealMessage(ui, t, deal, first))}" target="_blank" rel="noopener" data-deal-cta>${ui.button}</a>`;

  return `
    <article class="deal-card${soldOut ? ' is-soldout' : ''}" id="deal-${deal.id}" data-deal="${deal.id}">
      <div class="deal-media">
        <span class="deal-tag">${tag}</span>
        ${soldOut ? `<span class="deal-soldout-label">${ui.soldOut}</span>` : ''}
        <img src="${deal.image}" alt="" loading="lazy">
      </div>
      <div class="deal-body">
        <h3>${t.title}</h3>
        <p class="deal-camper">${t.camper}</p>
        ${priceBlock}
        ${rows}
        <details class="deal-more">
          <summary>${ui.more}</summary>
          <p class="deal-route">${t.route}</p>
          <p class="deal-text">${t.text}</p>
          ${t.note ? `<p class="deal-note">${t.note}</p>` : ''}
        </details>
        <div class="deal-cta">${button}</div>
      </div>
    </article>`;
}

async function initDeals(el) {
  const lang = el.dataset.lang === 'es' ? 'es' : 'en';
  const ui = DEALS_UI[lang];
  let data;
  try {
    data = await fetch('shared/data/deals.json').then((r) => r.json());
  } catch (e) {
    el.innerHTML = `<p class="deals-empty">${ui.empty}</p>`;
    return;
  }
  const today = todayInChile();
  const html = data.deals.map((d) => renderDeal(d, lang, data.whatsapp_number, today)).join('');
  el.innerHTML = html ? `<div class="deals-list">${html}</div>` : `<p class="deals-empty">${ui.empty}</p>`;

  el.querySelectorAll('.deal-card').forEach((card) => {
    const deal = data.deals.find((d) => d.id === card.dataset.deal);
    const cta = card.querySelector('[data-deal-cta]');
    if (!cta) return;
    const t = deal[lang];
    const currentOption = () => {
      const checked = card.querySelector('input[type="radio"]:checked');
      if (!checked) return null;
      const o = deal.options.find((x) => x.id === checked.value);
      return { ...o, t: o[lang] };
    };
    card.querySelectorAll('input[type="radio"]').forEach((radio) => {
      radio.addEventListener('change', () => {
        const opt = currentOption();
        card.querySelectorAll('.deal-option.is-selected').forEach((x) => x.classList.remove('is-selected'));
        radio.closest('.deal-option').classList.add('is-selected');
        card.querySelector('[data-start]').textContent = fmtDay(ui, opt.pickup_date);
        card.querySelector('[data-end]').textContent = fmtDay(ui, opt.dropoff_date);
        cta.href = waLink(data.whatsapp_number, dealMessage(ui, t, deal, opt));
      });
    });
    // GTM already reports whatsapp_click for any wa.me link click (the deal id travels inside
    // the link text). This extra event carries the deal id as its own field.
    cta.addEventListener('click', () => {
      const opt = deal.options ? currentOption() : null;
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: 'deal_whatsapp_click', deal_id: deal.id, deal_option: opt ? opt.id : undefined });
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-deals]').forEach(initDeals);
});
