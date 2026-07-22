// Click-to-enlarge lightbox for any .gallery-grid img. Builds a shared overlay
// once, tracks the clicked image's siblings within the same gallery for prev/next.

document.addEventListener('DOMContentLoaded', () => {
  const galleries = document.querySelectorAll('.gallery-grid');
  if (!galleries.length) return;

  const overlay = document.createElement('div');
  overlay.className = 'lightbox-overlay';
  overlay.innerHTML = `
    <button class="lightbox-close" type="button" aria-label="Close">&times;</button>
    <button class="lightbox-prev" type="button" aria-label="Previous">&#10094;</button>
    <img class="lightbox-img" src="" alt="">
    <button class="lightbox-next" type="button" aria-label="Next">&#10095;</button>
  `;
  document.body.appendChild(overlay);

  const imgEl = overlay.querySelector('.lightbox-img');
  let currentList = [];
  let currentIndex = 0;

  function show(index) {
    currentIndex = (index + currentList.length) % currentList.length;
    const src = currentList[currentIndex];
    imgEl.src = src.dataset.full || src.src;
    imgEl.alt = src.alt || '';
  }

  function open(list, index) {
    currentList = list;
    show(index);
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function close() {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  galleries.forEach((gallery) => {
    const imgs = Array.from(gallery.querySelectorAll('img'));
    imgs.forEach((img, i) => {
      img.style.cursor = 'zoom-in';
      img.addEventListener('click', () => open(imgs, i));
    });
  });

  overlay.querySelector('.lightbox-close').addEventListener('click', close);
  overlay.querySelector('.lightbox-prev').addEventListener('click', () => show(currentIndex - 1));
  overlay.querySelector('.lightbox-next').addEventListener('click', () => show(currentIndex + 1));
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  document.addEventListener('keydown', (e) => {
    if (!overlay.classList.contains('open')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') show(currentIndex - 1);
    if (e.key === 'ArrowRight') show(currentIndex + 1);
  });
});
