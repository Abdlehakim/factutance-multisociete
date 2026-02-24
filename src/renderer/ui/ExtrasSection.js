// src/ui/ExtrasSection.js
import { html } from "./utils.js";

export function renderExtrasSection() {
  return html(`
    <fieldset class="section-box" id="extrasBox">
      <legend><span class="model-save-dot">Frais & options</span></legend>

      <div class="grid two">
        <div class="full">
          <div class="label-inline">
            <span class="label-text">Ajouter les frais de livraison</span>
            <input id="shipEnabled" type="checkbox" class="col-toggle" aria-label="Ajouter les frais de livraison" />
          </div>
        </div>

        <div id="shipFields" class="full">
          <label>Montant HT
            <input id="shipAmount" type="number" min="0" step="0.01" value="7" />
          </label>
          <label>TVA %
            <input id="shipTva" type="number" min="0" step="0.01" value="7" />
          </label>
          <label>Libelle
            <input id="shipLabel" placeholder="Frais de livraison" />
          </label>
        </div>

        <div class="full" style="margin-top:0.5rem">
          <div class="label-inline">
            <span class="label-text">Ajouter timbre fiscal</span>
            <input id="stampEnabled" type="checkbox" class="col-toggle" aria-label="Ajouter timbre fiscal" />
          </div>
        </div>

        <div id="stampFields" class="full">
          <label>Libelle
            <input id="stampLabel" placeholder="Timbre fiscal" />
          </label>
          <label>Montant HT
            <input id="stampAmount" type="number" min="0" step="0.001" value="1" />
          </label>
        </div>

        <div class="full" style="margin-top:0.5rem">
          <div class="label-inline">
            <span class="label-text">Ajouter les frais du dossier</span>
            <input id="dossierEnabled" type="checkbox" class="col-toggle" aria-label="Ajouter les frais du dossier" />
          </div>
        </div>

        <div id="dossierFields" class="full">
          <label>Montant HT
            <input id="dossierAmount" type="number" min="0" step="0.01" value="0" />
          </label>
          <label>TVA %
            <input id="dossierTva" type="number" min="0" step="0.01" value="0" />
          </label>
          <label>Libelle
            <input id="dossierLabel" placeholder="Frais du dossier" />
          </label>
        </div>

        <div class="full" style="margin-top:0.5rem">
          <div class="label-inline">
            <span class="label-text">Ajouter les frais de deplacement</span>
            <input id="deplacementEnabled" type="checkbox" class="col-toggle" aria-label="Ajouter les frais de deplacement" />
          </div>
        </div>

        <div id="deplacementFields" class="full">
          <label>Montant HT
            <input id="deplacementAmount" type="number" min="0" step="0.01" value="0" />
          </label>
          <label>TVA %
            <input id="deplacementTva" type="number" min="0" step="0.01" value="0" />
          </label>
          <label>Libelle
            <input id="deplacementLabel" placeholder="Frais de deplacement" />
          </label>
        </div>
      </div>
    </fieldset>
  `);
}

const G = (id) => document.getElementById(id);
const B = (id) => !!G(id)?.checked;

// Still exposed for existing hooks; now just refreshes extras/WH preview.
export function updateFodecAutoField() {
  const sem = window.SEM;
  if (!sem) return null;
  const totals = sem.computeTotalsReturn?.();
  if (!totals) return null;
  sem.updateExtrasMiniRows?.(totals);
  sem.updateWHAmountPreview?.(totals);
  return totals;
}

export function wireExtrasSection() {
  const setDisabledGroup = (groupId, enabled) => {
    const root = document.getElementById(groupId);
    if (!root) return;
    root.style.opacity = enabled ? "1" : "0.55";
    Array.from(root.querySelectorAll("input,select")).forEach((el) => {
      el.disabled = !enabled;
    });
  };

  const refresh = () => {
    setDisabledGroup("shipFields", B("shipEnabled"));
    setDisabledGroup("dossierFields", B("dossierEnabled"));
    setDisabledGroup("deplacementFields", B("deplacementEnabled"));
    setDisabledGroup("stampFields", B("stampEnabled"));
    if (G("whFields")) setDisabledGroup("whFields", B("whEnabled"));
    if (G("acompteFields")) setDisabledGroup("acompteFields", B("acompteEnabled"));
    if (G("reglementFields")) setDisabledGroup("reglementFields", B("reglementEnabled"));
    const reglementDays = G("reglementDays");
    if (reglementDays) {
      const daysActive = B("reglementEnabled") && B("reglementTypeDays");
      reglementDays.disabled = !daysActive;
    }
    if (window.SEM?.computeTotals) window.SEM.computeTotals();
    updateFodecAutoField();
  };

  [
    "shipEnabled",
    "shipAmount",
    "shipTva",
    "shipLabel",
    "dossierEnabled",
    "dossierAmount",
    "dossierTva",
    "dossierLabel",
    "deplacementEnabled",
    "deplacementAmount",
    "deplacementTva",
    "deplacementLabel",
    "stampEnabled",
    "stampAmount",
    "stampLabel",
    "whEnabled",
    "whRate",
    "whBase",
    "whThreshold",
    "whLabel",
    "whNote",
    "acompteEnabled",
    "acomptePaid",
    "reglementEnabled",
    "reglementTypeReception",
    "reglementTypeDays",
    "reglementDays",
  ].forEach((id) => {
    const el = G(id);
    if (el) {
      el.addEventListener("input", refresh);
      el.addEventListener("change", refresh);
    }
  });

  refresh();
}

if (typeof window !== "undefined") {
  window.updateFodecAutoField = updateFodecAutoField;
}
