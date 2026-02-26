const resolveId = (prefix, id) => (prefix ? `${prefix}-${id}` : id);

const renderArticleStockAlertsSection = ({ idPrefix = "", preview = false } = {}) => {
  const id = (value) => resolveId(idPrefix, value);
  const readOnlyNumberInput = preview ? " tabindex=\"-1\" aria-readonly=\"true\" disabled" : "";
  const disabledAttr = preview ? " disabled tabindex=\"-1\" aria-disabled=\"true\"" : "";
  const panelNumberDisabledAttr = preview ? readOnlyNumberInput : "";

  return `
    <section id="${id("stockAlertsSection")}" class="article-stock-panel__group article-stock-panel__group--alerts" aria-labelledby="${id("stockAlertsTitle")}">
      <h4 id="${id("stockAlertsTitle")}" class="article-stock-panel__group-title">Seuils &amp; alertes</h4>
      <div class="grid two article-stock-panel__toggle-grid">
        <div class="label-inline article-stock-panel__toggle-row">
          <input id="${id("addStockAllowNegative")}" type="checkbox" aria-label="Autoriser stock negatif"${disabledAttr} />
          <span class="label-text">Autoriser stock n&eacute;gatif</span>
        </div>
        <div class="label-inline article-stock-panel__toggle-row">
          <input id="${id("addStockBlockInsufficient")}" type="checkbox" aria-label="Bloquer sortie si stock insuffisant" checked${disabledAttr} />
          <span class="label-text">Bloquer sortie si stock insuffisant</span>
        </div>
      </div>
      <div class="label-inline article-stock-panel__toggle-row">
        <input id="${id("addStockAlert")}" type="checkbox" aria-label="Alerte stock"${disabledAttr} />
        <span class="label-text">Alerte stock</span>
      </div>
      <div class="grid two article-stock-panel__row">
        <div class="add-item-field">
          <label for="${id("addStockMin")}" class="label-text">Stock minimum</label>
          <input id="${id("addStockMin")}" type="number" min="0" step="1" value="1"${panelNumberDisabledAttr} />
        </div>
        <div class="add-item-field">
          <label for="${id("addStockMax")}" class="label-text">Stock maximum</label>
          <input id="${id("addStockMax")}" type="number" min="0" step="1" placeholder="Optionnel"${panelNumberDisabledAttr} />
        </div>
      </div>
    </section>
  `;
};

const renderArticleStockAlertsPanel = ({ idPrefix = "", preview = false } = {}) => {
  const id = (value) => resolveId(idPrefix, value);
  return `
    <section
      id="${id("addStockAlertsPanel")}"
      class="article-stock-panel article-stock-panel--alerts"
      aria-labelledby="${id("stockAlertsTitle")}"
    >
      <div class="article-stock-panel__content">
        ${renderArticleStockAlertsSection({ idPrefix, preview })}
      </div>
    </section>
  `;
};

