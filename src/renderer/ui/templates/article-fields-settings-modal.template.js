import { renderArticleFormPreview } from "./article-form-popover.template.js";

const renderDefaultOption = ({ key, label, ariaLabel }) => `
  <div class="client-field-label-option">
    <div class="client-field-label-header">
      <span>${label}</span>
    </div>
    <div class="client-field-label-input-wrap">
      <input type="number" min="0" step="0.01" class="client-field-label-input" data-article-default-input="${key}" aria-label="${ariaLabel}" />
    </div>
  </div>
`;

const renderToggleOption = ({ id, key, label, ariaLabel, checked = false }) => {
  const checkedAttr = checked ? " checked" : "";
  return `
  <label class="toggle-option">
    <input id="${id}" data-column-key="${key}" type="checkbox" class="article-fields-toggle" aria-label="${ariaLabel}"${checkedAttr} />
    <span class="model-save-dot">${label}</span>
  </label>
`;
};

const renderLabelOption = ({ key, label, inputAriaLabel, resetAriaLabel }) => `
  <div class="client-field-label-option">
    <div class="client-field-label-header">
      <span class="article-field-label-default" data-article-field-label="${key}">${label}</span>
    </div>
    <div class="client-field-label-input-wrap">
      <input type="text" class="client-field-label-input" data-article-field-label-input="${key}" aria-label="${inputAriaLabel}" />
      <button type="button" class="client-field-label-reset" data-article-field-label-reset="${key}" aria-label="${resetAriaLabel}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 12a9 9 0 1 0 3-6.7" stroke-linecap="round" />
          <path d="M3 4v6h6" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
    </div>
  </div>
`;

const renderStepPanelNavigation = () => `
  <div class="article-fields-modal__panel-actions">
    <div class="model-stepper__actions-left client-search__actions client-saved-modal__actions-left doc-history-modal__actions-left">
      <button
        type="button"
        class="btn ghost tiny model-stepper__nav model-stepper__cancel better-style"
        data-article-fields-modal-close
      >
        Annuler
      </button>
    </div>
    <div class="model-stepper__actions-right client-search__actions client-saved-modal__pager doc-history-modal__pager">
      <button
        type="button"
        class="btn ghost tiny model-stepper__nav model-stepper__nav--prev better-style"
        data-article-fields-step-prev
        aria-label="Aller &agrave; l'&eacute;tape pr&eacute;c&eacute;dente"
      >
        Pr&eacute;c&eacute;dent
      </button>
      <button
        type="button"
        class="btn success tiny model-stepper__nav model-stepper__nav--next better-style"
        data-article-fields-step-next
        aria-label="Aller &agrave; l'&eacute;tape suivante"
      >
        Suivant
      </button>
      <button
        type="button"
        class="btn success tiny model-stepper__nav model-stepper__nav--next better-style"
        data-article-fields-modal-save
      >
        Enregistrer
      </button>
    </div>
  </div>
`;

const DEFAULTS_PURCHASE = [
  {
    key: "purchaseTva",
    label: "TVA A.",
    ariaLabel: "Modifier valeur par d&eacute;faut TVA A."
  },
  {
    key: "purchaseFodecTva",
    label: "TVA FODEC A.",
    ariaLabel: "Modifier valeur par d&eacute;faut TVA FODEC Achat %"
  },
  {
    key: "purchaseFodecRate",
    label: "Taux FODEC A.",
    ariaLabel: "Modifier valeur par d&eacute;faut Taux FODEC Achat %"
  }
];

const DEFAULTS_SALES = [
  {
    key: "tva",
    label: "TVA V.",
    ariaLabel: "Modifier valeur par d&eacute;faut TVA %"
  },
  {
    key: "fodecTva",
    label: "TVA FODEC V.",
    ariaLabel: "Modifier valeur par d&eacute;faut TVA FODEC Vente %"
  },
  {
    key: "fodecRate",
    label: "Taux FODEC V.",
    ariaLabel: "Modifier valeur par d&eacute;faut Taux FODEC Vente %"
  }
];

