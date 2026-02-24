import { html } from "./utils.js";

export function renderNotesView() {
  return html(`
    <section id="notesHost"></section>
    <section class="grid" id="notesOriginal" style="display:none">
      <fieldset class="section-box" id="notesBox">
        <legend><span class="model-save-dot">Notes</span></legend>
        <label>
          <textarea
            id="notes"
            class="notes"
            rows="4"
            maxlength="700"
            placeholder="Conditions de paiement, coordonnées bancaires, notes de projet…"
          ></textarea>
        </label>
      </fieldset>
    </section>
  `);
}
