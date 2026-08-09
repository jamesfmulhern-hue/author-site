// Reading-list signup — front-end only placeholder.
// Wire the `action` below to your actual list provider (Substack, Mailchimp,
// Buttondown, etc.) or a form endpoint. Until then this confirms the
// submission locally and opens a pre-filled email as a fallback.
(function () {
  var form = document.getElementById('newsletter-form');
  var note = document.getElementById('newsletter-note');
  if (!form || !note) return;

  var defaultNote = note.textContent;

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    var email = document.getElementById('newsletter-email').value.trim();
    if (!email) return;

    // TODO: replace with a real subscribe endpoint, e.g.:
    // fetch('https://your-list-provider.example.com/subscribe', { method: 'POST', body: ... })
    note.textContent = 'Thank you \u2014 you\u2019re on the list. A confirmation will follow shortly.';
    note.classList.add('is-success');
    form.reset();

    window.setTimeout(function () {
      note.textContent = defaultNote;
      note.classList.remove('is-success');
    }, 6000);
  });
})();
