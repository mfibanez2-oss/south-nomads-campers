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
    colDates: 'Dates',
    colDays: 'Days',
    colNormal: 'Regular price',
    colDeal: 'Deal',
    booked: 'Booked',
    soldOut: 'Sold out',
    spots: (n) => `${n} ${n === 1 ? 'spot' : 'spots'}`,
    button: 'I want this Deal',
    empty: 'There are no open Deals right now. New ones appear here when dates open up.',
    money: (n) => `CLP ${fmtNumber(n, ',')}`,
    waIntro: 'Hi South Nomads Campers! I want this Deal:',
    waOutro: 'Is it still available?',
    year: (label) => `${label}, 2026`,
  },
  es: {
    save: 'Ahorro',
    days: 'días',
    colDates: 'Fechas',
    colDays: 'Días',
    colNormal: 'Precio normal',
    colDeal: 'Deal',
    booked: 'Reservado',
    soldOut: 'Agotado',
    spots: (n) => `${n} ${n === 1 ? 'cupo' : 'cupos'}`,
    button: 'Quiero este Deal',
    empty: 'No hay Deals abiertos por ahora. Cuando se liberen nuevas fechas, las publicaremos aquí.',
    money: (n) => `$${fmtNumber(n, '.')} CLP`,
    waIntro: 'Hola South Nomads Campers! Quiero este Deal:',
    waOutro: '¿Sigue disponible?',
    year: (label) => `${label} de 2026`,
  },
};

// Today's date in Chile as YYYY-MM-DD, so a deal does not disappear early or late for
// visitors in other time zones.
function todayInChile() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date());
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

  let tag = t.tag;
  if (options && deal.spots_total && !soldOut) {
    // Each sale takes one of the spots; a sold option means one spot is already gone.
    tag += ` · ${ui.spots(soldCount ? deal.spots_total - 1 : deal.spots_total)}`;
  }

  let priceBlock = '';
  let facts = '';
  let optionsBlock = '';
  const first = options ? options.find((o) => o.status !== 'sold') : null;
  if (options) {
    optionsBlock = `
      <table class="deal-options">
        <thead><tr>
          <th scope="col">${ui.colDates}</th><th scope="col">${ui.colDays}</th>
          <th scope="col">${ui.colNormal}</th><th scope="col">${ui.colDeal}</th>
        </tr></thead>
        <tbody>
          ${options.map((o) => {
            const sold = o.status === 'sold';
            const inputId = `${deal.id}-${o.id}`;
            const saving = o.normal_clp - o.deal_clp;
            const rowClass = (sold ? 'is-sold' : '') + (o === first ? ' is-selected' : '');
            const datesCell = sold
              ? `<span class="opt-label"><span class="deal-booked">${ui.booked}</span> ${o.t.dates}</span>`
              : `<label class="opt-label" for="${inputId}"><input type="radio" id="${inputId}" name="${deal.id}" value="${o.id}"${o === first ? ' checked' : ''}> ${o.t.dates}</label>`;
            return `
          <tr class="${rowClass.trim()}">
            <td class="opt-dates">${datesCell}</td>
            <td class="opt-days">${o.days} ${ui.days}</td>
            <td class="opt-normal" data-label="${ui.colNormal}"><s>${ui.money(o.normal_clp)}</s></td>
            <td class="opt-deal"><strong>${ui.money(o.deal_clp)}</strong><small>${ui.save} ${ui.money(saving)}</small></td>
          </tr>`;
          }).join('')}
        </tbody>
      </table>`;
  } else {
    const saving = deal.normal_clp - deal.deal_clp;
    facts = `<p>${t.dates} · ${deal.days} ${ui.days}</p>`;
    priceBlock = `
      <div class="deal-price"><span class="normal">${ui.money(deal.normal_clp)}</span><span class="now">${ui.money(deal.deal_clp)}</span></div>
      <div class="deal-saving">${ui.save}: ${ui.money(saving)}${t.saving_note ? ` · ${t.saving_note}` : ''}</div>`;
  }

  const button = soldOut
    ? `<span class="btn btn-primary is-disabled" aria-disabled="true">${ui.soldOut}</span>`
    : `<a class="btn btn-primary" href="${waLink(number, dealMessage(ui, t, deal, first))}" target="_blank" rel="noopener" data-deal-cta>${ui.button}</a>`;

  return `
    <article class="deal-card${soldOut ? ' is-soldout' : ''}" id="deal-${deal.id}" data-deal="${deal.id}">
      <div class="deal-media">
        ${soldOut ? `<span class="deal-soldout-label">${ui.soldOut}</span>` : ''}
        <img src="${deal.image}" alt="" loading="lazy">
      </div>
      <div class="deal-body">
        <div class="deal-tag-row"><span class="deal-tag">${tag}</span></div>
        <h3>${t.title}</h3>
        <p class="deal-camper">${t.camper}</p>
        <div class="deal-facts">${facts}<p class="deal-route">${t.route}</p></div>
        ${priceBlock}
        ${optionsBlock}
        <p class="deal-text">${t.text}</p>
        ${t.note ? `<p class="deal-note">${t.note}</p>` : ''}
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
        card.querySelectorAll('tr.is-selected').forEach((tr) => tr.classList.remove('is-selected'));
        radio.closest('tr').classList.add('is-selected');
        cta.href = waLink(data.whatsapp_number, dealMessage(ui, t, deal, currentOption()));
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
