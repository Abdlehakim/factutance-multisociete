(function (w) {
  const renderDocMetaBoxNewDoc = () => {
    const template = `
      <fieldset class="section-box" id="docMetaBoxNewDoc">
        <legend id="docTypeLegend">
          <span class="legend-text for-facture">Facture :</span>
          <span class="legend-text for-fa">Facture d'achat :</span>
          <span class="legend-text for-avoir">Facture d'avoir :</span>
          <span class="legend-text for-devis">Devis :</span>
          <span class="legend-text for-bl">Bon de livraison :</span>
        </legend>

        <div class="doc-meta-grid doc-meta-grid--stacked">
          <div class="doc-meta-grid__row doc-meta-grid__row--top">
            <div class="doc-meta-grid__item">
              <label class="doc-type-field">
                <span id="docTypeLabelText" class="model-save-dot">Type de document</span>
                <div class="doc-type-field__controls">
                  <details id="docTypeMenu" class="field-toggle-menu doc-type-menu">
                    <summary
                      class="btn success field-toggle-trigger"
                      role="button"
                      aria-haspopup="listbox"
                      aria-expanded="false"
                      aria-labelledby="docTypeLabelText docTypeDisplay"
                    >
                      <span id="docTypeDisplay">Facture</span>
                    </summary>
                  </details>
                  <select id="docType" class="doc-type-select" aria-hidden="true" tabindex="-1">
                    <option value="facture" selected>Facture</option>
                    <option value="fa">Facture d'achat</option>
                    <option value="avoir">Facture d'avoir</option>
                    <option value="devis">Devis</option>
                    <option value="bl">Bon de livraison</option>
                  </select>
                </div>
              </label>
            </div>

            <div class="doc-meta-grid__item">
              <label class="doc-model-field" for="docMetaModelSelect">
                <span id="docMetaModelLabelText" class="model-save-dot">Mod&egrave;le</span>
                <div class="doc-model-field__controls doc-dialog-model-picker__field">
                  <details id="docMetaModelMenu" class="field-toggle-menu model-select-menu doc-dialog-model-menu doc-history-model-menu">
                    <summary
                      class="btn success field-toggle-trigger"
                      role="button"
                      aria-haspopup="listbox"
                      aria-expanded="false"
                      aria-labelledby="docMetaModelLabelText docMetaModelDisplay"
                    >
                      <span id="docMetaModelDisplay" class="model-select-display">S&eacute;lectionner un mod&egrave;le</span>
                      <span class="chevron" aria-hidden="true">
                        <svg viewBox="0 0 16 16" focusable="false" aria-hidden="true" width="16" height="16">
                          <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                        </svg>
                      </span>
                    </summary>
                    <div
                      id="docMetaModelPanel"
                      class="field-toggle-panel model-select-panel doc-history-model-panel"
                      role="listbox"
                      aria-labelledby="docMetaModelLabelText"
                    ></div>
                  </details>
                  <select id="docMetaModelSelect" class="doc-model-select-native doc-dialog-model-select" aria-hidden="true" tabindex="-1">
                    <option value="">S&eacute;lectionner un mod&egrave;le</option>
                  </select>
                </div>
              </label>
            </div>

            <div class="doc-meta-grid__item doc-meta-grid__item--number">
              <label class="inv-number-field">
                <span id="invNumberLabel">
                  <span class="for-facture">N&deg; de facture</span>
                  <span class="for-fa">N&deg; de facture d'achat</span>
                  <span class="for-avoir">N&deg; de facture d'avoir</span>
                  <span class="for-devis">N&deg; de devis</span>
                  <span class="for-bl">N&deg; de bon de livraison</span>
                </span>
                <div class="inv-number-field__controls">
                  <select id="invNumberLength" class="inv-length-select" aria-hidden="true" tabindex="-1">
                    <option value="4" selected>4 </option>
                    <option value="6">6 </option>
                    <option value="8">8 </option>
                    <option value="12">12 </option>
                  </select>
                  <div class="inv-number-input inv-number-input--split">
                    <input
                      id="invNumberPrefix"
                      class="inv-number-input__prefix"
                      placeholder="Fact"
                    />
                    <input
                      id="invNumberDatePart"
                      class="inv-number-input__date"
                      aria-readonly="true"
                      readonly
                      tabindex="-1"
                      placeholder="_25-12-"
                    />
                    <input
                      id="invNumberSuffix"
                      class="inv-number-input__suffix"
                      inputmode="numeric"
                      placeholder="1"
                    />
                  </div>
                  <div class="inv-number-input inv-number-input--single">
                    <input
                      id="invNumber"
                      class="inv-number-input__full"
                      type="text"
                      placeholder="FA-2025-001"
                    />
                  </div>
                </div>
              </label>
            </div>
          </div>

          <div class="doc-meta-grid__row doc-meta-grid__row--bottom">
            <div class="doc-meta-grid__item">
              <div class="currency-field">
                <div class="currency-field__grid">
                  <label class="currency-field__column">
                    <span id="currencyLabelText" class="model-save-dot">Devise</span>
                    <div class="currency-field__controls">
                      <details id="currencyMenu" class="field-toggle-menu currency-menu">
                        <summary
                          class="btn success field-toggle-trigger"
                          role="button"
                          aria-haspopup="listbox"
                          aria-expanded="false"
                          aria-labelledby="currencyLabelText currencyDisplay"
                        >
                          <span id="currencyDisplay">DT</span>
                        </summary>
                      </details>
                      <select id="currency" class="currency-select" aria-hidden="true" tabindex="-1">
                        <option value="DT">DT</option>
                        <option value="EUR">EUR</option>
                        <option value="USD">USD</option>
                      </select>
                    </div>
                  </label>

                  <label class="currency-field__column">
                    <span id="taxLabelText" class="model-save-dot">Taxe</span>
                    <div class="currency-field__controls">
                      <details id="taxMenu" class="field-toggle-menu currency-menu">
                        <summary
                          class="btn success field-toggle-trigger"
                          role="button"
                          aria-haspopup="listbox"
                          aria-expanded="false"
                          aria-labelledby="taxLabelText taxDisplay"
                        >
                          <span id="taxDisplay">Avec taxe</span>
                        </summary>
                      </details>
                      <select id="taxMode" class="currency-select" aria-hidden="true" tabindex="-1">
                        <option value="with">Avec taxe</option>
                        <option value="without">Sans taxe</option>
                      </select>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            <div class="doc-meta-grid__item">
              <label class="doc-date-field">
                <span>Date</span>
                <div class="swb-date-picker" data-date-picker="">
                  <input
                    id="invDate"
                    type="text"
                    inputmode="numeric"
                    placeholder="AAAA-MM-JJ"
                    autocomplete="off"
                    spellcheck="false"
                    aria-haspopup="dialog"
                    aria-expanded="false"
                    role="combobox"
                    aria-controls="invDatePanel"
                  />
                  <button
                    type="button"
                    class="swb-date-picker__toggle"
                    data-date-picker-toggle=""
                    aria-label="Choisir une date"
                    aria-haspopup="dialog"
                    aria-expanded="false"
                    aria-controls="invDatePanel"
                  >
                    <svg
                      class="swb-date-picker__toggle-icon"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.5"
                      aria-hidden="true"
                      focusable="false"
                    >
                      <rect x="3.5" y="5" width="17" height="15" rx="2" />
                      <path d="M8 3.5v3M16 3.5v3M3.5 10h17" stroke-linecap="round" />
                    </svg>
                  </button>
                  <div
                    class="swb-date-picker__panel"
                    data-date-picker-panel=""
                    role="dialog"
                    aria-modal="false"
                    aria-label="Choisir une date"
                    tabindex="-1"
                    id="invDatePanel"
                    hidden
                  ></div>
                </div>
              </label>
            </div>
          </div>
        </div>
      </fieldset>
    `;
    const tpl = document.createElement("template");
    tpl.innerHTML = template.trim();
    return tpl.content.firstElementChild;
  };

  w.DocMetaBoxNewDoc = { render: renderDocMetaBoxNewDoc };
})(window);
