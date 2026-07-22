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

  // "Our Campers" nav dropdown: click to open/close, close on outside click.
  document.querySelectorAll('.nav-dropdown').forEach((dropdown) => {
    const btn = dropdown.querySelector('.nav-dropdown-toggle');
    if (!btn) return;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = dropdown.classList.toggle('open');
      btn.setAttribute('aria-expanded', String(isOpen));
    });
  });
  document.addEventListener('click', (e) => {
    document.querySelectorAll('.nav-dropdown.open').forEach((dropdown) => {
      if (!dropdown.contains(e.target)) dropdown.classList.remove('open');
    });
  });

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
