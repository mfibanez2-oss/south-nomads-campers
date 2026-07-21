// Computes the equivalent page in the other language and wires up the header EN/ES pills.
// Both language trees mirror each other 1:1 (/en/... <-> /es/...), so this is a pure path swap.
document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname;
  const isEn = path.startsWith('/en/');
  const isEs = path.startsWith('/es/');
  if (!isEn && !isEs) return;

  const otherPath = isEn ? path.replace('/en/', '/es/') : path.replace('/es/', '/en/');

  const enLink = document.querySelector('.lang-toggle a[data-lang="en"]');
  const esLink = document.querySelector('.lang-toggle a[data-lang="es"]');
  if (enLink) enLink.href = isEn ? path : otherPath;
  if (esLink) esLink.href = isEs ? path : otherPath;
});