const renderArticleStockPanel = ({ idPrefix = "", preview = false } = {}) => {
  const id = (value) => resolveId(idPrefix, value);
  const stockPickerDisabled = preview ? "true" : "false";
  const stockPickerSelectDisabledAttr = preview ? " disabled" : "";
  const readOnlyNumberInput = preview ? " tabindex=\"-1\" aria-readonly=\"true\" disabled" : "";

  return `
    <section
      id="${id("addStockManagementPanel")}"
      class="article-stock-panel"
      data-stock-management-panel
      data-stock-management-active="true"
      aria-labelledby="${id("stockSettingsTitle")}"
    >
      <div class="article-stock-panel__content">
        <section id="${id("stockParamsSection")}" class="article-stock-panel__group article-stock-panel__group--settings" aria-labelledby="${id("stockSettingsTitle")}">
          <h4 id="${id("stockSettingsTitle")}" class="article-stock-panel__group-title">Param&egrave;tres stock</h4>
          <div class="grid article-stock-panel__row article-stock-panel__row--depot-settings">
            <label class="doc-history-modal__filter article-stock-depot-filter">
              <span id="${id("addStockDefaultDepotLabel")}" class="label-text">D&eacute;p&ocirc;t/Magasin</span>
              <div class="doc-dialog-model-picker__field">
                <details
                  id="${id("addStockDefaultDepotMenu")}"
                  class="field-toggle-menu doc-dialog-model-menu doc-history-model-menu"
                  data-wired="1"
                  data-disabled="${stockPickerDisabled}"
                >
                  <summary
                    class="btn success field-toggle-trigger"
                    role="button"
                    aria-haspopup="listbox"
                    aria-expanded="false"
                    aria-labelledby="${id("addStockDefaultDepotLabel")} ${id("addStockDefaultDepotDisplay")}"
                    aria-disabled="${stockPickerDisabled}"
                  >
                    <span id="${id("addStockDefaultDepotDisplay")}" class="model-select-display">S&eacute;lectionner un d&eacute;p&ocirc;t</span>
                    <svg class="chevron" aria-hidden="true" focusable="false" stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="none" d="M0 0h24v24H0V0z"></path><path d="M12 4c4.41 0 8 3.59 8 8s-3.59 8-8 8-8-3.59-8-8 3.59-8 8-8m0-2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 13-4-4h8z"></path></svg>
                  </summary>
                  <div
                    class="field-toggle-panel model-select-panel doc-history-model-panel"
                    id="${id("addStockDefaultDepotPanel")}"
                    role="listbox"
                    aria-labelledby="${id("addStockDefaultDepotLabel")}"
                  ></div>
                </details>
                <select
                  id="${id("addStockDefaultDepot")}"
                  class="model-select doc-dialog-model-select"
                  aria-hidden="true"
                  tabindex="-1"
                  aria-disabled="${stockPickerDisabled}"${stockPickerSelectDisabledAttr}
                >
                <option value="">S&eacute;lectionner un d&eacute;p&ocirc;t</option>
                </select>
              </div>
            </label>
            <label class="doc-history-modal__filter article-stock-depot-filter article-stock-location-filter">
              <span id="${id("addStockDefaultLocationLabel")}" class="label-text">Emplacement</span>
              <div class="doc-dialog-model-picker__field">
                <details
                  id="${id("addStockDefaultLocationMenu")}"
                  class="field-toggle-menu doc-dialog-model-menu doc-history-model-menu"
                  data-wired="1"
                  data-disabled="${stockPickerDisabled}"
                >
                  <summary
                    class="btn success field-toggle-trigger"
                    role="button"
                    aria-haspopup="listbox"
                    aria-expanded="false"
                    aria-labelledby="${id("addStockDefaultLocationLabel")} ${id("addStockDefaultLocationDisplay")}"
                    aria-disabled="${stockPickerDisabled}"
                  >
                    <span id="${id("addStockDefaultLocationDisplay")}" class="model-select-display">Aucune</span>
                    <svg class="chevron" aria-hidden="true" focusable="false" stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="none" d="M0 0h24v24H0V0z"></path><path d="M12 4c4.41 0 8 3.59 8 8s-3.59 8-8 8-8-3.59-8-8 3.59-8 8-8m0-2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 13-4-4h8z"></path></svg>
                  </summary>
                  <div
                    class="field-toggle-panel model-select-panel doc-history-model-panel"
                    id="${id("addStockDefaultLocationPanel")}"
                    role="listbox"
                    aria-multiselectable="true"
                    aria-labelledby="${id("addStockDefaultLocationLabel")}"
                  ></div>
                </details>
                <select
                  id="${id("addStockDefaultLocation")}"
                  class="model-select doc-dialog-model-select"
                  multiple
                  aria-hidden="true"
                  tabindex="-1"
                  aria-disabled="${stockPickerDisabled}"${stockPickerSelectDisabledAttr}
                >
                </select>
              </div>
            </label>
            <div class="add-item-field article-stock-depot-qty-field">
              <label id="${id("addStockDepotQtyLabel")}" for="${id("addStockDepotQty")}" class="label-text">Stock Depot 1</label>
              <input id="${id("addStockDepotQty")}" type="number" min="0" step="1" value="0"${readOnlyNumberInput} />
            </div>
          </div>
        </section>

        <section class="article-stock-panel__group article-stock-panel__group--info" aria-labelledby="${id("stockInfoTitle")}">
          <h4 id="${id("stockInfoTitle")}" class="article-stock-panel__group-title">Informations</h4>
          <div class="article-stock-info-row article-stock-info-row--selection">
            <div class="add-item-field">
              <label for="${id("addStockSelectedDepotDisplay")}" class="label-text">D&eacute;p&ocirc;t/Magasin</label>
              <input id="${id("addStockSelectedDepotDisplay")}" value="-" readonly tabindex="-1" aria-readonly="true" disabled />
            </div>
            <div class="add-item-field" data-stock-selected-locations>
              <label class="label-text">Emplacement</label>
              <div id="${id("addStockSelectedLocationBadges")}" class="stock-location-badges" aria-label="Emplacements selectionnes"></div>
            </div>
          </div>
          <div class="article-stock-info-row">
            <div class="add-item-field">
              <label for="${id("addStockUnitDisplay")}" class="label-text">Unit&eacute; de stock</label>
              <input id="${id("addStockUnitDisplay")}" value="" readonly tabindex="-1" aria-readonly="true" disabled />
            </div>
            <div class="add-item-field">
              <label for="${id("addStockAvailableDisplay")}" class="label-text">Stock disponible</label>
              <input id="${id("addStockAvailableDisplay")}" value="0" readonly tabindex="-1" aria-readonly="true" disabled />
            </div>
            <div class="add-item-field">
              <label for="${id("addStockTotalCostAchat")}" class="label-text">Co&ucirc;t total de stock (Achat) (DT)</label>
              <input id="${id("addStockTotalCostAchat")}" value="0.000" readonly tabindex="-1" aria-readonly="true" disabled />
            </div>
            <div class="add-item-field">
              <label for="${id("addStockTotalValueVente")}" class="label-text">Valeur totale &agrave; la vente (DT)</label>
              <input id="${id("addStockTotalValueVente")}" value="0.000" readonly tabindex="-1" aria-readonly="true" disabled />
            </div>
          </div>
        </section>
      </div>
    </section>
  `;
};

