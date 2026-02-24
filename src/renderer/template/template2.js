const MODEL_PREVIEW_HEADER_HTML = [
  { key: "ref", label: "R&eacute;f." },
  { key: "product", label: "D&eacute;signation(s)" },
  { key: "desc", label: "Description(s)" },
  { key: "qty", label: "Qt&eacute;", nowrap: true },
  { key: "unit", label: "Unit&eacute;", nowrap: true },
  { key: "purchasePrice", label: "PU A. HT", nowrap: true },
  { key: "purchaseTva", label: "TVA A.", nowrap: true },
  { key: "price", label: "P.U. HT", nowrap: true },
  { key: "tva", label: "TVA %", nowrap: true },
  { key: "fodecSale", label: "FODEC", nowrap: true },
  { key: "discount", label: "Remise %", nowrap: true },
  { key: "fodecPurchase", label: "FODEC A.", nowrap: true },
  { key: "totalPurchaseHt", label: "Total A. HT", nowrap: true },
  { key: "totalHt", label: "Total HT", nowrap: true },
  { key: "totalPurchaseTtc", label: "Total A. TTC", nowrap: true },
  { key: "ttc", label: "Total TTC", nowrap: true },
]
  .map(({ key, label, nowrap }) => {
    const classes = [];
    if (nowrap) classes.push("no-wrap");
    const classAttr = classes.length ? ` class="${classes.join(" ")}"` : "";
    return `<th data-col="${key}"${classAttr}>${label}</th>`;
  })
  .join("");

const DOC_DESIGN1_DATA = {
  docTitle: "Facture",
  date: "2025-12-15",
  number: "Fact_25-12-5",
  company: {
    name: "SmartWebify",
    mf: "1891628/W/A/M/000",
    phone: "+216 27 673 561",
    email: "contact@smartwebify.com",
    address: "Av. 2 Mars 1934 Mahdia 5100",
  },
  client: {
    name: "SmartWebify",
    mf: "1891628/W/A/M/000",
    phone: "+216 27 673 561",
    email: "contact@smartwebify.com",
    address: "Av. 2 Mars 1934 Mahdia 5100",
  },
  items: [
    {
      ref: "reference",
      product: "Produit 1",
      desc: "description du produit 1",
      qty: "1",
      unit: "kg",
      purchasePrice: "850.000&nbsp;DT",
      purchaseTva: "19%",
      price: "1,000.000&nbsp;DT",
      fodecSale: "1%",
      fodecPurchase: "1%",
      tva: "19%",
      discount: "5%",
      totalPurchaseHt: "850.000&nbsp;DT",
      totalHt: "950.000&nbsp;DT",
      totalPurchaseTtc: "1,011.500&nbsp;DT",
      ttc: "1,130.500&nbsp;DT",
    },
  ],
  tvaBreakdown: [
    { label: "FODEC 1%", base: "950.000&nbsp;DT", amount: "9.500&nbsp;DT", className: "doc-design1__tva-fodec" },
    { label: "TVA 19%", base: "959.500&nbsp;DT", amount: "182.305&nbsp;DT" },
  ],
  tvaTotal: { label: "Total", amount: "191.805&nbsp;DT" },
  amountWordsHtml:
    "Arr&ecirc;t&eacute;e la pr&eacute;sente facture &agrave; la somme de :<br/><strong>Neuf cent quarante-neuf dinars et huit cent cinq millimes</strong>",
  footerNoteHtml: "<strong>IBAN : TN</strong>59 25 110 000 0027673561 68",
  miniSummary: [
    { label: "Frais de livraison", value: "7.000&nbsp;DT", key: "shipping", hidden: true },
    { label: "Total HT", value: "957.000&nbsp;DT", type: "head", key: "total-ht" },
    { label: "Total A. HT", value: "850.000&nbsp;DT", type: "head", key: "total-purchase-ht", hidden: true },
    { label: "Total Taxes", value: "191.805&nbsp;DT", key: "taxes" },
    { label: "Timbre fiscal", value: "1.000&nbsp;DT", key: "stamp", hidden: true },
    { label: "Frais du dossier", value: "0.000&nbsp;DT", key: "dossier", hidden: true },
    { label: "Frais de deplacement", value: "0.000&nbsp;DT", key: "deplacement", hidden: true },
    { label: "Total A. TTC", value: "1,011.500&nbsp;DT", type: "grand", key: "total-purchase-ttc", hidden: true },
    { label: "Total TTC", value: "1,149.805&nbsp;DT", type: "grand", key: "total-ttc" }
  ],
};

