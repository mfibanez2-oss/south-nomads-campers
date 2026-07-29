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

  // Mailto links: some devices/browsers have no default mail app registered,
  // so clicking silently does nothing. Always show the address in a toast
  // (and best-effort copy it) so the visitor gets feedback either way,
  // regardless of whether a mail app opens or the clipboard write succeeds.
  document.querySelectorAll('a[href^="mailto:"]').forEach((a) => {
    a.addEventListener('click', () => {
      const email = a.href.replace(/^mailto:/, '').split('?')[0];
      if (!email) return;
      showEmailToast(email, false);
      if (navigator.clipboard) {
        navigator.clipboard.writeText(email).then(() => showEmailToast(email, true)).catch(() => {});
      }
    });
  });

  function showEmailToast(email, copied) {
    const isEs = document.documentElement.lang === 'es';
    let toast = document.querySelector('.email-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'email-toast';
      document.body.appendChild(toast);
    }
    const label = copied
      ? (isEs ? 'Email copiado: ' : 'Email copied: ')
      : (isEs ? 'Nuestro email: ' : 'Our email: ');
    toast.textContent = label + email;
    toast.classList.add('visible');
    clearTimeout(toast._hideTimer);
    toast._hideTimer = setTimeout(() => toast.classList.remove('visible'), 4000);
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