const FIELD_TOGGLES_COMMON = [
  {
    id: "articleFieldsToggleRef",
    key: "ref",
    label: "R&eacute;f&eacute;rence",
    ariaLabel: "Afficher colonne R&eacute;f&eacute;rence",
    checked: true
  },
  {
    id: "articleFieldsToggleProduct",
    key: "product",
    label: "D&eacute;signation",
    ariaLabel: "Afficher colonne D&eacute;signation",
    checked: true
  },
  {
    id: "articleFieldsToggleDesc",
    key: "desc",
    label: "Description",
    ariaLabel: "Afficher colonne Description"
  },
  {
    id: "articleFieldsToggleStockQty",
    key: "stockQty",
    label: "Stock disponible",
    ariaLabel: "Afficher champ Stock disponible",
    checked: true
  },
  {
    id: "articleFieldsToggleUnit",
    key: "unit",
    label: "Unit&eacute;",
    ariaLabel: "Afficher colonne Unit&eacute;",
    checked: true
  }
];

const FIELD_TOGGLES_PURCHASE = [
  {
    id: "articleFieldsTogglePurchasePrice",
    key: "purchasePrice",
    label: "PU A. HT",
    ariaLabel: "Afficher champ PU A. HT"
  },
  {
    id: "articleFieldsTogglePurchaseTva",
    key: "purchaseTva",
    label: "TVA A.",
    ariaLabel: "Afficher champ TVA A."
  },
  {
    id: "articleFieldsTogglePurchaseDiscount",
    key: "purchaseDiscount",
    label: "Remise A.",
    ariaLabel: "Afficher champ Remise A."
  },
  {
    id: "articleFieldsToggleAddPurchaseFodec",
    key: "addPurchaseFodec",
    label: "Ajouter FODEC Achat",
    ariaLabel: "Afficher Ajouter FODEC Achat"
  },
  {
    id: "articleFieldsToggleTotalPurchaseHt",
    key: "totalPurchaseHt",
    label: "Total A. HT",
    ariaLabel: "Afficher colonne Total A. HT"
  },
  {
    id: "articleFieldsToggleTotalPurchaseTtc",
    key: "totalPurchaseTtc",
    label: "Total A. TTC",
    ariaLabel: "Afficher colonne Total A. TTC"
  }
];

const FIELD_TOGGLES_SALES = [
  {
    id: "articleFieldsTogglePrice",
    key: "price",
    label: "P.U. HT",
    ariaLabel: "Afficher colonne Prix",
    checked: true
  },
  {
    id: "articleFieldsToggleTva",
    key: "tva",
    label: "TVA",
    ariaLabel: "Afficher colonne TVA",
    checked: true
  },
  {
    id: "articleFieldsToggleDiscount",
    key: "discount",
    label: "Remise",
    ariaLabel: "Afficher colonne Remise",
    checked: true
  },
  {
    id: "articleFieldsToggleAddFodec",
    key: "addFodec",
    label: "Ajouter FODEC Vente",
    ariaLabel: "Afficher Ajouter FODEC Vente",
    checked: true
  },
  {
    id: "articleFieldsToggleTotalHt",
    key: "totalHt",
    label: "Total HT",
    ariaLabel: "Afficher colonne Total HT",
    checked: true
  },
  {
    id: "articleFieldsToggleTotalTtc",
    key: "totalTtc",
    label: "Total TTC",
    ariaLabel: "Afficher colonne Total TTC",
    checked: true
  }
];

const LABELS_COMMON = [
  {
    key: "ref",
    label: "R&eacute;f.",
    inputAriaLabel: "Modifier libelle R&eacute;f.",
    resetAriaLabel: "Reinitialiser libelle R&eacute;f."
  },
  {
    key: "product",
    label: "D&eacute;signation",
    inputAriaLabel: "Modifier libelle D&eacute;signation",
    resetAriaLabel: "Reinitialiser libelle D&eacute;signation"
  },
  {
    key: "desc",
    label: "Description",
    inputAriaLabel: "Modifier libelle Description",
    resetAriaLabel: "Reinitialiser libelle Description"
  },
  {
    key: "qty",
    label: "Qt&eacute;",
    inputAriaLabel: "Modifier libelle Qt&eacute;",
    resetAriaLabel: "Reinitialiser libelle Qt&eacute;"
  },
  {
    key: "unit",
    label: "Unit&eacute;",
    inputAriaLabel: "Modifier libelle Unit&eacute;",
    resetAriaLabel: "Reinitialiser libelle Unit&eacute;"
  },
  {
    key: "stockQty",
    label: "Stock disponible",
    inputAriaLabel: "Modifier libelle Stock disponible",
    resetAriaLabel: "Reinitialiser libelle Stock disponible"
  }
];

