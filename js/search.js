(() => {
  const toggleButtons = document.querySelectorAll('[data-search-toggle]');
  if (!toggleButtons.length) return;

  let overlay, input, resultsBox, closeBtn;
  let indexData = null;
  let indexPromise = null;
  let activeIndex = -1;
  let currentResults = [];

  const INDEX_URL = 'search-index.json';

  function buildOverlay() {
    overlay = document.createElement('div');
    overlay.className = 'search-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Search the site');
    overlay.innerHTML = `
      <div class="search-modal">
        <div class="search-modal-field">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M21 21 L16.65 16.65"/></svg>
          <input type="text" class="search-modal-input" placeholder="Search books, essays, poems…" autocomplete="off" spellcheck="false" aria-label="Search">
          <button type="button" class="search-modal-close" aria-label="Close search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M5 5 L19 19 M19 5 L5 19"/></svg>
          </button>
        </div>
        <div class="search-modal-results">
          <p class="search-modal-hint">Start typing to search the whole site — books, essays, poems, and pages.</p>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    input = overlay.querySelector('.search-modal-input');
    resultsBox = overlay.querySelector('.search-modal-results');
    closeBtn = overlay.querySelector('.search-modal-close');

    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeSearch(); });
    closeBtn.addEventListener('click', closeSearch);
    input.addEventListener('input', () => runSearch(input.value));
    input.addEventListener('keydown', onKeyDown);
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function escapeRegExp(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function highlight(text, terms) {
    if (!terms.length) return escapeHtml(text);
    const escaped = escapeHtml(text);
    const pattern = new RegExp('(' + terms.map(escapeRegExp).join('|') + ')', 'ig');
    return escaped.replace(pattern, '<mark>$1</mark>');
  }

  function snippetFor(text, terms) {
    if (!terms.length) return text.slice(0, 160);
    const lower = text.toLowerCase();
    let bestIdx = -1;
    for (const t of terms) {
      const idx = lower.indexOf(t);
      if (idx !== -1 && (bestIdx === -1 || idx < bestIdx)) bestIdx = idx;
    }
    if (bestIdx === -1) return text.slice(0, 160);
    const start = Math.max(0, bestIdx - 60);
    const end = Math.min(text.length, bestIdx + 140);
    let snippet = text.slice(start, end);
    if (start > 0) snippet = '…' + snippet;
    if (end < text.length) snippet = snippet + '…';
    return snippet;
  }

  function loadIndex() {
    if (indexPromise) return indexPromise;
    resultsBox.innerHTML = '<p class="search-modal-loading">Loading search index…</p>';
    indexPromise = fetch(INDEX_URL)
      .then((r) => { if (!r.ok) throw new Error('index fetch failed'); return r.json(); })
      .then((data) => { indexData = data; return data; })
      .catch((err) => {
        resultsBox.innerHTML = '<p class="search-modal-empty">Search is temporarily unavailable. Please try again shortly.</p>';
        throw err;
      });
    return indexPromise;
  }

  function scorePage(page, terms) {
    const titleLower = page.title.toLowerCase();
    const headingLower = page.heading.toLowerCase();
    const descLower = page.description.toLowerCase();
    const textLower = page.text.toLowerCase();
    let score = 0;
    for (const t of terms) {
      if (!t) continue;
      if (titleLower.includes(t)) score += 12;
      if (headingLower.includes(t)) score += 8;
      if (descLower.includes(t)) score += 5;
      const occurrences = textLower.split(t).length - 1;
      score += Math.min(occurrences, 8) * 1.5;
    }
    return score;
  }

  function renderResults(results, terms) {
    if (!results.length) {
      resultsBox.innerHTML = '<p class="search-modal-empty">No matches found. Try a different word or author name.</p>';
      currentResults = [];
      activeIndex = -1;
      return;
    }
    currentResults = results;
    activeIndex = -1;
    resultsBox.innerHTML = results.map((r) => {
      const snippet = snippetFor(r.page.text || r.page.description || '', terms);
      return `<a class="search-result" href="${r.page.url}">
        <div class="search-result-title">${highlight(r.page.title.replace(/\s*[|—-]\s*James Mulhern.*$/i, ''), terms)}</div>
        <div class="search-result-snippet">${highlight(snippet, terms)}</div>
      </a>`;
    }).join('');
  }

  function runSearch(query) {
    const q = query.trim();
    if (!q) {
      resultsBox.innerHTML = '<p class="search-modal-hint">Start typing to search the whole site — books, essays, poems, and pages.</p>';
      currentResults = [];
      activeIndex = -1;
      return;
    }
    loadIndex().then((data) => {
      const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
      const scored = data
        .map((page) => ({ page, score: scorePage(page, terms) }))
        .filter((r) => r.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 25);
      renderResults(scored, terms);
    }).catch(() => {});
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') { closeSearch(); return; }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!currentResults.length) return;
      activeIndex = Math.min(activeIndex + 1, currentResults.length - 1);
      updateActive();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!currentResults.length) return;
      activeIndex = Math.max(activeIndex - 1, 0);
      updateActive();
    } else if (e.key === 'Enter') {
      const links = resultsBox.querySelectorAll('.search-result');
      if (activeIndex >= 0 && links[activeIndex]) {
        window.location.href = links[activeIndex].getAttribute('href');
      } else if (links.length) {
        window.location.href = links[0].getAttribute('href');
      }
    }
  }

  function updateActive() {
    const links = resultsBox.querySelectorAll('.search-result');
    links.forEach((el, i) => el.classList.toggle('active', i === activeIndex));
    if (links[activeIndex]) links[activeIndex].scrollIntoView({ block: 'nearest' });
  }

  function openSearch() {
    if (!overlay) buildOverlay();
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    loadIndex().catch(() => {});
    window.setTimeout(() => input.focus(), 30);
  }

  function closeSearch() {
    if (!overlay) return;
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  toggleButtons.forEach((btn) => btn.addEventListener('click', openSearch));

  // Global keyboard shortcut: "/" or Cmd/Ctrl+K opens search, unless the
  // user is already typing in a field.
  document.addEventListener('keydown', (e) => {
    const tag = (e.target && e.target.tagName) || '';
    const typing = tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable;
    if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      openSearch();
    } else if (e.key === '/' && !typing) {
      e.preventDefault();
      openSearch();
    }
  });
})();
