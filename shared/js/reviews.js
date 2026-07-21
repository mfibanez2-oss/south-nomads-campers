// Renders review cards from /shared/data/reviews.[lang].json into any
// <div data-reviews data-lang="en" data-show="featured|all"></div>

const GOOGLE_G_SVG = `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.5 0 10.4-1.9 14.3-5.1l-6.6-5.6C29.6 34.9 26.9 36 24 36c-5.3 0-9.7-3.1-11.3-7.5l-6.6 5.1C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.2 5.6l6.6 5.6C41.8 36.5 44 30.9 44 24c0-1.3-.1-2.7-.4-3.5z"/></svg>`;

const GOOGLE_FALLBACK_URL = 'https://www.google.com/search?q=South+Nomads+Campers+reviews';

const REVIEW_STRINGS = {
  en: { basedOn: (n) => `from ${n} Google reviews`, seeAll: 'See all reviews' },
  es: { basedOn: (n) => `de ${n} reseñas en Google`, seeAll: 'Ver todas las reseñas' }
};

function starRow(rating) {
  return '★'.repeat(rating) + '☆'.repeat(5 - rating);
}

function renderCard(review) {
  const url = review.google_url || GOOGLE_FALLBACK_URL;
  return `
    <a class="review-card" href="${url}" target="_blank" rel="noopener">
      <div class="review-stars">${starRow(review.rating)}</div>
      <p class="review-quote">"${review.quote}"</p>
      <div class="review-foot">
        <strong>${review.name}, ${review.location}</strong>
        <span class="review-source">${GOOGLE_G_SVG} Google</span>
      </div>
    </a>
  `;
}

async function initReviews(el) {
  const lang = el.dataset.lang || 'en';
  const show = el.dataset.show || 'featured';
  const t = REVIEW_STRINGS[lang];

  const reviews = await fetch(`shared/data/reviews.${lang}.json`).then((r) => r.json());
  const list = show === 'all' ? reviews : reviews.filter((r) => r.featured);

  const avg = (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1);

  let stripHtml = '';
  if (el.dataset.showStrip !== 'false') {
    stripHtml = `
      <div class="rating-strip">
        <span class="score">${avg}★</span>
        <span>${t.basedOn(reviews.length)}</span>
      </div>
    `;
  }

  el.innerHTML = stripHtml + `<div class="grid grid-3">${list.map(renderCard).join('')}</div>`;
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-reviews]').forEach(initReviews);
});