const LABELS_PURCHASE = [
  {
    key: "purchasePrice",
    label: "PU A. HT",
    inputAriaLabel: "Modifier libelle PU A. HT",
    resetAriaLabel: "Reinitialiser libelle PU A. HT"
  },
  {
    key: "purchaseTva",
    label: "TVA A.",
    inputAriaLabel: "Modifier libelle TVA A.",
    resetAriaLabel: "Reinitialiser libelle TVA A."
  },
  {
    key: "purchaseFodecRate",
    label: "Taux %",
    inputAriaLabel: "Modifier libelle Taux FODEC Achat %",
    resetAriaLabel: "Reinitialiser libelle Taux FODEC Achat %"
  },
  {
    key: "purchaseFodecTva",
    label: "TVA %",
    inputAriaLabel: "Modifier libelle TVA FODEC Achat %",
    resetAriaLabel: "Reinitialiser libelle TVA FODEC Achat %"
  },
  {
    key: "purchaseFodecAmount",
    label: "FODEC A.",
    inputAriaLabel: "Modifier libelle Montant FODEC Achat (auto)",
    resetAriaLabel: "Reinitialiser libelle Montant FODEC Achat (auto)"
  },
  {
    key: "totalPurchaseHt",
    label: "Total A. HT",
    inputAriaLabel: "Modifier libelle Total A. HT",
    resetAriaLabel: "Reinitialiser libelle Total A. HT"
  },
  {
    key: "totalPurchaseTtc",
    label: "Total A. TTC",
    inputAriaLabel: "Modifier libelle Total A. TTC",
    resetAriaLabel: "Reinitialiser libelle Total A. TTC"
  }
];

const LABELS_SALES = [
  {
    key: "price",
    label: "P.U. HT",
    inputAriaLabel: "Modifier libelle P.U. HT",
    resetAriaLabel: "Reinitialiser libelle P.U. HT"
  },
  {
    key: "tva",
    label: "TVA %",
    inputAriaLabel: "Modifier libelle TVA %",
    resetAriaLabel: "Reinitialiser libelle TVA %"
  },
  {
    key: "discount",
    label: "Remise %",
    inputAriaLabel: "Modifier libelle Remise %",
    resetAriaLabel: "Reinitialiser libelle Remise %"
  },
  {
    key: "fodecRate",
    label: "Taux %",
    inputAriaLabel: "Modifier libelle Taux %",
    resetAriaLabel: "Reinitialiser libelle Taux %"
  },
  {
    key: "fodecTva",
    label: "TVA %",
    inputAriaLabel: "Modifier libelle TVA %",
    resetAriaLabel: "Reinitialiser libelle TVA %"
  },
  {
    key: "fodecAmount",
    label: "FODEC",
    inputAriaLabel: "Modifier libelle FODEC",
    resetAriaLabel: "Reinitialiser libelle FODEC"
  },
  {
    key: "totalHt",
    label: "Total HT",
    inputAriaLabel: "Modifier libelle Total HT",
    resetAriaLabel: "Reinitialiser libelle Total HT"
  },
  {
    key: "totalTtc",
    label: "Total TTC",
    inputAriaLabel: "Modifier libelle Total TTC",
    resetAriaLabel: "Reinitialiser libelle Total TTC"
  }
];

