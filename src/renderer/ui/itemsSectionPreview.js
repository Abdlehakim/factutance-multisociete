// src/ui/itemsSectionPreview.js
import { html } from "./utils.js";

export function renderItemsSectionPreview() {
  return html(`
    <section class="flexit" id="itemsSection">
      <div class="items-preview-header">
        <p class="items-section__lead">Aper&ccedil;u:</p>
        <div class="items-preview-actions" role="group" aria-label="Actions d'apercu">
          <button
            id="itemsPreviewSave"
            class="items-preview-action"
            type="button"
            aria-label="Enregistrer"
            title="Enregistrer"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" stroke-linecap="round" stroke-linejoin="round" />
              <polyline points="7 3 7 8 15 8" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
          <button
            id="itemsPreviewPrint"
            class="items-preview-action"
            type="button"
            aria-label="Imprimer"
            title="Imprimer"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false">
              <path d="M6 9V2h12v7" stroke-linecap="round" stroke-linejoin="round" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" stroke-linecap="round" stroke-linejoin="round" />
              <rect x="6" y="14" width="12" height="8" rx="1" />
            </svg>
          </button>
        </div>
      </div>
      <div class="pdf-head">
        <div class="pdf-logo-wrap">
          <img id="itemsLogo" class="pdf-logo" alt="Logo" data-logo-state="empty" />
        </div>
        <p id="itemsStatusBadge" class="pdf-status-flag" hidden></p>
        <div class="pdf-head-right">
          <h1 class="pdf-title" id="itemsDocTitle">FACTURE</h1>
          <p class="pdf-date-top items-meta-summary__item items-meta-summary__item--date">
            <span class="items-meta-summary__label" id="itemsInvoiceDateLabel">Date&nbsp;:</span>
            <span class="items-meta-summary__value is-empty" id="itemsInvoiceDate">-</span>
          </p>
          <p class="pdf-num items-meta-summary__item items-meta-summary__item--number">
            <span class="items-meta-summary__label" id="itemsInvoiceNumberLabel">N&deg; de facture&nbsp;:</span>
            <span class="items-meta-summary__value is-empty" id="itemsInvoiceNumber" style="font-weight:600">-</span>
          </p>
        </div>
      </div>
      <div class="pdf-divider"></div>
      <div class="pdf-grid-2">
        <div>
          <p
            id="itemsCompanyName"
            class="is-empty"
            style="margin:0;text-transform:uppercase;font-weight:700"
          >-</p>
          <p class="pdf-small pdf-meta-line">
            <span class="pdf-meta-label">MF&nbsp;:</span>
            <span class="pdf-meta-value is-empty" id="itemsCompanyVat">-</span>
          </p>
          <p class="pdf-small pdf-meta-line" hidden>
            <span class="pdf-meta-label">CD&nbsp;:</span>
            <span class="pdf-meta-value is-empty" id="itemsCompanyCustoms"></span>
          </p>
          <p class="pdf-small pdf-meta-line" hidden>
            <span class="pdf-meta-label">IBAN&nbsp;:</span>
            <span class="pdf-meta-value is-empty" id="itemsCompanyIban"></span>
          </p>
          <p class="pdf-small pdf-meta-line">
            <span class="pdf-meta-label">T&eacute;l&eacute;phone&nbsp;:</span>
            <span class="pdf-meta-value is-empty" id="itemsCompanyPhone" style="white-space:pre-line">-</span>
          </p>
          <p class="pdf-small pdf-meta-line">
            <span class="pdf-meta-label">Email&nbsp;:</span>
            <span class="pdf-meta-value is-empty" id="itemsCompanyEmail">-</span>
          </p>
          <p class="pdf-small pdf-meta-line">
            <span class="pdf-meta-label">Adresse&nbsp;:</span>
            <span class="pdf-meta-value is-empty" id="itemsCompanyAddress" style="white-space:pre-line">-</span>
          </p>
        </div>

        <fieldset class="section-box-pdf">
          <legend id="itemsPartyLegend" style="margin:0;font-weight:700">Client</legend>
          <p
            id="itemsClientName"
            class="is-empty"
            data-client-field="name"
            style="margin:0;font-weight:700; text-transform:capitalize; font-size:14px;"
          >-</p>
          <p class="pdf-small pdf-meta-line" data-client-field="benefit">
            <span class="pdf-meta-label"><span data-client-field-label="benefit">Au profit de</span>&nbsp;:</span>
            <span class="pdf-meta-value is-empty" id="itemsClientBenefit">-</span>
          </p>
          <p class="pdf-small pdf-meta-line" data-client-field="account">
            <span class="pdf-meta-label"><span data-client-field-label="account">Pour le compte de</span>&nbsp;:</span>
            <span class="pdf-meta-value is-empty" id="itemsClientAccount">-</span>
          </p>
          <p class="pdf-small pdf-meta-line" data-client-field="taxId">
            <span class="pdf-meta-label"><span data-client-field-label="taxId">Matricule fiscal</span>&nbsp;:</span>
            <span class="pdf-meta-value is-empty" id="itemsClientVat">-</span>
          </p>
          <p class="pdf-small pdf-meta-line" data-client-field="stegRef">
            <span class="pdf-meta-label"><span data-client-field-label="stegRef">Ref STEG</span>&nbsp;:</span>
            <span class="pdf-meta-value is-empty" id="itemsClientStegRef">-</span>
          </p>
          <p class="pdf-small pdf-meta-line" data-client-field="phone">
            <span class="pdf-meta-label"><span data-client-field-label="phone">Telephone</span>&nbsp;:</span>
            <span class="pdf-meta-value is-empty" id="itemsClientPhone" style="white-space:pre-line">-</span>
          </p>
          <p class="pdf-small pdf-meta-line" data-client-field="email">
            <span class="pdf-meta-label"><span data-client-field-label="email">E-mail</span>&nbsp;:</span>
            <span class="pdf-meta-value is-empty" id="itemsClientEmail">-</span>
          </p>
          <p class="pdf-small pdf-meta-line" data-client-field="address">
            <span class="pdf-meta-label"><span data-client-field-label="address">Adresse</span>&nbsp;:</span>
            <span class="pdf-meta-value is-empty" id="itemsClientAddress" style="white-space:pre-line">-</span>
          </p>
        </fieldset>
      </div>

      <div class="table-wrap tabM">
        <table id="items">
          <thead>
            <tr>
              <th class="cell-ref" data-article-field-label="ref">R&eacute;f.</th>
              <th class="cell-product" data-article-field-label="product">D&eacute;signation(s)</th>
              <th class="cell-desc" data-article-field-label="desc">Description(s)</th>
              <th class="cell-qty" data-article-field-label="qty">Qt&eacute;</th>
              <th class="cell-unit" data-article-field-label="unit">Unit&eacute;</th>
              <th id="itemsPurchasePriceHeader" class="cell-purchase-price" data-article-field-label="purchasePrice">PU A. HT</th>
              <th id="itemsPurchaseTvaHeader" class="cell-purchase-tva" data-article-field-label="purchaseTva">TVA A.</th>
              <th id="itemsFodecPurchaseHeader" class="cell-fodec-purchase" data-article-field-label="fodecPurchase">FODEC A.</th>
              <th id="itemsPriceHeader" class="cell-price" data-article-field-label="price">P.U. HT</th>
              <th class="cell-tva" data-article-field-label="tva">TVA %</th>
              <th id="itemsFodecHeader" class="cell-fodec-sale" data-article-field-label="fodecSale">FODEC V.</th>
              <th class="cell-discount" data-article-field-label="discount">Remise %</th>
              <th id="itemsTotalPurchaseHtHeader" class="cell-total-purchase-ht" data-article-field-label="totalPurchaseHt">Total A. HT</th>
              <th id="itemsTotalPurchaseTtcHeader" class="cell-total-purchase-ttc" data-article-field-label="totalPurchaseTtc">Total A. TTC</th>
              <th id="itemsTotalHtHeader" class="cell-total-ht" data-article-field-label="totalHt">Total HT</th>
              <th class="cell-ttc" data-article-field-label="totalTtc">Total TTC</th>
              <th class="cell-action">Action</th>
            </tr>
          </thead>
          <tbody id="itemBody"></tbody>
        </table>
      </div>
      <div class="items-table-actions">
        <button
          id="articleFormToggleBtn"
          type="button"
          class="client-search__saved client-search__saved--form items-table-action-btn"
          aria-label="Afficher la fiche article"
          aria-haspopup="dialog"
          aria-expanded="false"
          aria-controls="articleFormPopover"
        >
          <svg
            stroke="currentColor"
            fill="currentColor"
            stroke-width="0"
            viewBox="0 0 1024 1024"
            aria-hidden="true"
            focusable="false"
          >
            <path d="M464 144H160c-8.8 0-16 7.2-16 16v304c0 8.8 7.2 16 16 16h304c8.8 0 16-7.2 16-16V160c0-8.8-7.2-16-16-16z m-52 268H212V212h200v200zM864 144H560c-8.8 0-16 7.2-16 16v304c0 8.8 7.2 16 16 16h304c8.8 0 16-7.2 16-16V160c0-8.8-7.2-16-16-16z m-52 268H612V212h200v200zM864 544H560c-8.8 0-16 7.2-16 16v304c0 8.8 7.2 16 16 16h304c8.8 0 16-7.2 16-16V560c0-8.8-7.2-16-16-16z m-52 268H612V612h200v200zM424 712H296V584c0-4.4-3.6-8-8-8h-48c-4.4 0-8 3.6-8 8v128H104c-4.4 0-8 3.6-8 8v48c0 4.4 3.6 8 8 8h128v128c0 4.4 3.6 8 8 8h48c4.4 0 8-3.6 8-8V776h128c4.4 0 8-3.6 8-8v-48c0-4.4-3.6-8-8-8z"></path>
          </svg>
          <span class="items-table-action__label" aria-hidden="true">Nouvel article</span>
        </button>
        <button
          id="articleSavedListToggleBtn"
          type="button"
          class="client-search__saved client-search__saved--form items-table-action-btn"
          aria-label="Afficher la liste des articles"
          aria-haspopup="dialog"
          aria-expanded="false"
          aria-controls="articleSavedModal"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false">
            <circle cx="5" cy="6" r="1.5"></circle>
            <circle cx="5" cy="12" r="1.5"></circle>
            <circle cx="5" cy="18" r="1.5"></circle>
            <line x1="9" y1="6" x2="20" y2="6" stroke-linecap="round"></line>
            <line x1="9" y1="12" x2="20" y2="12" stroke-linecap="round"></line>
            <line x1="9" y1="18" x2="20" y2="18" stroke-linecap="round"></line>
          </svg>
          <span class="items-table-action__label" aria-hidden="true">Liste des articles</span>
        </button>
      </div>

      <div class="totals-row">
        <div class="breakdown-wrapper">
          <div class="tva-breakdown-wrapper">
            <div class="tva-breakdown" id="tvaBreakdownCard">
              <table id="tvaBreakdown" class="tva-breakdown__table">
                <thead>
                  <tr>
                    <th>Taxes</th>
                    <th>Bases</th>
                    <th>Montants</th>
                  </tr>
                </thead>
                <tbody id="tvaBreakdownBody">
                  <tr class="tva-breakdown__empty">
                    <td colspan="3">Aucune ligne TVA</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div id="itemsAmountWordsBlock" hidden></div>
          </div>
          <div id="itemsSummaryNoteBlock" class="pdf-footer-note" hidden></div>
        </div>

        <div class="mini-sum">
          <table id="miniSum" class="ms-card">
            <tbody>
              <tr id="miniShipRow" hidden>
                <td id="miniShipLabel">Frais de livraison</td>
                <td class="right" data-cur="DT"><span id="miniShip">0</span></td>
              </tr>
              <tr class="bar">
                <th id="miniHTLabel">Total HT</th>
                <th class="right" data-cur="DT"><span id="miniHT">0</span></th>
              </tr>

              <tr id="miniTaxesRow" hidden>
                <td>Total Taxes</td>
                <td class="right" data-cur="DT"><span id="miniTaxes">0</span></td>
              </tr>

              <tr id="miniStampRow" hidden>
                <td id="miniStampLabel">Timbre fiscal</td>
                <td class="right" data-cur="DT"><span id="miniStamp">0</span></td>
              </tr>
              <tr id="miniDossierRow" hidden>
                <td id="miniDossierLabel">Frais du dossier</td>
                <td class="right" data-cur="DT"><span id="miniDossier">0</span></td>
              </tr>
              <tr id="miniDeplacementRow" hidden>
                <td id="miniDeplacementLabel">Frais de deplacement</td>
                <td class="right" data-cur="DT"><span id="miniDeplacement">0</span></td>
              </tr>

              <tr id="miniTTCRow" class="bar grand" hidden>
                <th>Total TTC</th>
                <th class="right" data-cur="DT"><span id="miniTTC">0</span></th>
              </tr>
              <tr id="miniSubventionRow" hidden>
                <td id="miniSubventionLabel">Subvention</td>
                <td class="right" data-cur="DT"><span id="miniSubvention">0</span></td>
              </tr>
              <tr id="miniFinBankRow" hidden>
                <td id="miniFinBankLabel">Financement bancaire</td>
                <td class="right" data-cur="DT"><span id="miniFinBank">0</span></td>
              </tr>
              <tr id="miniNetToPayRow" class="bar grand" hidden>
                <th id="miniNetToPayLabel">Montant net a payer</th>
                <th class="right" data-cur="DT"><span id="miniNetToPay">0</span></th>
              </tr>
              <tr id="miniAcompteRow" class="bar" hidden>
                <td id="miniAcompteLabel">Pay&eacute;</td>
                <td class="right" data-cur="DT"><span id="miniAcompte">0</span></td>
              </tr>
              <tr id="miniBalanceRow" class="bar grand" hidden>
                <th id="miniBalanceLabel">Solde d&ucirc;</th>
                <th class="right" data-cur="DT"><span id="miniBalance">0</span></th>
              </tr>
            </tbody>
          </table>
          <p id="miniReglement" class="mini-reglement" hidden>
            <span class="mini-reglement__label">Conditions de r&egrave;glement :</span>
            <span id="miniReglementValue" class="mini-reglement__value">A r&eacute;ception</span>
          </p>
        </div>
      </div>

      <div class="pdf-footer" id="itemsFooter">
        <div class="pdf-footer-note-left" id="itemsFooterNote" hidden></div>
        <div class="pdf-sign">
          <div class="pdf-sign-stamp" id="itemsSealOverlay" hidden>
            <img class="pdf-sign-seal" id="itemsSealImg"/>
          </div>
          <div class="pdf-sign-signature" id="itemsSignatureOverlay" hidden>
            <img class="pdf-sign-signature-img" id="itemsSignatureImg" />
          </div>
          <p class="pdf-sign-line">Signature et cachet</p>
          <p style="margin:0px;font-style:italic;font-size:10px">Merci pour votre confiance&nbsp;!</p>
        </div>
      </div>
    </section>
  `);
}

