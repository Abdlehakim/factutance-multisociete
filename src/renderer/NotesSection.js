// Move the existing Notes section into the host without changing text/labels
(function () {
  function mount() {
    const host = document.getElementById('notesHost');
    const original = document.getElementById('notesOriginal');
    if (!host || !original || host.dataset.rendered === '1') return;
    host.dataset.rendered = '1';
    original.style.display = '';
    host.appendChild(original);
    original.removeAttribute('id');
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount, { once: true });
  } else {
    mount();
  }
})();

