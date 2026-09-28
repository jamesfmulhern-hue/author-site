(() => {
  const menuButton = document.querySelector('[data-menu-toggle]');
  const navLinks = document.querySelector('.nav-links');

  if (!menuButton || !navLinks) return;

  const closeMenu = () => {
    navLinks.classList.remove('open');
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'Open menu');
  };

  const openMenu = () => {
    navLinks.classList.add('open');
    menuButton.setAttribute('aria-expanded', 'true');
    menuButton.setAttribute('aria-label', 'Close menu');
  };

  menuButton.addEventListener('click', () => {
    if (navLinks.classList.contains('open')) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  navLinks.addEventListener('click', (event) => {
    if (event.target.closest('a')) closeMenu();
  });

  document.addEventListener('click', (event) => {
    if (!navLinks.classList.contains('open')) return;
    if (!event.target.closest('.nav')) closeMenu();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeMenu();
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 760) closeMenu();
  });

  // Desktop nav dropdowns ("The Work", "Read & Discuss", etc.): open on
  // hover, close on mouse-leave or outside click. Below the 1360px
  // hamburger breakpoint these same <details> elements become plain
  // tap-to-expand accordion groups, handled entirely by native <details>
  // behavior with no extra JS needed.
  const DESKTOP_BREAKPOINT = 1360;
  const navGroups = document.querySelectorAll('.nav-group > details');

  navGroups.forEach((details) => {
    const group = details.closest('.nav-group');

    group.addEventListener('mouseenter', () => {
      if (window.innerWidth > DESKTOP_BREAKPOINT) details.open = true;
    });
    group.addEventListener('mouseleave', () => {
      if (window.innerWidth > DESKTOP_BREAKPOINT) details.open = false;
    });

    // Prevent native click-toggle from fighting the hover state on desktop.
    const summary = details.querySelector('summary');
    summary.addEventListener('click', (event) => {
      if (window.innerWidth > DESKTOP_BREAKPOINT) event.preventDefault();
    });
  });

  document.addEventListener('click', (event) => {
    if (window.innerWidth <= DESKTOP_BREAKPOINT) return;
    navGroups.forEach((details) => {
      if (!details.contains(event.target)) details.open = false;
    });
  });
})();

// Skip link: lets keyboard and screen-reader visitors jump past the menu.
(() => {
  const main = document.querySelector('main');
  if (!main || document.querySelector('.skip-link')) return;
  if (!main.id) main.id = 'main-content';
  main.setAttribute('tabindex', '-1');
  const link = document.createElement('a');
  link.className = 'skip-link';
  link.href = '#' + main.id;
  link.textContent = 'Skip to content';
  document.body.insertBefore(link, document.body.firstChild);
})();

// "Cite this page": copy-ready MLA and Chicago citations on essay and
// study pages (any page whose structured data declares an Article).
// Authorship is deliberately left unstated; the site is the container.
(() => {
  const main = document.querySelector('main');
  if (!main) return;
  let isArticle = false;
  document.querySelectorAll('script[type="application/ld+json"]').forEach((node) => {
    if (/"@type"\s*:\s*"Article"/.test(node.textContent)) isArticle = true;
  });
  if (!isArticle) return;

  const h1 = document.querySelector('main h1');
  if (!h1) return;
  const title = h1.textContent.replace(/\s+/g, ' ').trim();
  const canonical = document.querySelector('link[rel="canonical"]');
  const url = canonical ? canonical.href : window.location.href.split('#')[0];
  const bareUrl = url.replace(/^https?:\/\//, '');

  const now = new Date();
  const mlaMonths = ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'June', 'July', 'Aug.', 'Sept.', 'Oct.', 'Nov.', 'Dec.'];
  const fullMonths = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const mlaDate = `${now.getDate()} ${mlaMonths[now.getMonth()]} ${now.getFullYear()}`;
  const chiDate = `${fullMonths[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
  const endPunct = /[?!.]$/.test(title) ? '' : '.';

  const styles = [
    {
      name: 'MLA',
      html: `&ldquo;${title}${endPunct}&rdquo; <em>AuthorJamesMulhern.com</em>, Silver Current Press, ${bareUrl}. Accessed ${mlaDate}.`,
      text: `\u201C${title}${endPunct}\u201D AuthorJamesMulhern.com, Silver Current Press, ${bareUrl}. Accessed ${mlaDate}.`,
    },
    {
      name: 'Chicago',
      html: `&ldquo;${title}${endPunct}&rdquo; <em>AuthorJamesMulhern.com</em>. Silver Current Press. Accessed ${chiDate}. ${url}.`,
      text: `\u201C${title}${endPunct}\u201D AuthorJamesMulhern.com. Silver Current Press. Accessed ${chiDate}. ${url}.`,
    },
  ];

  const section = document.createElement('section');
  section.className = 'cite-this';
  section.setAttribute('aria-label', 'Cite this page');
  section.innerHTML = `
    <div class="container container-narrow">
      <details class="cite-card">
        <summary class="cite-summary">Cite this page</summary>
        <div class="cite-body">
          ${styles.map((s, i) => `
            <div class="cite-row">
              <span class="cite-style">${s.name}</span>
              <p class="cite-text" id="cite-text-${i}">${s.html}</p>
              <button type="button" class="cite-copy" data-cite-index="${i}" aria-describedby="cite-text-${i}">Copy</button>
            </div>`).join('')}
          <p class="cite-note">The access date is today&rsquo;s. Adjust to your style guide as needed.</p>
        </div>
      </details>
    </div>`;
  main.appendChild(section);

  section.addEventListener('click', async (event) => {
    const button = event.target.closest('.cite-copy');
    if (!button) return;
    const text = styles[Number(button.dataset.citeIndex)].text;
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      const area = document.createElement('textarea');
      area.value = text;
      document.body.appendChild(area);
      area.select();
      try { document.execCommand('copy'); } catch (e) { /* no-op */ }
      area.remove();
    }
    const original = button.textContent;
    button.textContent = 'Copied';
    setTimeout(() => { button.textContent = original; }, 1800);
  });
})();
