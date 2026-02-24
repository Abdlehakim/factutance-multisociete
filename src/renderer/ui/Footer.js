import { html } from "./utils.js";

export function renderFooter() {
  const frag = html(`
    <footer class="footer muted">
      <span>© <span id="year"></span> Facturance. Tous droits réservés.</span>
      <span>Pour Windows • Hors ligne • Export PDF</span>
    </footer>
  `);
  // Set year here to avoid needing extra logic elsewhere
  queueMicrotask(() => {
    const y = document.getElementById("year");
    if (y) y.textContent = String(new Date().getFullYear());
  });
  return frag;
}
