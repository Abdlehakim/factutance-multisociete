const resolveId = (prefix, id) => (prefix ? `${prefix}-${id}` : id);

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
      </div>
    </div>
  `;
};

export const renderArticleFormPopover = () => `
  <div id="articleFormPopover" class="swbDialog client-form-modal article-form-modal" hidden aria-hidden="true">
    <div
      class="swbDialog__panel client-form-modal__panel article-form-modal__panel"
      role="dialog"
      aria-modal="true"
      aria-labelledby="articleFormPopoverTitle"
    >
      <div class="swbDialog__header">
        <div id="articleFormPopoverTitle" class="swbDialog__title">Fiche article</div>
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
      <div class="client-form-modal__body article-form-modal__body swbDialog__msg">
        ${renderArticleFormFields()}
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