const renderArticleFormFields = ({ idPrefix = "", preview = false } = {}) => {
  const id = (value) => resolveId(idPrefix, value);
  const previewField = (key) => (preview ? ` data-article-preview-field="${key}"` : "");
  const previewDefault = (key) => (preview ? ` data-article-preview-default-key="${key}"` : "");
  const readOnlyInput = preview ? " readonly tabindex=\"-1\" aria-readonly=\"true\" disabled" : "";
  const readOnlyNumberInput = preview ? " tabindex=\"-1\" aria-readonly=\"true\" disabled" : "";
  const purchaseFodecToggleAttrs = preview
    ? " checked disabled tabindex=\"-1\" aria-disabled=\"true\" data-article-preview-toggle=\"addPurchaseFodec\""
    : " class=\"col-toggle\" aria-label=\"Ajouter Fodec Achat\"";
  const salesFodecToggleAttrs = preview
    ? " checked disabled tabindex=\"-1\" aria-disabled=\"true\" data-article-preview-toggle=\"addFodec\""
    : " class=\"col-toggle\" aria-label=\"Ajouter FODEC Vente\"";
  const purchaseFodecActive = preview ? "true" : "false";
  const salesFodecActive = preview ? "true" : "false";
  const previewClass = preview ? " article-form-layout--preview" : "";

  return `
    <div class="grid article-form-layout${previewClass}">
      <div class="grid four">
        <div class="add-item-row add-item-row--ref-product full">
          <div class="add-item-field"${previewField("ref")}>
            <label for="${id("addRef")}" class="label-text" data-article-field-label="ref">R&eacute;f&eacute;rence</label>
            <input id="${id("addRef")}" placeholder="ex. : SRV-TURN-H"${readOnlyInput} />
          </div>

          <div class="add-item-field add-item-field--product"${previewField("product")}>
            <label for="${id("addProduct")}" class="label-text" data-article-field-label="product">D&eacute;signation</label>
            <input id="${id("addProduct")}" placeholder="ex. : D&eacute;signation de l'article ou du service"${readOnlyInput} />
          </div>
        </div>

        <div class="full add-item-field"${previewField("desc")}>
          <label for="${id("addDesc")}" class="label-text" data-article-field-label="desc">Description</label>
          <input id="${id("addDesc")}" placeholder="ex. : Mise en place, r&eacute;glage machine, usinage tournage sur plan client. Tol&eacute;rance &plusmn;0,05 mm, contr&ocirc;le dimensionnel inclu&hellip;"${readOnlyInput} />
        </div>

        <div class="add-item-field"${previewField("unit")}>
          <label for="${id("addUnit")}" class="label-text" data-article-field-label="unit">Unit&eacute;</label>
          <input id="${id("addUnit")}" placeholder="ex. : pcs"${readOnlyInput} />
        </div>

        <div class="add-item-field"${previewField("stockQty")}>
          <label for="${id("addStockQty")}" class="label-text" data-article-field-label="stockQty">Stock disponible</label>
          <input id="${id("addStockQty")}" type="number" min="0" step="1" value="0"${readOnlyNumberInput} />
        </div>

        <div class="article-pricing-layout full">
          <div class="article-pricing-column article-pricing-column--purchase">
            <div class="article-pricing-column__header">
              <span class="article-pricing-column__label">Achat</span>
            </div>
            <div class="add-pricing-row add-pricing-row--purchase">
              <div class="add-item-field"${previewField("purchasePrice")}>
                <label for="${id("addPurchasePrice")}" class="label-text" data-article-field-label="purchasePrice">PU A. HT</label>
                <input id="${id("addPurchasePrice")}" type="number" min="0" step="0.01" value="0"${readOnlyNumberInput} />
              </div>

              <div class="add-item-field"${previewField("purchaseTva")}>
                <label for="${id("addPurchaseTva")}" class="label-text" data-article-field-label="purchaseTva">TVA &agrave; l'achat&nbsp;%</label>
                <input id="${id("addPurchaseTva")}" type="number" min="0" step="0.01" value="0"${previewDefault("purchaseTva")}${readOnlyNumberInput} />
              </div>

              <div class="add-item-field"${previewField("purchaseDiscount")}>
                <label for="${id("addPurchaseDiscount")}" class="label-text" data-article-field-label="purchaseDiscount">Remise A.</label>
                <input
                  id="${id("addPurchaseDiscount")}"
                  type="number"
                  min="0"
                  step="0.01"
                  value="0"
                  aria-disabled="${preview ? "true" : "false"}"${previewDefault("purchaseDiscount")}${readOnlyNumberInput}
                />
              </div>

              <div class="add-fodec-row add-fodec-row--purchase" id="${id("addPurchaseFodecRow")}" data-fodec-active="${purchaseFodecActive}"${previewField("addPurchaseFodec")}>
                <div class="label-inline add-fodec-toggle">
                  <span class="label-text">Ajouter Fodec Achat</span>
                  <input id="${id("addPurchaseFodecEnabled")}" type="checkbox"${purchaseFodecToggleAttrs} />
                </div>
                <div class="fodec-fields">
                  <div class="add-item-field">
                    <label for="${id("addPurchaseFodecRate")}" class="label-text" data-article-field-label="purchaseFodecRate">Taux %</label>
                    <input id="${id("addPurchaseFodecRate")}" type="number" min="0" step="0.01" value="1"${previewDefault("purchaseFodecRate")}${readOnlyNumberInput} />
                  </div>
                  <div class="add-item-field">
                    <label for="${id("addPurchaseFodecTva")}" class="label-text" data-article-field-label="purchaseFodecTva">TVA %</label>
                    <input id="${id("addPurchaseFodecTva")}" type="number" min="0" step="0.01" value="19"${previewDefault("purchaseFodecTva")}${readOnlyNumberInput} />
                  </div>
                  <div class="add-item-field">
                    <label for="${id("addPurchaseFodecAmount")}" class="label-text" data-article-field-label="purchaseFodecAmount">FODEC A.</label>
                    <input id="${id("addPurchaseFodecAmount")}" type="number" readonly tabindex="-1" aria-readonly="true" disabled />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="article-pricing-column article-pricing-column--sales">
            <div class="article-pricing-column__header">
              <span class="article-pricing-column__label">Vente</span>
            </div>
            <div class="add-pricing-row add-pricing-row--sales">
              <div class="add-item-field"${previewField("price")}>
                <label for="${id("addPrice")}" class="label-text" id="${id("addPriceLabel")}" data-article-field-label="price">PU HT</label>
                <input id="${id("addPrice")}" type="number" min="0" step="0.01" value="0"${readOnlyNumberInput} />
              </div>

              <div class="add-item-field"${previewField("tva")}>
                <label for="${id("addTva")}" class="label-text model-save-dot" data-article-field-label="tva">TVA&nbsp;%</label>
                <input id="${id("addTva")}" type="number" min="0" step="0.01" value="19"${previewDefault("tva")}${readOnlyNumberInput} />
              </div>

              <div class="add-item-field"${previewField("discount")}>
                <label for="${id("addDiscount")}" class="label-text" data-article-field-label="discount">Remise&nbsp;%</label>
                <input id="${id("addDiscount")}" type="number" min="0" step="0.01" value="0"${readOnlyNumberInput} />
              </div>
            </div>

            <div class="add-fodec-row" id="${id("addFodecRow")}" data-fodec-active="${salesFodecActive}"${previewField("addFodec")}>
              <div class="label-inline add-fodec-toggle">
                <span class="label-text">Ajouter FODEC Vente</span>
                <input id="${id("addFodecEnabled")}" type="checkbox"${salesFodecToggleAttrs} />
              </div>
              <div class="fodec-fields">
                <div class="add-item-field">
                  <label for="${id("addFodecRate")}" class="label-text" data-article-field-label="fodecRate">Taux %</label>
                  <input id="${id("addFodecRate")}" type="number" min="0" step="0.01" value="1"${previewDefault("fodecRate")}${readOnlyNumberInput} />
                </div>
                <div class="add-item-field">
                  <label for="${id("addFodecTva")}" class="label-text" data-article-field-label="fodecTva">TVA %</label>
                  <input id="${id("addFodecTva")}" type="number" min="0" step="0.01" value="19"${previewDefault("fodecTva")}${readOnlyNumberInput} />
                </div>
                <div class="add-item-field">
                  <label for="${id("addFodecAmount")}" class="label-text" data-article-field-label="fodecAmount">FODEC V.</label>
                  <input id="${id("addFodecAmount")}" type="number" readonly tabindex="-1" aria-readonly="true" disabled />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="add-totals-row">
          <div data-field="${id("addTotalPurchaseHt")}" class="add-item-field"${previewField("totalPurchaseHt")}>
            <label for="${id("addTotalPurchaseHt")}" class="label-text" data-article-field-label="totalPurchaseHt">Total A. HT</label>
            <input id="${id("addTotalPurchaseHt")}" type="number" min="0" step="0.01" value="0" readonly tabindex="-1" aria-readonly="true"${preview ? " disabled" : ""} />
          </div>

          <div data-field="${id("addTotalPurchaseTtc")}" class="add-item-field"${previewField("totalPurchaseTtc")}>
            <label for="${id("addTotalPurchaseTtc")}" class="label-text" data-article-field-label="totalPurchaseTtc">Total A. TTC</label>
            <input id="${id("addTotalPurchaseTtc")}" type="number" min="0" step="0.01" value="0" readonly tabindex="-1" aria-readonly="true"${preview ? " disabled" : ""} />
          </div>

          <div data-field="${id("addTotalHt")}" class="add-item-field"${previewField("totalHt")}>
            <label for="${id("addTotalHt")}" class="label-text" data-article-field-label="totalHt">P.U. HT</label>
            <input id="${id("addTotalHt")}" type="number" min="0" step="0.01" value="0" readonly tabindex="-1" aria-readonly="true"${preview ? " disabled" : ""} />
          </div>

          <div data-field="${id("addTotalTtc")}" class="add-item-field"${previewField("totalTtc")}>
            <label for="${id("addTotalTtc")}" class="label-text" data-article-field-label="totalTtc">Prix unitaire TTC</label>
            <input id="${id("addTotalTtc")}" type="number" min="0" step="0.01" value="0" readonly tabindex="-1" aria-readonly="true"${preview ? " disabled" : ""} />
          </div>
        </div>

        <div class="add-totals-row add-totals-row--stock-values">
          <div class="add-item-field">
            <label for="${id("addTotalStockCostPurchase")}" class="label-text">Co&ucirc;t total de stock (Achat) (DT)</label>
            <input id="${id("addTotalStockCostPurchase")}" type="number" min="0" step="0.01" value="0" readonly tabindex="-1" aria-readonly="true"${preview ? " disabled" : ""} />
          </div>
          <div class="add-item-field">
            <label for="${id("addTotalStockValueSale")}" class="label-text">Valeur totale &agrave; la vente (DT)</label>
            <input id="${id("addTotalStockValueSale")}" type="number" min="0" step="0.01" value="0" readonly tabindex="-1" aria-readonly="true"${preview ? " disabled" : ""} />
          </div>
        </div>
      </div>
    </div>
  `;
};