export const renderArticleFieldsSettingsModal = () => `
  <div id="articleFieldsSettingsModal" class="swbDialog article-fields-settings-modal client-ledger-modal payments-history-modal" hidden aria-hidden="true">
    <div
      class="swbDialog__panel payments-history-modal__panel doc-history-modal__panel article-fields-settings-modal__panel"
      role="dialog"
      aria-modal="true"
      aria-labelledby="articleFieldsSettingsModalTitle"
    >
      <div class="swbDialog__header">
        <div id="articleFieldsSettingsModalTitle" class="swbDialog__title">Champs de l&apos;article</div>
        <button
          type="button"
          class="swbDialog__close"
          data-article-fields-modal-close
          aria-label="Fermer"
        >
          <svg stroke="currentColor" fill="none" stroke-width="0" viewBox="0 0 24 24" height="200px" width="200px" xmlns="http://www.w3.org/2000/svg">
            <path d="M16.3394 9.32245C16.7434 8.94589 16.7657 8.31312 16.3891 7.90911C16.0126 7.50509 15.3798 7.48283 14.9758 7.85938L12.0497 10.5866L9.32245 7.66048C8.94589 7.25647 8.31312 7.23421 7.90911 7.61076C7.50509 7.98731 7.48283 8.62008 7.85938 9.0241L10.5866 11.9502L7.66048 14.6775C7.25647 15.054 7.23421 15.6868 7.61076 16.0908C7.98731 16.4948 8.62008 16.5171 9.0241 16.1405L11.9502 13.4133L14.6775 16.3394C15.054 16.7434 15.6868 16.7657 16.0908 16.3891C16.4948 16.0126 16.5171 15.3798 16.1405 14.9758L13.4133 12.0497L16.3394 9.32245Z" fill="currentColor"></path>
            <path fill-rule="evenodd" clip-rule="evenodd" d="M1 12C1 5.92487 5.92487 1 12 1C18.0751 1 23 5.92487 23 12C23 18.0751 18.0751 23 12 23C5.92487 23 1 18.0751 1 12ZM12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21Z" fill="currentColor"></path>
          </svg>
        </button>
      </div>
      <div class="swbDialog__msg payments-history-modal__body article-fields-settings-modal__body">
        <div class="article-fields-settings-modal__layout">
          <div class="article-fields-modal">
            <div class="model-stepper article-fields-stepper" data-article-fields-stepper>
              <div
                class="model-stepper__labels"
                role="tablist"
                aria-label="Navigation des sections des champs de l'article"
              >
                <button
                  type="button"
                  class="model-stepper__step is-active"
                  data-article-fields-step="1"
                  role="tab"
                  aria-selected="true"
                  aria-controls="articleFieldsStepPanel1"
                  id="articleFieldsStepLabel1"
                >
                  <span class="model-stepper__badge">1</span>
                  <span class="model-stepper__title">Valeurs par d&eacute;faut</span>
                </button>
                <button
                  type="button"
                  class="model-stepper__step"
                  data-article-fields-step="2"
                  role="tab"
                  aria-selected="false"
                  aria-controls="articleFieldsStepPanel2"
                  id="articleFieldsStepLabel2"
                >
                  <span class="model-stepper__badge">2</span>
                  <span class="model-stepper__title">Champs de l&apos;article</span>
                </button>
                <button
                  type="button"
                  class="model-stepper__step"
                  data-article-fields-step="3"
                  role="tab"
                  aria-selected="false"
                  aria-controls="articleFieldsStepPanel3"
                  id="articleFieldsStepLabel3"
                >
                  <span class="model-stepper__badge">3</span>
                  <span class="model-stepper__title">Personnaliser les libell&eacute;s</span>
                </button>
              </div>

              <div class="model-stepper__panels">
                <section
                  class="model-stepper__panel is-active"
                  data-article-fields-step-panel="1"
                  id="articleFieldsStepPanel1"
                  role="tabpanel"
                  aria-labelledby="articleFieldsStepLabel1"
                >
                  <div class="model-field-toggles">
                    <div class="field-toggle-menu__subtitle">Valeurs par d&eacute;faut</div>
                    <div class="field-toggle-panel field-toggle-panel--defaults">
                      <div class="article-fields-modal__split">
                        <div class="article-fields-modal__column article-fields-modal__column--purchase">
                          <div class="article-fields-modal__column-title">Achat</div>
                          ${DEFAULTS_PURCHASE.map((option) => renderDefaultOption(option)).join("")}
                        </div>
                        <div class="article-fields-modal__column article-fields-modal__column--sales">
                          <div class="article-fields-modal__column-title">Vente</div>
                          ${DEFAULTS_SALES.map((option) => renderDefaultOption(option)).join("")}
                        </div>
                      </div>
                    </div>
                  </div>
                  ${renderStepPanelNavigation()}
                </section>

                <section
                  class="model-stepper__panel"
                  data-article-fields-step-panel="2"
                  id="articleFieldsStepPanel2"
                  role="tabpanel"
                  aria-labelledby="articleFieldsStepLabel2"
                  hidden
                >
                  <div class="model-field-toggles">
                    <div class="field-toggle-menu__title">Champs de l&apos;article</div>
                    <div class="field-toggle-panel field-toggle-panel--fields">
                      <div class="article-fields-modal__common-group">
                        <div class="article-fields-modal__column-title">Communs</div>
                        <div class="article-fields-modal__toggle-grid">
                          ${FIELD_TOGGLES_COMMON.map((option) => renderToggleOption(option)).join("")}
                        </div>
                      </div>
                      <div class="article-fields-modal__split">
                        <div
                          class="article-fields-modal__column article-fields-modal__column--purchase"
                          data-article-fields-purchase-toggles
                        >
                          <div class="article-fields-modal__column-header">
                            <div class="article-fields-modal__column-title">Achat</div>
                            <label class="article-fields-modal__section-master">
                              <input
                                id="articleFieldsHidePurchaseToggle"
                                type="checkbox"
                                data-article-fields-hide-purchase
                                checked
                                aria-label="Afficher section Achat"
                              />
                            </label>
                          </div>
                          <div class="article-fields-modal__toggle-grid" data-article-fields-purchase-grid>
                            ${FIELD_TOGGLES_PURCHASE.map((option) => renderToggleOption(option)).join("")}
                          </div>
                        </div>
                        <div
                          class="article-fields-modal__column article-fields-modal__column--sales"
                          data-article-fields-sales-toggles
                        >
                          <div class="article-fields-modal__column-header">
                            <div class="article-fields-modal__column-title">Vente</div>
                            <label class="article-fields-modal__section-master">
                              <input
                                id="articleFieldsHideSalesToggle"
                                type="checkbox"
                                data-article-fields-hide-sales
                                checked
                                aria-label="Afficher section Vente"
                              />
                            </label>
                          </div>
                          <div class="article-fields-modal__toggle-grid" data-article-fields-sales-grid>
                            ${FIELD_TOGGLES_SALES.map((option) => renderToggleOption(option)).join("")}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  ${renderStepPanelNavigation()}
                </section>

                <section
                  class="model-stepper__panel"
                  data-article-fields-step-panel="3"
                  id="articleFieldsStepPanel3"
                  role="tabpanel"
                  aria-labelledby="articleFieldsStepLabel3"
                  hidden
                >
                  <div class="model-field-toggles">
                    <div class="field-toggle-menu__subtitle">Personnaliser les libell&eacute;s</div>
                    <div class="field-toggle-panel field-toggle-panel--labels">
                      <div class="article-fields-modal__common-group">
                        <div class="article-fields-modal__column-title">Communs</div>
                        <div class="article-fields-modal__label-grid">
                          ${LABELS_COMMON.map((option) => renderLabelOption(option)).join("")}
                        </div>
                      </div>
                      <div class="article-fields-modal__split">
                        <div class="article-fields-modal__column article-fields-modal__column--purchase">
                          <div class="article-fields-modal__column-title">Achat</div>
                          <div class="article-fields-modal__label-grid">
                            ${LABELS_PURCHASE.map((option) => renderLabelOption(option)).join("")}
                          </div>
                        </div>
                        <div class="article-fields-modal__column article-fields-modal__column--sales">
                          <div class="article-fields-modal__column-title">Vente</div>
                          <div class="article-fields-modal__label-grid">
                            ${LABELS_SALES.map((option) => renderLabelOption(option)).join("")}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  ${renderStepPanelNavigation()}
                </section>
              </div>
            </div>
          </div>
          <div class="article-fields-settings-preview-section">
            <div class="article-fields-settings-preview-section__title">Aper&ccedil;u</div>
            ${renderArticleFormPreview()}
          </div>
        </div>
      </div>
    </div>
  </div>
`;