const DOC_DESIGN1_ITEMS_HTML = DOC_DESIGN1_DATA.items
  .map(
    ({
      ref,
      product,
      desc,
      qty,
      unit,
      purchasePrice,
      purchaseTva,
      price,
      tva,
      fodecSale,
      discount,
      fodecPurchase,
      totalPurchaseHt,
      totalHt,
      totalPurchaseTtc,
      ttc
    }) => `
      <tr class="doc-design1__row">
        <td data-col="ref">${ref}</td>
        <td data-col="product">${product}</td>
        <td data-col="desc">${desc}</td>
        <td data-col="qty" class="no-wrap">${qty}</td>
        <td data-col="unit" class="no-wrap">${unit}</td>
        <td data-col="purchasePrice" class="no-wrap">${purchasePrice}</td>
        <td data-col="purchaseTva" class="no-wrap">${purchaseTva}</td>
        <td data-col="price" class="no-wrap">${price}</td>
        <td data-col="tva" class="no-wrap">${tva}</td>
        <td data-col="fodecSale" class="no-wrap">${fodecSale}</td>
        <td data-col="discount" class="no-wrap">${discount}</td>
        <td data-col="fodecPurchase" class="no-wrap">${fodecPurchase}</td>
        <td data-col="totalPurchaseHt" class="no-wrap">${totalPurchaseHt}</td>
        <td data-col="totalHt" class="no-wrap">${totalHt}</td>
        <td data-col="totalPurchaseTtc" class="no-wrap">${totalPurchaseTtc}</td>
        <td data-col="ttc" class="no-wrap">${ttc}</td>
      </tr>`
  )
  .join("");

const DOC_DESIGN1_TVA_ROWS_HTML = DOC_DESIGN1_DATA.tvaBreakdown
  .map(
    ({ label, base, amount, className = "" }) => `
      <tr class="${className}">
        <td>${label}</td>
        <td class="right">${base}</td>
        <td class="right">${amount}</td>
      </tr>`
  )
  .join("");

const DOC_DESIGN1_MINI_ROWS_HTML = DOC_DESIGN1_DATA.miniSummary
  .map(({ label, value, type, key, hidden }) => {
    const classes = ["doc-design1__mini-row"];
    if (type === "head") classes.push("doc-design1__mini-row--head");
    if (type === "grand") classes.push("doc-design1__mini-row--grand");
    const Tag = type ? "th" : "td";
    const attrs = [];
    if (key) attrs.push(`data-mini-key="${key}"`);
    if (hidden) attrs.push(`style="display:none"`);
    return `
      <tr class="${classes.join(" ")}"${attrs.length ? " " + attrs.join(" ") : ""}><${Tag}>${label}</${Tag}><${Tag} class="right">${value}</${Tag}></tr>`;
  })
  .join("");

