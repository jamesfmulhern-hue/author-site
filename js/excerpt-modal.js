// Read-Excerpt modal — opens a Chapter One preview panel matching the
// requested excerpt without leaving the page. Lives only on books.html.
(() => {
  const overlay = document.getElementById('excerpt-overlay');
  if (!overlay) return;

  const panels = overlay.querySelectorAll('[data-excerpt-panel]');
  const openButtons = document.querySelectorAll('[data-excerpt-open]');
  const closeButtons = overlay.querySelectorAll('[data-excerpt-close]');
  let lastFocused = null;

  function showPanel(key) {
    panels.forEach((p) => {
      p.classList.toggle('is-active', p.getAttribute('data-excerpt-panel') === key);
    });
  }

  function openModal(key) {
    showPanel(key);
    lastFocused = document.activeElement;
    overlay.hidden = false;
    document.body.style.overflow = 'hidden';
    const closeBtn = overlay.querySelector('[data-excerpt-close]');
    if (closeBtn) closeBtn.focus();
  }

  function closeModal() {
    overlay.hidden = true;
    document.body.style.overflow = '';
    if (lastFocused) lastFocused.focus();
  }

  openButtons.forEach((btn) => {
    btn.addEventListener('click', () => openModal(btn.getAttribute('data-excerpt-open')));
  });

  closeButtons.forEach((btn) => btn.addEventListener('click', closeModal));

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !overlay.hidden) closeModal();
  });
})();
