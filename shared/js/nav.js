document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', () => {
      const isOpen = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(isOpen));
    });
    links.querySelectorAll('a').forEach((a) => {
      a.addEventListener('click', () => links.classList.remove('open'));
    });
  }

  // Sticky mobile CTA bar: show once the hero has scrolled past.
  const stickyBar = document.querySelector('.sticky-bar');
  const hero = document.querySelector('.hero');
  if (stickyBar && hero) {
    const onScroll = () => {
      const heroBottom = hero.getBoundingClientRect().bottom;
      stickyBar.classList.toggle('visible', heroBottom < 0);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }
});
