// Category filter tabs for essays.html (data-essay-filter) and
// guides.html (data-guide-filter). Purely client-side show/hide —
// no page reload, works with the existing fade-in scroll reveal.
(() => {
  function wireFilterGroup(tabSelector, itemSelector, dataAttr, tabAttr) {
    const tabs = document.querySelectorAll(tabSelector);
    if (!tabs.length) return;
    const items = document.querySelectorAll(itemSelector);
    if (!items.length) return;

    // Populate per-tab counts if a .filter-tab-count span is present
    tabs.forEach((tab) => {
      const countEl = tab.querySelector('.filter-tab-count');
      if (!countEl) return;
      const cat = tab.getAttribute(tabAttr);
      const count = cat === 'all'
        ? items.length
        : Array.from(items).filter((el) => el.getAttribute(dataAttr) === cat).length;
      countEl.textContent = `(${count})`;
    });

    function applyFilter(cat) {
      items.forEach((el) => {
        const matches = cat === 'all' || el.getAttribute(dataAttr) === cat;
        el.hidden = !matches;
      });
    }

    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        tabs.forEach((t) => t.classList.remove('is-active'));
        tab.classList.add('is-active');
        applyFilter(tab.getAttribute(tabAttr));
      });
    });
  }

  wireFilterGroup(
    '#essay-filter-tabs [data-essay-filter]',
    '#essay-grid [data-essay-category]',
    'data-essay-category',
    'data-essay-filter'
  );

  wireFilterGroup(
    '#guide-filter-tabs [data-guide-filter]',
    '.guide-group[data-guide-category]',
    'data-guide-category',
    'data-guide-filter'
  );
})();
