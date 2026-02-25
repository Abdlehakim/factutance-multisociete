import { html } from "./utils.js";

export function renderHeader() {
  return html(`
    <header id="invoice" class="header actions actions--sticky">
      <div class="actions__brand">
        <div class="brand brand--sticky">
          <div class="logo-wrap">
            <img id="facturanceLogo" class="company-logo" alt="Logo Facturance" data-logo-state="set" src="./assets/logofacturance.png">
          </div>
        </div>
      </div>
      <div class="actions__buttons">
        <details id="documentActionsMenu" class="field-toggle-menu actions-menu">
          <summary
            class="btn field-toggle-trigger actions-menu__trigger better-style "
            role="button"
            aria-haspopup="menu"
            aria-expanded="false"
            aria-controls="documentActionsPanel"
          >
            <span>Documents</span>
          </summary>
          <div
            id="documentActionsPanel"
            class="field-toggle-panel actions-menu__panel"
            role="menu"
            aria-label="Document"
          >
            <button id="btnNew" class="model-select-option actions-menu__item" type="button" role="menuitem">
              Nouveau
            </button>
            <button id="btnOpen" class="model-select-option actions-menu__item" type="button" role="menuitem">
              Ouvrir
            </button>
            <button id="btnAllPdf" class="model-select-option actions-menu__item" type="button" role="menuitem">
              Ouvrir un Documents PDF
            </button>
            <button id="btnAllXml" class="model-select-option actions-menu__item" type="button" role="menuitem">
              Ouvrir un Fichier XML
            </button>
            <button
              id="btnOpenDataDir"
              class="model-select-option actions-menu__item actions-menu__item--icon"
              type="button"
              title="Ouvrir le dossier Facturance Data"
              aria-label="Ouvrir le dossier Facturance Data"
              role="menuitem"
            >
              <span>Ouvrir l’emplacement du fichier</span>
            </button>
          </div>
        </details>
        <details id="addMenu" class="field-toggle-menu actions-menu">
          <summary
            class="btn field-toggle-trigger actions-menu__trigger better-style"
            role="button"
            aria-haspopup="menu"
            aria-expanded="false"
            aria-controls="addMenuPanel"
          >
            <span>Listes</span>
          </summary>
          <div
            id="addMenuPanel"
            class="field-toggle-panel actions-menu__panel"
            role="menu"
            aria-label="Ajouter"
          >
            <button id="btnAddClientMenu" class="model-select-option actions-menu__item" type="button" role="menuitem">
              Clients
            </button>
            <button
              id="btnAddFournisseurMenu"
              class="model-select-option actions-menu__item"
              type="button"
              role="menuitem"
            >
              Fournisseurs
            </button>
            <button
              id="btnAddArticleMenu"
              class="model-select-option actions-menu__item"
              type="button"
              role="menuitem"
            >
              Articles
            </button>
          </div>
        </details>
        <details id="paymentsMenu" class="field-toggle-menu actions-menu">
          <summary
            class="btn field-toggle-trigger actions-menu__trigger better-style"
            role="button"
            aria-haspopup="menu"
            aria-expanded="false"
            aria-controls="paymentsPanel"
          >
            <span>Paiements</span>
          </summary>
          <div
            id="paymentsPanel"
            class="field-toggle-panel actions-menu__panel"
            role="menu"
            aria-label="Paiements"
          >
            <button id="btnPaymentAdd" class="model-select-option actions-menu__item" type="button" role="menuitem">
              Ajouter Paiement
            </button>
            <button
              id="btnPaymentHistory"
              class="model-select-option actions-menu__item"
              type="button"
              role="menuitem"
            >
              Historique paiements
            </button>
            <button
              id="btnPaymentClientStatements"
              class="model-select-option actions-menu__item"
              type="button"
              role="menuitem"
            >
              Solde clients
            </button>
            <button
              id="btnClientLedger"
              class="model-select-option actions-menu__item"
              type="button"
              role="menuitem"
            >
              Relev&eacute; clients
            </button>
          </div>
        </details>
        <details id="generateXmlMenu" class="field-toggle-menu actions-menu">
          <summary
            class="btn field-toggle-trigger actions-menu__trigger better-style"
            role="button"
            aria-haspopup="menu"
            aria-expanded="false"
            aria-controls="generateXmlMenuPanel"
          >
            <span>Générer XML</span>
          </summary>
          <div
            id="generateXmlMenuPanel"
            class="field-toggle-panel actions-menu__panel"
            role="menu"
            aria-label="Générer XML"
          >
            <button id="btnGenerateXmlRetenueFA" class="model-select-option actions-menu__item" type="button" role="menuitem">
              Retenue a la source FA
            </button>
          </div>
        </details>
        <details id="reportsMenu" class="field-toggle-menu actions-menu">
          <summary
            class="btn field-toggle-trigger actions-menu__trigger better-style"
            role="button"
            aria-haspopup="menu"
            aria-expanded="false"
            aria-controls="reportsPanel"
          >
            <span>Rapports</span>
          </summary>
          <div
            id="reportsPanel"
            class="field-toggle-panel actions-menu__panel"
            role="menu"
            aria-label="Rapports"
          >
            <button id="btnReportSalesTax" class="model-select-option actions-menu__item" type="button" role="menuitem">
              Rapport de taxes à la vente
            </button>
            <button id="btnReportPurchaseTax" class="model-select-option actions-menu__item" type="button" role="menuitem">
              Rapport de taxes à l'achat
            </button>
            <button
              id="btnReportClientStatement"
              class="model-select-option actions-menu__item"
              type="button"
              role="menuitem"
            >
            Relevés clients
            </button>
          </div>
        </details>
      </div>
      </header>
    <div id="pdfDocModal" class="swbDialog doc-history-modal pdf-doc-modal" hidden aria-hidden="true">
      <div
        class="swbDialog__panel doc-history-modal__panel open-doc-modal__panel pdf-doc-modal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pdfDocModalTitle"
      >
        <div class="swbDialog__header">
          <div id="pdfDocModalTitle" class="swbDialog__title">Ouvrir un Documents PDF</div>
          <button id="pdfDocModalClose" type="button" class="swbDialog__close" aria-label="Fermer">
            <svg stroke="currentColor" fill="none" stroke-width="0" viewBox="0 0 24 24" height="200px" width="200px" xmlns="http://www.w3.org/2000/svg">
              <path d="M16.3394 9.32245C16.7434 8.94589 16.7657 8.31312 16.3891 7.90911C16.0126 7.50509 15.3798 7.48283 14.9758 7.85938L12.0497 10.5866L9.32245 7.66048C8.94589 7.25647 8.31312 7.23421 7.90911 7.61076C7.50509 7.98731 7.48283 8.62008 7.85938 9.0241L10.5866 11.9502L7.66048 14.6775C7.25647 15.054 7.23421 15.6868 7.61076 16.0908C7.98731 16.4948 8.62008 16.5171 9.0241 16.1405L11.9502 13.4133L14.6775 16.3394C15.054 16.7434 15.6868 16.7657 16.0908 16.3891C16.4948 16.0126 16.5171 15.3798 16.1405 14.9758L13.4133 12.0497L16.3394 9.32245Z" fill="currentColor"></path>
              <path fill-rule="evenodd" clip-rule="evenodd" d="M1 12C1 5.92487 5.92487 1 12 1C18.0751 1 23 5.92487 23 12C23 18.0751 18.0751 23 12 23C5.92487 23 1 18.0751 1 12ZM12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21Z" fill="currentColor"></path>
            </svg>
          </button>
          </div>
          <div class="doc-history-modal__body swbDialog__msg pdf-doc-modal__body">
            <div class="doc-history-modal__filters pdf-doc-modal__filters">
              <label class="doc-history-modal__filter">
                <span>N&deg;</span>
                <input
                  id="pdfDocFilterNumber"
                  type="text"
                  placeholder="Rechercher par num&eacute;ro"
                />
              </label>
              <label class="doc-history-modal__filter">
                <span>Nom du client ou identifiant</span>
                <input
                  id="pdfDocFilterQuery"
                  type="text"
                placeholder="Rechercher un client ou une r&eacute;f&eacute;rence"
              />
            </label>
            <label class="doc-history-modal__filter doc-history-modal__filter--year">
              <span id="pdfDocFilterYearLabel">Ann&eacute;e</span>
              <div class="doc-dialog-model-picker__field">
                <details
                  id="pdfDocFilterYearMenu"
                  class="field-toggle-menu doc-dialog-model-menu doc-history-model-menu"
                >
                  <summary
                    class="btn success field-toggle-trigger"
                    role="button"
                    aria-haspopup="listbox"
                    aria-expanded="false"
                    aria-labelledby="pdfDocFilterYearLabel pdfDocFilterYearDisplay"
                  >
                    <span id="pdfDocFilterYearDisplay" class="model-select-display"></span>
                    <svg class="chevron" aria-hidden="true" focusable="false" stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="none" d="M0 0h24v24H0V0z"></path><path d="M12 4c4.41 0 8 3.59 8 8s-3.59 8-8 8-8-3.59-8-8 3.59-8 8-8m0-2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 13-4-4h8z"></path></svg>
                  </summary>
                  <div
                    id="pdfDocFilterYearPanel"
                    class="field-toggle-panel model-select-panel doc-history-model-panel"
                    role="listbox"
                    aria-labelledby="pdfDocFilterYearLabel"
                  ></div>
                </details>
                <select id="pdfDocFilterYear" class="model-select doc-dialog-model-select" aria-hidden="true" tabindex="-1">
                  <option value=""></option>
                </select>
              </div>
            </label>
            <label class="doc-history-modal__filter">
              <span>Date</span>
              <div class="swb-date-picker" data-date-picker>
                <input
                  id="pdfDocFilterDate"
                  type="text"
                  inputmode="numeric"
                  placeholder="JJ-MM"
                />
                <button
                  type="button"
                  class="swb-date-picker__toggle"
                  data-date-picker-toggle
                  aria-label="Choisir une date"
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
                <div class="swb-date-picker__panel" data-date-picker-panel hidden></div>
              </div>
            </label>
            <button
              type="button"
              class="btn ghost doc-history-modal__filter-clear"
              id="pdfDocFilterClear"
            >
              R&eacute;initialiser
            </button>
          </div>
          <div class="doc-history-modal__content">
            <div id="pdfDocModalList" class="doc-history-modal__list pdf-doc-modal__list" role="list"></div>
            <p id="pdfDocModalStatus" class="doc-history-modal__status pdf-doc-modal__status" aria-live="polite"></p>
          </div>
        </div>
        <div class="client-saved-modal__actions doc-history-modal__actions">
          <div class="client-search__actions client-saved-modal__actions-left doc-history-modal__actions-left">
            <button id="pdfDocModalCloseFooter" type="button" class="btn btn-close client-search__close">
              Fermer
            </button>
          </div>
          <div class="client-search__actions client-saved-modal__pager doc-history-modal__pager">
            <button id="pdfDocModalPrev" type="button" class="client-search__edit" disabled="">Pr&eacute;c&eacute;dent</button>
            <span id="pdfDocModalPage" class="client-saved-modal__page doc-history-modal__page" aria-live="polite" aria-label="Page 1 sur 1">
              Page
              <input id="pdfDocModalPageInput" type="number" inputmode="numeric" min="1" step="1" size="3" aria-label="Aller a la page" class="client-saved-modal__page-input doc-history-modal__page-input" max="1" aria-valuemin="1" aria-valuemax="1" aria-valuenow="1">
              /
              <span id="pdfDocModalTotalPages">1</span>
            </span>
            <button id="pdfDocModalNext" type="button" class="client-search__add" disabled="">Suivant</button>
          </div>
        </div>
      </div>
    </div>
    <div id="xmlDocModal" class="swbDialog doc-history-modal pdf-doc-modal xml-doc-modal" hidden aria-hidden="true">
      <div
        class="swbDialog__panel doc-history-modal__panel open-doc-modal__panel pdf-doc-modal__panel xml-doc-modal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="xmlDocModalTitle"
      >
        <div class="swbDialog__header">
          <div id="xmlDocModalTitle" class="swbDialog__title">Ouvrir un fichier XML</div>
          <button id="xmlDocModalClose" type="button" class="swbDialog__close" aria-label="Fermer">
            <svg stroke="currentColor" fill="none" stroke-width="0" viewBox="0 0 24 24" height="200px" width="200px" xmlns="http://www.w3.org/2000/svg">
              <path d="M16.3394 9.32245C16.7434 8.94589 16.7657 8.31312 16.3891 7.90911C16.0126 7.50509 15.3798 7.48283 14.9758 7.85938L12.0497 10.5866L9.32245 7.66048C8.94589 7.25647 8.31312 7.23421 7.90911 7.61076C7.50509 7.98731 7.48283 8.62008 7.85938 9.0241L10.5866 11.9502L7.66048 14.6775C7.25647 15.054 7.23421 15.6868 7.61076 16.0908C7.98731 16.4948 8.62008 16.5171 9.0241 16.1405L11.9502 13.4133L14.6775 16.3394C15.054 16.7434 15.6868 16.7657 16.0908 16.3891C16.4948 16.0126 16.5171 15.3798 16.1405 14.9758L13.4133 12.0497L16.3394 9.32245Z" fill="currentColor"></path>
              <path fill-rule="evenodd" clip-rule="evenodd" d="M1 12C1 5.92487 5.92487 1 12 1C18.0751 1 23 5.92487 23 12C23 18.0751 18.0751 23 12 23C5.92487 23 1 18.0751 1 12ZM12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21Z" fill="currentColor"></path>
            </svg>
          </button>
          </div>
          <div class="doc-history-modal__body swbDialog__msg pdf-doc-modal__body">
            <div class="doc-history-modal__filters pdf-doc-modal__filters">
              <label class="doc-history-modal__filter">
                <span>R&eacute;f&eacute;rence</span>
                <input
                  id="xmlDocFilterNumber"
                  type="text"
                  placeholder="Rechercher par r&eacute;f&eacute;rence"
                />
              </label>
            <label class="doc-history-modal__filter">
                <span>Nom du fichier</span>
                <input
                  id="xmlDocFilterQuery"
                  type="text"
                placeholder="Rechercher un fichier"
              />
            </label>
            <label class="doc-history-modal__filter doc-history-modal__filter--year">
              <span id="xmlDocFilterYearLabel">Ann&eacute;e</span>
              <div class="doc-dialog-model-picker__field">
                <details
                  id="xmlDocFilterYearMenu"
                  class="field-toggle-menu doc-dialog-model-menu doc-history-model-menu"
                >
                  <summary
                    class="btn success field-toggle-trigger"
                    role="button"
                    aria-haspopup="listbox"
                    aria-expanded="false"
                    aria-labelledby="xmlDocFilterYearLabel xmlDocFilterYearDisplay"
                  >
                    <span id="xmlDocFilterYearDisplay" class="model-select-display"></span>
                    <svg class="chevron" aria-hidden="true" focusable="false" stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="none" d="M0 0h24v24H0V0z"></path><path d="M12 4c4.41 0 8 3.59 8 8s-3.59 8-8 8-8-3.59-8-8 3.59-8 8-8m0-2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 13-4-4h8z"></path></svg>
                  </summary>
                  <div
                    id="xmlDocFilterYearPanel"
                    class="field-toggle-panel model-select-panel doc-history-model-panel"
                    role="listbox"
                    aria-labelledby="xmlDocFilterYearLabel"
                  ></div>
                </details>
                <select id="xmlDocFilterYear" class="model-select doc-dialog-model-select" aria-hidden="true" tabindex="-1">
                  <option value=""></option>
                </select>
              </div>
            </label>
            <label class="doc-history-modal__filter">
              <span>Date</span>
              <div class="swb-date-picker" data-date-picker>
                <input
                  id="xmlDocFilterDate"
                  type="text"
                  inputmode="numeric"
                  placeholder="JJ-MM"
                />
                <button
                  type="button"
                  class="swb-date-picker__toggle"
                  data-date-picker-toggle
                  aria-label="Choisir une date"
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
                <div class="swb-date-picker__panel" data-date-picker-panel hidden></div>
              </div>
            </label>
            <button
              type="button"
              class="btn ghost doc-history-modal__filter-clear"
              id="xmlDocFilterClear"
            >
              R&eacute;initialiser
            </button>
          </div>
          <div class="doc-history-modal__content">
            <div id="xmlDocModalList" class="doc-history-modal__list pdf-doc-modal__list" role="list"></div>
            <p id="xmlDocModalStatus" class="doc-history-modal__status pdf-doc-modal__status" aria-live="polite"></p>
          </div>
        </div>
        <div class="client-saved-modal__actions doc-history-modal__actions">
          <div class="client-search__actions client-saved-modal__actions-left doc-history-modal__actions-left">
            <button id="xmlDocModalCloseFooter" type="button" class="btn btn-close client-search__close">
              Fermer
            </button>
          </div>
          <div class="client-search__actions client-saved-modal__pager doc-history-modal__pager pdf-doc-modal__pager">
            <button id="xmlDocModalPrev" type="button" class="client-search__edit" disabled="">Pr&eacute;c&eacute;dent</button>
            <span id="xmlDocModalPage" class="client-saved-modal__page doc-history-modal__page" aria-live="polite" aria-label="Page 1 sur 1">
              Page
              <input id="xmlDocModalPageInput" type="number" inputmode="numeric" min="1" step="1" size="3" aria-label="Aller a la page" class="client-saved-modal__page-input doc-history-modal__page-input" max="1" aria-valuemin="1" aria-valuemax="1" aria-valuenow="1">
              /
              <span id="xmlDocModalTotalPages">1</span>
            </span>
            <button id="xmlDocModalNext" type="button" class="client-search__add" disabled="">Suivant</button>
          </div>
        </div>
      </div>
    </div>
    <div id="paymentModal" class="swbDialog payment-modal" hidden aria-hidden="true">
      <div
        class="swbDialog__panel payment-modal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="paymentModalTitle"
      >
        <div class="swbDialog__header">
          <div id="paymentModalTitle" class="swbDialog__title">Ajouter Paiement</div>
          <button id="paymentModalClose" type="button" class="swbDialog__close" aria-label="Fermer">
            <svg stroke="currentColor" fill="none" stroke-width="0" viewBox="0 0 24 24" height="200px" width="200px" xmlns="http://www.w3.org/2000/svg">
              <path d="M16.3394 9.32245C16.7434 8.94589 16.7657 8.31312 16.3891 7.90911C16.0126 7.50509 15.3798 7.48283 14.9758 7.85938L12.0497 10.5866L9.32245 7.66048C8.94589 7.25647 8.31312 7.23421 7.90911 7.61076C7.50509 7.98731 7.48283 8.62008 7.85938 9.0241L10.5866 11.9502L7.66048 14.6775C7.25647 15.054 7.23421 15.6868 7.61076 16.0908C7.98731 16.4948 8.62008 16.5171 9.0241 16.1405L11.9502 13.4133L14.6775 16.3394C15.054 16.7434 15.6868 16.7657 16.0908 16.3891C16.4948 16.0126 16.5171 15.3798 16.1405 14.9758L13.4133 12.0497L16.3394 9.32245Z" fill="currentColor"></path>
              <path fill-rule="evenodd" clip-rule="evenodd" d="M1 12C1 5.92487 5.92487 1 12 1C18.0751 1 23 5.92487 23 12C23 18.0751 18.0751 23 12 23C5.92487 23 1 18.0751 1 12ZM12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21Z" fill="currentColor"></path>
            </svg>
          </button>
        </div>
        <div class="payment-modal__body swbDialog__msg">
          <div class="payment-modal__form">
            <div class="payment-modal__row">
              <label class="payment-modal__field">
                <span>Date de paiement</span>
                <div class="swb-date-picker" data-date-picker>
                  <input
                    id="paymentDate"
                    type="text"
                    inputmode="numeric"
                    placeholder="AAAA-MM-JJ"
                  />
                  <button
                    type="button"
                    class="swb-date-picker__toggle"
                    data-date-picker-toggle
                    aria-label="Choisir une date"
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
                  <div class="swb-date-picker__panel" data-date-picker-panel hidden></div>
                </div>
              </label>
              <label class="payment-modal__field payment-modal__field--client">
                <span>Client</span>
                <input id="paymentClientSearch" type="text" placeholder="Rechercher un client" autocomplete="off" />
                <div
                  id="paymentClientResults"
                  class="payment-modal__client-results client-search__results"
                  role="listbox"
                  aria-label="Clients"
                  hidden
                ></div>
              </label>
              <label class="payment-modal__field">
                <span>Montant</span>
                <input id="paymentAmount" type="number" min="0" step="0.001" placeholder="0.000" />
              </label>
              <label class="payment-modal__field">
                <span id="paymentMethodLabel">Mode de paiement</span>
                <div class="doc-dialog-model-picker__field">
                    <details
                      id="paymentMethodMenu"
                      class="field-toggle-menu doc-dialog-model-menu doc-history-model-menu"
                    >
                      <summary
                        class="btn success field-toggle-trigger"
                        role="button"
                        aria-haspopup="listbox"
                        aria-expanded="false"
                        aria-labelledby="paymentMethodLabel paymentMethodDisplay"
                      >
                        <span id="paymentMethodDisplay" class="model-select-display">Esp&egrave;ces</span>
                        <svg class="chevron" aria-hidden="true" focusable="false" stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="none" d="M0 0h24v24H0V0z"></path><path d="M12 4c4.41 0 8 3.59 8 8s-3.59 8-8 8-8-3.59-8-8 3.59-8 8-8m0-2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 13-4-4h8z"></path></svg>
                      </summary>
                      <!--payment-method-panel-placeholder-->
                      <div
                        id="paymentMethodPanel"
                        class="field-toggle-panel model-select-panel doc-history-model-panel"
                        role="listbox"
                        aria-labelledby="paymentMethodLabel"
                      >
                        <button type="button" class="model-select-option is-active" data-value="cash" role="option" aria-selected="true">
                          Esp&egrave;ces
                        </button>
                        <button type="button" class="model-select-option" data-value="cash_deposit" role="option" aria-selected="false">
                          Versement Esp&egrave;ces
                        </button>
                        <button type="button" class="model-select-option" data-value="cheque" role="option" aria-selected="false">
                          Ch&egrave;que
                        </button>
                        <button type="button" class="model-select-option" data-value="bill_of_exchange" role="option" aria-selected="false">
                          Effet
                        </button>
                        <button type="button" class="model-select-option" data-value="transfer" role="option" aria-selected="false">
                          Virement
                        </button>
                        <button type="button" class="model-select-option" data-value="card" role="option" aria-selected="false">
                          Carte bancaire
                        </button>
                        <button type="button" class="model-select-option" data-value="withholding_tax" role="option" aria-selected="false">
                          Retenue &agrave; la source
                        </button>
                        <button type="button" class="model-select-option" data-value="sold_client" role="option" aria-selected="false">
                          Solde client
                        </button>
                      </div>
                    </details>
                    <select id="paymentMethod" class="model-select doc-dialog-model-select" aria-hidden="true" tabindex="-1">
                      <option value="">Choisir un mode</option>
                      <option value="cash" selected>Esp&egrave;ces</option>
                      <option value="cash_deposit">Versement Esp&egrave;ces</option>
                      <option value="cheque">Ch&egrave;que</option>
                      <option value="bill_of_exchange">Effet</option>
                      <option value="transfer">Virement</option>
                      <option value="card">Carte bancaire</option>
                      <option value="withholding_tax">Retenue &agrave; la source</option>
                      <option value="sold_client">Solde client</option>
                    </select>
                </div>
              </label>
              <label class="payment-modal__field">
                <span>R&eacute;f. paiement</span>
                <input id="paymentReference" type="text" placeholder="R&eacute;f. paiement" />
              </label>
            </div>
            <div class="payment-modal__row payment-modal__row--actions">
              <div class="doc-history-convert__field" data-client-field="soldClient">
                <label class="doc-history-convert__label doc-dialog-model-picker__label">
                  Solde client actuel
                </label>
                <div class="payment-modal__amount-cell">
                  <span
                    id="paymentClientSoldeValue"
                    class="payment-modal__field-value"
                    data-base-solde=""
                  >-</span>
                </div>
              </div>
              <button id="paymentAddToSold" type="button" class="btn better-style">
                Ajouter au solde client
              </button>
              <span class="payment-modal__or-pay">
                ou payer les factures qui apparaissent dans le tableau ci-dessous
              </span>
            </div>
          </div>
          <div class="payment-modal__invoices">
            <div class="payment-modal__invoices-header">
              <div class="payment-modal__invoices-title">Factures</div>
              <div class="payment-modal__invoices-balance">
                Montant restant non imput&eacute; :
                <span id="paymentOutstanding">0</span>
              </div>
            </div>
            <div class="payment-modal__invoices-filters">
              <label class="doc-history-modal__filter doc-history-modal__filter--year payment-modal__invoice-filter-year">
                <span id="paymentInvoiceFilterYearLabel">Ann&eacute;e</span>
                <div class="doc-dialog-model-picker__field">
                  <details
                    id="paymentInvoiceFilterYearMenu"
                    class="field-toggle-menu doc-dialog-model-menu doc-history-model-menu"
                  >
                    <summary
                      class="btn success field-toggle-trigger"
                      role="button"
                      aria-haspopup="listbox"
                      aria-expanded="false"
                      aria-labelledby="paymentInvoiceFilterYearLabel paymentInvoiceFilterYearDisplay"
                    >
                      <span id="paymentInvoiceFilterYearDisplay" class="model-select-display"></span>
                      <svg class="chevron" aria-hidden="true" focusable="false" stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="none" d="M0 0h24v24H0V0z"></path><path d="M12 4c4.41 0 8 3.59 8 8s-3.59 8-8 8-8-3.59-8-8 3.59-8 8-8m0-2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 13-4-4h8z"></path></svg>
                    </summary>
                    <div
                      id="paymentInvoiceFilterYearPanel"
                      class="field-toggle-panel model-select-panel doc-history-model-panel"
                      role="listbox"
                      aria-labelledby="paymentInvoiceFilterYearLabel"
                    ></div>
                  </details>
                  <select id="paymentInvoiceFilterYear" class="model-select doc-dialog-model-select" aria-hidden="true" tabindex="-1">
                    <option value=""></option>
                  </select>
                </div>
              </label>
            </div>
            <div class="table-wrap payment-modal__table-wrap">
              <table class="tabM payment-modal__table">
                <thead>
                  <tr>
                    <th>N&deg; de facture</th>
                    <th class="center">Date</th>
                    <th>&Eacute;ch&eacute;ance</th>
                    <th>Total</th>
                    <th>Imput&eacute;</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody id="paymentInvoiceTableBody">
                  <tr class="payment-modal__empty-row">
                    <td colspan="6">S&eacute;lectionnez un client pour voir les factures impay&eacute;es.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div class="payment-modal__actions swbDialog__actions client-saved-modal__actions doc-history-modal__actions">
          <div class="client-search__actions client-saved-modal__actions-left doc-history-modal__actions-left">
            <button id="paymentModalCloseFooter" type="button" class="btn btn-close client-search__close">
              Fermer
            </button>
          </div>
          <div class="client-search__actions client-saved-modal__pager doc-history-modal__pager">
            <button id="paymentInvoicePrev" type="button" class="client-search__edit" disabled="">
              Pr&eacute;c&eacute;dent
            </button>
            <span id="paymentInvoicePage" class="client-saved-modal__page doc-history-modal__page" aria-live="polite" aria-label="Page 1 sur 1">
              Page
              <input
                id="paymentInvoicePageInput"
                type="number"
                inputmode="numeric"
                min="1"
                step="1"
                size="3"
                aria-label="Aller a la page"
                class="client-saved-modal__page-input doc-history-modal__page-input"
                max="1"
                aria-valuemin="1"
                aria-valuemax="1"
                aria-valuenow="1"
              >
              /
              <span id="paymentInvoiceTotalPages">1</span>
            </span>
            <button id="paymentInvoiceNext" type="button" class="client-search__add" disabled="">
              Suivant
            </button>
          </div>
        </div>
      </div>
    </div>
    <div id="paymentHistoryModal" class="swbDialog payments-history-modal" hidden aria-hidden="true">
      <div
        class="swbDialog__panel payments-history-modal__panel doc-history-modal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="paymentHistoryTitle"
      >
        <div class="swbDialog__header">
          <div id="paymentHistoryTitle" class="swbDialog__title">Historique paiements</div>
          <button id="paymentHistoryClose" type="button" class="swbDialog__close" aria-label="Fermer">
            <svg stroke="currentColor" fill="none" stroke-width="0" viewBox="0 0 24 24" height="200px" width="200px" xmlns="http://www.w3.org/2000/svg">
              <path d="M16.3394 9.32245C16.7434 8.94589 16.7657 8.31312 16.3891 7.90911C16.0126 7.50509 15.3798 7.48283 14.9758 7.85938L12.0497 10.5866L9.32245 7.66048C8.94589 7.25647 8.31312 7.23421 7.90911 7.61076C7.50509 7.98731 7.48283 8.62008 7.85938 9.0241L10.5866 11.9502L7.66048 14.6775C7.25647 15.054 7.23421 15.6868 7.61076 16.0908C7.98731 16.4948 8.62008 16.5171 9.0241 16.1405L11.9502 13.4133L14.6775 16.3394C15.054 16.7434 15.6868 16.7657 16.0908 16.3891C16.4948 16.0126 16.5171 15.3798 16.1405 14.9758L13.4133 12.0497L16.3394 9.32245Z" fill="currentColor"></path>
              <path fill-rule="evenodd" clip-rule="evenodd" d="M1 12C1 5.92487 5.92487 1 12 1C18.0751 1 23 5.92487 23 12C23 18.0751 18.0751 23 12 23C5.92487 23 1 18.0751 1 12ZM12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21Z" fill="currentColor"></path>
            </svg>
          </button>
        </div>
        <div class="swbDialog__msg payments-history-modal__body">
          <div class="doc-history-modal__filters payments-history__filters">
            <label class="doc-history-modal__filter">
              <span>Numero de paiement</span>
              <input id="paymentHistoryFilterNumber" type="text" placeholder="Rechercher par numero">
            </label>
            <label class="doc-history-modal__filter">
              <span>N&deg; Facture</span>
              <input id="paymentHistoryFilterInvoice" type="text" placeholder="Rechercher une facture">
            </label>
            <label class="doc-history-modal__filter">
              <span>Client</span>
              <input id="paymentHistoryFilterClient" type="text" placeholder="Rechercher un client">
            </label>
            <label class="doc-history-modal__filter doc-history-modal__filter--year">
              <span id="paymentHistoryFilterYearLabel">Ann&eacute;e</span>
              <div class="doc-dialog-model-picker__field">
                <details
                  id="paymentHistoryFilterYearMenu"
                  class="field-toggle-menu doc-dialog-model-menu doc-history-model-menu"
                >
                  <summary
                    class="btn success field-toggle-trigger"
                    role="button"
                    aria-haspopup="listbox"
                    aria-expanded="false"
                    aria-labelledby="paymentHistoryFilterYearLabel paymentHistoryFilterYearDisplay"
                  >
                    <span id="paymentHistoryFilterYearDisplay" class="model-select-display"></span>
                    <svg class="chevron" aria-hidden="true" focusable="false" stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="none" d="M0 0h24v24H0V0z"></path><path d="M12 4c4.41 0 8 3.59 8 8s-3.59 8-8 8-8-3.59-8-8 3.59-8 8-8m0-2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 13-4-4h8z"></path></svg>
                  </summary>
                  <div
                    id="paymentHistoryFilterYearPanel"
                    class="field-toggle-panel model-select-panel doc-history-model-panel"
                    role="listbox"
                    aria-labelledby="paymentHistoryFilterYearLabel"
                  ></div>
                </details>
                <select id="paymentHistoryFilterYear" class="model-select doc-dialog-model-select" aria-hidden="true" tabindex="-1">
                  <option value=""></option>
                </select>
              </div>
            </label>
            <label class="doc-history-modal__filter">
              <span>Date</span>
              <div class="swb-date-picker" data-date-picker="">
                <input id="paymentHistoryFilterDate" type="text" inputmode="numeric" placeholder="JJ-MM" autocomplete="off" spellcheck="false" aria-haspopup="dialog" aria-expanded="false" role="combobox" aria-controls="paymentHistoryFilterDatePanel">
                <button type="button" class="swb-date-picker__toggle" data-date-picker-toggle="" aria-label="Choisir une date" aria-haspopup="dialog" aria-expanded="false" aria-controls="paymentHistoryFilterDatePanel">
                  <svg class="swb-date-picker__toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" focusable="false">
                    <rect x="3.5" y="5" width="17" height="15" rx="2"></rect>
                    <path d="M8 3.5v3M16 3.5v3M3.5 10h17" stroke-linecap="round"></path>
                  </svg>
                </button>
                <!--swb-date-picker__panel-placeholder-->
                <div class="swb-date-picker__panel" data-date-picker-panel="" hidden="" role="dialog" aria-modal="false" aria-label="Choisir une date" tabindex="-1" id="paymentHistoryFilterDatePanel"></div>
              </div>
            </label>
            <button type="button" class="btn ghost doc-history-modal__filter-clear" id="paymentHistoryFilterClear" disabled="">
              Reinitialiser
            </button>
          </div>
          <div class="table-wrap payments-history__table-wrap">
            <table class="tabM payments-history__table">
              <thead>
                <tr>
                  <th>Num&eacute;ro de paiement</th>
                  <th class="payment-history__align-right">N&deg; Facture</th>
                  <th class="payment-history__align-right">Client</th>
                  <th class="payment-history__align-center">Date de paiement</th>
                  <th class="payment-history__align-center">R&eacute;f. paiement</th>
                  <th class="payment-history__align-right">Montant pay&eacute;</th>
                  <th class="payment-history__align-center">Mode de paiement</th>
                  <th class="payment-history__align-center">Action</th>
                </tr>
              </thead>
              <tbody id="paymentsHistoryModalList"></tbody>
            </table>
          </div>
        </div>
        <div class="client-saved-modal__actions doc-history-modal__actions">
          <div class="client-search__actions client-saved-modal__actions-left doc-history-modal__actions-left">
            <button id="paymentHistoryCloseFooter" type="button" class="btn btn-close client-search__close">
              Fermer
            </button>
          </div>
          <div class="client-search__actions client-saved-modal__pager doc-history-modal__pager">
            <button id="paymentHistoryPrev" type="button" class="client-search__edit" disabled>
              Précédent
            </button>
            <span
              id="paymentHistoryPage"
              class="client-saved-modal__page doc-history-modal__page"
              aria-live="polite"
              aria-label="Page 1 sur 1"
            >
              Page
              <input
                id="paymentHistoryPageInput"
                type="number"
                inputmode="numeric"
                min="1"
                step="1"
                size="3"
                aria-label="Aller a la page"
                class="client-saved-modal__page-input doc-history-modal__page-input"
                max="1"
                aria-valuemin="1"
                aria-valuemax="1"
                aria-valuenow="1"
              />
              /
              <span id="paymentHistoryTotalPages">1</span>
            </span>
            <button id="paymentHistoryNext" type="button" class="client-search__add" disabled>
              Suivant
            </button>
          </div>
        </div>
      </div>
    </div>
    </div>
    <div id="clientLedgerModal" class="swbDialog client-ledger-modal payments-history-modal" hidden aria-hidden="true">
      <div
        class="swbDialog__panel payments-history-modal__panel doc-history-modal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="clientLedgerTitle"
      >
        <div class="swbDialog__header">
          <div id="clientLedgerTitle" class="swbDialog__title">Relev&eacute; clients</div>
          <button id="clientLedgerClose" type="button" class="swbDialog__close" aria-label="Fermer">
            <svg stroke="currentColor" fill="none" stroke-width="0" viewBox="0 0 24 24" height="200px" width="200px" xmlns="http://www.w3.org/2000/svg">
              <path d="M16.3394 9.32245C16.7434 8.94589 16.7657 8.31312 16.3891 7.90911C16.0126 7.50509 15.3798 7.48283 14.9758 7.85938L12.0497 10.5866L9.32245 7.66048C8.94589 7.25647 8.31312 7.23421 7.90911 7.61076C7.50509 7.98731 7.48283 8.62008 7.85938 9.0241L10.5866 11.9502L7.66048 14.6775C7.25647 15.054 7.23421 15.6868 7.61076 16.0908C7.98731 16.4948 8.62008 16.5171 9.0241 16.1405L11.9502 13.4133L14.6775 16.3394C15.054 16.7434 15.6868 16.7657 16.0908 16.3891C16.4948 16.0126 16.5171 15.3798 16.1405 14.9758L13.4133 12.0497L16.3394 9.32245Z" fill="currentColor"></path>
              <path fill-rule="evenodd" clip-rule="evenodd" d="M1 12C1 5.92487 5.92487 1 12 1C18.0751 1 23 5.92487 23 12C23 18.0751 18.0751 23 12 23C5.92487 23 1 18.0751 1 12ZM12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21Z" fill="currentColor"></path>
            </svg>
          </button>
        </div>
        <div class="swbDialog__msg payments-history-modal__body">
          <div class="doc-history-modal__filters payments-history__filters">
            <label class="doc-history-modal__filter">
              <span>Client</span>
              <input id="clientLedgerFilterClient" type="text" placeholder="Rechercher un client">
            </label>
            <label class="doc-history-modal__filter">
              <span>Num&eacute;ro facture</span>
              <input id="clientLedgerFilterInvoiceNumber" type="text" placeholder="Num&eacute;ro facture">
            </label>
            <label class="doc-history-modal__filter doc-history-modal__filter--year">
              <span id="clientLedgerFilterYearLabel">Ann&eacute;e</span>
              <div class="doc-dialog-model-picker__field">
                <details
                  id="clientLedgerFilterYearMenu"
                  class="field-toggle-menu doc-dialog-model-menu doc-history-model-menu"
                >
                  <summary
                    class="btn success field-toggle-trigger"
                    role="button"
                    aria-haspopup="listbox"
                    aria-expanded="false"
                    aria-labelledby="clientLedgerFilterYearLabel clientLedgerFilterYearDisplay"
                  >
                    <span id="clientLedgerFilterYearDisplay" class="model-select-display"></span>
                    <svg class="chevron" aria-hidden="true" focusable="false" stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="none" d="M0 0h24v24H0V0z"></path><path d="M12 4c4.41 0 8 3.59 8 8s-3.59 8-8 8-8-3.59-8-8 3.59-8 8-8m0-2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 13-4-4h8z"></path></svg>
                  </summary>
                  <div
                    id="clientLedgerFilterYearPanel"
                    class="field-toggle-panel model-select-panel doc-history-model-panel"
                    role="listbox"
                    aria-labelledby="clientLedgerFilterYearLabel"
                  ></div>
                </details>
                <select id="clientLedgerFilterYear" class="model-select doc-dialog-model-select" aria-hidden="true" tabindex="-1">
                  <option value=""></option>
                </select>
              </div>
            </label>
            <label class="doc-history-modal__filter">
              <span>Du</span>
              <div class="swb-date-picker" data-date-picker="">
                <input id="clientLedgerFilterStart" type="text" inputmode="numeric" placeholder="JJ-MM" autocomplete="off" spellcheck="false" aria-haspopup="dialog" aria-expanded="false" role="combobox" aria-controls="clientLedgerFilterStartPanel">
                <button type="button" class="swb-date-picker__toggle" data-date-picker-toggle="" aria-label="Choisir une date" aria-haspopup="dialog" aria-expanded="false" aria-controls="clientLedgerFilterStartPanel">
                  <svg class="swb-date-picker__toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" focusable="false">
                    <rect x="3.5" y="5" width="17" height="15" rx="2"></rect>
                    <path d="M8 3.5v3M16 3.5v3M3.5 10h17" stroke-linecap="round"></path>
                  </svg>
                </button>
                <div class="swb-date-picker__panel" data-date-picker-panel="" hidden="" role="dialog" aria-modal="false" aria-label="Choisir une date" tabindex="-1" id="clientLedgerFilterStartPanel"></div>
              </div>
            </label>
            <label class="doc-history-modal__filter">
              <span>Au</span>
              <div class="swb-date-picker" data-date-picker="">
                <input id="clientLedgerFilterEnd" type="text" inputmode="numeric" placeholder="JJ-MM" autocomplete="off" spellcheck="false" aria-haspopup="dialog" aria-expanded="false" role="combobox" aria-controls="clientLedgerFilterEndPanel">
                <button type="button" class="swb-date-picker__toggle" data-date-picker-toggle="" aria-label="Choisir une date" aria-haspopup="dialog" aria-expanded="false" aria-controls="clientLedgerFilterEndPanel">
                  <svg class="swb-date-picker__toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" focusable="false">
                    <rect x="3.5" y="5" width="17" height="15" rx="2"></rect>
                    <path d="M8 3.5v3M16 3.5v3M3.5 10h17" stroke-linecap="round"></path>
                  </svg>
                </button>
                <div class="swb-date-picker__panel" data-date-picker-panel="" hidden="" role="dialog" aria-modal="false" aria-label="Choisir une date" tabindex="-1" id="clientLedgerFilterEndPanel"></div>
              </div>
            </label>
            <button type="button" class="btn ghost doc-history-modal__filter-clear" id="clientLedgerFilterClear" disabled>
              Reinitialiser
            </button>
          </div>
          <div class="doc-history-modal__status-row">
            <p class="doc-history-modal__recap">
              Total D&eacute;bit:
              <span id="clientLedgerTotalDebit" class="doc-history-modal__recap-value">0</span>
              &nbsp;|&nbsp;
              Total Cr&eacute;dit:
              <span id="clientLedgerTotalCredit" class="doc-history-modal__recap-value">0</span>
            </p>
          </div>
          <div class="table-wrap payments-history__table-wrap">
            <table class="tabM payments-history__table client-ledger__table">
              <thead>
                <tr>
                  <th class="payment-history__align-left">Date</th>
                  <th>Facture</th>
                  <th>Client</th>
                  <th>R&eacute;f. paiement</th>
                  <th>Mode de paiement</th>
                  <th class="payment-history__align-right">D&eacute;bit</th>
                  <th class="payment-history__align-right">Cr&eacute;dit</th>
                  <th class="payment-history__align-center">Action</th>
                </tr>
              </thead>
              <tbody id="clientLedgerList"></tbody>
            </table>
          </div>
        </div>
        <div class="client-saved-modal__actions doc-history-modal__actions">
          <div class="client-search__actions client-saved-modal__actions-left doc-history-modal__actions-left">
            <button id="clientLedgerCloseFooter" type="button" class="btn btn-close client-search__close">
              Fermer
            </button>
          </div>
          <div class="client-search__actions client-saved-modal__pager doc-history-modal__pager">
            <button id="clientLedgerPrev" type="button" class="client-search__edit" disabled>
              Pr&eacute;c&eacute;dent
            </button>
            <span
              id="clientLedgerPage"
              class="client-saved-modal__page doc-history-modal__page"
              aria-live="polite"
              aria-label="Page 1 sur 1"
            >
              Page
              <input
                id="clientLedgerPageInput"
                type="number"
                inputmode="numeric"
                min="1"
                step="1"
                size="3"
                aria-label="Aller a la page"
                class="client-saved-modal__page-input doc-history-modal__page-input"
                max="1"
                aria-valuemin="1"
                aria-valuemax="1"
                aria-valuenow="1"
              />
              /
              <span id="clientLedgerTotalPages">1</span>
            </span>
            <button id="clientLedgerNext" type="button" class="client-search__add" disabled>
              Suivant
            </button>
          </div>
        </div>
      </div>
    </div>
    <div id="clientStatementsModal" class="swbDialog client-statements-modal" hidden aria-hidden="true">
      <div
        class="swbDialog__panel payments-history-modal__panel doc-history-modal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="clientStatementsTitle"
      >
        <div class="swbDialog__header">
          <div id="clientStatementsTitle" class="swbDialog__title">Solde client</div>
          <button id="clientStatementsClose" type="button" class="swbDialog__close" aria-label="Fermer">
            <svg stroke="currentColor" fill="none" stroke-width="0" viewBox="0 0 24 24" height="200px" width="200px" xmlns="http://www.w3.org/2000/svg">
              <path d="M16.3394 9.32245C16.7434 8.94589 16.7657 8.31312 16.3891 7.90911C16.0126 7.50509 15.3798 7.48283 14.9758 7.85938L12.0497 10.5866L9.32245 7.66048C8.94589 7.25647 8.31312 7.23421 7.90911 7.61076C7.50509 7.98731 7.48283 8.62008 7.85938 9.0241L10.5866 11.9502L7.66048 14.6775C7.25647 15.054 7.23421 15.6868 7.61076 16.0908C7.98731 16.4948 8.62008 16.5171 9.0241 16.1405L11.9502 13.4133L14.6775 16.3394C15.054 16.7434 15.6868 16.7657 16.0908 16.3891C16.4948 16.0126 16.5171 15.3798 16.1405 14.9758L13.4133 12.0497L16.3394 9.32245Z" fill="currentColor"></path>
              <path fill-rule="evenodd" clip-rule="evenodd" d="M1 12C1 5.92487 5.92487 1 12 1C18.0751 1 23 5.92487 23 12C23 18.0751 18.0751 23 12 23C5.92487 23 1 18.0751 1 12ZM12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21Z" fill="currentColor"></path>
            </svg>
          </button>
        </div>
        <div class="swbDialog__msg payments-history-modal__body credit-clients__body">
          <div class="doc-history-modal__filters payments-history__filters">
            <label class="doc-history-modal__filter">
              <span>Client</span>
              <input id="clientStatementsFilterClient" type="text" placeholder="Rechercher un client">
            </label>
            <label class="doc-history-modal__filter">
              <span id="clientStatementsFilterSoldLabel">Solde</span>
              <div class="doc-dialog-model-picker__field">
                <details
                  id="clientStatementsFilterSoldMenu"
                  class="field-toggle-menu doc-dialog-model-menu doc-history-model-menu"
                >
                  <summary
                    class="btn success field-toggle-trigger"
                    role="button"
                    aria-haspopup="listbox"
                    aria-expanded="false"
                    aria-labelledby="clientStatementsFilterSoldLabel clientStatementsFilterSoldDisplay"
                  >
                    <span id="clientStatementsFilterSoldDisplay" class="model-select-display">Tous les soldes</span>
                    <svg class="chevron" aria-hidden="true" focusable="false" stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="none" d="M0 0h24v24H0V0z"></path><path d="M12 4c4.41 0 8 3.59 8 8s-3.59 8-8 8-8-3.59-8-8 3.59-8 8-8m0-2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 13-4-4h8z"></path></svg>
                  </summary>
                  <div
                    id="clientStatementsFilterSoldPanel"
                    class="field-toggle-panel model-select-panel doc-history-model-panel"
                    role="listbox"
                    aria-labelledby="clientStatementsFilterSoldLabel"
                  >
                    <button type="button" class="model-select-option is-active" data-value="" role="option" aria-selected="true">
                      Tous les soldes
                    </button>
                    <button type="button" class="model-select-option" data-value="eq0" role="option" aria-selected="false">
                      Solde = 0
                    </button>
                    <button type="button" class="model-select-option" data-value="lt0" role="option" aria-selected="false">
                      Solde &lt; 0
                    </button>
                    <button type="button" class="model-select-option" data-value="gt0" role="option" aria-selected="false">
                      Solde &gt; 0
                    </button>
                  </div>
                </details>
                <select id="clientStatementsFilterSold" class="model-select doc-dialog-model-select" aria-hidden="true" tabindex="-1">
                  <option value="" selected>Tous les soldes</option>
                  <option value="eq0">Solde = 0</option>
                  <option value="lt0">Solde &lt; 0</option>
                  <option value="gt0">Solde &gt; 0</option>
                </select>
              </div>
            </label>
            <label class="doc-history-modal__filter doc-history-modal__filter--year">
              <span id="clientStatementsFilterYearLabel">Ann&eacute;e</span>
              <div class="doc-dialog-model-picker__field">
                <details
                  id="clientStatementsFilterYearMenu"
                  class="field-toggle-menu doc-dialog-model-menu doc-history-model-menu"
                >
                  <summary
                    class="btn success field-toggle-trigger"
                    role="button"
                    aria-haspopup="listbox"
                    aria-expanded="false"
                    aria-labelledby="clientStatementsFilterYearLabel clientStatementsFilterYearDisplay"
                  >
                    <span id="clientStatementsFilterYearDisplay" class="model-select-display"></span>
                    <svg class="chevron" aria-hidden="true" focusable="false" stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="none" d="M0 0h24v24H0V0z"></path><path d="M12 4c4.41 0 8 3.59 8 8s-3.59 8-8 8-8-3.59-8-8 3.59-8 8-8m0-2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 13-4-4h8z"></path></svg>
                  </summary>
                  <div
                    id="clientStatementsFilterYearPanel"
                    class="field-toggle-panel model-select-panel doc-history-model-panel"
                    role="listbox"
                    aria-labelledby="clientStatementsFilterYearLabel"
                  ></div>
                </details>
                <select id="clientStatementsFilterYear" class="model-select doc-dialog-model-select" aria-hidden="true" tabindex="-1">
                  <option value=""></option>
                </select>
              </div>
            </label>
            <label class="doc-history-modal__filter">
              <span>Du</span>
              <div class="swb-date-picker" data-date-picker="">
                <input id="clientStatementsFilterStart" type="text" inputmode="numeric" placeholder="JJ-MM" autocomplete="off" spellcheck="false" aria-haspopup="dialog" aria-expanded="false" role="combobox" aria-controls="clientStatementsFilterStartPanel">
                <button type="button" class="swb-date-picker__toggle" data-date-picker-toggle="" aria-label="Choisir une date" aria-haspopup="dialog" aria-expanded="false" aria-controls="clientStatementsFilterStartPanel">
                  <svg class="swb-date-picker__toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" focusable="false">
                    <rect x="3.5" y="5" width="17" height="15" rx="2"></rect>
                    <path d="M8 3.5v3M16 3.5v3M3.5 10h17" stroke-linecap="round"></path>
                  </svg>
                </button>
                <div class="swb-date-picker__panel" data-date-picker-panel="" hidden="" role="dialog" aria-modal="false" aria-label="Choisir une date" tabindex="-1" id="clientStatementsFilterStartPanel"></div>
              </div>
            </label>
            <label class="doc-history-modal__filter">
              <span>Au</span>
              <div class="swb-date-picker" data-date-picker="">
                <input id="clientStatementsFilterEnd" type="text" inputmode="numeric" placeholder="JJ-MM" autocomplete="off" spellcheck="false" aria-haspopup="dialog" aria-expanded="false" role="combobox" aria-controls="clientStatementsFilterEndPanel">
                <button type="button" class="swb-date-picker__toggle" data-date-picker-toggle="" aria-label="Choisir une date" aria-haspopup="dialog" aria-expanded="false" aria-controls="clientStatementsFilterEndPanel">
                  <svg class="swb-date-picker__toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" focusable="false">
                    <rect x="3.5" y="5" width="17" height="15" rx="2"></rect>
                    <path d="M8 3.5v3M16 3.5v3M3.5 10h17" stroke-linecap="round"></path>
                  </svg>
                </button>
                <div class="swb-date-picker__panel" data-date-picker-panel="" hidden="" role="dialog" aria-modal="false" aria-label="Choisir une date" tabindex="-1" id="clientStatementsFilterEndPanel"></div>
              </div>
            </label>
            <button type="button" class="btn ghost doc-history-modal__filter-clear" id="clientStatementsFilterClear" disabled>
              Reinitialiser
            </button>
          </div>
          <div class="doc-history-modal__status-row">
            <p class="doc-history-modal__recap">
              Total D&eacute;bit:
              <span id="clientStatementsTotalDebit" class="doc-history-modal__recap-value">0</span>
              &nbsp;|&nbsp;
              Total Cr&eacute;dit:
              <span id="clientStatementsTotalCredit" class="doc-history-modal__recap-value">0</span>
              &nbsp;|&nbsp;
              Solde client:
              <span id="clientStatementsTotalSold" class="doc-history-modal__recap-value">0</span>
            </p>
          </div>
          <div class="table-wrap payments-history__table-wrap credit-clients__table-wrap">
            <table class="tabM payments-history__table credit-clients__table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Total d&eacute;bit</th>
                  <th>Total cr&eacute;dit</th>
                  <th class="payment-history__align-right">Solde client</th>
                </tr>
              </thead>
              <tbody id="clientStatementsList">
                <tr class="payments-panel__empty-row">
                  <td colspan="4">Chargement...</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div class="client-saved-modal__actions doc-history-modal__actions">
          <div class="client-search__actions client-saved-modal__actions-left doc-history-modal__actions-left">
            <button id="clientStatementsCloseFooter" type="button" class="btn btn-close client-search__close">
              Fermer
            </button>
          </div>
          <div class="client-search__actions client-saved-modal__pager doc-history-modal__pager">
            <button id="clientStatementsPrev" type="button" class="client-search__edit" disabled>
              Precedent
            </button>
            <span
              id="clientStatementsPage"
              class="client-saved-modal__page doc-history-modal__page"
              aria-live="polite"
              aria-label="Page 1 sur 1"
            >
              Page
              <input
                id="clientStatementsPageInput"
                type="number"
                inputmode="numeric"
                min="1"
                step="1"
                size="3"
                aria-label="Aller a la page"
                class="client-saved-modal__page-input doc-history-modal__page-input"
                max="1"
                aria-valuemin="1"
                aria-valuemax="1"
                aria-valuenow="1"
              />
              /
              <span id="clientStatementsTotalPages">1</span>
            </span>
            <button id="clientStatementsNext" type="button" class="client-search__add" disabled>
              Suivant
            </button>
          </div>
        </div>
      </div>
    </div>
  `);
}


