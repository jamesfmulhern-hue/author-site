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
