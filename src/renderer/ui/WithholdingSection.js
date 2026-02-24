import { html } from "./utils.js";
import { renderWhPdfNoteSection } from "./whPdfNoteSection.js";
import { renderFooterNoteSection } from "./footerNoteSection.js";

export function renderWithholdingSection() {
  return html(`
    <fieldset class="section-box" id="acompteBox">
      <legend><span class="model-save-dot">Acompte</span></legend>

      <div class="full" style="margin-top:0.5rem">
        <div class="label-inline">
          <span class="label-text">Ajouter un acompte</span>
          <input id="acompteEnabled" type="checkbox" class="col-toggle" aria-label="Ajouter un acompte" />
        </div>
      </div>

      <div id="acompteFields">
        <label>Pay&eacute; <input id="acomptePaid" type="number" min="0" step="0.01" value="0" /></label>
        <label>Solde d\u00fb <input id="acompteDue" readonly /></label>
      </div>
    </fieldset>

    <fieldset class="section-box" id="financingBox">
      <legend><span class="model-save-dot">Source de financement</span></legend>

      <div class="full" style="margin-top:0.5rem">
        <div class="label-inline">
          <span class="label-text">Subvention</span>
          <input id="subventionEnabled" type="checkbox" class="col-toggle" aria-label="Subvention" />
        </div>
      </div>

      <div id="subventionFields" class="full grid two" style="display:none;">
        <label>Libelle <input id="subventionLabel" placeholder="ANME" /></label>
        <label>Montant <input id="subventionAmount" type="number" min="0" step="0.01" value="0" /></label>
      </div>

      <div class="full" style="margin-top:0.5rem">
        <div class="label-inline">
          <span class="label-text">Financement bancaire</span>
          <input id="finBankEnabled" type="checkbox" class="col-toggle" aria-label="Financement bancaire" />
        </div>
      </div>

      <div id="finBankFields" class="full grid two" style="display:none;">
        <label>Libelle <input id="finBankLabel" placeholder="Bank Zitouna" /></label>
        <label>Montant <input id="finBankAmount" type="number" min="0" step="0.01" value="0" /></label>
      </div>

      <div id="financingNetRow" class="full" style="display:none;">
        <label>Montant net a payer <input id="financingNet" readonly /></label>
      </div>
    </fieldset>

    <fieldset class="section-box" id="reglementBox">
      <legend><span class="model-save-dot">Conditions de r&egrave;glement</span></legend>

      <div class="full" style="margin-top:0.5rem">
        <div class="label-inline">
          <span class="label-text">Ajouter des conditions de r&egrave;glement</span>
          <input id="reglementEnabled" type="checkbox" class="col-toggle" aria-label="Ajouter des conditions de reglement" />
        </div>
      </div>

      <div id="reglementFields">
        <label class="reglement-option">
          <input id="reglementTypeReception" type="radio" name="reglementType" value="reception" checked />
          <span>A r&eacute;ception</span>
        </label>
        <label class="reglement-option reglement-option--days">
          <input id="reglementTypeDays" type="radio" name="reglementType" value="days" />
          <span>Nombre de jours</span>
          <input id="reglementDays" class="reglement-days-input" type="number" min="0" step="1" value="30" placeholder="30" disabled />
        </label>
      </div>
    </fieldset>

    ${renderWhPdfNoteSection()}

    ${renderFooterNoteSection()}

    <fieldset class="section-box wh-note-box" id="noteInterneBox">
      <legend><span class="model-save-dot">Commentaire sur document</span></legend>
      <div class="full note-field">
        <div class="note-field-label" id="noteInterneLabel">
          Ce commentaire ne sera pas inclus dans le document exporté.
        </div>
        <textarea id="noteInterne" rows="4" aria-labelledby="noteInterneLabel"></textarea>
      </div>
    </fieldset>
  `);
}
