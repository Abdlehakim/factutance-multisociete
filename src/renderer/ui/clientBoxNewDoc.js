(function (w) {
  const renderClientBoxNewDoc = () => {
    const template = `
      <fieldset class="section-box" id="clientBoxNewDoc">
        <legend>Client</legend>
        <div class="grid two">
          <div class="full client-search">
            <div class="client-search__controls">
              <label class="client-search__field">
                <input
                  id="clientSearch"
                  type="search"
                  placeholder="Nom, identifiant fiscal ou CIN / passeport"
                  autocomplete="off"
                />
                <button id="clientSearchBtn" type="button" class="client-search__action" aria-label="Rechercher">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="6" />
                    <line x1="16.5" y1="16.5" x2="21" y2="21" stroke-linecap="round" />
                  </svg>
                </button>
              </label>
              <button
                id="clientSavedListBtn"
                type="button"
                class="client-search__saved"
                aria-label="Afficher les clients enregistrés"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="5" cy="6" r="1.5" />
                  <circle cx="5" cy="12" r="1.5" />
                  <circle cx="5" cy="18" r="1.5" />
                  <line x1="9" y1="6" x2="20" y2="6" stroke-linecap="round" />
                  <line x1="9" y1="12" x2="20" y2="12" stroke-linecap="round" />
                  <line x1="9" y1="18" x2="20" y2="18" stroke-linecap="round" />
                </svg>
              </button>
              <button
                id="clientFormToggleBtn"
                type="button"
                class="client-search__saved client-search__saved--form"
                aria-label="Afficher la fiche client"
                aria-haspopup="dialog"
                aria-expanded="false"
                aria-controls="clientFormPopover"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 20c1.5-4 6.5-6 8-6s6.5 2 8 6" stroke-linecap="round" />
                </svg>
              </button>
            </div>
            <div id="clientSearchResults" class="client-search__results" hidden></div>
            <div class="client-search__selection-summary" id="clientSelectionSummaryNewDoc" aria-live="polite">
              <div class="client-search__details-grid">
                <div class="client-search__details-row client-search__details-row--identity">
                  <div class="client-search__detail client-search__detail--inline client-search__detail--name">
                    <span class="client-search__detail-label">Nom</span>
                    <span class="client-search__detail-value is-empty" id="clientSummaryNameNewDoc">-</span>
                  </div>
                  <div class="client-search__detail client-search__detail--inline client-search__detail--code">
                    <span class="client-search__detail-label">Code client</span>
                    <span class="client-search__detail-value is-empty" id="clientSummaryCodeNewDoc">-</span>
                  </div>
                  <button
                    id="clientClearSelectionBtn"
                    type="button"
                    class="client-search__summary-clear"
                    aria-label="Retirer le client selectionne"
                    title="Retirer le client"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <line x1="8" y1="8" x2="16" y2="16" stroke-linecap="round" />
                      <line x1="16" y1="8" x2="8" y2="16" stroke-linecap="round" />
                    </svg>
                  </button>
                </div>
                <div class="client-search__details-row client-search__details-row--taxes">
                  <div class="client-search__detail client-search__detail--inline client-search__detail--doc-taxes">
                    <span class="client-search__detail-label">Taxes</span>
                    <div class="client-search__doc-taxes">
                      <span id="clientDocTaxesLabel" class="sr-only">Taxes du document</span>
                      <div
                        id="clientDocTaxesPanel"
                        class="doc-history-convert-panel currency-panel currency-panel--inline client-search__doc-taxes-panel"
                        role="radiogroup"
                        aria-labelledby="clientDocTaxesLabel"
                      >
                        <label
                          class="toggle-option currency-toggle is-active"
                          data-client-doc-taxes-option="non_exonore"
                          aria-selected="true"
                        >
                          <input
                            type="radio"
                            name="clientDocTaxesChoice"
                            value="non_exonore"
                            class="col-toggle"
                            checked
                            aria-checked="true"
                          />
                          <span class="model-save-dot">Non exon&eacute;r&eacute;e</span>
                        </label>
                        <label
                          class="toggle-option currency-toggle"
                          data-client-doc-taxes-option="exonore"
                          aria-selected="false"
                        >
                          <input
                            type="radio"
                            name="clientDocTaxesChoice"
                            value="exonore"
                            class="col-toggle"
                            aria-checked="false"
                          />
                          <span class="model-save-dot">Exon&eacute;r&eacute;e</span>
                        </label>
                      </div>
                      <select id="clientDocTaxesMode" class="client-type-select doc-type-select" aria-hidden="true" tabindex="-1">
                        <option value="non_exonore" selected>Non exon&eacute;r&eacute;e</option>
                        <option value="exonore">Exon&eacute;r&eacute;e</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            ${w.ClientFieldsSettingsModal?.render?.() || ""}
            ${w.ClientFormPopover?.render?.() || ""}
          </div>
        </div>
      </fieldset>
    `;
    const tpl = document.createElement("template");
    tpl.innerHTML = template.trim();
    return tpl.content.firstElementChild;
  };

  w.ClientBoxNewDoc = { render: renderClientBoxNewDoc };
})(window);
