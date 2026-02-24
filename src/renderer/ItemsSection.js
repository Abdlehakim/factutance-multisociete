// Move the existing Items/Extras/Withholding section into the host
// without changing any text or labels.
(function () {
  function mount() {
    const host = document.getElementById('itemsHost');
    const original = document.getElementById('flexitOriginal');
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

