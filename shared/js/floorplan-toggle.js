// Toggles a floorplan SVG between its "day" and "night" <g> layers,
// Moterra-style. Markup: .floorplan > .floorplan-tabs button[data-mode]
// + .floorplan-svg-wrap.show-day containing <g class="mode-day"> / <g class="mode-night">.

async function loadFloorplanSvg(wrap) {
  const src = wrap.dataset.src;
  if (!src) return;
  const res = await fetch(src);
  wrap.innerHTML = await res.text();
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.floorplan').forEach(async (panel) => {
    const tabs = panel.querySelectorAll('.floorplan-tabs button');
    const wrap = panel.querySelector('.floorplan-svg-wrap');
    if (!wrap) return;
    await loadFloorplanSvg(wrap);
    tabs.forEach((btn) => {
      btn.addEventListener('click', () => {
        tabs.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        wrap.classList.remove('show-day', 'show-night');
        wrap.classList.add('show-' + btn.dataset.mode);
      });
    });
  });
});
