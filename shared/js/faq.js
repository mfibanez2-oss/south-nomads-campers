// Renders an accordion FAQ from /shared/data/faq.[lang].json into
// <div data-faq data-lang="en"></div>

async function initFaq(el) {
  const lang = el.dataset.lang || 'en';
  const categories = await fetch(`/shared/data/faq.${lang}.json`).then((r) => r.json());

  el.innerHTML = categories.map((cat) => `
    <div class="faq-category">
      <h3>${cat.category}</h3>
      <div class="faq-accordion">
        ${cat.items.map((item) => `
          <div class="faq-item">
            <button class="faq-q" type="button" aria-expanded="false">
              <span>${item.q}</span>
              <span class="icon">+</span>
            </button>
            <div class="faq-a">${item.a}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');

  el.querySelectorAll('.faq-item').forEach((item) => {
    const q = item.querySelector('.faq-q');
    q.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      item.classList.toggle('open', !isOpen);
      q.setAttribute('aria-expanded', String(!isOpen));
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-faq]').forEach(initFaq);
});