export const template2 = `
            <div class="model-actions-layout__preview">
              <div class="model-actions-layout__preview-toolbar" role="group" aria-label="Zoom de l'apercu du modele">
                <button
                  type="button"
                  id="modelPreviewZoomOut"
                  class="model-preview-zoom-btn"
                  data-model-preview-zoom="out"
                  aria-label="Zoom arriere"
                >
                  -
                </button>
                <input
                  id="modelPreviewZoomRange"
                  class="model-preview-zoom-range"
                  type="range"
                  min="40"
                  max="140"
                  step="1"
                  value="64"
                  aria-label="Niveau de zoom de l'apercu"
                />
                <button
                  type="button"
                  id="modelPreviewZoomIn"
                  class="model-preview-zoom-btn"
                  data-model-preview-zoom="in"
                  aria-label="Zoom avant"
                >
                  +
                </button>
                <button
                  type="button"
                  id="modelPreviewZoomReset"
                  class="model-preview-zoom-btn model-preview-zoom-btn--reset"
                  data-model-preview-zoom="reset"
                  aria-label="Reinitialiser le zoom"
                >
                  100%
                </button>
                <span id="modelPreviewZoomValue" class="model-preview-zoom-value" aria-live="polite">64%</span>
              </div>
              <div class="model-actions-layout__preview-scroll">
              <div class="model-actions-layout__preview-stage">
              <div class="doc-design1 model-actions-layout__preview-page" id="modelActionsPreview" aria-live="polite">
              <div>
                <div class="doc-design1__head">
                  <div class="doc-design1__logo-wrap">
                    <img id="modelPreviewLogo" class="doc-design1__logo" alt="Logo" />
                  </div>
                  <div class="doc-design1__head-right">
                    <h1 class="doc-design1__title" id="modelPreviewDoc">${DOC_DESIGN1_DATA.docTitle}</h1>
                    <p class="doc-design1__date">
                      Date&nbsp;: <span id="modelPreviewDate">${DOC_DESIGN1_DATA.date}</span>
                    </p>
                    <p class="doc-design1__number">
                      N&deg; : <span id="modelPreviewNumber" style="font-weight:600">${DOC_DESIGN1_DATA.number}</span>
                    </p>
                  </div>
                </div>
                </div>
                <div class="doc-design1__grid">
                  <div>
                    <p
                      class="doc-design1__text-strong"
                      id="modelPreviewCompanyName"
                      data-default="${DOC_DESIGN1_DATA.company.name}"
                    >
                      ${DOC_DESIGN1_DATA.company.name}
                    </p>
                    <p class="doc-design1__meta-line">
                      <span class="doc-design1__meta-label">MF&nbsp;:</span><span
                        class="doc-design1__meta-value"
                        id="modelPreviewCompanyMf"
                        data-default="${DOC_DESIGN1_DATA.company.mf}"
                      >
                        ${DOC_DESIGN1_DATA.company.mf}
                      </span>
                    </p>
                    <p class="doc-design1__meta-line">
                      <span class="doc-design1__meta-label">T&eacute;l&eacute;phone&nbsp;:</span><span
                        class="doc-design1__meta-value"
                        id="modelPreviewCompanyPhone"
                        data-default="${DOC_DESIGN1_DATA.company.phone}"
                      >
                        ${DOC_DESIGN1_DATA.company.phone}
                      </span>
                    </p>
                    <p class="doc-design1__meta-line">
                      <span class="doc-design1__meta-label">Email&nbsp;:</span><span
                        class="doc-design1__meta-value"
                        id="modelPreviewCompanyEmail"
                        data-default="${DOC_DESIGN1_DATA.company.email}"
                      >
                        ${DOC_DESIGN1_DATA.company.email}
                      </span>
                    </p>
                    <p class="doc-design1__meta-line doc-design1__meta-line--wrap">
                      <span class="doc-design1__meta-label">Adresse&nbsp;:</span><span
                        class="doc-design1__meta-value"
                        id="modelPreviewCompanyAddress"
                        data-default="${DOC_DESIGN1_DATA.company.address}"
                      >
                        ${DOC_DESIGN1_DATA.company.address}
                      </span>
                    </p>
                  </div>

                  <fieldset class="doc-design1__section">
                    <legend class="doc-design1__section-title">Client</legend>
                    <p class="doc-design1__client-name">${DOC_DESIGN1_DATA.client.name}</p>
                    <p class="doc-design1__meta-line"><span class="doc-design1__meta-label">MF&nbsp;:</span><span class="doc-design1__meta-value">${DOC_DESIGN1_DATA.client.mf}</span></p>
                    <p class="doc-design1__meta-line"><span class="doc-design1__meta-label">T&eacute;l&eacute;phone&nbsp;:</span><span class="doc-design1__meta-value">${DOC_DESIGN1_DATA.client.phone}</span></p>
                    <p class="doc-design1__meta-line"><span class="doc-design1__meta-label">Email&nbsp;:</span><span class="doc-design1__meta-value">${DOC_DESIGN1_DATA.client.email}</span></p>
                    <p class="doc-design1__meta-line doc-design1__meta-line--wrap"><span class="doc-design1__meta-label">Adresse&nbsp;:</span><span class="doc-design1__meta-value">${DOC_DESIGN1_DATA.client.address}</span></p>
                  </fieldset>
                </div>
                <div class="doc-design1__table-wrap">
                  <table class="doc-design1__table">
                    <thead><tr>${MODEL_PREVIEW_HEADER_HTML}</tr></thead>
                    <tbody>${DOC_DESIGN1_ITEMS_HTML}</tbody>
                  </table>
                </div>
                <div class="doc-design1__bottom">
                  <div class="doc-design1__summary-row">
                    <div class="doc-design1__summary-left">
                      <div class="doc-design1__tva-breakdown">
                        <div class="doc-design1__tva-panel" data-tax-panel>
                          <table class="doc-design1__tva-table">
                            <thead>
                              <tr>
                                <th>Taxes</th>
                                <th>Bases</th>
                                <th>Montants</th>
                              </tr>
                            </thead>
                            <tbody>
                              ${DOC_DESIGN1_TVA_ROWS_HTML}
                              <tr class="doc-design1__tva-total">
                                <th colspan="2">${DOC_DESIGN1_DATA.tvaTotal.label}</th>
                                <th class="right">${DOC_DESIGN1_DATA.tvaTotal.amount}</th>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                        <div class="doc-design1__amount-words">
                          ${DOC_DESIGN1_DATA.amountWordsHtml}
                        </div>
                        
                      </div>
                      <div class="doc-design1__footer-note" id="modelPreviewNote">
                        <div data-size="10" data-size-root="true" style="font-size:10px">${DOC_DESIGN1_DATA.footerNoteHtml}</div>
                      </div>                    
                    </div>
                    <div class="doc-design1__mini-sum">
                      <table class="doc-design1__mini-table">
                        <tbody>${DOC_DESIGN1_MINI_ROWS_HTML}</tbody>
                      </table>
                    </div>
                  </div>
                  <div class="doc-design1__footer">
                    <div class="doc-design1__footer-note-left" id="modelPreviewFooterNote" hidden></div>
                    <div class="doc-design1__sign">
                      <div class="doc-design1__sign-stamp" id="modelPreviewSealOverlay" hidden>
                        <div class="doc-design1__sign-stamp-scale">
                          <img class="doc-design1__sign-seal" id="modelPreviewSealImg" />
                        </div>
                      </div>
                      <div class="doc-design1__sign-signature" id="modelPreviewSignatureOverlay" hidden>
                        <div class="doc-design1__sign-signature-scale">
                          <img class="doc-design1__sign-signature-img" id="modelPreviewSignatureImg"/>
                        </div>
                      </div>
                      <p class="doc-design1__sign-line">Signature et cachet</p>
                      <p class="doc-design1__sign-thanks">Merci pour votre confiance&nbsp;!</p>
                    </div>
                  </div>
                </div>
              </div>
              </div>
              </div>
            </div>
`;

