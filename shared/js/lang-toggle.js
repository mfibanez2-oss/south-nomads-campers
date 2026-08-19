// Computes the equivalent page in the other language and wires up the header EN/ES pills.
//
// Order of preference:
//  1. The page's own <link rel="alternate" hreflang="en|es"> tags. Every real page has
//     them, and they are the only reliable source once slugs differ between languages
//     (the blog translates its slugs: /en/blog/camper-rental-chile-guide/ <->
//      /es/blog/arrendar-camper-en-chile/).
//  2. The itineraries/itinerarios special case, for pages without alternates.
//  3. A plain /en/ <-> /es/ path swap, since the two trees otherwise mirror 1:1.
document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname;
  const enLink = document.querySelector('.lang-toggle a[data-lang="en"]');
  const esLink = document.querySelector('.lang-toggle a[data-lang="es"]');
  if (!enLink && !esLink) return;

  // 1. hreflang alternates. Kept as absolute paths (not full URLs) so local testing
  // against a dev server doesn't jump to the production domain.
  const altEn = document.querySelector('link[rel="alternate"][hreflang="en"]');
  const altEs = document.querySelector('link[rel="alternate"][hreflang="es"]');
  if (altEn && altEs) {
    try {
      const enPath = new URL(altEn.href, window.location.origin).pathname;
      const esPath = new URL(altEs.href, window.location.origin).pathname;
      if (enLink) enLink.href = enPath;
      if (esLink) esLink.href = esPath;
      return;
    } catch (e) {
      // malformed href — fall through to the path-based logic below
    }
  }

  // 2. "itineraries" doesn't translate to the same word.
  if (path.includes('en/itineraries/') || path.includes('es/itinerarios/')) {
    if (enLink) enLink.href = 'en/itineraries/index.html';
    if (esLink) esLink.href = 'es/itinerarios/';
    return;
  }

  // 3. Uses .includes() rather than .startsWith() because the real path may be prefixed
  // with a subpath, not just /en/...
  const isEn = path.includes('/en/');
  const isEs = path.includes('/es/');
  if (!isEn && !isEs) return;

  const otherPath = isEn ? path.replace('/en/', '/es/') : path.replace('/es/', '/en/');

  if (enLink) enLink.href = isEn ? path : otherPath;
  if (esLink) esLink.href = isEs ? path : otherPath;
});
