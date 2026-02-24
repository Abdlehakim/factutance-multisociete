// Move the existing General Data section (FACTURE + ENTREPRISE + CLIENT)
// into the dedicated host without changing any text or labels.
(function () {
  function mount() {
    const host = document.getElementById('generalDataHost');
    const original = document.getElementById('generalDataOriginal');
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

