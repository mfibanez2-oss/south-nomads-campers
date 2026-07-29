// Computes the equivalent page in the other language and wires up the header EN/ES pills.
// Both language trees mirror each other 1:1 (/en/... <-> /es/...), so this is a pure path swap,
// EXCEPT itineraries/itinerarios, since "itineraries" doesn't translate to the same word.
document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname;
  const enLink = document.querySelector('.lang-toggle a[data-lang="en"]');
  const esLink = document.querySelector('.lang-toggle a[data-lang="es"]');

  if (path.includes('en/itineraries/') || path.includes('es/itinerarios/')) {
    if (enLink) enLink.href = 'en/itineraries/index.html';
    if (esLink) esLink.href = 'es/itinerarios/';
    return;
  }

  // Uses .includes() rather than .startsWith() because the real path may be prefixed with
  // the GitHub Pages project subpath (/south-nomads-campers/en/...), not just /en/...
  const isEn = path.includes('/en/');
  const isEs = path.includes('/es/');
  if (!isEn && !isEs) return;

  const otherPath = isEn ? path.replace('/en/', '/es/') : path.replace('/es/', '/en/');

  if (enLink) enLink.href = isEn ? path : otherPath;
  if (esLink) esLink.href = isEs ? path : otherPath;
});
