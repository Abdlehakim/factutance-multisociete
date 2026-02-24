export function renderSignatureModal() {
  return `
    <div id="companySignatureModal" class="swbDialog signature-modal" hidden aria-hidden="true">
      <div class="swbDialog__panel signature-modal__panel" role="dialog" aria-modal="true" aria-labelledby="companySignatureModalTitle">
        <div class="swbDialog__header">
          <div id="companySignatureModalTitle" class="swbDialog__title">Signature electronique</div>
          <button id="companySignatureModalClose" type="button" class="swbDialog__close" aria-label="Fermer">
            <svg stroke="currentColor" fill="none" stroke-width="0" viewBox="0 0 24 24" height="200px" width="200px" xmlns="http://www.w3.org/2000/svg">
              <path d="M16.3394 9.32245C16.7434 8.94589 16.7657 8.31312 16.3891 7.90911C16.0126 7.50509 15.3798 7.48283 14.9758 7.85938L12.0497 10.5866L9.32245 7.66048C8.94589 7.25647 8.31312 7.23421 7.90911 7.61076C7.50509 7.98731 7.48283 8.62008 7.85938 9.0241L10.5866 11.9502L7.66048 14.6775C7.25647 15.054 7.23421 15.6868 7.61076 16.0908C7.98731 16.4948 8.62008 16.5171 9.0241 16.1405L11.9502 13.4133L14.6775 16.3394C15.054 16.7434 15.6868 16.7657 16.0908 16.3891C16.4948 16.0126 16.5171 15.3798 16.1405 14.9758L13.4133 12.0497L16.3394 9.32245Z" fill="currentColor"></path>
              <path fill-rule="evenodd" clip-rule="evenodd" d="M1 12C1 5.92487 5.92487 1 12 1C18.0751 1 23 5.92487 23 12C23 18.0751 18.0751 23 12 23C5.92487 23 1 18.0751 1 12ZM12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21Z" fill="currentColor"></path>
            </svg>
          </button>
        </div>
        <div class="signature-modal__body swbDialog__msg">
          <div class="signature-tabs" role="tablist" aria-label="Signature electronique">
            <button
              type="button"
              class="signature-tab is-active"
              data-signature-tab="enterprise"
              role="tab"
              aria-selected="true"
              aria-controls="signatureTabPanelEnterprise"
              id="signatureTabEnterprise"
              tabindex="0"
            >
              Cachet &eacute;lectronique Enterprise-ID
            </button>
            <button
              type="button"
              class="signature-tab"
              data-signature-tab="digigo"
              role="tab"
              aria-selected="false"
              aria-controls="signatureTabPanelDigiGo"
              id="signatureTabDigiGo"
              tabindex="-1"
            >
              Signature &eacute;lectronique DigiGo
            </button>
            <button
              type="button"
              class="signature-tab"
              data-signature-tab="idtrust"
              role="tab"
              aria-selected="false"
              aria-controls="signatureTabPanelIdTrust"
              id="signatureTabIdTrust"
              tabindex="-1"
            >
              Certificat ID-Trust (USB)
            </button>
          </div>
          <div
            class="signature-tab-panel is-active"
            data-signature-panel="enterprise"
            id="signatureTabPanelEnterprise"
            role="tabpanel"
            aria-labelledby="signatureTabEnterprise"
          >
            <p class="signature-tab-panel__text">Configuration Enterprise-ID.</p>
          </div>
          <div
            class="signature-tab-panel"
            data-signature-panel="digigo"
            id="signatureTabPanelDigiGo"
            role="tabpanel"
            aria-labelledby="signatureTabDigiGo"
            hidden
          >
            <p class="signature-tab-panel__text">Configuration DigiGo.</p>
          </div>
          <div
            class="signature-tab-panel"
            data-signature-panel="idtrust"
            id="signatureTabPanelIdTrust"
            role="tabpanel"
            aria-labelledby="signatureTabIdTrust"
            hidden
          >
            <p class="signature-tab-panel__text">Configuration ID-Trust.</p>
          </div>
        </div>
        <div class="swbDialog__actions signature-modal__actions">
          <div class="swbDialog__group swbDialog__group--left">
            <button id="companySignatureModalCancel" type="button" class="swbDialog__cancel">Fermer</button>
          </div>
        </div>
      </div>
    </div>
  `;
}