export const renderArticleFormPopover = () => `
  <div id="articleFormPopover" class="swbDialog client-form-modal article-form-modal" data-mode="edit" hidden aria-hidden="true">
    <div
      class="swbDialog__panel client-form-modal__panel article-form-modal__panel"
      role="dialog"
      aria-modal="true"
      aria-label="Fiche article"
    >
      <div class="swbDialog__header">
        <div class="swbDialog__tabs" role="tablist" aria-label="Fiche article tabs">
          <button
            id="articleFormTabArticle"
            type="button"
            class="swbDialog__tab is-active"
            role="tab"
            aria-selected="true"
            aria-controls="articleFormTabPanelArticle"
            data-article-tab="article"
            tabindex="0"
          >
            Fiche article
          </button>
          <button
            id="articleFormTabAlerts"
            type="button"
            class="swbDialog__tab"
            role="tab"
            aria-selected="false"
            aria-controls="articleFormTabPanelAlerts"
            data-article-tab="alerts"
            tabindex="-1"
          >
            Seuils &amp; alertes
          </button>
          <button
            id="articleFormTabStock"
            type="button"
            class="swbDialog__tab"
            role="tab"
            aria-selected="false"
            aria-controls="articleFormTabPanelStock"
            data-article-tab="stock"
            data-depot-id="depot-1"
            data-depot-active="true"
            tabindex="-1"
          >
            <span class="tab-label">Depot 1</span>
          </button>
          <div id="articleDepotTabsRow" class="article-depot-tabs" aria-label="D&eacute;p&ocirc;ts de l'article"></div>
          <button
            id="articleDepotRemoveBtn"
            type="button"
            class="swbDialog__tabRemove"
            aria-label="Supprimer le d&eacute;p&ocirc;t actif"
          >−</button>
          <button
            id="articleDepotAddBtn"
            type="button"
            class="swbDialog__tabAdd"
            aria-label="Ajouter un d&eacute;p&ocirc;t"
          >+</button>
        </div>
        <button
          type="button"
          class="swbDialog__close"
          data-article-form-close
          aria-label="Fermer"
        >
          <svg stroke="currentColor" fill="none" stroke-width="0" viewBox="0 0 24 24" height="200px" width="200px" xmlns="http://www.w3.org/2000/svg">
            <path d="M16.3394 9.32245C16.7434 8.94589 16.7657 8.31312 16.3891 7.90911C16.0126 7.50509 15.3798 7.48283 14.9758 7.85938L12.0497 10.5866L9.32245 7.66048C8.94589 7.25647 8.31312 7.23421 7.90911 7.61076C7.50509 7.98731 7.48283 8.62008 7.85938 9.0241L10.5866 11.9502L7.66048 14.6775C7.25647 15.054 7.23421 15.6868 7.61076 16.0908C7.98731 16.4948 8.62008 16.5171 9.0241 16.1405L11.9502 13.4133L14.6775 16.3394C15.054 16.7434 15.6868 16.7657 16.0908 16.3891C16.4948 16.0126 16.5171 15.3798 16.1405 14.9758L13.4133 12.0497L16.3394 9.32245Z" fill="currentColor"></path>
            <path fill-rule="evenodd" clip-rule="evenodd" d="M1 12C1 5.92487 5.92487 1 12 1C18.0751 1 23 5.92487 23 12C23 18.0751 18.0751 23 12 23C5.92487 23 1 18.0751 1 12ZM12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21Z" fill="currentColor"></path>
          </svg>
        </button>
      </div>
      <div class="client-form-modal__body article-form-modal__body swbDialog__msg" data-stock-management-layout data-stock-management-active="true">
        <section
          id="articleFormTabPanelArticle"
          class="article-form-modal__tab-panel article-form-modal__tab-panel--article is-active"
          role="tabpanel"
          aria-labelledby="articleFormTabArticle"
          data-article-modal-panel="article"
        >
          ${renderArticleFormFields()}
        </section>
        <section
          id="articleFormTabPanelAlerts"
          class="article-form-modal__tab-panel article-form-modal__tab-panel--alerts"
          role="tabpanel"
          aria-labelledby="articleFormTabAlerts"
          data-article-modal-panel="alerts"
          hidden
          aria-hidden="true"
        >
          ${renderArticleStockAlertsPanel()}
        </section>
        <section
          id="articleFormTabPanelStock"
          class="article-form-modal__tab-panel article-form-modal__tab-panel--stock"
          role="tabpanel"
          aria-labelledby="articleFormTabStock"
          data-article-modal-panel="stock"
          hidden
          aria-hidden="true"
        >
          ${renderArticleStockPanel()}
        </section>
      </div>
      <div class="client-form-modal__actions swbDialog__actions">
        <div class="swbDialog__group swbDialog__group--left">
          <button
            id="articleFormPopoverCancel"
            type="button"
            class="swbDialog__cancel"
            data-article-form-close
          >
            Annuler
          </button>
        </div>
        <div class="swbDialog__group swbDialog__group--right">
          <button id="btnSaveArticle" type="button" class="swbDialog__ok" disabled>Enregistrer l'article</button>
          <button id="btnAddArticleFromPopover" type="button" class="swbDialog__ok" hidden aria-hidden="true" disabled aria-disabled="true">Ajouter</button>
          <button id="btnAddAndSaveArticleFromPopover" type="button" class="swbDialog__ok" hidden aria-hidden="true" disabled aria-disabled="true">Ajouter et enregistrer l'article</button>
          <button id="btnUpdateSavedArticle" type="button" class="swbDialog__ok" disabled hidden aria-hidden="true">Mettre a jour</button>
          <button id="btnUpdateInvoiceItem" type="button" class="swbDialog__ok" disabled hidden aria-hidden="true">Mettre &agrave; jour sur document</button>
          <button id="btnNewItem" type="button" class="swbDialog__ok" disabled>Nouveau</button>
        </div>
      </div>
    </div>
  </div>
`;

export const renderArticleFormPreview = () => `
  <div class="article-fields-settings-preview" data-article-form-preview>
    <div class="article-fields-settings-preview__header">
      <span class="article-fields-settings-preview__title">Fiche article</span>
    </div>
    <div class="article-fields-settings-preview__body">
      ${renderArticleFormFields({ idPrefix: "articlePreview", preview: true })}
    </div>
  </div>
`;
